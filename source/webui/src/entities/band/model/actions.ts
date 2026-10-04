import { native } from '~/shared/api';

import { type FilterType, typeIndex } from './filter-types';
import { selectBand } from './selection';

/** A new band (C++ takes the first free slot), selected, with the type strip expanded over it. */
export const createBand = (type: FilterType, frequencyHz: number, gainDb: number): void =>
  void native.createBand(typeIndex(type), frequencyHz, gainDb).then((slot) => {
    if (typeof slot === 'number') selectBand(slot, 'strip');
  });
