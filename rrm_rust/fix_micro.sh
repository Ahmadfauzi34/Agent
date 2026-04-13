cat << 'PY' > run_micro.py
with open("src/perception/anomalous_extractor.rs", "r") as f:
    code = f.read()

# I want to add logic for AtomType minority in the Micro phase
# Wait, actually we can compute GestaltAtoms directly from the grid_map?
# GestaltEngine::extract_atoms needs a manifold.
# We already have `state` (which has atoms).
# Let's find anomalous AtomType (Shape minority)
PY
python3 run_micro.py
