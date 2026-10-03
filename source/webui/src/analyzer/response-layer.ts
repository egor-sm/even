import { bandColor } from '../band-colors';
import type { NodePreview } from './pad-interaction';
import type { EqResponse } from './response';
import { magnitudeDb } from './response-math';
import type { SpectrumScale } from './scale';

/**
 * Frequencies to evaluate the response at: one per device pixel column, plus every band frequency
 * exactly, so a narrow bell peaks precisely at its node and a notch dips at its true center.
 */
const sampleFrequencies = (scale: SpectrumScale, response: EqResponse): number[] => {
  const frequencies: number[] = [];
  for (let x = 0; x <= scale.width; x++) frequencies.push(scale.frequencyAt(x));

  const { minHz, maxHz } = scale.range;
  for (const band of response.bands)
    if (band.frequencyHz > minHz && band.frequencyHz < maxHz) frequencies.push(band.frequencyHz);

  return frequencies.toSorted((a, b) => a - b);
};

/**
 * EQ response overlay, redrawn only when the response or the size changes: a translucent fill per
 * band, the total curve and a node per band on the XY pad (frequency, gain).
 */
export class ResponseLayer {
  private readonly context: CanvasRenderingContext2D;
  private response: EqResponse | null = null;
  private scale: SpectrumScale | null = null;
  private selectedBand = 0;
  private preview: NodePreview | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D is not available');
    this.context = context;
  }

  resize(scale: SpectrumScale): void {
    this.scale = scale;
    this.canvas.width = scale.width;
    this.canvas.height = scale.height;
    this.draw();
  }

  setResponse(response: EqResponse): void {
    this.response = response;
    this.draw();
  }

  setSelectedBand(band: number): void {
    this.selectedBand = band;
    this.draw();
  }

  /** A node being dragged is drawn at the pointer right away; the curve follows with the next response. */
  setPreview(preview: NodePreview | null): void {
    this.preview = preview;
    this.draw();
  }

  private draw(): void {
    const { context: ctx, response, scale } = this;
    if (scale === null) return;

    ctx.clearRect(0, 0, scale.width, scale.height);
    if (response === null || scale.width === 0) return;

    const pixelRatio = devicePixelRatio;
    const zeroY = scale.eqY(0);
    // Curves may go far beyond the visible range (e.g. a notch center): clamp just outside it.
    const clampY = (db: number) => Math.min(Math.max(scale.eqY(db), -pixelRatio), scale.height + pixelRatio);

    const frequencies = sampleFrequencies(scale, response);
    const xs = frequencies.map((hz) => scale.x(hz));
    const total = new Float64Array(frequencies.length);

    ctx.lineJoin = 'round';

    for (const band of response.bands) {
      ctx.beginPath();
      ctx.moveTo(xs[0], zeroY);
      for (let i = 0; i < frequencies.length; i++) {
        const db = magnitudeDb(band.sections, frequencies[i], response.sampleRate);
        total[i] += db; // bands are in series: their gains in dB add up
        ctx.lineTo(xs[i], clampY(db));
      }
      ctx.lineTo(xs[xs.length - 1], zeroY);
      ctx.closePath();
      ctx.fillStyle = bandColor(band.band, 0.18);
      ctx.fill();
    }

    ctx.beginPath();
    for (let i = 0; i < frequencies.length; i++) {
      if (i === 0) ctx.moveTo(xs[i], clampY(total[i]));
      else ctx.lineTo(xs[i], clampY(total[i]));
    }
    ctx.strokeStyle = '#f2c26b';
    ctx.lineWidth = 2 * pixelRatio;
    ctx.stroke();

    ctx.font = `600 ${10 * pixelRatio}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const band of response.bands) {
      const preview = this.preview?.band === band.band ? this.preview.value : null;
      const x = scale.x(preview?.frequencyHz ?? band.frequencyHz);
      const y = clampY(preview?.gainDb ?? band.gainDb);

      if (band.band === this.selectedBand) {
        ctx.beginPath();
        ctx.arc(x, y, 11 * pixelRatio, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e6e8ee';
        ctx.lineWidth = 1.5 * pixelRatio;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, y, 8 * pixelRatio, 0, 2 * Math.PI);
      ctx.fillStyle = bandColor(band.band);
      ctx.fill();
      ctx.fillStyle = '#15171c';
      ctx.fillText(String(band.band), x, y + 0.5 * pixelRatio);
    }
  }
}
