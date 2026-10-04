import { decodeBase64 } from './frame';
import type { Section } from './response-math';

export type BandResponse = {
  /** 1-based band number (slot). */
  band: number;
  /** False when the band is bypassed: it is shown but does not process. */
  enabled: boolean;
  /** Creation order of the band, from 1. */
  serial: number;
  /** Index into the shape choices (parameters.h, shapeNames). */
  shape: number;
  frequencyHz: number;
  /** 0 for shapes without gain: the node's vertical position on the XY pad. */
  gainDb: number;
  q: number;
  sections: Section[];
};

export type EqResponse = {
  sampleRate: number;
  bands: BandResponse[];
};

const headerBytes = 16;
const bandHeaderBytes = 48;
const sectionBytes = 48;
const supportedVersion = 4;
const enabledFlag = 1;

/** Parses the packet produced by serializeResponse() (response_packet.h). */
export const parseResponse = (buffer: ArrayBuffer): EqResponse | null => {
  if (buffer.byteLength < headerBytes) return null;

  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== supportedVersion) return null;

  const bandCount = view.getUint32(4, true);
  const bands: BandResponse[] = [];
  let offset = headerBytes;

  for (let i = 0; i < bandCount; i++) {
    if (buffer.byteLength < offset + bandHeaderBytes) return null;

    const sectionCount = view.getUint32(offset + 8, true);
    const band: BandResponse = {
      band: view.getUint32(offset, true),
      shape: view.getUint32(offset + 4, true),
      enabled: (view.getUint32(offset + 12, true) & enabledFlag) !== 0,
      serial: view.getUint32(offset + 16, true),
      frequencyHz: view.getFloat64(offset + 24, true),
      gainDb: view.getFloat64(offset + 32, true),
      q: view.getFloat64(offset + 40, true),
      sections: [],
    };
    offset += bandHeaderBytes;

    if (buffer.byteLength < offset + sectionCount * sectionBytes) return null;

    for (let s = 0; s < sectionCount; s++, offset += sectionBytes)
      band.sections.push({
        order: view.getUint32(offset, true) === 1 ? 1 : 2,
        g: view.getFloat64(offset + 8, true),
        q: view.getFloat64(offset + 16, true),
        lowpassMix: view.getFloat64(offset + 24, true),
        bandpassMix: view.getFloat64(offset + 32, true),
        highpassMix: view.getFloat64(offset + 40, true),
      });

    bands.push(band);
  }

  return { sampleRate: view.getFloat64(8, true), bands };
};

export const decodeBase64Response = (base64: string): EqResponse | null => parseResponse(decodeBase64(base64));
