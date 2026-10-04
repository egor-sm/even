import { useStore } from '~/shared/lib';

import { type Band, bandsStore } from '../model/bands';
import { selectionStore, withPreview } from '../model/selection';

/** The bands with the values being edited applied (ahead of the response from C++). */
export const useDisplayBands = (): readonly Band[] => {
  const bands = useStore(bandsStore, (state) => state.bands);
  const preview = useStore(selectionStore, (state) => state.preview);
  return preview === null ? bands : bands.map((band) => withPreview(band, preview));
};

export const useSampleRate = (): number => useStore(bandsStore, (state) => state.sampleRate);
