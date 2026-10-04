import { describe, expect, it } from 'vite-plus/test';

import { parseResponse } from './response';

// Builds a packet the way serializeResponse() in response_packet.cpp lays it out.
const packet = (version = 4) => {
  const view = new DataView(new ArrayBuffer(16 + 48 + 48));
  view.setUint32(0, version, true);
  view.setUint32(4, 1, true); // one band
  view.setFloat64(8, 48000, true);

  view.setUint32(16, 3, true); // band 3
  view.setUint32(20, 0, true); // bell
  view.setUint32(24, 1, true); // one section
  view.setUint32(28, 0, true); // flags: bypassed
  view.setUint32(32, 7, true); // serial
  view.setFloat64(40, 182, true);
  view.setFloat64(48, -7.5, true);
  view.setFloat64(56, 5.2, true);

  view.setUint32(64, 2, true); // order
  view.setFloat64(72, 0.01, true);
  view.setFloat64(80, 2.5, true);
  view.setFloat64(88, 1, true);
  view.setFloat64(96, 0.42, true);
  view.setFloat64(104, 1, true);
  return view.buffer;
};

describe('EQ response packet', () => {
  it('reads bands with their flags, serial and sections', () => {
    expect(parseResponse(packet())).toEqual({
      sampleRate: 48000,
      bands: [
        {
          band: 3,
          shape: 0,
          enabled: false,
          serial: 7,
          frequencyHz: 182,
          gainDb: -7.5,
          q: 5.2,
          sections: [{ order: 2, g: 0.01, q: 2.5, lowpassMix: 1, bandpassMix: 0.42, highpassMix: 1 }],
        },
      ],
    });
  });

  it('rejects other versions and truncated packets', () => {
    expect(parseResponse(packet(3))).toBeNull();
    expect(parseResponse(packet().slice(0, 70))).toBeNull();
  });
});
