export class Background {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  render(origin: { x: number; y: number }) {
    const { ctx, canvas } = this;
    const dpr = window.devicePixelRatio || 1;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const gridSize = 32;
    const startX = ((origin.x % gridSize) + gridSize) % gridSize;
    const startY = ((origin.y % gridSize) + gridSize) % gridSize;

    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= canvas.width / dpr; x += gridSize) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, canvas.height / dpr);
    }

    for (let y = startY; y <= canvas.height / dpr; y += gridSize) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(canvas.width / dpr, Math.round(y) + 0.5);
    }

    ctx.stroke();
  }
}
