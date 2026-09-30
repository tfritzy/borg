import { Database } from "../util/db";

const MOVEMENT_KEYS = new Map([
  ["w", "w"],
  ["a", "a"],
  ["s", "s"],
  ["d", "d"],
  ["arrowup", "w"],
  ["arrowleft", "a"],
  ["arrowdown", "s"],
  ["arrowright", "d"],
]);

export class PlayerController {
  private database: Database;
  private handleKeyDown: (event: KeyboardEvent) => void;

  constructor(database: Database) {
    this.database = database;

    this.handleKeyDown = (event: KeyboardEvent) => {
      this.onKeyDown(event);
    };

    document.addEventListener("keydown", this.handleKeyDown);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const button = event.key.toLowerCase();
    if (!MOVEMENT_KEYS.has(button)) return;

    const connection = this.database.db;
    if (!connection) return;

    connection.reducers.movePlayer({ button });
  }

  dispose(): void {
    document.removeEventListener("keydown", this.handleKeyDown);
  }
}
