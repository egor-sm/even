import { useSelectionStore } from '~/entities/band';
import { ActionButton, UiIcon } from '~/shared/ui';

import { toggleSolo } from '../model/solo';

export function SoloButton({ slot }: { slot: number }) {
  const soloed = useSelectionStore((state) => state.solo === slot);
  return (
    <ActionButton
      label="Solo band"
      pressed={soloed}
      tone={soloed ? 'band' : undefined}
      onClick={() => toggleSolo(slot)}
    >
      <UiIcon name="solo" size={14} />
    </ActionButton>
  );
}
