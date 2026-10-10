import { parseHexColor, type Rgba } from '~/shared/lib';

import { monotoneCurve } from '../lib/monotone-curve';
import type { Spectrum } from '../model/spectrum';

/** Where the spectra go: the canvas size and the plot area in its units, and the mapping to them. */
export type AnalyzerPlot = {
  width: number;
  height: number;
  left: number;
  right: number;
  x: (hz: number) => number;
  y: (dbfs: number) => number;
};

const vertexShaderSource = `#version 300 es
in vec2 a_position; // graph units, origin top-left
uniform vec2 u_size;

void main() {
  vec2 clip = a_position / u_size * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

uniform vec4 u_color;
out vec4 outColor;

void main() {
  outColor = vec4(u_color.rgb * u_color.a, u_color.a); // premultiplied alpha
}`;

// The antialiased line: each vertex carries its signed distance from the centre line in pixels.
const lineVertexShaderSource = `#version 300 es
in vec2 a_position; // graph units, origin top-left
in float a_offset;
uniform vec2 u_size;
out float v_offset;

void main() {
  vec2 clip = a_position / u_size * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_offset = a_offset;
}`;

const lineFragmentShaderSource = `#version 300 es
precision mediump float;

uniform vec4 u_color;
uniform float u_halfWidth; // pixels
in float v_offset;
out vec4 outColor;

void main() {
  float alpha = u_color.a * clamp(u_halfWidth + 0.5 - abs(v_offset), 0.0, 1.0);
  outColor = vec4(u_color.rgb * alpha, alpha); // premultiplied alpha
}`;

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('Failed to create shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true)
    throw new Error(`Shader compilation failed: ${gl.getShaderInfoLog(shader) ?? ''}`);

  return shader;
};

