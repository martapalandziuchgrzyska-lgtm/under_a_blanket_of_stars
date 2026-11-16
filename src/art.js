// Cała grafika jest rysowana kodem do tekstur (pixel art, ograniczona paleta).
// Żeby podmienić ją na własne sprite'y, wystarczy załadować pliki pod tymi samymi kluczami.
import { OBJECTS, NEIGHBORS, HOUSES } from './data.js';

export const PAL = {
  night0: '#0b1026', night1: '#121a3a', night2: '#1b2650', night3: '#2a3a6e',
  house: '#0d1330', roof: '#080c1e', wood0: '#2e2028', wood1: '#4a3238', wood2: '#6a4840', wood3: '#8a6450',
  warm0: '#ffe9a8', warm1: '#ffc65a', warm2: '#e88a3a', cream: '#f6ead0', rose0: '#8a3a56', rose1: '#c85a78', rose2: '#e88a9a',
  gray: '#8a8fa8', white: '#ffffff', ink: '#070a18', teal: '#5fb3a8', blue: '#8fb8ff', green: '#4f7a5a',
};

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function mk(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, w, h);
  draw(t.context, w, h);
  t.refresh();
  return t;
}
const R = (c, col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
function ell(c, col, cx, cy, rx, ry) {
  c.fillStyle = col;
  for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01)))); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
}

// ---------- bufor świetlny do obiektów nieba (dodawanie światła, kwantyzacja alfy)
class Buf {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Float32Array(w * h * 4); }
  add(x, y, c, a) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4, d = this.d;
    d[i] += c[0] * a; d[i + 1] += c[1] * a; d[i + 2] += c[2] * a; d[i + 3] += a;
  }
  dim(x, y, k) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4; for (let j = 0; j < 4; j++) this.d[i + j] *= k; }
  glow(cx, cy, rx, ry, rot, c, int, pow = 2) {
    const m = Math.ceil(Math.max(rx, ry) * 2.2), cs = Math.cos(rot), sn = Math.sin(rot);
    for (let y = -m; y <= m; y++) for (let x = -m; x <= m; x++) {
      const u = (x * cs + y * sn) / rx, v = (-x * sn + y * cs) / ry;
      const a = int * Math.exp(-Math.pow(u * u + v * v, pow / 2) * 1.6);
      if (a > 0.03) this.add(cx + x, cy + y, c, a);
    }
  }
  star(x, y, c, big) { this.add(x, y, c, 1); if (big) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.add(x + dx, y + dy, c, 0.4); } }
  merge(o) { for (let i = 0; i < this.d.length; i++) this.d[i] += o.d[i]; return this; }
  put(ctx) {
    const img = ctx.createImageData(this.w, this.h), d = this.d, o = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const A = d[i + 3]; if (A <= 0.02) continue;
      const a = Math.min(1, Math.ceil(Math.min(1, A) * 6) / 6), k = 1 / Math.min(1, Math.max(A, 0.001));
      o[i] = Math.min(255, d[i] * k); o[i + 1] = Math.min(255, d[i + 1] * k); o[i + 2] = Math.min(255, d[i + 2] * k); o[i + 3] = a * 255;
    }
    ctx.putImageData(img, 0, 0);
  }
}
const WHITE = [255, 255, 255], STARC = [[255, 255, 255], [200, 215, 255], [255, 235, 200], [255, 205, 160]];
const gauss = r => (r() + r() + r() - 1.5) / 1.5;
function field(b, r, n, a = 0.7) { for (let i = 0; i < n; i++) b.add(r() * b.w, r() * b.h, STARC[Math.floor(r() * 4)], 0.25 + r() * a * 0.6); }

