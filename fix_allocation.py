import re

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'r') as f:
    content = f.read()

target = """        Self {
            max_waves: 100_000,
            max_entities: 1000,
            global_dimension: GLOBAL_DIMENSION,
            max_frontier: 1000,"""
replacement = """        Self {
            max_waves: 1000, // Reduced from 100,000 to 1,000
            max_entities: 100, // Reduced from 1000 to 100
            global_dimension: 512, // Temporarily reduced dimension for memory safety locally
            max_frontier: 100,"""

content = content.replace(target, replacement)

with open('rrm_rust/src/reasoning/hierarchical_inference.rs', 'w') as f:
    f.write(content)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    agent_content = f.read()

agent_target = """        let ceo_config = CeoConfig {
            max_waves: 100_000,
            max_entities: 1000,
            global_dimension: 8192,"""
agent_replacement = """        let ceo_config = CeoConfig {
            max_waves: 1000, // Reduced from 100,000
            max_entities: 100, // Reduced from 1000
            global_dimension: 512, // Lower dimension to fit memory limits during execution test"""

agent_content = agent_content.replace(agent_target, agent_replacement)

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(agent_content)
