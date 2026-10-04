/** Filter types in the order of the C++ shape parameter (parameters.h shapeNames, dsp::FilterShape). */
export const filterTypes = ['bell', 'lshelf', 'hshelf', 'lcut', 'hcut', 'notch', 'bpass', 'tilt'] as const;

export type FilterType = (typeof filterTypes)[number];

export const typeNames: Record<FilterType, string> = {
  bell: 'Bell',
  lshelf: 'Low Shelf',
  hshelf: 'High Shelf',
  lcut: 'Low Cut',
  hcut: 'High Cut',
  notch: 'Notch',
  bpass: 'Band Pass',
  tilt: 'Tilt Shelf',
};

/** Index of the type in the C++ shape parameter. */
export const typeIndex = (type: FilterType): number => filterTypes.indexOf(type);

export const typeAt = (index: number): FilterType => filterTypes[index] ?? 'bell';

/** The type strip at the node: low to high, shape filters in the middle. */
export const stripOrder: readonly FilterType[] = ['lcut', 'lshelf', 'bell', 'notch', 'bpass', 'tilt', 'hshelf', 'hcut'];

/** The type picker in the dock: shapes on top, edges low to high below. */
export const pickerRows: readonly (readonly FilterType[])[] = [
  ['bell', 'notch', 'bpass', 'tilt'],
  ['lcut', 'lshelf', 'hshelf', 'hcut'],
];

/** Cut slopes in dB/oct; a band's slope is an index into this list (dsp::cutSlopesDbPerOctave). */
export const slopes = [6, 12, 18, 24, 36, 48, 72, 96] as const;

export const hasGain = (type: FilterType): boolean =>
  type === 'bell' || type === 'lshelf' || type === 'hshelf' || type === 'tilt';

export const isCut = (type: FilterType): boolean => type === 'lcut' || type === 'hcut';

/** Types whose width the Q handles show. */
export const hasQHandles = (type: FilterType): boolean => type === 'bell' || type === 'notch' || type === 'bpass';
