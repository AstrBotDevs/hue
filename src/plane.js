import { hsvToRgb } from './color.js';

/** Draw the HSV plane on demand, using a single GPU triangle with a Canvas fallback. */
export class ColorPlane {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: false });
    if (this.gl) {
      const gl = this.gl;
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      this.program = gl.createProgram();
      gl.attachShader(this.program, compile(gl.VERTEX_SHADER, 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}'));
      gl.attachShader(this.program, compile(gl.FRAGMENT_SHADER, `
        precision highp float;
        uniform vec2 resolution;
        uniform vec2 offset;
        uniform float zoom;
        uniform float hue;
        void main() {
          vec2 uv = vec2(gl_FragCoord.x, resolution.y-gl_FragCoord.y) / resolution;
          vec2 sv = clamp(offset + uv / zoom, 0., 1.);
          vec3 pure = clamp(abs(mod(hue/60. + vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
          gl_FragColor = vec4(mix(vec3(1.), pure, sv.x) * (1.-sv.y), 1.);
        }
      `));
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
      gl.useProgram(this.program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(this.program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      this.uniforms = Object.fromEntries(['resolution','offset','zoom','hue'].map((name) => [name, gl.getUniformLocation(this.program, name)]));
      canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
      canvas.addEventListener('webglcontextrestored', () => location.reload());
    } else {
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.cache = document.createElement('canvas');
      this.cache.width = 1024;
      this.cache.height = 1024;
      this.cacheHue = null;
    }
  }

  draw({ h, zoom, x, y }) {
    const { canvas, gl } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * dpr), height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (gl) {
      if (gl.isContextLost()) return;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(this.uniforms.resolution, width, height);
      gl.uniform2f(this.uniforms.offset, x, y);
      gl.uniform1f(this.uniforms.zoom, zoom);
      gl.uniform1f(this.uniforms.hue, h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      if (this.cacheHue !== h) {
        const ctx = this.cache.getContext('2d');
        ctx.fillStyle = `rgb(${hsvToRgb(h, 1, 1).join(',')})`;
        ctx.fillRect(0, 0, 1024, 1024);
        const white = ctx.createLinearGradient(0, 0, 1024, 0);
        white.addColorStop(0, '#fff'); white.addColorStop(1, '#ffffff00');
        ctx.fillStyle = white; ctx.fillRect(0, 0, 1024, 1024);
        const black = ctx.createLinearGradient(0, 0, 0, 1024);
        black.addColorStop(0, '#00000000'); black.addColorStop(1, '#000');
        ctx.fillStyle = black; ctx.fillRect(0, 0, 1024, 1024);
        this.cacheHue = h;
      }
      this.ctx.drawImage(this.cache, x * 1024, y * 1024, 1024 / zoom, 1024 / zoom, 0, 0, width, height);
    }
  }
}
