import type { Band } from '~/entities/band';
import { ActionButton, UiIcon } from '~/shared/ui';

import { deleteBand, toggleBypass } from '../model/band-actions';

/** Bypass: the band stays but does not process (its icon turns red, the node hollow). */
export function BypassButton({ band }: { band: Band }) {
  return (
    <ActionButton
      label="Bypass band"
      pressed={!band.on}
      tone={band.on ? undefined : 'danger'}
      onClick={() => toggleBypass(band)}
    >
      <UiIcon name="power" size={14} />
    </ActionButton>
  );
}

export function DeleteButton({ slot }: { slot: number }) {
  return (
    <ActionButton label="Delete band" onClick={() => deleteBand(slot)}>
      <UiIcon name="close" size={13} />
    </ActionButton>
  );
}
