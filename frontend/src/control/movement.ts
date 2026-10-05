export const STEP_SECONDS = 1 / 60;
export const STEP_MS = 1000 / 60;
import type { Ship } from "../types";

type MovementProperties = Pick<Ship["properties"], "thrust" | "maxSpeed" | "linearDamping">;

export type MovementState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function advance(
  state: MovementState,
  moveX: number,
  moveY: number,
  properties: MovementProperties,
  radius: number,
): void {
  const damping = Math.exp(-properties.linearDamping * STEP_SECONDS);
  state.vx = (state.vx + moveX * properties.thrust * STEP_SECONDS) * damping;
  state.vy = (state.vy + moveY * properties.thrust * STEP_SECONDS) * damping;

  const speed = Math.hypot(state.vx, state.vy);
  if (speed > properties.maxSpeed) {
    state.vx *= properties.maxSpeed / speed;
    state.vy *= properties.maxSpeed / speed;
  }

  state.x += state.vx * STEP_SECONDS;
  state.y += state.vy * STEP_SECONDS;

  const distance = Math.hypot(state.x, state.y);
  if (distance > radius) {
    const nx = state.x / distance;
    const ny = state.y / distance;
    state.x = nx * radius;
    state.y = ny * radius;
    const outwardSpeed = Math.max(0, state.vx * nx + state.vy * ny);
    state.vx -= outwardSpeed * nx;
    state.vy -= outwardSpeed * ny;
  }
}
