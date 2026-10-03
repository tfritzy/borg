use spacetimedb::{Identity, Timestamp};

#[spacetimedb::table(accessor = projectile, public)]
pub struct Projectile {
    #[primary_key]
    #[auto_inc]
    pub(crate) id: u64,
    #[default(1)]
    pub(crate) world_id: u64,
    pub(crate) projectile_type: String,
    pub(crate) x: f32,
    pub(crate) y: f32,
    pub(crate) vx: f32,
    pub(crate) vy: f32,
    pub(crate) owner: Identity,
    pub(crate) ship: u64,
    pub(crate) damage: u32,
    pub(crate) created: Timestamp,
}
