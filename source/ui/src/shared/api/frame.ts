export type AnalyzerFrame = {
  index: number;
  sampleRate: number;
  /** Input sample count at the end of the analysed window: the frame's audio timestamp. */
  samplePosition: number;
  /** Window length of the analysis (the FFT is longer when zero-padded). */
  fftSize: number;
  /** Display points are log-spaced between minHz and maxHz. */
  minHz: number;
  maxHz: number;
  /** Fractional-octave smoothed level per display point, in dB, of the input; null when not analysed. */
  preDb: Float32Array | null;
  /** The same for the output (after the EQ). */
  postDb: Float32Array | null;
};

const headerBytes = 48;
const supportedVersion = 3;
const preFlag = 1;
const postFlag = 2;

/** Parses the binary layout produced by SpectrumAnalyzer::serializeLatestFrame(). */
export const parseBinaryFrame = (buffer: ArrayBuffer): AnalyzerFrame | null => {
  if (buffer.byteLength < headerBytes) return null;

  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== supportedVersion) return null;

  const pointCount = view.getUint32(12, true);
  const spectra = view.getUint32(40, true);
  const hasPre = (spectra & preFlag) !== 0;
  const hasPost = (spectra & postFlag) !== 0;
  const levelsBytes = pointCount * Float32Array.BYTES_PER_ELEMENT;
  if (buffer.byteLength < headerBytes + (Number(hasPre) + Number(hasPost)) * levelsBytes) return null;

  const postOffset = headerBytes + (hasPre ? levelsBytes : 0);
  return {
    index: view.getUint32(4, true),
    fftSize: view.getUint32(8, true),
    minHz: view.getFloat32(16, true),
    maxHz: view.getFloat32(20, true),
    sampleRate: view.getFloat64(24, true),
    samplePosition: view.getFloat64(32, true),
    preDb: hasPre ? new Float32Array(buffer, headerBytes, pointCount) : null,
    postDb: hasPost ? new Float32Array(buffer, postOffset, pointCount) : null,
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
