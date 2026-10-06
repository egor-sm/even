import { clsx } from 'clsx';

import { bandColorVar, findBand, hasQHandles, useSelectionStore, useDisplayBands } from '~/entities/band';
import { createMapper, useViewportStore } from '~/entities/viewport';
import { useGestureStore } from '~/shared/lib';

import { qHandlePoint } from '../lib/q-handle-point';
import { qDown } from '../model/q-gesture';
import styles from './q-handles.module.css';

/** Two handles on the 0 dB line at the edges of the selected bell, notch or band pass (its width): drag for q. */
export function QHandles() {
  const bands = useDisplayBands();
  const selected = useSelectionStore((state) => state.selected);
  const gesture = useGestureStore((state) => state.active);
  const range = useViewportStore((state) => state.view.range);
  const band = findBand(bands, selected);
  const nodeMoving = gesture?.kind === 'node' && gesture.moved === true;
  if (band === undefined || !hasQHandles(band.type) || nodeMoving) return null;

  const mapper = createMapper(range);

  return ([-1, 1] as const).map((side) => {
    const { x, y } = qHandlePoint(band, side, mapper);
    const active = gesture?.kind === 'q';

    return (
      <button
        key={side}
        type="button"
        className={clsx('eq-qh', styles.handle, active && 'is-active', !band.on && 'is-bypassed')}
        aria-label={side < 0 ? 'Q, lower edge' : 'Q, upper edge'}
        style={{
          ['--band' as string]: bandColorVar(band.color),
          position: 'absolute',
          left: x - 4,
          top: y - 10,
          zIndex: 34,
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          qDown(band);
        }}
      />
    );
  });
}
