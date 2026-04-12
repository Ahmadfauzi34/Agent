use crate::core::entity_manifold::EntityManifold;

pub struct AnomalousExtractor;

impl AnomalousExtractor {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, state: &EntityManifold) -> Result<EntityManifold, String> {
        // Implementasi fallback darurat (Pilihan 1 / Hardcoded ARC fallback)
        let new_state = state.clone();
        // Implementasi dummy
        Ok(new_state)
    }
}

/// Menerapkan Hierarki Presisi untuk Anomali:
/// 1. Micro (1e-6): Deteksi rough semantics (Klaster anomali / bounding box)
/// 2. Nano (1e-9): Penyelarasan struktural / batas asimetris
/// 3. Femto (1e-15): Crop mutlak
pub fn extract_anomalous_quadrant(state: &EntityManifold) -> EntityManifold {
    let mut min_x = f32::MAX;
    let mut min_y = f32::MAX;
    let mut max_x = f32::MIN;
    let mut max_y = f32::MIN;

    let mut found = false;

    // FASE 1 (Micro): Deteksi kasar anomali
    // Jika tidak ada warna anomali eksplisit, cari semua objek yang
    // bukan grid background (misalnya bukan hitam/0 dan bukan warna kerangka dominan)
    let mut color_counts = std::collections::HashMap::new();
        for i in 0..state.active_count {
            if state.masses[i] > 0.0 && state.tokens[i] != 0 {
                *color_counts.entry(state.tokens[i]).or_insert(0) += 1;
            }
        }

    if !found {
        // Cari warna minoritas selain 0
        if let Some((&minority_color, _)) = color_counts.iter().min_by_key(|&(_, c)| c) {
            for i in 0..state.active_count {
                if state.masses[i] > 0.0 && state.tokens[i] == minority_color {
                    found = true;
                    let cx = state.centers_x[i];
                    let cy = state.centers_y[i];
                    if cx < min_x { min_x = cx; }
                    if cx > max_x { max_x = cx; }
                    if cy < min_y { min_y = cy; }
                    if cy > max_y { max_y = cy; }
                }
            }
        }
    }

    // FASE 2 & 3 (Nano -> Femto): Penyelarasan Asimetris & Crop Kuantisasi
    let mut new_state = EntityManifold::new();
    if found {
        let snap_min_x = min_x.round();
        let snap_min_y = min_y.round();
        let snap_max_x = max_x.round();
        let snap_max_y = max_y.round();

        // Plus 1.0 margin bounding box inklusif
        let new_w = (snap_max_x - snap_min_x) + 1.0;
        let new_h = (snap_max_y - snap_min_y) + 1.0;

        new_state.global_width = new_w;
        new_state.global_height = new_h;

        let mut copied = 0;

        for i in 0..state.active_count {
            if state.masses[i] > 0.0 {
                let cx = state.centers_x[i].round();
                let cy = state.centers_y[i].round();

                // Hanya ambil pixel di dalam bounding box mutlak femto-scale
                if cx >= snap_min_x && cx <= snap_max_x && cy >= snap_min_y && cy <= snap_max_y {
                    new_state.ensure_scalar_capacity(copied + 1);

                    new_state.masses[copied] = state.masses[i];
                    new_state.tokens[copied] = state.tokens[i];

                    // Translasi ke titik awal koordinat (0,0) di viewport baru
                    new_state.centers_x[copied] = cx - snap_min_x;
                    new_state.centers_y[copied] = cy - snap_min_y;

                    copied += 1;
                }
            }
        }
        new_state.active_count = copied;
    } else {
        return state.clone();
    }

    new_state
}
