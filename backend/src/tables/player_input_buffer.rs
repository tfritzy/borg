use spacetimedb::{ConnectionId, Identity};

#[derive(spacetimedb::SpacetimeType)]
pub struct InputFrame {
    pub(crate) input_tick: u64,
    pub(crate) move_x: f32,
    pub(crate) move_y: f32,
    pub(crate) buttons: u32,
}

#[spacetimedb::table(accessor = player_input_buffer)]
pub struct PlayerInputBuffer {
    #[primary_key]
    pub(crate) identity: Identity,
    #[default(1)]
    pub(crate) world_id: u64,
    pub(crate) connection_id: ConnectionId,
    pub(crate) inputs: Vec<InputFrame>,
}
