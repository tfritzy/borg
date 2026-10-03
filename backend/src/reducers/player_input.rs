use crate::tables::{
    player_input_buffer::{player_input_buffer, InputFrame},
    ship::ship,
};
use spacetimedb::{ReducerContext, Table};

const MAX_BUFFERED_INPUTS: usize = 120;

#[spacetimedb::reducer]
pub fn submit_player_input(
    ctx: &ReducerContext,
    input_tick: u64,
    move_x: f32,
    move_y: f32,
    buttons: u32,
) -> Result<(), String> {
    let identity = ctx.sender();
    let connection_id = ctx
        .connection_id()
        .ok_or_else(|| "Player inputs require a client connection".to_string())?;

    let mut buffer = ctx
        .db
        .player_input_buffer()
        .identity()
        .find(identity)
        .ok_or_else(|| "Player is not connected".to_string())?;

    if buffer.connection_id != connection_id {
        return Err("This player connection is no longer active".into());
    }

    if input_tick == 0 {
        return Err("Input ticks must start at 1".into());
    }
    if !move_x.is_finite() || !move_y.is_finite() {
        return Err("Movement axes must be finite numbers".into());
    }

    let last_processed = ctx
        .db
        .ship()
        .iter()
        .find(|ship| ship.owner == Some(identity))
        .ok_or_else(|| "Player is not connected".to_string())?
        .last_processed_input_tick
        .unwrap_or(0);
    let last_received = buffer
        .inputs
        .last()
        .map_or(last_processed, |input| input.input_tick);
    if input_tick <= last_received {
        return Ok(());
    }
    if buffer.inputs.len() >= MAX_BUFFERED_INPUTS {
        return Err("Player input buffer is full".into());
    }

    let move_x = move_x.clamp(-1.0, 1.0);
    let move_y = move_y.clamp(-1.0, 1.0);
    let length_squared = move_x * move_x + move_y * move_y;
    let (move_x, move_y) = if length_squared > 1.0 {
        let inverse_length = length_squared.sqrt().recip();
        (move_x * inverse_length, move_y * inverse_length)
    } else {
        (move_x, move_y)
    };

    buffer.inputs.push(InputFrame {
        input_tick,
        move_x,
        move_y,
        buttons,
    });
    ctx.db.player_input_buffer().identity().update(buffer);

    Ok(())
}
