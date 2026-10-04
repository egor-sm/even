import type { CSSProperties } from 'react';
import { clsx } from 'clsx';

import { type Band, bandColorVar } from '~/model/bands';
import { commands } from '~/model/commands';
import { type FilterType, pickerRows, typeNames } from '~/model/filter-types';
import { uiStore } from '~/model/ui';
import { useStore } from '~/shared/lib';
import { typeIconPaths } from '~/model/type-icons';

const Tile = ({ band, type, delay }: { band: Band; type: FilterType; delay: number }) => {
  const hovered = useStore(uiStore, (state) => state.hoverType === type);
  const current = band.type === type;
  const style: CSSProperties = { animationDelay: `${delay}ms` };

  return (
    <button
      type="button"
      className={clsx('eq-tile', current ? 'is-on' : hovered && 'is-hover')}
      role="menuitemradio"
      aria-checked={current}
      style={style}
      onClick={() => commands.setType(band.slot, type)}
      onMouseEnter={() => uiStore.set({ hoverType: type })}
      onMouseLeave={() => uiStore.set({ hoverType: null })}
    >
      <svg
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ overflow: 'visible' }}
        aria-hidden="true"
      >
        <path d={typeIconPaths[type]} vectorEffect="non-scaling-stroke" />
      </svg>
      <span>{typeNames[type]}</span>
    </button>
  );
};

/** The 4 × 2 type menu opening upwards from the dock's type button. */
export const TypePicker = ({ band }: { band: Band }) => (
  <div
    className="eq-picker"
    role="menu"
    aria-label="Filter type"
    style={{ ['--band' as string]: bandColorVar(band.color), position: 'absolute', left: 0, top: -157 }}
  >
    {pickerRows[0].map((type, i) => (
      <Tile key={type} band={band} type={type} delay={30 + i * 18} />
    ))}
    <div className="eq-picker__sep" />
    {pickerRows[1].map((type, i) => (
      <Tile key={type} band={band} type={type} delay={30 + (i + 4) * 18} />
    ))}
  </div>
);
