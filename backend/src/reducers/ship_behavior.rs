use crate::tables::ship::{ship_behavior::ShipBehavior, Ship};

const ORBIT_SPEED: f32 = 40.0;

pub(crate) fn update(ship: &mut Ship, delta_seconds: f32) {
    match ship.behavior {
        Some(ShipBehavior::Traffic) => {
            let radius = ship.x.hypot(ship.y);
            if radius == 0.0 {
                ship.vx = 0.0;
                ship.vy = 0.0;
                return;
            }
            let angle = ship.y.atan2(ship.x) + ORBIT_SPEED / radius * delta_seconds;
            set_traffic_pose(ship, angle, radius);
        }
        None => {}
    }
}

fn set_traffic_pose(ship: &mut Ship, angle: f32, radius: f32) {
    let (sin, cos) = angle.sin_cos();
    ship.x = radius * cos;
    ship.y = radius * sin;
    ship.vx = -ORBIT_SPEED * sin;
    ship.vy = ORBIT_SPEED * cos;
}
