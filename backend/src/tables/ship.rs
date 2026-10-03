use spacetimedb::Identity;

#[spacetimedb::table(accessor = ship, public)]
pub struct Ship {
    #[primary_key]
    #[auto_inc]
    pub(crate) id: u64,
    pub(crate) owner: Option<Identity>,
    pub(crate) x: f32,
    pub(crate) y: f32,
    #[default(0.0)]
    pub(crate) vx: f32,
    #[default(0.0)]
    pub(crate) vy: f32,
    #[default(0)]
    pub(crate) buttons: u32,
    #[default(0)]
    pub(crate) server_tick: u64,
    #[default(0)]
    pub(crate) last_processed_input_tick: u64,
}
