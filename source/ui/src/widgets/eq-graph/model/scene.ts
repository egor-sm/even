import { clsx } from 'clsx';

import { AnalyzerLayer, onAnalyzerFrame, Spectrum } from '~/entities/analyzer';
import { type BandsState, useBandsStore, findBand, useSelectionStore } from '~/entities/band';
import { createMapper, graph, gridLines, gridMorph, plotFrequencies, useViewportStore } from '~/entities/viewport';
import { drawGhost, GhostPreview, ghostLayerClass } from '~/features/change-band-type';
import { useSettingsStore } from '~/features/settings';
import { drawSolo, soloLayerEnteringClass, soloRange } from '~/features/solo-band';
import { responseDb, withBandFrequencies } from '~/shared/api';
import { CanvasLayer } from '~/shared/lib';
import { type GraphColors, readGraphColors } from '~/shared/ui';

import { drawGrid } from '../lib/draw-grid';
import { drawResponse } from '../lib/draw-response';
import styles from './scene.module.css';

const maxAnalyzerFps = 60;

type Dirty = { grid: boolean; solo: boolean; response: boolean; ghost: boolean; analyzer: boolean };

/** What the layers show besides the bands and the spectrum, gathered from the stores. */
type SceneState = {
  scale: number;
  theme: 'dark' | 'light';
  view: { range: number; morph: number };
  selected: number | null;
  solo: number | null;
};

const sceneState = (): SceneState => {
  const { scale, theme } = useSettingsStore.getState();
  const { selected, solo } = useSelectionStore.getState();
  return { scale, theme, view: useViewportStore.getState().view, selected, solo };
};

const allDirty: Dirty = { grid: true, solo: true, response: true, ghost: true, analyzer: true };

/**
 * The canvas layers of the graph, outside of React: redraws a layer in the next animation frame
 * after something it shows changed, and runs the analyzer ballistics while the spectrum moves.
 */
export class GraphScene {
  private readonly grid = new CanvasLayer(styles.canvas ?? '', graph);
  private readonly analyzer = new AnalyzerLayer(styles.canvas ?? '', graph);
  private readonly soloLayer = new CanvasLayer(styles.canvas ?? '', graph);
  private readonly response = new CanvasLayer(styles.canvas ?? '', graph);
  private readonly ghostLayer = new CanvasLayer(clsx(styles.canvas, ghostLayerClass), graph);
  private readonly canvases = [
    this.grid.canvas,
    this.analyzer.canvas,
    this.soloLayer.canvas,
    this.response.canvas,
    this.ghostLayer.canvas,
  ];
  private readonly pre = new Spectrum();
  private readonly post = new Spectrum();
  private readonly ghost = new GhostPreview(() => this.invalidate({ ghost: true }));
  private readonly gridPairs = gridMorph(gridLines(createMapper(1), 'hz'), gridLines(createMapper(1), 'note'));
  private readonly dirty: Dirty = { ...allDirty };
  private readonly unsubscribe: (() => void)[];

  private colors: GraphColors;
  private responseCache: { bands: BandsState; frequencies: number[]; bandDb: Map<number, Float64Array> } | null = null;
  private totalDb = new Float64Array(0);
  private frame: number | null = null;
  private lastAnalyzerDraw = 0;

  constructor(
    container: HTMLElement,
    private readonly themeRoot: HTMLElement,
    /** Called after every analyzer frame drawn (development stats). */
    private readonly onAnalyzerDraw?: (now: number) => void,
  ) {
    container.append(...this.canvases);
    this.colors = readGraphColors(themeRoot);
    this.analyzer.setColors(this.analyzerColors());
    this.resize(useSettingsStore.getState().scale);

    let previousState = sceneState();
    const onStateChange = () => {
      const state = sceneState();
      this.onStateChange(previousState, state);
      previousState = state;
    };
    this.unsubscribe = [
      useSettingsStore.subscribe(onStateChange),
      useSelectionStore.subscribe(onStateChange),
      useViewportStore.subscribe(onStateChange),
      useBandsStore.subscribe(() => this.invalidate({ solo: true, response: true, ghost: true })),
      onAnalyzerFrame((frame) => {
        for (const [spectrum, levels] of [
          [this.pre, frame.preDb],
          [this.post, frame.postDb],
        ] as const) {
          if (levels === null) spectrum.clear();
          else spectrum.setLevels(levels, frame.minHz, frame.maxHz);
        }
        this.invalidate({ analyzer: true });
      }),
    ];
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.ghost.dispose();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.analyzer.dispose();
    for (const canvas of this.canvases) canvas.remove();
  }

