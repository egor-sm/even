import type { SpectrumScale } from './scale';

const frequencyLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const eqDbStep = 6;

const formatFrequency = (hz: number): string => (hz >= 1000 ? `${hz / 1000}k` : String(hz));
const formatGain = (db: number): string => (db > 0 ? `+${db}` : String(db));

/**
 * Static background, redrawn only when the size changes: log-frequency lines and dB lines labelled
 * with the EQ gain on the left and the analyzer level on the right.
 */
export class GridLayer {
  private readonly context: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D is not available');
    this.context = context;
  }

  draw(scale: SpectrumScale): void {
    const { context: ctx } = this;
    const { width, height, range } = scale;
    const pixelRatio = devicePixelRatio;
    const pad = 4 * pixelRatio;

    this.canvas.width = width;
    this.canvas.height = height;

    ctx.fillStyle = '#15171c';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = pixelRatio;
    ctx.fillStyle = '#6b7180';
    ctx.font = `${11 * pixelRatio}px system-ui, sans-serif`;

    ctx.strokeStyle = '#262a33';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    for (const hz of frequencyLines) {
      const x = Math.round(scale.x(hz)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(formatFrequency(hz), x + 3 * pixelRatio, height - 2 * pixelRatio);
    }

    ctx.textBaseline = 'top';
    for (let db = range.eqDb; db >= -range.eqDb; db -= eqDbStep) {
      const y = Math.round(scale.eqY(db)) + 0.5;
      ctx.strokeStyle = db === 0 ? '#3a3f4b' : '#262a33';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      const labelY = y + 2 * pixelRatio;
      ctx.textAlign = 'left';
      ctx.fillText(formatGain(db), pad, labelY);

      // The same line on the analyzer's scale.
      const analyzerDb = range.maxDb - ((range.eqDb - db) / (2 * range.eqDb)) * (range.maxDb - range.minDb);
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(analyzerDb)), width - pad, labelY);
    }
  }
}
