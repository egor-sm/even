import { defaultAnalyzerSettings, setAnalyzerSetting, stepRange, useAnalyzerSettingsStore } from '~/entities/analyzer';
import { type Point, startGesture } from '~/shared/lib';

/** Graph units of vertical drag per 10 dB step of the range. */
const dragPerStep = 30;

/** Dragging the analyzer scale: a step per 30 px, downwards to a larger range. */
export const analyzerRangeDown = (start: Point): void => {
  const from = useAnalyzerSettingsStore.getState().range;
  startGesture(
    { kind: 'analyzerRange' },
    {
      move: (point) => setAnalyzerSetting('range', stepRange(from, Math.round((point.y - start.y) / dragPerStep))),
      end: () => undefined,
    },
  );
};

/** Scrolling up narrows the range by a step, down widens it. */
export const analyzerRangeWheel = (up: boolean): void =>
  setAnalyzerSetting('range', stepRange(useAnalyzerSettingsStore.getState().range, up ? -1 : 1));

export const resetAnalyzerRange = (): void => setAnalyzerSetting('range', defaultAnalyzerSettings.range);
