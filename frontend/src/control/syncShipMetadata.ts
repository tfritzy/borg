import { ShipEntity } from "../state/Ship";
import type { World } from "../state/world";
import type { Ship } from "../types";

export function syncShipMetadata(world: World, ship: Ship): ShipEntity {
  const id = ship.id.toString();
  let entity = world.entities.get(id);
  if (!entity) {
    entity = new ShipEntity(ship);
    world.entities.set(id, entity);
  } else {
    entity.row = ship;
  }
  return entity;
}