const createProgram = (gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram => {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true)
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program) ?? ''}`);

  return program;
};

/** A program with its vertex array and buffer; attributes are floats, interleaved. */
type Pipeline = {
  program: WebGLProgram;
  vertexArray: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  color: WebGLUniformLocation | null;
};

const createPipeline = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  size: { width: number; height: number },
  attributes: { name: string; size: number }[],
): Pipeline => {
  const vertexArray = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.useProgram(program);
  gl.uniform2f(gl.getUniformLocation(program, 'u_size'), size.width, size.height);
  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const stride = attributes.reduce((total, attribute) => total + attribute.size, 0) * 4;
  let offset = 0;
  for (const attribute of attributes) {
    const location = gl.getAttribLocation(program, attribute.name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, attribute.size, gl.FLOAT, false, stride, offset);
    offset += attribute.size * 4;
  }
  gl.bindVertexArray(null);

  return { program, vertexArray, buffer, color: gl.getUniformLocation(program, 'u_color') };
};

/** Segments between neighbouring points of the monotone curve. */
const curveSubdivisions = 4;
/** Mitred joins are at most this many half widths long (sharp spikes get a bevel-like cut). */
const miterLimit = 4;

export type AnalyzerColors = { fill: string; pre: string; post: string };

/**
 * The analyzer spectra with WebGL2: a fill under the main spectrum (post, or pre when only pre is
 * shown) and 1 px antialiased lines for pre and post, along a monotone cubic through the points.
 * Geometry is rebuilt on the CPU per frame, in graph units.
 */
export class AnalyzerLayer {
  readonly canvas = document.createElement('canvas');
  private readonly gl: WebGL2RenderingContext;
  private readonly flat: Pipeline;
  private readonly smooth: Pipeline;
  private readonly halfWidthUniform: WebGLUniformLocation | null;
  private pixelsPerUnit = 1;
  private colors: { fill: Rgba; pre: Rgba; post: Rgba } = {
    fill: [0, 0, 0, 0],
    pre: [0, 0, 0, 0],
    post: [0, 0, 0, 0],
  };
  private points = new Float32Array(0);
  private curve = new Float32Array(0);
  private vertices = new Float32Array(0);

  constructor(
    className: string,
    private readonly size: { width: number; height: number },
  ) {
    this.canvas.className = className;
    const gl = this.canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true, alpha: true });
    if (gl === null) throw new Error('WebGL2 is not available');
    this.gl = gl;

    this.flat = createPipeline(gl, createProgram(gl, vertexShaderSource, fragmentShaderSource), size, [
      { name: 'a_position', size: 2 },
    ]);
    this.smooth = createPipeline(gl, createProgram(gl, lineVertexShaderSource, lineFragmentShaderSource), size, [
      { name: 'a_position', size: 2 },
      { name: 'a_offset', size: 1 },
    ]);
    this.halfWidthUniform = gl.getUniformLocation(this.smooth.program, 'u_halfWidth');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(uiScale: number): void {
    this.pixelsPerUnit = uiScale * devicePixelRatio;
    this.canvas.width = Math.round(this.size.width * this.pixelsPerUnit);
    this.canvas.height = Math.round(this.size.height * this.pixelsPerUnit);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  setColors(colors: AnalyzerColors): void {
    this.colors = {
      fill: parseHexColor(colors.fill),
      pre: parseHexColor(colors.pre),
      post: parseHexColor(colors.post),
    };
  }

  draw(plot: AnalyzerPlot, pre: Spectrum, post: Spectrum): void {
    const { gl, pixelsPerUnit } = this;
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Clip to the plot area, like every graph layer.
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(
      Math.round(plot.left * pixelsPerUnit),
      0,
      Math.round((plot.right - plot.left) * pixelsPerUnit),
      this.canvas.height,
    );

    const main = post.frequencies.length >= 2 ? post : pre;
    if (main.frequencies.length >= 2) this.drawFill(this.project(plot, main), plot);
    if (pre.frequencies.length >= 2) this.drawLine(this.project(plot, pre), this.colors.pre);
    if (post.frequencies.length >= 2) this.drawLine(this.project(plot, post), this.colors.post);
  }

  dispose(): void {
    const { gl } = this;
    for (const pipeline of [this.flat, this.smooth]) {
      gl.deleteBuffer(pipeline.buffer);
      gl.deleteVertexArray(pipeline.vertexArray);
      gl.deleteProgram(pipeline.program);
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  /** The curve in graph units as (x, y) pairs: the monotone cubic through the points. */
  private project(plot: AnalyzerPlot, spectrum: Spectrum): Float32Array {
    const count = spectrum.frequencies.length;
    if (this.points.length !== 2 * count) this.points = new Float32Array(2 * count);

    for (let i = 0; i < count; i++) {
      this.points[2 * i] = plot.x(spectrum.frequencies[i]);
      this.points[2 * i + 1] = Math.min(plot.y(spectrum.display[i]), plot.height);
    }
    this.curve = monotoneCurve(this.points, curveSubdivisions, this.curve);
    return this.curve;
  }

  private ensureVertices(length: number): Float32Array {
    if (this.vertices.length < length) this.vertices = new Float32Array(length);
    return this.vertices;
  }

  private drawStrip(pipeline: Pipeline, color: Rgba, length: number, vertexCount: number): void {
    const { gl } = this;
    gl.useProgram(pipeline.program);
    gl.bindVertexArray(pipeline.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, pipeline.buffer);
    gl.uniform4fv(pipeline.color, color);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.subarray(0, length), gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
    gl.bindVertexArray(null);
  }

  // A strip between the curve and the bottom edge.
  private drawFill(points: Float32Array, plot: AnalyzerPlot): void {
    const count = points.length / 2;
    const vertices = this.ensureVertices(4 * count);
    for (let i = 0; i < count; i++) {
      vertices[4 * i] = points[2 * i];
      vertices[4 * i + 1] = points[2 * i + 1];
      vertices[4 * i + 2] = points[2 * i];
      vertices[4 * i + 3] = plot.height;
    }
    this.drawStrip(this.flat, this.colors.fill, 4 * count, 2 * count);
  }

  // A 1 px line with mitred joins, so it keeps its width on steep zigzags, and an edge faded over a
  // pixel in the fragment shader instead of relying on multisampling.
  private drawLine(points: Float32Array, color: Rgba): void {
    const { gl, pixelsPerUnit } = this;
    const count = points.length / 2;
    const vertices = this.ensureVertices(6 * count);
    const halfWidthPx = 0.5 * pixelsPerUnit;
    // Out to half a pixel beyond the edge, where the coverage reaches zero.
    const extentPx = halfWidthPx + 1;
    const extent = extentPx / pixelsPerUnit;

    const direction = (from: number, to: number): [number, number] => {
      const dx = points[2 * to] - points[2 * from];
      const dy = points[2 * to + 1] - points[2 * from + 1];
      const length = Math.hypot(dx, dy) || 1;
      return [dx / length, dy / length];
    };

    for (let i = 0; i < count; i++) {
      const [ax, ay] = direction(Math.max(i - 1, 0), Math.max(i, 1));
      const [bx, by] = direction(Math.min(i, count - 2), Math.min(i + 1, count - 1));
      // The miter: the normal of the mean direction, lengthened to keep the width along both segments.
      let tx = ax + bx;
      let ty = ay + by;
      const tangentLength = Math.hypot(tx, ty) || 1;
      tx /= tangentLength;
      ty /= tangentLength;
      const nx = -ty;
      const ny = tx;
      const scale = Math.min(1 / Math.max(nx * -ay + ny * ax, 1e-3), miterLimit);

      const ox = nx * extent * scale;
      const oy = ny * extent * scale;
      vertices[6 * i] = points[2 * i] + ox;
      vertices[6 * i + 1] = points[2 * i + 1] + oy;
      vertices[6 * i + 2] = extentPx;
      vertices[6 * i + 3] = points[2 * i] - ox;
      vertices[6 * i + 4] = points[2 * i + 1] - oy;
      vertices[6 * i + 5] = -extentPx;
    }

    gl.useProgram(this.smooth.program);
    gl.uniform1f(this.halfWidthUniform, halfWidthPx);
    this.drawStrip(this.smooth, color, 6 * count, 2 * count);
  }
}
