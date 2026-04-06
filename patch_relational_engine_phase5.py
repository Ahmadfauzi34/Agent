import re

file_path = "rrm_rust/src/perception/relational_engine.rs"

with open(file_path, "r") as f:
    content = f.read()

# Add new relation types for temporal tracking
new_relations = """
    // Phase 5: Temporal-Dynamic Grammar
    Became = 7,       // Object i transformed into Object j (identity preserved, attributes changed)
    Spawned = 8,      // Object i appeared out of nowhere
    Vanished = 9,     // Object i disappeared entirely
    Moved = 10,       // Object i changed spatial coordinates (dx, dy)
"""
content = re.sub(
    r"(AlignedVertically = 6,)",
    r"\1" + new_relations,
    content
)

# Add Trajectory/Velocity fields to RelationalStateSoA
new_fields = """
    // --- Phase 5: Temporal-Dynamic Trajectories ---
    pub obj_velocity_x: Vec<f32>,
    pub obj_velocity_y: Vec<f32>,
    pub obj_temporal_persistence: Vec<f32>, // Probability this object is the same entity from a previous state
"""
content = re.sub(
    r"(pub rarest_color: Option<i32>,)",
    r"\1" + new_fields,
    content
)

# Initialize new fields
new_init = """
            obj_velocity_x: vec![0.0; max_objects],
            obj_velocity_y: vec![0.0; max_objects],
            obj_temporal_persistence: vec![1.0; max_objects],
"""
content = re.sub(
    r"(rarest_color: None,)",
    r"\1" + new_init,
    content
)

# Add temporal comparison method
temporal_method = """
    // =========================================================================
    // PHASE 5: TEMPORAL-DYNAMIC GRAMMAR
    // =========================================================================

    /// Membandingkan dua state untuk melacak pergerakan dan transformasi objek seiring waktu
    pub fn compute_temporal_dynamics(&mut self, previous_state: &RelationalStateSoA) {
        // Simple heuristic: Objects with matching colors or highly overlapping bounding boxes
        // are likely the same object that moved or changed shape.

        for curr_idx in 0..self.active_objects {
            if self.obj_masses[curr_idx] == 0.0 { continue; }

            let mut best_match_idx = None;
            let mut best_match_score = 0.0;

            for prev_idx in 0..previous_state.active_objects {
                if previous_state.obj_masses[prev_idx] == 0.0 { continue; }

                // Calculate similarity score
                let color_match = if self.obj_tokens[curr_idx] == previous_state.obj_tokens[prev_idx] { 1.0 } else { 0.0 };

                // Jaccard similarity of bounding boxes (simplified overlap)
                let b1 = self.obj_bboxes[curr_idx];
                let b2 = previous_state.obj_bboxes[prev_idx];

                let intersect_w = (b1[2].min(b2[2]) - b1[0].max(b2[0])).max(0.0);
                let intersect_h = (b1[3].min(b2[3]) - b1[1].max(b2[1])).max(0.0);
                let intersect_area = intersect_w * intersect_h;

                let area1 = (b1[2] - b1[0]) * (b1[3] - b1[1]);
                let area2 = (b2[2] - b2[0]) * (b2[3] - b2[1]);
                let union_area = area1 + area2 - intersect_area;

                let iou = if union_area > 0.0 { intersect_area / union_area } else { 0.0 };

                // Euclidean distance between centroids (inverse)
                let dx = self.obj_centroids_x[curr_idx] - previous_state.obj_centroids_x[prev_idx];
                let dy = self.obj_centroids_y[curr_idx] - previous_state.obj_centroids_y[prev_idx];
                let dist = (dx * dx + dy * dy).sqrt();
                let spatial_score = 1.0 / (dist + 1.0);

                // Combined score
                let score = color_match * 0.4 + iou * 0.4 + spatial_score * 0.2;

                if score > best_match_score && score > 0.3 { // Threshold for identity tracking
                    best_match_score = score;
                    best_match_idx = Some((prev_idx, dx, dy));
                }
            }

            if let Some((prev_idx, dx, dy)) = best_match_idx {
                // Identity preserved! Track velocity
                self.obj_velocity_x[curr_idx] = dx;
                self.obj_velocity_y[curr_idx] = dy;
                self.obj_temporal_persistence[curr_idx] = best_match_score;

                if dx.abs() > 0.1 || dy.abs() > 0.1 {
                    self.add_edge(curr_idx, curr_idx, RelationType::Moved as u8, best_match_score);
                }

                if self.obj_tokens[curr_idx] != previous_state.obj_tokens[prev_idx] {
                     self.add_edge(curr_idx, curr_idx, RelationType::Became as u8, best_match_score);
                }
            } else {
                // No match found -> Object spawned
                self.add_edge(curr_idx, curr_idx, RelationType::Spawned as u8, 1.0);
            }
        }

        // Check for Vanished objects
        for prev_idx in 0..previous_state.active_objects {
            if previous_state.obj_masses[prev_idx] == 0.0 { continue; }

            let mut found_match = false;
            for curr_idx in 0..self.active_objects {
                if self.obj_masses[curr_idx] == 0.0 { continue; }

                 let color_match = if self.obj_tokens[curr_idx] == previous_state.obj_tokens[prev_idx] { 1.0 } else { 0.0 };
                 if color_match > 0.0 { // simplified check for vanish logic
                     found_match = true;
                     break;
                 }
            }

            if !found_match {
                // We don't have a 'curr_idx' for a vanished object in the current state's SoA directly,
                // but conceptually we register a Vanished relation. For now, we skip injecting edge since source idx is gone.
            }
        }
    }
}
"""

content = content.replace("}\n}", "}\n" + temporal_method)

with open(file_path, "w") as f:
    f.write(content)

print("RelationalEngine Phase 5 Patched!")
