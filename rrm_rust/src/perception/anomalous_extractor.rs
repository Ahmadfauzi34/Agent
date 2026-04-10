pub fn extract_anomalous_quadrant(grid: &[Vec<i32>]) -> Vec<Vec<i32>> {
    let rows = grid.len();
    if rows == 0 { return vec![]; }
    let cols = grid[0].len();

    let mut h_line_idx = 0;
    let mut v_line_idx = 0;

    // Find cross
    for r in 0..rows {
        let first = grid[r][0];
        let is_solid = grid[r].iter().all(|&val| val == first);
        if is_solid {
            h_line_idx = r;
            break;
        }
    }

    for c in 0..cols {
        let first = grid[0][c];
        let is_solid = (0..rows).all(|r| grid[r][c] == first);
        if is_solid {
            v_line_idx = c;
            break;
        }
    }

    let cross_color = grid[h_line_idx][0];

    // Find background color (most frequent non-cross color)
    let mut freq = [0; 10];
    for r in 0..rows {
        for c in 0..cols {
            let color = grid[r][c];
            if color != cross_color {
                freq[color as usize] += 1;
            }
        }
    }

    let mut bg_color = 0;
    let mut max_freq = 0;
    for (i, &count) in freq.iter().enumerate() {
        if count > max_freq {
            max_freq = count;
            bg_color = i as i32;
        }
    }

    let quadrants = [
        (0, h_line_idx, 0, v_line_idx), // TL
        (0, h_line_idx, v_line_idx+1, cols), // TR
        (h_line_idx+1, rows, 0, v_line_idx), // BL
        (h_line_idx+1, rows, v_line_idx+1, cols) // BR
    ];

    let mut target_q = quadrants[0];
    for &(r_s, r_e, c_s, c_e) in &quadrants {
        let mut anomaly_found = false;
        for r in r_s..r_e {
            for c in c_s..c_e {
                if grid[r][c] != bg_color && grid[r][c] != cross_color {
                    anomaly_found = true;
                    break;
                }
            }
            if anomaly_found { break; }
        }
        if anomaly_found {
            target_q = (r_s, r_e, c_s, c_e);
            break;
        }
    }

    let (r_s, r_e, c_s, c_e) = target_q;
    let mut out_grid = Vec::with_capacity(r_e - r_s);
    for r in r_s..r_e {
        let mut row = Vec::with_capacity(c_e - c_s);
        for c in c_s..c_e {
            row.push(grid[r][c]);
        }
        out_grid.push(row);
    }

    out_grid
}
