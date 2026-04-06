import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

target = "        let candidates_caps = self.ontology.introspect(&delta.signature);"
replacement = "        let candidates_caps = self.ontology.introspect(&delta.signature);\n        let candidates: Vec<crate::reasoning::structures::Axiom> = candidates_caps.into_iter().map(|cap| crate::reasoning::structures::Axiom::from_capability(cap)).collect();"

if "let candidates: Vec<crate::reasoning::structures::Axiom>" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
