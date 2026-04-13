cat << 'PY' > run_end.py
import re
with open("src/perception/anomalous_extractor.rs", "r") as f:
    code = f.read()

# Remove all println!
code = re.sub(r'println!\(.*?;\n', '', code)

with open("src/perception/anomalous_extractor.rs", "w") as f:
    f.write(code)

with open("src/main.rs", "r") as f:
    main_code = f.read()

main_code = re.sub(r'println!\("Len mismatch:.*?\);\n', '', main_code)
main_code = re.sub(r'println!\("Row mismatch.*?\);\n', '', main_code)

with open("src/main.rs", "w") as f:
    f.write(main_code)

PY
python3 run_end.py
cargo fmt && cargo build --release
cargo run --release --bin rrm_rust -p rrm_rust > debug_end.txt 2>&1
grep "Score" debug_end.txt
