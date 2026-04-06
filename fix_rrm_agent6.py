import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "let plan = planner.plan_with_validation("
replacement = "let mut plan = planner.plan_with_validation("

if target in content and "let mut plan = planner.plan_with_validation(" not in content:
    content = content.replace(target, replacement)

target2 = "let plan = Some(vec![promising.into_iter().find(|(_, r)| matches!(r.outcome, crate::reasoning::counterfactual_engine::OutcomeStatus::Success)).unwrap().0]);"
replacement2 = "plan = Some(vec![promising.into_iter().find(|(_, r)| matches!(r.outcome, crate::reasoning::counterfactual_engine::OutcomeStatus::Success)).unwrap().0]);"

if target2 in content:
    content = content.replace(target2, replacement2)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
