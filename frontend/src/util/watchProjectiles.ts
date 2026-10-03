import type { DbConnection } from "../../module_bindings";
import type { World } from "../state/world";
import type { Projectile } from "../types";

export function watchProjectiles(connection: DbConnection, world: World): () => void {
  const onInsert = (_ctx: unknown, projectile: Projectile) => {
    world.projectiles.set(projectile.id, projectile);
  };
  const onUpdate = (_ctx: unknown, _old: Projectile, projectile: Projectile) => {
    world.projectiles.set(projectile.id, projectile);
  };
  const onDelete = (_ctx: unknown, projectile: Projectile) => {
    world.projectiles.delete(projectile.id);
  };

  connection.db.projectile.onInsert(onInsert);
  connection.db.projectile.onUpdate(onUpdate);
  connection.db.projectile.onDelete(onDelete);

  return () => {
    connection.db.projectile.removeOnInsert(onInsert);
    connection.db.projectile.removeOnUpdate(onUpdate);
    connection.db.projectile.removeOnDelete(onDelete);
    world.projectiles.clear();
  };
}
