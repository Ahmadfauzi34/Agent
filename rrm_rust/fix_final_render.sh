cat << 'PY' > run_render.py
with open("src/main.rs", "r") as f:
    code = f.read()

import re
# The render loop was REMOVED by some previous replace! Let's put it back!
render_block = """
            final_result = vec![vec![0; res_em.global_width as usize]; res_em.global_height as usize];
            for i in 0..res_em.active_count {
                if res_em.masses[i] > 0.0 {
                    let cx = res_em.centers_x[i].round() as i32;
                    let cy = res_em.centers_y[i].round() as i32;
                    if cx >= 0 && cx < res_em.global_width as i32 && cy >= 0 && cy < res_em.global_height as i32 {
                        final_result[cy as usize][cx as usize] = res_em.tokens[i];
                    }
                }
            }
            success = true;
"""

code = re.sub(r'final_result =\s*vec!\[vec!\[0; res_em\.global_width as usize\]; res_em\.global_height as usize\];\s*success = true;', render_block, code)

with open("src/main.rs", "w") as f:
    f.write(code)

PY
python3 run_render.py
cargo run --release --bin rrm_rust -p rrm_rust > micro_test8.txt 2>&1
grep "SUCCESS" micro_test8.txt
