import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "&expected_grids[0].clone().into_manifold()"
replacement = "expected_grids.first().map(|g| {\n                    let mut m = EntityManifold::new();\n                    m.global_height = g.len() as f32;\n                    m.global_width = if g.is_empty() { 0.0 } else { g[0].len() as f32 };\n                    m\n                }).as_ref().unwrap_or(&EntityManifold::new())"

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
