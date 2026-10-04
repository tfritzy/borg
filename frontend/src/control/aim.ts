import { PROJECTILE_SPAWN_OFFSET } from "./consts";

type Motion = { x: number; y: number; vx: number; vy: number };

export function leadDirection(
  source: Motion,
  target: Motion,
  projectileSpeed: number,
): { x: number; y: number } {
  const rx = target.x - source.x;
  const ry = target.y - source.y;
  const distance = Math.hypot(rx, ry);
  if (distance === 0) return { x: 0, y: 0 };
  const direct = { x: rx / distance, y: ry / distance };
  if (projectileSpeed <= 0 || distance <= PROJECTILE_SPAWN_OFFSET) return direct;

  // Projectile velocity includes source velocity, so solve in relative motion.
  const vx = target.vx - source.vx;
  const vy = target.vy - source.vy;
  const a = vx * vx + vy * vy - projectileSpeed * projectileSpeed;
  const b = 2 * (rx * vx + ry * vy - PROJECTILE_SPAWN_OFFSET * projectileSpeed);
  const c = distance * distance - PROJECTILE_SPAWN_OFFSET ** 2;
  let time = Infinity;

  if (Math.abs(a) < 1e-6) {
    if (b < 0) time = -c / b;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      for (const candidate of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
        if (candidate > 0 && candidate < time) time = candidate;
      }
    }
  }

  if (!Number.isFinite(time)) return direct;
  const ix = rx + vx * time;
  const iy = ry + vy * time;
  const length = Math.hypot(ix, iy);
  return length > 0 ? { x: ix / length, y: iy / length } : direct;
}
