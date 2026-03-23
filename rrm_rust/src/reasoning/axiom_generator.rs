use crate::core::config::GLOBAL_DIMENSION;
use crate::core::fhrr::FHRR;
use ndarray::Array1;

pub struct AxiomGenerator;

impl AxiomGenerator {
    pub fn generate_translation_axiom(
        delta_x: f32,
        delta_y: f32,
        x_seed: &Array1<f32>,
        y_seed: &Array1<f32>,
    ) -> Array1<f32> {
        let x_shift = FHRR::fractional_bind(x_seed, delta_x);
        let y_shift = FHRR::fractional_bind(y_seed, delta_y);
        FHRR::bind(&x_shift, &y_shift)
    }

    pub fn generate_geometric_axiom(
        name: &str,
        delta_x: f32,
        delta_y: f32,
        x_seed: &Array1<f32>,
        y_seed: &Array1<f32>,
    ) -> Array1<f32> {
        let trans = Self::generate_translation_axiom(delta_x, delta_y, x_seed, y_seed);
        let geom_mod = match name {
            "MIRROR_X" => FHRR::fractional_bind(x_seed, -1.0),
            "MIRROR_Y" => FHRR::fractional_bind(y_seed, -1.0),
            "MIRROR_XY" => FHRR::bind(&FHRR::fractional_bind(x_seed, -1.0), &FHRR::fractional_bind(y_seed, -1.0)),
            _ => {
                let mut identity = Array1::zeros(GLOBAL_DIMENSION);
                identity[0] = 1.0;
                identity[GLOBAL_DIMENSION - 1] = 1.0;
                identity
            }
        };

        FHRR::bind(&geom_mod, &trans)
    }
}
