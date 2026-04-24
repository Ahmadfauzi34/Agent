import * as tf from '@tensorflow/tfjs';

export type SimulationType = 'reaction-diffusion' | 'wave-equation';

// Detect Endianness for 32-bit pixel manipulation
const isLittleEndian = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;

// Pre-compute colormaps for faster rendering
const rdMap32 = new Uint32Array(256);
const waveMap32 = new Uint32Array(256);

for (let i = 0; i < 256; i++) {
  // Reaction-Diffusion (Bio/Neon)
  const r_rd = Math.floor(i * 0.1);
  const g_rd = i;
  const b_rd = Math.floor(i * 0.8);
  const a = 255;

  if (isLittleEndian) {
      rdMap32[i] = (a << 24) | (b_rd << 16) | (g_rd << 8) | r_rd;
  } else {
      rdMap32[i] = (r_rd << 24) | (g_rd << 16) | (b_rd << 8) | a;
  }

  // Wave Equation (Water)
  const r_w = Math.floor(i * 0.2);
  const g_w = Math.floor(i * 0.5);
  const b_w = i;

  if (isLittleEndian) {
      waveMap32[i] = (a << 24) | (b_w << 16) | (g_w << 8) | r_w;
  } else {
      waveMap32[i] = (r_w << 24) | (g_w << 16) | (b_w << 8) | a;
  }
}

export class TensorSimulation {
  private state1: tf.Tensor2D | null = null;
  private state2: tf.Tensor2D | null = null;
  private width: number;
  private height: number;
  private kernel: tf.Tensor4D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    
    // Laplacian kernel for 2D spatial derivative (∇²)
    this.kernel = tf.tensor2d([
      [0.05, 0.2, 0.05],
      [0.2, -1.0, 0.2],
      [0.05, 0.2, 0.05]
    ]).expandDims(2).expandDims(3) as tf.Tensor4D;
    
    this.reset('reaction-diffusion');
  }

  reset(type: SimulationType) {
    if (this.state1) {
        tf.dispose(this.state1);
        this.state1 = null;
    }
    if (this.state2) {
        tf.dispose(this.state2);
        this.state2 = null;
    }
    
    if (type === 'reaction-diffusion') {
      this.state1 = tf.ones([this.height, this.width]) as tf.Tensor2D; // A (Prey)
      const bData = new Float32Array(this.width * this.height);
      // Seed center with B (Predator)
      for (let y = this.height / 2 - 10; y < this.height / 2 + 10; y++) {
        for (let x = this.width / 2 - 10; x < this.width / 2 + 10; x++) {
          bData[y * this.width + x] = 1.0;
        }
      }
      this.state2 = tf.tensor2d(bData, [this.height, this.width]); // B
    } else if (type === 'wave-equation') {
      this.state1 = tf.zeros([this.height, this.width]) as tf.Tensor2D; // u(t)
      this.state2 = tf.zeros([this.height, this.width]) as tf.Tensor2D; // u(t-1)
    }
  }

  addDrop(x: number, y: number, radius: number, type: SimulationType) {
      if (!this.state1 || !this.state2) return;
      
      tf.tidy(() => {
          const yCoords = tf.linspace(0, this.height - 1, this.height).expandDims(1).tile([1, this.width]);
          const xCoords = tf.linspace(0, this.width - 1, this.width).expandDims(0).tile([this.height, 1]);
          
          const distSq = tf.square(xCoords.sub(x)).add(tf.square(yCoords.sub(y)));
          const mask = distSq.lessEqual(radius * radius).cast('float32');

          if (type === 'reaction-diffusion') {
              const oldB = this.state2!;
              this.state2 = tf.keep(oldB.add(mask).clipByValue(0, 1)) as tf.Tensor2D;
              tf.dispose(oldB);
          } else {
              const old1 = this.state1!;
              const old2 = this.state2!;
              this.state1 = tf.keep(old1.add(mask.mul(2))); // Add energy
              this.state2 = tf.keep(old2.add(mask.mul(2)));
              tf.dispose([old1, old2]);
          }
      });
  }

  step(type: SimulationType, params: any) {
    if (!this.state1 || !this.state2) return;

    tf.tidy(() => {
      if (type === 'reaction-diffusion') {
        // Gray-Scott Model
        const { f = 0.055, k = 0.062, da = 1.0, db = 0.5 } = params;
        
        const A_exp = this.state1!.expandDims(0).expandDims(3);
        const B_exp = this.state2!.expandDims(0).expandDims(3);

        const laplaceA = tf.conv2d(A_exp as tf.Tensor4D, this.kernel, 1, 'same').squeeze();
        const laplaceB = tf.conv2d(B_exp as tf.Tensor4D, this.kernel, 1, 'same').squeeze();

        const ABB = this.state1!.mul(this.state2!).mul(this.state2!);

        const nextA = this.state1!.add(
          laplaceA.mul(da).sub(ABB).add(tf.scalar(1).sub(this.state1!).mul(f))
        );

        const nextB = this.state2!.add(
          laplaceB.mul(db).add(ABB).sub(this.state2!.mul(k + f))
        );

        const old1 = this.state1;
        const old2 = this.state2;
        this.state1 = tf.keep(nextA.clipByValue(0, 1)) as tf.Tensor2D;
        this.state2 = tf.keep(nextB.clipByValue(0, 1)) as tf.Tensor2D;
        tf.dispose([old1, old2]);
        
      } else if (type === 'wave-equation') {
        // 2D Wave Equation
        const { damping = 0.99, c = 0.5 } = params;
        
        const u_exp = this.state1!.expandDims(0).expandDims(3);
        const laplaceU = tf.conv2d(u_exp as tf.Tensor4D, this.kernel, 1, 'same').squeeze();
        
        // u(t+1) = 2u(t) - u(t-1) + c^2 * laplace(u)
        const nextU = this.state1!.mul(2)
            .sub(this.state2!)
            .add(laplaceU.mul(c * c))
            .mul(damping);

        const old1 = this.state1;
        const old2 = this.state2;
        this.state2 = old1; // u(t-1) becomes old u(t)
        this.state1 = tf.keep(nextU) as tf.Tensor2D; // u(t) becomes nextU
        tf.dispose(old2); // Only dispose the old u(t-1)
      }
    });
  }

  async renderToCanvas(canvas: HTMLCanvasElement, type: SimulationType) {
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.state1 || !this.state2) return;

    const tensorToRender = type === 'reaction-diffusion' ? this.state2 : this.state1;
    
    // Always clone the tensor for rendering so async .data() doesn't read a disposed tensor
    const renderData = tf.tidy(() => {
        if (type === 'wave-equation') {
            return tensorToRender.add(1).div(2).clipByValue(0, 1);
        } else {
            return tensorToRender.clone();
        }
    });

    try {
        const data = await renderData.data();
        const imgData = ctx.createImageData(this.width, this.height);
        const out32 = new Uint32Array(imgData.data.buffer);
        const len = data.length;

        // Hoist the type condition and use 32-bit assignments via LUT
        if (type === 'reaction-diffusion') {
            for (let i = 0; i < len; i++) {
                let val = (data[i] * 255) | 0;
                if (val < 0) val = 0; else if (val > 255) val = 255;
                out32[i] = rdMap32[val];
            }
        } else {
            for (let i = 0; i < len; i++) {
                let val = (data[i] * 255) | 0;
                if (val < 0) val = 0; else if (val > 255) val = 255;
                out32[i] = waveMap32[val];
            }
        }

        ctx.putImageData(imgData, 0, 0);
    } catch (e) {
        console.error("Render error:", e);
    } finally {
        tf.dispose(renderData);
    }
  }
}
