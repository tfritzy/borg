import type { Entity } from "./Entity";

export class World {
  public entities: Map<string, Entity> = new Map();
  public time: number = performance.now();
}
