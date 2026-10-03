import type { ShipEntity } from "./Ship";

export class World {
  public readonly id: bigint;
  public entities: Map<string, ShipEntity> = new Map();
  public time: number = performance.now();

  constructor(id: bigint = 1n) {
    this.id = id;
  }
}
