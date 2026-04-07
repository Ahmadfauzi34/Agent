use crate::core::fhrr::FHRR;
use ndarray::Array1;
use std::sync::OnceLock;

pub struct CoreSeeds;

impl CoreSeeds {
    pub fn x_axis_seed() -> &'static Array1<f32> {
        static X_AXIS: OnceLock<Array1<f32>> = OnceLock::new();
        X_AXIS.get_or_init(|| FHRR::create(Some(100)))
    }

    pub fn y_axis_seed() -> &'static Array1<f32> {
        static Y_AXIS: OnceLock<Array1<f32>> = OnceLock::new();
        Y_AXIS.get_or_init(|| FHRR::create(Some(200)))
    }

    pub fn color_seed() -> &'static Array1<f32> {
        static COLOR: OnceLock<Array1<f32>> = OnceLock::new();
        COLOR.get_or_init(|| FHRR::create(Some(300)))
    }

    pub fn time_seed() -> &'static Array1<f32> {
        static TIME: OnceLock<Array1<f32>> = OnceLock::new();
        TIME.get_or_init(|| FHRR::create(Some(400)))
    }

    // === DYNAMIC AXIOM SEEDS (Phase 5+) ===
    pub fn action_crop_seed() -> &'static Array1<f32> {
        static ACTION_CROP: OnceLock<Array1<f32>> = OnceLock::new();
        ACTION_CROP.get_or_init(|| FHRR::create(Some(501)))
    }

    pub fn dir_tl_seed() -> &'static Array1<f32> {
        static DIR_TL: OnceLock<Array1<f32>> = OnceLock::new();
        DIR_TL.get_or_init(|| FHRR::create(Some(502)))
    }

    pub fn dir_tr_seed() -> &'static Array1<f32> {
        static DIR_TR: OnceLock<Array1<f32>> = OnceLock::new();
        DIR_TR.get_or_init(|| FHRR::create(Some(503)))
    }

    pub fn dir_bl_seed() -> &'static Array1<f32> {
        static DIR_BL: OnceLock<Array1<f32>> = OnceLock::new();
        DIR_BL.get_or_init(|| FHRR::create(Some(504)))
    }

    pub fn dir_br_seed() -> &'static Array1<f32> {
        static DIR_BR: OnceLock<Array1<f32>> = OnceLock::new();
        DIR_BR.get_or_init(|| FHRR::create(Some(505)))
    }
}
