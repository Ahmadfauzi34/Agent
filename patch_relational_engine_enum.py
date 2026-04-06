import re

file_path = "rrm_rust/src/perception/relational_engine.rs"

with open(file_path, "r") as f:
    content = f.read()

# Replace RelationType enum block exactly
content = re.sub(
    r"pub enum RelationType \{\n    Touching = 1,\n    Enclosed = 2,\n    RayHit = 3,\n    AlignedHorizontally = 4,\n    AlignedVertically = 5,\n\}",
    r"pub enum RelationType {\n    Touching = 1,\n    Enclosed = 2,\n    RayHit = 3,\n    AlignedHorizontally = 4,\n    AlignedVertically = 5,\n    Became = 7,\n    Spawned = 8,\n    Vanished = 9,\n    Moved = 10,\n}",
    content
)

with open(file_path, "w") as f:
    f.write(content)
