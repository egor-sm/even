import { curveStyle, type CurveRenderer } from './curve-renderer';
import type { SpectrumScale } from './scale';

const vertexShaderSource = `#version 300 es
in vec2 a_position; // device pixels, origin top-left
uniform vec2 u_resolution;

void main() {
  vec2 clip = a_position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

uniform vec4 u_topColor;
uniform vec4 u_bottomColor;
uniform float u_height;

out vec4 outColor;

void main() {
  // Vertical gradient; a line uses the same colour for top and bottom.
  vec4 color = mix(u_bottomColor, u_topColor, gl_FragCoord.y / u_height);
  outColor = vec4(color.rgb * color.a, color.a); // premultiplied alpha
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

const uniform = (gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation => {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`Missing uniform ${name}`);
  return location;
};

/**
 * Renders the curve with WebGL2: the fill is a triangle strip between the curve and the bottom edge,
 * the line is a triangle strip extruded along per-vertex normals. Geometry is rebuilt on the CPU each
 * frame (~2k vertices) and rasterised on the GPU.
 */
export class WebGLCurveRenderer implements CurveRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly uniforms: {
    resolution: WebGLUniformLocation;
    topColor: WebGLUniformLocation;
    bottomColor: WebGLUniformLocation;
    height: WebGLUniformLocation;
  };

  private scale: SpectrumScale | null = null;
  private fillVertices = new Float32Array(0);
  private lineVertices = new Float32Array(0);
  private points = new Float32Array(0);

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true, alpha: true });
    if (gl === null) throw new Error('WebGL2 is not available');
    this.gl = gl;

    this.program = createProgram(gl);
    this.buffer = gl.createBuffer();
    this.uniforms = {
      resolution: uniform(gl, this.program, 'u_resolution'),
      topColor: uniform(gl, this.program, 'u_topColor'),
      bottomColor: uniform(gl, this.program, 'u_bottomColor'),
      height: uniform(gl, this.program, 'u_height'),
    };

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const position = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(scale: SpectrumScale): void {
    this.scale = scale;
    this.canvas.width = scale.width;
    this.canvas.height = scale.height;

    const { gl } = this;
    gl.viewport(0, 0, scale.width, scale.height);
    gl.uniform2f(this.uniforms.resolution, scale.width, scale.height);
    gl.uniform1f(this.uniforms.height, scale.height);
  }

  draw(frequencies: Float32Array, levelsDb: Float32Array): void {
    const { gl, scale } = this;
    if (scale === null) return;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const count = frequencies.length;
    if (count < 2) return;

    this.ensureCapacity(count);
    const { points, fillVertices, lineVertices } = this;

    for (let i = 0; i < count; i++) {
      points[2 * i] = scale.x(frequencies[i]);
      points[2 * i + 1] = scale.y(levelsDb[i]);
    }

    // Fill: (x, curve) / (x, bottom) pairs.
    for (let i = 0; i < count; i++) {
      fillVertices[4 * i] = points[2 * i];
      fillVertices[4 * i + 1] = points[2 * i + 1];
      fillVertices[4 * i + 2] = points[2 * i];
      fillVertices[4 * i + 3] = scale.height;
    }

    // Line: offset each point along the normal of its neighbours' chord.
    const halfWidth = (curveStyle.lineWidthCss * devicePixelRatio) / 2;
    for (let i = 0; i < count; i++) {
      const previous = Math.max(i - 1, 0);
      const next = Math.min(i + 1, count - 1);
      const dx = points[2 * next] - points[2 * previous];
      const dy = points[2 * next + 1] - points[2 * previous + 1];
      const length = Math.hypot(dx, dy) || 1;
      const nx = (-dy / length) * halfWidth;
      const ny = (dx / length) * halfWidth;

      lineVertices[4 * i] = points[2 * i] + nx;
      lineVertices[4 * i + 1] = points[2 * i + 1] + ny;
      lineVertices[4 * i + 2] = points[2 * i] - nx;
      lineVertices[4 * i + 3] = points[2 * i + 1] - ny;
    }

    gl.uniform4fv(this.uniforms.topColor, curveStyle.fillTopColor);
    gl.uniform4fv(this.uniforms.bottomColor, curveStyle.fillBottomColor);
    gl.bufferData(gl.ARRAY_BUFFER, fillVertices, gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 2 * count);

    gl.uniform4fv(this.uniforms.topColor, curveStyle.lineColor);
    gl.uniform4fv(this.uniforms.bottomColor, curveStyle.lineColor);
    gl.bufferData(gl.ARRAY_BUFFER, lineVertices, gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 2 * count);
  }

  dispose(): void {
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private ensureCapacity(count: number): void {
    if (this.points.length === 2 * count) return;

    this.points = new Float32Array(2 * count);
    this.fillVertices = new Float32Array(4 * count);
    this.lineVertices = new Float32Array(4 * count);
  }
}
