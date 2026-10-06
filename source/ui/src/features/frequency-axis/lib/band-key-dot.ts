import { keyDot, type Mapper } from '~/entities/viewport';
import { clamp, type Point } from '~/shared/lib';

/**
 * Where a band's dot sits on the keyboard: on its key, or while the band glides to a clicked key, on the
 * straight line from the key it left to that one, as far along as the glide (which runs in log frequency),
 * rather than hopping over every key on the way.
 */
export const bandKeyDot = (mapper: Mapper, f: number, glide: { from: number; f: number } | null): Point => {
  if (glide === null) return keyDot(mapper, f);
  const start = keyDot(mapper, glide.from);
  const end = keyDot(mapper, glide.f);
  const span = Math.log(glide.f / glide.from);
  const t = span === 0 ? 1 : clamp(Math.log(f / glide.from) / span, 0, 1);
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
};
