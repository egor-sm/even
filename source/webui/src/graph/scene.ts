import { onAnalyzerFrame } from '~/app/connect-backend';
import { native, type Section, toSections } from '~/shared/api';
import { analyzerStats } from '~/dev/stats';
import { type BandsState, bandsStore, findBand } from '~/model/bands';
import { typeIndex } from '~/model/filter-types';
import { type UiState, uiStore } from '~/model/ui';
import { AnalyzerLayer } from '~/graph/analyzer-layer';
import { gridLines, gridMorph, soloRange } from '~/graph/axis-math';
import { CanvasLayer } from '~/shared/lib';
import { drawGhost } from '~/graph/draw-ghost';
import { drawGrid } from '~/graph/draw-grid';
import { drawSolo } from '~/graph/draw-solo';
import { drawResponse, responseDb, sampleFrequencies } from '~/graph/draw-response';
import { createMapper, graph } from '~/graph/geometry';
import { Spectrum } from '~/graph/spectrum';
import { type GraphColors, readGraphColors } from '~/graph/theme-colors';

const maxAnalyzerFps = 60;

type Dirty = { grid: boolean; solo: boolean; response: boolean; ghost: boolean; analyzer: boolean };

/**
 * The canvas layers of the graph, outside of React: redraws a layer in the next animation frame
 * after something it shows changed, and runs the analyzer ballistics while the spectrum moves.
 */
export class GraphScene {
  private readonly grid = new CanvasLayer('graph-canvas grid', graph);
  private readonly analyzer = new AnalyzerLayer();
  private readonly soloLayer = new CanvasLayer('graph-canvas solo', graph);
  private readonly response = new CanvasLayer('graph-canvas response', graph);
  private readonly ghostLayer = new CanvasLayer('graph-canvas ghost', graph);
  private readonly pre = new Spectrum();
  private readonly post = new Spectrum();
  private readonly gridPairs = gridMorph(gridLines(createMapper(1), 'hz'), gridLines(createMapper(1), 'note'));
  private readonly dirty: Dirty = { grid: true, solo: true, response: true, ghost: true, analyzer: true };
  private readonly unsubscribe: (() => void)[];

  private colors: GraphColors;
  private responseCache: { bands: BandsState; frequencies: number[]; bandDb: Map<number, Float64Array> } | null = null;
  private totalDb = new Float64Array(0);
  /** Sections of the selected band with the hovered type, for the ghost curve. */
  private ghost: { key: string; slot: number; sections: Section[] } | null = null;
  private ghostRequest = 0;
  private frame: number | null = null;
  private lastAnalyzerDraw = 0;
  private analyzerMoving = false;

  constructor(
    container: HTMLElement,
    private readonly themeRoot: HTMLElement,
  ) {
    container.append(
      this.grid.canvas,
      this.analyzer.canvas,
      this.soloLayer.canvas,
      this.response.canvas,
      this.ghostLayer.canvas,
    );
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
      bandsStore.subscribe(() => {
        this.updateGhost();
        this.invalidate({ solo: true, response: true, ghost: true });
      }),
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
    for (const canvas of [
      this.grid.canvas,
      this.analyzer.canvas,
      this.soloLayer.canvas,
      this.response.canvas,
      this.ghostLayer.canvas,
    ])
      canvas.remove();
  }

  private analyzerColors() {
    return { fill: this.colors.analyzerFill, pre: this.colors.analyzerPre, post: this.colors.analyzerPost };
  }

  private resize(scalePercent: number): void {
    const scale = scalePercent / 100;
    this.grid.resize(scale);
    this.analyzer.resize(scale);
    this.soloLayer.resize(scale);
    this.response.resize(scale);
    this.ghostLayer.resize(scale);
  }

  private onUiChange(previous: UiState, ui: UiState): void {
    if (previous.scale !== ui.scale) {
      this.resize(ui.scale);
      this.invalidate({ grid: true, solo: true, response: true, ghost: true, analyzer: true });
    }
    if (previous.theme !== ui.theme) {
      // The theme attribute is applied by React after this store change: read the colors next frame.
      requestAnimationFrame(() => {
        this.colors = readGraphColors(this.themeRoot);
        this.analyzer.setColors(this.analyzerColors());
        this.invalidate({ grid: true, solo: true, response: true, ghost: true, analyzer: true });
      });
    }
    if (previous.view !== ui.view) this.invalidate({ grid: true, solo: true, response: true, ghost: true });
    if (previous.selected !== ui.selected || previous.solo !== ui.solo) this.invalidate({ solo: true, response: true });
    if (previous.solo === null && ui.solo !== null) {
      // Fade the highlight in (restart the CSS animation).
      this.soloLayer.canvas.classList.remove('is-entering');
      void this.soloLayer.canvas.offsetWidth;
      this.soloLayer.canvas.classList.add('is-entering');
    }
    if (previous.selected !== ui.selected || previous.hoverType !== ui.hoverType) {
      this.updateGhost();
      this.invalidate({ ghost: true });
    }
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

    if (this.dirty.solo) {
      this.dirty.solo = false;
      const band = findBand(bandsStore.get().bands, ui.solo);
      drawSolo(
        this.soloLayer,
        band === undefined
          ? null
          : {
              mapper,
              range: soloRange(band),
              color: this.colors.bands[band.color - 1] ?? this.colors.focus,
              canvasColor: this.colors.canvas,
            },
      );
    }

    if (this.dirty.response) {
      this.dirty.response = false;
      this.drawResponse(ui);
    }

    if (this.dirty.ghost) {
      this.dirty.ghost = false;
      this.drawGhost(ui);
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
    this.totalDb = totalDb;
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

  // Asks C++ for the selected band's sections with the hovered type; late answers are dropped.
  private updateGhost(): void {
    const { selected, hoverType } = uiStore.get();
    const band = findBand(bandsStore.get().bands, selected);
    if (band === undefined || hoverType === null || hoverType === band.type) {
      this.ghostRequest++;
      this.ghost = null;
      return;
    }

    const key = [band.slot, hoverType, band.f, band.g, band.q, band.slope, band.on].join('|');
    if (this.ghost?.key === key) return;

    const request = ++this.ghostRequest;
    void native.previewBand(band.slot, typeIndex(hoverType)).then((result) => {
      if (request !== this.ghostRequest) return;
      const sections = toSections(result);
      this.ghost = sections === null ? null : { key, slot: band.slot, sections };
      this.invalidate({ ghost: true });
    });
  }

  private drawGhost(ui: UiState): void {
    const bands = bandsStore.get();
    const band = findBand(bands.bands, this.ghost?.slot ?? null);
    const cache = this.responseCache;
    if (this.ghost === null || band === undefined || cache === null || ui.hoverType === null) {
      drawGhost(this.ghostLayer, null);
      return;
    }

    // The total with the band's own response swapped for the previewed one (bypassed bands add nothing).
    const own = cache.bandDb.get(band.slot);
    const previewDb = responseDb(this.ghost.sections, cache.frequencies, bands.sampleRate);
    const totalDb = this.totalDb.map((db, i) => (band.on ? db - (own?.[i] ?? 0) + previewDb[i] : db));
    const mapper = createMapper(ui.view.range);
    drawGhost(this.ghostLayer, {
      mapper,
      frequencies: cache.frequencies,
      totalDb,
      nodeX: mapper.x(band.f),
      color: this.colors.ghost,
    });
  }
}
