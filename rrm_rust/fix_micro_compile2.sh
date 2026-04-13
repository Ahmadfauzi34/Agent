cat << 'PY' > run_micro_compile2.py
import re
with open("src/perception/anomalous_extractor.rs", "r") as f:
    code = f.read()

code = code.replace('AtomType::SinglePixel => "SinglePixel",', 'AtomType::SinglePixel => "SinglePixel",\nAtomType::DiagonalLine => "DiagonalLine",')
with open("src/perception/anomalous_extractor.rs", "w") as f:
    f.write(code)
PY
python3 run_micro_compile2.py
cargo run --release --bin rrm_rust -p rrm_rust > micro_test.txt 2>&1
grep "Score:" micro_test.txt
