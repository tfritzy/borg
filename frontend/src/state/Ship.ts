import { Entity } from "./Entity";
import { Label } from "./Label";
import type { ShipType } from "../types";
import type { Vector2 } from "../util/Vector2";

export class ShipEntity extends Entity {
  shipType: ShipType;
  label: Label | null = null;

  constructor(position: Vector2, shipType: ShipType) {
    super("ship", position);
    this.shipType = shipType;
  }

  rollLabel(): void {
    if (!this.label) this.label = new Label("");
    this.label.roll();
  }
}
