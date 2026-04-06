use crate::core::entity_manifold::EntityManifold;
use std::collections::HashSet;

/// V8-Optimized SoA representation of the Relational Graph
pub struct RelationalStateSoA {
    // Meso-Level (Objects / Gestalt Atoms)
    pub obj_masses: Vec<f32>,           // 0.0 = ghost
    pub obj_tokens: Vec<i32>,
    pub obj_centroids_x: Vec<f32>,
    pub obj_centroids_y: Vec<f32>,
    pub obj_bboxes: Vec<[f32; 4]>,      // [min_x, min_y, max_x, max_y]
    pub obj_areas: Vec<f32>,
    pub obj_rectilinearity: Vec<f32>,   // 1.0 = perfect rectangle
    pub obj_euler_chars: Vec<i32>,      // 1 = solid, <=0 = hollow/has holes

    // Micro-Level (Edges / Relations)
    pub edge_masses: Vec<f32>,          // 0.0 = ghost
    pub edge_source_idx: Vec<u16>,
    pub edge_target_idx: Vec<u16>,
    pub edge_relation_type: Vec<u8>,    // 1=TOUCHING, 2=ENCLOSED, 3=RAY_HIT
    pub edge_fuzzy_score: Vec<f32>,     // 0.0 - 1.0 Probability/Confidence

    pub max_objects: usize,
    pub max_edges: usize,
    pub active_objects: usize,
    pub active_edges: usize,
}

pub enum RelationType {
    Touching = 1,
    Enclosed = 2,
    RayHit = 3,
}

impl RelationalStateSoA {
    pub fn new(max_objects: usize, max_edges: usize) -> Self {
        Self {
            obj_masses: vec![0.0; max_objects],
            obj_tokens: vec![0; max_objects],
            obj_centroids_x: vec![0.0; max_objects],
            obj_centroids_y: vec![0.0; max_objects],
            obj_bboxes: vec![[0.0, 0.0, 0.0, 0.0]; max_objects],
            obj_areas: vec![0.0; max_objects],
            obj_rectilinearity: vec![0.0; max_objects],
            obj_euler_chars: vec![0; max_objects],

            edge_masses: vec![0.0; max_edges],
            edge_source_idx: vec![0; max_edges],
            edge_target_idx: vec![0; max_edges],
            edge_relation_type: vec![0; max_edges],
            edge_fuzzy_score: vec![0.0; max_edges],

            max_objects,
            max_edges,
            active_objects: 0,
            active_edges: 0,
        }
    }

    pub fn build_from_manifold(&mut self, manifold: &EntityManifold) {
        self.extract_meso_objects(manifold);
        self.compute_micro_relations(manifold);
    }

    // =========================================================================
    // PHASE 2: MESO-STRUCTURAL GRAMMAR
    // =========================================================================

