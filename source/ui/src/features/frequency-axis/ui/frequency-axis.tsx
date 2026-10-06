import { type PointerEvent, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { bandColorVar, useDisplayBands } from '~/entities/band';
import {
  type AxisMode,
  createMapper,
  graph,
  keyboardPaths,
  keyDot,
  keyPath,
  eventGraphPoint,
  useViewportStore,
} from '~/entities/viewport';
import { clamp, useGestureStore } from '~/shared/lib';
import { type Segment, SegmentedControl, UiIcon } from '~/shared/ui';

import { keyDown, keyUnder } from '../model/key-gestures';

const axisLeft = graph.left;

const axisSegments: readonly Segment<AxisMode>[] = [
  { value: 'hz', content: 'Hz' },
  { value: 'note', content: <UiIcon name="note" size={12} />, label: 'Notes' },
];
const axisTop = graph.bottom;

/** Pointer position on the keyboard: graph x, and y from the keyboard's top. */
const keyboardPoint = (event: PointerEvent<SVGSVGElement>) => {
  const point = eventGraphPoint(event);
  if (point === null) return null;
  return { point, keyboardY: point.y - axisTop };
};

/**
 * The frequency axis: Hz labels (drawn by FrequencyLabels) or a piano keyboard. Hovering shows the
 * Hz | notes switch; the keyboard moves the selected band to a note (Alt + click: a new band).
 */
export function FrequencyAxis() {
  const { axis, morph, hotKey } = useViewportStore(
    useShallow((state) => ({ axis: state.axis, morph: state.view.morph, hotKey: state.hotKey })),
  );
  const bands = useDisplayBands();
  const mapper = useMemo(() => createMapper(1), []);
  const keys = useMemo(() => keyboardPaths(mapper), [mapper]);
  const notes = axis === 'note';

  // The keyboard appears with the morph: white keys first, then the black keys, then the band dots.
  const keysOpacity = Math.min(1, morph * 1.4);
  const blackOpacity = clamp((morph - 0.35) / 0.65, 0, 1);
  const dotsOpacity = clamp((morph - 0.6) / 0.4, 0, 1);
  const wipe = (1 - clamp(morph * 1.25, 0, 1)) * 100;

  return (
    <div
      className="eq-axis is-x"
      style={{
        position: 'absolute',
        left: axisLeft,
        top: axisTop,
        width: graph.right - graph.left,
        zIndex: 'var(--z-axis)',
      }}
    >
      <span className="eq-axis__tint" />
      <span className="eq-axis__rail" />
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: notes ? 'auto' : 'none' }}>
        {morph > 0.001 && (
          <svg
            className="eq-keys"
            width={graph.width}
            height={36}
            viewBox={`0 0 ${graph.width} 36`}
            aria-label="Piano keyboard: click a key to move the selected band to that note"
            style={{
              position: 'absolute',
              left: -axisLeft,
              top: (1 - morph) * 12,
              opacity: keysOpacity,
              clipPath: `inset(0px ${wipe}% 0px 0px)`,
            }}
            onPointerDown={(event) => {
              const at = keyboardPoint(event);
              if (event.button !== 0 || at === null) return;
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              keyDown(keyUnder(at.point, at.keyboardY), event.altKey, at.point);
            }}
            onPointerMove={(event) => {
              const at = keyboardPoint(event);
              if (at === null || useGestureStore.getState().active !== null) return;
              const midi = keyUnder(at.point, at.keyboardY);
              if (midi !== useViewportStore.getState().hotKey) useViewportStore.setState({ hotKey: midi });
            }}
            onPointerLeave={() => {
              if (useGestureStore.getState().active === null) useViewportStore.setState({ hotKey: null });
            }}
          >
            <path className="is-white" d={keys.white} />
            <path className="is-c" d={keys.c} />
            <path className="is-black" d={keys.black} style={{ opacity: blackOpacity }} />
            {hotKey !== null && <path className="is-hot" d={keyPath(mapper, hotKey)} />}
          </svg>
        )}
        {dotsOpacity > 0 &&
          bands
            .filter((band) => band.on && mapper.x(band.f) >= graph.left && mapper.x(band.f) <= graph.right)
            .map((band) => {
              const dot = keyDot(mapper, band.f);
              return (
                <span
                  key={band.slot}
                  className="eq-keydot"
                  style={{
                    ['--band' as string]: bandColorVar(band.color),
                    left: dot.x - axisLeft - 3.5,
                    top: dot.y - 3.5,
                    opacity: dotsOpacity,
                    transform: `scale(${dotsOpacity})`,
                  }}
                />
              );
            })}
      </div>
      <SegmentedControl
        label="Frequency axis units"
        variant="compact"
        className="eq-axis__tag"
        value={axis}
        segments={axisSegments}
        onValueChange={(next) => useViewportStore.setState({ axis: next })}
      />
    </div>
  );
}
