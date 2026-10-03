use crate::tables::{
    player_input_buffer::{player_input_buffer, PlayerInputBuffer},
    ship::{ship, Ship},
};
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

    let existing = ctx
        .db
        .ship()
        .iter()
        .find(|ship| ship.owner == Some(identity));
    let ship = Ship {
        id: existing.as_ref().map_or(0, |ship| ship.id),
        owner: Some(identity),
        ship_type: crate::tables::ship::ship_type::ShipType::Raven,
        x: 0.0,
        y: 0.0,
        vx: 0.0,
        vy: 0.0,
        buttons: Some(0),
        server_tick: 0,
        last_processed_input_tick: Some(0),
        behavior: None,
    };
    if existing.is_some() {
        ctx.db.ship().id().update(ship);
    } else {
        ctx.db.ship().insert(ship);
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

    let ships: Vec<_> = ctx
        .db
        .ship()
        .iter()
        .filter(|ship| ship.owner == Some(identity))
        .collect();
    for ship in ships {
        ctx.db.ship().id().delete(ship.id);
    }
    ctx.db.player_input_buffer().identity().delete(identity);
}
