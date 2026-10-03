pub const DEFAULT_WORLD_ID: u64 = 1;

#[spacetimedb::table(accessor = world, public)]
pub struct World {
    #[primary_key]
    pub(crate) id: u64,
}
