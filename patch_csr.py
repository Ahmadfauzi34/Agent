import re

# 1. Create EntanglementGraph structure (CSR)
graph_code = '''use crate::core::config::MAX_ENTITIES;

pub struct EntanglementGraph {
    pub values: Vec<f32>,
    pub col_indices: Vec<usize>,
    pub row_ptr: Vec<usize>,
}

impl EntanglementGraph {
    pub fn new() -> Self {
        let mut row_ptr = vec![0; MAX_ENTITIES + 1];
        let mut values = Vec::with_capacity(MAX_ENTITIES);
        let mut col_indices = Vec::with_capacity(MAX_ENTITIES);

        // Self-entanglement awal: 1.0 pada diagonal utama.
        for i in 0..MAX_ENTITIES {
            row_ptr[i] = i;
            values.push(1.0);
            col_indices.push(i);
        }
        row_ptr[MAX_ENTITIES] = MAX_ENTITIES;

        Self {
            values,
            col_indices,
            row_ptr,
        }
    }

    pub fn reset_active(&mut self, active_count: usize) {
        self.values.clear();
        self.col_indices.clear();
        self.row_ptr.clear();
        self.row_ptr.resize(MAX_ENTITIES + 1, 0);

        for i in 0..active_count {
            self.row_ptr[i] = i;
            self.values.push(1.0);
            self.col_indices.push(i);
        }

        for i in active_count..=MAX_ENTITIES {
            self.row_ptr[i] = active_count;
        }
    }

    #[inline(always)]
    pub fn iter_row(&self, row: usize) -> impl Iterator<Item = (usize, f32)> + '_ {
        let start = self.row_ptr[row];
        let end = self.row_ptr[row + 1];

        self.col_indices[start..end]
            .iter()
            .copied()
            .zip(self.values[start..end].iter().copied())
    }

    pub fn get_weight_csr(&self, row: usize, col: usize) -> f32 {
        let start = self.row_ptr[row];
        let end = self.row_ptr[row + 1];

        for i in start..end {
            if self.col_indices[i] == col {
                return self.values[i];
            } else if self.col_indices[i] > col {
                break;
            }
        }
        0.0
    }
}
'''
with open('rrm_rust/src/reasoning/entanglement_graph.rs', 'w') as f:
    f.write(graph_code)

# 2. Add EntanglementGraph to mod.rs
with open('rrm_rust/src/reasoning/mod.rs', 'r') as f:
    content = f.read()
if "pub mod entanglement_graph;" not in content:
    content = content.replace("pub mod entanglement_optimizer;", "pub mod entanglement_optimizer;\npub mod entanglement_graph;")
with open('rrm_rust/src/reasoning/mod.rs', 'w') as f:
    f.write(content)

# 3. Modify WaveDynamics
with open('rrm_rust/src/reasoning/wave_dynamics.rs', 'r') as f:
    wave = f.read()

wave = wave.replace(
    "use crate::core::config::{GLOBAL_DIMENSION, MAX_ENTITIES};",
    "use crate::core::config::{GLOBAL_DIMENSION, MAX_ENTITIES};\nuse crate::reasoning::entanglement_graph::EntanglementGraph;"
)

wave = wave.replace(
    "    entanglement_matrix: Vec<f32>,",
    "    pub entanglement_graph: EntanglementGraph,"
)

wave = re.sub(
    r'''    pub fn new\(\) -> Self \{
        let mut matrix = vec!\[0\.0; MAX_ENTITIES \* MAX_ENTITIES\];
        // Self-entanglement
        for i in 0\.\.MAX_ENTITIES \{
            matrix\[i \* MAX_ENTITIES \+ i\] = 1\.0;
        \}
        Self \{
            entanglement_matrix: matrix,
        \}
    \}''',
    '''    pub fn new() -> Self {
        Self {
            entanglement_graph: EntanglementGraph::new(),
        }
    }''',
    wave
)

wave = re.sub(
    r'''    pub fn initialize_entities\(&mut self, manifold: &EntityManifold\) \{
        let count = manifold\.active_count;

        // Reset matrix only for active boundaries
        for i in 0\.\.count \{
            let row_offset = i \* MAX_ENTITIES;
            for j in 0\.\.count \{
                self\.entanglement_matrix\[row_offset \+ j\] = 0\.0;
            \}
            self\.entanglement_matrix\[row_offset \+ i\] = 1\.0;
        \}
    \}''',
    '''    pub fn initialize_entities(&mut self, manifold: &EntityManifold) {
        let count = manifold.active_count;
        self.entanglement_graph.reset_active(count);
    }''',
    wave
)

wave = wave.replace(
    "EntanglementOptimizer::optimize(manifold, &mut self.entanglement_matrix, learning_rate);",
    "EntanglementOptimizer::optimize(manifold, &mut self.entanglement_graph, learning_rate);"
)

