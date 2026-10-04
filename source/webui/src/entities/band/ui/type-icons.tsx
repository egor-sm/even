import type { CSSProperties } from 'react';

import { Icon } from '~/shared/ui';

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

export const TypeIcon = ({ type, size = 18, style }: { type: FilterType; size?: number; style?: CSSProperties }) => (
  <Icon d={typeIconPaths[type]} size={size} style={style} />
);
