import type { SubscriptionHandle } from "../module_bindings";
import { PlayerController } from "./control/playerController";
import { RemotePlayerController } from "./control/remotePlayerController";
import { World } from "./state/world";
import { Database } from "./util/db";
import { subscribeToPlayers } from "./util/subscriptions";

export class GameEngine {
  readonly world: World;
  private readonly database: Database;
  private active = false;
  private frameId: number | null = null;
  private playerController: PlayerController | undefined;
  private remotePlayerController: RemotePlayerController | undefined;
  private playerSubscription: SubscriptionHandle | undefined;

  constructor(world: World = new World(), database: Database = new Database()) {
    this.world = world;
    this.database = database;
  }

  start(render: () => void): void {
    if (this.active) return;
    this.active = true;

    this.database
      .connect()
      .then((connection) => {
        if (!this.active) return;
        this.playerController = new PlayerController(connection, this.world);
        this.remotePlayerController = new RemotePlayerController(connection, this.world);
        this.playerSubscription = subscribeToPlayers(connection);
      })
      .catch((error: unknown) => {
        if (this.active) {
          console.error("Failed to connect to SpacetimeDB", error);
        }
      });

    const loop = (time: number) => {
      if (!this.active) return;
      this.world.time = time;
      this.playerController?.update(this.world.time);
      this.remotePlayerController?.update(this.world.time);
      render();
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (!this.active) return;
    this.active = false;
    this.playerController?.dispose();
    this.playerController = undefined;
    this.remotePlayerController?.dispose();
    this.remotePlayerController = undefined;
    this.playerSubscription?.unsubscribe();
    this.playerSubscription = undefined;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
