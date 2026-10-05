use crate::tables::{
    projectile::{projectile, projectile_type::ProjectileType, Projectile},
    ship::{ship, ship_properties::get_ship_properties},
};
use spacetimedb::{ReducerContext, Table};

const PROJECTILE_SPAWN_OFFSET: f32 = 16.0;

#[spacetimedb::reducer]
pub fn fire(
    ctx: &ReducerContext,
    ship_id: u64,
    direction_x: f32,
    direction_y: f32,
) -> Result<(), String> {
    if !direction_x.is_finite() || !direction_y.is_finite() {
        return Err("Projectile direction must be finite".into());
    }

    let length = direction_x.hypot(direction_y);
    if length == 0.0 {
        return Err("Projectile direction must not be zero".into());
    }
    let direction_x = direction_x / length;
    let direction_y = direction_y / length;

    let owner = ctx.sender();
    let source = ctx
        .db
        .ship()
        .id()
        .find(ship_id)
        .ok_or_else(|| "Source ship does not exist".to_string())?;
    if source.owner != Some(owner) {
        return Err("You may only fire from your own ship".into());
    }

    let properties = get_ship_properties(&source.ship_type);
    for _ in 0..properties.projectile_count {
        let spread = (ctx.random::<f32>() * 2.0 - 1.0) * properties.accuracy;
        let (sin, cos) = spread.sin_cos();
        let (direction_x, direction_y) = (
            direction_x * cos - direction_y * sin,
            direction_x * sin + direction_y * cos,
        );

        ctx.db.projectile().insert(Projectile {
            id: 0,
            world_id: source.world_id,
            projectile_type: ProjectileType::Bullet,
            x: source.x + direction_x * PROJECTILE_SPAWN_OFFSET,
            y: source.y + direction_y * PROJECTILE_SPAWN_OFFSET,
            vx: source.vx + direction_x * properties.projectile_speed,
            vy: source.vy + direction_y * properties.projectile_speed,
            owner,
            ship: source.id,
            damage: properties.damage,
            lifetime_seconds: properties.projectile_lifetime,
            created: ctx.timestamp,
        });
    }

    Ok(())
}
