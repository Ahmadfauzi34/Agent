import re

with open('rrm_rust/src/perception/relational_engine.rs', 'r') as f:
    content = f.read()

# Update RelationType
target_relation_type = """pub enum RelationType {
    Touching = 1,
    Enclosed = 2,
    RayHit = 3,
}"""
replacement_relation_type = """pub enum RelationType {
    Touching = 1,
    Enclosed = 2,
    RayHit = 3,
    AlignedHorizontally = 4,
    AlignedVertically = 5,
}"""
content = content.replace(target_relation_type, replacement_relation_type)

# Add Macro fields to RelationalStateSoA
target_struct = """    pub active_objects: usize,
    pub active_edges: usize,
}"""
replacement_struct = """    pub active_objects: usize,
    pub active_edges: usize,

    // Macro-Level (Global Context / Set Operations)
    pub largest_obj_idx: Option<usize>,
    pub smallest_obj_idx: Option<usize>,
    pub most_frequent_color: Option<i32>,
    pub rarest_color: Option<i32>,
}"""
content = content.replace(target_struct, replacement_struct)

# Update ::new()
target_new = """            active_objects: 0,
            active_edges: 0,
        }"""
replacement_new = """            active_objects: 0,
            active_edges: 0,
            largest_obj_idx: None,
            smallest_obj_idx: None,
            most_frequent_color: None,
            rarest_color: None,
        }"""
content = content.replace(target_new, replacement_new)

# Add compute_macro_relations call in build_from_manifold
target_build = """    pub fn build_from_manifold(&mut self, manifold: &EntityManifold) {
        self.extract_meso_objects(manifold);
        self.compute_micro_relations(manifold);
    }"""
replacement_build = """    pub fn build_from_manifold(&mut self, manifold: &EntityManifold) {
        self.extract_meso_objects(manifold);
        self.compute_micro_relations(manifold);
        self.compute_macro_relations();
    }"""
content = content.replace(target_build, replacement_build)

# Inject compute_macro_relations method at the end
target_end = """        self.active_edges += 1;
    }
}"""
replacement_end = """        self.active_edges += 1;
    }

    // =========================================================================
    // PHASE 3: MACRO-ARCHITECTURAL GRAMMAR
    // =========================================================================

    fn compute_macro_relations(&mut self) {
        if self.active_objects == 0 { return; }

        let mut max_area = -1.0;
        let mut min_area = 999999.0;
        let mut largest_idx = None;
        let mut smallest_idx = None;

        let mut color_counts = [0; 10]; // Colors 0-9

        for i in 0..self.active_objects {
            if self.obj_masses[i] == 0.0 { continue; }

            let area = self.obj_areas[i];
            if area > max_area {
                max_area = area;
                largest_idx = Some(i);
            }
            if area < min_area {
                min_area = area;
                smallest_idx = Some(i);
            }

            let token = self.obj_tokens[i];
            if token >= 0 && token <= 9 {
                color_counts[token as usize] += area as i32; // Weighted by area
            }

            // Check Macro-Alignments
            for j in (i + 1)..self.active_objects {
                if self.obj_masses[j] == 0.0 { continue; }

                let cy_i = self.obj_centroids_y[i];
                let cy_j = self.obj_centroids_y[j];
                let cx_i = self.obj_centroids_x[i];
                let cx_j = self.obj_centroids_x[j];

                // ARE_ALIGNED_HORIZONTALLY (Centers share similar Y)
                if (cy_i - cy_j).abs() < 1.0 {
                    self.add_edge(i, j, RelationType::AlignedHorizontally as u8, 1.0);
                    self.add_edge(j, i, RelationType::AlignedHorizontally as u8, 1.0); // Symmetric
                }

                // ARE_ALIGNED_VERTICALLY (Centers share similar X)
                if (cx_i - cx_j).abs() < 1.0 {
                    self.add_edge(i, j, RelationType::AlignedVertically as u8, 1.0);
                    self.add_edge(j, i, RelationType::AlignedVertically as u8, 1.0);
                }
            }
        }

        self.largest_obj_idx = largest_idx;
        self.smallest_obj_idx = smallest_idx;

        let mut max_color_count = -1;
        let mut min_color_count = 999999;
        let mut most_freq = None;
        let mut rarest = None;

        for c in 1..10 { // Ignore background 0
            let count = color_counts[c];
            if count > 0 {
                if count > max_color_count {
                    max_color_count = count;
                    most_freq = Some(c as i32);
                }
                if count < min_color_count {
                    min_color_count = count;
                    rarest = Some(c as i32);
                }
            }
        }

        self.most_frequent_color = most_freq;
        self.rarest_color = rarest;
    }
}"""
content = content.replace(target_end, replacement_end)

with open('rrm_rust/src/perception/relational_engine.rs', 'w') as f:
    f.write(content)
