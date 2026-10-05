import { clsx } from 'clsx';

import { type Band, TypeIcon, typeNames } from '~/entities/band';
import { UiIcon } from '~/shared/ui';

import { openTypeMenu, usePreviewedType } from '../model/type-preview';

/** The dock's type button: shows the type (or the previewed one) and opens the type picker. */
export function TypeButton({ band, open }: { band: Band; open: boolean }) {
  const previewed = usePreviewedType();
  const shown = previewed ?? band.type;

  return (
    <button
      type="button"
      className={clsx('eq-typeb', open && 'is-hover', previewed !== null && previewed !== band.type && 'is-preview')}
      aria-label="Filter type"
      aria-expanded={open}
      onClick={() => openTypeMenu('picker')}
    >
      <TypeIcon type={shown} style={{ stroke: 'var(--band)' }} />
      <span>{typeNames[shown]}</span>
      <span className="eq-chev" style={{ flex: 'none', display: 'grid' }}>
        <UiIcon name="chevronDown" size={12} />
      </span>
    </button>
  );
}
