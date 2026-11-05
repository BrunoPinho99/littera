"use client";

import React, { useEffect, useRef } from 'react';

export interface TerrainConfig {
  amplitude?: number;
  scale?: number;
  speed?: number;
  flow?: number;
  horizon?: number;
}

export interface LightConfig {
  x?: number;
  height?: number;
  depth?: number;
  contrast?: number;
  followMouse?: boolean;
}

export interface PatchesConfig {
  seed?: number;
  size?: number;
  speed?: number;
}

export interface RippleConfig {
  enabled?: boolean;
  speed?: number;
  width?: number;
  strength?: number;
  lift?: number;
  life?: number;
}

export interface DustConfig {
  enabled?: boolean;
  amount?: number;
  opacity?: number;
  lift?: number;
  coverage?: number;
  outside?: number;
}

export interface GrassConfig {
  enabled?: boolean;
  amount?: number;
  opacity?: number;
  length?: number;
  coverage?: number;
  lean?: number;
}

export interface DotsConfig {
  enabled?: boolean;
  columns?: number;
  opacity?: number;
  size?: number;
  coverage?: number;
  glow?: number;
}

export interface EdgeFadeConfig {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface ParticleTerrainCanvasProps {
  color?: string;
  background?: string;
  bgMode?: 'auto' | 'light' | 'dark';
  hueShift?: number;
  brightness?: number;
  grain?: number;
  mouseGlow?: boolean;
  glowRadius?: number;
  quality?: number;
  terrain?: TerrainConfig;
  light?: LightConfig;
  patches?: PatchesConfig;
  ripple?: RippleConfig;
  dust?: DustConfig;
  grass?: GrassConfig;
  dots?: DotsConfig;
  fade?: EdgeFadeConfig;
  className?: string;
  style?: React.CSSProperties;
}

interface NormalizedSettings {
  color: [number, number, number];
  light: boolean;
  hueShift: number;
  brightness: number;
  grain: number;
  mouseGlow: boolean;
  glowRadius: number;
  T: Required<TerrainConfig>;
  LT: Required<LightConfig>;
  PT: Required<PatchesConfig>;
  RP: Required<RippleConfig>;
  DU: Required<DustConfig>;
  GR: Required<GrassConfig>;
  DT: Required<DotsConfig>;
}

interface TerrainEngine {
  resize: (w: number, h: number, dpr: number) => void;
  draw: (dt: number, advance?: boolean) => void;
  click: (x: number, y: number) => boolean;
  set: (settings: NormalizedSettings) => void;
  pointer: (x: number, y: number) => void;
  leave: () => void;
  hasRipples: () => boolean;
}

const DEFAULT_TERRAIN: Required<TerrainConfig> = {
  amplitude: 0.5,
  scale: 1.05,
  speed: 0.05,
  flow: 1.3,
  horizon: 0.52,
};

const DEFAULT_LIGHT: Required<LightConfig> = {
  x: -0.4,
  height: 0.55,
  depth: -0.5,
  contrast: 1.9,
  followMouse: false,
};

const DEFAULT_PATCHES: Required<PatchesConfig> = {
  seed: 30,
  size: 0.95,
  speed: 0,
};

const DEFAULT_RIPPLE: Required<RippleConfig> = {
  enabled: true,
  speed: 1.4,
  width: 0.18,
  strength: 0.9,
  lift: 0.12,
  life: 2.6,
};

const DEFAULT_DUST: Required<DustConfig> = {
  enabled: true,
  amount: 30000,
  opacity: 0.63,
  lift: 0.19,
  coverage: 0.14,
  outside: 0.63,
};

const DEFAULT_GRASS: Required<GrassConfig> = {
  enabled: false,
  amount: 16000,
  opacity: 0.65,
  length: 9,
  coverage: 0.5,
  lean: 0.45,
};

const DEFAULT_DOTS: Required<DotsConfig> = {
  enabled: true,
  columns: 250,
  opacity: 0.96,
  size: 1.4,
  coverage: 0.28,
  glow: 1.1,
};

const rgbCache = new Map<string, [number, number, number]>();

function parseColorToRgb(color: string): [number, number, number] {
  const cached = rgbCache.get(color);
  if (cached) return cached;
  let rgb: [number, number, number] = [54, 174, 255];
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      rgb = [data[0], data[1], data[2]];
    }
  } catch {
    // Fallback to cobalt-sky default
  }
  rgbCache.set(color, rgb);
  return rgb;
}

