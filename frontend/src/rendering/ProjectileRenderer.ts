import type { ProjectileType } from "../types";
import { projectileSprites } from "./projectiles";

export class ProjectileRenderer {
  private readonly images = new Map<string, HTMLImageElement>();

  constructor() {
    for (const sprite of Object.values(projectileSprites)) {
      const image = new Image();
      image.onerror = () => console.error(`Failed to load projectile sprite: ${sprite.src}`);
      image.src = sprite.src;
      this.images.set(sprite.src, image);
    }
  }

  draw(ctx: CanvasRenderingContext2D, projectileType: ProjectileType): void {
    const sprite = projectileSprites[projectileType];
    const image = this.images.get(sprite.src);
    if (!image?.complete || image.naturalWidth === 0) return;

    ctx.drawImage(image, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
  }
}
