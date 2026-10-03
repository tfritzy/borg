use spacetimedb::Identity;

#[path = "../types/ship_type.rs"]
pub(crate) mod ship_type;

#[spacetimedb::table(accessor = ship, public)]
pub struct Ship {
    #[primary_key]
    #[auto_inc]
    pub(crate) id: u64,
    pub(crate) owner: Option<Identity>,
    pub(crate) ship_type: ship_type::ShipType,
    pub(crate) x: f32,
    pub(crate) y: f32,
    #[default(0.0)]
    pub(crate) vx: f32,
    #[default(0.0)]
    pub(crate) vy: f32,
    #[default(None)]
    pub(crate) buttons: Option<u32>,
    #[default(0)]
    pub(crate) server_tick: u64,
    #[default(None)]
    pub(crate) last_processed_input_tick: Option<u64>,
}
