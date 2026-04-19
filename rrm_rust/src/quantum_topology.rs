// ============================================================================
// QUANTUM TOPOLOGY MODULE
// ============================================================================

use crate::core::config::GLOBAL_DIMENSION;
use crate::core::entity_manifold::EntityManifold;
use ndarray::{s, Array1, Array2};
use serde::{Deserialize, Serialize};

/// Quantum Cell Complex: Simplicial complex dengan amplitude kuantum
#[derive(Clone, Debug)]
pub struct QuantumCellComplex {
    pub max_dimension: usize,
    pub boundary_operators: Vec<Array2<f32>>,
    pub laplacians: Vec<Array2<f32>>,
    pub betti_numbers: Vec<usize>,
    pub amplitudes: Vec<Array1<f32>>,
    pub persistence_barcode: Vec<(f32, f32)>,
}

impl QuantumCellComplex {
    pub fn from_manifold(manifold: &EntityManifold, epsilon: f32) -> Self {
        let n = manifold.active_count;
        let mut complex = QuantumCellComplex {
            max_dimension: 2,
            boundary_operators: Vec::new(),
            laplacians: Vec::new(),
            betti_numbers: Vec::new(),
            amplitudes: Vec::new(),
            persistence_barcode: Vec::new(),
        };

        if n == 0 {
            return complex;
        }

        let mut dist_matrix = Array2::<f32>::zeros((n, n));
        for i in 0..n {
            for j in (i + 1)..n {
                let dx = manifold.centers_x[i] - manifold.centers_x[j];
                let dy = manifold.centers_y[i] - manifold.centers_y[j];
                let dist = (dx * dx + dy * dy).sqrt();
                dist_matrix[[i, j]] = dist;
                dist_matrix[[j, i]] = dist;
            }
        }

        let mut edges = Vec::new();
        for i in 0..n {
            for j in (i + 1)..n {
                if dist_matrix[[i, j]] <= epsilon {
                    edges.push((i, j));
                }
            }
        }

        let mut triangles = Vec::new();
        for &(i, j) in &edges {
            for k in (j + 1)..n {
                if dist_matrix[[i, k]] <= epsilon && dist_matrix[[j, k]] <= epsilon {
                    triangles.push((i, j, k));
                }
            }
        }

        let mut d1 = Array2::<f32>::zeros((n, edges.len().max(1)));
        if !edges.is_empty() {
            for (idx, &(i, j)) in edges.iter().enumerate() {
                d1[[i, idx]] = 1.0;
                d1[[j, idx]] = -1.0;
            }
            complex.boundary_operators.push(d1);
        }

        if !triangles.is_empty() && !edges.is_empty() {
            let mut d2 = Array2::<f32>::zeros((edges.len(), triangles.len()));
            for (t_idx, &(i, j, k)) in triangles.iter().enumerate() {
                for (e_idx, &(a, b)) in edges.iter().enumerate() {
                    if (a == i && b == j) || (a == j && b == i) {
                        d2[[e_idx, t_idx]] = if a == i { 1.0 } else { -1.0 };
                    }
                    if (a == i && b == k) || (a == k && b == i) {
                        d2[[e_idx, t_idx]] = if a == k { 1.0 } else { -1.0 };
                    }
                    if (a == j && b == k) || (a == k && b == j) {
                        d2[[e_idx, t_idx]] = if a == j { 1.0 } else { -1.0 };
                    }
                }
            }
            complex.boundary_operators.push(d2);
        }

        complex.compute_laplacians_and_betti();
        complex.compute_persistence(&dist_matrix, &edges, &triangles);
        complex
    }

    fn compute_laplacians_and_betti(&mut self) {
        if self.boundary_operators.is_empty() {
            self.betti_numbers.push(0);
            return;
        }

        let d1 = &self.boundary_operators[0];
        let l0 = d1.dot(&d1.t());
        self.laplacians.push(l0);

        if self.boundary_operators.len() >= 2 {
            let d2 = &self.boundary_operators[1];
            let l1 = d1.t().dot(d1) + d2.dot(&d2.t());
            self.laplacians.push(l1);
        }

        for laplacian in &self.laplacians {
            let eigenvalues = self.estimate_eigenvalues(laplacian);
            let zero_count = eigenvalues.iter().filter(|&&x| x.abs() < 1e-4).count();
            self.betti_numbers.push(zero_count);
        }
    }

    fn estimate_eigenvalues(&self, matrix: &Array2<f32>) -> Vec<f32> {
        if matrix.is_empty() {
            return vec![0.0];
        }
        let n = matrix.shape()[0];
        let mut v = Array1::<f32>::ones(n);
        let norm = v.dot(&v).sqrt();
        if norm > 0.0 {
            v /= norm;
        } else {
            return vec![0.0];
        }

        for _ in 0..20 {
            let v_new = matrix.dot(&v);
            let norm = v_new.dot(&v_new).sqrt();
            if norm > 1e-6 {
                v = v_new / norm;
            }
        }
        let lambda = v.dot(&(matrix.dot(&v)));
        vec![lambda]
    }

    fn compute_persistence(
        &mut self,
        dist_matrix: &Array2<f32>,
        edges: &[(usize, usize)],
        triangles: &[(usize, usize, usize)],
    ) {
        let mut edge_filtration: Vec<(f32, usize)> = edges
            .iter()
            .enumerate()
            .map(|(idx, &(i, j))| (dist_matrix[[i, j]], idx))
            .collect();
        edge_filtration.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());

        let mut uf = UnionFind::new(dist_matrix.shape()[0]);

        for (dist, e_idx) in edge_filtration {
            let (i, j) = edges[e_idx];
            let root_i = uf.find(i);
            let root_j = uf.find(j);

            if root_i != root_j {
                uf.union(root_i, root_j);
            } else {
                self.persistence_barcode.push((0.0, dist));
            }
        }
    }
}

struct UnionFind {
    parent: Vec<usize>,
    rank: Vec<usize>,
}

impl UnionFind {
    fn new(n: usize) -> Self {
        UnionFind {
            parent: (0..n).collect(),
            rank: vec![0; n],
        }
    }
    fn find(&mut self, x: usize) -> usize {
        if self.parent[x] != x {
            self.parent[x] = self.find(self.parent[x]);
        }
        self.parent[x]
    }
    fn union(&mut self, x: usize, y: usize) {
        let root_x = self.find(x);
        let root_y = self.find(y);
        if root_x != root_y {
            match self.rank[root_x].cmp(&self.rank[root_y]) {
                std::cmp::Ordering::Less => self.parent[root_x] = root_y,
                std::cmp::Ordering::Greater => self.parent[root_y] = root_x,
                std::cmp::Ordering::Equal => {
                    self.parent[root_y] = root_x;
                    self.rank[root_x] += 1;
                }
            }
        }
    }
}
