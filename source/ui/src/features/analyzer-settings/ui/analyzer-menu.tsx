import { useCallback, useRef, useState } from 'react';

import { analyzerModes, includesPost, includesPre, useAnalyzerSettingsStore } from '~/entities/analyzer';
import { UiIcon } from '~/shared/ui';

import { AnalyzerPanel } from './analyzer-panel';
import styles from './analyzer-settings.module.css';

/**
 * The legend of the spectra in the graph's top right corner, which opens the analyzer's settings:
 * the mode, FFT size, decay and tilt. A click outside closes the panel (and goes no further), as do
 * Escape and the chip.
 */
export function AnalyzerMenu() {
  const mode = useAnalyzerSettingsStore((state) => state.mode);
  const [open, setOpen] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const label = analyzerModes.find((candidate) => candidate.value === mode)?.label ?? '';
  const closeAndFocusChip = useCallback(() => {
    setOpen(false);
    chip.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={chip}
        type="button"
        className={styles.chip}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Analyzer: ${label}`}
        onClick={() => setOpen(!open)}
      >
        {includesPre(mode) && (
          <span className={styles.legend}>
            <i className={styles.pre} />
            Pre
          </span>
        )}
        {includesPost(mode) && (
          <span className={styles.legend}>
            <i className={styles.post} />
            Post
          </span>
        )}
        {mode === 'off' && <span>Analyzer off</span>}
        <UiIcon name="chevronDown" size={12} />
      </button>
      {open && (
        <>
          <div
            className={styles.backdrop}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }}
          />
          <AnalyzerPanel onClose={closeAndFocusChip} />
        </>
      )}
    </>
  );
}
