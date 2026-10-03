import { decodeBase64Frame } from './frame';
import { PadInteraction } from './pad-interaction';
import { decodeBase64Response, type EqResponse } from './response';
import { Spectrum } from './spectrum';
import { SpectrumView, type RendererKind } from './spectrum-view';
import { AnalyzerStats } from './stats';

declare global {
  interface Window {
    /** Called by C++ (PluginEditor::handleAsyncUpdate) via evaluateJavascript for every analyzer frame. */
    eqitOnAnalyzerFrame?: (sentAtMs: number, frameBase64: string) => void;
    /** Called by C++ (PluginEditor::timerCallback) whenever the EQ response changes. */
    eqitOnResponse?: (responseBase64: string) => void;
  }
}

const maxRenderFps = 60;

/**
 * Owns the analyzer runtime outside of React: receives frames from C++, runs ballistics and
 * redraws on demand (at most maxRenderFps, only while the curve moves).
 */
export class AnalyzerController {
  readonly stats = new AnalyzerStats();

  private readonly spectrum = new Spectrum();
  private readonly view: SpectrumView;
  private readonly pad: PadInteraction;
  private response: EqResponse | null = null;
  private selectedBand = 1;
  private animationFrame: number | null = null;
  private lastRenderAt = 0;

  constructor(container: HTMLElement, renderer: RendererKind, onSelectBand: (band: number) => void) {
    this.view = new SpectrumView(container, this.requestRender);
    this.view.setRenderer(renderer);
    this.pad = new PadInteraction(container, {
      getScale: () => this.view.currentScale,
      getResponse: () => this.response,
      getSelectedBand: () => this.selectedBand,
      selectBand: onSelectBand,
      previewNode: (preview) => this.view.setNodePreview(preview),
    });
    window.eqitOnAnalyzerFrame = this.onFrame;
    window.eqitOnResponse = this.onResponse;
  }

  setRenderer(kind: RendererKind): void {
    this.view.setRenderer(kind);
  }

  setSelectedBand(band: number): void {
    this.selectedBand = band;
    this.view.setSelectedBand(band);
  }

  dispose(): void {
    if (window.eqitOnAnalyzerFrame === this.onFrame) delete window.eqitOnAnalyzerFrame;
    if (window.eqitOnResponse === this.onResponse) delete window.eqitOnResponse;
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.pad.dispose();
    this.view.dispose();
  }

  private readonly onFrame = (sentAtMs: number, frameBase64: string): void => {
    const receivedAt = performance.now();
    const frame = decodeBase64Frame(frameBase64);
    if (frame === null) return;

    this.spectrum.setFrame(frame);
    this.stats.onFrame(receivedAt, Date.now() - sentAtMs, frameBase64.length, performance.now() - receivedAt);
    this.requestRender();
  };

  private readonly onResponse = (responseBase64: string): void => {
    const response = decodeBase64Response(responseBase64);
    if (response === null) return;

    this.response = response;
    this.view.setResponse(response);
  };

  private readonly requestRender = (): void => {
    this.animationFrame ??= requestAnimationFrame(this.render);
  };

  private readonly render = (now: number): void => {
    this.animationFrame = null;

    // On high refresh rate displays skip frames to stay within maxRenderFps.
    if (now - this.lastRenderAt < 1000 / maxRenderFps - 1) {
      this.requestRender();
      return;
    }

    const dtSeconds = Math.min((now - this.lastRenderAt) / 1000, 0.1);
    this.lastRenderAt = now;

    const moving = this.spectrum.tick(dtSeconds);
    this.view.draw(this.spectrum.frequencies, this.spectrum.display);
    this.stats.onRender(now);

    if (moving) this.requestRender();
  };
}
