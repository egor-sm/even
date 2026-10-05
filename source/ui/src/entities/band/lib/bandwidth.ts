/** Bandwidth in octaves of a q, and back (bandwidth between the half-gain points of a bell). */
export const qToOctaves = (q: number): number => (2 / Math.LN2) * Math.asinh(1 / (2 * q));
export const octavesToQ = (octaves: number): number => 1 / (2 * Math.sinh((Math.LN2 / 2) * octaves));
