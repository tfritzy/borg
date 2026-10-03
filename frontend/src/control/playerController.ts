import type { DbConnection } from "../../module_bindings";
import type { ShipEntity } from "../state/Ship";
import type { World } from "../state/world";
import type { Ship } from "../types";
import { advance, STEP_MS, type MovementState } from "./movement";
import { syncShipMetadata } from "./syncShipMetadata";

const MAX_FRAME_MS = 250;
const MAX_PENDING_INPUTS = 120;

const MOVEMENT_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowleft",
  "arrowdown",
  "arrowright",
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
  private ship: ShipEntity | undefined;
  private properties: Ship["properties"] | undefined;
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

    connection.db.ship.onInsert(this.onShipInsert);
    connection.db.ship.onUpdate(this.onShipUpdate);
    connection.db.ship.onDelete(this.onShipDelete);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.releaseKeys);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  private readonly onShipInsert = (_ctx: unknown, ship: Ship) => {
    if (!this.disposed) this.syncShip(ship);
  };

  private readonly onShipUpdate = (
    _ctx: unknown,
    _oldShip: Ship,
    ship: Ship,
  ) => {
    if (!this.disposed) this.syncShip(ship);
  };

  private readonly onShipDelete = (_ctx: unknown, ship: Ship) => {
    if (this.disposed) return;
    const owner = ship.owner?.toHexString();
    const id = ship.id.toString();
    if (owner !== this.identity) return;
    this.world.entities.delete(id);
    this.resetPrediction();
  };

  private resetPrediction(): void {
    this.ship = undefined;
    this.properties = undefined;
    this.state = undefined;
    this.previousState = undefined;
    this.pendingInputs.length = 0;
    this.nextInputTick = 0n;
    this.accumulatedMs = 0;
  }

  private syncShip(ship: Ship): void {
    if (this.disposed) return;
    const owner = ship.owner?.toHexString();
    const id = ship.id.toString();
    if (owner !== this.identity) {
      if (this.ship?.id === id) this.resetPrediction();
      return;
    }
    this.ship = syncShipMetadata(this.world, ship);
    this.properties = ship.properties;
    const lastProcessedInputTick = ship.lastProcessedInputTick ?? 0n;
    this.nextInputTick =
      this.nextInputTick > lastProcessedInputTick
        ? this.nextInputTick
        : lastProcessedInputTick;
    while (
      this.pendingInputs.length > 0 &&
      this.pendingInputs[0].tick <= lastProcessedInputTick
    ) {
      this.pendingInputs.shift();
    }

    const state = {
      x: ship.x,
      y: ship.y,
      vx: ship.vx,
      vy: ship.vy,
    };
    for (const input of this.pendingInputs) {
      advance(state, input.moveX, input.moveY, this.properties);
    }
    if (this.previousState && this.state) {
      // Correct both interpolation endpoints so an acknowledgement does not
      // collapse the render interval or move the ship ahead by one tick.
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
    if (!this.ship || !this.state || !this.previousState) return;
    const alpha = this.accumulatedMs / STEP_MS;
    this.ship.position.x =
      this.previousState.x + (this.state.x - this.previousState.x) * alpha;
    this.ship.position.y =
      this.previousState.y + (this.state.y - this.previousState.y) * alpha;
    const vx =
      this.previousState.vx + (this.state.vx - this.previousState.vx) * alpha;
    const vy =
      this.previousState.vy + (this.state.vy - this.previousState.vy) * alpha;
    this.ship.faceVelocity(vx, vy);
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
    if (
      !this.state ||
      !this.properties ||
      !this.connection.isActive ||
      document.hidden
    ) {
      this.accumulatedMs = 0;
      return;
    }

    this.accumulatedMs += elapsed;
    while (this.accumulatedMs >= STEP_MS) {
      this.accumulatedMs -= STEP_MS;
      const moveX =
        Number(this.keys.has("d") || this.keys.has("arrowright")) -
        Number(this.keys.has("a") || this.keys.has("arrowleft"));
      const moveY =
        Number(this.keys.has("w") || this.keys.has("arrowup")) -
        Number(this.keys.has("s") || this.keys.has("arrowdown"));
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
    if (!this.state || !this.properties || !this.connection.isActive) return;
    const input = { tick: ++this.nextInputTick, moveX, moveY };
    this.pendingInputs.push(input);
    advance(this.state, moveX, moveY, this.properties);
    void this.connection.reducers
      .submitPlayerInput({
        inputTick: input.tick,
        moveX,
        moveY,
        buttons: 0,
      })
      .catch((error: unknown) => {
        const index = this.pendingInputs.indexOf(input);
        if (index !== -1) this.pendingInputs.splice(index, 1);
        if (!this.disposed) {
          console.error("Failed to submit ship input", error);
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
    this.connection.db.ship.removeOnInsert(this.onShipInsert);
    this.connection.db.ship.removeOnUpdate(this.onShipUpdate);
    this.connection.db.ship.removeOnDelete(this.onShipDelete);
  }
}
