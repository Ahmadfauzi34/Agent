import re

file_path = "rrm_rust/src/perception/structural_analyzer.rs"

with open(file_path, "r") as f:
    content = f.read()

# Let's fix get_chamber_bboxes so it ALSO finds blocks of NON-ZEROS separated by 0s.
chamber_logic = """
        let mut chambers = Vec::new();

        // 1. Find blocks of 0s (Empty Chambers)
        for y in 0..height {
            for x in 0..width {
                if grid[y][x] == 0 && !visited[y][x] {
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
                    if max_x - min_x + 1 < width || max_y - min_y + 1 < height {
                        chambers.push([min_x as f32, min_y as f32, max_x as f32, max_y as f32]);
                    }
                }
            }
        }

        // 2. Find blocks of NON-ZEROS (Quadrants / Islands)
        let mut visited_non_zero = vec![vec![false; width]; height];
        for y in 0..height {
            for x in 0..width {
                if grid[y][x] != 0 && !visited_non_zero[y][x] {
                    let mut min_x = x;
                    let mut max_x = x;
                    let mut min_y = y;
                    let mut max_y = y;
                    let mut queue = std::collections::VecDeque::new();
                    queue.push_back((x, y));
                    visited_non_zero[y][x] = true;

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
                                if grid[uny][unx] != 0 && !visited_non_zero[uny][unx] {
                                    visited_non_zero[uny][unx] = true;
                                    queue.push_back((unx, uny));
                                }
                            }
                        }
                    }
                    if max_x - min_x + 1 < width || max_y - min_y + 1 < height {
                        chambers.push([min_x as f32, min_y as f32, max_x as f32, max_y as f32]);
                    }
                }
            }
        }
"""

content = re.sub(
    r"let mut chambers = Vec::new();.*?if max_x - min_x \+ 1 < width \|\| max_y - min_y \+ 1 < height \{\n.*?chambers\.push\(\[min_x as f32, min_y as f32, max_x as f32, max_y as f32\]\);\n.*?\}\n.*?\}\n.*?\}\n.*?\}",
    chamber_logic,
    content,
    flags=re.DOTALL
)

with open(file_path, "w") as f:
    f.write(content)
print("StructuralAnalyzer Patched for Islands!")
