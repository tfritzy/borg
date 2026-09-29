export class Vector2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  add(vector: Vector2): Vector2 {
    return new Vector2(this.x + vector.x, this.y + vector.y);
  }

  subtract(vector: Vector2): Vector2 {
    return new Vector2(this.x - vector.x, this.y - vector.y);
  }

  scale(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  dot(vector: Vector2): number {
    return this.x * vector.x + this.y * vector.y;
  }

  get magnitude(): number {
    return Math.hypot(this.x, this.y);
  }

  normalize(): Vector2 {
    const length = this.magnitude;
    return length === 0 ? new Vector2() : this.scale(1 / length);
  }
}
