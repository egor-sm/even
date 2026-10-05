import { type Band, useBandsStore, findBand, octavesToQ, useSelectionStore, setPreview } from '~/entities/band';
import { createMapper, maxHz, minHz, useViewportStore } from '~/entities/viewport';
import { bandParameters } from '~/shared/api';
import { clamp, startGesture } from '~/shared/lib';

/** Dragging a Q handle sets q from its distance to the centre: the bandwidth is twice that distance. */
export const qDown = (band: Band): void => {
  useSelectionStore.setState({ typeMenu: null });
  bandParameters.begin(band.slot, ['q']);

  startGesture(
    { kind: 'q', slot: band.slot },
    {
      move: (point) => {
        const current = findBand(useBandsStore.getState().bands, band.slot);
        if (current === undefined) return;
        const hz = clamp(createMapper(useViewportStore.getState().view.range).frequencyAt(point.x), minHz, maxHz);
        const octaves = Math.max(0.02, Math.abs(Math.log2(hz / current.f)));
        const q = clamp(Math.round(octavesToQ(2 * octaves) * 100) / 100, 0.1, 30);
        setPreview({ slot: band.slot, q });
        bandParameters.set(band.slot, 'q', q);
      },
      end: () => {
        bandParameters.end(band.slot, ['q']);
        useSelectionStore.setState(({ preview }) => ({ previewUntilResponse: preview !== null }));
      },
    },
  );
};
