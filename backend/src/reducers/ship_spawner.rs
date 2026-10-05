use crate::reducers::collision::grid_cell;
use crate::tables::ship::{
    ship, ship_behavior::ShipBehavior, ship_properties::get_ship_properties, ship_type::ShipType,
    Ship,
};
use crate::tables::world::{AI_DESPAWN_MARGIN, DEFAULT_WORLD_ID};
use spacetimedb::{ReducerContext, Table};
use std::f32::consts::TAU;

const MEAN_SPAWN_INTERVAL_SECONDS: f32 = 5.0;

pub(crate) fn update(
    ctx: &ReducerContext,
    server_tick: u64,
    delta_seconds: f32,
    world_radius: f32,
) {
    if ctx.random::<f32>() >= delta_seconds / MEAN_SPAWN_INTERVAL_SECONDS {
        return;
    }

    let angle = ctx.random::<f32>() * TAU;
    let (sin, cos) = angle.sin_cos();
    let spawn_radius = world_radius + AI_DESPAWN_MARGIN * 0.5;
    let x = spawn_radius * cos;
    let y = spawn_radius * sin;
    let target_angle = ctx.random::<f32>() * TAU;
    let target_radius = ctx.random::<f32>().sqrt() * world_radius * 0.5;
    let (target_sin, target_cos) = target_angle.sin_cos();
    let dx = target_radius * target_cos - x;
    let dy = target_radius * target_sin - y;
    let distance = dx.hypot(dy);
    let ship_type = ShipType::Gat;
    let properties = *get_ship_properties(&ship_type);
    ctx.db.ship().insert(Ship {
        id: 0,
        world_id: DEFAULT_WORLD_ID,
        owner: None,
        ship_type,
        properties,
        x,
        y,
        grid_x: grid_cell(x),
        grid_y: grid_cell(y),
        max_health: properties.max_health,
        health: properties.max_health,
        vx: dx / distance * properties.max_speed,
        vy: dy / distance * properties.max_speed,
        buttons: None,
        server_tick,
        last_processed_input_tick: None,
        behavior: Some(ShipBehavior::Traffic),
    });
}
