// RRM - Global Constants and Types

pub const GLOBAL_DIMENSION: usize = 8192; // HARUS Power of 2
pub const MAX_ENTITIES: usize = 400; // Diturunkan drastis agar tidak OOM saat cloning (16MB per universe per tensor x 3 = 48MB per universe per clone -> sandbox mati). 400 partikel cukup untuk ARC standar + sedikit cadangan spawn.
