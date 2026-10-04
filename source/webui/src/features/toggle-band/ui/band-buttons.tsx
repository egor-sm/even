import { clsx } from 'clsx';

import type { Band } from '~/entities/band';
import { UiIcon } from '~/shared/ui';

import { deleteBand, toggleBypass } from '../model/band-actions';

/** Bypass: the band stays but does not process (its icon turns red, the node hollow). */
export function BypassButton({ band }: { band: Band }) {
  return (
    <button
      type="button"
      className={clsx('eq-act', !band.on && 'is-danger')}
      aria-label="Bypass band"
      aria-pressed={!band.on}
      onClick={() => toggleBypass(band)}
    >
      <UiIcon name="power" size={14} />
    </button>
  );
}

export function DeleteButton({ slot }: { slot: number }) {
  return (
    <button type="button" className="eq-act" aria-label="Delete band" onClick={() => deleteBand(slot)}>
      <UiIcon name="close" size={13} />
    </button>
  );
}