    /// Extract contiguous color blocks as meso-objects
    fn extract_meso_objects(&mut self, manifold: &EntityManifold) {
        let width = manifold.global_width as usize;
        let height = manifold.global_height as usize;
        if width == 0 || height == 0 { return; }

        let mut grid = vec![vec![-1_i32; width]; height];
        for i in 0..manifold.active_count {
            if manifold.masses[i] > 0.0 && manifold.tokens[i] != 0 {
                let x = manifold.centers_x[i] as usize;
                let y = manifold.centers_y[i] as usize;
                if x < width && y < height {
                    grid[y][x] = manifold.tokens[i];
                }
            }
        }

        let mut visited = vec![vec![false; width]; height];
        self.active_objects = 0;

        for y in 0..height {
            for x in 0..width {
                let token = grid[y][x];
                if token != -1 && !visited[y][x] {
                    if self.active_objects >= self.max_objects { return; } // Safety

                    let mut min_x = x;
                    let mut max_x = x;
                    let mut min_y = y;
                    let mut max_y = y;
                    let mut area = 0.0;
                    let mut sum_x = 0.0;
                    let mut sum_y = 0.0;

                    let mut queue = std::collections::VecDeque::new();
                    queue.push_back((x, y));
                    visited[y][x] = true;

                    while let Some((cx, cy)) = queue.pop_front() {
                        area += 1.0;
                        sum_x += cx as f32;
                        sum_y += cy as f32;

                        if cx < min_x { min_x = cx; }
                        if cx > max_x { max_x = cx; }
                        if cy < min_y { min_y = cy; }
                        if cy > max_y { max_y = cy; }

                        let neighbors = [(0, 1), (1, 0), (0, -1_i32), (-1_i32, 0)];
                        for (dx, dy) in neighbors.iter() {
                            let nx = cx as i32 + dx;
                            let ny = cy as i32 + dy;

                            if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                                let unx = nx as usize;
                                let uny = ny as usize;

                                if grid[uny][unx] == token && !visited[uny][unx] {
                                    visited[uny][unx] = true;
                                    queue.push_back((unx, uny));
                                }
                            }
                        }
                    }

                    let obj_idx = self.active_objects;
                    self.obj_masses[obj_idx] = 1.0;
                    self.obj_tokens[obj_idx] = token;
                    self.obj_areas[obj_idx] = area;
                    self.obj_centroids_x[obj_idx] = sum_x / area;
                    self.obj_centroids_y[obj_idx] = sum_y / area;
                    self.obj_bboxes[obj_idx] = [min_x as f32, min_y as f32, max_x as f32, max_y as f32];

                    // RECTILINEARITY: Area / Bounding Box Area
                    let bbox_area = (max_x - min_x + 1) as f32 * (max_y - min_y + 1) as f32;
                    self.obj_rectilinearity[obj_idx] = area / (bbox_area + 1e-15);

                    // EULER CHARACTERISTIC: 1 (Solid) if Rectilinearity > 0.9, else potentially hollow
                    // Advanced Euler (V-E+F) requires contour tracing, but we approximate via BBox density
                    // Also check for internal 0s (chambers) inside BBox to verify "hollow"
                    let mut internal_zeros = 0;
                    for iy in min_y..=max_y {
                        for ix in min_x..=max_x {
                            if grid[iy][ix] == -1 {
                                internal_zeros += 1;
                            }
                        }
                    }

                    self.obj_euler_chars[obj_idx] = if internal_zeros > 0 && self.obj_rectilinearity[obj_idx] < 0.9 {
                        0 // Hollow (Genus 1+)
                    } else {
                        1 // Solid
                    };

                    self.active_objects += 1;
                }
            }
        }
    }

    // =========================================================================
    // PHASE 1: MICRO-RELATIONAL GRAMMAR
    // =========================================================================

    fn compute_micro_relations(&mut self, _manifold: &EntityManifold) {
        self.active_edges = 0;
        let n = self.active_objects;

        for i in 0..n {
            if self.obj_masses[i] == 0.0 { continue; }

            for j in 0..n {
                if i == j || self.obj_masses[j] == 0.0 { continue; }

                let bbox_a = self.obj_bboxes[i];
                let bbox_b = self.obj_bboxes[j];

                // 1. IS_TOUCHING (Distance between BBoxes <= 1.0)
                let dx = (bbox_a[0] - bbox_b[2]).max(bbox_b[0] - bbox_a[2]).max(0.0);
                let dy = (bbox_a[1] - bbox_b[3]).max(bbox_b[1] - bbox_a[3]).max(0.0);

                if dx <= 1.0 && dy <= 1.0 && (dx + dy) <= 1.0 {
                    self.add_edge(i, j, RelationType::Touching as u8, 1.0);
                }

                // 2. IS_ENCLOSED (BBox A completely inside BBox B)
                // A is inside B if A's min >= B's min AND A's max <= B's max
                if bbox_a[0] >= bbox_b[0] && bbox_a[1] >= bbox_b[1] &&
                   bbox_a[2] <= bbox_b[2] && bbox_a[3] <= bbox_b[3] {

                   // Fuzzy probability based on area ratio (if A is very small compared to B)
                   let area_ratio = self.obj_areas[i] / (self.obj_areas[j] + 1e-15);
                   let fuzzy_score = (1.0 - area_ratio).max(0.0);

                   self.add_edge(i, j, RelationType::Enclosed as u8, fuzzy_score);
                }

                // 3. RAY_CAST (Directional alignment without intersection)
                // A horizontal ray from A hits B if they share Y span and B is to the right
                let y_overlap = bbox_a[1] <= bbox_b[3] && bbox_a[3] >= bbox_b[1];
                if y_overlap {
                    if bbox_a[2] < bbox_b[0] {
                        // Ray from A (Right) hits B
                        let dist = bbox_b[0] - bbox_a[2];
                        let fuzzy_score = 1.0 / (dist + 1.0); // Closer = higher probability
                        self.add_edge(i, j, RelationType::RayHit as u8, fuzzy_score);
                    }
                }

                let x_overlap = bbox_a[0] <= bbox_b[2] && bbox_a[2] >= bbox_b[0];
                if x_overlap {
                    if bbox_a[3] < bbox_b[1] {
                        // Ray from A (Down) hits B
                        let dist = bbox_b[1] - bbox_a[3];
                        let fuzzy_score = 1.0 / (dist + 1.0);
                        self.add_edge(i, j, RelationType::RayHit as u8, fuzzy_score);
                    }
                }
            }
        }
    }

    fn add_edge(&mut self, source: usize, target: usize, rel_type: u8, score: f32) {
        if self.active_edges >= self.max_edges { return; }

        let idx = self.active_edges;
        self.edge_masses[idx] = 1.0;
        self.edge_source_idx[idx] = source as u16;
        self.edge_target_idx[idx] = target as u16;
        self.edge_relation_type[idx] = rel_type;
        self.edge_fuzzy_score[idx] = score;

        self.active_edges += 1;
    }
}
