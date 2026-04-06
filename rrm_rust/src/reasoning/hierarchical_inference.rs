use crate::core::entity_manifold::EntityManifold;
use crate::reasoning::structures::Axiom;
use crate::core::fhrr::FHRR;
use crate::core::core_seeds::CoreSeeds;
use crate::core::config::GLOBAL_DIMENSION;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Copy, PartialEq)]
pub enum SimulationMode {
    StrictVSA,
    Probabilistic,
    Counterfactual,
}

pub struct CeoDispatcher {
    pub wave_masses: Vec<f32>,
    pub wave_parent_indices: Vec<i32>,
    pub wave_first_child_indices: Vec<i32>,
    pub wave_next_sibling_indices: Vec<i32>,
    pub wave_applied_axiom_ids: Vec<u16>,
    pub wave_depths: Vec<u8>,
    pub wave_last_access: Vec<u64>,

    pub state_spatial_tensors: Vec<f32>,
    pub state_semantic_tensors: Vec<f32>,
    pub state_scalar_data: Vec<f32>,
    pub state_global_dims: Vec<f32>,
    pub state_entity_counts: Vec<u16>,

    pub metric_epistemic_values: Vec<f32>,
    pub metric_pragmatic_errors: Vec<f32>,
    pub metric_free_energies: Vec<f32>,
    pub metric_probabilities: Vec<f32>,
    pub metric_best_child_indices: Vec<i32>,
    pub metric_visit_counts: Vec<u32>,

    pub frontier_active_indices: Vec<usize>,
    pub frontier_size: usize,
    pub horizon_limit: u8,
    pub temperature: f32,

    pub config: CeoConfig,
    pub next_wave_id: usize,
    pub stats: CeoStats,

    pub current_mode: SimulationMode,
}

#[derive(Clone)]
pub struct CeoConfig {
    pub max_waves: usize,
    pub max_entities: usize,
    pub global_dimension: usize,
    pub max_frontier: usize,
    pub initial_temperature: f32,
    pub epistemic_weight: f32,
}

impl Default for CeoConfig {
    fn default() -> Self {
        Self {
            max_waves: 1000, // Reduced from 100,000 to 1,000
            max_entities: 100, // Reduced from 1000 to 100
            global_dimension: 512, // Temporarily reduced dimension for memory safety locally
            max_frontier: 100,
            initial_temperature: 1.0,
            epistemic_weight: 50.0,
        }
    }
}

pub struct CeoStats {
    pub waves_allocated: u64,
    pub waves_freed: u64,
    pub waves_reused: u64,
    pub frontier_resizes: u64,
    pub cache_hits: u64,
}

impl Default for CeoStats {
    fn default() -> Self {
        Self {
            waves_allocated: 0,
            waves_freed: 0,
            waves_reused: 0,
            frontier_resizes: 0,
            cache_hits: 0,
        }
    }
}

pub struct ExpansionResult {
    pub new_waves: usize,
    pub best_new_wave: Option<usize>,
    pub frontier_size: usize,
}

impl CeoDispatcher {
    pub fn new(config: CeoConfig) -> Self {
        let wave_count = config.max_waves;
        let entity_count = config.max_entities;
        let dim = config.global_dimension;

        let state_spatial_size = wave_count * entity_count * dim;
        let state_scalar_size = wave_count * entity_count * 10;

        Self {
            wave_masses: vec![0.0; wave_count],
            wave_parent_indices: vec![-1; wave_count],
            wave_first_child_indices: vec![-1; wave_count],
            wave_next_sibling_indices: vec![-1; wave_count],
            wave_applied_axiom_ids: vec![0; wave_count],
            wave_depths: vec![0; wave_count],
            wave_last_access: vec![0; wave_count],

            state_spatial_tensors: vec![0.0; state_spatial_size],
            state_semantic_tensors: vec![0.0; state_spatial_size],
            state_scalar_data: vec![0.0; state_scalar_size],
            state_global_dims: vec![0.0; wave_count * 2],
            state_entity_counts: vec![0; wave_count],

            metric_epistemic_values: vec![0.0; wave_count],
            metric_pragmatic_errors: vec![999.0; wave_count],
            metric_free_energies: vec![999.0; wave_count],
            metric_probabilities: vec![0.0; wave_count],
            metric_best_child_indices: vec![-1; wave_count],
            metric_visit_counts: vec![0; wave_count],

            frontier_active_indices: Vec::with_capacity(config.max_frontier),
            frontier_size: 10,
            horizon_limit: 7,
            temperature: config.initial_temperature,

            config,
            next_wave_id: 0,
            stats: CeoStats::default(),
            current_mode: SimulationMode::StrictVSA,
        }
    }

