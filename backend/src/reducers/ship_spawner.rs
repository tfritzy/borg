use crate::tables::ship::{ship, ship_behavior::ShipBehavior, ship_type::ShipType, Ship};
use spacetimedb::{ReducerContext, Table};
use std::f32::consts::TAU;

const SPAWN_RADIUS: f32 = 1000.0;
const MEAN_SPAWN_INTERVAL_SECONDS: f32 = 5.0;

pub(crate) fn update(ctx: &ReducerContext, server_tick: u64, delta_seconds: f32) {
    if ctx.random::<f32>() >= delta_seconds / MEAN_SPAWN_INTERVAL_SECONDS {
        return;
    }

    let angle = ctx.random::<f32>() * TAU;
    let radius = ctx.random::<f32>().sqrt() * SPAWN_RADIUS;
    let (sin, cos) = angle.sin_cos();
    ctx.db.ship().insert(Ship {
        id: 0,
        owner: None,
        ship_type: ShipType::Gat,
        x: radius * cos,
        y: radius * sin,
        vx: 0.0,
        vy: 0.0,
        buttons: None,
        server_tick,
        last_processed_input_tick: None,
        behavior: Some(ShipBehavior::Traffic),
    });
}
