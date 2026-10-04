import type { CSSProperties } from 'react';

import type { FilterType } from '../model/filter-types';

/** Filter type icons: 24 grid, stroke 2, round caps and joins, no fills. */
export const typeIconPaths: Record<FilterType, string> = {
  bell: 'M2 17C7 17 8 6 12 6S17 17 22 17',
  lshelf: 'M2 8H8C11 8 12 16 15 16H22',
  hshelf: 'M2 16H9C12 16 13 8 16 8H22',
  lcut: 'M4 19C7 19 8 9 11 9H22',
  hcut: 'M2 9H13C16 9 17 19 20 19',
  notch: 'M2 9H8C10.5 9 11 19 12 19S13.5 9 16 9H22',
  bpass: 'M3 19C7 19 9 6 12 6S17 19 21 19',
  tilt: 'M2 17L22 7M10 12h4',
};

/** UI icons with the stroke width they were drawn for. */
export const uiIcons = {
  chevronDown: { d: 'M6 9l6 6 6-6', strokeWidth: 2 },
  undo: { d: 'M9 6L5 10l4 4M5 10h9a5 5 0 0 1 0 10h-3', strokeWidth: 1.8 },
  redo: { d: 'M15 6l4 4-4 4M19 10h-9a5 5 0 0 0 0 10h3', strokeWidth: 1.8 },
  power: { d: 'M12 3v8M6.3 6.3a8 8 0 1 0 11.4 0', strokeWidth: 2.2 },
  solo: {
    d: 'M4 16v-4a8 8 0 0 1 16 0v4M4.5 15h1A1.5 1.5 0 0 1 7 16.5v3A1.5 1.5 0 0 1 5.5 21h-1A1.5 1.5 0 0 1 3 19.5v-3A1.5 1.5 0 0 1 4.5 15zM18.5 15h1a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5z',
    strokeWidth: 2,
  },
  close: { d: 'M7 7l10 10M17 7L7 17', strokeWidth: 2.4 },
  note: {
    d: 'M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
    strokeWidth: 2,
  },
  updown: { d: 'M8 8l4-4 4 4M8 16l4 4 4-4', strokeWidth: 1.8 },
  check: { d: 'M5 12.5l4.5 4.5L19 7.5', strokeWidth: 2.2 },
} as const;

type IconProps = {
  d: string;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
};

export const Icon = ({ d, size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={style}
  >
    <path d={d} />
  </svg>
);

export const UiIcon = ({ name, size, style }: { name: keyof typeof uiIcons; size?: number; style?: CSSProperties }) => (
  <Icon d={uiIcons[name].d} strokeWidth={uiIcons[name].strokeWidth} size={size} style={style} />
);

export const TypeIcon = ({ type, size = 18, style }: { type: FilterType; size?: number; style?: CSSProperties }) => (
  <Icon d={typeIconPaths[type]} size={size} style={style} />
);