    pub fn alloc_wave_slot(&mut self) -> Option<usize> {
        let start = self.next_wave_id;
        let max = self.config.max_waves;

        for i in 0..max {
            let idx = (start + i) % max;
            if self.wave_masses[idx] > 0.0 {
                continue;
            }
            self.wave_masses[idx] = 0.5;
            self.next_wave_id = (idx + 1) % max;
            self.stats.waves_reused += 1;
            return Some(idx);
        }
        self.evict_lru_slot()
    }

    fn evict_lru_slot(&mut self) -> Option<usize> {
        let mut oldest_idx: usize = 0;
        let mut oldest_time: u64 = u64::MAX;
        let mut found = false;

        for i in 0..self.config.max_waves {
            if self.wave_parent_indices[i] == -1 { continue; }
            if self.frontier_active_indices.contains(&i) { continue; }
            if self.wave_first_child_indices[i] != -1 { continue; }

            let access_time = self.wave_last_access[i];
            if access_time < oldest_time {
                oldest_time = access_time;
                oldest_idx = i;
                found = true;
            }
        }

        if found {
            self.wave_masses[oldest_idx] = 0.0;
            self.stats.waves_freed += 1;
            self.wave_masses[oldest_idx] = 0.5;
            self.stats.waves_reused += 1;
            Some(oldest_idx)
        } else {
            None
        }
    }

    pub fn free_wave(&mut self, wave_idx: usize) {
        self.wave_masses[wave_idx] = 0.0;
        self.stats.waves_freed += 1;
    }

    pub fn expand_wave(
        &mut self,
        parent_idx: usize,
        candidate_axioms: &[u16],
        expected_state: &EntityManifold,
        axioms_map: &[Axiom]
    ) -> Vec<usize> {
        let parent_depth = self.wave_depths[parent_idx];
        if parent_depth >= self.horizon_limit {
            return vec![];
        }

        let mut children = Vec::with_capacity(candidate_axioms.len());

        for &axiom_id in candidate_axioms {
            let child_idx = match self.alloc_wave_slot() {
                Some(idx) => idx,
                None => break,
            };

            self.wave_parent_indices[child_idx] = parent_idx as i32;
            self.wave_applied_axiom_ids[child_idx] = axiom_id;
            self.wave_depths[child_idx] = parent_depth + 1;
            self.wave_masses[child_idx] = 1.0;

            self.copy_state_block(parent_idx, child_idx);

            if let Some(axiom) = axioms_map.get(axiom_id as usize) {
                self.apply_axiom_to_state(child_idx, axiom);
            }

            self.calculate_metrics(child_idx, expected_state);
            children.push(child_idx);
        }

        self.stats.waves_allocated += children.len() as u64;
        children
    }

    fn copy_state_block(&mut self, from_idx: usize, to_idx: usize) {
        let e = self.config.max_entities;
        let d = self.config.global_dimension;

        let from_spatial_offset = from_idx * e * d;
        let to_spatial_offset = to_idx * e * d;
        let copy_len = e * d;

        self.state_spatial_tensors.copy_within(
            from_spatial_offset..from_spatial_offset + copy_len,
            to_spatial_offset
        );
        self.state_semantic_tensors.copy_within(
            from_spatial_offset..from_spatial_offset + copy_len,
            to_spatial_offset
        );

        let from_scalar_offset = from_idx * e * 10;
        let to_scalar_offset = to_idx * e * 10;
        let scalar_len = e * 10;

        self.state_scalar_data.copy_within(
            from_scalar_offset..from_scalar_offset + scalar_len,
            to_scalar_offset
        );

        self.state_global_dims[to_idx * 2] = self.state_global_dims[from_idx * 2];
        self.state_global_dims[to_idx * 2 + 1] = self.state_global_dims[from_idx * 2 + 1];
        self.state_entity_counts[to_idx] = self.state_entity_counts[from_idx];
    }

    fn apply_axiom_to_state(&mut self, wave_idx: usize, axiom: &Axiom) {
        match axiom.tier {
            4 => self.apply_geometry_safe(wave_idx, axiom),
            _ => self.apply_generic(wave_idx, axiom),
        }
    }

