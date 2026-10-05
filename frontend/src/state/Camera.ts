import type { World } from "./world";

export class Camera {
  x = 0;
  y = 0;
  private followId: string | null = null;

  follow(id: string | null): void {
    this.followId = id;
  }

  update(world: World): void {
    const entity = this.followId === null ? undefined : world.entities.get(this.followId);
    if (!entity) return;
    this.x = entity.position.x;
    this.y = entity.position.y;
  }
}
