import { UiIcon } from '~/shared/ui';
import { bandColorVar, findBand, selectionStore, useDisplayBands } from '~/entities/band';
import { clamp, formatFrequency, formatNote, useStore } from '~/shared/lib';
import { createMapper, viewportStore } from '~/entities/viewport';
import { soloRange } from '~/features/solo-band/lib/solo-range';

/** 'Solo · 158 Hz – 210 Hz' above the lit range of the soloed band. */
export const SoloTag = () => {
  const bands = useDisplayBands();
  const solo = useStore(selectionStore, (state) => state.solo);
  const axis = useStore(viewportStore, (state) => state.axis);
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
