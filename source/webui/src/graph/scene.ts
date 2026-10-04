import { onAnalyzerFrame } from '../bridge/connection';
import { analyzerStats } from '../dev/stats';
import { type BandsState, bandsStore } from '../model/bands';
import { type UiState, uiStore } from '../model/ui';
import { AnalyzerLayer } from './analyzer-layer';
import { gridLines, gridMorph } from './axis-math';
import { CanvasLayer } from './canvas-layer';
import { drawGrid } from './draw-grid';
import { drawResponse, responseDb, sampleFrequencies } from './draw-response';
import { createMapper } from './geometry';
import { Spectrum } from './spectrum';
import { type GraphColors, readGraphColors } from './theme-colors';

const maxAnalyzerFps = 60;

type Dirty = { grid: boolean; response: boolean; analyzer: boolean };

/**
 * The canvas layers of the graph, outside of React: redraws a layer in the next animation frame
 * after something it shows changed, and runs the analyzer ballistics while the spectrum moves.
 */
export class GraphScene {
  private readonly grid = new CanvasLayer('grid');
  private readonly analyzer = new AnalyzerLayer();
  private readonly response = new CanvasLayer('response');
  private readonly pre = new Spectrum();
  private readonly post = new Spectrum();
  private readonly gridPairs = gridMorph(gridLines(createMapper(1), 'hz'), gridLines(createMapper(1), 'note'));
  private readonly dirty: Dirty = { grid: true, response: true, analyzer: true };
  private readonly unsubscribe: (() => void)[];

  private colors: GraphColors;
  private responseCache: { bands: BandsState; frequencies: number[]; bandDb: Map<number, Float64Array> } | null = null;
  private frame: number | null = null;
  private lastAnalyzerDraw = 0;
  private analyzerMoving = false;

  constructor(
    container: HTMLElement,
    private readonly themeRoot: HTMLElement,
  ) {
    container.append(this.grid.canvas, this.analyzer.canvas, this.response.canvas);
    this.colors = readGraphColors(themeRoot);
    this.analyzer.setColors(this.analyzerColors());
    this.resize(uiStore.get().scale);

    let previousUi = uiStore.get();
    this.unsubscribe = [
      uiStore.subscribe(() => {
        const ui = uiStore.get();
        this.onUiChange(previousUi, ui);
        previousUi = ui;
      }),
      bandsStore.subscribe(() => this.invalidate({ response: true })),
      onAnalyzerFrame((frame, info) => {
        const receivedAt = performance.now();
        for (const [spectrum, levels] of [
          [this.pre, frame.preDb],
          [this.post, frame.postDb],
        ] as const) {
          if (levels === null) spectrum.clear();
          else spectrum.setLevels(levels, frame.minHz, frame.maxHz);
        }
        analyzerStats.onFrame(receivedAt, info.latencyMs, info.bytes, performance.now() - receivedAt);
        this.analyzerMoving = true;
        this.invalidate({ analyzer: true });
      }),
    ];
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.analyzer.dispose();
    for (const canvas of [this.grid.canvas, this.analyzer.canvas, this.response.canvas]) canvas.remove();
  }

  private analyzerColors() {
    return { fill: this.colors.analyzerFill, pre: this.colors.analyzerPre, post: this.colors.analyzerPost };
  }

  private resize(scalePercent: number): void {
    const scale = scalePercent / 100;
    this.grid.resize(scale);
    this.analyzer.resize(scale);
    this.response.resize(scale);
  }

  private onUiChange(previous: UiState, ui: UiState): void {
    if (previous.scale !== ui.scale) {
      this.resize(ui.scale);
      this.invalidate({ grid: true, response: true, analyzer: true });
    }
    if (previous.theme !== ui.theme) {
      // The theme attribute is applied by React after this store change: read the colors next frame.
      requestAnimationFrame(() => {
        this.colors = readGraphColors(this.themeRoot);
        this.analyzer.setColors(this.analyzerColors());
        this.invalidate({ grid: true, response: true, analyzer: true });
      });
    }
    if (previous.view !== ui.view) this.invalidate({ grid: true, response: true, analyzer: false });
    if (previous.selected !== ui.selected || previous.solo !== ui.solo) this.invalidate({ response: true });
  }

  private invalidate(parts: Partial<Dirty>): void {
    Object.assign(this.dirty, Object.fromEntries(Object.entries(parts).filter(([, value]) => value)));
    this.frame ??= requestAnimationFrame(this.render);
  }

  private readonly render = (now: number): void => {
    this.frame = null;
    const ui = uiStore.get();
    const mapper = createMapper(ui.view.range);

    if (this.dirty.grid) {
      this.dirty.grid = false;
      drawGrid(this.grid, mapper, this.gridPairs, ui.view.morph, this.colors);
    }

    if (this.dirty.response) {
      this.dirty.response = false;
      this.drawResponse(ui);
    }

    if (this.dirty.analyzer) {
      // On high refresh rate displays keep the analyzer at most at 60 frames per second.
      if (now - this.lastAnalyzerDraw < 1000 / maxAnalyzerFps - 1) {
        this.frame ??= requestAnimationFrame(this.render);
        return;
      }
      const dt = Math.min((now - this.lastAnalyzerDraw) / 1000, 0.1);
      this.lastAnalyzerDraw = now;

      const preMoving = this.pre.tick(dt);
      const postMoving = this.post.tick(dt);
      this.analyzer.draw(mapper, this.pre, this.post);
      analyzerStats.onRender(now);

      this.analyzerMoving = preMoving || postMoving;
      this.dirty.analyzer = this.analyzerMoving;
      if (this.analyzerMoving) this.frame ??= requestAnimationFrame(this.render);
    }
  };

  private drawResponse(ui: UiState): void {
    const bands = bandsStore.get();
    if (this.responseCache?.bands !== bands) {
      const mapper = createMapper(ui.view.range);
      const frequencies = sampleFrequencies(mapper, bands.bands);
      const bandDb = new Map(
        bands.bands.map((band) => [band.slot, responseDb(band.sections, frequencies, bands.sampleRate)] as const),
      );
      this.responseCache = { bands, frequencies, bandDb };
    }

    const { frequencies, bandDb } = this.responseCache;
    const totalDb = new Float64Array(frequencies.length);
    for (const band of bands.bands) {
      const db = bandDb.get(band.slot);
      if (!band.on || db === undefined) continue;
      for (let i = 0; i < totalDb.length; i++) totalDb[i] += db[i]; // bands in series: dB add up
    }

    drawResponse(this.response, {
      mapper: createMapper(ui.view.range),
      frequencies,
      bandDb,
      totalDb,
      bands: bands.bands,
      selected: ui.selected,
      solo: ui.solo,
      colors: this.colors,
    });
  }
}
