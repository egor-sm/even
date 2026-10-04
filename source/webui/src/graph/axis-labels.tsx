import { uiStore } from '../model/ui';
import { formatAxisDb } from '../model/format';
import { useStore } from '../store/store';
import { dbLines, frequencyLabels } from './axis-math';
import { createMapper } from './geometry';

/** dB labels of the grid lines, right-aligned in the dB axis. */
export const DbLabels = () => {
  const range = useStore(uiStore, (state) => state.view.range);
  const mapper = createMapper(range);

  return dbLines(range).map((db) => (
    <div key={db} className="db-label" style={{ top: mapper.y(db) }}>
      {formatAxisDb(db)}
    </div>
  ));
};

/** Hz labels under the plot; they fade out and rise while the axis turns into the keyboard. */
export const FrequencyLabels = () => {
  const morph = useStore(uiStore, (state) => state.view.morph);
  if (morph >= 0.999) return null;

  const style = { opacity: 1 - Math.min(1, morph * 1.6), translate: `-50% ${-morph * 8}px` };
  return frequencyLabels(createMapper(1)).map((label) => (
    <div key={label.text} className="frequency-label" style={{ ...style, left: label.x }}>
      {label.text}
    </div>
  ));
};
