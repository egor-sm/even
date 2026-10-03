export type AnalyzerFrame = {
  index: number;
  sampleRate: number;
  /** Input sample count at the end of the analysed window: the frame's audio timestamp. */
  samplePosition: number;
  fftSize: number;
  /** Display points are log-spaced between minHz and maxHz. */
  minHz: number;
  maxHz: number;
  /** Fractional-octave smoothed level per display point, in dB. */
  levelsDb: Float32Array;
};

const headerBytes = 40;
const supportedVersion = 2;

/** Parses the binary layout produced by SpectrumAnalyzer::serializeLatestFrame(). */
export const parseBinaryFrame = (buffer: ArrayBuffer): AnalyzerFrame | null => {
  if (buffer.byteLength < headerBytes) return null;

  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== supportedVersion) return null;

  const pointCount = view.getUint32(12, true);
  if (buffer.byteLength < headerBytes + pointCount * Float32Array.BYTES_PER_ELEMENT) return null;

  return {
    index: view.getUint32(4, true),
    fftSize: view.getUint32(8, true),
    minHz: view.getFloat32(16, true),
    maxHz: view.getFloat32(20, true),
    sampleRate: view.getFloat64(24, true),
    samplePosition: view.getFloat64(32, true),
    levelsDb: new Float32Array(buffer, headerBytes, pointCount),
  };
};

/** Decodes binary data that C++ passed as base64 via evaluateJavascript. */
export const decodeBase64 = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

export const decodeBase64Frame = (base64: string): AnalyzerFrame | null => parseBinaryFrame(decodeBase64(base64));
