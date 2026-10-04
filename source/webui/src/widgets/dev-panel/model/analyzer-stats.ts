import { onAnalyzerFrame } from '~/entities/analyzer';

const windowMs = 2000;

type Sample = { at: number; value: number };

class RollingWindow {
  private samples: Sample[] = [];

  add(at: number, value = 1): void {
    this.samples.push({ at, value });
    this.trim(at);
  }

  trim(now: number): void {
    while (this.samples.length > 0 && now - this.samples[0].at > windowMs) this.samples.shift();
  }

  get count(): number {
    return this.samples.length;
  }

  get mean(): number {
    return this.samples.length === 0 ? 0 : this.samples.reduce((sum, s) => sum + s.value, 0) / this.samples.length;
  }

  percentile(p: number): number {
    if (this.samples.length === 0) return 0;
    const sorted = this.samples.map((s) => s.value).toSorted((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  }
}

const perSecond = (w: RollingWindow) => (w.count * 1000) / windowMs;

/** Rolling 2-second metrics for the analyzer pipeline. */
export class AnalyzerStats {
  private readonly renders = new RollingWindow();
  private readonly frames = new RollingWindow();
  private readonly latency = new RollingWindow();
  private lastFrameBytes = 0;

  onRender(now: number): void {
    this.renders.add(now);
  }

  onFrame(now: number, latencyMs: number, bytes: number): void {
    this.frames.add(now);
    this.latency.add(now, latencyMs);
    this.lastFrameBytes = bytes;
  }

  /** Counts the analyzer frames as they arrive; returns the unsubscribe function. */
  listen(): () => void {
    return onAnalyzerFrame((_, { latencyMs, bytes }) => this.onFrame(performance.now(), latencyMs, bytes));
  }

  format(now: number): string {
    for (const w of [this.renders, this.frames, this.latency]) w.trim(now);

    return [
      `render      ${perSecond(this.renders).toFixed(0)} fps`,
      `frames      ${perSecond(this.frames).toFixed(1)} /s  (${(this.lastFrameBytes / 1024).toFixed(1)} KB)`,
      `latency     avg ${this.latency.mean.toFixed(1)} ms  p95 ${this.latency.percentile(0.95).toFixed(1)} ms`,
    ].join('\n');
  }
}

/** The analyzer metrics shown in the development panel. */
export const analyzerStats = new AnalyzerStats();
