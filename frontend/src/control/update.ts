import type { World } from "../state/world";

export function update(world: World): void {
  const time = performance.now();
  const deltaTime = time - world.time;

  world.entities.forEach((entity) => {
    entity.position.x += 0.1 * deltaTime;
  });

  world.time = time;
}
