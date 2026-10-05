/**
 * A canvas drawn in its own units (e.g. the graph's 1280 × 664): its backing store follows the UI
 * scale and the device pixel ratio so lines stay sharp at any size.
 */
export class CanvasLayer {
  readonly canvas = document.createElement('canvas');
  readonly context: CanvasRenderingContext2D;
  private pixelsPerUnit = 1;

  constructor(
    className: string,
    private readonly size: { width: number; height: number },
  ) {
    this.canvas.className = className;
    const context = this.canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D is not available');
    this.context = context;
  }

  resize(uiScale: number): void {
    this.pixelsPerUnit = uiScale * devicePixelRatio;
    this.canvas.width = Math.round(this.size.width * this.pixelsPerUnit);
    this.canvas.height = Math.round(this.size.height * this.pixelsPerUnit);
  }

  /** Clears the canvas and returns its context set up for its units. */
  begin(): CanvasRenderingContext2D {
    const { context, pixelsPerUnit } = this;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.setTransform(pixelsPerUnit, 0, 0, pixelsPerUnit, 0, 0);
    return context;
  }

  /** Width of one device pixel in canvas units: for hairlines. */
  get pixel(): number {
    return 1 / this.pixelsPerUnit;
  }
}