// Rysuje obiekt do warstw: a (główna), b (druga barwa), s (gwiazdy). Mgławice używają ich osobno w minigierce.
function drawObject(o) {
  const N = 48, A = new Buf(N, N), B = new Buf(N, N), Sx = new Buf(N, N), r = rng(o.id), t = o.art, cx = 24, cy = 24;
  if (t.k === 'moon') {
    const c = hex('#d8d8e0');
    for (let y = -16; y <= 16; y++) for (let x = -16; x <= 16; x++) if (x * x + y * y <= 256) A.add(cx + x, cy + y, c, 0.78 + ((x + y) < -8 ? 0.2 : 0) - (x + y > 14 ? 0.2 : 0));
    for (const [mx, my, mr] of [[-6, -5, 5], [3, -8, 3], [-2, 5, 4], [7, 3, 3], [-9, 3, 2], [5, 10, 2]])
      for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) if (x * x + y * y <= mr * mr && (mx + x) ** 2 + (my + y) ** 2 < 250) A.dim(cx + mx + x, cy + my + y, 0.72);
    A.add(cx + 4, cy + 13, WHITE, 0.5); A.add(cx - 11, cy - 9, WHITE, 0.4);
  } else if (t.k === 'planet') {
    const c = hex(t.c), rr = t.r;
    if (t.rings) for (let a = 0; a < 6.3; a += 0.02) { const x = Math.cos(a) * rr * 2.1, y = Math.sin(a) * rr * 0.6; if (y > 0 || Math.abs(x) > rr * 0.95) { A.add(cx + x, cy + y, hex('#d8c090'), 0.12); A.add(cx + x * 0.86, cy + y * 0.86, hex('#b8a070'), 0.08); } }
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
      if (x * x + y * y > rr * rr + 1) continue;
      if (t.crescent && (x + rr * 0.55) ** 2 + y * y < rr * rr * 1.05) continue;
      let a = 0.9 - (x > rr * 0.4 ? 0.22 : 0);
      if (t.bands && (Math.abs(y) % 4 === 1 || (t.moons && Math.abs(y) % 4 === 2 && Math.abs(y) < 6))) a -= 0.25;
      A.add(cx + x, cy + y, c, a);
    }
    if (t.cap) { A.add(cx - 1, cy - rr + 1, WHITE, 1); A.add(cx, cy - rr + 1, WHITE, 1); A.add(cx + 1, cy - rr + 1, WHITE, 1); A.dim(cx - 2, cy + 1, 0.7); A.dim(cx - 1, cy + 2, 0.7); A.dim(cx, cy + 1, 0.7); }
    if (t.moons) for (const mx of [-21, -15, 16, 20]) Sx.star(cx + mx, cy + (mx % 2), WHITE, false);
    field(Sx, r, 4, 0.3);
  } else if (t.k === 'double') {
    const c1 = hex(t.c1), c2 = hex(t.c2);
    A.glow(cx - t.sep / 2, cy + 1, 1.6, 1.6, 0, c1, 1.6); A.glow(cx + t.sep / 2 + 1, cy - 1, 1.2, 1.2, 0, c2, 1.4);
    if (o.id === 'mizar') A.glow(cx + 13, cy - 11, 1, 1, 0, c2, 1.2);
    field(Sx, r, 10, 0.4);
  } else if (t.k === 'cluster') {
    const pts = [];
    if (t.shape === 'owl') pts.push([-3, -12, 1], [3, -11, 1], [0, -6], [0, -2], [-1, 2], [0, 6], [-5, -3], [-10, -5], [-14, -8], [5, -2], [10, -3], [15, -6], [-3, 10], [-5, 14], [3, 10], [5, 15], [1, -9], [-1, 4]);
    else if (t.shape === 'hanger') pts.push([-13, 2, 1], [-8, 2], [-4, 3], [0, 2, 1], [5, 2], [10, 3, 1], [1, -2], [2, -6], [5, -8], [8, -6, 1]);
    else if (t.shape === 'haze') { for (const [x, y] of [[-6, -3], [-1, -6], [4, -3], [2, 2], [-4, 3], [9, 4], [-9, 1]]) { pts.push([x, y, 1]); B.glow(cx + x, cy + y, 5, 4, 0.5, hex('#6f9ae8'), 0.35); } }
    else if (t.shape === 'two') for (let i = 0; i < t.n; i++) pts.push([(i % 2 ? -11 : 11) + gauss(r) * 7, gauss(r) * 7, r() < 0.15]);
    else for (let i = 0; i < t.n; i++) {
      let x = gauss(r) * t.spread, y = gauss(r) * t.spread;
      if (t.glob) { const k = Math.pow(r(), 1.6); x *= k * 2.2; y *= k * 2.2; }
      if (t.wedge) y = Math.abs(y) * (x > 0 ? 0.5 : 1) - 4;
      pts.push([x, y, r() < 0.1]);
    }
    if (t.glob) A.glow(cx, cy, t.spread * 0.7, t.spread * 0.7, 0, hex('#fff0d0'), 0.9);
    if (t.orange) Sx.star(cx, cy, hex('#ff9a4a'), true);
    for (const [x, y, big] of pts) Sx.star(cx + x, cy + y, t.shape === 'haze' ? hex('#bcd0ff') : STARC[Math.floor(r() * 4)], big);
    field(Sx, r, 14, 0.3);
  } else if (t.k === 'nebula') {
    const c1 = hex(t.c1), c2 = hex(t.c2), sh = t.shape;
    if (sh === 'ring') {
      const RR = t.R, th = t.thick || 4;
      for (let y = -24; y < 24; y++) for (let x = -24; x < 24; x++) {
        const d = Math.hypot(x, y * 1.15), n = 0.75 + 0.25 * Math.sin(x * 0.9 + y * 1.3 + RR);
        A.add(cx + x, cy + y, c1, 0.9 * n * Math.exp(-(((d - RR) / th) ** 2) * 2.2));
        B.add(cx + x, cy + y, c2, 0.7 * Math.exp(-((d / (RR * 0.75)) ** 2) * 1.4));
      }
    } else if (sh === 'heart') {
      for (let y = -24; y < 24; y++) for (let x = -24; x < 24; x++) {
        const u = x / 13, v = -(y - 2) / 13, f = (u * u + v * v - 1) ** 3 - u * u * v * v * v;
        A.add(cx + x, cy + y, c1, 0.9 * Math.exp(-Math.abs(f) * 5) * (0.7 + 0.3 * Math.sin(x * 1.1 + y)));
        if (f < 0) B.add(cx + x, cy + y, c2, 0.3 + 0.2 * Math.sin(x + y * 0.7));
      }
    } else if (sh === 'veil') {
      for (let k = 0; k < 3; k++) for (let s = 0; s < 40; s += 0.25) { const x = 6 + k * 13 + Math.sin(s * 0.22 + k * 2) * 5, y = 4 + s; (k === 1 ? B : A).add(x, y, k === 1 ? c2 : c1, 0.35); (k === 1 ? A : B).add(x + 1, y + 1, k === 1 ? c1 : c2, 0.15); }
    } else if (sh === 'horse') {
      for (let y = 20; y < 48; y++) for (let x = 0; x < 48; x++) A.add(x, y, c1, Math.min(0.85, (y - 18) / 14) * (0.75 + 0.25 * Math.sin(x * 0.6 + y * 0.4)));
      for (const [x, y, w, h] of [[21, 22, 6, 10], [19, 19, 7, 5], [17, 20, 3, 3], [20, 30, 9, 6], [18, 35, 14, 13]]) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) A.dim(x + i, y + j, 0.12);
      B.glow(12, 12, 6, 5, 0.4, c2, 0.6);
      Sx.star(34, 9, WHITE, true);
    } else {
      // chmura / wachlarz / płomień / krab / hantle / orzeł: sumy rozmytych plam
      const blobs = { cloud: 7, fan: 6, flame: 6, crab: 5, lobes: 2, eagle: 7 }[sh];
      let x = cx - 6, y = cy;
      for (let i = 0; i < blobs; i++) {
        if (sh === 'lobes') { x = cx + (i ? 7 : -7); y = cy + (i ? -3 : 3); }
        else if (sh === 'fan') { x = cx + (t.flip ? -1 : 1) * (i * 3 - 8); y = cy - 8 + i * 3 + gauss(r) * 2; }
        else if (sh === 'flame') { x = cx + gauss(r) * 5; y = cy + 10 - i * 4; }
        else if (sh === 'crab') { x = cx + gauss(r) * 4; y = cy + gauss(r) * 3; }
        else { x += gauss(r) * 7 + 2; y += gauss(r) * 6; x = Math.max(10, Math.min(38, x)); y = Math.max(10, Math.min(38, y)); }
        const rx = sh === 'crab' ? 6 : 5 + r() * 5, ry = sh === 'flame' ? 3 + r() * 2 : 4 + r() * 4;
        A.glow(x, y, rx, ry, r() * 3, c1, 0.5 + r() * 0.3);
        if (i % 2 === 0 || sh === 'lobes') B.glow(x + gauss(r) * 4, y + gauss(r) * 4, rx * 0.6, ry * 0.6, r() * 3, c2, 0.5);
      }
      if (sh === 'flame') for (let s = 0; s < 26; s++) { A.dim(cx + Math.sin(s * 0.3) * 2, cy + 14 - s, 0.25); A.dim(cx + 1 + Math.sin(s * 0.3) * 2, cy + 14 - s, 0.5); }
      if (sh === 'eagle') for (const px of [-2, 1, 4]) for (let s = 0; s < 9 - Math.abs(px); s++) { A.dim(cx + px, cy + 6 - s, 0.2); B.dim(cx + px, cy + 6 - s, 0.3); }
      if (sh === 'crab') for (let i = 0; i < 26; i++) B.add(cx + gauss(r) * 7, cy + gauss(r) * 5, c2, 0.5);
      if (sh === 'fan') Sx.star(cx + (t.flip ? 6 : -6), cy - 7, WHITE, true);
    }
    field(Sx, r, 22, 0.5);
  } else if (t.k === 'galaxy') {
    const warm = hex('#ffe8c0'), cool = hex('#a8c0f0');
    const gs = t.chain ? [[7, 34, 4, 3, 0.2, 0.8], [13, 30, 3.5, 3, 0, 0.8], [20, 26, 3, 1.5, 0.8, 0.7], [26, 22, 3, 2, -0.3, 0.7], [32, 17, 2.5, 1.5, 0.5, 0.7], [38, 13, 3, 2, 0, 0.7], [42, 8, 2, 1.2, 1, 0.6]] : t.g;
    for (const [x, y, rx, ry, rot, int] of gs) {
      A.glow(x, y, rx, ry, rot, cool, int * 0.55);
      A.glow(x, y, Math.max(1.2, rx * 0.25), Math.max(1, Math.min(ry, rx * 0.25) * (t.bulge ? 1.6 : 1)), rot, warm, int * 1.3);
      if (t.spiral && rx > 6) for (let arm = 0; arm < 2; arm++) for (let s = 0.4; s < 4.6; s += 0.07) {
        const rad = 1.4 * Math.exp(0.5 * s), a = s + arm * Math.PI + rot;
        if (rad < rx * 1.15) A.add(x + Math.cos(a) * rad, y + Math.sin(a) * rad * (ry / rx), cool, 0.3 * int);
      }
      if (t.lane) for (let s = -rx; s <= rx; s += 0.5) { A.dim(x + Math.cos(rot) * s - Math.sin(rot) * 1.2, y + Math.sin(rot) * s + Math.cos(rot) * 1.2, 0.55); }
    }
    field(Sx, r, 12, 0.4);
  }
  return { A, B, Sx };
}

