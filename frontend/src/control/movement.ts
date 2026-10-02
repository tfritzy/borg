export const STEP_SECONDS = 1 / 60;
export const STEP_MS = 1000 / 60;
const MAX_SPEED = 60;
const THRUST = 120;
const LINEAR_DAMPING = 1.5;

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
): void {
  const damping = Math.exp(-LINEAR_DAMPING * STEP_SECONDS);
  state.vx = (state.vx + moveX * THRUST * STEP_SECONDS) * damping;
  state.vy = (state.vy + moveY * THRUST * STEP_SECONDS) * damping;

  const speed = Math.hypot(state.vx, state.vy);
  if (speed > MAX_SPEED) {
    state.vx *= MAX_SPEED / speed;
    state.vy *= MAX_SPEED / speed;
  }

  state.x += state.vx * STEP_SECONDS;
  state.y += state.vy * STEP_SECONDS;
}
