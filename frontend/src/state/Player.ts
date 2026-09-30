import { Entity } from "./Entity";
import type { Vector2 } from "../util/Vector2";

export class Player extends Entity {
  constructor(position: Vector2) {
    super("player", position);
  }
}
