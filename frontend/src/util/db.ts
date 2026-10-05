import { DbConnection } from "../../module_bindings";

export class Database {
  public db: DbConnection | null = null;
  private pendingConnect: Promise<DbConnection> | null = null;

  connect(token?: string): Promise<DbConnection> {
    if (this.db?.isActive) return Promise.resolve(this.db);
    if (this.pendingConnect) return this.pendingConnect;

    let connection: DbConnection | null = null;
    const connectPromise = new Promise<DbConnection>((resolve, reject) => {
      let settled = false;
      let builder = DbConnection.builder()
        .withConfirmedReads(false)
        .withUri(
          import.meta.env.VITE_SPACETIMEDB_URI || "http://localhost:3000",
        )
        .withDatabaseName(import.meta.env.VITE_SPACETIMEDB_MODULE || "typar");

      if (token) builder = builder.withToken(token);

      builder
        .onConnect((connected) => {
          settled = true;
          this.db = connected;
          resolve(connected);
        })
        .onConnectError((_ctx, error) => {
          this.db = null;
          if (!settled) {
            settled = true;
            reject(error);
          }
        })
        .onDisconnect(() => {
          if (this.db === connection) this.db = null;
          if (!settled) {
            settled = true;
            reject(new Error("Disconnected before connecting to SpacetimeDB"));
          }
        });

      connection = builder.build();
      this.db = connection;
    });

    this.pendingConnect = connectPromise.finally(() => {
      this.pendingConnect = null;
    });
    return this.pendingConnect;
  }
}
