import type { Infer } from "spacetimedb";
import type ShipRow from "../module_bindings/ship_table";
import type ProjectileRow from "../module_bindings/projectile_table";
import type WorldRow from "../module_bindings/world_table";

export type Ship = Infer<typeof ShipRow>;
export type ShipType = Ship["shipType"]["tag"];
export type Projectile = Infer<typeof ProjectileRow>;
export type ProjectileType = Projectile["projectileType"]["tag"];
export type WorldRecord = Infer<typeof WorldRow>;
