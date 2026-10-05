use crate::tables::{
    player_input_buffer::{player_input_buffer, InputFrame},
    projectile::projectile,
    ship::{ship, Ship},
    simulation_timer::{simulation_timer, SimulationTimer},
    world::{world, AI_DESPAWN_MARGIN, DEFAULT_WORLD_ID},
};
use spacetimedb::{ReducerContext, Table, TimeDuration};

const SERVER_UPDATE_HZ: u32 = 10;
const PHYSICS_HZ: u32 = 60;
const PHYSICS_STEPS_PER_SERVER_UPDATE: u32 = PHYSICS_HZ / SERVER_UPDATE_HZ;
const SERVER_UPDATE_INTERVAL_MICROS: i64 = 1_000_000 / SERVER_UPDATE_HZ as i64;
const SERVER_DELTA_SECONDS: f32 = SERVER_UPDATE_INTERVAL_MICROS as f32 / 1_000_000.0;
const PHYSICS_DELTA_SECONDS: f32 = 1.0 / PHYSICS_HZ as f32;

pub(crate) fn ensure_simulation_timer(ctx: &ReducerContext) {
    if ctx.db.simulation_timer().count() == 0 {
        ctx.db.simulation_timer().insert(SimulationTimer {
            scheduled_id: 0,
            world_id: DEFAULT_WORLD_ID,
            scheduled_at: TimeDuration::from_micros(SERVER_UPDATE_INTERVAL_MICROS).into(),
            server_tick: 0,
        });
    }
}

#[spacetimedb::reducer]
pub fn update_players(ctx: &ReducerContext, timer: SimulationTimer) -> Result<(), String> {
    if ctx.sender() != ctx.database_identity() {
        return Err("The simulation may only be updated by the scheduler".into());
    }

    super::lifecycle::ensure_world(ctx);
    let radius = ctx
        .db
        .world()
        .id()
        .find(timer.world_id)
        .ok_or_else(|| "Simulation world does not exist".to_string())?
        .radius;
    let server_tick = timer.server_tick.saturating_add(1);
    ctx.db
        .simulation_timer()
        .scheduled_id()
        .update(SimulationTimer {
            server_tick,
            ..timer
        });

    let ships: Vec<_> = ctx.db.ship().iter().collect();
    for mut ship in ships {
        ship.server_tick = server_tick;
        if ship.behavior.is_some() {
            super::ship_behavior::update(&mut ship, SERVER_DELTA_SECONDS);
        } else if let Some(mut input_buffer) = ship
            .owner
            .and_then(|owner| ctx.db.player_input_buffer().identity().find(owner))
        {
            process_inputs(&mut ship, &mut input_buffer.inputs, radius);

            ctx.db.player_input_buffer().identity().update(input_buffer);
        }

        if ship.owner.is_some() && ship.behavior.is_none() {
            constrain_player(&mut ship, radius);
        }

        ship.grid_x = super::collision::grid_cell(ship.x);
        ship.grid_y = super::collision::grid_cell(ship.y);

        if ship.behavior.is_some() && ship.x.hypot(ship.y) > radius + AI_DESPAWN_MARGIN {
            ctx.db.ship().id().delete(ship.id);
        } else {
            ctx.db.ship().id().update(ship);
        }
    }

    super::ship_spawner::update(ctx, server_tick, SERVER_DELTA_SECONDS, radius);

    for mut projectile in ctx.db.projectile().iter().collect::<Vec<_>>() {
        projectile.x += projectile.vx * SERVER_DELTA_SECONDS;
        projectile.y += projectile.vy * SERVER_DELTA_SECONDS;
        if let Some(ship_id) = super::collision::first_ship_hit(ctx, &projectile) {
            if let Some(mut ship) = ctx.db.ship().id().find(ship_id) {
                ship.health = ship.health.saturating_sub(projectile.damage);
                if ship.health == 0 {
                    ctx.db.ship().id().delete(ship_id);
                } else {
                    ctx.db.ship().id().update(ship);
                }
            }
            ctx.db.projectile().id().delete(projectile.id);
            continue;
        }
        if ctx
            .timestamp
            .duration_since(projectile.created)
            .is_some_and(|age| age.as_secs_f32() >= projectile.lifetime_seconds)
        {
            ctx.db.projectile().id().delete(projectile.id);
        } else {
            ctx.db.projectile().id().update(projectile);
        }
    }

    Ok(())
}

fn process_inputs(player: &mut Ship, inputs: &mut Vec<InputFrame>, radius: f32) {
    let count = inputs.len().min(PHYSICS_STEPS_PER_SERVER_UPDATE as usize);
    for input in inputs.drain(..count) {
        update_movement(player, input.move_x, input.move_y, radius);
        player.buttons = Some(input.buttons);
        player.last_processed_input_tick = Some(input.input_tick);
    }
}

fn update_movement(player: &mut Ship, move_x: f32, move_y: f32, radius: f32) {
    let properties = &player.properties;
    let damping = (-properties.linear_damping * PHYSICS_DELTA_SECONDS).exp();
    player.vx = (player.vx + move_x * properties.thrust * PHYSICS_DELTA_SECONDS) * damping;
    player.vy = (player.vy + move_y * properties.thrust * PHYSICS_DELTA_SECONDS) * damping;

    let speed = player.vx.hypot(player.vy);
    if speed > properties.max_speed {
        player.vx *= properties.max_speed / speed;
        player.vy *= properties.max_speed / speed;
    }

    player.x += player.vx * PHYSICS_DELTA_SECONDS;
    player.y += player.vy * PHYSICS_DELTA_SECONDS;
    constrain_player(player, radius);
}

fn constrain_player(player: &mut Ship, radius: f32) {
    let distance = player.x.hypot(player.y);
    if distance <= radius {
        return;
    }

    let nx = player.x / distance;
    let ny = player.y / distance;
    player.x = nx * radius;
    player.y = ny * radius;
    let outward_speed = (player.vx * nx + player.vy * ny).max(0.0);
    player.vx -= outward_speed * nx;
    player.vy -= outward_speed * ny;
}
