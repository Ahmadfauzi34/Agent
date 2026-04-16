// RRM - Global Constants and Types

pub const GLOBAL_DIMENSION: usize = 8192; // HARUS Power of 2
pub const MAX_ENTITIES: usize = 1000; // Turunkan sedikit ke 1000 agar MCTS rendering Z-Buffer Decoder tidak meledak di RAM kecil sandbox CI
