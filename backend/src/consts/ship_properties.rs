use crate::tables::ship::ship_type::ShipType;

#[derive(Clone, Copy, Debug, spacetimedb::SpacetimeType)]
pub struct ShipProperties {
    pub projectile_speed: f32,
    pub range: f32,
    pub damage: u32,
    pub max_health: u32,
    pub radius: f32,
    pub thrust: f32,
    pub max_speed: f32,
    pub linear_damping: f32,
    /// Projectile spread in radians; lower values are more accurate.
    pub accuracy: f32,
}

/// Default combat and movement properties for each ship type.
pub(crate) const SHIP_PROPERTIES: [(ShipType, ShipProperties); 2] = [
    (
        ShipType::Raven,
        ShipProperties {
            projectile_speed: 180.0,
            range: 300.0,
            damage: 5,
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
            range: 250.0,
            damage: 2,
            max_health: 5,
            radius: 12.0,
            thrust: 80.0,
            max_speed: 25.0,
            linear_damping: 1.5,
            accuracy: 0.1,
        },
    ),
];

pub(crate) fn get_ship_properties(ship_type: &ShipType) -> &'static ShipProperties {
    let index = match ship_type {
        ShipType::Raven => 0,
        ShipType::Gat => 1,
    };
    &SHIP_PROPERTIES[index].1
}
