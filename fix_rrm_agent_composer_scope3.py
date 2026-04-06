import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = """        let mut phase_count = 0;
        let max_phases = 20;"""
replacement = """
        let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;
        let mut phase_count = 0;
        let max_phases = 20;"""

if "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;\n        let mut phase_count = 0;\n        let max_phases = 20;" not in content:
    content = content.replace(target, replacement)
else:
    # Just insert it at the top of the function
    target2 = "pub fn solve_task_v2("
    replacement2 = "pub fn solve_task_v2(\n        &mut self,\n        train_pairs: &[(EntityManifold, EntityManifold)],\n        test_input: &EntityManifold,\n    ) -> Vec<Vec<i32>> {\n        let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;"
    if "let mut plan: Option<Vec<crate::reasoning::structures::Axiom>> = None;" not in content.split("pub fn solve_task_v2")[1][:500]:
        content = content.replace("pub fn solve_task_v2(\n        &mut self,\n        train_pairs: &[(EntityManifold, EntityManifold)],\n        test_input: &EntityManifold,\n    ) -> Vec<Vec<i32>> {", replacement2)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
