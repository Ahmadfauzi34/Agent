use crate::core::config::GLOBAL_DIMENSION;
use crate::core::fhrr::FHRR;
use crate::core::core_seeds::CoreSeeds;
use crate::core::entity_manifold::EntityManifold;
use ndarray::Array1;

pub struct UniversalManifold {
    pub r_axis_seed: Array1<f32>,
}

impl UniversalManifold {
    pub fn new() -> Self {
        Self {
            r_axis_seed: FHRR::create(None),
        }
    }

    fn encode_coordinate(&self, axis_seed: &Array1<f32>, value: f32) -> Array1<f32> {
        FHRR::fractional_bind(axis_seed, value)
    }

    pub fn build_pixel_tensor(&self, rel_x: f32, rel_y: f32, token: i32) -> Array1<f32> {
        let x_tensor = self.encode_coordinate(CoreSeeds::x_axis_seed(), rel_x);
        let y_tensor = self.encode_coordinate(CoreSeeds::y_axis_seed(), rel_y);
        let color_tensor = self.encode_coordinate(CoreSeeds::color_seed(), token as f32);

        let xy_bind = FHRR::bind(&x_tensor, &y_tensor);
        FHRR::bind(&xy_bind, &color_tensor)
    }

    // Encoder Agnostik untuk mengubah Grid/List angka menjadi Entitas di ECS (SoA)
    // Implementasi Segmenter (Entity Segmentation) bisa digabung/terpisah.
}
