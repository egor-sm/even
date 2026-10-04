import { type Band, selectionStore } from '~/entities/band';
import { bandParameters, native } from '~/shared/api';

export const toggleBypass = (band: Band): void => bandParameters.setEnabled(band.slot, !band.on);

export const deleteBand = (slot: number): void => {
  const { selected, solo } = selectionStore.get();
  selectionStore.set({
    selected: selected === slot ? null : selected,
    solo: solo === slot ? null : solo,
    typeMenu: null,
  });
  void native.deleteBand(slot);
};
