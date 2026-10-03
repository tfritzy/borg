import { Entity } from "./Entity";
import type { ShipType } from "../types";
import type { Vector2 } from "../util/Vector2";

// A ship's appearance is independent of who controls it.
export class ShipEntity extends Entity {
  shipType: ShipType;

  constructor(position: Vector2, shipType: ShipType) {
    super("ship", position);
    this.shipType = shipType;
  }
}
