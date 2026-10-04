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
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      const { phrase, i } = entity.label;
      const typed = phrase.slice(0, i);
      const x = -ctx.measureText(phrase).width / 2;
      const y = -sprite.height / 2 - 4;
      if (typed) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.fillText(typed, x, y);
      }
      ctx.fillStyle = "#000000";
      ctx.fillText(phrase.slice(i), x + ctx.measureText(typed).width, y);
      ctx.restore();
    }
  }
}
