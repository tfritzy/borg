import type { ShipEntity } from "../state/Ship";
import { shipSprites } from "./ships";

export class ShipRenderer {
  private readonly images = new Map<string, HTMLImageElement>();

  constructor() {
    for (const sprite of Object.values(shipSprites)) {
      const image = new Image();
      image.onerror = () =>
        console.error(`Failed to load ship sprite: ${sprite.src}`);
      image.src = sprite.src;
      this.images.set(sprite.src, image);
    }
  }

  draw(ctx: CanvasRenderingContext2D, entity: ShipEntity): void {
    const sprite = shipSprites[entity.shipType];
    const image = this.images.get(sprite.src);
    if (image?.complete && image.naturalWidth > 0) {
      ctx.drawImage(
        image,
        -sprite.width / 2,
        -sprite.height / 2,
        sprite.width,
        sprite.height,
      );
    }

    if (entity.label?.phrase) {
      ctx.save();
      ctx.rotate(entity.rotation - Math.PI / 2);
      ctx.fillStyle = "#000000";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(entity.label.phrase, 0, -sprite.height / 2 - 4);
      ctx.restore();
    }
  }
}
