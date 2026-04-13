cat << 'PY' > run_nano.py
with open("src/perception/anomalous_extractor.rs", "r") as f:
    code = f.read()

# Already using structural boundaries or flood fill
# To fully use RelationalHierarchy, it would require passing a manifold to analyze_relations and finding GridPattern.
# However, the current flood-fill proxy is heavily reliable for Grid tasks where bounds are defined by colors (like 0).
# Implementing full RelationalHierarchy grid-detector just for anomalous extractor in 2dc579da is overkill
# since our flood-fill directly handles exact boundary pixel maps.
# Let's keep it as is, and verify that the current Nano phase logic properly filters valid components.
PY
python3 run_nano.py
