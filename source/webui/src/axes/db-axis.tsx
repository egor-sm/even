import { UiIcon } from '../design/icons';
import { uiStore } from '../model/ui';
import { shallowEqual, useStore } from '../store/store';
import { fitRangeToBands, rangeDown, rangeWheel, toGraphPoint } from '../graph/interactions';

/** The dB axis: drag or scroll to change the display range, double-click to fit it to the bands. */
export const DbAxis = () => {
  const { range, active } = useStore(
    uiStore,
    (state) => ({ range: state.range, active: state.drag?.kind === 'range' }),
    shallowEqual,
  );

  return (
    <button
      type="button"
      className={`eq-axis is-y${active ? ' is-active' : ''}`}
      aria-label={`Display range ±${range} dB. Drag or scroll to change, double-click to fit`}
      style={{ position: 'absolute', left: 0, top: 26, height: 602 }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const graphElement = event.currentTarget.closest('.graph');
        if (graphElement !== null) rangeDown(toGraphPoint(event, graphElement));
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
};