function buildMaskStyle(fade?: EdgeFadeConfig): React.CSSProperties {
  const top = Math.max(0, fade?.top || 0);
  const bottom = Math.max(0, fade?.bottom || 0);
  const left = Math.max(0, fade?.left || 0);
  const right = Math.max(0, fade?.right || 0);
  const masks: string[] = [];

  if (top || bottom) {
    masks.push(
      `linear-gradient(to bottom, transparent 0px, #000 ${top}px, #000 calc(100% - ${bottom}px), transparent 100%)`
    );
  }
  if (left || right) {
    masks.push(
      `linear-gradient(to right, transparent 0px, #000 ${left}px, #000 calc(100% - ${right}px), transparent 100%)`
    );
  }
  if (!masks.length) return {};
  const maskImage = masks.join(', ');
  return {
    maskImage,
    WebkitMaskImage: maskImage,
    ...(masks.length > 1
      ? {
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }
      : {}),
  };
}

/**
 * Self-contained 3D stipple/particle heightmap engine ported 1:1 from Tillmorn's Framer canvas runtime.
 * Keep pure with zero external closures so it can also execute inside an OffscreenCanvas Web Worker.
 */
function createTerrainEngine(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): TerrainEngine {
  const canvas = ctx.canvas;

  function hash2D(ix: number, iy: number): number {
    let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967295;
  }

  function valueNoise(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = hash2D(ix, iy);
    const n10 = hash2D(ix + 1, iy);
    const n01 = hash2D(ix, iy + 1);
    const n11 = hash2D(ix + 1, iy + 1);
    return n00 + (n10 - n00) * sx + (n01 - n00) * sy + (n00 - n10 - n01 + n11) * sx * sy;
  }

  function fbm(x: number, y: number): number {
    let sum = 0;
    let amp = 0.5;
    let px = x;
    let py = y;
    for (let i = 0; i < 4; i++) {
      sum += amp * valueNoise(px, py);
      const nx = (px * 0.8 - py * 0.6) * 2.03 + 1.7;
      const ny = (px * 0.6 + py * 0.8) * 2.03 + 9.2;
      px = nx;
      py = ny;
      amp *= 0.5;
    }
    return sum / 0.9375;
  }

  const smoothstep01 = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));

  function rgbToHsl(r255: number, g255: number, b255: number): [number, number, number] {
    const r = r255 / 255;
    const g = g255 / 255;
    const b = b255 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }

  function hslToRgb(deg: number, s: number, l: number): [number, number, number] {
    const h = (((deg % 360) + 360) % 360) / 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (tVal: number): number => {
      let t = tVal;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [hue2rgb(h + 1 / 3) * 255, hue2rgb(h) * 255, hue2rgb(h - 1 / 3) * 255];
  }

  let settings: NormalizedSettings | null = null;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let imgData: ImageData | null = null;
  let imgUint32 = new Uint32Array(1);
  let accum = new Float32Array(4);
  let grainFloat = new Float32Array(4);
  let grainUint32 = new Uint32Array(1);
  let grainKey = '';
  let touchedFrame = new Int32Array(1);
  let activePixels = new Int32Array(1);
  let prevPixels = new Int32Array(1);
  let activeCount = 0;
  let prevCount = 0;
  let frameId = 0;

  const heightGrid = new Float32Array(25500);
  const shadeGrid = new Float32Array(25500);
  const rowDepth = new Float32Array(150);
  const colU = new Float32Array(170);
  for (let i = 0; i < 170; i++) colU[i] = -1.15 + (2.3 * i) / 169;

  let halfW = 1;
  let horizonMask = new Float32Array(1);
  let rowHorizon = new Float32Array(1);
  const lut = new Float32Array(256 * 3);
  let lutKey = '';

  interface SampleCloud {
    n: number;
    u: Float32Array;
    gu: Float32Array;
    gv: Float32Array;
    v: Float32Array;
    fade: Float32Array;
    r: Float32Array;
    key: string;
    iz: Float64Array;
    z: Float64Array;
    sx: Float64Array;
    wx: Float64Array;
    kk: Float64Array;
    occ: Int32Array;
    k0: Int32Array;
    w00: Float64Array;
    w10: Float64Array;
    w01: Float64Array;
    w11: Float64Array;
  }

  const buildCloud = (uArr: Float32Array, vArr: Float32Array, rArr: Float32Array): SampleCloud => {
    const n = uArr.length;
    const gu = new Float32Array(n);
    const gv = new Float32Array(n);
    const fade = new Float32Array(n);
    const k0 = new Int32Array(n);
    const w00 = new Float64Array(n);
    const w10 = new Float64Array(n);
    const w01 = new Float64Array(n);
    const w11 = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      gu[i] = ((uArr[i] + 1.15) / 2.3) * 169;
      gv[i] = vArr[i] * 149;
      fade[i] = 1 - 0.7 * Math.pow(vArr[i], 2.5);
      let gx = gu[i] | 0;
      let gy = gv[i] | 0;
      if (gx > 168) gx = 168;
      if (gy > 148) gy = 148;
      const fx = gu[i] - gx;
      const fy = gv[i] - gy;
      k0[i] = gy * 170 + gx;
      w00[i] = (1 - fx) * (1 - fy);
      w10[i] = fx * (1 - fy);
      w01[i] = (1 - fx) * fy;
      w11[i] = fx * fy;
    }

    return {
      n,
      u: uArr,
      gu,
      gv,
      v: vArr,
      fade,
      r: rArr,
      key: '',
      iz: new Float64Array(n),
      z: new Float64Array(n),
      sx: new Float64Array(n),
      wx: new Float64Array(n),
      kk: new Float64Array(n),
      occ: new Int32Array(n),
      k0,
      w00,
      w10,
      w01,
      w11,
    };
  };

  const buildRandomCloud = (count: number): SampleCloud => {
    const uArr = new Float32Array(count);
    const vArr = new Float32Array(count);
    const rArr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      uArr[i] = Math.random() * 2.3 - 1.15;
      vArr[i] = Math.random();
      rArr[i] = Math.random();
    }
    return buildCloud(uArr, vArr, rArr);
  };

  const buildHexGridCloud = (cols: number): SampleCloud => {
    const rows = Math.round(cols * 0.8);
    const total = cols * rows;
    const uArr = new Float32Array(total);
    const vArr = new Float32Array(total);
    const rArr = new Float32Array(total);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        uArr[idx] = -1.15 + (2.3 * (c + (r % 2) * 0.5)) / cols;
        vArr[idx] = (r + 0.5) / rows;
        rArr[idx] = Math.random();
        idx++;
      }
    }
    return buildCloud(uArr, vArr, rArr);
  };

  let dustCloud: SampleCloud | null = null;
  let dustAmount = -1;
  let grassCloud: SampleCloud | null = null;
  let grassAmount = -1;
  let dotsCloud: SampleCloud | null = null;
  let dotsCols = -1;

  const sinTable = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) sinTable[i] = Math.sin((i / 1024) * Math.PI * 2);
  const fastSin = (v: number): number => sinTable[((v * 162.97) | 0) & 1023];

  let terrainTime = 0;
  let clockTime = 0;
  let patchTime = 0;
  const ripples: Array<{ x: number; z: number; t0: number }> = [];
  const cam = { camH: 1, f: 1, horizonY: 0, hsw: 1, ok: false };
  const pointer = { x: -1e9, y: -1e9 };

  const resize = (w: number, h: number, nextDpr: number) => {
    dpr = nextDpr;
    width = Math.max(1, Math.round(w * dpr));
    height = Math.max(1, Math.round(h * dpr));
    canvas.width = width;
    canvas.height = height;
    imgData = ctx.createImageData(width, height);
    imgUint32 = new Uint32Array(imgData.data.buffer);
    accum = new Float32Array(width * height * 4);
    grainFloat = new Float32Array(width * height * 4);
    grainUint32 = new Uint32Array(width * height);
    touchedFrame = new Int32Array(width * height);
    activePixels = new Int32Array(width * height);
    prevPixels = new Int32Array(width * height);
    activeCount = 0;
    prevCount = 0;
    grainKey = '';
    halfW = (width + 1) >> 1;
    horizonMask = new Float32Array(150 * halfW);
    rowHorizon = new Float32Array(halfW);
  };

  const scratchRgba = new Uint8ClampedArray(4);
  const scratchU32 = new Uint32Array(scratchRgba.buffer);

  const packPremultiplied = (
    src: Float32Array,
    srcOffset: number,
    dst: Uint8ClampedArray,
    dstOffset: number
  ) => {
    const alpha = src[srcOffset + 3];
    if (alpha < 0.002) {
      dst[dstOffset + 3] = 0;
      return;
    }
    const clampedA = alpha > 1 ? 1 : alpha;
    const invA = 1 / alpha;
    dst[dstOffset] = src[srcOffset] * invA;
    dst[dstOffset + 1] = src[srcOffset + 1] * invA;
    dst[dstOffset + 2] = src[srcOffset + 2] * invA;
    dst[dstOffset + 3] = clampedA * 255;
  };

  const ensureGrain = (cfg: NormalizedSettings) => {
    const key = `${cfg.light}|${cfg.grain}|${width}x${height}`;
    if (key === grainKey) return;
    grainKey = key;
    grainFloat.fill(0);
    const base = cfg.light ? 0 : 255;
    const strength = cfg.grain * 0.14;
    for (let i = 0; i < grainFloat.length; i += 4) {
      const g = Math.random() * strength;
      grainFloat[i] = base * g;
      grainFloat[i + 1] = base * g;
      grainFloat[i + 2] = base * g;
      grainFloat[i + 3] = g;
    }
    const total = width * height;
    for (let i = 0; i < total; i++) {
      scratchU32[0] = 0;
      packPremultiplied(grainFloat, i * 4, scratchRgba, 0);
      grainUint32[i] = scratchU32[0];
    }
    imgUint32.set(grainUint32);
    prevCount = 0;
  };

  const ensurePalette = (cfg: NormalizedSettings) => {
    const key = `${cfg.color.join(',')}|${cfg.hueShift}|${cfg.brightness}|${cfg.light}`;
    if (key === lutKey) return;
    lutKey = key;
    const [r, g, b] = cfg.color;
    const [h, s, l] = rgbToHsl(r, g, b);
    const lLow = cfg.light ? Math.min(0.72, l + (1 - l) * 0.2) : l * 0.3;
    const lHigh = cfg.light ? l * 0.42 : Math.min(0.94, l + (1 - l) * 0.6);
    const gain = cfg.light ? 1 : cfg.brightness;
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const lum = lLow + (lHigh - lLow) * Math.pow(t, 0.85);
      const sat = Math.min(1, s * (0.7 + 0.4 * t));
      const [cr, cg, cb] = hslToRgb(h + cfg.hueShift * t, sat, lum);
      lut[i * 3] = cr * gain;
      lut[i * 3 + 1] = cg * gain;
      lut[i * 3 + 2] = cb * gain;
    }
  };

  let alphaBoost = 1;

  const splatPixel = (px: number, py: number, shadeIdx: number, alpha: number) => {
    const idx = py * width + px;
    const off = idx * 4;
    if (touchedFrame[idx] !== frameId) {
      touchedFrame[idx] = frameId;
      activePixels[activeCount++] = idx;
      accum[off] = grainFloat[off];
      accum[off + 1] = grainFloat[off + 1];
      accum[off + 2] = grainFloat[off + 2];
      accum[off + 3] = grainFloat[off + 3];
    }
    const cOff = shadeIdx * 3;
    const a = alpha * alphaBoost;
    accum[off] += lut[cOff] * a;
    accum[off + 1] += lut[cOff + 1] * a;
    accum[off + 2] += lut[cOff + 2] * a;
    accum[off + 3] += a;
  };

  return {
    resize,
    set: (next) => {
      settings = next;
    },
    pointer: (x, y) => {
      pointer.x = x * dpr;
      pointer.y = y * dpr;
    },
    leave: () => {
      pointer.x = -1e9;
      pointer.y = -1e9;
    },
    hasRipples: () => ripples.length > 0,
    click: (x, y) => {
      if (!settings || !settings.RP.enabled || !cam.ok) return false;
      const px = x * dpr;
      const py = y * dpr;
      const ndcX = px / (width / 2) - 1;
      const colPos = Math.max(0, Math.min(168.999, ((ndcX + 1.15) / 2.3) * 169));
      const c0 = colPos | 0;
      const cf = colPos - c0;
      let hitZ = rowDepth[149];
      for (let r = 0; r < 150; r++) {
        const hVal = heightGrid[r * 170 + c0] * (1 - cf) + heightGrid[r * 170 + c0 + 1] * cf;
        if (cam.horizonY + ((cam.camH - hVal) / rowDepth[r]) * cam.f <= py) {
          hitZ = rowDepth[r];
          break;
        }
      }
      ripples.push({ x: ndcX * cam.hsw * hitZ, z: hitZ, t0: clockTime });
      if (ripples.length > 6) ripples.shift();
      return true;
    },
    draw: (dt, advance = true) => {
      const cfg = settings;
      if (!cfg || !imgData) return;

      const T = cfg.T;
      const DU = cfg.DU;
      const GR = cfg.GR;
      const DT = cfg.DT;
      const LT = cfg.LT;
      const PT = cfg.PT;
      const RP = cfg.RP;

      ensureGrain(cfg);
      ensurePalette(cfg);

      frameId++;
      activeCount = 0;
      alphaBoost = cfg.light ? 1.8 * cfg.brightness : 1;

      if (advance) {
        terrainTime += dt * T.speed;
        patchTime += dt * PT.speed;
      }
      clockTime += dt;

      for (let i = ripples.length - 1; i >= 0; i--) {
        if (clockTime - ripples[i].t0 > RP.life) ripples.splice(i, 1);
      }
      const rippleCount = RP.enabled ? ripples.length : 0;

      const sampleRipple = (wx: number, wz: number): number => {
        let sum = 0;
        for (let i = 0; i < rippleCount; i++) {
          const rp = ripples[i];
          const age = clockTime - rp.t0;
          const radius = age * RP.speed;
          const dx = wx - rp.x;
          const dz = wz - rp.z;
          const band = (Math.sqrt(dx * dx + dz * dz) - radius) / RP.width;
          if (band > 3 || band < -3) continue;
          const decay = 1 - age / RP.life;
          sum += Math.exp(-band * band) * decay * decay;
        }
        return sum > 1 ? 1 : sum;
      };

      const flowX = terrainTime * T.flow * 0.3;
      const flowZ = terrainTime * T.flow;
      const amp = T.amplitude;
      const ridge = 0.62 * amp;
      const camH = ridge + 0.2;
      const horizonY = height * T.horizon;
      const focal = (height - horizonY) / camH;
      const nearInvZ = Math.min(4.5, (1.15 * camH) / (camH - ridge));
      const hsw = width / 2 / focal;
      const worldScale = T.scale * 0.24;

      cam.camH = camH;
      cam.f = focal;
      cam.horizonY = horizonY;
      cam.hsw = hsw;
      cam.ok = true;

      const midInvZ = Math.min(1.4, nearInvZ);
      const invZCurve = (v: number): number =>
        v < 0.15 ? nearInvZ + (midInvZ - nearInvZ) * (v / 0.15) : midInvZ + (0.3 - midInvZ) * ((v - 0.15) / 0.85);

      for (let r = 0; r < 150; r++) {
        const z = 1 / invZCurve(r / 149);
        rowDepth[r] = z;
        const rowOff = r * 170;
        for (let c = 0; c < 170; c++) {
          const wx = colU[c] * hsw * z;
          const nVal =
            fbm(wx * worldScale + flowX, z * worldScale + flowZ) +
            0.2 * (valueNoise(wx * worldScale * 1.7 + terrainTime * 0.3, z * worldScale * 1.7 - terrainTime * 0.22) - 0.5);
          heightGrid[rowOff + c] = (nVal - 0.32) * amp + (rippleCount ? RP.lift * sampleRipple(wx, z) : 0);
        }
      }

      let lx = LT.x;
      let ly = Math.max(0.02, LT.height);
      let lz = LT.depth;
      if (LT.followMouse && pointer.x > -1e8) {
        lx = (pointer.x / width) * 2.4 - 1.2;
        lz = 1 - (pointer.y / height) * 2;
      }
      const lLen = Math.hypot(lx, ly, lz);
      lx /= lLen;
      ly /= lLen;
      lz /= lLen;

      for (let r = 0; r < 150; r++) {
        const rNext = r < 149 ? r + 1 : r;
        const rPrev = r > 0 ? r - 1 : r;
        const dz = rowDepth[rNext] - rowDepth[rPrev] || 0.001;
        const dx = ((2 * 2.3) / 169) * hsw * rowDepth[r];
        for (let c = 0; c < 170; c++) {
          const cNext = c < 169 ? c + 1 : c;
          const cPrev = c > 0 ? c - 1 : c;
          const nx = -(heightGrid[r * 170 + cNext] - heightGrid[r * 170 + cPrev]) / dx;
          const nz = -(heightGrid[rNext * 170 + c] - heightGrid[rPrev * 170 + c]) / dz;
          const nLen = Math.hypot(nx, 1, nz);
          const ndotl = ((nx * lx + ly + nz * lz) / nLen - 0.3) / 0.62;
          shadeGrid[r * 170 + c] = ndotl <= 0 ? 0 : ndotl >= 1 ? 1 : Math.pow(ndotl, LT.contrast);
        }
      }

      rowHorizon.fill(1e9);
      for (let r = 0; r < 150; r++) {
        const z = rowDepth[r];
        let prevX = 0;
        let prevY = 0;
        for (let c = 0; c < 170; c++) {
          const hx = (width / 4) * (1 + colU[c]);
          const hy = horizonY + ((camH - heightGrid[r * 170 + c]) / z) * focal;
          if (c > 0) {
            const x0 = Math.max(0, Math.ceil(prevX));
            const x1 = Math.min(halfW - 1, Math.floor(hx));
            for (let x = x0; x <= x1; x++) {
              const yInterp = prevY + ((hy - prevY) * (x - prevX)) / (hx - prevX);
              if (yInterp < rowHorizon[x]) rowHorizon[x] = yInterp;
            }
          }
          prevX = hx;
          prevY = hy;
        }
        horizonMask.set(rowHorizon, r * halfW);
      }

      const occPad = 2 * dpr;
      const occlusionFactor = (occIdx: number, sy: number): number =>
        occIdx < 0 ? 1 : sy > horizonMask[occIdx] + occPad ? 0.07 : 1;

      const glowR = cfg.glowRadius * dpr;
      const hasMouseGlow = cfg.mouseGlow && pointer.x > -1e8;
      const sampleMouseGlow = (sx: number, sy: number): number => {
        if (!hasMouseGlow) return 0;
        const dx = sx - pointer.x;
        const dy = sy - pointer.y;
        const d2 = dx * dx + dy * dy;
        return d2 < glowR * glowR ? (1 - Math.sqrt(d2) / glowR) * 0.7 : 0;
      };

      const patchFreq = 3 / Math.max(0.1, PT.size);
      const patchOffset = PT.seed * 13.37;
      const samplePatch = (wx: number, wz: number, salt: number, coverage: number): number => {
        const seed = salt + patchOffset;
        const px = (wx * worldScale + flowX) * patchFreq + seed + patchTime * 0.6;
        const pz = (wz * worldScale + flowZ) * patchFreq - seed - patchTime * 0.35;
        const val =
          valueNoise(px, pz) * 0.67 +
          valueNoise(px * 2.3 + 5 - patchTime * 0.9, pz * 2.3 + patchTime * 0.5) * 0.33;
        const thresh = 0.5 + (0.5 - coverage) * 0.55;
        return smoothstep01((val - thresh + 0.1) / 0.2);
      };

      const centerX = width / 2;
      const projKey = `${width}|${height}|${nearInvZ}|${midInvZ}|${hsw}|${halfW}`;
      const projectCloud = (cloud: SampleCloud) => {
        if (cloud.key === projKey) return;
        cloud.key = projKey;
        for (let i = 0; i < cloud.n; i++) {
          const iz = invZCurve(cloud.v[i]);
          const z = 1 / iz;
          const sx = centerX * (1 + cloud.u[i]);
          cloud.iz[i] = iz;
          cloud.z[i] = z;
          cloud.sx[i] = sx;
          cloud.wx[i] = cloud.u[i] * hsw * z;
          let kk = Math.sqrt(iz);
          if (kk < 0.4) kk = 0.4;
          else if (kk > 2.2) kk = 2.2;
          cloud.kk[i] = kk;
          const rowIdx = (cloud.gv[i] | 0) - 1;
          let hxIdx = (sx * 0.5) | 0;
          if (hxIdx < 0) hxIdx = 0;
          else if (hxIdx >= halfW) hxIdx = halfW - 1;
          cloud.occ[i] = rowIdx < 0 ? -1 : rowIdx * halfW + hxIdx;
        }
      };

      const interpHeight = (cloud: SampleCloud, i: number): number => {
        const k = cloud.k0[i];
        const kNext = k + 170;
        return (
          heightGrid[k] * cloud.w00[i] +
          heightGrid[k + 1] * cloud.w10[i] +
          heightGrid[kNext] * cloud.w01[i] +
          heightGrid[kNext + 1] * cloud.w11[i]
        );
      };

      const interpShade = (cloud: SampleCloud, i: number): number => {
        const k = cloud.k0[i];
        const kNext = k + 170;
        return (
          shadeGrid[k] * cloud.w00[i] +
          shadeGrid[k + 1] * cloud.w10[i] +
          shadeGrid[kNext] * cloud.w01[i] +
          shadeGrid[kNext + 1] * cloud.w11[i]
        );
      };

      if (DU.enabled) {
        const amt = Math.round(DU.amount);
        if (amt !== dustAmount || !dustCloud) {
          dustAmount = amt;
          dustCloud = buildRandomCloud(amt);
        }
        projectCloud(dustCloud);
        const op = DU.opacity;
        const lift = DU.lift;
        for (let i = 0; i < amt; i++) {
          const iz = dustCloud.iz[i];
          const hVal = interpHeight(dustCloud, i);
          const rnd = dustCloud.r[i];
          const sy = horizonY + (camH - hVal - lift * rnd * rnd * rnd) * iz * focal;
          if (sy < 0 || sy >= height) continue;
          const sx = dustCloud.sx[i];
          const ix = sx | 0;
          const iy = sy | 0;
          if (ix < 0 || ix >= width) continue;
          const wz = dustCloud.z[i];
          const wx = dustCloud.wx[i];
          const rp = rippleCount ? sampleRipple(wx, wz) * RP.strength : 0;
          let shade = interpShade(dustCloud, i) + sampleMouseGlow(sx, sy) + rp;
          if (shade > 1) shade = 1;
          const twinkle = 0.75 + 0.25 * fastSin(terrainTime * 3 + rnd * 40);
          let patch = DU.outside + (1 - DU.outside) * samplePatch(wx, wz, 7.3, DU.coverage);
          if (rp > patch) patch = rp;
          const alpha =
            (1 + 1.5 * rp) *
            op *
            patch *
            dustCloud.fade[i] *
            occlusionFactor(dustCloud.occ[i], sy) *
            (0.25 + 0.75 * shade) *
            twinkle;
          if (alpha < 0.01) continue;
          const shadeIdx = (shade * 255) | 0;
          splatPixel(ix, iy, shadeIdx, alpha);
          if (iz > 2.2 && ix + 1 < width && iy + 1 < height) {
            splatPixel(ix + 1, iy, shadeIdx, alpha * 0.6);
            splatPixel(ix, iy + 1, shadeIdx, alpha * 0.6);
          }
        }
      }

      if (GR.enabled) {
        const amt = Math.round(GR.amount);
        if (amt !== grassAmount || !grassCloud) {
          grassAmount = amt;
          grassCloud = buildRandomCloud(amt);
        }
        projectCloud(grassCloud);
        for (let i = 0; i < amt; i++) {
          const iz = grassCloud.iz[i];
          const sy = horizonY + (camH - interpHeight(grassCloud, i)) * iz * focal;
          if (sy < -40 || sy >= height + 40) continue;
          const sx = grassCloud.sx[i];
          const wz = grassCloud.z[i];
          const wx = grassCloud.wx[i];
          const patch = samplePatch(wx, wz, 3.1, GR.coverage);
          if (patch < 0.02) continue;
          const rp = rippleCount ? sampleRipple(wx, wz) * RP.strength : 0;
          let shade = interpShade(grassCloud, i) + sampleMouseGlow(sx, sy) + rp;
          if (shade > 1) shade = 1;
          const alpha =
            (1 + 1.2 * rp) *
            GR.opacity *
            patch *
            grassCloud.fade[i] *
            occlusionFactor(grassCloud.occ[i], sy) *
            (0.12 + 0.88 * shade);
          if (alpha < 0.015) continue;
          const rnd = grassCloud.r[i];
          const kk = grassCloud.kk[i];
          const len = GR.length * dpr * kk * (0.6 + 0.8 * rnd);
          const sway = 0.2 * fastSin(terrainTime * 0.9 + wx * 0.8 + rnd * 6);
          let dx = -(GR.lean + sway);
          let dy = -1;
          const dLen = Math.hypot(dx, dy);
          dx /= dLen;
          dy /= dLen;
          const steps = Math.max(2, len | 0);
          const shadeIdx = Math.min(255, ((shade * 255 + 20) | 0));
          for (let s = 0; s < steps; s++) {
            const px = (sx + dx * s) | 0;
            const py = (sy + dy * s) | 0;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              splatPixel(px, py, shadeIdx, alpha * (1 - (s / steps) * 0.85));
            }
          }
        }
      }

      if (DT.enabled) {
        const cols = Math.round(DT.columns);
        if (cols !== dotsCols || !dotsCloud) {
          dotsCols = cols;
          dotsCloud = buildHexGridCloud(cols);
        }
        projectCloud(dotsCloud);
        const total = dotsCloud.n;
        for (let i = 0; i < total; i++) {
          const iz = dotsCloud.iz[i];
          const sy = horizonY + (camH - interpHeight(dotsCloud, i)) * iz * focal;
          if (sy < -20 || sy >= height + 20) continue;
          const sx = dotsCloud.sx[i];
          const wz = dotsCloud.z[i];
          const wx = dotsCloud.wx[i];
          const rp = rippleCount ? sampleRipple(wx, wz) * RP.strength : 0;
          let patch = samplePatch(wx, wz, 11.7, DT.coverage);
          if (rp * 0.8 > patch) patch = rp * 0.8;
          if (patch < 0.02) continue;
          let shade = interpShade(dotsCloud, i) + sampleMouseGlow(sx, sy) + rp;
          if (shade > 1) shade = 1;
          const pulse = 0.85 + 0.15 * fastSin(terrainTime * 2 + dotsCloud.r[i] * 30);
          const alpha =
            DT.opacity * patch * dotsCloud.fade[i] * occlusionFactor(dotsCloud.occ[i], sy) * pulse;
          if (alpha < 0.02) continue;
          const radius = DT.size * dpr * dotsCloud.kk[i] * (0.3 + 0.7 * shade);
          if (radius < 0.35) continue;
          const outer = radius * (1 + 3 * DT.glow);
          const bound = Math.ceil(outer);
          const shadeIdx = Math.min(255, ((shade * 255 + 35) | 0));
          const glowGain = DT.glow * 0.35;
          for (let oy = -bound; oy <= bound; oy++) {
            const py = (sy + oy) | 0;
            if (py < 0 || py >= height) continue;
            const oy2 = oy * oy;
            for (let ox = -bound; ox <= bound; ox++) {
              const px = (sx + ox) | 0;
              if (px < 0 || px >= width) continue;
              const dist = Math.sqrt(ox * ox + oy2);
              if (dist > outer) continue;
              let core = radius + 0.5 - dist;
              if (core < 0) core = 0;
              else if (core > 1) core = 1;
              const falloff = 1 - dist / outer;
              const a = alpha * (core + glowGain * falloff * falloff);
              if (a > 0.004) splatPixel(px, py, shadeIdx, a);
            }
          }
        }
      }

      const raw = imgData.data;
      for (let i = 0; i < prevCount; i++) {
        const idx = prevPixels[i];
        if (touchedFrame[idx] !== frameId) {
          imgUint32[idx] = grainUint32[idx];
        }
      }
      for (let i = 0; i < activeCount; i++) {
        const off = activePixels[i] * 4;
        packPremultiplied(accum, off, raw, off);
      }
      const swap = prevPixels;
      prevPixels = activePixels;
      activePixels = swap;
      prevCount = activeCount;
      ctx.putImageData(imgData, 0, 0);
    },
  };
}

