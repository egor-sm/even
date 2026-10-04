import { magnitudeDb } from '../graph/response-math';
import { type FilterType, hasGain, isCut, typeAt } from '../model/filter-types';
import { mockDesign } from './mock-design';

/**
 * Development only: stands in for the plugin when the UI runs in a plain browser (`vp dev` without
 * the app). It keeps band slots, sends response packets and analyzer frames in the binary formats of
 * the C++ side, and answers the native functions, so the whole UI can be used and inspected.
 */

type Slot = {
  used: boolean;
  on: boolean;
  type: FilterType;
  f: number;
  g: number;
  q: number;
  slope: number;
  serial: number;
};

const sampleRate = 48000;
const pointCount = 512;

const emptySlot = (): Slot => ({ used: false, on: true, type: 'bell', f: 1000, g: 0, q: 1, slope: 1, serial: 0 });

const slots: Slot[] = Array.from({ length: 12 }, emptySlot);
const initial: Omit<Slot, 'used' | 'serial'>[] = [
  { on: true, type: 'lcut', f: 34, g: 0, q: 0.71, slope: 3 },
  { on: true, type: 'bell', f: 182, g: -7.5, q: 5.2, slope: 1 },
  { on: true, type: 'bell', f: 1250, g: 2.5, q: 0.9, slope: 1 },
  { on: true, type: 'bell', f: 3600, g: -3.5, q: 2.6, slope: 1 },
  { on: true, type: 'hshelf', f: 9000, g: 3.5, q: 0.7, slope: 1 },
];
initial.forEach((band, i) => (slots[i] = { ...band, used: true, serial: i + 1 }));

let history: Slot[][] = [structuredClone(slots)];
let historyPosition = 0;
let analyzerMode = 'prepost';
let settings = { theme: 'dark', scale: 100 };
let frameTimer: number | null = null;
let noise = new Float64Array(pointCount);

const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCodePoint(...new Uint8Array(buffer)));

const sendResponse = () => {
  const used = slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.used);
  const designs = used.map(({ slot }) => mockDesign(slot, sampleRate));
  const size = 16 + used.reduce((sum, _, i) => sum + 48 + designs[i].length * 48, 0);
  const view = new DataView(new ArrayBuffer(size));
  view.setUint32(0, 5, true);
  view.setUint32(4, used.length, true);
  view.setFloat64(8, sampleRate, true);

  let offset = 16;
  used.forEach(({ slot, index }, i) => {
    view.setUint32(offset, index + 1, true);
    view.setUint32(
      offset + 4,
      ['bell', 'lshelf', 'hshelf', 'lcut', 'hcut', 'notch', 'bpass', 'tilt'].indexOf(slot.type),
      true,
    );
    view.setUint32(offset + 8, designs[i].length, true);
    view.setUint32(offset + 12, slot.on ? 1 : 0, true);
    view.setUint32(offset + 16, slot.serial, true);
    view.setUint32(offset + 20, slot.slope, true);
    view.setFloat64(offset + 24, slot.f, true);
    view.setFloat64(offset + 32, hasGain(slot.type) ? slot.g : 0, true);
    view.setFloat64(offset + 40, slot.q, true);
    offset += 48;
    for (const section of designs[i]) {
      view.setUint32(offset, section.order, true);
      view.setFloat64(offset + 8, section.g, true);
      view.setFloat64(offset + 16, section.q, true);
      view.setFloat64(offset + 24, section.lowpassMix, true);
      view.setFloat64(offset + 32, section.bandpassMix, true);
      view.setFloat64(offset + 40, section.highpassMix, true);
      offset += 48;
    }
  });

  window.evenOnResponse?.(toBase64(view.buffer));
};

const historyState = () => ({ canUndo: historyPosition > 0, canRedo: historyPosition < history.length - 1 });

const commit = () => {
  if (JSON.stringify(history[historyPosition]) === JSON.stringify(slots)) return;
  history = [...history.slice(0, historyPosition + 1), structuredClone(slots)];
  historyPosition = history.length - 1;
  window.evenOnHistory?.(historyState().canUndo, historyState().canRedo);
};

const restore = (state: Slot[]) => {
  state.forEach((slot, i) => (slots[i] = { ...slot }));
  sendResponse();
};

// A spectrum like a mix: low end, a few resonances, roll-off; levels as the analyzer sends them
// (before the display tilt of 4.5 dB/oct around 1 kHz).
const frequencies = Float64Array.from({ length: pointCount }, (_, i) => 20 * 1000 ** (i / (pointCount - 1)));
const bump = (hz: number, centre: number, amount: number, width: number) =>
  amount * Math.exp(-((Math.log2(hz / centre) / width) ** 2));
const baseLevels = frequencies.map((hz) => {
  const octaves = Math.log2(hz / 120);
  const shown =
    -32 -
    4.2 * Math.max(0, octaves) -
    9 * Math.max(0, -octaves) -
    10 * Math.max(0, Math.log2(hz / 11000)) +
    bump(hz, 110, 9, 0.18) +
    bump(hz, 220, 7, 0.16) +
    bump(hz, 330, 4, 0.15) +
    bump(hz, 2400, 5, 0.9) +
    bump(hz, 5200, 3, 0.5);
  return shown - 4.5 * Math.log2(hz / 1000);
});

