import { ShipEntity } from "../state/Ship";
import type { World } from "../state/world";
import type { Ship } from "../types";
import { Vector2 } from "../util/Vector2";

export function syncShipMetadata(world: World, ship: Ship): ShipEntity {
  const id = ship.id.toString();
  let entity = world.entities.get(id);
  if (!entity) {
    entity = new ShipEntity(new Vector2(ship.x, ship.y), ship.shipType.tag);
    entity.id = id;
    world.entities.set(id, entity);
  }
  entity.shipType = ship.shipType.tag;
  return entity;
}
