import type { Projectile } from "../types";
import { Vector2 } from "../util/Vector2";

const SNAP_DISTANCE = 100;

export class ProjectileEntity {
  row: Projectile;
  position: Vector2;
  private lastTime: number;

  constructor(row: Projectile, time: number) {
    this.row = row;
    this.position = new Vector2(row.x, row.y);
    this.lastTime = time;
  }

  update(time: number): void {
    if (time <= this.lastTime) return;
    const elapsed = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.position.x += this.row.vx * elapsed;
    this.position.y += this.row.vy * elapsed;
  }

  sync(row: Projectile, time: number): void {
    this.update(time);
    this.row = row;
    if (Math.hypot(row.x - this.position.x, row.y - this.position.y) > SNAP_DISTANCE) {
      this.position.x = row.x;
      this.position.y = row.y;
    }
  }
}
