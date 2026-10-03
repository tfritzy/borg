import type { Infer } from "spacetimedb";
import ShipRow from "../module_bindings/ship_table";

export type Ship = Infer<typeof ShipRow>;