wave = re.sub(
    r'''    pub fn trigger_collapse\(&self, manifold: &mut EntityManifold, source_index: usize\) \{
        let num_entities = manifold\.active_count;

        let source_tensor = manifold\.get_spatial_tensor\(source_index\)\.to_owned\(\);
        let source_row_offset = source_index \* MAX_ENTITIES;

        for target_index in 0\.\.num_entities \{
            if target_index == source_index \|\| manifold\.masses\[target_index\] == 0\.0 \{
                continue;
            \}

            let entanglement_weight = self\.entanglement_matrix\[source_row_offset \+ target_index\];

            \{
                let mut target_tensor = manifold\.get_spatial_tensor_mut\(target_index\);
                for i in 0\.\.GLOBAL_DIMENSION \{
                    target_tensor\[i\] = \(entanglement_weight \* source_tensor\[i\]\)
                        \+ \(\(1\.0 - entanglement_weight\) \* target_tensor\[i\]\);
                \}
            \}

            let current_status = manifold\.entanglement_status\[target_index\];
            if entanglement_weight > current_status \{
                manifold\.entanglement_status\[target_index\] = entanglement_weight;
            \}
        \}
    \}''',
    '''    pub fn trigger_collapse(&self, manifold: &mut EntityManifold, source_index: usize) {
        let num_entities = manifold.active_count;

        let source_tensor = manifold.get_spatial_tensor(source_index).to_owned();

        // Menggunakan Custom Iterator Zero-Cost dari CSR Graph
        for (target_index, entanglement_weight) in self.entanglement_graph.iter_row(source_index) {
            if target_index >= num_entities || target_index == source_index || manifold.masses[target_index] == 0.0 {
                continue;
            }

            {
                let mut target_tensor = manifold.get_spatial_tensor_mut(target_index);
                for i in 0..GLOBAL_DIMENSION {
                    target_tensor[i] = (entanglement_weight * source_tensor[i])
                        + ((1.0 - entanglement_weight) * target_tensor[i]);
                }
            }

            let current_status = manifold.entanglement_status[target_index];
            if entanglement_weight > current_status {
                manifold.entanglement_status[target_index] = entanglement_weight;
            }
        }
    }''',
    wave
)

with open('rrm_rust/src/reasoning/wave_dynamics.rs', 'w') as f:
    f.write(wave)


# 4. Modify EntanglementOptimizer
opt = '''use crate::core::config::MAX_ENTITIES;
use crate::core::entity_manifold::EntityManifold;
use crate::core::fhrr::FHRR;
use crate::reasoning::entanglement_graph::EntanglementGraph;

pub struct EntanglementOptimizer;

impl EntanglementOptimizer {
    /// 🕸️ HEBBIAN ENTANGLEMENT UPDATE
    /// "Neurons that fire together, wire together."
    pub fn optimize(
        manifold: &EntityManifold,
        graph: &mut EntanglementGraph,
        learning_rate: f32,
    ) {
        let num_entities = manifold.active_count;

        let mut new_graph = EntanglementGraph {
            values: Vec::with_capacity(num_entities * 10), // Heuristic sparsity
            col_indices: Vec::with_capacity(num_entities * 10),
            row_ptr: vec![0; MAX_ENTITIES + 1],
        };

        for i in 0..num_entities {
            new_graph.row_ptr[i] = new_graph.values.len();

            if manifold.masses[i] == 0.0 {
                continue;
            }

            let tensor_a = manifold.get_spatial_tensor(i);

            // Batasan Spasial / Radius Lokal (Contoh Filter Heuristik)
            // Hanya evaluasi agen yang mungkin ter-entangle untuk menghindari loop N^2
            let cx_a = manifold.centers_x[i];
            let cy_a = manifold.centers_y[i];

            for j in 0..num_entities {
                if manifold.masses[j] == 0.0 {
                    continue;
                }

                // Gunakan Filter Spasial: Hanya agen dengan jarak spasial terdekat
                let cx_b = manifold.centers_x[j];
                let cy_b = manifold.centers_y[j];
                let dist_sq = (cx_a - cx_b) * (cx_a - cx_b) + (cy_a - cy_b) * (cy_a - cy_b);

                // Radius toleransi entanglement (Misal: 50.0 radius)
                if dist_sq > 2500.0 && i != j {
                    continue;
                }

                let tensor_b = manifold.get_spatial_tensor(j);
                let coherence = FHRR::similarity(&tensor_a, &tensor_b);

                // Get previous weight (0.0 if not found)
                let current_e = graph.get_weight_csr(i, j);
                let new_e = (current_e + (coherence * learning_rate)).clamp(0.0, 1.0);

                if new_e > 0.001 { // Sparsity Threshold
                    new_graph.values.push(new_e);
                    new_graph.col_indices.push(j);
                }
            }
        }

        let total_vals = new_graph.values.len();
        for i in num_entities..=MAX_ENTITIES {
            new_graph.row_ptr[i] = total_vals;
        }

        *graph = new_graph;
    }
}
'''
with open('rrm_rust/src/reasoning/entanglement_optimizer.rs', 'w') as f:
    f.write(opt)
