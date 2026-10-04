import { clsx } from 'clsx';

import { bandColorVar, selectionStore, typeNames, useDisplayBands } from '~/entities/band';
import { viewportStore } from '~/entities/viewport';
import { formatFrequency, shallowEqual, useStore } from '~/shared/lib';
import { uiStore } from '~/model/ui';
import { nodeDown, nodePosition, nodeWheel, toGraphPoint } from '~/graph/interactions';

const nodeSize = 14;

/** One node per band at (frequency, gain): select, drag, wheel for q. */
export const BandNodes = () => {
  const bands = useDisplayBands();
  const { selected, solo } = useStore(
    selectionStore,
    (state) => ({ selected: state.selected, solo: state.solo }),
    shallowEqual,
  );
  const drag = useStore(uiStore, (state) => state.drag);
  const range = useStore(viewportStore, (state) => state.view.range);

  return bands.map((band, index) => {
    const { x, y } = nodePosition(band, range);
    if (x < 34 || x > 1272) return null;

    const dragging = drag?.kind === 'node' && drag.slot === band.slot && drag.moved;
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
          const graphElement = event.currentTarget.closest('.graph');
          if (graphElement !== null) nodeDown(band, toGraphPoint(event, graphElement));
        }}
        onWheel={(event) => {
          if (event.deltaY !== 0) nodeWheel(band, event.deltaY < 0);
        }}
      />
    );
  });
};
