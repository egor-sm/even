// The shapes in the order of the C++ shape parameter (parameters.h shapeNames), and the rules the mock
// needs from them. The mock stands outside the domain layers, so it keeps its own copy.

export const mockTypes = ['bell', 'lshelf', 'hshelf', 'lcut', 'hcut', 'notch', 'bpass', 'tilt'] as const;

export type MockType = (typeof mockTypes)[number];

export const typeAt = (index: number): MockType => mockTypes[index] ?? 'bell';

export const hasGain = (type: MockType): boolean =>
  type === 'bell' || type === 'lshelf' || type === 'hshelf' || type === 'tilt';

export const isCut = (type: MockType): boolean => type === 'lcut' || type === 'hcut';

export const slopes = [6, 12, 18, 24, 36, 48, 72, 96] as const;
