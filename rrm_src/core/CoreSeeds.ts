import { FHRR } from './fhrr.js';
import { TensorVector } from './config.js';

/**
 * CoreSeeds: Singleton / Static Registry for Fundamental Constants of the RRM Universe.
 *
 * "Seed Bank Pattern" (Hybrid Approach):
 * Instead of injecting heavy dependencies (like UniversalManifold into MultiverseSandbox)
 * or pre-generating thousands of explicit translation tensors, we extract the base continuous
 * physical laws (X, Y, TIME) here. Any subsystem (Perception, Sandbox, Aligner) can access
 * these seeds in O(1) time and use FHRR.fractionalBind() to dynamically compute shifts
 * without branching or memory bloat.
 */
export class CoreSeeds {
    public static readonly X_AXIS_SEED: TensorVector = FHRR.create();
    public static readonly Y_AXIS_SEED: TensorVector = FHRR.create();
}
