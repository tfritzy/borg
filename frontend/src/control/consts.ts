// Remote positions arrive at 10 Hz; hold a little over one update for interpolation.
export const INTERPOLATION_DELAY_MS = 150;
export const MAX_SNAPSHOTS = 32;
export const TYPING_RANGE = 500;

// Keep this aligned with backend/src/reducers/fire.rs.
export const PROJECTILE_SPAWN_OFFSET = 16;