const sendFrame = (index: number) => {
  noise = noise.map((value) => value * 0.55 + (Math.random() - 0.5) * 7 * 0.45);
  const pre = baseLevels.map((level, i) => level + noise[i]);
  const used = slots.filter((slot) => slot.used && slot.on);
  const designs = used.map((slot) => mockDesign(slot, sampleRate));
  const post = pre.map(
    (level, i) => level + designs.reduce((sum, d) => sum + magnitudeDb(d, frequencies[i], sampleRate), 0),
  );

  const withPre = analyzerMode === 'prepost' || analyzerMode === 'pre';
  const withPost = analyzerMode === 'prepost' || analyzerMode === 'post';
  const view = new DataView(new ArrayBuffer(48 + (Number(withPre) + Number(withPost)) * pointCount * 4));
  view.setUint32(0, 3, true);
  view.setUint32(4, index, true);
  view.setUint32(8, 8192, true);
  view.setUint32(12, pointCount, true);
  view.setFloat32(16, 20, true);
  view.setFloat32(20, 20000, true);
  view.setFloat64(24, sampleRate, true);
  view.setFloat64(32, index * 800, true);
  view.setUint32(40, (withPre ? 1 : 0) | (withPost ? 2 : 0), true);
  let offset = 48;
  for (const levels of [withPre ? pre : null, withPost ? post : null])
    if (levels !== null)
      for (const level of levels) {
        view.setFloat32(offset, level, true);
        offset += 4;
      }

  window.evenOnAnalyzerFrame?.(Date.now(), toBase64(view.buffer));
};

const setAnalyzerActive = (active: boolean) => {
  if (frameTimer !== null) clearInterval(frameTimer);
  frameTimer = null;
  let index = 0;
  if (active) frameTimer = window.setInterval(() => sendFrame(++index), 1000 / 60);
};

const nextSerial = () => Math.max(0, ...slots.filter((slot) => slot.used).map((slot) => slot.serial)) + 1;

export const mockNative: Record<string, (args: unknown[]) => unknown> = {
  getPluginInfo: () => ({ name: 'Even', version: 'mock', juceVersion: '-', wrapper: 'Browser' }),
  setTestSignal: () => undefined,
  setAnalyzerActive: ([active]) => setAnalyzerActive(active === true),
  setAnalyzerMode: ([mode]) => {
    analyzerMode = String(mode);
  },
  requestResponse: () => sendResponse(),
  createBand: ([typeIndex, f, g]) => {
    const index = slots.findIndex((slot) => !slot.used);
    if (index < 0) return undefined;
    const type = typeAt(Number(typeIndex));
    slots[index] = {
      used: true,
      on: true,
      type,
      f: Number(f),
      g: hasGain(type) ? Number(g) : 0,
      q: isCut(type) ? 0.71 : 1,
      slope: 1,
      serial: nextSerial(),
    };
    sendResponse();
    commit();
    return index + 1;
  },
  deleteBand: ([slot]) => {
    slots[Number(slot) - 1] = emptySlot();
    sendResponse();
    commit();
  },
  setBandShape: ([slot, typeIndex]) => {
    const band = slots[Number(slot) - 1];
    const type = typeAt(Number(typeIndex));
    if (isCut(type) && !isCut(band.type)) band.q = 0.71;
    if (hasGain(type) && (!hasGain(band.type) || Math.abs(band.g) < 0.05)) band.g = 4;
    band.type = type;
    sendResponse();
    commit();
  },
  previewBand: ([slot, typeIndex]) => {
    const band = { ...slots[Number(slot) - 1] };
    const type = typeAt(Number(typeIndex));
    if (isCut(type) && !isCut(band.type)) band.q = 0.71;
    if (hasGain(type) && (!hasGain(band.type) || Math.abs(band.g) < 0.05)) band.g = 4;
    return mockDesign({ ...band, type }, sampleRate);
  },
  undo: () => {
    commit();
    if (historyPosition > 0) restore(history[--historyPosition]);
    return historyState();
  },
  redo: () => {
    if (historyPosition < history.length - 1) restore(history[++historyPosition]);
    return historyState();
  },
  getHistoryState: () => historyState(),
  getSettings: () => settings,
  setSetting: ([key, value]) => {
    settings = { ...settings, [String(key)]: value };
    return settings;
  },
};

/** Parameter writes through the relays, applied to the mock slots. */
export const mockParameters = {
  begin: () => undefined,
  end: () => commit(),
  set: (slot: number, field: 'frequency' | 'gain' | 'q', value: number) => {
    slots[slot - 1][field === 'frequency' ? 'f' : field === 'gain' ? 'g' : 'q'] = value;
    sendResponse();
  },
  setSlope: (slot: number, slopeIndex: number) => {
    slots[slot - 1].slope = slopeIndex;
    sendResponse();
    commit();
  },
  setEnabled: (slot: number, enabled: boolean) => {
    slots[slot - 1].on = enabled;
    sendResponse();
    commit();
  },
};
