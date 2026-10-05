import type { World } from "./world";

const FOLLOW_SMOOTHING_MS = 100;
const MAX_FRAME_GAP_MS = 250;
const TELEPORT_DISTANCE = 500;

export class Camera {
  x = 0;
  y = 0;
  private followId: string | null = null;
  private lastUpdateTime: number | null = null;
  private hasTarget = false;

  follow(id: string | null): void {
    if (id === this.followId) return;
    this.followId = id;
    this.lastUpdateTime = null;
    this.hasTarget = false;
  }

  update(world: World): void {
    const entity = this.followId === null ? undefined : world.entities.get(this.followId);
    if (!entity) return;

    const targetX = entity.position.x;
    const targetY = entity.position.y;
    const elapsed = this.lastUpdateTime === null ? 0 : Math.max(0, world.time - this.lastUpdateTime);
    this.lastUpdateTime = world.time;

    if (
      !this.hasTarget ||
      elapsed > MAX_FRAME_GAP_MS ||
      Math.hypot(targetX - this.x, targetY - this.y) > TELEPORT_DISTANCE
    ) {
      this.x = targetX;
      this.y = targetY;
      this.hasTarget = true;
      return;
    }

    const blend = 1 - Math.exp(-elapsed / FOLLOW_SMOOTHING_MS);
    this.x += (targetX - this.x) * blend;
    this.y += (targetY - this.y) * blend;
  }
}
