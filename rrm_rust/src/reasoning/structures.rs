use crate::core::entity_manifold::EntityManifold;
use ndarray::Array1;

#[derive(Clone, Debug, PartialEq)]
pub struct Axiom {
    pub name: String,
    pub tier: u8,
    pub condition_tensor: Option<Array1<f32>>,
    pub delta_spatial: Array1<f32>,
    pub delta_semantic: Array1<f32>,
    pub delta_x: f32,
    pub delta_y: f32,
}

impl Axiom {
    pub fn new(name: &str, tier: u8, delta_spatial: Array1<f32>, delta_semantic: Array1<f32>, delta_x: f32, delta_y: f32) -> Self {
        Self {
            name: name.to_string(),
            tier,
            condition_tensor: None,
            delta_spatial,
            delta_semantic,
            delta_x,
            delta_y,
        }
    }

    pub fn crop_to_content() -> Self {
        use crate::core::config::GLOBAL_DIMENSION;
        Self::new("CROP_TO_COLOR", 7, Array1::zeros(GLOBAL_DIMENSION), Array1::zeros(GLOBAL_DIMENSION), 0.0, 0.0)
    }

    pub fn identity() -> Self {
        use crate::core::config::GLOBAL_DIMENSION;
        Self::new("IDENTITY", 0, Array1::zeros(GLOBAL_DIMENSION), Array1::zeros(GLOBAL_DIMENSION), 0.0, 0.0)
    }
}

#[derive(Clone, Debug)]
pub struct OldStructuralDelta {
    pub input_dim: (usize, usize),
    pub output_dim: (usize, usize),
}

impl OldStructuralDelta {
    pub fn analyze(input: &EntityManifold, output: &EntityManifold) -> Self {
        Self {
            input_dim: (input.global_width as usize, input.global_height as usize),
            output_dim: (output.global_width as usize, output.global_height as usize),
        }
    }

    pub fn consensus(deltas: &[Self]) -> Self {
        deltas.first().cloned().unwrap_or(Self { input_dim: (0, 0), output_dim: (0, 0) })
    }

    pub fn classify(&self) -> TaskClass {
        if self.input_dim != self.output_dim {
            TaskClass::StructuralTransform
        } else {
            TaskClass::PureGeometry
        }
    }

    pub fn to_signature(&self) -> StructuralSignature {
        StructuralSignature {
            dim_relation: DimensionRelation::Equal,
            object_delta: ObjectDelta::Same,
            color_mapping: None,
            topology_hint: TopologyHint::Grid,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum TaskClass {
    PureGeometry,
    ObjectManipulation,
    StructuralTransform,
    Unknown,
}

#[derive(Clone, Hash, Eq, PartialEq, Debug)]
pub struct StructuralSignature {
    pub dim_relation: DimensionRelation,
    pub object_delta: ObjectDelta,
    pub color_mapping: Option<Vec<(u8, u8)>>,
    pub topology_hint: TopologyHint,
}

impl StructuralSignature {
    pub fn matches(&self, other: &Self) -> bool {
        self.dim_relation == other.dim_relation && self.topology_hint == other.topology_hint
    }
}

#[derive(Clone, Hash, Eq, PartialEq, Debug)]
pub enum DimensionRelation {
    Larger,
    Smaller,
    Equal,
}

#[derive(Clone, Hash, Eq, PartialEq, Debug)]
pub enum ObjectDelta {
    Added,
    Removed,
    Same,
    Transformed,
}

#[derive(Clone, Hash, Eq, PartialEq, Debug)]
pub enum TopologyHint {
    Scatter,
    Grid,
    Linear,
    Nested,
}

impl TopologyHint {
    pub fn random() -> Self {
        Self::Grid // Placeholder
    }
}
