use crate::tables::ship::ship_type::ShipType;

#[derive(Clone, Copy, Debug, spacetimedb::SpacetimeType)]
pub struct ShipProperties {
    pub projectile_speed: f32,
    pub projectile_lifetime: f32,
    pub range: f32,
    pub damage: u32,
    pub projectile_count: u32,
    pub max_health: u32,
    pub radius: f32,
    pub thrust: f32,
    pub max_speed: f32,
    pub linear_damping: f32,
    /// Projectile spread in radians; lower values are more accurate.
    pub accuracy: f32,
}

/// Default combat and movement properties for each ship type.
pub(crate) const SHIP_PROPERTIES: [(ShipType, ShipProperties); 5] = [
    (
        ShipType::Raven,
        ShipProperties {
            projectile_speed: 180.0,
            projectile_lifetime: 5.0 / 3.0,
            range: 300.0,
            damage: 5,
            projectile_count: 1,
            max_health: 50,
            radius: 16.0,
            thrust: 120.0,
            max_speed: 60.0,
            linear_damping: 1.5,
            accuracy: 0.1,
        },
    ),
    (
        ShipType::Gat,
        ShipProperties {
            projectile_speed: 150.0,
            projectile_lifetime: 5.0 / 3.0,
            range: 250.0,
            damage: 2,
            projectile_count: 1,
            max_health: 5,
            radius: 12.0,
            thrust: 80.0,
            max_speed: 25.0,
            linear_damping: 1.5,
            accuracy: 0.1,
        },
    ),
    (
        ShipType::Cottonwood,
        ShipProperties {
            projectile_speed: 160.0,
            projectile_lifetime: 0.9375,
            range: 150.0,
            damage: 3,
            projectile_count: 5,
            max_health: 65,
            radius: 18.0,
            thrust: 100.0,
            max_speed: 50.0,
            linear_damping: 1.5,
            accuracy: 0.3,
        },
    ),
    (
        ShipType::Archer,
        ShipProperties {
            projectile_speed: 360.0,
            projectile_lifetime: 5.0 / 3.0,
            range: 600.0,
            damage: 10,
            projectile_count: 1,
            max_health: 35,
            radius: 16.0,
            thrust: 80.0,
            max_speed: 40.0,
            linear_damping: 1.5,
            accuracy: 0.01,
        },
    ),
    (
        ShipType::Hummingbird,
        ShipProperties {
            projectile_speed: 200.0,
            projectile_lifetime: 1.2,
            range: 240.0,
            damage: 3,
            projectile_count: 1,
            max_health: 30,
            radius: 12.0,
            thrust: 200.0,
            max_speed: 90.0,
            linear_damping: 1.5,
            accuracy: 0.12,
        },
    ),
];

pub(crate) fn get_ship_properties(ship_type: &ShipType) -> &'static ShipProperties {
    let index = match ship_type {
        ShipType::Raven => 0,
        ShipType::Gat => 1,
        ShipType::Cottonwood => 2,
        ShipType::Archer => 3,
        ShipType::Hummingbird => 4,
    };
    &SHIP_PROPERTIES[index].1
}
