import re

file_path = "rrm_rust/src/reasoning/rrm_agent.rs"
with open(file_path, "r") as f:
    content = f.read()

# Define the clean VIP logic (without peaking)
vip_clean_logic = """
                // 🌟 VIP PASS: MACRO AXIOMS 🌟
                // Murni menaikkan probabilitas aksioma struktur makro tanpa mengintip target WxH.
                for c in all_clone.iter_mut() {
                    let probability_boost = match c.physics_tier {
                        DIM_PHYSICS_TIER => 5.0,
                        GRID_OPS_TIER => 3.0,
                        GEOMETRY_TIER_MIN..=GEOMETRY_TIER_MAX => 2.0,
                        _ => 0.0,
                    };

                    c.probability += probability_boost;

                    if c.axiom_type.starts_with("CROP_TO_") || c.axiom_type.starts_with("CROP_WINDOW_") {
                        c.probability += 10.0; // Absolute VIP
                    }
                }
"""

content = re.sub(
    r"// 🌟 VIP PASS: ORACLE INJECTION \(OPSI A: Tactical Fallback\) 🌟\n.*?// Stable deterministic sort",
    vip_clean_logic + "\n                // Stable deterministic sort",
    content,
    flags=re.DOTALL
)

with open(file_path, "w") as f:
    f.write(content)
print("Removed Hack from MCTS VIP Pass!")
