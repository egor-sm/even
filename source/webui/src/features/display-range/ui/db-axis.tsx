import { clsx } from 'clsx';

import { eventGraphPoint, viewportStore } from '~/entities/viewport';
import { gestureStore, useStore } from '~/shared/lib';
import { UiIcon } from '~/shared/ui';

import { fitRangeToBands, rangeDown, rangeWheel } from '../model/range-gestures';

/** The dB axis: drag or scroll to change the display range, double-click to fit it to the bands. */
export function DbAxis() {
  const range = useStore(viewportStore, (state) => state.range);
  const active = useStore(gestureStore, (state) => state.active?.kind === 'range');

  return (
    <button
      type="button"
      className={clsx('eq-axis is-y', active && 'is-active')}
      aria-label={`Display range ±${range} dB. Drag or scroll to change, double-click to fit`}
      style={{ position: 'absolute', left: 0, top: 26, height: 602 }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = eventGraphPoint(event);
        if (point !== null) rangeDown(point);
      }}
      onDoubleClick={fitRangeToBands}
      onWheel={(event) => {
        if (event.deltaY !== 0) rangeWheel(event.deltaY < 0);
      }}
    >
      <span className="eq-axis__tint" />
      <span className="eq-axis__rail" />
      <span className="eq-axis__tag">
        <UiIcon name="updown" size={11} style={{ stroke: 'var(--state-focus)' }} />±{range} dB
      </span>
    </button>
  );
}