    fn apply_geometry_safe(&mut self, wave_idx: usize, axiom: &Axiom) {
        let e = self.config.max_entities;
        let d = self.config.global_dimension;

        let w = self.state_global_dims[wave_idx * 2];
        let h = self.state_global_dims[wave_idx * 2 + 1];
        let center_x = w / 2.0;
        let center_y = h / 2.0;

        let is_mirror_x = axiom.name.contains("MIRROR_X");
        let is_mirror_y = axiom.name.contains("MIRROR_Y");
        let is_rotate = axiom.name.contains("ROTATE");

        for entity_idx in 0..self.state_entity_counts[wave_idx] as usize {
            let mass_offset = wave_idx * e * 10 + entity_idx * 10;
            let mass = self.state_scalar_data[mass_offset];
            if mass == 0.0 { continue; }

            let cx_offset = mass_offset + 1;
            let cy_offset = mass_offset + 2;
            let cx = self.state_scalar_data[cx_offset];
            let cy = self.state_scalar_data[cy_offset];

            let (new_cx, new_cy) = if is_mirror_x {
                (2.0 * center_x - cx, cy)
            } else if is_mirror_y {
                (cx, 2.0 * center_y - cy)
            } else if is_rotate {
                let dx = cx - center_x;
                let dy = cy - center_y;
                (center_x - dy, center_y + dx)
            } else {
                (cx, cy)
            };

            self.state_scalar_data[cx_offset] = new_cx.max(0.0) + 1e-15;
            self.state_scalar_data[cy_offset] = new_cy.max(0.0) + 1e-15;

            let spatial_offset = wave_idx * e * d + entity_idx * d;
            let x_seed = CoreSeeds::x_axis_seed();
            let y_seed = CoreSeeds::y_axis_seed();

            let x_phase = FHRR::fractional_bind(x_seed, new_cx);
            let y_phase = FHRR::fractional_bind(y_seed, new_cy);
            let new_spatial = FHRR::bind(&x_phase, &y_phase);

            for i in 0..d {
                self.state_spatial_tensors[spatial_offset + i] = new_spatial[i];
            }
        }
    }

    fn apply_generic(&mut self, _wave_idx: usize, _axiom: &Axiom) {}

    fn calculate_metrics(&mut self, wave_idx: usize, expected: &EntityManifold) {
        let current = self.reconstruct_manifold(wave_idx);
        let pragmatic = self.calculate_pragmatic_error(&current, expected);

        let parent_idx = self.wave_parent_indices[wave_idx];
        let epistemic = if parent_idx >= 0 {
            self.calculate_epistemic_gain(parent_idx as usize, wave_idx)
        } else {
            0.0
        };

        let free_energy = pragmatic - (self.config.epistemic_weight * epistemic);

        self.metric_pragmatic_errors[wave_idx] = pragmatic;
        self.metric_epistemic_values[wave_idx] = epistemic;
        self.metric_free_energies[wave_idx] = free_energy.max(-999.0).min(999.0);

        let prob = (-free_energy / (self.temperature + 1e-15)).exp();
        self.metric_probabilities[wave_idx] = prob.min(0.99);
        self.wave_last_access[wave_idx] = self.get_timestamp();
    }

    pub fn find_best_wave(&self) -> Option<usize> {
        let mut best_idx: usize = 0;
        let mut best_energy: f32 = 999.0;
        let mut found = false;

        for i in 0..self.config.max_waves {
            if self.wave_masses[i] == 0.0 { continue; }
            let energy = self.metric_free_energies[i];
            if energy < best_energy {
                best_energy = energy;
                best_idx = i;
                found = true;
            }
        }
        if found { Some(best_idx) } else { None }
    }

    pub fn update_all_probabilities(&mut self) {
        for i in 0..self.config.max_waves {
            let is_active = 1.0 - (self.wave_masses[i] == 0.0) as i32 as f32;
            let energy = self.metric_free_energies[i];
            let prob = (-energy / (self.temperature + 1e-15)).exp() * is_active;
            self.metric_probabilities[i] = prob.max(0.0).min(0.99);
        }
    }

