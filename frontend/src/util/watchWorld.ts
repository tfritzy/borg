import type { DbConnection } from "../../module_bindings";
import type { World } from "../state/world";
import type { WorldRecord } from "../types";

export function watchWorld(connection: DbConnection, world: World): () => void {
  const onInsert = (_ctx: unknown, row: WorldRecord) => {
    if (row.id === world.id) world.row = row;
  };
  const onUpdate = (_ctx: unknown, _old: WorldRecord, row: WorldRecord) => {
    if (row.id === world.id) world.row = row;
  };
  const onDelete = (_ctx: unknown, row: WorldRecord) => {
    if (row.id === world.id) world.row = null;
  };

  connection.db.world.onInsert(onInsert);
  connection.db.world.onUpdate(onUpdate);
  connection.db.world.onDelete(onDelete);

  return () => {
    connection.db.world.removeOnInsert(onInsert);
    connection.db.world.removeOnUpdate(onUpdate);
    connection.db.world.removeOnDelete(onDelete);
    world.row = null;
  };
}
