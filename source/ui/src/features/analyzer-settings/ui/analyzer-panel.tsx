import { clsx } from 'clsx';
import { useEffect, useRef } from 'react';

import {
  analyzerModes,
  decays,
  defaultAnalyzerSettings,
  effectiveFftSize,
  fftSizesAt,
  isTuningAtDefaults,
  resetAnalyzerTuning,
  setAnalyzerSetting,
  tilts,
  useAnalyzerSettingsStore,
} from '~/entities/analyzer';
import { useBandsStore } from '~/entities/band';
import { SegmentedControl, UiIcon } from '~/shared/ui';

import styles from './analyzer-settings.module.css';

const modeSegments = analyzerModes.map((mode) => ({ value: mode.value, content: mode.label }));

type TuningKey = 'fftSize' | 'decay' | 'tilt';

type Row = {
  key: TuningKey;
  label: string;
  unit: string;
  hint: string;
  values: readonly number[];
  value: number;
};

const numberSegments = (values: readonly number[]) =>
  values.map((value) => ({ value: String(value), content: String(value) }));

/** The analyzer's settings under the chip: the mode, then FFT size, decay and tilt. */
export function AnalyzerPanel({ onClose }: { onClose: () => void }) {
  const settings = useAnalyzerSettingsStore();
  const sampleRate = useBandsStore((state) => state.sampleRate);
  const modeGroup = useRef<HTMLDivElement>(null);
  const off = settings.mode === 'off';
  const fftSize = effectiveFftSize(settings.fftSize, sampleRate);

  // The keyboard starts on the chosen mode.
  useEffect(() => modeGroup.current?.querySelector<HTMLInputElement>('input:checked')?.focus(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rows: Row[] = [
    {
      key: 'fftSize',
      label: 'FFT size',
      unit: `${Math.round((fftSize / sampleRate) * 1000)} ms`,
      hint: 'Finer low end vs faster response · default 4096',
      values: fftSizesAt(sampleRate),
      value: fftSize,
    },
    {
      key: 'decay',
      label: 'Decay',
      unit: 'dB/s',
      hint: 'How fast the curve falls after a peak · default 30 dB/s',
      values: decays,
      value: settings.decay,
    },
    {
      key: 'tilt',
      label: 'Tilt',
      unit: 'dB/oct',
      hint: 'Slope around 1 kHz · default 4.5 dB/oct',
      values: tilts,
      value: settings.tilt,
    },
  ];

  return (
    <dialog open className={styles.panel} aria-label="Analyzer">
      <div className={styles.title}>Analyzer</div>
      <div ref={modeGroup}>
        <SegmentedControl
          label="Analyzer mode"
          className={clsx('eq-segs', styles.segments)}
          value={settings.mode}
          segments={modeSegments}
          onValueChange={(mode) => setAnalyzerSetting('mode', mode)}
        />
      </div>
      <div className={styles.separator} />
      {rows.map((row) => (
        <div key={row.key} className={clsx(styles.row, off && styles.off)}>
          <span
            className={styles.label}
            title={row.hint}
            onDoubleClick={() => {
              if (!off) setAnalyzerSetting(row.key, defaultAnalyzerSettings[row.key]);
            }}
          >
            <b>{row.label}</b>
            <i>{row.unit}</i>
          </span>
          <SegmentedControl
            label={row.label}
            className={clsx('eq-segs', styles.segments)}
            mono
            disabled={off}
            value={String(row.value)}
            segments={numberSegments(row.values)}
            onValueChange={(value) => setAnalyzerSetting(row.key, Number(value))}
          />
        </div>
      ))}
      <div className={styles.separator} />
      <button
        type="button"
        className={styles.reset}
        disabled={isTuningAtDefaults(settings)}
        onClick={resetAnalyzerTuning}
      >
        <UiIcon name="reset" size={13} />
        Reset to defaults
      </button>
    </dialog>
  );
}
