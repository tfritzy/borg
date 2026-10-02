use crate::tables::{
    player, player_input_buffer, simulation_timer, InputFrame, Player, SimulationTimer,
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

    let players: Vec<_> = ctx.db.player().iter().collect();
    for mut player in players {
        player.server_tick = server_tick;

        if let Some(mut input_buffer) = ctx
            .db
            .player_input_buffer()
            .identity()
            .find(player.identity)
        {
            process_inputs(&mut player, &mut input_buffer.inputs);

            ctx.db.player_input_buffer().identity().update(input_buffer);
        }

        ctx.db.player().identity().update(player);
    }

    Ok(())
}

fn process_inputs(player: &mut Player, inputs: &mut Vec<InputFrame>) {
    let count = inputs.len().min(PHYSICS_STEPS_PER_SERVER_UPDATE as usize);
    for input in inputs.drain(..count) {
        update_movement(player, input.move_x, input.move_y);
        player.buttons = input.buttons;
        player.last_processed_input_tick = input.input_tick;
    }
}

fn update_movement(player: &mut Player, move_x: f32, move_y: f32) {
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
