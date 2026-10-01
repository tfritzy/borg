use crate::tables::{player, player_input_buffer};
use spacetimedb::ReducerContext;

#[spacetimedb::reducer]
pub fn move_player(ctx: &ReducerContext, button: String) {
    let Some(connection_id) = ctx.connection_id() else {
        return;
    };
    let is_active_connection = ctx
        .db
        .player_input_buffer()
        .identity()
        .find(ctx.sender())
        .is_some_and(|buffer| buffer.connection_id == connection_id);
    if !is_active_connection {
        return;
    }

    let (dx, dy) = match button.to_lowercase().as_str() {
        "w" => (0.0, 1.0),
        "a" => (-1.0, 0.0),
        "s" => (0.0, -1.0),
        "d" => (1.0, 0.0),
        _ => return,
    };

    if let Some(mut player) = ctx.db.player().identity().find(ctx.sender()) {
        player.x += dx;
        player.y += dy;
        ctx.db.player().identity().update(player);
    }
}
