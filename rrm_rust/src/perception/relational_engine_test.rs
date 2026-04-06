#[cfg(test)]
mod tests {
    use crate::core::entity_manifold::EntityManifold;
    use crate::perception::relational_engine::{RelationalStateSoA, RelationType};

    fn build_manifold(grid: &[Vec<i32>]) -> EntityManifold {
        let mut m = EntityManifold::new();
        m.global_height = grid.len() as f32;
        m.global_width = if grid.is_empty() { 0.0 } else { grid[0].len() as f32 };

        let mut idx = 0;
        for (y, row) in grid.iter().enumerate() {
            for (x, &val) in row.iter().enumerate() {
                if val != 0 && idx < 100 {
                    m.masses[idx] = 1.0;
                    m.centers_x[idx] = x as f32;
                    m.centers_y[idx] = y as f32;
                    m.tokens[idx] = val;
                    idx += 1;
                }
            }
        }
        m.active_count = idx;
        m
    }

    #[test]
    fn test_meso_extract_hollow_objects() {
        // Hollow 3x3 square (color 2)
        let mut grid = vec![vec![0; 5]; 5];
        for i in 1..=3 {
            grid[1][i] = 2;
            grid[3][i] = 2;
            grid[i][1] = 2;
            grid[i][3] = 2;
        }

        let man = build_manifold(&grid);
        let mut rel = RelationalStateSoA::new(10, 10);
        rel.build_from_manifold(&man);

        assert_eq!(rel.active_objects, 1);
        // Box is hollow => genus > 0 => euler char <= 0
        assert_eq!(rel.obj_euler_chars[0], 0);

        // Rectilinearity is Area / BoundingArea = 8 / 9 = ~0.888
        assert!((rel.obj_rectilinearity[0] - (8.0 / 9.0)).abs() < 0.01);
    }

    #[test]
    fn test_micro_relations() {
        let mut grid = vec![vec![0; 5]; 5];

        // Object A (color 3) at top left
        grid[1][1] = 3;

        // Object B (color 4) below A, touching
        grid[2][1] = 4;

        // Object C (color 5) far right (ray cast target from A)
        grid[1][4] = 5;

        let man = build_manifold(&grid);
        let mut rel = RelationalStateSoA::new(10, 10);
        rel.build_from_manifold(&man);

        assert_eq!(rel.active_objects, 3);

        let mut touching_found = false;
        let mut rayhit_found = false;

        for i in 0..rel.active_edges {
            let rel_type = rel.edge_relation_type[i];
            if rel_type == RelationType::Touching as u8 { touching_found = true; }
            if rel_type == RelationType::RayHit as u8 { rayhit_found = true; }
        }

        assert!(touching_found);
        assert!(rayhit_found);
    }
}
