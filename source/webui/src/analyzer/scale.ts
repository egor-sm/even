export type SpectrumRange = {
  minHz: number;
  maxHz: number;
  minDb: number;
  maxDb: number;
};

export const defaultRange: SpectrumRange = { minHz: 20, maxHz: 20000, minDb: -96, maxDb: 0 };

/** Maps frequency (log) and level (linear dB) to device pixels. */
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

  y(db: number): number {
    const { minDb, maxDb } = this.range;
    return ((maxDb - db) / (maxDb - minDb)) * this.height;
  }
}
