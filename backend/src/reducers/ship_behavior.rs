use crate::tables::ship::{ship_behavior::ShipBehavior, Ship};

pub(crate) fn update(ship: &mut Ship, delta_seconds: f32) {
    match ship.behavior {
        Some(ShipBehavior::Traffic) => {
            ship.x += ship.vx * delta_seconds;
            ship.y += ship.vy * delta_seconds;
        }
        None => {}
    }
}
