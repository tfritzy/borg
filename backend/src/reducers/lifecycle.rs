use crate::tables::{player, player_input_buffer, Player, PlayerInputBuffer};
use spacetimedb::{ReducerContext, Table};

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {
    super::simulation::ensure_simulation_timer(ctx);
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {
    super::simulation::ensure_simulation_timer(ctx);

    let identity = ctx.sender();
    let connection_id = ctx
        .connection_id()
        .expect("client_connected reducers have a connection ID");

    let player = Player {
        identity,
        x: 0.0,
        y: 0.0,
        vx: 0.0,
        vy: 0.0,
        buttons: 0,
        server_tick: 0,
        last_processed_input_tick: 0,
    };
    if ctx.db.player().identity().find(identity).is_some() {
        ctx.db.player().identity().update(player);
    } else {
        ctx.db.player().insert(player);
    }

    let input_buffer = PlayerInputBuffer {
        identity,
        connection_id,
        inputs: Vec::new(),
    };
    if ctx
        .db
        .player_input_buffer()
        .identity()
        .find(identity)
        .is_some()
    {
        ctx.db.player_input_buffer().identity().update(input_buffer);
    } else {
        ctx.db.player_input_buffer().insert(input_buffer);
    }
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    let Some(connection_id) = ctx.connection_id() else {
        return;
    };
    let identity = ctx.sender();
    let is_active_connection = ctx
        .db
        .player_input_buffer()
        .identity()
        .find(identity)
        .is_some_and(|buffer| buffer.connection_id == connection_id);

    if !is_active_connection {
        return;
    }

    ctx.db.player().identity().delete(identity);
    ctx.db.player_input_buffer().identity().delete(identity);
}
