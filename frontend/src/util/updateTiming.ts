import type { DbConnection } from "../../module_bindings";
import type { Ship } from "../types";

// Keep in sync with the backend's 10 Hz simulation.
const UPDATE_INTERVAL_MS = 100;

function watchUpdateTiming(connection: DbConnection, worldId: bigint): () => void {
  let lastTick: bigint | undefined;
  let lastReceivedAt = 0;

  const reset = () => {
    lastTick = undefined;
  };
  const onUpdate = (_ctx: unknown, oldShip: Ship, ship: Ship) => {
    if (document.hidden || ship.worldId !== worldId || ship.serverTick === oldShip.serverTick) return;
    // All ships in a simulation update share a tick: log once per update.
    if (lastTick !== undefined && ship.serverTick <= lastTick) {
      if (ship.serverTick < lastTick) reset();
      else return;
    }
    const now = performance.now();
    if (lastTick !== undefined) {
      const intervalMs = now - lastReceivedAt;
      if (intervalMs > UPDATE_INTERVAL_MS + 50) {
        console.warn("[timing] server update received late", {
          serverTick: ship.serverTick.toString(),
          ticksSinceLastUpdate: (ship.serverTick - lastTick).toString(),
          intervalMs: Math.round(intervalMs),
          lateMs: Math.round(intervalMs - UPDATE_INTERVAL_MS),
          expectedIntervalMs: UPDATE_INTERVAL_MS,
        });
      }
    }
    lastTick = ship.serverTick;
    lastReceivedAt = now;
  };

  connection.db.ship.onUpdate(onUpdate);
  document.addEventListener("visibilitychange", reset);
  return () => {
    connection.db.ship.removeOnUpdate(onUpdate);
    document.removeEventListener("visibilitychange", reset);
  };
}

/** Owns frame/FPS sampling and connection timing listeners for one game session. */
export class UpdateTiming {
  private previousTime: number | undefined;
  private sampleMs = 0;
  private sampleFrames = 0;
  private previousWorkMs = 0;
  private startedAt = 0;
  private lastFrameWarning = -Infinity;
  private unwatchConnection: (() => void) | undefined;
  private readonly onFps: ((fps: number) => void) | undefined;

  constructor(onFps?: (fps: number) => void) {
    this.onFps = onFps;
    document.addEventListener("visibilitychange", this.resetFrameTiming);
  }

  watchConnection(connection: DbConnection, worldId: bigint): void {
    this.unwatchConnection?.();
    this.unwatchConnection = watchUpdateTiming(connection, worldId);
  }

  beginFrame(time: number): void {
    this.startedAt = performance.now();
    if (!document.hidden && this.previousTime !== undefined) {
      const frameMs = time - this.previousTime;
      this.sampleMs += frameMs;
      this.sampleFrames++;
      if (frameMs > 50 && time - this.lastFrameWarning >= 1000) {
        console.warn("[timing] slow frame", {
          frameIntervalMs: Math.round(frameMs),
          previousUpdateAndRenderMs: Math.round(this.previousWorkMs),
        });
        this.lastFrameWarning = time;
      }
      if (this.sampleMs >= 500) {
        this.onFps?.(Math.round(this.sampleFrames * 1000 / this.sampleMs));
        this.sampleMs = 0;
        this.sampleFrames = 0;
      }
    }
    this.previousTime = document.hidden ? undefined : time;
  }

  endFrame(): void {
    this.previousWorkMs = performance.now() - this.startedAt;
  }

  private readonly resetFrameTiming = () => {
    this.previousTime = undefined;
    this.sampleMs = 0;
    this.sampleFrames = 0;
    this.onFps?.(0);
  };

  dispose(): void {
    document.removeEventListener("visibilitychange", this.resetFrameTiming);
    this.unwatchConnection?.();
    this.unwatchConnection = undefined;
  }
}
