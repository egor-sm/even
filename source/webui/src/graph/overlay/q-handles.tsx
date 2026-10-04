import { clsx } from 'clsx';

import { bandColorVar, findBand } from '../../model/bands';
import { hasQHandles } from '../../model/filter-types';
import { uiStore } from '../../model/ui';
import { shallowEqual, useStore } from '../../store/store';
import { qToOctaves } from '../axis-math';
import { clamp, createMapper, graph, maxHz, minHz } from '../geometry';
import { qDown } from '../interactions';
import { magnitudeDb } from '../response-math';
import { useDisplayBands, useSampleRate } from './use-bands';

/** Two handles at the edges of the selected bell, notch or band pass (its width): drag for q. */
export const QHandles = () => {
  const bands = useDisplayBands();
  const sampleRate = useSampleRate();
  const { selected, drag, range } = useStore(
    uiStore,
    (state) => ({ selected: state.selected, drag: state.drag, range: state.view.range }),
    shallowEqual,
  );
  const band = findBand(bands, selected);
  const nodeMoving = drag?.kind === 'node' && drag.moved;
  if (band === undefined || !hasQHandles(band.type) || nodeMoving) return null;

  const mapper = createMapper(range);
  const nodeX = mapper.x(band.f);
  const half = qToOctaves(band.q) / 2;

  return ([-1, 1] as const).map((side) => {
    const hz = clamp(band.f * 2 ** (side * half), minHz, maxHz);
    let x = mapper.x(hz);
    if (Math.abs(x - nodeX) < 18) x = nodeX + side * 18;
    // On the band's own curve (the sections lag behind a q drag by a frame, which is not visible).
    const y = clamp(mapper.y(band.on ? magnitudeDb(band.sections, hz, sampleRate) : 0), -2, graph.height + 2);
    const active = drag?.kind === 'q';

    return (
      <button
        key={side}
        type="button"
        className={clsx('eq-qh', active && 'is-active', !band.on && 'is-bypassed')}
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
};
