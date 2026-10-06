use crate::tables::{projectile::Projectile, ship::ship};
use spacetimedb::ReducerContext;

const GRID_SIZE: f32 = 256.0;

pub(crate) fn grid_cell(position: f32) -> i32 {
    (position / GRID_SIZE).floor() as i32
}

pub(crate) fn first_ship_hit(ctx: &ReducerContext, projectile: &Projectile) -> Option<u64> {
    let grid_x = grid_cell(projectile.x);
    let grid_y = grid_cell(projectile.y);
    for ship in (grid_x - 1..=grid_x + 1).flat_map(|x| {
        (grid_y - 1..=grid_y + 1).flat_map(move |y| ctx.db.ship().grid_cell().filter((x, y)))
    }) {
        if ship.world_id != projectile.world_id
            || ship.id == projectile.ship
            || ship.owner == Some(projectile.owner)
        {
            continue;
        }

        let radius = ship.properties.radius;
        let dx = projectile.x - ship.x;
        let dy = projectile.y - ship.y;
        if dx * dx + dy * dy <= radius * radius {
            return Some(ship.id);
        }
    }

    None
}
