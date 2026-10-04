import { Canvas2DCurveRenderer } from './curve-canvas2d';
import type { CurveRenderer } from './curve-renderer';
import { WebGLCurveRenderer } from './curve-webgl';
import { GridLayer } from './grid-layer';
import type { NodePreview } from './pad-interaction';
import type { EqResponse } from './response';
import { ResponseLayer } from './response-layer';
import { defaultRange, SpectrumScale } from './scale';
import type { Spectrum } from './spectrum';

export type RendererKind = 'canvas2d' | 'webgl';

const createCurveCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.className = 'spectrum';
  return canvas;
};

const createCurve = (kind: RendererKind, className: string): CurveRenderer => {
  // A canvas cannot switch context types, so each renderer gets a fresh one.
  const canvas = createCurveCanvas();
  canvas.classList.add(className);
  return kind === 'webgl' ? new WebGLCurveRenderer(canvas) : new Canvas2DCurveRenderer(canvas);
};

/**
 * Stacks the layers inside a container element, bottom to top: static grid, analyzer curves of the
 * input (pre) and output (post) (swappable renderer) and the EQ response overlay.
 */
export class SpectrumView {
  private readonly grid: GridLayer;
  private pre: CurveRenderer;
  private post: CurveRenderer;
  private readonly response: ResponseLayer;
  private scale = new SpectrumScale(defaultRange, 0, 0);
  private readonly resizeObserver = new ResizeObserver(() => this.resize());

  constructor(
    private readonly container: HTMLElement,
    private readonly onResize: () => void,
  ) {
    this.grid = new GridLayer(createCurveCanvas());
    this.container.append(this.grid.canvas);

    this.pre = createCurve('canvas2d', 'pre');
    this.post = createCurve('canvas2d', 'post');
    this.container.append(this.pre.canvas, this.post.canvas);

    this.response = new ResponseLayer(createCurveCanvas());
    this.container.append(this.response.canvas);

    this.resizeObserver.observe(container);
    this.resize();
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    for (const curve of [this.pre, this.post]) {
      curve.dispose();
      curve.canvas.remove();
    }
    this.grid.canvas.remove();
    this.response.canvas.remove();
  }

  setResponse(response: EqResponse): void {
    this.response.setResponse(response);
  }

  setSelectedBand(band: number): void {
    this.response.setSelectedBand(band);
  }

  setNodePreview(preview: NodePreview | null): void {
    this.response.setPreview(preview);
  }

  get currentScale(): SpectrumScale {
    return this.scale;
  }

  setRenderer(kind: RendererKind): void {
    for (const curve of [this.pre, this.post]) {
      curve.dispose();
      curve.canvas.remove();
    }

    this.pre = createCurve(kind, 'pre');
    this.post = createCurve(kind, 'post');
    this.response.canvas.before(this.pre.canvas, this.post.canvas); // keep the EQ overlay on top
    this.pre.resize(this.scale);
    this.post.resize(this.scale);
    this.onResize();
  }

  draw(pre: Spectrum, post: Spectrum): void {
    this.pre.draw(pre.frequencies, pre.display);
    this.post.draw(post.frequencies, post.display);
  }

  private resize(): void {
    const pixelRatio = devicePixelRatio;
    this.scale = new SpectrumScale(
      defaultRange,
      Math.round(this.container.clientWidth * pixelRatio),
      Math.round(this.container.clientHeight * pixelRatio),
    );

    this.grid.draw(this.scale);
    this.pre.resize(this.scale);
    this.post.resize(this.scale);
    this.response.resize(this.scale);
    this.onResize();
  }
}
