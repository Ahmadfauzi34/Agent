import re

with open('rrm_rust/src/perception/structural_analyzer.rs', 'r') as f:
    content = f.read()

target = "    // --- MACRO-PERCEPTION ADDITIONS --- //"
replacement = """    // --- MACRO-PERCEPTION ADDITIONS --- //

    /// Calculates the Bounding Box [min_x, min_y, max_x, max_y] of a specific continuous empty chamber (0-filled space bounded by lines/frames).
    pub fn get_chamber_bboxes(manifold: &EntityManifold) -> Vec<[f32; 4]> {
        let width = manifold.global_width as usize;
        let height = manifold.global_height as usize;
        if width == 0 || height == 0 { return vec![]; }

        let mut grid = vec![vec![0; width]; height];
        for i in 0..manifold.active_count {
            if manifold.masses[i] > 0.0 && manifold.tokens[i] != 0 {
                let x = manifold.centers_x[i] as usize;
                let y = manifold.centers_y[i] as usize;
                if x < width && y < height {
                    grid[y][x] = manifold.tokens[i];
                }
            }
        }

        let mut visited = vec![vec![false; width]; height];
        let mut chambers = Vec::new();

        for y in 0..height {
            for x in 0..width {
                if grid[y][x] == 0 && !visited[y][x] {
                    // Start flood fill for a new empty chamber
                    let mut min_x = x;
                    let mut max_x = x;
                    let mut min_y = y;
                    let mut max_y = y;
                    let mut queue = std::collections::VecDeque::new();

                    queue.push_back((x, y));
                    visited[y][x] = true;

                    while let Some((cx, cy)) = queue.pop_front() {
                        if cx < min_x { min_x = cx; }
                        if cx > max_x { max_x = cx; }
                        if cy < min_y { min_y = cy; }
                        if cy > max_y { max_y = cy; }

                        let neighbors = [(0, 1), (1, 0), (0, -1_i32), (-1_i32, 0)];
                        for (dx, dy) in neighbors.iter() {
                            let nx = cx as i32 + dx;
                            let ny = cy as i32 + dy;

                            if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                                let unx = nx as usize;
                                let uny = ny as usize;

                                if grid[uny][unx] == 0 && !visited[uny][unx] {
                                    visited[uny][unx] = true;
                                    queue.push_back((unx, uny));
                                }
                            }
                        }
                    }

                    // Only consider it a valid chamber if it doesn't span the entire grid
                    if max_x - min_x + 1 < width || max_y - min_y + 1 < height {
                        chambers.push([min_x as f32, min_y as f32, max_x as f32, max_y as f32]);
                    }
                }
            }
        }

        chambers
    }
"""

if "pub fn get_chamber_bboxes" not in content:
    content = content.replace(target, replacement)

with open('rrm_rust/src/perception/structural_analyzer.rs', 'w') as f:
    f.write(content)