export function buildObjects(scene) {
  for (const o of OBJECTS) {
    const { A, B, Sx } = drawObject(o);
    if (o.type === 'nebula') {
      mk(scene, `obj_${o.id}_a`, 48, 48, c => A.put(c));
      mk(scene, `obj_${o.id}_b`, 48, 48, c => B.put(c));
      mk(scene, `obj_${o.id}_s`, 48, 48, c => Sx.put(c));
    }
    const all = new Buf(48, 48).merge(A).merge(B).merge(Sx);
    mk(scene, `obj_${o.id}`, 48, 48, c => all.put(c));
  }
  // wydarzenia: kometa i zaćmiony Księżyc
  mk(scene, 'obj_comet', 48, 48, c => { const b = new Buf(48, 48); for (let s = 0; s < 34; s++) b.glow(12 + s, 34 - s * 0.6, 1.5 + s * 0.12, 1.5 + s * 0.12, 0, [170, 220, 255], 0.5 * (1 - s / 36)); b.glow(12, 34, 2.2, 2.2, 0, [220, 255, 240], 1.8); b.put(c); });
  mk(scene, 'obj_eclipse', 48, 48, c => { const b = new Buf(48, 48); for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) if (x * x + y * y <= 196) b.add(24 + x, 24 + y, [200, 80, 50], 0.6 + (x < -4 ? 0.2 : 0)); b.put(c); });
  mk(scene, 'noise', 48, 48, c => { const r = rng(7); for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const v = r(); if (v < 0.6) R(c, `rgba(${90 + v * 200 | 0},${90 + v * 160 | 0},${110 + v * 180 | 0},${0.35 + r() * 0.5})`, x, y); } });
}

// ---------- taras, domy, niebo
// Tekstury świata są rysowane w siatce 360 px szerokości (dwa razy gęściej niż jednostki sceny w world.js).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[(x & 3) + ((y & 3) << 2)] + 0.5) / 16;
function dith(c, col, x, y, w, h, den) { c.fillStyle = col; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bay(x + i, y + j) < den) c.fillRect(x + i, y + j, 1, 1); }
// pionowy gradient z ditheringiem uporządkowanym
function grad(c, w, h, cols, pow = 1) {
  const img = c.createImageData(w, h), o = img.data, cc = cols.map(hex);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const f = Math.pow(y / (h - 1), pow) * (cc.length - 1), i = Math.min(cc.length - 2, Math.floor(f)), col = (f - i) > bay(x, y) ? cc[i + 1] : cc[i], k = (y * w + x) * 4;
    o[k] = col[0]; o[k + 1] = col[1]; o[k + 2] = col[2]; o[k + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}
// zrzut bufora świetlnego z ditheringiem alfy (miękkie chmury gwiazd)
function putD(buf, ctx, lv = 4) {
  const img = ctx.createImageData(buf.w, buf.h), d = buf.d, o = img.data;
  for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) {
    const i = (y * buf.w + x) * 4, A = d[i + 3]; if (A <= 0.01) continue;
    const q = Math.floor(Math.min(1, A) * lv + bay(x, y)) / lv; if (q <= 0) continue;
    const k = 1 / Math.max(A, 0.001);
    o[i] = Math.min(255, d[i] * k); o[i + 1] = Math.min(255, d[i + 1] * k); o[i + 2] = Math.min(255, d[i + 2] * k); o[i + 3] = q * 255;
  }
  ctx.putImageData(img, 0, 0);
}
function sparkle(c, x, y, n, col = '#ffffff') {
  R(c, col, x, y); for (let i = 1; i <= n; i++) { const a = 1 - i / (n + 1); c.fillStyle = `rgba(220,228,255,${a})`; c.fillRect(x + i, y, 1, 1); c.fillRect(x - i, y, 1, 1); c.fillRect(x, y + i, 1, 1); c.fillRect(x, y - i, 1, 1); }
  if (n > 2) { c.fillStyle = 'rgba(200,210,255,0.45)'; c.fillRect(x + 1, y + 1, 1, 1); c.fillRect(x - 1, y - 1, 1, 1); c.fillRect(x + 1, y - 1, 1, 1); c.fillRect(x - 1, y + 1, 1, 1); }
}
const W0 = '#2a1826', W1 = '#4a2c38', W2 = '#6e4240', W3 = '#96654c', W4 = '#c08a5a', INK = '#070818';