    pub fn update_frontier(&mut self) {
        self.frontier_active_indices.clear();
        let target_size = if self.temperature > 1.0 {
            (self.config.max_frontier as f32 * 0.5) as usize
        } else if self.temperature > 0.5 {
            (self.config.max_frontier as f32 * 0.2) as usize
        } else {
            (self.config.max_frontier as f32 * 0.05) as usize
        };

        let mut candidates: Vec<(usize, f32)> = Vec::with_capacity(self.config.max_waves / 10);
        for i in 0..self.config.max_waves {
            if self.wave_masses[i] == 0.0 { continue; }
            if self.wave_first_child_indices[i] != -1 { continue; }
            if self.wave_depths[i] >= self.horizon_limit { continue; }
            candidates.push((i, self.metric_free_energies[i]));
        }

        candidates.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));

        // Fast-Path Exploitation (Temperature Cooling)
        // If the best candidate has a very low free energy, collapse the beam width to 1.
        let actual_target_size = if !candidates.is_empty() && candidates[0].1 < 0.1 {
            1
        } else {
            target_size
        };

        for (idx, _) in candidates.into_iter().take(actual_target_size) {
            self.frontier_active_indices.push(idx);
        }
        self.frontier_size = self.frontier_active_indices.len();
        self.stats.frontier_resizes += 1;
    }

    pub fn expand_frontier(
        &mut self,
        candidate_axioms: &[u16],
        expected: &EntityManifold,
        axioms_map: &[Axiom]
    ) -> ExpansionResult {
        let mut total_new = 0;
        let mut best_new_energy: f32 = 999.0;
        let mut best_new_idx: usize = 0;

        let frontier: Vec<usize> = self.frontier_active_indices.clone();
        for &parent_idx in &frontier {
            let children = self.expand_wave(parent_idx, candidate_axioms, expected, axioms_map);
            total_new += children.len();
            for &child_idx in &children {
                let energy = self.metric_free_energies[child_idx];
                if energy < best_new_energy {
                    best_new_energy = energy;
                    best_new_idx = child_idx;
                }
            }
        }

        self.update_frontier();
        ExpansionResult {
            new_waves: total_new,
            best_new_wave: if total_new > 0 { Some(best_new_idx) } else { None },
            frontier_size: self.frontier_size,
        }
    }

    pub fn extract_winning_path(&self, leaf_idx: usize) -> Vec<u16> {
        let mut path = Vec::with_capacity(self.horizon_limit as usize);
        let mut current = leaf_idx as i32;

        while current >= 0 {
            let idx = current as usize;
            let axiom_id = self.wave_applied_axiom_ids[idx];
            if axiom_id != 0 {
                path.push(axiom_id);
            }
            current = self.wave_parent_indices[idx];
        }

        path.reverse();
        path
    }

    pub fn deduplicate_waves(&mut self) -> usize {
        let mut duplicates = 0;
        let active_indices: Vec<usize> = self.frontier_active_indices.clone();

        let e = self.config.max_entities;

        for i in 0..active_indices.len() {
            let idx_a = active_indices[i];
            if self.wave_masses[idx_a] == 0.0 { continue; }

            let energy_a = self.metric_free_energies[idx_a];

            for j in (i + 1)..active_indices.len() {
                let idx_b = active_indices[j];
                if self.wave_masses[idx_b] == 0.0 { continue; }

                // Compare state scalars (a lightweight check before checking 8192-D tensors)
                let offset_a = idx_a * e * 10;
                let offset_b = idx_b * e * 10;

                let mut diff_sq = 0.0;
                for k in 0..(e * 10) {
                    let diff = self.state_scalar_data[offset_a + k] - self.state_scalar_data[offset_b + k];
                    diff_sq += diff * diff;
                }

                let dist = diff_sq.sqrt();

                // If they are nearly identical states (distance < epsilon)
                if dist < 0.1 {
                    let energy_b = self.metric_free_energies[idx_b];

                    // Annihilate the one with higher (worse) free energy
                    if energy_a < energy_b {
                        self.free_wave(idx_b);
                        duplicates += 1;
                    } else {
                        self.free_wave(idx_a);
                        duplicates += 1;
                        break; // idx_a is dead, stop checking it against others
                    }
                }
            }
        }

        // Remove dead waves from frontier
        self.frontier_active_indices.retain(|&idx| self.wave_masses[idx] > 0.0);
        self.frontier_size = self.frontier_active_indices.len();

        duplicates
    }

    pub fn auto_prune(&mut self) -> usize {
        let active_count = self.wave_masses.iter().filter(|&&m| m > 0.0).count();
        let pressure = active_count as f32 / self.config.max_waves as f32;

        if pressure > 0.9 {
            let median = self.calculate_percentile_energy(0.5);
            self.prune_waves(median)
        } else if pressure > 0.7 {
            let p80 = self.calculate_percentile_energy(0.8);
            self.prune_waves(p80)
        } else {
            0
        }
    }

    pub fn prune_waves(&mut self, threshold: f32) -> usize {
        let mut pruned = 0;
        for i in 0..self.config.max_waves {
            if self.wave_masses[i] == 0.0 { continue; }
            if self.wave_parent_indices[i] == -1 { continue; }
            if self.frontier_active_indices.contains(&i) { continue; }

            if self.metric_free_energies[i] > threshold {
                self.free_wave(i);
                pruned += 1;
            }
        }
        pruned
    }

    fn calculate_percentile_energy(&self, p: f32) -> f32 {
        let mut energies: Vec<f32> = self.metric_free_energies.iter()
            .enumerate()
            .filter(|(i, _)| self.wave_masses[*i] > 0.0)
            .map(|(_, &e)| e)
            .collect();

        if energies.is_empty() { return 999.0; }
        energies.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let idx = ((energies.len() as f32) * p) as usize;
        energies[idx.min(energies.len() - 1)]
    }

    fn get_timestamp(&self) -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64
    }

    fn reconstruct_manifold(&self, wave_idx: usize) -> EntityManifold {
        let e = self.config.max_entities;
        let d = self.config.global_dimension;
        let mut man = EntityManifold::new();
        man.active_count = self.state_entity_counts[wave_idx] as usize;
        man.global_width = self.state_global_dims[wave_idx * 2];
        man.global_height = self.state_global_dims[wave_idx * 2 + 1];

        for i in 0..man.active_count {
            let scalar_offset = wave_idx * e * 10 + i * 10;
            man.masses[i] = self.state_scalar_data[scalar_offset];
            man.centers_x[i] = self.state_scalar_data[scalar_offset + 1];
            man.centers_y[i] = self.state_scalar_data[scalar_offset + 2];
            man.tokens[i] = self.state_scalar_data[scalar_offset + 3] as i32;
            man.spans_x[i] = self.state_scalar_data[scalar_offset + 4];
            man.spans_y[i] = self.state_scalar_data[scalar_offset + 5];
        }
        man
    }

    fn calculate_pragmatic_error(&self, current: &EntityManifold, expected: &EntityManifold) -> f32 {
        // Penalty for dimension mismatch
        let mut error = 0.0;
        let dim_diff = (current.global_width - expected.global_width).abs()
                     + (current.global_height - expected.global_height).abs();

        if dim_diff > 0.1 {
            error += dim_diff * 500.0; // Heavy penalty for wrong dimensions
        }

        // Vectorized pixel mismatch calculation
        let mut pixels_mismatch = 0.0;
        let active_expected = expected.active_count;
        let active_current = current.active_count;

        error += (active_expected as f32 - active_current as f32).abs() * 50.0;

        // Simple continuous heuristic: sum of distances between tokens if same count, or just diff in sums
        let mut sum_expected_tokens = 0.0;
        for i in 0..active_expected {
            sum_expected_tokens += expected.tokens[i] as f32 * expected.masses[i];
        }

        let mut sum_current_tokens = 0.0;
        for i in 0..active_current {
            sum_current_tokens += current.tokens[i] as f32 * current.masses[i];
        }

        error += (sum_expected_tokens - sum_current_tokens).abs() * 10.0;

        error.max(0.0)
    }

    fn calculate_epistemic_gain(&self, parent_idx: usize, child_idx: usize) -> f32 {
        // Epistemic gain is the L2 distance (change) between parent and child state
        let e = self.config.max_entities;
        let d = self.config.global_dimension;

        let parent_offset = parent_idx * e * 10;
        let child_offset = child_idx * e * 10;

        let mut diff_sq = 0.0;
        for i in 0..(e * 10) {
            let diff = self.state_scalar_data[child_offset + i] - self.state_scalar_data[parent_offset + i];
            diff_sq += diff * diff;
        }

        // Small epsilon to prevent zero
        (diff_sq.sqrt() + 1e-15).min(100.0) // Cap gain
    }

    pub fn switch_mode(&mut self, mode: SimulationMode) {
        self.current_mode = mode;
        match mode {
            SimulationMode::StrictVSA => { self.temperature = 0.1; self.config.epistemic_weight = 10.0; },
            SimulationMode::Probabilistic => { self.temperature = 2.0; self.config.epistemic_weight = 100.0; },
            SimulationMode::Counterfactual => { self.temperature = 1.0; self.config.epistemic_weight = 50.0; },
        }
    }
}

pub struct DeepActiveInferenceEngine {
    pub current_mode: SimulationMode,
}

impl DeepActiveInferenceEngine {
    pub fn new() -> Self {
        Self { current_mode: SimulationMode::StrictVSA }
    }

    pub fn switch_mode(&mut self, mode: SimulationMode) {
        self.current_mode = mode;
    }
}
