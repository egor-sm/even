export type SpectrumRange = {
  minHz: number;
  maxHz: number;
  /** Analyzer level range (right-hand scale). */
  minDb: number;
  maxDb: number;
  /** EQ gain range is +-eqDb (left-hand scale), 0 dB in the middle. */
  eqDb: number;
};

// The analyzer's 96 dB and the EQ's 48 dB span the same height, so every EQ grid line (6 dB) is
// also an analyzer grid line (12 dB).
export const defaultRange: SpectrumRange = { minHz: 20, maxHz: 20000, minDb: -96, maxDb: 0, eqDb: 24 };

/** Maps frequency (log) and levels (linear dB) to device pixels. */
export class SpectrumScale {
  constructor(
    readonly range: SpectrumRange,
    readonly width: number,
    readonly height: number,
  ) {}

  x(hz: number): number {
    const { minHz, maxHz } = this.range;
    return (Math.log(hz / minHz) / Math.log(maxHz / minHz)) * this.width;
  }

  /** Inverse of x(). */
  frequencyAt(x: number): number {
    const { minHz, maxHz } = this.range;
    return minHz * (maxHz / minHz) ** (x / this.width);
  }

  /** Analyzer level (right-hand scale). */
  y(db: number): number {
    const { minDb, maxDb } = this.range;
    return ((maxDb - db) / (maxDb - minDb)) * this.height;
  }

  /** EQ gain (left-hand scale). */
  eqY(db: number): number {
    const { eqDb } = this.range;
    return ((eqDb - db) / (2 * eqDb)) * this.height;
  }
}