export const ParticleTerrainCanvas: React.FC<ParticleTerrainCanvasProps> = ({
  color = 'rgb(54, 174, 255)',
  background = 'rgba(255, 255, 255, 0.5)',
  bgMode = 'light',
  hueShift = 49,
  brightness = 2,
  grain = 0.15,
  mouseGlow = true,
  glowRadius = 120,
  quality = 1.5,
  terrain,
  light,
  patches,
  ripple,
  dust,
  grass,
  dots,
  fade = { bottom: 215 },
  className = '',
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({
    color,
    bgMode,
    hueShift,
    brightness,
    grain,
    mouseGlow,
    glowRadius,
    quality,
    terrain,
    light,
    patches,
    ripple,
    dust,
    grass,
    dots,
  });
  useEffect(() => {
    propsRef.current = {
      color,
      bgMode,
      hueShift,
      brightness,
      grain,
      mouseGlow,
      glowRadius,
      quality,
      terrain,
      light,
      patches,
      ripple,
      dust,
      grass,
      dots,
    };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return;
    }

    const engine = createTerrainEngine(ctx);

    const buildNormalized = (): NormalizedSettings => {
      const p = propsRef.current;
      return {
        color: parseColorToRgb(p.color),
        light: p.bgMode !== 'dark',
        hueShift: p.hueShift,
        brightness: p.brightness,
        grain: p.grain,
        mouseGlow: p.mouseGlow,
        glowRadius: p.glowRadius,
        T: { ...DEFAULT_TERRAIN, ...p.terrain },
        LT: { ...DEFAULT_LIGHT, ...p.light },
        PT: { ...DEFAULT_PATCHES, ...p.patches },
        RP: { ...DEFAULT_RIPPLE, ...p.ripple },
        DU: { ...DEFAULT_DUST, ...p.dust },
        GR: { ...DEFAULT_GRASS, ...p.grass },
        DT: { ...DEFAULT_DOTS, ...p.dots },
      };
    };

    const getDpr = () => Math.min(window.devicePixelRatio || 1, propsRef.current.quality || 1.5);

    engine.set(buildNormalized());
    const initialRect = container.getBoundingClientRect();
    engine.resize(initialRect.width || 1440, initialRect.height || 742, getDpr());
    engine.draw(0, false);

    let rafId = 0;
    let lastTime = performance.now();
    let inView = true;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      engine.draw(dt, true);
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!rafId && !reducedMotion) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    };

    const stop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        engine.resize(rect.width, rect.height, getDpr());
        engine.draw(0, false);
      }
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !document.hidden) start();
      else stop();
    });
    intersectionObserver.observe(container);

    const handleVisibility = () => {
      if (document.hidden) stop();
      else if (inView) start();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const toLocalCoords = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom ||
        !rect.width
      ) {
        return null;
      }
      const scaleX = container.offsetWidth / rect.width || 1;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleX,
      };
    };

    let inside = false;
    const handlePointerLeave = () => {
      inside = false;
      engine.leave();
      if (reducedMotion) engine.draw(0, false);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const pt = toLocalCoords(e);
      if (!pt) {
        if (inside) handlePointerLeave();
        return;
      }
      inside = true;
      engine.pointer(pt.x, pt.y);
      if (reducedMotion) engine.draw(0, false);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (reducedMotion) return;
      const pt = toLocalCoords(e);
      if (!pt) return;
      engine.click(pt.x, pt.y);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);

    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background,
        ...buildMaskStyle(fade),
        ...style,
      }}
    />
  );
};
