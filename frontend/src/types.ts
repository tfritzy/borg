import type { Infer } from "spacetimedb";
import type ShipRow from "../module_bindings/ship_table";

export type Ship = Infer<typeof ShipRow>;
export type ShipType = Ship["shipType"]["tag"];
