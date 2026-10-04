import { type FilterType, selectionStore, typeIndex } from '~/entities/band';
import { native } from '~/shared/api';
import { createStore, useStore } from '~/shared/lib';

/** The type under the pointer in the type strip or picker: previewed as the ghost curve. */
const hoverStore = createStore<{ type: FilterType | null }>({ type: null });

export const hoverType = (type: FilterType | null): void => hoverStore.set({ type });

/** The hovered type while a type menu is open (closing a menu ends the preview without a mouseleave). */
export const previewedType = (): FilterType | null =>
  selectionStore.get().typeMenu === null ? null : hoverStore.get().type;

export const usePreviewedType = (): FilterType | null => {
  const open = useStore(selectionStore, (state) => state.typeMenu !== null);
  const type = useStore(hoverStore, (state) => state.type);
  return open ? type : null;
};

export const subscribePreviewedType = (listener: () => void): (() => void) => {
  const unsubscribeHover = hoverStore.subscribe(listener);
  const unsubscribeSelection = selectionStore.subscribe(listener);
  return () => {
    unsubscribeHover();
    unsubscribeSelection();
  };
};

/** Changes the band's type; C++ also adjusts q and gain to suit it (model::withShape). */
export const setBandType = (slot: number, type: FilterType): void => {
  selectionStore.set({ typeMenu: null });
  hoverType(null);
  void native.setBandShape(slot, typeIndex(type));
};

export const openTypeMenu = (menu: 'strip' | 'picker'): void => {
  hoverType(null);
  selectionStore.set(({ typeMenu }) => ({ typeMenu: typeMenu === menu && menu === 'picker' ? null : menu }));
};
