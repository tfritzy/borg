import type { World } from "../state/world";

export function update(world: World): void {
  world.time = performance.now();
}
