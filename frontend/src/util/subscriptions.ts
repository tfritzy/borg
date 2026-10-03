import type { DbConnection, SubscriptionHandle } from "../../module_bindings";

export function subscribeToPlayers(connection: DbConnection): SubscriptionHandle {
  return connection.subscriptionBuilder().subscribe(["SELECT * FROM ship"]);
}
