/**
 * Move to Adjacency Solver
 * 
 * Wait, let's look at 0e206a2e.json.
 * Train 1:
 * Input:
 * ...8..............
 * ..381..........4..
 * ..848.............
 * .............3...1
 * 
 * .......3..........
 * .......8.8........
 * .......884........
 * ..1....8.8........
 * ...4...1..........
 * ..3...............
 * 
 * Output:
 * ..............848.
 * ...............8..
 * .............38881
 * 
 * ..18..............
 * .884..............
 * ..38..............
 * 
 * Wait, the input has some scattered colored pixels (1, 3, 4) and some structures made of 8s with colored pixels attached.
 * Actually, let's look closely at Train 1 Input:
 * Top-left:
 * ...8
 * ..381
 * ..848
 * This is a cross-like shape of 8s with 3, 1, 4 attached.
 * 
 * Bottom-left:
 * ..1
 * ...4
 * ..3
 * These are just scattered 1, 4, 3.
 * 
 * Middle:
 * .......3
 * .......8.8
 * .......884
 * ..1....8.8
 * ...4...1
 * 
 * Wait, the middle structure is:
 * 3
 * 8.8
 * 884
 * 8.8
 * 1
 * 
 * In the output, the structures have moved!
 * Top-left structure moved to bottom-left, attaching to the scattered 1, 4, 3?
 * Let's check bottom-left output:
 * ..18
 * .884
 * ..38
 * Wait, this is a 3x3 structure:
 * 18.
 * 884
 * 38.
 * 
 * Top-right output:
 * 848
 * .8.
 * 38881
 * 
 * Let's re-examine the input and output.
 * It looks like there are "templates" made of 8s.
 * And there are colored dots (1, 3, 4).
 * The templates move to align with the colored dots!
 * 
 * Let's check Train 1:
 * Input has 3 templates of 8s?
 * Template 1 (top-left):
 * .8.
 * 381
 * 848
 * Wait, the 3, 1, 4 are part of the template in the input?
 * Yes, they are adjacent to the 8s.
 * 
 * Template 2 (middle):
 * 3
 * 8.8
 * 884
 * 8.8
 * 1
 * 
 * Wait, the scattered dots in input are:
 * Top-right: 4, 3, 1.
 * Bottom-left: 1, 4, 3.
 * 
 * Output has 2 structures!
 * Top-right structure:
 * 848
 * .8.
 * 38881
 * 
 * Bottom-left structure:
 * ..18
 * .884
 * ..38
 * 
 * Wait, where did the templates come from?
 * In the input, there are 2 structures made of 8s.
 * Structure 1:
 * .8.
 * .8.
 * 848
 * (Wait, the input has 3, 1, 4 around it. Let's look at the 8s only)
 * Input 8s top-left:
 * .8.
 * .8.
 * 8.8
 * Wait, let's read the exact coordinates from Train 1 Input:
 * r=1: ...8
 * r=2: ..381
 * r=3: ..848
 * So 8s are at: (1,3), (2,3), (3,2), (3,4).
 * Wait, (3,3) is 4.
 * So the 8s form a cross with the center being 4? No, center is (2,3) which is 8.
 * Let's map it:
 * . 8 .
 * 3 8 1
 * 8 4 8
 * 
 * Input 8s middle:
 * r=7: .......8.8
 * r=8: .......88.  Wait, input says `884`, so (8,7)=8, (8,8)=8, (8,9)=4.
 * r=9: .......8.8
 * Let's map it:
 * 3 . .
 * 8 . 8
 * 8 8 4
 * 8 . 8
 * 1 . .
 * 
 * So we have two "mobile" structures made of 8s and colored dots.
 * Wait, the output has the SAME structures, but moved and rotated/flipped?
 * Let's check output top-right:
 * r=2: ..............848.
 * r=3: ...............8..
 * r=4: .............38881
 * 8s are at: (2,14), (2,16), (3,15), (4,14), (4,15), (4,16).
 * Wait, this is:
 * 8 4 8
 * . 8 .
 * 3 8 8 8 1
 * This doesn't match the input structures exactly!
 * 
 * Let's rethink.
 * What if the 8s are the "background" or "mobile" parts, and they assemble around the scattered colored dots?
 * In Train 1, scattered dots:
 * Top-right:
 * r=2: 4
 * r=4: 3, 1
 * Relative positions:
 * 4 is at (2,15)
 * 3 is at (4,13)
 * 1 is at (4,17)
 * Let's check output top-right:
 * 8 4 8  -> 4 is at (2,15)
 * . 8 .  -> 8 is at (3,15)
 * 3 8 8 8 1 -> 3 is at (4,13), 1 is at (4,17).
 * The 8s perfectly fill the space between 3, 4, 1!
 * 
 * Bottom-left scattered dots:
 * r=9: 1 at (9,2)
 * r=10: 4 at (10,3)
 * r=11: 3 at (11,2)
 * Let's check output bottom-left:
 * r=9: 1 8 -> 1 is at (9,2), 8 is at (9,3)
 * r=10: 8 8 4 -> 4 is at (10,3), 8s at (10,1), (10,2)
 * r=11: 3 8 -> 3 is at (11,2), 8 is at (11,3)
 * 
 * So the 8s from the input structures are moved to connect the scattered dots!
 * Wait, are the input structures EXACTLY the same shape as the output structures?
 * Input structure 1 (top-left):
 * . 8 .
 * 3 8 1
 * 8 4 8
 * This perfectly matches the relative positions of 3, 1, 4 in the bottom-left!
 * Wait, bottom-left dots:
 * 1 at (9,2)
 * 4 at (10,3)
 * 3 at (11,2)
 * If we place the top-left structure here:
 * . 8 .
 * 3 8 1
 * 8 4 8
 * But the dots in bottom-left are:
 * 1
 * . 4
 * 3
 * This does NOT match the shape of the top-left structure!
 * Top-left structure has 3 and 1 on the same row, and 4 below them.
 * Bottom-left dots have 1 and 3 on the same column, and 4 to the right.
 * 
 * Wait!
 * The input structures ARE the output structures, but they translate to the target locations!
 * Let's check the input structures again.
 * Top-left input structure:
 * . 8 .
 * 3 8 1
 * 8 4 8
 * 
 * Middle input structure:
 * 3 . .
 * 8 . 8
 * 8 8 4
 * 8 . 8
 * 1 . .
 * 
 * Top-right output structure:
 * 8 4 8
 * . 8 .
 * 3 8 8 8 1
 * 
 * Bottom-left output structure:
 * . . 1 8
 * . 8 8 4
 * . . 3 8
 * 
 * None of the input structures match the output structures in shape!
 * Wait, let's count the 8s.
 * Top-left input: 5 8s.
 * Middle input: 7 8s.
 * Top-right output: 6 8s.
 * Bottom-left output: 5 8s.
 * 
 * This means the 8s are NOT rigid structures!
 * They are generated based on the target dots!
 * 
 * Let's look at the target dots and the generated 8s.
 * Top-right dots:
 * 4 at (2,15)
 * 3 at (4,13)
 * 1 at (4,17)
 * Output 8s:
 * (2,14), (2,16)
 * (3,15)
 * (4,14), (4,15), (4,16)
 * Notice that the 8s form paths connecting the dots!
 * 4 is connected to 3 and 1.
 * 
 * Bottom-left dots:
 * 1 at (9,2)
 * 4 at (10,3)
 * 3 at (11,2)
 * Output 8s:
 * (9,3)
 * (10,1), (10,2)
 * (11,3)
 * 
 * Wait, let's look at the input again.
 * Are the input structures just "examples" of how to connect the dots?
 * Or are they the SAME dots, but the 8s have moved?
 * In the input, the top-left structure has 3, 1, 4.
 * The middle structure has 3, 1, 4.
 * The scattered dots are ALSO 3, 1, 4!
 * 
 * Wait, the input has TWO structures with 8s, and TWO sets of scattered dots.
 * The output has TWO structures with 8s, and NO scattered dots.
 * The output structures are at the locations of the scattered dots!
 * 
 * What happened to the input structures? They disappeared!
 * So the task is: Move the 8s from the input structures to the scattered dots, to form new structures.
 * But how are the new structures formed?
 * Is it a rigid translation?
 * Let's re-read the input structures and scattered dots.
 * Maybe the input structures are NOT 8s, but the scattered dots are the "targets"?
 * Wait, in Train 1, the input has:
 * Structure A (top-left): 3, 1, 4 connected by 8s.
 * Structure B (middle): 3, 1, 4 connected by 8s.
 * Scattered A (bottom-left): 3, 1, 4.
 * Scattered B (top-right): 3, 1, 4.
 * 
 * Wait, look at the relative positions of 3, 1, 4 in Structure A:
 * 3 is at (2,2)
 * 1 is at (2,4)
 * 4 is at (3,3)
 * This is a triangle.
 * 
 * Relative positions of 3, 1, 4 in Scattered B (top-right):
 * 4 is at (2,15)
 * 3 is at (4,13)
 * 1 is at (4,17)
 * This is ALSO a triangle, but larger!
 * dx(3,1) = 4, dy(3,1) = 0.
 * dx(3,4) = 2, dy(3,4) = -2.
 * In Structure A:
 * dx(3,1) = 2, dy(3,1) = 0.
 * dx(3,4) = 1, dy(3,4) = 1.
 * They are not the same shape.
 * 
 * Wait, what if the 8s are just drawn to connect the dots?
 * How are they drawn?
 * Look at Structure A:
 * . 8 .
 * 3 8 1
 * 8 4 8
 * It's a bounding box around 3, 1, 4?
 * No, it's a cross.
 * 
 * Let's look at Train 2:
 * Input colors: 1, 2, 3, 4. (No 8s!)
 * Input structures:
 * Middle-left:
 * 2
 * 4 3 3
 * 3
 * 3
 * 3
 * 3 1 3
 * 
 * Scattered dots:
 * Bottom-right:
 * 4 at (10,13)
 * 1 at (11,9)
 * 2 at (11,14)
 * 
 * Output:
 * Bottom-right structure:
 * 3 . . . 4
 * 1 3 3 3 3 2
 * 3 . . . 3
 * 
 * Wait, in Train 2, the "connecting" color is 3!
 * The dots are 1, 2, 4.
 * Input structure: 1, 2, 4 connected by 3s.
 * Output structure: 1, 2, 4 connected by 3s.
 * 
 * Let's look at Train 3:
 * Input colors: 1, 2, 4, 8.
 * Input structures:
 * Middle:
 * 4
 * 8 . . . 8
 * 1 8 8 8 2 8
 * . . . . 8
 * 
 * Scattered dots:
 * Bottom-left: 1, 2, 4.
 * 1 at (11,1)
 * 2 at (11,5)
 * 4 at (13,5)
 * 
 * Output:
 * Bottom-left structure:
 * . . . . . 8
 * . 1 8 8 8 2 8
 * . 8 . . . 8
 * . . . . . 4
 * 
 * Wait, look at the shapes of the connecting blocks!
 * In Train 3, the input structure has 8s connecting 1, 2, 4.
 * The output structure has 8s connecting 1, 2, 4.
 * ARE THEY THE EXACT SAME SHAPE OF 8s?
 * Let's check Train 3 input structure 8s:
 * (3,5), (3,9)
 * (4,6), (4,7), (4,8), (4,10)
 * (5,9)
 * Wait, the 1 is at (4,5), 2 is at (4,9), 4 is at (2,9).
 * Relative to 1 (at 0,0):
 * 2 is at (0,4)
 * 4 is at (-2,4)
 * 8s are at:
 * (-1,0), (-1,4)
 * (0,1), (0,2), (0,3), (0,5)
 * (1,4)
 * 
 * Let's check Train 3 output structure:
 * 1 is at (11,1)
 * 2 is at (11,5)
 * 4 is at (13,5)
 * Relative to 1 (at 0,0):
 * 2 is at (0,4)
 * 4 is at (2,4)
 * 8s are at:
 * (-1,4)
 * (0,1), (0,2), (0,3), (0,5)
 * (1,0), (1,4)
 * 
 * Wait! The relative positions of 1, 2, 4 in the input structure are:
 * 1 at (0,0)
 * 2 at (0,4)
 * 4 at (-2,4)
 * 
 * In the output structure:
 * 1 at (0,0)
 * 2 at (0,4)
 * 4 at (2,4)
 * 
 * The output structure is a FLIPPED version of the input structure!
 * Flipped vertically!
 * If we flip the input structure vertically:
 * 1 at (0,0) -> (0,0)
 * 2 at (0,4) -> (0,4)
 * 4 at (-2,4) -> (2,4)
 * 
 * Let's check the 8s in the flipped input structure:
 * Original 8s: (-1,0), (-1,4), (0,1), (0,2), (0,3), (0,5), (1,4).
 * Flipped 8s (y -> -y):
 * (1,0), (1,4), (0,1), (0,2), (0,3), (0,5), (-1,4).
 * Matches EXACTLY the output 8s!
 * 
 * YES! The output structure is a rigid transformation (translation + rotation/reflection) of the input structure!
 * The transformation is determined by the scattered dots!
 * 
 * Let's verify this for Train 2.
 * Input structure dots:
 * 2 at (3,4)
 * 4 at (4,3)
 * 1 at (8,4)
 * Relative to 1 (at 0,0):
 * 2 is at (-5,0)
 * 4 is at (-4,-1)
 * 
 * Output structure dots:
 * 1 at (11,9)
 * 2 at (11,14)
 * 4 at (10,13)
 * Relative to 1 (at 0,0):
 * 2 is at (0,5)
 * 4 is at (-1,4)
 * 
 * Transformation from Input to Output:
 * Input: 2 is at (-5,0), 4 is at (-4,-1).
 * Output: 2 is at (0,5), 4 is at (-1,4).
 * This is a rotation of 90 degrees clockwise!
 * (x, y) -> (y, -x)
 * Wait, in matrix coords (r, c):
 * Input: 2 is at r=-5, c=0.
 * Output: 2 is at r=0, c=5.
 * So (r, c) -> (-c, r)?
 * Let's check 4:
 * Input: r=-4, c=-1.
 * Output: r=-(-1)=1, c=-4. But output is r=-1, c=4.
 * So (r, c) -> (c, -r).
 * Let's check:
 * 2: (-5, 0) -> (0, 5). Correct.
 * 4: (-4, -1) -> (-1, 4). Correct.
 * 
 * So the transformation is (r, c) -> (c, -r).
 * Let's check the 3s (connecting blocks).
 * Input 3s relative to 1:
 * (4,4), (4,5), (5,4), (6,4), (7,4), (8,3), (8,5)
 * Wait, absolute coords of 3s:
 * (4,4), (4,5)
 * (5,4)
 * (6,4)
 * (7,4)
 * (8,3), (8,5)
 * Relative to 1 (8,4):
 * (-4,0), (-4,1)
 * (-3,0)
 * (-2,0)
 * (-1,0)
 * (0,-1), (0,1)
 * 
 * Apply (r, c) -> (c, -r):
 * (-4,0) -> (0,4)
 * (-4,1) -> (1,4)
 * (-3,0) -> (0,3)
 * (-2,0) -> (0,2)
 * (-1,0) -> (0,1)
 * (0,-1) -> (-1,0)
 * (0,1) -> (1,0)
 * 
 * Output 3s relative to 1 (11,9):
 * Absolute should be:
 * (11,13)
 * (12,13)
 * (11,12)
 * (11,11)
 * (11,10)
 * (10,9)
 * (12,9)
 * 
 * Let's check Train 2 Output:
 * 10: .........3...4.
 * 11: .........133332
 * 12: .........3...3.
 * 
 * Absolute coords of 3s in output:
 * (10,9)
 * (11,10), (11,11), (11,12), (11,13)
 * (12,9), (12,13)
 * 
 * Matches EXACTLY!
 * 
 * So the logic is:
 * 1. Identify the "template" structure in the input. It consists of a set of "anchor" dots (unique colors) and "connector" blocks (a single color that is not an anchor).
 * 2. Identify the "target" scattered dots in the input.
 * 3. Find the rigid transformation (translation, rotation, reflection) that maps the anchor dots from the template to the target dots.
 * 4. Apply this transformation to the connector blocks.
 * 5. Draw the transformed connector blocks and target dots in the output.
 * 6. Clear the original template and scattered dots from the input (or just start with an empty grid and draw the new structures).
 * Wait, in Train 1, there are TWO templates and TWO targets!
 * 
 * Let's check Train 1.
 * Anchor colors: 1, 3, 4.
 * Connector color: 8.
 * 
 * Template A (top-left):
 * Anchors:
 * 3 at (2,2)
 * 1 at (2,4)
 * 4 at (3,3)
 * Connectors (8s):
 * (1,3), (2,3), (3,2), (3,4)
 * 
 * Template B (middle):
 * Anchors:
 * 3 at (6,7)
 * 4 at (8,9)
 * 1 at (10,7)
 * Connectors (8s):
 * (7,7), (7,9)
 * (8,7), (8,8)
 * (9,7), (9,9)
 * 
 * Target 1 (bottom-left):
 * 1 at (9,2)
 * 4 at (10,3)
 * 3 at (11,2)
 * 
 * Target 2 (top-right):
 * 4 at (2,15)
 * 3 at (4,13)
 * 1 at (4,17)
 * 
 * We need to match Templates to Targets.
 * Let's check distances between anchors to match them.
 * Template A:
 * dist(3,1) = (0, 2) -> len^2 = 4
 * dist(3,4) = (1, 1) -> len^2 = 2
 * dist(1,4) = (1, -1) -> len^2 = 2
 * 
 * Template B:
 * dist(3,1) = (4, 0) -> len^2 = 16
 * dist(3,4) = (2, 2) -> len^2 = 8
 * dist(1,4) = (-2, 2) -> len^2 = 8
 * 
 * Target 1:
 * dist(3,1) = (-2, 0) -> len^2 = 4
 * dist(3,4) = (-1, 1) -> len^2 = 2
 * dist(1,4) = (1, 1) -> len^2 = 2
 * Matches Template A!
 * 
 * Target 2:
 * dist(3,1) = (0, 4) -> len^2 = 16
 * dist(3,4) = (-2, 2) -> len^2 = 8
 * dist(1,4) = (-2, -2) -> len^2 = 8
 * Matches Template B!
 * 
 * So Template A maps to Target 1.
 * Template B maps to Target 2.
 * 
 * Let's find the transformation for Template A -> Target 1.
 * Template A relative to 3 (2,2):
 * 1: (0, 2)
 * 4: (1, 1)
 * 8s: (-1,1), (0,1), (1,0), (1,2)
 * 
 * Target 1 relative to 3 (11,2):
 * 1: (-2, 0)
 * 4: (-1, 1)
 * 
 * Transformation:
 * (0, 2) -> (-2, 0)
 * (1, 1) -> (-1, 1)
 * This is (r, c) -> (-c, r). (Rotation 90 deg counter-clockwise).
 * 
 * Apply to 8s:
 * (-1,1) -> (-1, -1)
 * (0,1) -> (-1, 0)
 * (1,0) -> (0, 1)
 * (1,2) -> (-2, 1)
 * 
 * Output 8s absolute (add to 3 at 11,2):
 * (10,1)
 * (10,2)
 * (11,3)
 * (9,3)
 * 
 * Let's check Train 1 Output bottom-left:
 * r=9: 1 8 -> 8 at (9,3)
 * r=10: 8 8 4 -> 8 at (10,1), (10,2)
 * r=11: 3 8 -> 8 at (11,3)
 * Matches EXACTLY!
 * 
 * Transformation for Template B -> Target 2.
 * Template B relative to 3 (6,7):
 * 1: (4, 0)
 * 4: (2, 2)
 * 8s: (1,0), (1,2), (2,0), (2,1), (3,0), (3,2)
 * 
 * Target 2 relative to 3 (4,13):
 * 1: (0, 4)
 * 4: (-2, 2)
 * 
 * Transformation:
 * (4, 0) -> (0, 4)
 * (2, 2) -> (-2, 2)
 * This is (r, c) -> (-c, r). (Rotation 90 deg counter-clockwise).
 * 
 * Apply to 8s:
 * (1,0) -> (0, 1)
 * (1,2) -> (-2, 1)
 * (2,0) -> (0, 2)
 * (2,1) -> (-1, 2)
 * (3,0) -> (0, 3)
 * (3,2) -> (-2, 3)
 * 
 * Output 8s absolute (add to 3 at 4,13):
 * (4,14)
 * (2,14)
 * (4,15)
 * (3,15)
 * (4,16)
 * (2,16)
 * 
 * Let's check Train 1 Output top-right:
 * r=2: 8 4 8 -> 8 at (2,14), (2,16)
 * r=3: . 8 . -> 8 at (3,15)
 * r=4: 3 8 8 8 1 -> 8 at (4,14), (4,15), (4,16)
 * Matches EXACTLY!
 * 
 * This is brilliant!
 * 
 * Algorithm:
 * 1. Find all colors in the grid.
 * 2. Identify the "connector" color. It's the color that forms the structure but is not an anchor.
 *    How to identify? It's the color that has the most pixels?
 *    In Train 1: 8 has 12 pixels. 1, 3, 4 have 4 pixels each.
 *    In Train 2: 3 has 7 pixels. 1, 2, 4 have 2 pixels each.
 *    In Train 3: 8 has 7 pixels. 1, 2, 4 have 2 pixels each.
 *    So the connector color is the one with the highest count (excluding 0).
 * 3. The other colors (excluding 0 and connector) are the "anchor" colors.
 * 4. Group the anchor pixels into "sets".
 *    A set of anchors has exactly one pixel of each anchor color.
 *    Since they are scattered, we can group them by proximity?
 *    Actually, in Train 1, there are 4 sets of {1, 3, 4}.
 *    Two sets are adjacent to connectors. These are the "templates".
 *    Two sets are isolated. These are the "targets".
 * 5. How to group anchors into sets?
 *    For each anchor color, we have N pixels. So there are N sets.
 *    We can just find the connected components of (anchors + connectors).
 *    A connected component that contains connectors is a "template".
 *    A connected component that contains NO connectors is a "target".
 *    Wait, in Train 1, the targets are just scattered dots. Are they connected to each other?
 *    Target 1: 1 at (9,2), 4 at (10,3), 3 at (11,2). They are diagonally adjacent!
 *    Target 2: 4 at (2,15), 3 at (4,13), 1 at (4,17). They are NOT adjacent! dist is 2.
 *    So we can't just use connected components for targets.
 *    But we CAN use connected components for templates!
 *    A template is a connected component of (anchors + connectors).
 *    From each template, we extract its anchor points and connector points.
 * 6. Once we have the templates, we know the relative distances between anchors in each template.
 *    For the remaining anchor pixels (the targets), we need to group them into sets that match the templates.
 *    Since we know the pairwise distances between anchors in a template, we can just search for a set of target anchors that have the same pairwise distances!
 *    Wait, the distances are preserved under rigid transformations!
 *    So for a template T, we look for a set of target anchors {A_1, A_2, ..., A_k} such that dist(A_i, A_j) == dist(T_i, T_j) for all i, j.
 *    This perfectly groups the target anchors and matches them to templates!
 * 7. Once matched, we find the transformation matrix.
 *    A rigid transformation in 2D grid can be represented as:
 *    r' = a*r + b*c
 *    c' = c*r + d*c
 *    where (a,b,c,d) is one of the 8 orthogonal matrices:
 *    (1,0,0,1), (0,-1,1,0), (-1,0,0,-1), (0,1,-1,0) -> rotations
 *    (1,0,0,-1), (-1,0,0,1), (0,1,1,0), (0,-1,-1,0) -> reflections
 *    We can just test all 8 transformations to see which one maps the template anchors to the target anchors!
 * 8. Apply the winning transformation to the template connectors.
 * 9. Draw the transformed connectors and the target anchors on a blank grid.
 * 
 * Let's refine step 4-6:
 * - Find all pixels of connector color.
 * - Find all pixels of anchor colors.
 * - Find connected components of (connectors + anchors). Two pixels are connected if they are adjacent (8-way? 4-way?).
 *   In Train 1, Template A has 3 at (2,2) and 8 at (2,3). 4-way adjacent.
 *   Let's use 8-way adjacency to be safe.
 * - A component that contains at least one connector is a "Template".
 * - A template has a set of anchors and a set of connectors.
 * - The anchor pixels that are NOT in any template are the "Target Anchors".
 * - For each Template:
 *   - We need to find a matching set of Target Anchors.
 *   - We can just iterate through all 8 transformations.
 *   - For each transformation, we apply it to the Template's anchors (relative to some origin, e.g., the first anchor).
 *   - We then check if there is a set of Target Anchors that exactly matches these transformed relative positions!
 *   - If yes, we found the match and the transformation!
 *   - Apply the transformation to the Template's connectors, and add them to the output.
 * 
 * This is incredibly elegant and robust!
 * 
 * Let's trace Train 1 with this algorithm.
 * Connector: 8. Anchors: 1, 3, 4.
 * Components (8-way):
 * Comp 1: 8s at top-left, 3 at (2,2), 1 at (2,4), 4 at (3,3). Contains 8s -> Template A.
 * Comp 2: 8s at middle, 3 at (6,7), 1 at (10,7), 4 at (8,9). Contains 8s -> Template B.
 * Comp 3: 1 at (9,2). No 8s.
 * Comp 4: 4 at (10,3). No 8s.
 * Comp 5: 3 at (11,2). No 8s.
 * Comp 6: 4 at (2,15). No 8s.
 * Comp 7: 3 at (4,13). No 8s.
 * Comp 8: 1 at (4,17). No 8s.
 * 
 * Target Anchors:
 * 1: (9,2), (4,17)
 * 3: (11,2), (4,13)
 * 4: (10,3), (2,15)
 * 
 * Process Template A:
 * Anchors: 3 at (2,2), 1 at (2,4), 4 at (3,3).
 * Origin: 3 at (2,2).
 * Rel Anchors: 3:(0,0), 1:(0,2), 4:(1,1).
 * Rel Connectors: (-1,1), (0,1), (1,0), (1,2).
 * 
 * Try transformations:
 * Trans 1 (Identity): 3:(0,0), 1:(0,2), 4:(1,1).
 *   Look for Target 3.
 *   Try 3 at (11,2): Expected 1 at (11+0, 2+2)=(11,4). Not found.
 *   Try 3 at (4,13): Expected 1 at (4+0, 13+2)=(4,15). Not found.
 * Trans 2 (Rot 90 CCW): (r,c) -> (-c, r).
 *   Rel Anchors: 3:(0,0), 1:(-2,0), 4:(-1,1).
 *   Try 3 at (11,2): Expected 1 at (11-2, 2+0)=(9,2). Found!
 *                    Expected 4 at (11-1, 2+1)=(10,3). Found!
 *   Match found!
 *   Apply Trans 2 to Rel Connectors:
 *   (-1,1) -> (-1,-1)
 *   (0,1) -> (-1,0)
 *   (1,0) -> (0,1)
 *   (1,2) -> (-2,1)
 *   Add to 3 at (11,2):
 *   (10,1), (10,2), (11,3), (9,3).
 *   Add to output!
 *   Remove used Target Anchors from the pool.
 * 
 * Process Template B:
 * Anchors: 3 at (6,7), 1 at (10,7), 4 at (8,9).
 * Origin: 3 at (6,7).
 * Rel Anchors: 3:(0,0), 1:(4,0), 4:(2,2).
 * Rel Connectors: (1,0), (1,2), (2,0), (2,1), (3,0), (3,2).
 * 
 * Try transformations:
 * Trans 2 (Rot 90 CCW): (r,c) -> (-c, r).
 *   Rel Anchors: 3:(0,0), 1:(0,4), 4:(-2,2).
 *   Try 3 at (4,13): Expected 1 at (4+0, 13+4)=(4,17). Found!
 *                    Expected 4 at (4-2, 13+2)=(2,15). Found!
 *   Match found!
 *   Apply Trans 2 to Rel Connectors:
 *   (1,0) -> (0,1)
 *   (1,2) -> (-2,1)
 *   (2,0) -> (0,2)
 *   (2,1) -> (-1,2)
 *   (3,0) -> (0,3)
 *   (3,2) -> (-2,3)
 *   Add to 3 at (4,13):
 *   (4,14), (2,14), (4,15), (3,15), (4,16), (2,16).
 *   Add to output!
 * 
 * Output grid is initialized with 0s.
 * We draw the transformed connectors, AND the target anchors!
 * Wait, what about the original templates? They are NOT in the output!
 * So the output is just the target anchors + transformed connectors.
 * 
 * Let's check Train 2.
 * Connector: 3. Anchors: 1, 2, 4.
 * Template:
 * 2 at (3,4), 4 at (4,3), 1 at (8,4).
 * Connectors: (4,4), (4,5), (5,4), (6,4), (7,4), (8,3), (8,5).
 * 
 * Target Anchors:
 * 1 at (11,9), 2 at (11,14), 4 at (10,13).
 * 
 * Process Template:
 * Origin: 1 at (8,4).
 * Rel Anchors: 1:(0,0), 2:(-5,0), 4:(-4,-1).
 * Rel Connectors: (-4,0), (-4,1), (-3,0), (-2,0), (-1,0), (0,-1), (0,1).
 * 
 * Try transformations:
 * Trans 2 (Rot 90 CCW): (r,c) -> (-c, r).
 *   Rel Anchors: 1:(0,0), 2:(0,-5), 4:(1,-4).
 *   Try 1 at (11,9): Expected 2 at (11, 4). Not found.
 * Trans 4 (Rot 90 CW): (r,c) -> (c, -r).
 *   Rel Anchors: 1:(0,0), 2:(0,5), 4:(-1,4).
 *   Try 1 at (11,9): Expected 2 at (11, 14). Found!
 *                    Expected 4 at (11-1, 9+4)=(10,13). Found!
 *   Match found!
 *   Apply Trans 4 to Rel Connectors:
 *   (-4,0) -> (0,4)
 *   (-4,1) -> (1,4)
 *   (-3,0) -> (0,3)
 *   (-2,0) -> (0,2)
 *   (-1,0) -> (0,1)
 *   (0,-1) -> (-1,0)
 *   (0,1) -> (1,0)
 *   Add to 1 at (11,9):
 *   (11,13), (12,13), (11,12), (11,11), (11,10), (10,9), (12,9).
 *   Matches exactly!
 * 
 * This algorithm is extremely solid.
 * Let's write it down.
 */
