import type { DbConnection } from "../../module_bindings";
import { Player as PlayerEntity } from "../state/Player";
import type { World } from "../state/world";
import type { Player } from "../types";
import { Vector2 } from "../util/Vector2";
import { advance, STEP_MS, type MovementState } from "./movement";

const MAX_FRAME_MS = 250;
const MAX_PENDING_INPUTS = 120;

const MOVEMENT_KEYS = new Set([
  "w", "a", "s", "d",
  "arrowup", "arrowleft", "arrowdown", "arrowright",
]);

type InputFrame = {
  tick: bigint;
  moveX: number;
  moveY: number;
};

export class PlayerController {
  private readonly connection: DbConnection;
  private readonly world: World;
  private readonly identity: string;
  private readonly keys = new Set<string>();
  private readonly pendingInputs: InputFrame[] = [];
  private player: PlayerEntity | undefined;
  private state: MovementState | undefined;
  private previousState: MovementState | undefined;
  private nextInputTick = 0n;
  private lastTime = performance.now();
  private accumulatedMs = 0;
  private disposed = false;

  constructor(connection: DbConnection, world: World) {
    this.connection = connection;
    this.world = world;
    this.identity = connection.identity!.toHexString();

    connection.db.player.onInsert(this.onPlayerInsert);
    connection.db.player.onUpdate(this.onPlayerUpdate);
    connection.db.player.onDelete(this.onPlayerDelete);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.releaseKeys);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  private readonly onPlayerInsert = (_ctx: unknown, player: Player) => {
    if (!this.disposed) this.syncPlayer(player);
  };

  private readonly onPlayerUpdate = (
    _ctx: unknown,
    _oldPlayer: Player,
    player: Player,
  ) => {
    if (!this.disposed) this.syncPlayer(player);
  };

  private readonly onPlayerDelete = (_ctx: unknown, player: Player) => {
    if (this.disposed) return;
    const identity = player.identity.toHexString();
    if (identity !== this.identity) return;
    this.world.entities.delete(identity);
    this.player = undefined;
    this.state = undefined;
    this.previousState = undefined;
    this.pendingInputs.length = 0;
    this.nextInputTick = 0n;
    this.accumulatedMs = 0;
  };

  private syncPlayer(player: Player): void {
    if (this.disposed) return;
    const identity = player.identity.toHexString();
    if (identity !== this.identity) return;
    const existing = this.world.entities.get(identity);
    const entity = existing instanceof PlayerEntity ? existing : new PlayerEntity(new Vector2());
    if (entity !== existing) {
      entity.id = identity;
      this.world.entities.set(identity, entity);
    }

    this.player = entity;
    this.nextInputTick = this.nextInputTick > player.lastProcessedInputTick
      ? this.nextInputTick
      : player.lastProcessedInputTick;
    while (
      this.pendingInputs.length > 0 &&
      this.pendingInputs[0].tick <= player.lastProcessedInputTick
    ) {
      this.pendingInputs.shift();
    }

    const state = {
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
    };
    for (const input of this.pendingInputs) {
      advance(state, input.moveX, input.moveY);
    }
    if (this.previousState && this.state) {
      // Correct both interpolation endpoints so an acknowledgement does not
      // collapse the render interval or move the player ahead by one tick.
      this.previousState.x += state.x - this.state.x;
      this.previousState.y += state.y - this.state.y;
      this.previousState.vx += state.vx - this.state.vx;
      this.previousState.vy += state.vy - this.state.vy;
    } else {
      this.previousState = { ...state };
      this.lastTime = performance.now();
      this.accumulatedMs = 0;
    }
    this.state = state;
    this.writePosition();
  }

  private writePosition(): void {
    if (!this.player || !this.state || !this.previousState) return;
    const alpha = this.accumulatedMs / STEP_MS;
    this.player.position.x = this.previousState.x
      + (this.state.x - this.previousState.x) * alpha;
    this.player.position.y = this.previousState.y
      + (this.state.y - this.previousState.y) * alpha;
    const vx = this.previousState.vx + (this.state.vx - this.previousState.vx) * alpha;
    const vy = this.previousState.vy + (this.state.vy - this.previousState.vy) * alpha;
    this.player.faceVelocity(vx, vy);
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (!MOVEMENT_KEYS.has(key)) return;
    event.preventDefault();
    this.keys.add(key);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (!MOVEMENT_KEYS.has(key)) return;
    event.preventDefault();
    this.keys.delete(key);
  };

  private readonly onVisibilityChange = () => {
    if (document.hidden) this.releaseKeys();
    this.lastTime = performance.now();
    this.accumulatedMs = 0;
  };

  private readonly releaseKeys = () => {
    this.keys.clear();
  };

  update(time: number): void {
    const elapsed = Math.min(Math.max(time - this.lastTime, 0), MAX_FRAME_MS);
    this.lastTime = time;
    if (!this.state || !this.connection.isActive || document.hidden) {
      this.accumulatedMs = 0;
      return;
    }

    this.accumulatedMs += elapsed;
    while (this.accumulatedMs >= STEP_MS) {
      this.accumulatedMs -= STEP_MS;
      const moveX = Number(this.keys.has("d") || this.keys.has("arrowright"))
        - Number(this.keys.has("a") || this.keys.has("arrowleft"));
      const moveY = Number(this.keys.has("w") || this.keys.has("arrowup"))
        - Number(this.keys.has("s") || this.keys.has("arrowdown"));
      const length = Math.hypot(moveX, moveY);
      const x = length > 1 ? moveX / length : moveX;
      const y = length > 1 ? moveY / length : moveY;

      if (this.pendingInputs.length >= MAX_PENDING_INPUTS) {
        this.accumulatedMs = 0;
        this.previousState = { ...this.state };
        break;
      }
      this.previousState = { ...this.state };
      this.submitInput(x, y);
    }
    this.writePosition();
  }

  private submitInput(moveX: number, moveY: number): void {
    if (!this.state || !this.connection.isActive) return;
    const input = { tick: ++this.nextInputTick, moveX, moveY };
    this.pendingInputs.push(input);
    advance(this.state, moveX, moveY);
    void this.connection.reducers.submitPlayerInput({
      inputTick: input.tick,
      moveX,
      moveY,
      buttons: 0,
    }).catch((error: unknown) => {
      const index = this.pendingInputs.indexOf(input);
      if (index !== -1) this.pendingInputs.splice(index, 1);
      if (!this.disposed) {
        console.error("Failed to submit player input", error);
      }
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.releaseKeys();
    this.disposed = true;
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.releaseKeys);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.connection.db.player.removeOnInsert(this.onPlayerInsert);
    this.connection.db.player.removeOnUpdate(this.onPlayerUpdate);
    this.connection.db.player.removeOnDelete(this.onPlayerDelete);
  }
}
