pub const DEFAULT_WORLD_ID: u64 = 1;
pub const DEFAULT_WORLD_RADIUS: f32 = 1000.0;
pub const AI_DESPAWN_MARGIN: f32 = 80.0;

#[spacetimedb::table(accessor = world, public)]
pub struct World {
    #[primary_key]
    pub(crate) id: u64,
    #[default(DEFAULT_WORLD_RADIUS)]
    pub(crate) radius: f32,
}
