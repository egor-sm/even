import { type Band, useBandsStore } from '../model/bands';
import { useSelectionStore, withPreview } from '../model/selection';

/** The bands with the values being edited applied (ahead of the response from C++). */
export const useDisplayBands = (): readonly Band[] => {
  const bands = useBandsStore((state) => state.bands);
  const preview = useSelectionStore((state) => state.preview);
  return preview === null ? bands : bands.map((band) => withPreview(band, preview));
};

export const useSampleRate = (): number => useBandsStore((state) => state.sampleRate);
