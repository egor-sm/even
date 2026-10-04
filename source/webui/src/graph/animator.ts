import { uiStore } from '~/model/ui';

const rangeFollow = 0.25; // of the remaining distance per frame
const morphMs = 420;

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Moves the displayed view (uiStore.view) towards its targets: the dB range follows smoothly, the
 * Hz ↔ notes morph runs for 420 ms and can reverse halfway. Runs only while something moves.
 */
export const startAnimator = (): (() => void) => {
  let frame: number | null = null;
  let morph = { from: uiStore.get().view.morph, to: uiStore.get().view.morph, startedAt: 0 };

  const step = (now: number) => {
    frame = null;
    const { range, axis, view } = uiStore.get();
    const instant = reducedMotion();

    let displayedRange = view.range + (range - view.range) * rangeFollow;
    if (instant || Math.abs(range - displayedRange) < 0.02) displayedRange = range;

    const morphTarget = axis === 'note' ? 1 : 0;
    if (morph.to !== morphTarget) morph = { from: view.morph, to: morphTarget, startedAt: now };
    const progress = instant ? 1 : Math.min(1, (now - morph.startedAt) / morphMs);
    const displayedMorph = morph.from + (morph.to - morph.from) * easeInOutCubic(progress);

    if (displayedRange !== view.range || displayedMorph !== view.morph)
      uiStore.set({ view: { range: displayedRange, morph: displayedMorph } });

    if (displayedRange !== range || progress < 1) frame = requestAnimationFrame(step);
  };

  const unsubscribe = uiStore.subscribe(() => {
    const { range, axis, view } = uiStore.get();
    const settled = view.range === range && view.morph === (axis === 'note' ? 1 : 0);
    if (!settled && frame === null) frame = requestAnimationFrame(step);
  });

  return () => {
    unsubscribe();
    if (frame !== null) cancelAnimationFrame(frame);
  };
};
