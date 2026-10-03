use spacetimedb::ScheduleAt;

#[spacetimedb::table(
    accessor = simulation_timer,
    scheduled(crate::reducers::simulation::update_players)
)]
pub struct SimulationTimer {
    #[primary_key]
    #[auto_inc]
    pub(crate) scheduled_id: u64,
    pub(crate) scheduled_at: ScheduleAt,
    pub(crate) server_tick: u64,
}
