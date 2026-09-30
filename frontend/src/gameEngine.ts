import { PlayerController } from "./control/playerController";
import { update } from "./control/update";
import { setupPlayerSubscription } from "./subscription/player";
import { World } from "./state/world";
import { Database } from "./util/db";

export class GameEngine {
  readonly world: World;
  private readonly database: Database;
  private active = false;
  private frameId: number | null = null;
  private unsubscribe: (() => void) | undefined;
  private playerController: PlayerController | undefined;

  constructor(world: World = new World(), database: Database = new Database()) {
    this.world = world;
    this.database = database;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.playerController = new PlayerController(this.database);

    this.database
      .connect()
      .then((connection) => {
        if (!this.active) return;

        this.unsubscribe = setupPlayerSubscription(connection, this.world);
        if (!this.active) {
          this.unsubscribe();
          this.unsubscribe = undefined;
        }
      })
      .catch((error: unknown) => {
        if (this.active) {
          console.error("Failed to connect to SpacetimeDB", error);
        }
      });

    const loop = () => {
      if (!this.active) return;
      update(this.world);
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (!this.active) return;
    this.active = false;
    this.playerController?.dispose();
    this.playerController = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
