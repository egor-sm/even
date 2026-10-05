import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import { type Band, formatSlope, hasGain, isCut } from '~/entities/band';
import { eventGraphPoint, useViewportStore } from '~/entities/viewport';
import { formatFrequency, formatGain, formatNote, formatQ, useGestureStore } from '~/shared/lib';

import { scrubDown, type ScrubField as Field } from '../model/scrub-gesture';

const labels: Record<Field, string> = { f: 'Frequency', g: 'Gain or slope', q: 'Q' };

/** A value of the selected band in the dock: drag horizontally to change it. */
export function ScrubField({ band, field }: { band: Band; field: Field }) {
  const notes = useViewportStore((state) => state.axis === 'note');
  const active = useGestureStore(({ active: gesture }) =>
    gesture?.kind === 'scrub' ? gesture.field === field : gesture?.kind === 'q' && field === 'q',
  );

  const cut = isCut(band.type);
  const disabled = field === 'g' && !cut && !hasGain(band.type);
  let label: ReactNode = 'Q';
  let value = formatQ(band.q);
  if (field === 'f') {
    label = (
      <>
        Freq<span className="eq-field__note">{notes ? formatFrequency(band.f) : formatNote(band.f)}</span>
      </>
    );
    value = notes ? formatNote(band.f) : formatFrequency(band.f);
  } else if (field === 'g') {
    label = cut ? 'Slope' : 'Gain';
    value = cut ? formatSlope(band.slope) : disabled ? '—' : formatGain(band.g);
  }

  return (
    <button
      type="button"
      className={clsx('eq-field', field === 'f' && 'is-freq', disabled && 'is-disabled', active && 'is-active')}
      aria-label={`${labels[field]}, drag to change`}
      onPointerDown={(event) => {
        if (event.button !== 0 || disabled) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = eventGraphPoint(event);
        if (point !== null) scrubDown(band, field, point);
      }}
    >
      <span className="eq-field__l">{label}</span>
      <span className="eq-field__v">{value}</span>
    </button>
  );
}
