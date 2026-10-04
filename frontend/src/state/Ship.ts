import { Entity } from "./Entity";
import { Label } from "./Label";
import type { Ship } from "../types";
import { Vector2 } from "../util/Vector2";

export class ShipEntity extends Entity {
  row: Ship;
  label: Label | null = null;

  constructor(row: Ship) {
    super("ship", new Vector2(row.x, row.y));
    this.id = row.id.toString();
    this.row = row;
  }

  get shipType(): Ship["shipType"]["tag"] {
    return this.row.shipType.tag;
  }

  rollLabel(): void {
    if (!this.label) this.label = new Label("");
    this.label.roll();
  }
}
