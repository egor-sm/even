import {
  type Band,
  useBandsStore,
  findBand,
  hasGain,
  isCut,
  useSelectionStore,
  setPreview,
  slopes,
} from '~/entities/band';
import { maxHz, minHz, useViewportStore } from '~/entities/viewport';
import { bandParameters, type ContinuousField } from '~/shared/api';
import { clamp, frequencyToMidi, midiToFrequency, type Point, startGesture } from '~/shared/lib';

export type ScrubField = 'f' | 'g' | 'q';

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const startValue = (band: Band, field: ScrubField): number => {
  if (field === 'f') return band.f;
  if (field === 'q') return band.q;
  return isCut(band.type) ? band.slope : band.g;
};

// The parameter a field edits as one gesture; slopes are steps of a choice, written one by one.
const gestureField = (band: Band, field: ScrubField): ContinuousField | null => {
  if (field === 'f') return 'frequency';
  if (field === 'q') return 'q';
  return hasGain(band.type) ? 'gain' : null;
};

/**
 * Horizontal drag on a dock field. Frequency: twice per 60 px (in note mode a semitone per 14 px);
 * q: twice per 90 px; gain: 0.1 dB per px within the display range; slope: a step per 28 px.
 */
export const scrubDown = (band: Band, field: ScrubField, start: Point): void => {
  const from = startValue(band, field);
  const edited = gestureField(band, field);
  useSelectionStore.setState({ typeMenu: null });
  if (edited !== null) bandParameters.begin(band.slot, [edited]);

  startGesture(
    { kind: 'scrub', slot: band.slot, field },
    {
      move: (point) => {
        const current = findBand(useBandsStore.getState().bands, band.slot);
        if (current === undefined) return;
        const { axis, range } = useViewportStore.getState();
        const dx = point.x - start.x;

        if (field === 'f') {
          const f =
            axis === 'note'
              ? clamp(midiToFrequency(Math.round(frequencyToMidi(from)) + Math.round(dx / 14)), minHz, maxHz)
              : clamp(from * 2 ** (dx / 60), minHz, maxHz);
          setPreview({ slot: band.slot, f });
          bandParameters.set(band.slot, 'frequency', f);
        } else if (field === 'q') {
          const q = clamp(Math.round(from * 2 ** (dx / 90) * 100) / 100, 0.1, 30);
          setPreview({ slot: band.slot, q });
          bandParameters.set(band.slot, 'q', q);
        } else if (isCut(current.type)) {
          const slope = clamp(Math.round(from + dx / 28), 0, slopes.length - 1);
          if (slope === current.slope) return;
          setPreview({ slot: band.slot, slope });
          bandParameters.setSlope(band.slot, slope);
        } else if (hasGain(current.type)) {
          const g = roundTo(clamp(from + dx * 0.1, -range, range), 0.1);
          setPreview({ slot: band.slot, g });
          bandParameters.set(band.slot, 'gain', g);
        }
      },
      end: () => {
        if (edited !== null) bandParameters.end(band.slot, [edited]);
        useSelectionStore.setState(({ preview }) => ({ previewUntilResponse: preview !== null }));
      },
    },
  );
};
