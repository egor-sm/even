import { UiIcon } from '~/shared/ui';
import { bandColorVar, findBand } from '~/model/bands';
import { clamp, formatFrequency, formatNote, shallowEqual, useStore } from '~/shared/lib';
import { uiStore } from '~/model/ui';
import { soloRange } from '~/graph/axis-math';
import { createMapper } from '~/graph/geometry';
import { useDisplayBands } from '~/graph/overlay/use-bands';

/** 'Solo · 158 Hz – 210 Hz' above the lit range of the soloed band. */
export const SoloTag = () => {
  const bands = useDisplayBands();
  const { solo, axis } = useStore(uiStore, (state) => ({ solo: state.solo, axis: state.axis }), shallowEqual);
  const band = findBand(bands, solo);
  if (band === undefined) return null;

  const [low, high] = soloRange(band);
  const mapper = createMapper(1);
  const text = (hz: number) => (axis === 'note' ? formatNote(hz) : formatFrequency(hz));
  const lowText = low <= 20.5 ? '20 Hz' : text(low);
  const highText = high >= 19900 ? '20 kHz' : text(high);

  return (
    <div
      className="eq-ctag solo-tag"
      style={{ left: clamp((mapper.x(low) + mapper.x(high)) / 2, 130, 1176), color: 'var(--text-primary)' }}
    >
      <UiIcon name="solo" size={12} style={{ stroke: bandColorVar(band.color) }} />
      <span>
        Solo · {lowText} – {highText}
      </span>
    </div>
  );
};