export function buildWorld(scene) {
  // --- niebo
  mk(scene, 'sky', 360, 400, c => grad(c, 360, 400, ['#07081f', '#0a0b2a', '#0e0f38', '#141447', '#1b1958', '#251f6b', '#31267c', '#412c88', '#53338e'], 1.15));
  mk(scene, 'pollution', 360, 400, c => {
    for (let y = 150; y < 400; y++) for (let x = 0; x < 360; x++) {
      const f = ((y - 150) / 250) ** 1.5, a = Math.floor(f * 6 + bay(x, y)) / 6 * 0.7; if (a <= 0) continue;
      R(c, `rgba(${150 + f * 85 | 0},${80 + f * 60 | 0},${150 - f * 90 | 0},${a})`, x, y);
    }
  });
  const r = rng(42);
  mk(scene, 'stars3', 720, 380, c => { for (let i = 0; i < 780; i++) { const col = STARC[Math.floor(r() * 4)]; R(c, `rgba(${col[0]},${col[1]},${col[2]},${0.2 + r() * 0.4})`, r() * 720 | 0, (r() ** 1.15) * 376 | 0); } });
  mk(scene, 'stars2', 720, 380, c => { for (let i = 0; i < 240; i++) { const col = STARC[Math.floor(r() * 4)], x = r() * 716 | 0, y = (r() ** 1.2) * 374 | 0; R(c, `rgba(${col[0]},${col[1]},${col[2]},${0.55 + r() * 0.4})`, x, y); if (r() < 0.18) sparkle(c, x, y, 1); } });
  mk(scene, 'stars1', 720, 380, c => { for (let i = 0; i < 54; i++) { const x = 8 + r() * 704 | 0, y = 8 + (r() ** 1.3) * 360 | 0; if (i < 14) sparkle(c, x, y, 3 + (r() * 3 | 0)); else { R(c, '#ffffff', x, y, 2, 2); sparkle(c, x, y, 1); } } });
  mk(scene, 'milky', 720, 380, c => {
    const b = new Buf(720, 380), q = rng(5);
    for (let i = 0; i < 150; i++) { const s = i / 149, x = 50 + s * 620, y = 190 + Math.sin(s * 6.283) * 96 + gauss(q) * 16; b.glow(x + gauss(q) * 10, y, 16 + q() * 18, 9 + q() * 9, Math.cos(s * 6.283) * 0.8, q() < 0.3 ? [150, 120, 230] : [110, 130, 235], 0.06 + q() * 0.07); }
    for (let i = 0; i < 16; i++) { const s = q(), x = 50 + s * 620, y = 190 + Math.sin(s * 6.283) * 96 + gauss(q) * 10; b.glow(x, y, 7 + q() * 6, 5 + q() * 4, q() * 3, [170, 180, 255], 0.22); }
    putD(b, c, 5);
    for (let i = 0; i < 420; i++) { const s = q(); R(c, `rgba(225,230,255,${0.3 + q() * 0.5})`, 50 + s * 620 + gauss(q) * 26 | 0, 190 + Math.sin(s * 6.283) * 96 + gauss(q) * 20 | 0); }
  });
  // płaskie chmurki nad horyzontem
  mk(scene, 'pclouds', 720, 150, c => {
    const q = rng(3);
    for (const [x, y, w] of [[30, 20, 120], [250, 70, 90], [420, 30, 150], [600, 96, 100], [150, 118, 70]]) {
      let cx = x, cw = w;
      for (let k = 0; k < 4; k++) { R(c, k < 2 ? '#2c3690' : '#222a78', cx, y + k * 4, cw, 4); if (k === 0) R(c, '#3a46a8', cx + 6, y, cw * 0.5 | 0, 2); cx += (q() * 16 | 0) - 4; cw += (q() * 24 | 0) - (k > 1 ? 30 : 0); if (cw < 16) break; }
    }
  });
  // miasto w oddali: budynki i osobno zapalone okna
  const cq = rng(77), blds = []; let bx = 0;
  while (bx < 720) { const w = Math.min(720 - bx, 18 + (cq() * 30 | 0)); blds.push({ x: bx, w, h: 56 + (cq() * 100 | 0), t: cq() * 3 | 0, top: cq() }); bx += w; }
  mk(scene, 'city', 720, 160, c => {
    R(c, '#1a1e5c', 0, 120, 720, 40);
    for (const b of blds) {
      const y = 160 - b.h, col = ['#1d2264', '#252c7a', '#2d368e'][b.t];
      R(c, col, b.x, y, b.w, b.h); R(c, ['#262d7c', '#2f3892', '#3944a6'][b.t], b.x, y, 2, b.h); R(c, '#171b54', b.x + b.w - 2, y, 2, b.h);
      if (b.top < 0.3) { R(c, col, b.x + (b.w >> 1), y - 12, 2, 12); R(c, '#8a94e8', b.x + (b.w >> 1), y - 12, 2, 2); }
      else if (b.top < 0.6 && b.w > 20) { R(c, col, b.x + 5, y - 8, b.w - 10, 8); R(c, ['#262d7c', '#2f3892', '#3944a6'][b.t], b.x + 5, y - 8, 2, 8); }
      else if (b.top < 0.75) R(c, col, b.x + 3, y - 4, 6, 4);
    }
    dith(c, '#141847', 0, 136, 720, 24, 0.5);
  });
  mk(scene, 'cityw', 720, 160, c => {
    for (const b of blds) for (let wy = 160 - b.h + 6; wy < 150; wy += 8) {
      if (cq() < 0.07 && b.w > 16) { R(c, '#c8d0ff', b.x + 4, wy, b.w - 8, 3); continue; }
      for (let wx = b.x + 4; wx < b.x + b.w - 5; wx += 6) if (cq() < 0.3) R(c, cq() < 0.75 ? (cq() < 0.5 ? '#d8deff' : '#aab4f0') : '#ffd98a', wx, wy, 3, 4);
    }
  });
  mk(scene, 'glow', 32, 32, c => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, y - 15.5) / 16, a = Math.floor(Math.max(0, 1 - d) ** 2 * 6) / 6; if (a > 0) R(c, `rgba(255,255,255,${a})`, x, y); } });

  // --- domy sąsiadów (400 px = 200 jednostek, 10 jednostek zapasu z każdej strony na paralaksę)
  mk(scene, 'houses', 400, 140, c => {
    const base = 136, q = rng(9);
    const tree = (x, h, rr) => { R(c, '#06071a', x - 1, base - (h >> 1), 3, h >> 1); ell(c, '#080920', x, base - h, rr, Math.round(rr * 1.35)); ell(c, '#0c0e2c', x - 2, base - h - 3, rr - 3, rr - 2); dith(c, '#171b48', x - rr + 2, base - h - rr, rr, rr, 0.3); };
    for (const tx of [6, 84, 152, 232, 296, 374, 394]) tree(tx, 34 + (q() * 16 | 0), 9 + (q() * 5 | 0));
    const win = (wx, wy, ww, wh) => { R(c, '#06071a', wx - 1, wy - 1, ww + 2, wh + 2); R(c, '#1c2258', wx, wy, ww, wh); R(c, '#2a3274', wx, wy, ww, 1); R(c, '#06071a', wx + (ww >> 1), wy, 1, wh); R(c, '#06071a', wx, wy + (wh >> 1), ww, 1); R(c, '#1c2052', wx - 2, wy + wh + 1, ww + 4, 1); };
    HOUSES.forEach((h, i) => {
      const x = (h.x + 10) * 2, w = h.w * 2, hh = h.h * 2, rf = h.roof * 2, top = base - hh;
      R(c, '#0f1136', x, top, w, hh);
      for (let y = top + 3; y < base; y += 4) R(c, '#141742', x, y, w, 1);
      R(c, '#090a24', x + w - 4, top, 4, hh); R(c, '#191d50', x, top, 1, hh);
      for (let k = 0; k <= rf; k++) { const ww = Math.round((w + 12) * (1 - k / rf)); R(c, k % 4 < 2 ? '#07081e' : '#0b0c2a', Math.round(x + w / 2 - ww / 2), top - k, ww, 1); }
      for (let k = 2; k < rf; k += 4) dith(c, '#12143a', Math.round(x + w / 2 - (w + 12) * (1 - k / rf) / 2), top - k, Math.round((w + 12) * (1 - k / rf) / 2), 1, 0.5);
      R(c, '#1a1e52', x - 6, top, w + 12, 2);
      R(c, '#07081e', x + w - 18, top - rf + 4, 7, rf - 8); R(c, '#161a48', x + w - 19, top - rf + 3, 9, 2);
      if (i % 2 === 0) { R(c, '#07081e', x + 8, top - rf - 8, 1, 14); R(c, '#07081e', x + 5, top - rf - 6, 7, 1); R(c, '#07081e', x + 6, top - rf - 3, 5, 1); }
      // drzwi z daszkiem i schodkiem
      R(c, '#06071a', x + 13, base - 22, 12, 22); R(c, '#1a1e52', x + 14, base - 21, 10, 21); R(c, '#10133c', x + 16, base - 19, 6, 7); R(c, '#10133c', x + 16, base - 10, 6, 8); R(c, '#4a52a8', x + 22, base - 11, 1, 2);
      R(c, '#1a1e52', x + 10, base - 25, 18, 2); R(c, '#1c2052', x + 10, base - 2, 18, 2);
      win(x + w - 20, base - 30, 8, 10);
      if (h.h >= 32) win(x + 30, base - 54, 10, 10);
      if (i % 2) win(x + w - 18, top + 10, 6, 8);
      if (h.nb === 'lady') { R(c, '#1a1e52', x + 9, base - 25, 4, 1); R(c, '#06071a', x + 10, base - 24, 1, 2); }
      if (h.nb === 'gardener') { R(c, '#06071a', x + 62, base - 44, 8, 2); R(c, '#1a1e52', x + 63, base - 42, 6, 4); }
      if (h.nb === 'student') win(x + 22, top - 14, 8, 8);
    });
    R(c, '#06071a', 0, base, 400, 4);
    for (let x = 0; x < 400; x += 5) ell(c, x % 3 ? '#080920' : '#0b0d2a', x + (q() * 3 | 0), base - 1, 4, 2 + (q() * 4 | 0));
  });

  // --- taras
  mk(scene, 'terrace', 360, 184, c => {
    const q = rng(31);
    for (let x = 2; x < 360; x += 10) { R(c, W0, x, 6, 5, 18); R(c, W1, x, 6, 2, 18); R(c, W2, x, 7, 1, 5); }
    R(c, W1, 0, 2, 360, 6); R(c, W3, 0, 2, 360, 1); R(c, W2, 0, 3, 360, 1); R(c, W0, 0, 7, 360, 1);
    R(c, W1, 0, 22, 360, 5); R(c, W2, 0, 22, 360, 1); R(c, W0, 0, 26, 360, 2);
    for (const px of [56, 176, 300]) { R(c, W1, px, 0, 10, 28); R(c, W2, px, 0, 3, 28); R(c, W0, px + 9, 0, 1, 28); R(c, W3, px - 1, 0, 12, 2); R(c, W2, px - 1, 2, 12, 1); }
    for (let y = 28, k = 0; y < 184; y += 13, k++) {
      R(c, ['#4a2c38', '#52303c', '#462a36'][k % 3], 0, y, 360, 13); R(c, '#603a42', 0, y, 360, 1); R(c, W0, 0, y + 12, 360, 1);
      for (let i = 0; i < 30; i++) R(c, q() < 0.5 ? '#3e2430' : '#5c3842', q() * 360 | 0, y + 2 + (q() * 9 | 0), 5 + (q() * 24 | 0), 1);
      for (let i = 0; i < 2; i++) if (q() < 0.5) { const kx = q() * 350 | 0; ell(c, '#3a2230', kx, y + 6, 3, 2); R(c, '#2a1826', kx, y + 6, 2, 1); }
      let x = (k * 83) % 120;
      while (x < 360) { R(c, W0, x, y, 1, 12); for (const [dx, dy] of [[3, 3], [3, 9], [-3, 3], [-3, 9]]) R(c, '#8a6450', x + dx, y + dy); x += 110 + (q() * 40 | 0); }
    }
    // ciepła plama pod lampkami i przyciemnienie brzegów
    for (let y = 28; y < 184; y++) for (let x = 0; x < 360; x++) {
      const warm = Math.max(0, 0.55 - (y - 28) / 110) * Math.max(0, 1 - Math.abs(x - 180) / 240), dark = ((y - 28) / 156) ** 2 * 0.45 + (Math.abs(x - 180) / 180) ** 3 * 0.4, b = bay(x, y);
      if (b < warm * 0.55) R(c, 'rgba(232,150,90,0.35)', x, y); else if (b < dark) R(c, 'rgba(22,12,40,0.55)', x, y);
    }
  });
  const gy = x => 16 + 22 * (1 - ((x - 180) / 172) ** 2);
  const garland = on => c => {
    for (const px of [6, 350]) { R(c, W1, px, 0, 4, 106); R(c, W2, px, 0, 1, 106); R(c, W3, px - 1, 0, 6, 2); }
    for (let x = 8; x <= 352; x++) R(c, '#241c36', x, gy(x));
    const cols = [PAL.warm1, PAL.warm0, '#ffa07a', PAL.warm0, '#ffd070'];
    for (let x = 24, i = 0; x < 340; x += 16, i++) {
      const y = Math.round(gy(x)) + 1;
      R(c, '#241c36', x, y, 2, 2);
      if (on) { c.fillStyle = 'rgba(255,190,90,0.5)'; for (let j = -6; j <= 8; j++) for (let k = -7; k <= 7; k++) if (k * k + (j - 1) * (j - 1) < 46 && bay(x + k, y + j) < 0.6 - (k * k + j * j) / 90) c.fillRect(x + k, y + j + 3, 1, 1); R(c, cols[i % 5], x - 1, y + 2, 4, 5); R(c, PAL.white, x, y + 3, 1, 2); R(c, '#fff4d0', x - 1, y + 2, 4, 1); }
      else { R(c, '#45405e', x - 1, y + 2, 4, 5); R(c, '#5a5478', x, y + 3, 1, 2); }
    }
    // mniejsze lampki wzdłuż poręczy płotu
    for (let x = 14, i = 0; x < 350; x += 18, i++) { if (on) { R(c, 'rgba(255,190,90,0.35)', x - 2, 78, 6, 6); R(c, cols[i % 5], x, 80, 2, 2); } else R(c, '#45405e', x, 80, 2, 2); }
  };
  mk(scene, 'garland_on', 360, 108, garland(true)); mk(scene, 'garland_off', 360, 108, garland(false));

  // --- bohaterka w kraciastym kocu na drewnianym fotelu
  mk(scene, 'hero', 64, 72, c => {
    R(c, W0, 6, 12, 5, 56); R(c, W0, 53, 12, 5, 56); R(c, W1, 7, 12, 2, 56); R(c, W1, 54, 12, 2, 56);
    R(c, W1, 6, 12, 52, 4); R(c, W3, 6, 12, 52, 1);
    for (let x = 14; x < 52; x += 8) { R(c, W1, x, 16, 4, 32); R(c, W2, x, 16, 1, 32); }
    R(c, W1, 2, 50, 60, 6); R(c, W2, 2, 50, 60, 2); R(c, W0, 2, 55, 60, 1); R(c, W0, 4, 56, 4, 14); R(c, W0, 56, 56, 4, 14);
    // granatowy koc w gwiazdki
    const plaid = (x, y) => {
      let col = [46, 60, 152];
      const gx = Math.floor((x + 100) / 8), gy2 = Math.floor((y + 100) / 8), hsh = (gx * 73 + gy2 * 151 + gx * gy2 * 7) % 17;
      const dx = Math.abs(x - (gx * 8 - 100 + 2 + hsh % 4)), dy = Math.abs(y - (gy2 * 8 - 100 + 2 + (hsh >> 1) % 4));
      if (hsh % 3 === 0) { if (dx + dy === 0) col = [255, 246, 205]; else if (dx + dy === 1) col = [255, 205, 100]; }
      else if (hsh % 3 === 1 && dx + dy === 0) col = [255, 226, 150];
      else if (hsh % 7 === 2 && dx + dy === 0) col = [170, 195, 255];
      const sh = (x - 30) / 24 + (y - 40) / 44, k = sh > 0.55 ? 0.6 : sh > 0.25 ? 0.8 : sh < -0.5 ? 1.18 : 1;
      return `rgb(${Math.min(255, col[0] * k) | 0},${Math.min(255, col[1] * k) | 0},${Math.min(255, col[2] * k) | 0})`;
    };
    const blob = (cx, cy, rx, ry, skew = 0) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const d = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (d <= 1) R(c, d > 0.86 ? '#141a4c' : plaid(x + cx + Math.round(y * skew), y + cy), cx + x, cy + y); } };
    blob(32, 45, 22, 21, 0.15); blob(30, 20, 15, 15, -0.1);
    for (let i = 0; i < 16; i++) { R(c, '#1a2262', 14 + i, 36 + Math.round(Math.sin(i / 5) * 2)); R(c, '#1a2262', 40 + i * 0.6, 34 + i); }
    ell(c, '#f6ead0', 30, 22, 11, 10); ell(c, '#10143a', 30, 22, 10, 9); ell(c, '#f4d8bc', 30, 23, 8, 7);
    R(c, '#5a3428', 22, 16, 17, 4); R(c, '#5a3428', 22, 20, 3, 3); R(c, '#5a3428', 36, 20, 3, 2); R(c, '#7a4a38', 26, 16, 6, 1);
    R(c, INK, 26, 23, 2, 2); R(c, INK, 33, 23, 2, 2); R(c, '#ffffff', 26, 23); R(c, '#ffffff', 33, 23);
    R(c, '#e89a90', 24, 26, 2, 1); R(c, '#e89a90', 35, 26, 2, 1); R(c, '#b8606a', 29, 27, 3, 1);
    // kubek w dłoniach i para
    R(c, '#f6ead0', 27, 38, 9, 8); R(c, '#ffffff', 27, 38, 9, 1); R(c, '#c8b8a0', 34, 39, 2, 7); R(c, '#b86a3a', 28, 39, 7, 1); R(c, '#f6ead0', 36, 40, 2, 1); R(c, '#f6ead0', 37, 41, 1, 3); R(c, '#f6ead0', 36, 44, 2, 1);
    R(c, '#f4d8bc', 24, 42, 4, 4); R(c, '#f4d8bc', 35, 42, 4, 4); R(c, '#d8b098', 24, 45, 4, 1); R(c, '#d8b098', 35, 45, 4, 1);
    R(c, 'rgba(255,255,255,0.55)', 30, 34, 1, 2); R(c, 'rgba(255,255,255,0.4)', 32, 31, 1, 2); R(c, 'rgba(255,255,255,0.3)', 30, 28, 1, 2);
    // podłokietniki przed kocem, kapcie
    R(c, W2, 0, 40, 10, 4); R(c, W4, 0, 40, 10, 1); R(c, W1, 2, 44, 4, 8); R(c, W2, 54, 40, 10, 4); R(c, W4, 54, 40, 10, 1); R(c, W1, 58, 44, 4, 8);
    for (const sx of [19, 34]) { R(c, '#f6ead0', sx, 64, 10, 5); R(c, '#c8b8a0', sx, 68, 10, 1); R(c, '#e88a9a', sx + 3, 64, 4, 2); }
  });
  const dog = up => c => {
    const B = '#efe4d0', Sd = '#cdbda4', P = '#b07a4a', D = '#7a4e30';
    ell(c, Sd, 28, 19, 17, 6); ell(c, B, 28, 17, 17, 6); ell(c, P, 35, 15, 8, 4); ell(c, D, 37, 14, 4, 2);
    R(c, B, 43, 19, 8, 3); R(c, Sd, 49, 17, 3, 3); R(c, B, 36, 21, 10, 4); R(c, Sd, 36, 24, 10, 1);
    R(c, B, 5, 21, 13, 4); R(c, Sd, 5, 24, 13, 1); R(c, Sd, 9, 21, 1, 3); R(c, Sd, 13, 21, 1, 3);
    const hy = up ? 4 : 12;
    ell(c, B, 12, hy + 5, 7, 5); R(c, B, 2, hy + 5, 7, 5); R(c, Sd, 2, hy + 9, 8, 1); R(c, INK, 1, hy + 5, 3, 2);
    if (up) { R(c, INK, 8, hy + 3, 2, 2); R(c, '#ffffff', 8, hy + 3); R(c, '#c8504a', 12, hy + 10, 7, 2); } else R(c, INK, 7, hy + 4, 3, 1);
    R(c, P, 13, hy, 6, 9); R(c, D, 15, hy + 1, 4, 8); R(c, P, 9, hy + 1, 4, 3);
  };
  mk(scene, 'dog0', 52, 26, dog(false)); mk(scene, 'dog1', 52, 26, dog(true));
  const cat = f => c => {
    const C1 = '#e8a45a', C2 = '#c47a34', Wt = '#f6ead0';
    if (f === 2) {
      ell(c, C1, 15, 14, 7, 6); R(c, Wt, 9, 11, 5, 8); ell(c, C1, 9, 6, 5, 4); R(c, C1, 4, 0, 3, 4); R(c, C1, 11, 0, 3, 4); R(c, '#e88a9a', 5, 2); R(c, '#e88a9a', 12, 2);
      R(c, INK, 6, 6, 2, 1); R(c, INK, 10, 6, 2, 1); R(c, '#e88a9a', 8, 8); for (const sy of [9, 12, 15]) R(c, C2, 15, sy, 6, 1);
      R(c, C1, 18, 18, 9, 3); R(c, C2, 23, 18, 2, 3); R(c, Wt, 26, 18, 1, 3); R(c, Wt, 8, 19, 3, 2); R(c, Wt, 12, 19, 3, 2); return;
    }
    R(c, C1, 6, 6, 17, 8); for (const sx of [10, 14, 18]) R(c, C2, sx, 6, 2, 4); R(c, Wt, 8, 12, 11, 2);
    R(c, C1, 0, 2, 9, 8); R(c, C1, 0, 0, 2, 2); R(c, C1, 6, 0, 2, 2); R(c, '#e88a9a', 0, 1); R(c, INK, 2, 5, 2, 2); R(c, '#e88a9a', 0, 7); R(c, Wt, 1, 8, 4, 2); R(c, C2, 4, 2, 3, 1);
    R(c, C1, 22, 0, 2, 9); R(c, C1, 24, 0, 2, 2); R(c, C2, 22, 3, 2, 2); R(c, Wt, 25, 0, 1, 2);
    for (const lx of (f === 0 ? [6, 19] : [10, 15])) { R(c, C1, lx, 14, 3, 4); R(c, Wt, lx, 18, 3, 2); }
    for (const lx of (f === 0 ? [10, 15] : [6, 19])) R(c, C2, lx, 14, 2, 3);
  };
  mk(scene, 'cat0', 28, 20, cat(0)); mk(scene, 'cat1', 28, 20, cat(1)); mk(scene, 'cat2', 28, 21, cat(2));
  // mosiężny teleskop
  mk(scene, 'tripod', 30, 40, c => {
    for (let i = 0; i < 36; i++) { R(c, '#5a3a2a', 14 - i * 0.36, 4 + i, 2, 1); R(c, '#8a6040', 14 - i * 0.36, 4 + i); R(c, '#5a3a2a', 15 + i * 0.36, 4 + i, 2, 1); R(c, '#8a6040', 15 + i * 0.36, 4 + i); if (i < 32) R(c, '#3e2820', 14, 4 + i, 2, 1); }
    R(c, '#3e2820', 8, 22, 15, 1); R(c, '#c89a4a', 8, 22, 1, 1); R(c, '#c89a4a', 22, 22, 1, 1);
    R(c, '#3a3a52', 11, 0, 8, 6); R(c, '#6a6a8a', 11, 0, 8, 1); R(c, '#c89a4a', 14, 2, 2, 2);
  });
  mk(scene, 'tube', 46, 14, c => {
    R(c, '#c89a4a', 4, 3, 31, 8); R(c, '#f0cc80', 4, 3, 31, 2); R(c, '#e0b060', 4, 5, 31, 1); R(c, '#8a6430', 4, 9, 31, 2);
    for (const bx2 of [11, 23]) { R(c, '#6a4a2a', bx2, 3, 2, 8); R(c, '#a87a3a', bx2, 3, 2, 1); }
    R(c, '#a87a3a', 35, 1, 10, 12); R(c, '#f0cc80', 35, 1, 10, 2); R(c, '#6a4a2a', 35, 11, 10, 2); R(c, '#23264e', 44, 3, 2, 8); R(c, '#5a64b0', 44, 4, 1, 2);
    R(c, '#6a4a2a', 0, 5, 4, 4); R(c, '#3e2820', 0, 5, 1, 4); R(c, '#8a6430', 12, 0, 12, 2); R(c, '#f0cc80', 12, 0, 12, 1);
  });
  const jar = note => c => {
    R(c, '#8a7a5a', 2, 0, 14, 4); R(c, '#b8a47a', 2, 0, 14, 1); R(c, '#6a5c40', 2, 3, 14, 1);
    R(c, 'rgba(170,215,235,0.28)', 2, 4, 14, 16); R(c, '#a8d0e0', 2, 4, 1, 16); R(c, '#a8d0e0', 15, 4, 1, 16); R(c, '#a8d0e0', 2, 19, 14, 1); R(c, 'rgba(255,255,255,0.7)', 4, 6, 1, 8); R(c, 'rgba(255,255,255,0.4)', 6, 6, 1, 3);
    if (note) { R(c, PAL.cream, 6, 7, 7, 11); R(c, '#d8c8a8', 12, 7, 1, 11); R(c, PAL.warm2, 6, 11, 7, 2); R(c, '#8a6450', 7, 9, 4, 1); R(c, '#8a6450', 7, 15, 5, 1); }
  };
  mk(scene, 'jar0', 18, 20, jar(false)); mk(scene, 'jar1', 18, 20, jar(true));
  mk(scene, 'tea', 24, 32, c => {
    R(c, W2, 0, 18, 24, 3); R(c, W4, 0, 18, 24, 1); R(c, W0, 0, 21, 24, 1); R(c, W1, 3, 22, 2, 10); R(c, W1, 19, 22, 2, 10); R(c, W0, 5, 26, 14, 1);
    R(c, '#f6ead0', 8, 10, 8, 8); R(c, '#ffffff', 8, 10, 8, 1); R(c, '#c8b8a0', 14, 11, 2, 7); R(c, '#b86a3a', 9, 11, 6, 1); R(c, '#f6ead0', 16, 12, 2, 1); R(c, '#f6ead0', 17, 13, 1, 3); R(c, '#f6ead0', 16, 16, 2, 1);
    R(c, 'rgba(255,255,255,0.55)', 11, 6, 1, 3); R(c, 'rgba(255,255,255,0.4)', 13, 3, 1, 3); R(c, 'rgba(255,255,255,0.3)', 11, 0, 1, 3);
  });
  for (const n of NEIGHBORS) mk(scene, 'guy_' + n.id, n.pair ? 30 : 16, 34, c => {
    const one = (x, col, hair, small, scarf) => {
      const t = small ? 10 : 0, bh = small ? 9 : 14, ly = t + 10 + bh;
      R(c, hair, x + 3, t, 10, 5); R(c, hair, x + 2, t + 2, 2, 5); R(c, '#f0d0b0', x + 4, t + 3, 8, 7); R(c, hair, x + 4, t + 3, 8, 2); R(c, INK, x + 6, t + 6); R(c, INK, x + 10, t + 6); R(c, '#d8a890', x + 7, t + 8, 3, 1);
      R(c, col, x + 2, t + 10, 12, bh); R(c, col, x, t + 11, 16, 5); R(c, 'rgba(0,0,30,0.3)', x + 11, t + 10, 3, bh); R(c, 'rgba(255,255,255,0.18)', x + 2, t + 10, 2, bh); R(c, scarf, x + 4, t + 10, 8, 2);
      R(c, '#f0d0b0', x, t + 16, 2, 2); R(c, '#f0d0b0', x + 14, t + 16, 2, 2);
      R(c, '#23264e', x + 3, ly, 4, 34 - ly - 2); R(c, '#23264e', x + 9, ly, 4, 34 - ly - 2); R(c, '#0c0d2a', x + 2, 32, 5, 2); R(c, '#0c0d2a', x + 9, 32, 5, 2);
    };
    one(0, n.color, n.hair, n.small, '#f6ead0'); if (n.pair) one(14, '#6a8ac8', '#3a2a2a', false, '#ffc65a');
  });
  mk(scene, 'gift0', 16, 24, c => { R(c, '#3a3a52', 6, 0, 4, 2); R(c, '#3a3a52', 3, 2, 10, 2); R(c, 'rgba(255,198,90,0.45)', 3, 4, 10, 16); R(c, PAL.warm0, 6, 9, 4, 9); R(c, '#ffffff', 7, 11, 2, 5); R(c, PAL.warm2, 6, 17, 4, 2); for (const x of [2, 7, 13]) R(c, '#3a3a52', x, 4, 1, 16); R(c, '#3a3a52', 1, 20, 14, 2); R(c, '#55557a', 1, 20, 14, 1); R(c, '#3a3a52', 3, 22, 10, 2); });
  mk(scene, 'gift1', 20, 26, c => { R(c, '#b8603a', 4, 16, 12, 10); R(c, '#d87a4a', 2, 14, 16, 3); R(c, '#8a4428', 13, 17, 3, 9); R(c, '#e89a6a', 2, 14, 16, 1); for (const [x, y] of [[4, 8], [8, 4], [12, 6], [14, 10], [6, 12], [10, 10], [2, 4], [16, 2], [10, 1]]) { R(c, PAL.green, x, y, 2, 6); R(c, '#3a5a44', x + 1, y + 2, 1, 4); R(c, '#c86aa8', x, y - 2, 2, 2); R(c, '#e89ac8', x, y - 2); } });
  mk(scene, 'gift2', 32, 12, c => { ell(c, '#3a4f9a', 16, 7, 15, 4); ell(c, '#5a7ac8', 16, 6, 15, 4); R(c, '#8fa8e8', 6, 3, 20, 1); for (let x = 5; x < 28; x += 5) R(c, '#3a4f9a', x, 5, 1, 4); R(c, PAL.warm0, 15, 6, 2, 2); });
  mk(scene, 'gift3', 14, 28, c => { R(c, '#8a8fa8', 6, 0, 1, 6); R(c, W3, 2, 6, 10, 2); R(c, W4, 2, 6, 10, 1); for (const [x, h] of [[2, 15], [5, 19], [8, 12], [11, 17]]) { R(c, '#c8d0e8', x, 8, 1, h); R(c, '#8a94c0', x + 1, 8, 1, h); R(c, '#ffffff', x, 8 + h - 2); } R(c, PAL.warm1, 6, 24, 2, 3); });
  mk(scene, 'cloud', 112, 36, c => {
    for (const [x, y, rx, ry] of [[28, 23, 24, 10], [56, 17, 26, 14], [84, 23, 24, 10], [44, 25, 32, 8]]) ell(c, '#2a3160', x, y + 2, rx, ry);
    for (const [x, y, rx, ry] of [[28, 21, 22, 9], [56, 15, 24, 12], [84, 21, 22, 9]]) ell(c, '#46508a', x, y, rx, ry);
    for (const [x, y, rx, ry] of [[24, 17, 14, 4], [52, 9, 16, 5], [82, 17, 14, 4]]) ell(c, '#6672ae', x, y, rx, ry);
    dith(c, '#2a3160', 6, 22, 100, 10, 0.4);
  });
  mk(scene, 'mote', 2, 2, c => R(c, '#fff', 0, 0, 2, 2));
  mk(scene, 'smudge', 24, 24, c => { const b = new Buf(24, 24); b.glow(12, 12, 6, 5, 0.5, [150, 165, 240], 0.75); putD(b, c, 4); R(c, 'rgba(230,235,255,0.8)', 12, 12); });
  mk(scene, 'ic_scan', 12, 12, c => { for (let a = 0; a < 6.3; a += 0.2) R(c, PAL.warm1, 5.5 + Math.cos(a) * 4.5, 5.5 + Math.sin(a) * 4.5); R(c, PAL.warm0, 5, 3, 1, 5); R(c, PAL.warm0, 3, 5, 5, 1); R(c, PAL.white, 5, 5); });
  mk(scene, 'comet_sky', 140, 60, c => { const b = new Buf(140, 60); for (let s = 0; s < 120; s++) b.glow(16 + s, 44 - s * 0.3, 2 + s * 0.08, 2 + s * 0.08, 0, [170, 215, 255], 0.3 * (1 - s / 124)); b.glow(16, 44, 4, 4, 0, [235, 255, 248], 1.8); putD(b, c, 5); sparkle(c, 16, 44, 5); });
  // Księżyc w 12 fazach (noc 0 = nów, 6 = pełnia); terminator to elipsa
  for (let p = 0; p < 12; p++) mk(scene, 'moon' + p, 28, 28, c => {
    if (p === 0) return;
    const a = p / 12 * Math.PI * 2, k = Math.cos(a), R2 = 13;
    for (let y = -R2; y <= R2; y++) for (let x = -R2; x <= R2; x++) {
      if (x * x + y * y > R2 * R2 + 4) continue;
      const w = Math.sqrt(Math.max(0, R2 * R2 - y * y)), lit = p < 6 ? x >= k * w : x <= -k * w;
      if (!lit) { if (bay(x + 20, y + 20) < 0.25) R(c, 'rgba(120,130,190,0.35)', x + 14, y + 14); continue; } // popielate światło
      const crater = [[-4, -4, 4], [4, 2, 3], [-3, 6, 3], [6, -6, 2], [0, -9, 2], [-8, 1, 2]].some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 <= rr * rr);
      R(c, crater ? '#c2c5dc' : x + y < -11 ? '#ffffff' : x + y > 12 ? '#dfe2f0' : '#eef0f8', x + 14, y + 14);
    }
  });
  // ikonki prognozy 12x12
  const star = (c, x, y) => { R(c, PAL.warm0, x, y - 2, 1, 5); R(c, PAL.warm0, x - 2, y, 5, 1); R(c, PAL.white, x, y); };
  const cl = (c, x, y, col) => { ell(c, col, x, y, 4, 2); ell(c, col, x + 1, y - 2, 2, 2); };
  mk(scene, 'w_clear', 12, 12, c => { star(c, 4, 4); star(c, 8, 8); R(c, PAL.warm0, 9, 2); });
  mk(scene, 'w_maybe', 12, 12, c => { star(c, 3, 3); cl(c, 6, 8, '#8a94b8'); });
  mk(scene, 'w_likely', 12, 12, c => { cl(c, 5, 5, '#6a7498'); cl(c, 6, 9, '#aab4d0'); });
  mk(scene, 'ic_tea', 12, 12, c => { R(c, PAL.cream, 3, 5, 5, 5); R(c, PAL.cream, 8, 6, 2, 1); R(c, PAL.cream, 9, 7, 1, 2); R(c, PAL.cream, 8, 8, 1, 1); R(c, PAL.warm2, 3, 5, 5, 1); R(c, '#c8c8d8', 4, 2, 1, 2); R(c, '#c8c8d8', 6, 1, 1, 2); });
}
