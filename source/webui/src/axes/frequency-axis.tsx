import { useMemo } from 'react';

import { UiIcon } from '~/shared/ui';
import { bandColorVar } from '~/model/bands';
import { uiStore } from '~/model/ui';
import { clamp, shallowEqual, useStore } from '~/shared/lib';
import { keyboardPaths, keyDot, keyPath } from '~/graph/axis-math';
import { createMapper, graph } from '~/graph/geometry';
import { keyDown, keyUnder, toGraphPoint } from '~/graph/interactions';
import { useDisplayBands } from '~/graph/overlay/use-bands';

const axisLeft = graph.left;
const axisTop = graph.bottom;

/** Pointer position on the keyboard: graph x, and y from the keyboard's top. */
const keyboardPoint = (event: React.PointerEvent<SVGSVGElement>) => {
  const graphElement = event.currentTarget.closest('.graph');
  if (graphElement === null) return null;
  const point = toGraphPoint(event, graphElement);
  return { point, keyboardY: point.y - axisTop };
};

/**
 * The frequency axis: Hz labels (drawn by FrequencyLabels) or a piano keyboard. Hovering shows the
 * Hz | notes switch; the keyboard moves the selected band to a note (Alt + click: a new band).
 */
export const FrequencyAxis = () => {
  const { axis, morph, hotKey } = useStore(
    uiStore,
    (state) => ({ axis: state.axis, morph: state.view.morph, hotKey: state.hotKey }),
    shallowEqual,
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
              keyDown(keyUnder(at.point, at.keyboardY), event.altKey);
            }}
            onPointerMove={(event) => {
              const at = keyboardPoint(event);
              if (at === null || uiStore.get().drag !== null) return;
              const midi = keyUnder(at.point, at.keyboardY);
              if (midi !== uiStore.get().hotKey) uiStore.set({ hotKey: midi, cursor: null });
            }}
            onPointerLeave={() => {
              if (uiStore.get().drag === null) uiStore.set({ hotKey: null });
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
      <fieldset className="eq-axis__tag axis-units" aria-label="Frequency axis units">
        <button
          type="button"
          className="eq-axis__seg"
          aria-pressed={!notes}
          onClick={() => uiStore.set({ axis: 'hz' })}
        >
          Hz
        </button>
        <button
          type="button"
          className="eq-axis__seg"
          aria-pressed={notes}
          aria-label="Notes"
          onClick={() => uiStore.set({ axis: 'note' })}
        >
          <UiIcon name="note" size={12} />
        </button>
      </fieldset>
    </div>
  );
};
