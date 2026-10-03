import type { SpectrumScale } from './scale';

export const curveStyle = {
  lineColor: [127 / 255, 180 / 255, 255 / 255, 1],
  fillTopColor: [94 / 255, 160 / 255, 255 / 255, 0.45],
  fillBottomColor: [94 / 255, 160 / 255, 255 / 255, 0.02],
  lineWidthCss: 1.5,
} as const;

/** Draws the spectrum curve (fill + line) on its own canvas layer. */
export interface CurveRenderer {
  readonly canvas: HTMLCanvasElement;
  resize(scale: SpectrumScale): void;
  draw(frequencies: Float32Array, levelsDb: Float32Array): void;
  dispose(): void;
}
