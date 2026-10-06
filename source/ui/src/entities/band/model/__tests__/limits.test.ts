import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { recordingBackend } from '~/shared/testing';

import { clampGain } from '../limits';

describe('gain edits', () => {
  beforeEach(() => {
    recordingBackend();
  });

  it('stay within the display range when it is narrower than the gain parameter', () => {
    expect(clampGain(14.2, 12)).toBe(12);
    expect(clampGain(-14.2, 12)).toBe(-12);
  });

  it('stay within the ±30 dB of the gain parameter when the display range is wider', () => {
    expect(clampGain(33.3, 36)).toBe(30);
    expect(clampGain(-36, 36)).toBe(-30);
  });

  it('go in 0.1 dB steps', () => {
    expect(clampGain(2.345, 18)).toBe(2.3);
  });

  it('are limited by the display range alone until the plugin has sent the gain range', () => {
    recordingBackend({});
    expect(clampGain(33.3, 36)).toBe(33.3);
  });
});
