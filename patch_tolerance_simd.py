import re

with open('rrm_rust/src/reasoning/quantum_search_simd.rs', 'r') as f:
    content = f.read()

pattern = r'''        POSITION_BUFFER\.with\(\|pos_buf\| \{
            let mut positions = pos_buf\.borrow_mut\(\);
            positions\.clear\(\);

            let count = manifold\.active_count;
            for i in 0\.\.count \{
                if manifold\.masses\[i\] > 0\.0 \{
                    let x = manifold\.centers_x\[i\]\.round\(\) as i32;
                    let y = manifold\.centers_y\[i\]\.round\(\) as i32;
                    positions\.push\(\(x, y, manifold\.tokens\[i\]\)\);
                \}
            \}'''

repl = '''        POSITION_BUFFER.with(|pos_buf| {
            let mut positions = pos_buf.borrow_mut();
            positions.clear();

            let count = manifold.active_count;
            for i in 0..count {
                if manifold.masses[i] > 0.0 {
                    // Corong Probabilitas: Saat tolerance tinggi (1e-6), sistem lebih fuzzy dan "membolehkan" meleset sedikit koordinatnya
                    // Tapi di akhir pencarian saat (1e-15), sistem menuntut titik integer pasti (round)
                    // Untuk saat ini karena array integer, kita pakai tolerance untuk memangkas energy
                    // ketika jarak centroid ke pixel target cukup dekat meski meleset.
                    let x = manifold.centers_x[i].round() as i32;
                    let y = manifold.centers_y[i].round() as i32;
                    positions.push((x, y, manifold.tokens[i]));
                }
            }'''

content = re.sub(pattern, repl, content)

pattern2 = r'''                // Compare with expected using flat layout
                for y in 0\.\.expected_height \{
                    for x in 0\.\.expected_width \{
                        let idx = y \* expected_width \+ x;
                        let occ_val = occupancy\[idx\];
                        let exp_val = expected\[y\]\[x\];

                        if occ_val != -1 \{
                            // ada benda di universe kita
                            if occ_val != exp_val \{
                                energy \+= 1\.0; // mismatch token
                            \}
                        \} else \{
                            // tidak ada benda di universe kita
                            if exp_val != 0 \{
                                energy \+= 1\.0; // missing token
                            \}
                        \}
                    \}
                \}'''

repl2 = '''                // Compare with expected using flat layout
                for y in 0..expected_height {
                    for x in 0..expected_width {
                        let idx = y * expected_width + x;
                        let occ_val = occupancy[idx];
                        let exp_val = expected[y][x];

                        if occ_val != -1 {
                            // ada benda di universe kita
                            if occ_val != exp_val {
                                // Toleransi bekerja seperti suhu Simulated Annealing
                                // Semakin longgar toleransinya, penalty errornya makin kecil, mendorong eksplorasi awal
                                let penalty = if _tolerance > 1e-10 { 0.5 } else { 1.0 };
                                energy += penalty; // mismatch token
                            }
                        } else {
                            // tidak ada benda di universe kita
                            if exp_val != 0 {
                                let penalty = if _tolerance > 1e-10 { 0.5 } else { 1.0 };
                                energy += penalty; // missing token
                            }
                        }
                    }
                }'''

content = re.sub(pattern2, repl2, content)

with open('rrm_rust/src/reasoning/quantum_search_simd.rs', 'w') as f:
    f.write(content)
