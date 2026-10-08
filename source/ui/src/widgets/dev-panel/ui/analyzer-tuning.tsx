import {
  defaultDisplayTuning,
  setAnalyzerOptions,
  setDisplayTuning,
  useAnalyzerTuningStore,
} from '~/entities/analyzer';
import { type AnalyzerOptions, defaultAnalyzerOptions } from '~/shared/api';
import { Checkbox, SelectMenu, type SelectMenuOption } from '~/shared/ui';

import styles from './dev-panel.module.css';

type Options<Value extends string> = readonly SelectMenuOption<Value>[];

const windows: Options<AnalyzerOptions['window']> = [
  { value: 'blackmanHarris', label: 'Blackman-Harris' },
  { value: 'hann', label: 'Hann' },
];
const windowLengths: Options<'1024' | '2048' | '4096' | '8192'> = [
  { value: '1024', label: '1024' },
  { value: '2048', label: '2048' },
  { value: '4096', label: '4096' },
  { value: '8192', label: '8192' },
];
const windowLengthByValue = { '1024': 1024, '2048': 2048, '4096': 4096, '8192': 8192 } as const;
const paddings: Options<'1' | '2' | '4'> = [
  { value: '1', label: '×1' },
  { value: '2', label: '×2' },
  { value: '4', label: '×4' },
];
const paddingByValue = { '1': 1, '2': 2, '4': 4 } as const;
const kernels: Options<AnalyzerOptions['kernel']> = [
  { value: 'roundedBox', label: 'Rounded box' },
  { value: 'box', label: 'Box' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'hann', label: 'Hann' },
  { value: 'gaussian', label: 'Gaussian' },
];
const fractions: Options<string> = [3, 4, 5, 6, 8, 12].map((value) => ({ value: String(value), label: `1/${value}` }));
const widths: Options<AnalyzerOptions['width']> = [
  { value: 'constant', label: 'Constant' },
  { value: 'psychoacoustic', label: 'Psychoacoustic' },
  { value: 'erb', label: 'ERB' },
];
const lowEnds: Options<AnalyzerOptions['lowEnd']> = [
  { value: 'linearPower', label: 'Linear power' },
  { value: 'monotoneDb', label: 'Monotone dB' },
  { value: 'minimumWidth', label: 'Min width' },
];
const minimumBins: Options<string> = [1, 2, 3, 4].map((value) => ({ value: String(value), label: String(value) }));
const averaging: Options<string> = [0, 75, 150, 300].map((value) => ({
  value: String(value),
  label: value === 0 ? 'Off' : `${value} ms`,
}));
const ranges: Options<string> = [60, 90, 120].map((value) => ({ value: String(value), label: `${value} dB` }));
const tilts: Options<string> = [0, 3, 4.5, 6].map((value) => ({ value: String(value), label: `${value} dB/oct` }));
const attacks: Options<string> = [10, 30, 60].map((value) => ({ value: String(value), label: `${value} ms` }));
const decays: Options<string> = [15, 30, 60, 120, 240].map((value) => ({
  value: String(value),
  label: `${value} dB/s`,
}));
const curves: Options<'polyline' | 'monotone'> = [
  { value: 'polyline', label: 'Polyline' },
  { value: 'monotone', label: 'Monotone' },
];
const lines: Options<'chord' | 'mitred'> = [
  { value: 'chord', label: 'Chord' },
  { value: 'mitred', label: 'Mitred AA' },
];

const resetToDefaults = () => {
  setAnalyzerOptions(defaultAnalyzerOptions);
  setDisplayTuning(defaultDisplayTuning);
};

/** Switches between the analyzer variants: C++ analysis on the left, the page's drawing on the right. */
export function AnalyzerTuning() {
  const { options, display } = useAnalyzerTuningStore();

  return (
    <div className={styles.tuning}>
      <div className={styles.column}>
        <SelectMenu
          label="Window"
          value={options.window}
          options={windows}
          onValueChange={(window) => setAnalyzerOptions({ window })}
        />
        <SelectMenu
          label="FFT size"
          value={`${options.windowLength}` as const}
          options={windowLengths}
          onValueChange={(value) => setAnalyzerOptions({ windowLength: windowLengthByValue[value] })}
        />
        <SelectMenu
          label="Zero-pad"
          value={`${options.zeroPadding}` as const}
          options={paddings}
          onValueChange={(value) => setAnalyzerOptions({ zeroPadding: paddingByValue[value] })}
        />
        <SelectMenu
          label="Kernel"
          value={options.kernel}
          options={kernels}
          onValueChange={(kernel) => setAnalyzerOptions({ kernel })}
        />
        <SelectMenu
          label="Octave"
          value={String(Math.round(1 / options.octaves))}
          options={fractions}
          onValueChange={(value) => setAnalyzerOptions({ octaves: 1 / Number(value) })}
        />
        <SelectMenu
          label="Width"
          value={options.width}
          options={widths}
          onValueChange={(width) => setAnalyzerOptions({ width })}
        />
        <SelectMenu
          label="Low end"
          value={options.lowEnd}
          options={lowEnds}
          onValueChange={(lowEnd) => setAnalyzerOptions({ lowEnd })}
        />
        <SelectMenu
          label="Min bins"
          value={String(options.minimumBins)}
          options={minimumBins}
          onValueChange={(value) => setAnalyzerOptions({ minimumBins: Number(value) })}
        />
        <SelectMenu
          label="Average"
          value={String(options.averagingMs)}
          options={averaging}
          onValueChange={(value) => setAnalyzerOptions({ averagingMs: Number(value) })}
        />
        <Checkbox checked={options.lowFft} onCheckedChange={(lowFft) => setAnalyzerOptions({ lowFft })}>
          Long FFT below 240 Hz
        </Checkbox>
      </div>
      <div className={styles.column}>
        <SelectMenu
          label="Range"
          value={String(display.rangeDb)}
          options={ranges}
          onValueChange={(value) => setDisplayTuning({ rangeDb: Number(value) })}
        />
        <SelectMenu
          label="Tilt"
          value={String(display.slopeDbPerOctave)}
          options={tilts}
          onValueChange={(value) => setDisplayTuning({ slopeDbPerOctave: Number(value) })}
        />
        <SelectMenu
          label="Attack"
          value={String(display.attackMs)}
          options={attacks}
          onValueChange={(value) => setDisplayTuning({ attackMs: Number(value) })}
        />
        <SelectMenu
          label="Decay"
          value={String(display.decayDbPerSecond)}
          options={decays}
          onValueChange={(value) => setDisplayTuning({ decayDbPerSecond: Number(value) })}
        />
        <SelectMenu
          label="Curve"
          value={display.curve}
          options={curves}
          onValueChange={(curve) => setDisplayTuning({ curve })}
        />
        <SelectMenu
          label="Line"
          value={display.line}
          options={lines}
          onValueChange={(line) => setDisplayTuning({ line })}
        />
        <button type="button" className={styles.preset} onClick={resetToDefaults}>
          Defaults
        </button>
      </div>
    </div>
  );
}
