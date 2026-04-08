import re

file_path = "rrm_rust/src/reasoning/hierarchical_planner.rs"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("    pub checkpoints: std::collections::HashMap<SubgoalType, PhaseContext>, // Fase Rollback State", "    // pub checkpoints: std::collections::HashMap<SubgoalType, PhaseContext>, // Deferred until core types get proper clone/debug derives")
content = content.replace("PhaseGate(PhaseGate),", "// PhaseGate(PhaseGate), // Deferred")

content = content.replace(
"""        Self {
            task_graph: graph,
            root,
            current_frontier: vec![root],
        }""",
"""        Self {
            task_graph: graph,
            root,
            current_frontier: vec![root],
        }"""
)

with open(file_path, "w") as f:
    f.write(content)
