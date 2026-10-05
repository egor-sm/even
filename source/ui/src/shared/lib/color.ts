/** A color as 0…1 components, alpha last. */
export type Rgba = [number, number, number, number];

/** '#RRGGBB' or '#RRGGBBAA' as 0…1 components; anything else reads as transparent. */
export const parseHexColor = (color: string): Rgba => {
  const match = /^#([\da-f]{6})([\da-f]{2})?$/i.exec(color);
  if (match === null) return [0, 0, 0, 0];

  const rgb = Number.parseInt(match[1], 16);
  const alpha = match[2] === undefined ? 255 : Number.parseInt(match[2], 16);
  return [((rgb >> 16) & 255) / 255, ((rgb >> 8) & 255) / 255, (rgb & 255) / 255, alpha / 255];
};

/** The color with its alpha multiplied, as an rgba() string for a canvas. */
export const withAlpha = (color: string, alpha: number): string => {
  const [r, g, b, a] = parseHexColor(color);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a * alpha})`;
};
