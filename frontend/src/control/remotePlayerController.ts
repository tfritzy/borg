import type { DbConnection } from "../../module_bindings";
import type { World } from "../state/world";
import type { Ship } from "../types";
import { INTERPOLATION_DELAY_MS, MAX_SNAPSHOTS } from "./consts";
import { syncShipMetadata } from "./syncShipMetadata";

type Snapshot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  serverTick: bigint;
  receivedAt: number;
};

export class RemotePlayerController {
  private readonly connection: DbConnection;
  private readonly world: World;
  private readonly identity: string;
  private readonly snapshots = new Map<string, Snapshot[]>();
  private disposed = false;

  constructor(connection: DbConnection, world: World) {
    this.connection = connection;
    this.world = world;
    this.identity = connection.identity!.toHexString();

    connection.db.ship.onInsert(this.onPlayerInsert);
    connection.db.ship.onUpdate(this.onPlayerUpdate);
    connection.db.ship.onDelete(this.onPlayerDelete);
  }

  private readonly onPlayerInsert = (_ctx: unknown, player: Ship) => {
    if (player.owner?.toHexString() === this.identity) return;
    this.syncPlayer(player);
  };

  private readonly onPlayerUpdate = (
    _ctx: unknown,
    _oldPlayer: Ship,
    player: Ship,
  ) => {
    this.syncPlayer(player);
  };

  private readonly onPlayerDelete = (_ctx: unknown, player: Ship) => {
    if (this.disposed) return;
    const owner = player.owner?.toHexString();
    const id = player.id.toString();
    if (owner === this.identity) return;
    this.world.entities.delete(id);
    this.snapshots.delete(id);
  };

  private syncPlayer(player: Ship): void {
    if (this.disposed) return;
    const owner = player.owner?.toHexString();
    const id = player.id.toString();
    if (owner === this.identity) {
      this.snapshots.delete(id);
      return;
    }

    const entity = syncShipMetadata(this.world, player);
    if (!entity.label) entity.rollLabel();
    this.recordSnapshot(id, player, performance.now());
  }

  update(time: number): void {
    for (const id of this.snapshots.keys()) {
      const entity = this.world.entities.get(id);
      const position = this.sampleSnapshot(id, time);
      if (entity && position) {
        entity.position.x = position.x;
        entity.position.y = position.y;
        entity.faceVelocity(position.vx, position.vy);
      }
    }
  }

  private recordSnapshot(
    identity: string,
    position: Pick<Ship, "x" | "y" | "vx" | "vy" | "serverTick">,
    receivedAt: number,
  ): void {
    let history = this.snapshots.get(identity);
    if (!history) {
      history = [];
      this.snapshots.set(identity, history);
    }

    const last = history.at(-1);
    if (last && position.serverTick < last.serverTick) {
      // A reconnect can reset a player's tick without changing their identity.
      if (position.serverTick !== 0n) return;
      history.length = 0;
    }
    if (
      last &&
      position.serverTick === last.serverTick &&
      position.x === last.x &&
      position.y === last.y
    )
      return;

    if (
      last &&
      history.length > 0 &&
      receivedAt - last.receivedAt > INTERPOLATION_DELAY_MS
    ) {
      // Resume from the held pose after a stalled stream.
      history.push({
        ...last,
        receivedAt: receivedAt - INTERPOLATION_DELAY_MS,
      });
    }
    history.push({
      x: position.x,
      y: position.y,
      vx: position.vx,
      vy: position.vy,
      serverTick: position.serverTick,
      receivedAt,
    });
    while (history.length > MAX_SNAPSHOTS) history.shift();
  }

  private sampleSnapshot(
    identity: string,
    time: number,
  ): Pick<Snapshot, "x" | "y" | "vx" | "vy"> | undefined {
    const history = this.snapshots.get(identity);
    if (!history?.length) return undefined;

    const renderTime = time - INTERPOLATION_DELAY_MS;
    while (history.length > 2 && history[1].receivedAt <= renderTime) {
      history.shift();
    }

    const first = history[0];
    if (renderTime <= first.receivedAt) return first;

    for (let i = 1; i < history.length; i++) {
      const next = history[i];
      if (renderTime > next.receivedAt) continue;

      const previous = history[i - 1];
      const duration = next.receivedAt - previous.receivedAt;
      const fraction =
        duration > 0 ? (renderTime - previous.receivedAt) / duration : 1;
      return {
        x: previous.x + (next.x - previous.x) * fraction,
        y: previous.y + (next.y - previous.y) * fraction,
        vx: previous.vx + (next.vx - previous.vx) * fraction,
        vy: previous.vy + (next.vy - previous.vy) * fraction,
      };
    }

    // Wait at the newest known position if the next server update is late.
    const last = history[history.length - 1];
    return last;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.connection.db.ship.removeOnInsert(this.onPlayerInsert);
    this.connection.db.ship.removeOnUpdate(this.onPlayerUpdate);
    this.connection.db.ship.removeOnDelete(this.onPlayerDelete);
    this.snapshots.clear();
  }
}
