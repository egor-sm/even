import { clsx } from 'clsx';

import { bandColorVar, hasGain, selectionStore, typeNames, useDisplayBands } from '~/entities/band';
import { eventGraphPoint, nodePoint, viewportStore } from '~/entities/viewport';
import { formatFrequency, gestureStore, shallowEqual, useStore } from '~/shared/lib';

import { nodeDown, nodeWheel } from '../model/node-gestures';

const nodeSize = 14;

/** One node per band at (frequency, gain): select, drag, wheel for q. */
export function BandNodes() {
  const bands = useDisplayBands();
  const { selected, solo } = useStore(
    selectionStore,
    (state) => ({ selected: state.selected, solo: state.solo }),
    shallowEqual,
  );
  const gesture = useStore(gestureStore, (state) => state.active);
  const range = useStore(viewportStore, (state) => state.view.range);

  return bands.map((band, index) => {
    const { x, y } = nodePoint(band.f, hasGain(band.type) ? band.g : 0, range);
    if (x < 34 || x > 1272) return null;

    const dragging = gesture?.kind === 'node' && gesture.slot === band.slot && gesture.moved === true;
    return (
      <button
        key={band.slot}
        type="button"
        className={clsx(
          'eq-node',
          band.slot === selected && 'is-selected',
          !band.on && 'is-bypassed',
          dragging && 'is-dragging',
        )}
        aria-label={`Band ${index + 1}, ${typeNames[band.type]} ${formatFrequency(band.f)}`}
        style={{
          ['--band' as string]: bandColorVar(band.color),
          position: 'absolute',
          left: x - nodeSize / 2,
          top: y - nodeSize / 2,
          opacity: solo !== null && solo !== band.slot ? 0.35 : 1,
          transition:
            'opacity var(--dur-base), box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = eventGraphPoint(event);
          if (point !== null) nodeDown(band, point);
        }}
        onWheel={(event) => {
          if (event.deltaY !== 0) nodeWheel(band, event.deltaY < 0);
        }}
      />
    );
  });
}
