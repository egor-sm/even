import * as Juce from '@juce-framework/webview';

import type { Section } from '../graph/response-math';

/** Whether the page runs inside the plugin (the JUCE backend announced its native functions). */
export const hasBackend = (): boolean => {
  const juce: unknown = Reflect.get(window, '__JUCE__');
  const functions: unknown =
    typeof juce === 'object' && juce !== null
      ? Reflect.get(Reflect.get(juce, 'initialisationData') ?? {}, '__juce__functions')
      : undefined;
  return Array.isArray(functions) && functions.includes('getPluginInfo');
};

// In a plain browser (`vp dev` without the plugin) development builds talk to a mock backend instead.
const call = (name: string, ...args: unknown[]): Promise<unknown> => {
  if (hasBackend()) return Juce.getNativeFunction(name)(...args).catch(() => undefined);
  if (import.meta.env.DEV) return import('../dev/mock-backend').then(({ mockNative }) => mockNative[name]?.(args));
  return Promise.resolve(undefined);
};

export type AnalyzerMode = 'prepost' | 'post' | 'pre' | 'off';

/** Native functions registered in PluginEditor::createWebViewOptions(). */
export const native = {
  getPluginInfo: () => call('getPluginInfo'),
  setTestSignal: (enabled: boolean) => call('setTestSignal', enabled),
  setAnalyzerActive: (active: boolean) => call('setAnalyzerActive', active),
  setAnalyzerMode: (mode: AnalyzerMode) => call('setAnalyzerMode', mode),
  /** Asks for the EQ response to be sent again (evenOnResponse). */
  requestResponse: () => call('requestResponse'),
  /** Resolves to the new band's slot (1-based), or undefined when every slot is used. */
  createBand: (typeIndex: number, frequencyHz: number, gainDb: number) =>
    call('createBand', typeIndex, frequencyHz, gainDb),
  deleteBand: (slot: number) => call('deleteBand', slot),
  /** Also adjusts q and gain to suit the new type (model::withShape). */
  setBandShape: (slot: number, typeIndex: number) => call('setBandShape', slot, typeIndex),
  /** Solos a band (only its working range is heard); 0 ends solo. */
  setSolo: (slot: number) => call('setSolo', slot),
  /** Resolves to the sections the band would have with another type (see toSections). */
  previewBand: (slot: number, typeIndex: number) => call('previewBand', slot, typeIndex),
  /** Each resolves to {canUndo, canRedo}. */
  undo: () => call('undo'),
  redo: () => call('redo'),
  getHistoryState: () => call('getHistoryState'),
  /** Resolves to {theme, scale}. */
  getSettings: () => call('getSettings'),
  setSetting: (key: 'theme' | 'scale', value: string | number) => call('setSetting', key, value),
};

/** Sections sent as plain objects (previewBand), or null when the value is not a list of them. */
export const toSections = (value: unknown): Section[] | null => {
  if (!Array.isArray(value)) return null;
  const sections: Section[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const field = (name: string) => Number(Reflect.get(item, name));
    sections.push({
      order: field('order') === 1 ? 1 : 2,
      g: field('g'),
      q: field('q'),
      lowpassMix: field('lowpassMix'),
      bandpassMix: field('bandpassMix'),
      highpassMix: field('highpassMix'),
    });
  }
  return sections.every((section) => Number.isFinite(section.g) && Number.isFinite(section.q)) ? sections : null;
};
