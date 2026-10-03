import type { ShipType } from "../types";
import { shipSprites } from "./ships";

export class ShipRenderer {
  private readonly images = new Map<string, HTMLImageElement>();

  constructor() {
    for (const sprite of Object.values(shipSprites)) {
      const image = new Image();
      image.onerror = () => console.error(`Failed to load ship sprite: ${sprite.src}`);
      image.src = sprite.src;
      this.images.set(sprite.src, image);
    }
  }

  draw(ctx: CanvasRenderingContext2D, shipType: ShipType): void {
    const sprite = shipSprites[shipType];
    const image = this.images.get(sprite.src);
    if (!image?.complete || image.naturalWidth === 0) return;

    ctx.drawImage(image, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
  }
}
