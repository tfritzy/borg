import type { Infer } from "spacetimedb";
import PersonRow from "../module_bindings/person_table";
import PlayerRow from "../module_bindings/player_table";

export type Person = Infer<typeof PersonRow>;
export type Player = Infer<typeof PlayerRow>;
