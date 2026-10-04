/** The typographic minus (U+2212) used for every negative number in the UI. */
export const minus = '−';

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI note number of a frequency (A4 = 69 = 440 Hz), fractional. */
export const frequencyToMidi = (hz: number): number => 69 + 12 * Math.log2(hz / 440);
export const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export const isBlackKey = (midi: number): boolean => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);

/** 'A4' for 69. */
export const noteName = (midi: number): string => `${noteNames[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

/** 'F#3 −28c': the nearest note and the offset in cents. */
export const formatNote = (hz: number): string => {
  const midi = frequencyToMidi(hz);
  const nearest = Math.round(midi);
  const cents = Math.round((midi - nearest) * 100);
  if (cents === 0) return noteName(nearest);
  return `${noteName(nearest)} ${cents > 0 ? '+' : minus}${Math.abs(cents)}c`;
};

/** '182 Hz', '1.25 kHz', '12.5 kHz'. */
export const formatFrequency = (hz: number): string =>
  hz < 1000 ? `${Math.round(hz)} Hz` : `${(hz / 1000).toFixed(hz < 10000 ? 2 : 1)} kHz`;

/** '+2.5 dB', '−7.5 dB', '0.0 dB' (no sign for zero). */
export const formatGain = (db: number): string =>
  `${db > 0.04 ? '+' : db < -0.04 ? minus : ''}${Math.abs(db).toFixed(1)} dB`;

export const formatQ = (q: number): string => q.toFixed(2);

/** Axis labels have no units: '50', '1k', '+6', '−6'. */
export const formatAxisFrequency = (hz: number): string => (hz >= 1000 ? `${hz / 1000}k` : String(hz));
export const formatAxisDb = (db: number): string => (db > 0 ? `+${db}` : db < 0 ? `${minus}${Math.abs(db)}` : '0');

/** The dB under the cursor: '+7.4', '−4.5', '0.0'. */
export const formatCursorDb = (db: number): string =>
  `${db > 0.05 ? '+' : db < -0.05 ? minus : ''}${Math.abs(db).toFixed(1)}`;
