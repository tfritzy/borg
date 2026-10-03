use crate::tables::{
    player_input_buffer::{player_input_buffer, InputFrame},
    ship::{ship, Ship},
    simulation_timer::{simulation_timer, SimulationTimer},
};
use spacetimedb::{ReducerContext, Table, TimeDuration};

const SERVER_UPDATE_HZ: u32 = 10;
const PHYSICS_HZ: u32 = 60;
const PHYSICS_STEPS_PER_SERVER_UPDATE: u32 = PHYSICS_HZ / SERVER_UPDATE_HZ;
const SERVER_UPDATE_INTERVAL_MICROS: i64 = 1_000_000 / SERVER_UPDATE_HZ as i64;
const PHYSICS_DELTA_SECONDS: f32 = 1.0 / PHYSICS_HZ as f32;

const PLAYER_MAX_SPEED: f32 = 60.0;
const PLAYER_THRUST: f32 = 120.0;
const PLAYER_LINEAR_DAMPING: f32 = 1.5;

pub(crate) fn ensure_simulation_timer(ctx: &ReducerContext) {
    if ctx.db.simulation_timer().count() == 0 {
        ctx.db.simulation_timer().insert(SimulationTimer {
            scheduled_id: 0,
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
            super::ship_behavior::update(
                &mut ship,
                SERVER_UPDATE_INTERVAL_MICROS as f32 / 1_000_000.0,
            );
        } else if let Some(mut input_buffer) = ship
            .owner
            .and_then(|owner| ctx.db.player_input_buffer().identity().find(owner))
        {
            process_inputs(&mut ship, &mut input_buffer.inputs);

            ctx.db.player_input_buffer().identity().update(input_buffer);
        }

        ctx.db.ship().id().update(ship);
    }

    super::ship_spawner::update(
        ctx,
        server_tick,
        SERVER_UPDATE_INTERVAL_MICROS as f32 / 1_000_000.0,
    );

    Ok(())
}

fn process_inputs(player: &mut Ship, inputs: &mut Vec<InputFrame>) {
    let count = inputs.len().min(PHYSICS_STEPS_PER_SERVER_UPDATE as usize);
    for input in inputs.drain(..count) {
        update_movement(player, input.move_x, input.move_y);
        player.buttons = Some(input.buttons);
        player.last_processed_input_tick = Some(input.input_tick);
    }
}

fn update_movement(player: &mut Ship, move_x: f32, move_y: f32) {
    let damping = (-PLAYER_LINEAR_DAMPING * PHYSICS_DELTA_SECONDS).exp();
    player.vx = (player.vx + move_x * PLAYER_THRUST * PHYSICS_DELTA_SECONDS) * damping;
    player.vy = (player.vy + move_y * PLAYER_THRUST * PHYSICS_DELTA_SECONDS) * damping;

    let speed = player.vx.hypot(player.vy);
    if speed > PLAYER_MAX_SPEED {
        player.vx *= PLAYER_MAX_SPEED / speed;
        player.vy *= PLAYER_MAX_SPEED / speed;
    }

    player.x += player.vx * PHYSICS_DELTA_SECONDS;
    player.y += player.vy * PHYSICS_DELTA_SECONDS;
}
