import type { DbConnection, SubscriptionHandle } from "../../module_bindings";

export function subscribeToWorld(connection: DbConnection, worldId: bigint): SubscriptionHandle {
  return connection.subscriptionBuilder().subscribe([
    `SELECT * FROM ship WHERE world_id = ${worldId}`,
    `SELECT * FROM projectile WHERE world_id = ${worldId}`,
  ]);
}
