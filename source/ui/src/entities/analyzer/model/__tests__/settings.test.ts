import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { recordingBackend } from '~/shared/testing';

import { defaultAnalyzerSettings } from '../../lib/settings-values';
import { applyAnalyzerSettings, resetAnalyzerTuning, setAnalyzerSetting, useAnalyzerSettingsStore } from '../settings';

describe('analyzer settings', () => {
  let backend: ReturnType<typeof recordingBackend>;

  beforeEach(() => {
    backend = recordingBackend();
    useAnalyzerSettingsStore.setState(defaultAnalyzerSettings);
  });

  it('shows a change at once and hands it to C++', () => {
    setAnalyzerSetting('decay', 60);

    expect(useAnalyzerSettingsStore.getState().decay).toBe(60);
    expect(backend.named('setSetting')).toEqual([{ name: 'setSetting', args: ['analyzer.decay', 60] }]);
  });

  it('resets the FFT size, decay and tilt, leaving the mode and the range', () => {
    useAnalyzerSettingsStore.setState({ mode: 'post', range: 80, fftSize: 16384, decay: 15, tilt: 0 });
    resetAnalyzerTuning();

    expect(useAnalyzerSettingsStore.getState()).toEqual({ ...defaultAnalyzerSettings, mode: 'post', range: 80 });
    expect(backend.named('setSetting').map((call) => call.args)).toEqual([
      ['analyzer.fftSize', 4096],
      ['analyzer.decay', 30],
      ['analyzer.tilt', 4.5],
    ]);
  });

  it('takes the settings C++ answers, ignoring what it does not know', () => {
    applyAnalyzerSettings({
      theme: 'dark',
      analyzer: { mode: 'pre', range: 70, fftSize: 'big', decay: 60, tilt: 3, extra: 1 },
    });
    expect(useAnalyzerSettingsStore.getState()).toEqual({ mode: 'pre', range: 70, fftSize: 4096, decay: 60, tilt: 3 });

    applyAnalyzerSettings({ analyzer: { mode: 'both' } });
    applyAnalyzerSettings(undefined);
    expect(useAnalyzerSettingsStore.getState().mode).toBe('pre');
  });
});
