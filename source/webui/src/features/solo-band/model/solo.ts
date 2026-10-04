import { useSelectionStore } from '~/entities/band';
import { native } from '~/shared/api';

export const toggleSolo = (slot: number): void =>
  useSelectionStore.setState(({ solo }) => ({ solo: solo === slot ? null : slot }));

/** Solo lives in the UI state; C++ follows it (only the soloed band's range is heard). */
export const syncSoloWithBackend = (): (() => void) => {
  let solo = useSelectionStore.getState().solo;
  return useSelectionStore.subscribe(() => {
    const next = useSelectionStore.getState().solo;
    if (next === solo) return;
    solo = next;
    void native.setSolo(next ?? 0);
  });
};
