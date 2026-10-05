import { clsx } from 'clsx';

import {
  type Band,
  bandColorVar,
  type FilterType,
  pickerRows,
  typeIconPaths,
  typeNames,
  useSelectionStore,
} from '~/entities/band';
import { ToggleGroup, ToggleGroupItem } from '~/shared/ui';

import { hoverType, setBandType, usePreviewedType } from '../model/type-preview';

function Tile({ band, type, delay }: { band: Band; type: FilterType; delay: number }) {
  const hovered = usePreviewedType() === type;
  return (
    <ToggleGroupItem
      value={type}
      className={clsx('eq-tile', band.type !== type && hovered && 'is-hover')}
      style={{ animationDelay: `${delay}ms` }}
      onSelect={() => setBandType(band.slot, type)}
      onHighlight={(highlighted) => hoverType(highlighted ? type : null)}
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
    </ToggleGroupItem>
  );
}

/** The 4 × 2 type menu opening upwards from the dock's type button; arrows move, Escape closes. */
export function TypePicker({ band }: { band: Band }) {
  return (
    <ToggleGroup
      label="Filter type"
      value={band.type}
      focusOnMount
      className="eq-picker"
      style={{ ['--band' as string]: bandColorVar(band.color), position: 'absolute', left: 0, top: -157 }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') useSelectionStore.setState({ typeMenu: null });
      }}
    >
      {pickerRows[0].map((type, i) => (
        <Tile key={type} band={band} type={type} delay={30 + i * 18} />
      ))}
      <div className="eq-picker__sep" />
      {pickerRows[1].map((type, i) => (
        <Tile key={type} band={band} type={type} delay={30 + (i + 4) * 18} />
      ))}
    </ToggleGroup>
  );
}