  private analyzerColors() {
    return { fill: this.colors.analyzerFill, pre: this.colors.analyzerPre, post: this.colors.analyzerPost };
  }

  private resize(scalePercent: number): void {
    const scale = scalePercent / 100;
    for (const layer of [this.grid, this.analyzer, this.soloLayer, this.response, this.ghostLayer]) layer.resize(scale);
  }

  private onStateChange(previous: SceneState, state: SceneState): void {
    if (previous.scale !== state.scale) {
      this.resize(state.scale);
      this.invalidate(allDirty);
    }
    if (previous.theme !== state.theme) {
      // The theme attribute is applied by React after this store change: read the colors next frame.
      requestAnimationFrame(() => {
        this.colors = readGraphColors(this.themeRoot);
        this.analyzer.setColors(this.analyzerColors());
        this.invalidate(allDirty);
      });
    }
    if (previous.view !== state.view) this.invalidate({ grid: true, solo: true, response: true, ghost: true });
    if (previous.selected !== state.selected || previous.solo !== state.solo)
      this.invalidate({ solo: true, response: true });
    if (previous.solo === null && state.solo !== null) {
      // Fade the highlight in (restart the CSS animation).
      this.soloLayer.canvas.classList.remove(soloLayerEnteringClass);
      void this.soloLayer.canvas.offsetWidth;
      this.soloLayer.canvas.classList.add(soloLayerEnteringClass);
    }
  }

  private invalidate(parts: Partial<Dirty>): void {
    Object.assign(this.dirty, Object.fromEntries(Object.entries(parts).filter(([, value]) => value)));
    this.frame ??= requestAnimationFrame(this.render);
  }

  private readonly render = (now: number): void => {
    this.frame = null;
    const state = sceneState();
    const mapper = createMapper(state.view.range);

    if (this.dirty.grid) {
      this.dirty.grid = false;
      drawGrid(this.grid, mapper, this.gridPairs, state.view.morph, this.colors);
    }

    if (this.dirty.solo) {
      this.dirty.solo = false;
      const band = findBand(useBandsStore.getState().bands, state.solo);
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
      this.drawResponse(state);
    }

    if (this.dirty.ghost) {
      this.dirty.ghost = false;
      this.drawGhost(state);
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
      this.analyzer.draw({ ...graph, x: mapper.x, y: mapper.analyzerY }, this.pre, this.post);
      this.onAnalyzerDraw?.(now);

      this.dirty.analyzer = preMoving || postMoving;
      if (this.dirty.analyzer) this.frame ??= requestAnimationFrame(this.render);
    }
  };

  private drawResponse(state: SceneState): void {
    const bands = useBandsStore.getState();
    const mapper = createMapper(state.view.range);
    if (this.responseCache?.bands !== bands) {
      const frequencies = withBandFrequencies(plotFrequencies(mapper), bands.bands);
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
      mapper,
      frequencies,
      bandDb,
      totalDb,
      bands: bands.bands,
      selected: state.selected,
      solo: state.solo,
      colors: this.colors,
    });
  }

  // The total with the selected band's response swapped for the previewed type (bypassed: unchanged).
  private drawGhost(state: SceneState): void {
    const preview = this.ghost.current();
    const cache = this.responseCache;
    if (preview === null || cache === null) {
      drawGhost(this.ghostLayer, null);
      return;
    }

    const { band, sections } = preview;
    const own = cache.bandDb.get(band.slot);
    const previewDb = responseDb(sections, cache.frequencies, useBandsStore.getState().sampleRate);
    const totalDb = this.totalDb.map((db, i) => (band.on ? db - (own?.[i] ?? 0) + previewDb[i] : db));
    const mapper = createMapper(state.view.range);
    drawGhost(this.ghostLayer, {
      mapper,
      frequencies: cache.frequencies,
      totalDb,
      nodeX: mapper.x(band.f),
      color: this.colors.ghost,
    });
  }
}
