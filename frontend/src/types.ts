import type { Infer } from "spacetimedb";
import PlayerRow from "../module_bindings/player_table";

export type Player = Infer<typeof PlayerRow>;
