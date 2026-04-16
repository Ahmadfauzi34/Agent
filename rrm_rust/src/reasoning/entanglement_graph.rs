use crate::core::config::MAX_ENTITIES;

pub struct EntanglementGraph {
    pub values: Vec<f32>,
    pub col_indices: Vec<usize>,
    pub row_ptr: Vec<usize>,
}

impl EntanglementGraph {
    pub fn new() -> Self {
        let mut row_ptr = vec![0; MAX_ENTITIES + 1];
        let mut values = Vec::with_capacity(MAX_ENTITIES);
        let mut col_indices = Vec::with_capacity(MAX_ENTITIES);

        // Self-entanglement awal: 1.0 pada diagonal utama.
        for i in 0..MAX_ENTITIES {
            row_ptr[i] = i;
            values.push(1.0);
            col_indices.push(i);
        }
        row_ptr[MAX_ENTITIES] = MAX_ENTITIES;

        Self {
            values,
            col_indices,
            row_ptr,
        }
    }

    pub fn reset_active(&mut self, active_count: usize) {
        self.values.clear();
        self.col_indices.clear();
        self.row_ptr.clear();
        self.row_ptr.resize(MAX_ENTITIES + 1, 0);

        for i in 0..active_count {
            self.row_ptr[i] = i;
            self.values.push(1.0);
            self.col_indices.push(i);
        }

        for i in active_count..=MAX_ENTITIES {
            self.row_ptr[i] = active_count;
        }
    }

    #[inline(always)]
    pub fn iter_row(&self, row: usize) -> impl Iterator<Item = (usize, f32)> + '_ {
        let start = self.row_ptr[row];
        let end = self.row_ptr[row + 1];

        self.col_indices[start..end]
            .iter()
            .copied()
            .zip(self.values[start..end].iter().copied())
    }

    pub fn get_weight_csr(&self, row: usize, col: usize) -> f32 {
        let start = self.row_ptr[row];
        let end = self.row_ptr[row + 1];

        for i in start..end {
            if self.col_indices[i] == col {
                return self.values[i];
            } else if self.col_indices[i] > col {
                break;
            }
        }
        0.0
    }
}
