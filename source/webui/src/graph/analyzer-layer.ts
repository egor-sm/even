import { graph, type Mapper } from './geometry';
import type { Spectrum } from './spectrum';
import { parseHexColor, type Rgba } from './theme-colors';

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

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('Failed to create shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true)
    throw new Error(`Shader compilation failed: ${gl.getShaderInfoLog(shader) ?? ''}`);

  return shader;
};

const createProgram = (gl: WebGL2RenderingContext): WebGLProgram => {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true)
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program) ?? ''}`);

  return program;
};

export type AnalyzerColors = { fill: string; pre: string; post: string };

/**
 * The analyzer spectra with WebGL2: a fill under the main spectrum (post, or pre when only pre is
 * shown) and 1 px lines for pre and post. Geometry is rebuilt on the CPU per frame, in graph units.
 */
export class AnalyzerLayer {
  readonly canvas = document.createElement('canvas');
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly colorUniform: WebGLUniformLocation | null;
  private pixelsPerUnit = 1;
  private colors: { fill: Rgba; pre: Rgba; post: Rgba } = {
    fill: [0, 0, 0, 0],
    pre: [0, 0, 0, 0],
    post: [0, 0, 0, 0],
  };
  private points = new Float32Array(0);
  private vertices = new Float32Array(0);

  constructor() {
    this.canvas.className = 'graph-canvas analyzer';
    const gl = this.canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true, alpha: true });
    if (gl === null) throw new Error('WebGL2 is not available');
    this.gl = gl;

    this.program = createProgram(gl);
    this.buffer = gl.createBuffer();
    this.colorUniform = gl.getUniformLocation(this.program, 'u_color');

    gl.useProgram(this.program);
    gl.uniform2f(gl.getUniformLocation(this.program, 'u_size'), graph.width, graph.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const position = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(uiScale: number): void {
    this.pixelsPerUnit = uiScale * devicePixelRatio;
    this.canvas.width = Math.round(graph.width * this.pixelsPerUnit);
    this.canvas.height = Math.round(graph.height * this.pixelsPerUnit);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  setColors(colors: AnalyzerColors): void {
    this.colors = {
      fill: parseHexColor(colors.fill),
      pre: parseHexColor(colors.pre),
      post: parseHexColor(colors.post),
    };
  }

  draw(mapper: Mapper, pre: Spectrum, post: Spectrum): void {
    const { gl, pixelsPerUnit } = this;
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Clip to the plot area, like every graph layer.
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(
      Math.round(graph.left * pixelsPerUnit),
      0,
      Math.round((graph.right - graph.left) * pixelsPerUnit),
      this.canvas.height,
    );

    const main = post.frequencies.length >= 2 ? post : pre;
    if (main.frequencies.length >= 2) this.drawFill(mapper, main);
    if (pre.frequencies.length >= 2) this.drawLine(mapper, pre, this.colors.pre);
    if (post.frequencies.length >= 2) this.drawLine(mapper, post, this.colors.post);
  }

  dispose(): void {
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private project(mapper: Mapper, spectrum: Spectrum): Float32Array {
    const count = spectrum.frequencies.length;
    if (this.points.length !== 2 * count) {
      this.points = new Float32Array(2 * count);
      this.vertices = new Float32Array(4 * count);
    }

    for (let i = 0; i < count; i++) {
      this.points[2 * i] = mapper.x(spectrum.frequencies[i]);
      this.points[2 * i + 1] = Math.min(mapper.analyzerY(spectrum.display[i]), graph.height);
    }
    return this.points;
  }

  private drawStrip(color: Rgba, count: number): void {
    const { gl } = this;
    gl.uniform4fv(this.colorUniform, color);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 2 * count);
  }

  // A strip between the curve and the bottom edge.
  private drawFill(mapper: Mapper, spectrum: Spectrum): void {
    const points = this.project(mapper, spectrum);
    const count = points.length / 2;
    for (let i = 0; i < count; i++) {
      this.vertices[4 * i] = points[2 * i];
      this.vertices[4 * i + 1] = points[2 * i + 1];
      this.vertices[4 * i + 2] = points[2 * i];
      this.vertices[4 * i + 3] = graph.height;
    }
    this.drawStrip(this.colors.fill, count);
  }

  // A 1 px line: each point offset along the normal of its neighbours' chord.
  private drawLine(mapper: Mapper, spectrum: Spectrum, color: Rgba): void {
    const points = this.project(mapper, spectrum);
    const count = points.length / 2;
    const halfWidth = 0.5;
    for (let i = 0; i < count; i++) {
      const previous = Math.max(i - 1, 0);
      const next = Math.min(i + 1, count - 1);
      const dx = points[2 * next] - points[2 * previous];
      const dy = points[2 * next + 1] - points[2 * previous + 1];
      const length = Math.hypot(dx, dy) || 1;
      const nx = (-dy / length) * halfWidth;
      const ny = (dx / length) * halfWidth;

      this.vertices[4 * i] = points[2 * i] + nx;
      this.vertices[4 * i + 1] = points[2 * i + 1] + ny;
      this.vertices[4 * i + 2] = points[2 * i] - nx;
      this.vertices[4 * i + 3] = points[2 * i + 1] - ny;
    }
    this.drawStrip(color, count);
  }
}
