import type { ShipEntity } from "./Ship";
import type { ProjectileEntity } from "./Projectile";
import { Camera } from "./Camera";
import type { WorldRecord } from "../types";

export class World {
  public readonly id: bigint;
  public entities: Map<string, ShipEntity> = new Map();
  public projectiles: Map<bigint, ProjectileEntity> = new Map();
  public readonly camera = new Camera();
  public row: WorldRecord | null = null;
  public time: number = performance.now();

  constructor(id: bigint = 1n) {
    this.id = id;
  }
}
