import { clsx } from 'clsx';

import { useStore } from '~/shared/lib';
import { UiIcon } from '~/shared/ui';

import { analyzerModes, analyzerModeStore, setAnalyzerMode } from '../model/analyzer-mode';
import styles from './analyzer-mode-menu.module.css';

/** The pill in the bottom bar showing the analyzer mode; opens the menu. */
export function AnalyzerModePill({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const mode = useStore(analyzerModeStore, (state) => state.mode);
  const name = analyzerModes.find((entry) => entry.mode === mode)?.name ?? '';

  return (
    <button type="button" className="eq-pill" aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
      <span className="eq-pill__label">Analyzer</span>
      <span>{name}</span>
      <UiIcon name="chevronDown" size={12} />
    </button>
  );
}

/** The analyzer mode menu, opening upwards from its pill; a click outside closes it. */
export function AnalyzerModeMenu({ onClose }: { onClose: () => void }) {
  const current = useStore(analyzerModeStore, (state) => state.mode);

  return (
    <>
      <div className={styles.backdrop} onPointerDown={onClose} />
      <div className={clsx('eq-menu', styles.menu)} role="menu" aria-label="Analyzer">
        {analyzerModes.map(({ mode, name }) => (
          <div key={mode} className={styles.entry}>
            {mode === 'off' && <div className="eq-menu__sep" />}
            <button
              type="button"
              className="eq-menu__item"
              role="menuitemradio"
              aria-checked={mode === current}
              style={mode === current ? { color: 'var(--text-primary)' } : undefined}
              onClick={() => {
                setAnalyzerMode(mode);
                onClose();
              }}
            >
              <span>{name}</span>
              <UiIcon
                name="check"
                size={14}
                style={{ stroke: 'var(--state-focus)', opacity: mode === current ? 1 : 0 }}
              />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
