import { PlayerController } from "./control/playerController";
import { update } from "./control/update";
import { World } from "./state/world";
import { Database } from "./util/db";

export class GameEngine {
  readonly world: World;
  private readonly database: Database;
  private active = false;
  private frameId: number | null = null;
  private playerController: PlayerController | undefined;

  constructor(world: World = new World(), database: Database = new Database()) {
    this.world = world;
    this.database = database;
  }

  start(): void {
    if (this.active) return;
    this.active = true;

    this.database
      .connect()
      .then((connection) => {
        if (!this.active) return;
        this.playerController = new PlayerController(connection, this.world);
      })
      .catch((error: unknown) => {
        if (this.active) {
          console.error("Failed to connect to SpacetimeDB", error);
        }
      });

    const loop = () => {
      if (!this.active) return;
      update(this.world);
      this.playerController?.update(this.world.time);
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (!this.active) return;
    this.active = false;
    this.playerController?.dispose();
    this.playerController = undefined;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
