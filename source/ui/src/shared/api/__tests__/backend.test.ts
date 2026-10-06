import { describe, expect, it } from 'vite-plus/test';

import { bandParameterRange } from '../parameters';

describe('plugin backend', () => {
  it('takes the range of a band parameter from its relay once JUCE has sent it', () => {
    expect(bandParameterRange('gain')).toBeNull();

    // What WebSliderParameterAttachment::sendInitialUpdate sends for the gain of band 1.
    window.__JUCE__.backend.emitByBackend(
      '__juce__sliderband1Gain',
      JSON.stringify({
        eventType: 'propertiesChanged',
        start: -30,
        end: 30,
        skew: 1,
        name: 'Band 1 Gain',
        label: 'dB',
        numSteps: 6001,
        interval: 0.01,
        parameterIndex: 5,
      }),
    );
    expect(bandParameterRange('gain')).toEqual({ min: -30, max: 30 });
  });
});
