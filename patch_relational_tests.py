import re

with open('rrm_rust/src/perception/relational_engine_test.rs', 'r') as f:
    content = f.read()

target = "} // End of mod tests"
replacement = """    #[test]
    fn test_macro_relations_phase3() {
        let mut grid = vec![vec![0; 10]; 10];

        // Largest Object (Color 3, 3x3)
        for y in 1..=3 {
            for x in 1..=3 {
                grid[y][x] = 3;
            }
        }

        // Smallest Object / Rarest Color (Color 8, 1x1)
        grid[8][8] = 8;

        // Aligned Objects (Color 4, two objects on same row y=6)
        grid[6][1] = 4;
        grid[6][5] = 4;

        let man = build_manifold(&grid);
        let mut rel = RelationalStateSoA::new(10, 10);
        rel.build_from_manifold(&man);

        assert_eq!(rel.active_objects, 4);

        // Verify Largest Object
        assert!(rel.largest_obj_idx.is_some());
        let largest_idx = rel.largest_obj_idx.unwrap();
        assert_eq!(rel.obj_tokens[largest_idx], 3); // The 3x3 block is largest

        // Verify Rarest Color
        assert!(rel.rarest_color.is_some());
        assert_eq!(rel.rarest_color.unwrap(), 8); // The single pixel is rarest

        // Verify Most Frequent
        assert!(rel.most_frequent_color.is_some());
        assert_eq!(rel.most_frequent_color.unwrap(), 3);

        // Verify Horizontal Alignment
        let mut aligned_found = false;
        for i in 0..rel.active_edges {
            if rel.edge_relation_type[i] == RelationType::AlignedHorizontally as u8 {
                let src = rel.edge_source_idx[i] as usize;
                let tgt = rel.edge_target_idx[i] as usize;
                // Both should be color 4
                if rel.obj_tokens[src] == 4 && rel.obj_tokens[tgt] == 4 {
                    aligned_found = true;
                }
            }
        }
        assert!(aligned_found);
    }
"""

content = content.replace("}\n}", replacement + "}\n}")

with open('rrm_rust/src/perception/relational_engine_test.rs', 'w') as f:
    f.write(content)
