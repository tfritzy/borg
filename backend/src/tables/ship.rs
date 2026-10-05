use spacetimedb::Identity;

#[path = "../types/ship_type.rs"]
pub(crate) mod ship_type;

#[path = "../types/ship_behavior.rs"]
pub(crate) mod ship_behavior;

#[path = "../consts/ship_properties.rs"]
pub(crate) mod ship_properties;

#[spacetimedb::table(accessor = ship, public,
    index(accessor = grid_cell, hash(columns = [grid_x, grid_y]))
)]
pub struct Ship {
    #[primary_key]
    #[auto_inc]
    pub(crate) id: u64,
    #[default(1)]
    pub(crate) world_id: u64,
    pub(crate) owner: Option<Identity>,
    pub(crate) ship_type: ship_type::ShipType,
    pub(crate) properties: ship_properties::ShipProperties,
    pub(crate) x: f32,
    pub(crate) y: f32,
    #[default(0)]
    pub(crate) grid_x: i32,
    #[default(0)]
    pub(crate) grid_y: i32,
    pub(crate) max_health: u32,
    pub(crate) health: u32,
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
    #[default(None)]
    pub(crate) behavior: Option<ship_behavior::ShipBehavior>,
}
