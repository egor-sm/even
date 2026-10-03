import type { AnalyzerFrame } from './frame';

export type SpectrumOptions = {
  /** Spectral tilt around 1 kHz; 4.5 dB/oct makes pink noise look roughly flat. */
  slopeDbPerOctave: number;
  attackSeconds: number;
  releaseDbPerSecond: number;
};

export const defaultSpectrumOptions: SpectrumOptions = {
  slopeDbPerOctave: 4.5,
  attackSeconds: 0.01,
  releaseDbPerSecond: 60,
};

const floorDb = -150;
/** Below this difference the curve counts as settled and needs no redraw. */
const settledDb = 0.01;

/**
 * Display-side processing of analyzer frames (already reduced to smoothed log-spaced points in C++):
 * spectral tilt and time ballistics evaluated per rendered frame.
 */
export class Spectrum {
  frequencies = new Float32Array(0);
  /** Smoothed curve in dB, updated by tick(). */
  display = new Float32Array(0);

  private target = new Float32Array(0);
  private tilt = new Float32Array(0);

  constructor(private readonly options: SpectrumOptions = defaultSpectrumOptions) {}

  setFrame({ levelsDb, minHz, maxHz }: AnalyzerFrame): void {
    const count = levelsDb.length;
    if (count < 2) return;

    if (count !== this.frequencies.length || minHz !== this.frequencies[0] || maxHz !== this.frequencies[count - 1])
      this.resetLayout(count, minHz, maxHz);

    for (let i = 0; i < count; i++) this.target[i] = Math.max(levelsDb[i] + this.tilt[i], floorDb);
  }

  /**
   * Advances the ballistics by dtSeconds: fast attack, constant-rate release.
   * Returns true while the curve is still moving towards the target.
   */
  tick(dtSeconds: number): boolean {
    const attack = 1 - Math.exp(-dtSeconds / this.options.attackSeconds);
    const release = this.options.releaseDbPerSecond * dtSeconds;
    let moving = false;

    for (let i = 0; i < this.display.length; i++) {
      const current = this.display[i];
      const target = this.target[i];
      const next = target > current ? current + (target - current) * attack : Math.max(target, current - release);

      this.display[i] = Math.abs(target - next) < settledDb ? target : next;
      moving ||= this.display[i] !== target;
    }

    return moving;
  }

  private resetLayout(count: number, minHz: number, maxHz: number): void {
    this.frequencies = Float32Array.from({ length: count }, (_, i) => minHz * (maxHz / minHz) ** (i / (count - 1)));
    this.tilt = this.frequencies.map((frequency) => this.options.slopeDbPerOctave * Math.log2(frequency / 1000));
    this.display = new Float32Array(count).fill(floorDb);
    this.target = new Float32Array(count).fill(floorDb);
  }
}
