import type { DbConnection } from "../../module_bindings";
import { Player as PlayerEntity } from "../state/Player";
import type { World } from "../state/world";
import type { Player } from "../types";
import { Vector2 } from "../util/Vector2";

// Server positions arrive at 10 Hz; hold a little over one update for interpolation.
const INTERPOLATION_DELAY_MS = 150;
const MAX_SNAPSHOTS = 32;

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

    connection.db.player.onInsert(this.onPlayerInsert);
    connection.db.player.onUpdate(this.onPlayerUpdate);
    connection.db.player.onDelete(this.onPlayerDelete);
  }

  private readonly onPlayerInsert = (_ctx: unknown, player: Player) => {
    this.syncPlayer(player);
  };

  private readonly onPlayerUpdate = (
    _ctx: unknown,
    _oldPlayer: Player,
    player: Player,
  ) => {
    this.syncPlayer(player);
  };

  private readonly onPlayerDelete = (_ctx: unknown, player: Player) => {
    if (this.disposed) return;
    const identity = player.identity.toHexString();
    if (identity === this.identity) return;
    this.world.entities.delete(identity);
    this.snapshots.delete(identity);
  };

  private syncPlayer(player: Player): void {
    if (this.disposed) return;
    const identity = player.identity.toHexString();
    if (identity === this.identity) return;

    let entity = this.world.entities.get(identity);
    if (!(entity instanceof PlayerEntity)) {
      entity = new PlayerEntity(new Vector2(player.x, player.y));
      entity.id = identity;
      this.world.entities.set(identity, entity);
    }

    this.recordSnapshot(identity, player, performance.now());
  }

  update(time: number): void {
    for (const identity of this.snapshots.keys()) {
      const entity = this.world.entities.get(identity);
      const position = this.sampleSnapshot(identity, time);
      if (entity instanceof PlayerEntity && position) {
        entity.position.x = position.x;
        entity.position.y = position.y;
        entity.faceVelocity(position.vx, position.vy);
      }
    }
  }

  private recordSnapshot(
    identity: string,
    position: Pick<Player, "x" | "y" | "vx" | "vy" | "serverTick">,
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
    if (last && position.serverTick === last.serverTick
      && position.x === last.x && position.y === last.y) return;

    if (last && history.length > 0
      && receivedAt - last.receivedAt > INTERPOLATION_DELAY_MS) {
      // Resume from the held pose after a stalled stream.
      history.push({ ...last, receivedAt: receivedAt - INTERPOLATION_DELAY_MS });
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

  private sampleSnapshot(identity: string, time: number): Pick<Snapshot, "x" | "y" | "vx" | "vy"> | undefined {
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
      const fraction = duration > 0
        ? (renderTime - previous.receivedAt) / duration
        : 1;
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
    this.connection.db.player.removeOnInsert(this.onPlayerInsert);
    this.connection.db.player.removeOnUpdate(this.onPlayerUpdate);
    this.connection.db.player.removeOnDelete(this.onPlayerDelete);
    this.snapshots.clear();
  }
}
