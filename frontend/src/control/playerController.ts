import type { DbConnection } from "../../module_bindings";
import { Entity } from "../state/Entity";
import type { World } from "../state/world";
import type { Player } from "../types";
import { Vector2 } from "../util/Vector2";

const STEP_SECONDS = 1 / 60;
const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;
const MAX_PENDING_INPUTS = 120;
const MAX_SPEED = 60;
const ACCELERATION = 240;
const FRICTION = 360;

const MOVEMENT_KEYS = new Set([
  "w", "a", "s", "d",
  "arrowup", "arrowleft", "arrowdown", "arrowright",
]);

type InputFrame = {
  tick: bigint;
  moveX: number;
  moveY: number;
};

type MovementState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function advance(state: MovementState, moveX: number, moveY: number): void {
  const targetVx = moveX * MAX_SPEED;
  const targetVy = moveY * MAX_SPEED;
  const acceleration = moveX === 0 && moveY === 0 ? FRICTION : ACCELERATION;
  const dx = targetVx - state.vx;
  const dy = targetVy - state.vy;
  const distance = Math.hypot(dx, dy);
  const maxDelta = acceleration * STEP_SECONDS;

  if (distance <= maxDelta) {
    state.vx = targetVx;
    state.vy = targetVy;
  } else {
    state.vx += (dx / distance) * maxDelta;
    state.vy += (dy / distance) * maxDelta;
  }

  state.x += state.vx * STEP_SECONDS;
  state.y += state.vy * STEP_SECONDS;
}

export class PlayerController {
  private readonly connection: DbConnection;
  private readonly world: World;
  private readonly identity: string;
  private readonly keys = new Set<string>();
  private readonly pendingInputs: InputFrame[] = [];
  private player: Entity | undefined;
  private state: MovementState | undefined;
  private nextInputTick = 0n;
  private lastMoveX = 0;
  private lastMoveY = 0;
  private needsInputRetry = false;
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
    this.pendingInputs.length = 0;
    this.nextInputTick = 0n;
    this.lastMoveX = 0;
    this.lastMoveY = 0;
    this.needsInputRetry = false;
    this.accumulatedMs = 0;
  };

  private syncPlayer(player: Player): void {
    if (this.disposed) return;
    const identity = player.identity.toHexString();
    if (identity !== this.identity) return;
    let entity = this.world.entities.get(identity);
    if (!entity) {
      entity = new Entity("player", new Vector2());
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
    this.state = state;
    this.writePosition();
  }

  private writePosition(): void {
    if (!this.player || !this.state) return;
    this.player.position.x = this.state.x;
    this.player.position.y = this.state.y;
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
  };

  private readonly releaseKeys = () => {
    this.keys.clear();
    // The server holds the last input, so release it even if animation is paused.
    if (this.lastMoveX !== 0 || this.lastMoveY !== 0 || this.needsInputRetry) {
      this.submitInput(0, 0, true);
    }
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

      if (this.pendingInputs.length >= MAX_PENDING_INPUTS) break;
      if (x !== 0 || y !== 0 || this.state.vx !== 0 || this.state.vy !== 0
        || this.lastMoveX !== x || this.lastMoveY !== y || this.needsInputRetry) {
        this.submitInput(x, y);
      } else {
        advance(this.state, 0, 0);
        this.writePosition();
      }
    }
  }

  private submitInput(moveX: number, moveY: number, release = false): void {
    if (!this.state || !this.connection.isActive) return;
    if (this.pendingInputs.length >= MAX_PENDING_INPUTS) {
      if (!release) return;
      this.pendingInputs.shift();
    }
    const input = { tick: ++this.nextInputTick, moveX, moveY };
    this.pendingInputs.push(input);
    this.lastMoveX = moveX;
    this.lastMoveY = moveY;
    this.needsInputRetry = false;
    advance(this.state, moveX, moveY);
    this.writePosition();
    void this.connection.reducers.submitPlayerInput({
      inputTick: input.tick,
      moveX,
      moveY,
      buttons: 0,
    }).catch((error: unknown) => {
      const index = this.pendingInputs.indexOf(input);
      if (index !== -1) this.pendingInputs.splice(index, 1);
      if (!this.disposed) {
        if (input.tick === this.nextInputTick) this.needsInputRetry = true;
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
