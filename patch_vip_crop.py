import re

file_path = "rrm_rust/src/reasoning/rrm_agent.rs"

with open(file_path, "r") as f:
    content = f.read()

# Make sure we collect the CROP axioms and give them VIP priority
inject_vip = """
        // Inject Top-Down Macros as VIPs (e.g., CROP_TO_CHAMBER, FILL_HOLLOW)
        let mut macro_axioms = self.top_down_axiomator.generate_macro_axioms(input);

        // Ensure VIP macros are not discarded
        for m_axiom in macro_axioms {
            let mut candidate = GroverCandidate::new(m_axiom.clone());
            candidate.probability = 0.99; // VIP Bias
            all_candidates.push(candidate);
        }
"""

content = content.replace("let all_candidates = self.ceo_dispatcher.auto_prune();", inject_vip + "\n        let mut all_candidates = self.ceo_dispatcher.auto_prune();")

with open(file_path, "w") as f:
    f.write(content)
print("VIP Crop Patched!")
