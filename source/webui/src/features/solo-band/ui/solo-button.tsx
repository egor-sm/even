import { clsx } from 'clsx';

import { selectionStore } from '~/entities/band';
import { useStore } from '~/shared/lib';
import { UiIcon } from '~/shared/ui';

import { toggleSolo } from '../model/solo';

export const SoloButton = ({ slot }: { slot: number }) => {
  const soloed = useStore(selectionStore, (state) => state.solo === slot);
  return (
    <button
      type="button"
      className={clsx('eq-act', soloed && 'is-solo')}
      aria-label="Solo band"
      aria-pressed={soloed}
      onClick={() => toggleSolo(slot)}
    >
      <UiIcon name="solo" size={14} />
    </button>
  );
};
