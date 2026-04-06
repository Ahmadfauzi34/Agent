import re

with open('rrm_rust/src/reasoning/crop_intelligence_test.rs', 'r') as f:
    content = f.read()

target = """        assert_eq!(crop_5.delta_x, 1.0);
        assert_eq!(crop_5.delta_y, 10.0);
    }
}"""

replacement = """        assert_eq!(crop_5.delta_x, 1.0);
        assert_eq!(crop_5.delta_y, 10.0);

        // NOW check for CROP_TO_CHAMBER
        let chambers = StructuralAnalyzer::get_chamber_bboxes(&input_man);
        assert!(!chambers.is_empty());

        let crop_chamber = axioms.iter().find(|a| a.name.starts_with("CROP_TO_CHAMBER_")).unwrap();
        // Since there's a divider at x=5, the left chamber is 0..4 (width 5), right chamber is 6..9 (width 4)
        assert_eq!(crop_chamber.delta_x, 5.0); // 4 - 0 + 1 = 5
        assert_eq!(crop_chamber.delta_y, 10.0);
    }
}"""

if "NOW check for CROP_TO_CHAMBER" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/crop_intelligence_test.rs', 'w') as f:
    f.write(content)
