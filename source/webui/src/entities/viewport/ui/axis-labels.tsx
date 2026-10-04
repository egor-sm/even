import { clsx } from 'clsx';

import { formatAxisDb, useStore } from '~/shared/lib';

import { dbLines, frequencyLabels } from '../lib/axis-math';
import { createMapper } from '../lib/geometry';
import { viewportStore } from '../model/viewport';
import styles from './axis-labels.module.css';

/** dB labels of the grid lines, right-aligned in the dB axis. */
export function DbLabels() {
  const range = useStore(viewportStore, (state) => state.view.range);
  const mapper = createMapper(range);

  return dbLines(range).map((db) => (
    <div key={db} className={clsx(styles.label, styles.db)} style={{ top: mapper.y(db) }}>
      {formatAxisDb(db)}
    </div>
  ));
}

/** Hz labels under the plot; they fade out and rise while the axis turns into the keyboard. */
export function FrequencyLabels() {
  const morph = useStore(viewportStore, (state) => state.view.morph);
  if (morph >= 0.999) return null;

  const style = { opacity: 1 - Math.min(1, morph * 1.6), translate: `-50% ${-morph * 8}px` };
  return frequencyLabels(createMapper(1)).map((label) => (
    <div key={label.text} className={clsx(styles.label, styles.frequency)} style={{ ...style, left: label.x }}>
      {label.text}
    </div>
  ));
}
