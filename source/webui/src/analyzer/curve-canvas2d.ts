import { curveStyle, type CurveRenderer } from './curve-renderer';
import type { SpectrumScale } from './scale';

const rgba = ([r, g, b, a]: readonly number[]) => `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;

export class Canvas2DCurveRenderer implements CurveRenderer {
  private readonly context: CanvasRenderingContext2D;
  private scale: SpectrumScale | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D is not available');
    this.context = context;
  }

  resize(scale: SpectrumScale): void {
    this.scale = scale;
    this.canvas.width = scale.width;
    this.canvas.height = scale.height;
  }

  draw(frequencies: Float32Array, levelsDb: Float32Array): void {
    const { context: ctx, scale } = this;
    if (scale === null) return;

    const { width, height } = scale;
    ctx.clearRect(0, 0, width, height);
    if (frequencies.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(scale.x(frequencies[0]), height);
    for (let i = 0; i < frequencies.length; i++) ctx.lineTo(scale.x(frequencies[i]), scale.y(levelsDb[i]));
    ctx.lineTo(scale.x(frequencies[frequencies.length - 1]), height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, rgba(curveStyle.fillTopColor));
    gradient.addColorStop(1, rgba(curveStyle.fillBottomColor));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < frequencies.length; i++) {
      const x = scale.x(frequencies[i]);
      const y = scale.y(levelsDb[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(curveStyle.lineColor);
    ctx.lineWidth = curveStyle.lineWidthCss * devicePixelRatio;
    ctx.stroke();
  }

  dispose(): void {}
}
