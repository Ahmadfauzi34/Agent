use crate::core::entity_manifold::EntityManifold;
use ndarray::Array1;

pub struct Visualizer;

impl Visualizer {
    /// Mencetak 40 elemen pertama Tensor sebagai Barcode Holografik
    /// Blok mewakili amplitudo fasa (-1.0 hingga 1.0)
    pub fn print_tensor_barcode(name: &str, tensor: &Array1<f32>) {
        let mut barcode = String::new();
        // Ambil sample dari 40 dimensi pertama untuk visualisasi representatif
        let sample_size = std::cmp::min(40, tensor.len());

        for i in 0..sample_size {
            let val = tensor[i];
            let char_block = if val > 0.8 {
                "█" // Bipolar +1 (Sangat Kuat / Konstruktif)
            } else if val > 0.2 {
                "▓" // Sedang
            } else if val > -0.2 {
                "▒" // Netral / Noise Rendah
            } else if val > -0.8 {
                "░" // Negatif Sedang
            } else {
                "_" // Bipolar -1 (Sangat Lemah / Destruktif)
            };
            barcode.push_str(char_block);
        }

        println!("  [Barcode] {:<20} |{}|", name, barcode);
    }

    /// Mencetak Memory Map Partikel: █ = Hidup, _ = Dark Matter (Massa 0)
    pub fn print_particle_memory_map(manifold: &EntityManifold) {
        let mut mem_map = String::new();
        // Hanya cetak sampai active_count + 10 slot dark matter sebagai cuplikan
        let limit = std::cmp::min(manifold.active_count + 10, crate::core::config::MAX_ENTITIES);

        for i in 0..limit {
            if manifold.masses[i] > 0.0 {
                mem_map.push('█'); // Partikel aktif (Entitas riil)
            } else {
                mem_map.push('_'); // Dark Matter (Vakum)
            }
        }

        if limit < crate::core::config::MAX_ENTITIES {
            mem_map.push_str("... (truncated)");
        }

        println!("  [Memory]  Map ({}/{}): [{}]", manifold.active_count, crate::core::config::MAX_ENTITIES, mem_map);
    }

    /// Memvisualisasikan Hierarki Cabang MCTS saat dievaluasi
    pub fn print_mcts_branch(depth: usize, pragmatic_error: f32, epistemic_value: f32, prob: f32, path: &[String]) {
        let indent = "  ".repeat(depth);
        let path_str = path.join(" ➔ ");
        println!("{}🌱 [Depth {}] EFE(Err: {:.1}, Gain: {:.1}) Prob: {:.3} | {}",
                 indent, depth, pragmatic_error, epistemic_value, prob, path_str);
    }
}
