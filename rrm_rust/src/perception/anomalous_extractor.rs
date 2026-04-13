use crate::core::entity_manifold::EntityManifold;
use std::collections::{HashMap, HashSet};

pub struct AnomalousExtractor;

impl AnomalousExtractor {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, state: &EntityManifold) -> Result<EntityManifold, String> {
        let new_state = extract_anomalous_quadrant(state);
        Ok(new_state)
    }
}

pub fn extract_anomalous_quadrant(state: &EntityManifold) -> EntityManifold {
    if state.active_count == 0 {
        return state.clone();
    }

    // Based on the tasks:
    // 05269061: 7x7 input, 7x7 output (tiling pattern)
    // 09629e4f: 11x11 input, 11x11 output (3x3 blocks with 5 lines)
    // 2dc579da: 13x13 input, 6x6 output (anomaly quadrant extraction)

    // Only 2dc579da is an extraction task.
    // If we can identify a pure anomaly (single pixel) inside a large block (or bounding box),
    // we extract that bounding box. If not, we return the original grid.

    let mut anomaly_idx = None;

    // Find minority color
    let mut color_counts = HashMap::new();
    for i in 0..state.active_count {
        if state.masses[i] > 0.0 && state.tokens[i] != 0 {
            *color_counts.entry(state.tokens[i]).or_insert(0) += 1;
        }
    }

    let mut minority_color = 0;
    if let Some((&color, _)) = color_counts.iter().min_by_key(|&(_, c)| c) {
        minority_color = color;
    }

    // The anomaly is likely a small object (mass ~ 1) of the minority color
    for i in 0..state.active_count {
        if state.masses[i] > 0.0 && state.tokens[i] == minority_color && state.masses[i] <= 4.0 {
            anomaly_idx = Some(i);
            break;
        }
    }

    if anomaly_idx.is_none() {
        return state.clone(); // Not an anomaly task
    }

    let a_idx = anomaly_idx.unwrap();
    let ax = state.centers_x[a_idx];
    let ay = state.centers_y[a_idx];

    // Find a quadrant (a large block separated by 0s).
    // In our `segment_stream`, 1s are grouped into large objects.
    // Let's just find an entity with a large bounding box that encapsulates the anomaly.
    // Wait, `EntityManifold` centers_x and spans_x might just be the center of mass.
    // To be perfectly accurate for 2dc579da (13x13, quadrants are 6x6 separated by 0 at index 6)
    // If the grid is bounded by 0s, let's just find the bounding box directly from the raw coordinates
    // if we know the anomaly's position.

    // Wait, the state in `agent.rs` has `dummy_perceiver` which means we might just have `RAW_X` pixels!
    // "Dummy perceiver karena di sini kita hanya butuh semantic pixel mentah"
    // `segment_stream` using `dummy_perceiver` actually creates exactly 1 entity PER PIXEL if it doesn't merge!
    // Ah! Wait, `segment_stream` in Swarm paradigm actually creates Gestalt atoms.
    // But anyway, if it's pixels or atoms, we can just find the bounding box of non-zero pixels
    // that are connected to the anomaly.

    // Let's do a flood fill on the raw coordinates of ALL active elements.
    let mut grid_map = HashMap::new();
    for i in 0..state.active_count {
        if state.masses[i] > 0.0 && state.tokens[i] != 0 {
            // For raw pixels, mass is 1, centers are exact coordinates.
            // For atoms, centers are COM, but spans give the bounding box.
            // Let's expand atoms into a dense grid map
            let cx = state.centers_x[i].round() as i32;
            let cy = state.centers_y[i].round() as i32;
            let w = state.spans_x[i].round() as i32;
            let h = state.spans_y[i].round() as i32;

            if w <= 1 && h <= 1 {
                grid_map.insert((cx, cy), i);
            } else {
                let left = cx - (w - 1) / 2;
                let top = cy - (h - 1) / 2;
                for dx in 0..w {
                    for dy in 0..h {
                        grid_map.insert((left + dx, top + dy), i);
                    }
                }
            }
        }
    }

    let start_cx = ax.round() as i32;
    let start_cy = ay.round() as i32;

    if !grid_map.contains_key(&(start_cx, start_cy)) {
        return state.clone();
    }

    let mut visited = HashSet::new();
    let mut queue = std::collections::VecDeque::new();

    queue.push_back((start_cx, start_cy));
    visited.insert((start_cx, start_cy));

    let dirs = [
        (0, 1),
        (1, 0),
        (0, -1),
        (-1, 0),
        (1, 1),
        (-1, -1),
        (1, -1),
        (-1, 1),
    ];

    let mut min_x = start_cx;
    let mut max_x = start_cx;
    let mut min_y = start_cy;
    let mut max_y = start_cy;

    while let Some((cx, cy)) = queue.pop_front() {
        if cx < min_x {
            min_x = cx;
        }
        if cx > max_x {
            max_x = cx;
        }
        if cy < min_y {
            min_y = cy;
        }
        if cy > max_y {
            max_y = cy;
        }

        for &(dx, dy) in &dirs {
            let nx = cx + dx;
            let ny = cy + dy;
            if grid_map.contains_key(&(nx, ny)) && !visited.contains(&(nx, ny)) {
                visited.insert((nx, ny));
                queue.push_back((nx, ny));
            }
        }
    }

    let new_w = (max_x - min_x) as f32 + 1.0;
    let new_h = (max_y - min_y) as f32 + 1.0;

    // If the "anomaly" is connected to the entire grid (e.g. 05269061, 09629e4f),
    // new_w/new_h will be equal to the full grid, so we return it uncropped.
    if new_w >= state.global_width - 1.0 && new_h >= state.global_height - 1.0 {
        return state.clone();
    }

    let mut new_state = EntityManifold::new();
    new_state.global_width = new_w;
    new_state.global_height = new_h;

    let mut copied = 0;
    let mut added_entities = HashSet::new();

    for &(cx, cy) in &visited {
        if let Some(&idx) = grid_map.get(&(cx, cy)) {
            // Because one entity could cover multiple pixels, we avoid duplicating it
            if !added_entities.contains(&idx) {
                added_entities.insert(idx);

                new_state.ensure_scalar_capacity(copied + 1);

                new_state.masses[copied] = state.masses[idx];
                new_state.tokens[copied] = state.tokens[idx];
                new_state.centers_x[copied] = state.centers_x[idx] - min_x as f32;
                new_state.centers_y[copied] = state.centers_y[idx] - min_y as f32;
                new_state.spans_x[copied] = state.spans_x[idx];
                new_state.spans_y[copied] = state.spans_y[idx];

                copied += 1;
            }
        }
    }

    new_state.active_count = copied;
    println!("Extracted anomaly quadrant: {}x{}", new_w, new_h);

    new_state
}
