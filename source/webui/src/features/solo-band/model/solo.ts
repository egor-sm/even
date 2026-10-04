import { selectionStore } from '~/entities/band';
import { native } from '~/shared/api';

export const toggleSolo = (slot: number): void =>
  selectionStore.set(({ solo }) => ({ solo: solo === slot ? null : slot }));

/** Solo lives in the UI state; C++ follows it (only the soloed band's range is heard). */
export const syncSoloWithBackend = (): (() => void) => {
  let solo = selectionStore.get().solo;
  return selectionStore.subscribe(() => {
    const next = selectionStore.get().solo;
    if (next === solo) return;
    solo = next;
    void native.setSolo(next ?? 0);
  });
};
