import { generateId } from "../util/generateId";
import type { Vector2 } from "../util/Vector2";

export type EntityType = "player";

export class Entity {
  id: string;
  type: EntityType;
  position: Vector2;

  constructor(type: EntityType, position: Vector2) {
    this.type = type;
    this.id = generateId(this.type);
    this.position = position;
  }
}
