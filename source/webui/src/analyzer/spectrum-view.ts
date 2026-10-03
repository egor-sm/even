import { Canvas2DCurveRenderer } from './curve-canvas2d';
import type { CurveRenderer } from './curve-renderer';
import { WebGLCurveRenderer } from './curve-webgl';
import { GridLayer } from './grid-layer';
import { defaultRange, SpectrumScale } from './scale';

export type RendererKind = 'canvas2d' | 'webgl';

const createCurveCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.className = 'spectrum';
  return canvas;
};

/** Stacks the static grid layer and a swappable curve layer inside a container element. */
export class SpectrumView {
  private readonly grid: GridLayer;
  private curve: CurveRenderer;
  private scale = new SpectrumScale(defaultRange, 0, 0);

  constructor(
    private readonly container: HTMLElement,
    private readonly onResize: () => void,
  ) {
    this.grid = new GridLayer(createCurveCanvas());
    this.container.append(this.grid.canvas);

    this.curve = new Canvas2DCurveRenderer(createCurveCanvas());
    this.container.append(this.curve.canvas);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  setRenderer(kind: RendererKind): void {
    this.curve.dispose();
    this.curve.canvas.remove();

    // A canvas cannot switch context types, so each renderer gets a fresh one.
    const canvas = createCurveCanvas();
    this.curve = kind === 'webgl' ? new WebGLCurveRenderer(canvas) : new Canvas2DCurveRenderer(canvas);
    this.container.append(canvas);
    this.curve.resize(this.scale);
    this.onResize();
  }

  draw(frequencies: Float32Array, levelsDb: Float32Array): void {
    this.curve.draw(frequencies, levelsDb);
  }

  private resize(): void {
    const pixelRatio = devicePixelRatio;
    this.scale = new SpectrumScale(
      defaultRange,
      Math.round(this.container.clientWidth * pixelRatio),
      Math.round(this.container.clientHeight * pixelRatio),
    );

    this.grid.draw(this.scale);
    this.curve.resize(this.scale);
    this.onResize();
  }
}
