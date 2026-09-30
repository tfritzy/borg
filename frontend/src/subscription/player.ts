import { type DbConnection } from "../../module_bindings";
import { Entity } from "../state/Entity";
import type { World } from "../state/world";
import { Vector2 } from "../util/Vector2";
import type { Player } from "../types";

export function setupPlayerSubscription(
  connection: DbConnection,
  world: World,
): () => void {
  const syncPlayer = (player: Player) => {
    const identity = player.identity.toHexString();
    const existingPlayer = world.entities.get(identity);
    if (existingPlayer) {
      existingPlayer.position.x = player.x;
      existingPlayer.position.y = player.y;
      return;
    }

    const entity = new Entity("player", new Vector2(player.x, player.y));
    entity.id = identity;
    world.entities.set(identity, entity);
  };

  connection.db.player.onInsert((_ctx, player) => {
    syncPlayer(player);
  });
  connection.db.player.onUpdate((_ctx, _oldPlayer, player) => {
    syncPlayer(player);
  });
  connection.db.player.onDelete((_ctx, player) => {
    world.entities.delete(player.identity.toHexString());
  });

  const subscription = connection
    .subscriptionBuilder()
    .onApplied(() => {
      for (const player of connection.db.player.iter()) {
        syncPlayer(player);
      }
    })
    .subscribe(["SELECT * FROM player"]);

  return () => subscription.unsubscribe();
}
