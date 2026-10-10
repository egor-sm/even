import type { AnalyzerMode, AnalyzerSettings } from '~/shared/api';

export const analyzerModes: readonly { value: AnalyzerMode; label: string }[] = [
  { value: 'prepost', label: 'Pre + Post' },
  { value: 'post', label: 'Post' },
  { value: 'pre', label: 'Pre' },
  { value: 'off', label: 'Off' },
];

export const analyzerRanges = [60, 70, 80, 90, 100, 110, 120] as const;
export const fftSizes = [1024, 2048, 4096, 8192, 16384] as const;
export const decays = [15, 30, 60, 120, 240] as const;
export const tilts = [0, 3, 4.5, 6] as const;

/** The largest FFT size is only offered (and used by C++) from this sample rate up. */
export const minRateForLargestFftSize = 88200;

export const defaultAnalyzerSettings: AnalyzerSettings = {
  mode: 'prepost',
  range: 120,
  fftSize: 4096,
  decay: 30,
  tilt: 4.5,
};

/** The FFT sizes to choose from at a sample rate. */
export const fftSizesAt = (sampleRate: number): readonly number[] =>
  sampleRate >= minRateForLargestFftSize ? fftSizes : fftSizes.slice(0, -1);

/** The size C++ analyses with (SpectrumAnalyzer::effectiveFftSize): 16384 falls back to 8192 below 88.2 kHz. */
export const effectiveFftSize = (fftSize: number, sampleRate: number): number => {
  const available = fftSizesAt(sampleRate);
  return Math.min(fftSize, available[available.length - 1] ?? fftSize);
};

/** The range `steps` steps of 10 dB away, within 60…120. */
export const stepRange = (range: number, steps: number): number => {
  const index = analyzerRanges.findIndex((candidate) => candidate >= range);
  const from = index < 0 ? analyzerRanges.length - 1 : index;
  return analyzerRanges[Math.min(Math.max(from + steps, 0), analyzerRanges.length - 1)];
};

/** Levels labelled on the scale: 0 down to −range, every 10 dB up to a range of 70, else every 20. */
export const rangeLabels = (range: number): number[] => {
  const step = range <= 70 ? 10 : 20;
  const labels: number[] = [];
  for (let db = 0; db >= -range; db -= step) labels.push(db);
  return labels;
};

/** FFT size, decay and tilt as they are by default (Reset to defaults leaves the mode and the range). */
export const isTuningAtDefaults = (settings: AnalyzerSettings): boolean =>
  settings.fftSize === defaultAnalyzerSettings.fftSize &&
  settings.decay === defaultAnalyzerSettings.decay &&
  settings.tilt === defaultAnalyzerSettings.tilt;

export const includesPre = (mode: AnalyzerMode): boolean => mode === 'prepost' || mode === 'pre';
export const includesPost = (mode: AnalyzerMode): boolean => mode === 'prepost' || mode === 'post';
