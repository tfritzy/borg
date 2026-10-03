import type { ShipEntity } from "./Ship";

export class World {
  public entities: Map<string, ShipEntity> = new Map();
  public time: number = performance.now();
}
