// Distinct hues for up to 12 bands, shared by the graph and the band controls.
const bandHues = [210, 30, 140, 280, 0, 180, 60, 320, 100, 240, 15, 160];

/** Color of a 1-based band. */
export const bandColor = (band: number, alpha = 1): string =>
  `hsla(${bandHues[(band - 1) % bandHues.length]}, 80%, 60%, ${alpha})`;
