import { describe, expect, it } from 'vite-plus/test';

import { parseBinaryFrame } from '../frame';

// Builds a frame the way SpectrumAnalyzer::serializeLatestFrame() lays it out, with two points.
const frame = (spectra: number, version = 3) => {
  const levels = (spectra & 1 ? 2 : 0) + (spectra & 2 ? 2 : 0);
  const view = new DataView(new ArrayBuffer(48 + levels * 4));
  view.setUint32(0, version, true);
  view.setUint32(4, 9, true); // index
  view.setUint32(8, 8192, true);
  view.setUint32(12, 2, true); // points
  view.setFloat32(16, 20, true);
  view.setFloat32(20, 20000, true);
  view.setFloat64(24, 48000, true);
  view.setFloat64(32, 4096, true);
  view.setUint32(40, spectra, true);

  let offset = 48;
  for (const value of [spectra & 1 ? [-10, -20] : [], spectra & 2 ? [-30, -40] : []].flat()) {
    view.setFloat32(offset, value, true);
    offset += 4;
  }
  return view.buffer;
};

describe('analyzer frame', () => {
  it('reads the pre and post spectra', () => {
    const parsed = parseBinaryFrame(frame(3));
    expect(parsed?.index).toBe(9);
    expect(Array.from(parsed?.preDb ?? [])).toEqual([-10, -20]);
    expect(Array.from(parsed?.postDb ?? [])).toEqual([-30, -40]);
  });

  it('leaves out the spectra the mode does not include', () => {
    const postOnly = parseBinaryFrame(frame(2));
    expect(postOnly?.preDb).toBeNull();
    expect(Array.from(postOnly?.postDb ?? [])).toEqual([-30, -40]);

    const off = parseBinaryFrame(frame(0));
    expect(off?.preDb).toBeNull();
    expect(off?.postDb).toBeNull();
  });

  it('rejects other versions and truncated frames', () => {
    expect(parseBinaryFrame(frame(3, 2))).toBeNull();
    expect(parseBinaryFrame(frame(3).slice(0, 60))).toBeNull();
  });
});
