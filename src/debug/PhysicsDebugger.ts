export class PhysicsDebugger {
  private spatCtx: CanvasRenderingContext2D | null;
  private specCtx: CanvasRenderingContext2D | null;

  constructor(spatCanvasId: string, specCanvasId: string) {
    if (typeof document !== 'undefined') {
        const spatCanvas = document.getElementById(spatCanvasId) as HTMLCanvasElement;
        const specCanvas = document.getElementById(specCanvasId) as HTMLCanvasElement;
        this.spatCtx = spatCanvas ? spatCanvas.getContext('2d') : null;
        this.specCtx = specCanvas ? specCanvas.getContext('2d') : null;
    } else {
        this.spatCtx = null;
        this.specCtx = null;
    }
  }

  // Merender sinyal spasial (Y-Stream)
  drawSpatial(signal: Float64Array) {
    if (!this.spatCtx) return;
    this.clear(this.spatCtx);
    this.spatCtx.strokeStyle = '#00ffcc';
    this.spatCtx.beginPath();
    const step = 800 / signal.length;
    this.spatCtx.moveTo(0, 100 - (signal[0] * 50));
    for (let i = 1; i < signal.length; i++) {
      const x = i * step;
      const y = 100 - (signal[i] * 50); // Scaling agar terlihat
      this.spatCtx.lineTo(x, y);
    }
    this.spatCtx.stroke();
  }

  // Merender spektrum frekuensi (Z-Stream)
  drawSpectral(mags: number[]) {
    if (!this.specCtx) return;
    this.clear(this.specCtx);
    this.specCtx.fillStyle = '#ffcc00';
    const width = 800 / mags.length;
    const maxMag = Math.max(...mags) || 1;
    for (let i = 0; i < mags.length; i++) {
      const h = (mags[i] / maxMag) * 200;
      this.specCtx.fillRect(i * width, 200 - h, width - 1, h);
    }
  }

  private clear(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, 800, 200);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 800, 200);
  }

  // Update Teks Diagnostik
  updateInfo(report: { isValid: boolean, freqPMR: number, spatPMR: number }) {
    if (typeof document === 'undefined') return;
    
    const statusEl = document.getElementById('gate-status');
    if (statusEl) {
        statusEl.innerText = report.isValid ? "✅ OPEN (DATA)" : "🚫 CLOSED (NOISE)";
        statusEl.style.color = report.isValid ? "#0f0" : "#f00";
    }

    const freqEl = document.getElementById('freq-pmr');
    if (freqEl) freqEl.innerText = report.freqPMR.toFixed(2);

    const spatEl = document.getElementById('spat-pmr');
    if (spatEl) spatEl.innerText = report.spatPMR.toFixed(2);
  }
}
