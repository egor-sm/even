import { clsx } from 'clsx';

import { rangeLabels, useAnalyzerSettingsStore, useAnalyzerViewStore } from '~/entities/analyzer';
import { analyzerYFor, eventGraphPoint, graph } from '~/entities/viewport';
import { formatAxisDb, useGestureStore } from '~/shared/lib';
import { UiIcon } from '~/shared/ui';

import { analyzerRangeDown, analyzerRangeWheel, resetAnalyzerRange } from '../model/range-gestures';
import styles from './analyzer-settings.module.css';

/**
 * The analyzer's dB scale at the right edge of the plot (0 at the top) and the range control: drag
 * or scroll to change the range, double-click for 120 dB. Hidden while the analyzer is off.
 */
export function AnalyzerScale() {
  const mode = useAnalyzerSettingsStore((state) => state.mode);
  const range = useAnalyzerSettingsStore((state) => state.range);
  const shownRange = useAnalyzerViewStore((state) => state.range);
  const active = useGestureStore((state) => state.active?.kind === 'analyzerRange');
  if (mode === 'off') return null;

  const y = analyzerYFor(shownRange);
  const labels = rangeLabels(range).filter((db) => y(db) >= graph.top - 2 && y(db) <= graph.bottom + 2);

  return (
    <>
      {labels.map((db) => (
        <div key={db} className={styles.mark} style={{ top: y(db) }}>
          {formatAxisDb(db)}
          <span className={styles.tick} />
        </div>
      ))}
      <button
        type="button"
        className={clsx('eq-axis', styles.axis, active && 'is-active')}
        aria-label={`Analyzer range ${range} dB below 0 dB. Drag or scroll to change, double-click for 120 dB`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = eventGraphPoint(event);
          if (point !== null) analyzerRangeDown(point);
        }}
        onDoubleClick={resetAnalyzerRange}
        onWheel={(event) => {
          if (event.deltaY !== 0) analyzerRangeWheel(event.deltaY < 0);
        }}
      >
        <span className="eq-axis__tint" />
        <span className="eq-axis__rail" />
        <span className="eq-axis__tag">
          <UiIcon name="updown" size={11} style={{ stroke: 'var(--state-focus)' }} />
          {range} dB
        </span>
      </button>
    </>
  );
}
