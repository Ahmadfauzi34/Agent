use std::collections::{HashMap, HashSet};
use crate::core::entity_manifold::EntityManifold;

pub struct StructuralAnalyzer;

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct StructuralSignature {
    pub dim_relation: DimensionRelation,
    pub object_delta: ObjectDelta,
    pub color_transitions: Vec<(u8, u8)>,
    pub topology_in: TopologyHint,
    pub topology_out: TopologyHint,
    pub has_template_frame: bool,
    pub symmetry_change: SymmetryChange,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum DimensionRelation {
    Larger,
    Smaller,
    Equal,
    Mixed,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum ObjectDelta {
    Added(usize),
    Removed(usize),
    SameCount,
    Transformed,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum TopologyHint {
    Scatter,
    Grid,
    Linear,
    Nested,
    Framed,
    Single,
    Empty,
}

impl TopologyHint {
    pub fn random() -> Self {
        TopologyHint::Scatter
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SymmetryChange {
    Gained,
    Lost,
    Preserved,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum TaskClass {
    PureGeometry,
    ObjectManipulation,
    StructuralTransform,
    RelationalRearrangement,
    AlgorithmicPattern,
    Hybrid,
    Unknown,
}

#[derive(Clone)]
pub struct StructuralDelta {
    pub signature: StructuralSignature,
    pub input_stats: ObjectStatistics,
    pub output_stats: ObjectStatistics,
    pub per_object_changes: Vec<ObjectChange>,
}

#[derive(Clone)]
pub struct ObjectStatistics {
    pub count: usize,
    pub colors: HashSet<u8>,
    pub bounding_box: (u8, u8),
    pub total_pixels: usize,
    pub density: f32,
}

#[derive(Clone)]
pub struct ObjectChange {
    pub input_idx: usize,
    pub output_idx: Option<usize>,
    pub color_change: Option<(u8, u8)>,
    pub position_delta: Option<(i8, i8)>,
    pub shape_change: Option<ShapeChange>,
}

#[derive(Clone)]
pub struct ShapeChange;

impl StructuralAnalyzer {
    pub fn analyze(input: &EntityManifold, output: &EntityManifold) -> StructuralDelta {
        let in_stats = Self::gather_stats(input);
        let out_stats = Self::gather_stats(output);

        let dim_relation = Self::classify_dimension(&in_stats, &out_stats);
        let object_delta = Self::classify_object_delta(&in_stats, &out_stats);
        let color_transitions = Self::extract_color_transitions(input, output);
        let topology_in = Self::detect_topology(input);
        let topology_out = Self::detect_topology(output);
        let has_template_frame = Self::detect_template_frame(input);
        let symmetry_change = Self::analyze_symmetry(input, output);

        let per_object_changes = Self::track_object_changes(input, output);

        StructuralDelta {
            signature: StructuralSignature {
                dim_relation,
                object_delta,
                color_transitions,
                topology_in,
                topology_out,
                has_template_frame,
                symmetry_change,
            },
            input_stats: in_stats,
            output_stats: out_stats,
            per_object_changes,
        }
    }

    pub fn consensus(deltas: &[StructuralDelta]) -> StructuralDelta {
        if let Some(first) = deltas.first() {
            StructuralDelta {
                signature: first.signature.clone(),
                input_stats: first.input_stats.clone(),
                output_stats: first.output_stats.clone(),
                per_object_changes: vec![],
            }
        } else {
            panic!("Empty deltas for consensus");
        }
    }

    pub fn classify_task_class(delta: &StructuralDelta) -> TaskClass {
        use DimensionRelation::*;
        use ObjectDelta::*;

        match (&delta.signature.dim_relation, &delta.signature.object_delta) {
            (Equal, SameCount) if delta.per_object_changes.iter()
                .all(|c| c.position_delta.is_some() && c.color_change.is_none()) => {
                TaskClass::PureGeometry
            },
            (Smaller, _) | (Larger, _) => TaskClass::StructuralTransform,
            (_, Added(_)) | (_, Removed(_)) => TaskClass::ObjectManipulation,
            (_, SameCount) if delta.signature.topology_in != delta.signature.topology_out => {
                TaskClass::RelationalRearrangement
            },
            _ if delta.signature.color_transitions.len() > 2 => TaskClass::AlgorithmicPattern,
            _ => TaskClass::Hybrid,
        }
    }

    pub fn detect_topology(manifold: &EntityManifold) -> TopologyHint {
        let count = manifold.active_count;
        if count == 0 { return TopologyHint::Empty; }
        if count == 1 { return TopologyHint::Single; }

        let positions: Vec<(f32, f32)> = (0..count)
            .filter(|&i| manifold.masses[i] > 0.0)
            .map(|i| (manifold.centers_x[i], manifold.centers_y[i]))
            .collect();

        if Self::is_uniform_grid(&positions) {
            return TopologyHint::Grid;
        }

        if Self::is_linear(&positions) {
            return TopologyHint::Linear;
        }

        if Self::is_nested(&positions) {
            return TopologyHint::Nested;
        }

        if Self::is_framed(&positions, manifold) {
            return TopologyHint::Framed;
        }

        TopologyHint::Scatter
    }

    fn detect_template_frame(manifold: &EntityManifold) -> bool {
        let colors: HashSet<i32> = (0..manifold.active_count)
            .filter(|&i| manifold.masses[i] > 0.0)
            .map(|i| manifold.tokens[i])
            .collect();

        for color in colors {
            let pixels: Vec<(f32, f32)> = (0..manifold.active_count)
                .filter(|&i| manifold.masses[i] > 0.0 && manifold.tokens[i] == color)
                .map(|i| (manifold.centers_x[i], manifold.centers_y[i]))
                .collect();

            if Self::forms_rectangular_border(&pixels) {
                return true;
            }
        }

        false
    }

    fn is_uniform_grid(positions: &[(f32, f32)]) -> bool {
        if positions.len() < 4 { return false; }

        let mut xs: Vec<f32> = positions.iter().map(|p| p.0).collect();
        let mut ys: Vec<f32> = positions.iter().map(|p| p.1).collect();

        xs.sort_by(|a, b| a.partial_cmp(b).unwrap());
        ys.sort_by(|a, b| a.partial_cmp(b).unwrap());

        xs.dedup_by(|a, b| (*a - *b).abs() < 0.1);
        ys.dedup_by(|a, b| (*a - *b).abs() < 0.1);

        let grid_size = xs.len() * ys.len();
        positions.len() >= grid_size.saturating_sub(2)
    }

    fn is_linear(_positions: &[(f32, f32)]) -> bool { false }
    fn is_nested(_positions: &[(f32, f32)]) -> bool { false }
    fn is_framed(_positions: &[(f32, f32)], _manifold: &EntityManifold) -> bool { false }
    fn forms_rectangular_border(_pixels: &[(f32, f32)]) -> bool { false }

    fn gather_stats(manifold: &EntityManifold) -> ObjectStatistics {
        let active = manifold.active_count;
        let mut colors = HashSet::new();
        for i in 0..active {
            if manifold.masses[i] > 0.0 {
                colors.insert(manifold.tokens[i] as u8);
            }
        }
        ObjectStatistics {
            count: active,
            colors,
            bounding_box: (manifold.global_width as u8, manifold.global_height as u8),
            total_pixels: active,
            density: 1.0,
        }
    }

    fn classify_dimension(in_stats: &ObjectStatistics, out_stats: &ObjectStatistics) -> DimensionRelation {
        if in_stats.bounding_box == out_stats.bounding_box {
            DimensionRelation::Equal
        } else if out_stats.bounding_box.0 > in_stats.bounding_box.0 || out_stats.bounding_box.1 > in_stats.bounding_box.1 {
            DimensionRelation::Larger
        } else {
            DimensionRelation::Smaller
        }
    }

    fn classify_object_delta(in_stats: &ObjectStatistics, out_stats: &ObjectStatistics) -> ObjectDelta {
        if in_stats.count == out_stats.count {
            ObjectDelta::SameCount
        } else if out_stats.count > in_stats.count {
            ObjectDelta::Added(out_stats.count - in_stats.count)
        } else {
            ObjectDelta::Removed(in_stats.count - out_stats.count)
        }
    }

    fn extract_color_transitions(_input: &EntityManifold, _output: &EntityManifold) -> Vec<(u8, u8)> {
        vec![]
    }

    fn analyze_symmetry(_input: &EntityManifold, _output: &EntityManifold) -> SymmetryChange {
        SymmetryChange::Preserved
    }

    fn track_object_changes(_input: &EntityManifold, _output: &EntityManifold) -> Vec<ObjectChange> {
        vec![]
    }

    // --- MACRO-PERCEPTION ADDITIONS --- //

    /// Calculates the Bounding Box [min_x, min_y, max_x, max_y] of a specific continuous empty chamber (0-filled space bounded by lines/frames).
    pub fn get_chamber_bboxes(manifold: &EntityManifold) -> Vec<[f32; 4]> {
        let width = manifold.global_width as usize;
        let height = manifold.global_height as usize;
        if width == 0 || height == 0 { return vec![]; }

        let mut grid = vec![vec![0; width]; height];
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
        let mut chambers = Vec::new();

        for y in 0..height {
            for x in 0..width {
                if grid[y][x] == 0 && !visited[y][x] {
                    // Start flood fill for a new empty chamber
                    let mut min_x = x;
                    let mut max_x = x;
                    let mut min_y = y;
                    let mut max_y = y;
                    let mut queue = std::collections::VecDeque::new();

                    queue.push_back((x, y));
                    visited[y][x] = true;

                    while let Some((cx, cy)) = queue.pop_front() {
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

                                if grid[uny][unx] == 0 && !visited[uny][unx] {
                                    visited[uny][unx] = true;
                                    queue.push_back((unx, uny));
                                }
                            }
                        }
                    }

                    // Only consider it a valid chamber if it doesn't span the entire grid
                    if max_x - min_x + 1 < width || max_y - min_y + 1 < height {
                        chambers.push([min_x as f32, min_y as f32, max_x as f32, max_y as f32]);
                    }
                }
            }
        }

        chambers
    }


    /// Calculates the Bounding Box [min_x, min_y, max_x, max_y] of a specific color.
    pub fn get_color_bbox(manifold: &EntityManifold, color: i32) -> Option<[f32; 4]> {
        let mut min_x = f32::MAX;
        let mut min_y = f32::MAX;
        let mut max_x = f32::MIN;
        let mut max_y = f32::MIN;
        let mut found = false;

        for i in 0..manifold.active_count {
            if manifold.masses[i] > 0.0 && manifold.tokens[i] == color {
                let x = manifold.centers_x[i];
                let y = manifold.centers_y[i];
                if x < min_x { min_x = x; }
                if x > max_x { max_x = x; }
                if y < min_y { min_y = y; }
                if y > max_y { max_y = y; }
                found = true;
            }
        }

        if found {
            Some([min_x, min_y, max_x, max_y])
        } else {
            None
        }
    }

    /// Identifies possible crop targets (e.g. colors that form a distinct bounding box/frame).
    pub fn identify_crop_targets(manifold: &EntityManifold) -> Vec<i32> {
        let mut targets = Vec::new();
        let mut colors: HashSet<i32> = HashSet::new();

        for i in 0..manifold.active_count {
            if manifold.masses[i] > 0.0 && manifold.tokens[i] != 0 {
                colors.insert(manifold.tokens[i]);
            }
        }

        for color in colors {
            if let Some(_bbox) = Self::get_color_bbox(manifold, color) {
                // If it forms a solid box or a frame, we add it as a possible target.
                // Simple heuristic: every color is a potential crop target.
                targets.push(color);
            }
        }

        targets
    }
}
