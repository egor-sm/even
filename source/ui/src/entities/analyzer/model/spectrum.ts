export type SpectrumOptions = {
  /**
   * Spectral tilt around 1 kHz. 4.5 dB/oct is the usual default of analyzers: about how much the
   * long-term spectrum of music falls (levels are power per bin, so white noise reads flat without it).
   */
  slopeDbPerOctave: number;
  attackSeconds: number;
  decayDbPerSecond: number;
};

export const defaultSpectrumOptions: SpectrumOptions = {
  slopeDbPerOctave: 4.5,
  attackSeconds: 0.01,
  decayDbPerSecond: 120,
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
  /** The last levels as received, before the tilt. */
  private levels = new Float32Array(0);

  constructor(private options: SpectrumOptions = defaultSpectrumOptions) {}

  /** A new tilt applies to the current levels too, so it shows while no new frames arrive. */
  setOptions(options: SpectrumOptions): void {
    const tiltChanged = options.slopeDbPerOctave !== this.options.slopeDbPerOctave;
    this.options = options;
    if (!tiltChanged) return;
    this.tilt = this.frequencies.map((frequency) => this.tiltDb(frequency));
    this.updateTarget();
  }

  setLevels(levelsDb: Float32Array, minHz: number, maxHz: number): void {
    const count = levelsDb.length;
    if (count < 2) return;

    if (count !== this.frequencies.length || minHz !== this.frequencies[0] || maxHz !== this.frequencies[count - 1])
      this.resetLayout(count, minHz, maxHz);

    this.levels.set(levelsDb);
    this.updateTarget();
  }

  /** No spectrum (the analyzer mode leaves it out): nothing to draw. */
  clear(): void {
    this.frequencies = new Float32Array(0);
    this.display = new Float32Array(0);
    this.target = new Float32Array(0);
    this.tilt = new Float32Array(0);
    this.levels = new Float32Array(0);
  }

  /**
   * Advances the ballistics by dtSeconds: fast attack, constant-rate decay.
   * Returns true while the curve is still moving towards the target.
   */
  tick(dtSeconds: number): boolean {
    const attack = 1 - Math.exp(-dtSeconds / this.options.attackSeconds);
    const decay = this.options.decayDbPerSecond * dtSeconds;
    let moving = false;

    for (let i = 0; i < this.display.length; i++) {
      const current = this.display[i];
      const target = this.target[i];
      const next = target > current ? current + (target - current) * attack : Math.max(target, current - decay);

      this.display[i] = Math.abs(target - next) < settledDb ? target : next;
      moving ||= this.display[i] !== target;
    }

    return moving;
  }

  private resetLayout(count: number, minHz: number, maxHz: number): void {
    this.frequencies = Float32Array.from({ length: count }, (_, i) => minHz * (maxHz / minHz) ** (i / (count - 1)));
    this.tilt = this.frequencies.map((frequency) => this.tiltDb(frequency));
    this.display = new Float32Array(count).fill(floorDb);
    this.target = new Float32Array(count).fill(floorDb);
    this.levels = new Float32Array(count).fill(floorDb);
  }

  private updateTarget(): void {
    for (let i = 0; i < this.target.length; i++) this.target[i] = Math.max(this.levels[i] + this.tilt[i], floorDb);
  }

  private tiltDb(frequency: number): number {
    return this.options.slopeDbPerOctave * Math.log2(frequency / 1000);
  }
}
