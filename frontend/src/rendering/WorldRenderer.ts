import type { World } from "../state/world";
import { Background } from "./Background";
import { ProjectileRenderer } from "./ProjectileRenderer";
import { ShipRenderer } from "./ShipRenderer";

export class WorldRenderer {
  world: World;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver | null = null;
  private background: Background;
  private readonly ships = new ShipRenderer();
  private readonly projectiles = new ProjectileRenderer();

  constructor(canvas: HTMLCanvasElement, world: World) {
    this.canvas = canvas;
    this.world = world;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
    this.background = new Background(canvas, ctx);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
  }

  render(connectionIdentity: string | undefined) {
    const { ctx, canvas } = this;
    this.world.camera.update(this.world);
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const origin = {
      x: width / 2 - this.world.camera.x,
      y: height / 2 + this.world.camera.y,
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    this.background.render(origin, this.world.row?.radius ?? null);

    for (const entity of this.world.entities.values()) {
      const x = origin.x + entity.position.x;
      const y = origin.y - entity.position.y;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 2 - entity.rotation);
      this.ships.draw(ctx, entity, connectionIdentity);
      ctx.restore();
    }

    for (const projectile of this.world.projectiles.values()) {
      ctx.save();
      ctx.translate(origin.x + projectile.position.x, origin.y - projectile.position.y);
      this.projectiles.draw(ctx, projectile.row.projectileType.tag);
      ctx.restore();
    }
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