export function solveMoveToAdjacency(grid: number[][]): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // 1. Find all colors and their counts
    const colorCounts = new Map<number, number>();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = grid[r][c];
            if (color !== 0) {
                colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
            }
        }
    }
    
    if (colorCounts.size < 2) return grid;
    
    // 2. Identify connector color (highest count)
    let connectorColor = -1;
    let maxCount = -1;
    for (const [color, count] of colorCounts.entries()) {
        if (count > maxCount) {
            maxCount = count;
            connectorColor = color;
        }
    }
    
    // 3. Find connected components of (anchors + connectors)
    const visited = Array(rows).fill(0).map(() => Array(cols).fill(false));
    const components: {anchors: {r: number, c: number, color: number}[], connectors: {r: number, c: number}[]}[] = [];
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== 0 && !visited[r][c]) {
                const comp = {anchors: [] as any[], connectors: [] as any[]};
                const queue = [{r, c}];
                visited[r][c] = true;
                
                while (queue.length > 0) {
                    const curr = queue.shift()!;
                    const color = grid[curr.r][curr.c];
                    
                    if (color === connectorColor) {
                        comp.connectors.push({r: curr.r, c: curr.c});
                    } else {
                        comp.anchors.push({r: curr.r, c: curr.c, color});
                    }
                    
                    // 8-way adjacency
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = curr.r + dr;
                            const nc = curr.c + dc;
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== 0 && !visited[nr][nc]) {
                                visited[nr][nc] = true;
                                queue.push({r: nr, c: nc});
                            }
                        }
                    }
                }
                components.push(comp);
            }
        }
    }
    
    const templates = components.filter(c => c.connectors.length > 0);
    const targetAnchors = components.filter(c => c.connectors.length === 0).flatMap(c => c.anchors);
    
    if (templates.length === 0 || targetAnchors.length === 0) return grid;
    
    const output = Array(rows).fill(0).map(() => Array(cols).fill(0));
    
    // Draw target anchors
    for (const a of targetAnchors) {
        output[a.r][a.c] = a.color;
    }
    
    const transforms = [
        (r: number, c: number) => ({r, c}),
        (r: number, c: number) => ({r: -c, c: r}),
        (r: number, c: number) => ({r: -r, c: -c}),
        (r: number, c: number) => ({r: c, c: -r}),
        (r: number, c: number) => ({r, c: -c}),
        (r: number, c: number) => ({r: -r, c}),
        (r: number, c: number) => ({r: c, c: r}),
        (r: number, c: number) => ({r: -c, c: -r})
    ];
    
    const usedTargets = new Set<string>();
    
    for (const template of templates) {
        if (template.anchors.length === 0) continue;
        
        const originAnchor = template.anchors[0];
        const relAnchors = template.anchors.map(a => ({
            dr: a.r - originAnchor.r,
            dc: a.c - originAnchor.c,
            color: a.color
        }));
        
        let matched = false;
        
        for (const transform of transforms) {
            const transAnchors = relAnchors.map(a => {
                const t = transform(a.dr, a.dc);
                return {dr: t.r, dc: t.c, color: a.color};
            });
            
            // Try to match with target anchors
            for (const targetOrigin of targetAnchors) {
                if (targetOrigin.color !== originAnchor.color) continue;
                if (usedTargets.has(`${targetOrigin.r},${targetOrigin.c}`)) continue;
                
                let allMatched = true;
                const currentMatch = new Set<string>();
                
                for (const ta of transAnchors) {
                    const expectedR = targetOrigin.r + ta.dr;
                    const expectedC = targetOrigin.c + ta.dc;
                    
                    const found = targetAnchors.find(a => a.r === expectedR && a.c === expectedC && a.color === ta.color && !usedTargets.has(`${a.r},${a.c}`));
                    if (!found) {
                        allMatched = false;
                        break;
                    }
                    currentMatch.add(`${found.r},${found.c}`);
                }
                
                if (allMatched) {
                    // Match found!
                    matched = true;
                    for (const m of currentMatch) usedTargets.add(m);
                    
                    // Apply transform to connectors
                    for (const conn of template.connectors) {
                        const dr = conn.r - originAnchor.r;
                        const dc = conn.c - originAnchor.c;
                        const t = transform(dr, dc);
                        const outR = targetOrigin.r + t.r;
                        const outC = targetOrigin.c + t.c;
                        if (outR >= 0 && outR < rows && outC >= 0 && outC < cols) {
                            output[outR][outC] = connectorColor;
                        }
                    }
                    break;
                }
            }
            if (matched) break;
        }
    }
    
    return output;
}
