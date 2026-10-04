import * as Juce from '@juce-framework/webview';

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
  /** Each resolves to {canUndo, canRedo}. */
  undo: () => call('undo'),
  redo: () => call('redo'),
  getHistoryState: () => call('getHistoryState'),
  /** Resolves to {theme, scale}. */
  getSettings: () => call('getSettings'),
  setSetting: (key: 'theme' | 'scale', value: string | number) => call('setSetting', key, value),
};
