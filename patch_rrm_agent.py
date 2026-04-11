import re

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'r') as f:
    content = f.read()

content = content.replace('''                            Arc::new(
                                initial_manifolds
                                    .iter()
                                    .map(|m| RwLock::new(m.read().unwrap().clone()))
                                    .collect(),
                            ),
                        );''', '''                            Arc::new(
                                initial_manifolds
                                    .iter()
                                    .map(|m| RwLock::new(m.read().unwrap().clone()))
                                    .collect(),
                            ),
                            None,
                        );''')

with open('rrm_rust/src/reasoning/rrm_agent.rs', 'w') as f:
    f.write(content)
