import { clsx } from 'clsx';

import { useSelectionStore } from '~/entities/band';
import { UiIcon } from '~/shared/ui';

import { toggleSolo } from '../model/solo';

export function SoloButton({ slot }: { slot: number }) {
  const soloed = useSelectionStore((state) => state.solo === slot);
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
}
