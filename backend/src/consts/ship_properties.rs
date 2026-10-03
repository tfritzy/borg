use crate::tables::ship::ship_type::ShipType;

#[derive(Clone, Copy, Debug, spacetimedb::SpacetimeType)]
pub struct ShipProperties {
    pub projectile_speed: f32,
    pub damage: u32,
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
            projectile_speed: 300.0,
            damage: 1,
            thrust: 120.0,
            max_speed: 60.0,
            linear_damping: 1.5,
            accuracy: 0.1,
        },
    ),
    (
        ShipType::Gat,
        ShipProperties {
            projectile_speed: 250.0,
            damage: 2,
            thrust: 80.0,
            max_speed: 40.0,
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
