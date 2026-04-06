import re

with open('rrm_rust/src/reasoning/counterfactual_engine.rs', 'r') as f:
    content = f.read()

# fix E0608
content = content.replace("dst[i] = tensor[dim_idx];", "dst[i] = *tensor;")
# the logic was wrong anyway, tensor is Array1, so we need to index it.
content = content.replace("dst[i] = *tensor;", "dst[i] = tensor[dim_idx];")
# wait, tensor is &f32 ? Ah, `spatial_tensors.get(entity_idx)` is Option<&Array1>, so `tensor[dim_idx]` should work if it's Array1.
# wait, EntityManifold spatial_tensors is Vec<Array1<f32>>? Let's check EntityManifold definition.
