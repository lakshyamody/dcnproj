"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/**
 * Our own silk. Domain-warped fBm folded into broad diagonal bands, with a
 * sharp bright white-green core riding the fold crests and a deep green
 * trough. Nothing here is traced from the reference; it is a procedural
 * surface tuned to the same palette.
 */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFade;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.55;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.3; a *= 0.5; }
  return v;
}

/*
 * Height of the cloth at p.
 *
 * The folds have to be roughly PARALLEL or the surface reads as smoke rather
 * than fabric, so the height is driven almost entirely by one coordinate (u,
 * across the folds) and only bent slowly by the other (v, along them).
 */
float surf(vec2 p, float t) {
  float u = p.x * 0.80 + p.y * 1.38;
  float v = p.x * 1.38 - p.y * 0.80;

  float h = 0.0;
  h += 0.58 * sin(u * 3.30 + 0.62 * sin(v * 1.15 + t * 0.52) + t * 0.88);
  h += 0.27 * sin(u * 6.10 - 0.44 * sin(v * 0.92 - t * 0.41) - t * 0.66);
  h += 0.14 * sin(u * 10.4 + 0.30 * sin(v * 1.70 + t * 0.33) + t * 1.15);
  h += 0.30 * (fbm(vec2(u * 0.85, v * 0.55) + vec2(t * 0.20, -t * 0.12)) - 0.5);
  return h;
}

/*
 * Silk as a lit height-field rather than painted bands: take the gradient of
 * surf(), build a normal, and shade it. The narrow specular lobe is what reads
 * as the bright white-green core running along each fold; the broad sheen lobe
 * is the satin body underneath.
 */
void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv;
  p.x *= uRes.x / max(uRes.y, 1.0);

  float t = uTime * 0.16;

  float e = 0.0035;
  float hx = surf(p + vec2(e, 0.0), t) - surf(p - vec2(e, 0.0), t);
  float hy = surf(p + vec2(0.0, e), t) - surf(p - vec2(0.0, e), t);
  vec3 nrm = normalize(vec3(-hx / (2.0 * e) * 0.34, -hy / (2.0 * e) * 0.34, 1.0));

  vec3 L = normalize(vec3(-0.50, 0.58, 0.64));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));

  float diff = max(dot(nrm, L), 0.0);
  float nh = max(dot(nrm, H), 0.0);
  float sheen = pow(nh, 5.0);
  float spec = pow(nh, 46.0);
  float glint = pow(nh, 190.0);

  vec3 deep  = vec3(0.007, 0.052, 0.036);
  vec3 green = vec3(0.030, 0.430, 0.290);

  vec3 col = mix(deep, green, pow(diff, 1.35));
  col += vec3(0.22, 0.82, 0.58) * sheen * 0.50;
  col += vec3(0.78, 0.99, 0.90) * spec * 0.85;
  col += vec3(1.00, 1.00, 0.98) * glint * 0.70;

  // The cloth turns away towards the bottom right and falls into shadow.
  float pool = smoothstep(0.40, 1.30, p.x * 0.55 + uv.y * 0.85);
  col = mix(col, col * 0.30 + vec3(0.005, 0.048, 0.033), pool * 0.72);

  // Roll off the highlights instead of clipping them.
  col = vec3(1.0) - exp(-col * 1.55);

  // Dissolve into the page towards the left and at the top/bottom edges.
  float fade = smoothstep(0.0, 0.48, uv.x);
  fade *= smoothstep(0.0, 0.09, uv.y) * smoothstep(0.0, 0.11, 1.0 - uv.y);
  col *= fade * uFade;

  // Sit the whole thing on the page colour so the canvas edge is invisible.
  col += vec3(0.0196, 0.0314, 0.0275);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function SilkRibbon({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotionSafe();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" }) ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      setFailed(true);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      setFailed(true);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uFade = gl.getUniformLocation(prog, "uFade");

    // Cap the buffer so a large viewport does not cost a full retina surface.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    let raf = 0;
    let fade = 0;
    const t0 = performance.now();

    const draw = (time: number) => {
      resize();
      fade = Math.min(1, fade + 0.02); // ease the whole thing in
      gl.uniform1f(uFade, fade);
      gl.uniform1f(uTime, (time - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduced) {
      // One static frame, no loop.
      fade = 1;
      draw(t0 + 6200);
    } else {
      const loop = (time: number) => {
        draw(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const onResize = () => {
      if (reduced) {
        draw(t0 + 6200);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [reduced]);

  if (failed) return <SilkFallback className={className} />;

  return (
    <canvas
      ref={canvasRef}
      className={cn("size-full", className)}
      aria-hidden="true"
      role="presentation"
    />
  );
}

/** Pure-CSS stand-in for browsers without WebGL. */
export function SilkFallback({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("size-full", className)}
      style={{
        background:
          "radial-gradient(120% 90% at 82% 18%, rgba(190,255,225,.35) 0%, rgba(52,211,153,.22) 18%, rgba(4,121,88,.30) 38%, rgba(6,32,22,.9) 64%, transparent 82%)," +
          "radial-gradient(90% 70% at 62% 78%, rgba(4,121,88,.34) 0%, transparent 70%)," +
          "linear-gradient(118deg, transparent 38%, rgba(214,255,235,.14) 50%, transparent 62%)",
      }}
    />
  );
}

export default SilkRibbon;
