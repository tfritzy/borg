use crate::tables::{player, player_input_buffer, simulation_timer, Player, SimulationTimer};
use spacetimedb::{ReducerContext, Table, TimeDuration};

const SERVER_UPDATE_HZ: u32 = 10;
const PHYSICS_HZ: u32 = 60;
const PHYSICS_STEPS_PER_SERVER_UPDATE: u32 = PHYSICS_HZ / SERVER_UPDATE_HZ;
const SERVER_UPDATE_INTERVAL_MICROS: i64 = 1_000_000 / SERVER_UPDATE_HZ as i64;
const PHYSICS_DELTA_SECONDS: f32 = 1.0 / PHYSICS_HZ as f32;

const PLAYER_MAX_SPEED: f32 = 60.0;
const PLAYER_ACCELERATION: f32 = 240.0;
const PLAYER_FRICTION: f32 = 360.0;

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
            let inputs = std::mem::take(&mut input_buffer.inputs);

            for input in inputs {
                player.last_processed_input_tick = input.input_tick;
                input_buffer.active_input = Some(input);
            }

            let (move_x, move_y, buttons) = input_buffer
                .active_input
                .as_ref()
                .map_or((0.0, 0.0, 0), |input| {
                    (input.move_x, input.move_y, input.buttons)
                });
            player.buttons = buttons;

            for _ in 0..PHYSICS_STEPS_PER_SERVER_UPDATE {
                update_movement(&mut player, move_x, move_y);
            }

            ctx.db.player_input_buffer().identity().update(input_buffer);
        }

        ctx.db.player().identity().update(player);
    }

    Ok(())
}

fn update_movement(player: &mut Player, move_x: f32, move_y: f32) {
    let target_vx = move_x * PLAYER_MAX_SPEED;
    let target_vy = move_y * PLAYER_MAX_SPEED;
    let acceleration = if move_x == 0.0 && move_y == 0.0 {
        PLAYER_FRICTION
    } else {
        PLAYER_ACCELERATION
    };

    (player.vx, player.vy) = move_towards(
        player.vx,
        player.vy,
        target_vx,
        target_vy,
        acceleration * PHYSICS_DELTA_SECONDS,
    );
    player.x += player.vx * PHYSICS_DELTA_SECONDS;
    player.y += player.vy * PHYSICS_DELTA_SECONDS;
}

fn move_towards(
    current_x: f32,
    current_y: f32,
    target_x: f32,
    target_y: f32,
    max_delta: f32,
) -> (f32, f32) {
    let delta_x = target_x - current_x;
    let delta_y = target_y - current_y;
    let distance = delta_x.hypot(delta_y);

    if distance <= max_delta || distance == 0.0 {
        (target_x, target_y)
    } else {
        let scale = max_delta / distance;
        (current_x + delta_x * scale, current_y + delta_y * scale)
    }
}
