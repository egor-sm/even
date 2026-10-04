import { create } from 'zustand';

import { type FilterType, useSelectionStore, typeIndex } from '~/entities/band';
import { native } from '~/shared/api';

/** The type under the pointer in the type strip or picker: previewed as the ghost curve. */
const useHoverStore = create<{ type: FilterType | null }>()(() => ({ type: null }));

export const hoverType = (type: FilterType | null): void => useHoverStore.setState({ type });

/** The hovered type while a type menu is open (closing a menu ends the preview without a mouseleave). */
export const previewedType = (): FilterType | null =>
  useSelectionStore.getState().typeMenu === null ? null : useHoverStore.getState().type;

export const usePreviewedType = (): FilterType | null => {
  const open = useSelectionStore((state) => state.typeMenu !== null);
  const type = useHoverStore((state) => state.type);
  return open ? type : null;
};

export const subscribePreviewedType = (listener: () => void): (() => void) => {
  const unsubscribeHover = useHoverStore.subscribe(listener);
  const unsubscribeSelection = useSelectionStore.subscribe(listener);
  return () => {
    unsubscribeHover();
    unsubscribeSelection();
  };
};

/** Changes the band's type; C++ also adjusts q and gain to suit it (model::withShape). */
export const setBandType = (slot: number, type: FilterType): void => {
  useSelectionStore.setState({ typeMenu: null });
  hoverType(null);
  void native.setBandShape(slot, typeIndex(type));
};

export const openTypeMenu = (menu: 'strip' | 'picker'): void => {
  hoverType(null);
  useSelectionStore.setState(({ typeMenu }) => ({ typeMenu: typeMenu === menu && menu === 'picker' ? null : menu }));
};
