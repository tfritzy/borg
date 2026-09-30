use spacetimedb::{Identity, ReducerContext, Table};

#[spacetimedb::table(accessor = player, public)]
pub struct Player {
    #[primary_key]
    identity: Identity,
    x: f32,
    y: f32,
}

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    // Called when the module is initially published
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {
    ctx.db.player().insert(Player {
        identity: ctx.sender(),
        x: 0.0,
        y: 0.0,
    });
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    ctx.db.player().identity().delete(&ctx.sender());
}

#[spacetimedb::reducer]
pub fn move_player(ctx: &ReducerContext, button: String) {
    let (dx, dy) = match button.to_lowercase().as_str() {
        "w" => (0.0, 1.0),
        "a" => (-1.0, 0.0),
        "s" => (0.0, -1.0),
        "d" => (1.0, 0.0),
        _ => return,
    };

    if let Some(mut player) = ctx.db.player().identity().find(&ctx.sender()) {
        player.x += dx;
        player.y += dy;
        ctx.db.player().identity().update(player);
    }
}
