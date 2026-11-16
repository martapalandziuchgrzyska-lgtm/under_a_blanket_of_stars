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
export function buildWorld(scene) {
  mk(scene, 'sky', 180, 160, c => {
    const cols = [PAL.night0, '#0e1430', PAL.night1, '#162045', PAL.night2, '#22305e'];
    for (let y = 0; y < 160; y++) { const f = y / 160 * (cols.length - 1), i = Math.floor(f); R(c, (f - i > ((y % 2) ? 0.35 : 0.65)) ? cols[Math.min(cols.length - 1, i + 1)] : cols[i], 0, y, 180, 1); }
  });
  mk(scene, 'pollution', 180, 160, c => { for (let y = 40; y < 160; y++) { const a = Math.floor(((y - 40) / 120) ** 1.6 * 8) / 8 * 0.75; R(c, `rgba(232,138,58,${a})`, 0, y, 180, 1); } });
  const r = rng(42);
  const stars = (key, n, amin, amax) => mk(scene, key, 180, 150, c => { for (let i = 0; i < n; i++) { const x = r() * 180 | 0, y = (r() ** 1.3) * 148 | 0, a = amin + r() * (amax - amin), col = STARC[Math.floor(r() * 4)]; R(c, `rgba(${col[0]},${col[1]},${col[2]},${a})`, x, y); } });
  stars('stars1', 26, 0.8, 1); stars('stars2', 90, 0.45, 0.8); stars('stars3', 260, 0.2, 0.5);
  mk(scene, 'milky', 180, 150, c => { const b = new Buf(180, 150), q = rng(5); for (let i = 0; i < 46; i++) { const s = i / 45; b.glow(40 + s * 110 + gauss(q) * 6, 140 - s * 150 + gauss(q) * 6, 12 + q() * 8, 7 + q() * 4, -0.9, [190, 200, 240], 0.07 + q() * 0.05); } for (let i = 0; i < 260; i++) { const s = q(); b.add(40 + s * 110 + gauss(q) * 16, 140 - s * 150 + gauss(q) * 12, WHITE, 0.3); } b.put(c); });
  mk(scene, 'glow', 32, 32, c => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, y - 15.5) / 16, a = Math.floor(Math.max(0, 1 - d) ** 2 * 6) / 6; if (a > 0) R(c, `rgba(255,255,255,${a})`, x, y); } });
  mk(scene, 'houses', 180, 64, c => {
    const base = 62, q = rng(9);
    for (const tx of [33, 67, 107, 138, 178]) { ell(c, '#0a1026', tx, base - 14, 5, 9); R(c, '#0a1026', tx, base - 8, 1, 8); }
    for (const h of HOUSES) {
      R(c, PAL.house, h.x, base - h.h, h.w, h.h);
      for (let i = 0; i <= h.roof; i++) R(c, PAL.roof, h.x - 2 + i * (h.w / 2 + 2) / h.roof, base - h.h - i, Math.ceil((h.w + 4) * (1 - i / h.roof)) , 1);
      R(c, PAL.roof, h.x + h.w - 8, base - h.h - h.roof + 2, 3, 6);
      R(c, '#182048', h.x + h.w - 9, base - 9, 5, 9);
      for (let i = 0; i < 3; i++) R(c, '#141b3c', h.x + 2 + q() * (h.w - 6), base - h.h + 3 + q() * (h.h - 8), 1, 1);
    }
    R(c, '#080c1e', 0, base, 180, 2);
  });
  mk(scene, 'terrace', 180, 92, c => {
    // płot z tyłu (y 0-14), deski tarasu (y 14-92)
    for (let x = 0; x < 180; x += 6) { R(c, PAL.wood0, x + 1, 2, 4, 12); R(c, PAL.wood1, x + 1, 2, 1, 12); }
    R(c, PAL.wood1, 0, 4, 180, 2); R(c, PAL.wood2, 0, 4, 180, 1); R(c, PAL.wood1, 0, 11, 180, 1);
    for (const px of [28, 88, 150]) { R(c, PAL.wood1, px, 0, 4, 14); R(c, PAL.wood2, px, 0, 4, 1); }
    for (let y = 14; y < 92; y += 8) {
      R(c, (y / 8) % 2 ? PAL.wood1 : '#523840', 0, y, 180, 8); R(c, PAL.wood0, 0, y + 7, 180, 1); R(c, '#5e4046', 0, y, 180, 1);
      const off = (y * 7) % 50; for (let x = off; x < 180; x += 62) { R(c, PAL.wood0, x, y, 1, 7); R(c, PAL.wood2, x + 2, y + 3, 1, 1); R(c, PAL.wood2, x - 2, y + 3, 1, 1); }
    }
  });
  const gy = x => 8 + 11 * (1 - ((x - 90) / 86) ** 2);
  const garland = on => c => {
    R(c, PAL.wood1, 3, 0, 2, 52); R(c, PAL.wood1, 175, 0, 2, 52);
    for (let x = 4; x <= 176; x++) R(c, '#2a2238', x, gy(x));
    const cols = [PAL.warm1, PAL.warm0, '#ffa07a', PAL.warm0];
    for (let x = 12, i = 0; x < 172; x += 12, i++) { const y = Math.round(gy(x)) + 1; if (on) { R(c, 'rgba(255,198,90,0.25)', x - 2, y - 1, 5, 5); R(c, cols[i % 4], x - 1, y, 3, 3); R(c, PAL.white, x, y); } else R(c, '#4a4458', x - 1, y, 3, 3); }
  };
  mk(scene, 'garland_on', 180, 54, garland(true)); mk(scene, 'garland_off', 180, 54, garland(false));

  mk(scene, 'hero', 30, 34, c => {
    // leżak
    R(c, PAL.wood2, 3, 6, 2, 26); R(c, PAL.wood2, 24, 16, 2, 16); R(c, PAL.wood3, 3, 26, 24, 2); R(c, PAL.wood0, 5, 8, 2, 18);
    // kokon z koca
    ell(c, PAL.rose0, 15, 21, 10, 10); ell(c, PAL.rose1, 15, 20, 9, 9); ell(c, PAL.rose0, 13, 9, 7, 7); ell(c, PAL.rose1, 13, 9, 6, 6);
    for (let y = 14; y < 30; y += 4) for (let x = 6; x < 25; x++) if ((x + y) % 7 < 4 && Math.hypot(x - 15, (y - 20)) < 9) R(c, PAL.rose2, x, y);
    ell(c, PAL.rose2, 11, 6, 3, 1);
    // buzia w kapturze
    ell(c, PAL.cream, 14, 10, 4, 3); R(c, '#3a2a3a', 10, 7, 8, 2); R(c, PAL.ink, 12, 10); R(c, PAL.ink, 16, 10); R(c, '#e8a090', 11, 12); R(c, '#e8a090', 17, 12);
    // rączki z kubkiem
    R(c, PAL.cream, 13, 17, 5, 4); R(c, PAL.warm2, 14, 18, 3, 3); R(c, PAL.rose2, 12, 20, 7, 2);
    // kapcie
    R(c, PAL.cream, 9, 30, 4, 2); R(c, PAL.cream, 17, 30, 4, 2);
  });
  const dog = up => c => {
    ell(c, '#e8dcc8', 13, 8, 8, 3); ell(c, '#b07a4a', 16, 7, 4, 2); R(c, '#e8dcc8', 20, 9, 4, 2); // ciało, łata, ogon
    R(c, '#e8dcc8', 3, 9, 5, 2);
    const hy = up ? 3 : 6; ell(c, '#e8dcc8', 5, hy + 1, 3, 2); R(c, '#b07a4a', 6, hy - 1, 3, 3); R(c, '#8a5a3a', 7, hy - 1, 2, up ? 2 : 4); R(c, PAL.ink, 4, hy + 1); R(c, PAL.ink, 1, hy + 2, 2, 1);
  };
  mk(scene, 'dog0', 26, 13, dog(false)); mk(scene, 'dog1', 26, 13, dog(true));
  const cat = f => c => {
    const C1 = '#e8a45a', C2 = '#c8803a';
    if (f === 2) { ell(c, C1, 7, 7, 4, 3); ell(c, C1, 4, 3, 2, 2); R(c, C1, 2, 0); R(c, C1, 5, 0); R(c, PAL.ink, 3, 3); R(c, PAL.ink, 5, 3); R(c, C2, 9, 9, 4, 1); R(c, C2, 6, 5, 3, 1); return; }
    R(c, C1, 3, 3, 8, 4); R(c, C2, 5, 3, 1, 2); R(c, C2, 8, 3, 1, 2); R(c, C1, 0, 1, 4, 4); R(c, C1, 0, 0); R(c, C1, 3, 0); R(c, PAL.ink, 1, 2); R(c, C1, 11, 0, 1, 4); R(c, C1, 12, 0);
    if (f === 0) { R(c, C1, 3, 7, 1, 2); R(c, C1, 9, 7, 1, 2); } else { R(c, C1, 5, 7, 1, 2); R(c, C1, 7, 7, 1, 2); }
  };
  mk(scene, 'cat0', 14, 10, cat(0)); mk(scene, 'cat1', 14, 10, cat(1)); mk(scene, 'cat2', 14, 11, cat(2));
  mk(scene, 'tripod', 15, 20, c => { for (let i = 0; i < 18; i++) { R(c, '#3a3a4a', 7 - i * 0.35, 2 + i); R(c, '#3a3a4a', 7 + i * 0.35, 2 + i); R(c, '#2a2a3a', 7, 2 + i * 0.8); } R(c, '#5a5a6a', 6, 0, 3, 3); });
  mk(scene, 'tube', 22, 7, c => { R(c, '#e8e8f0', 2, 1, 15, 5); R(c, '#b8b8c8', 2, 5, 15, 1); R(c, '#2a2a3a', 16, 0, 6, 7); R(c, '#3a3a4a', 0, 2, 2, 3); R(c, '#8a8fa8', 6, 0, 2, 1); });
  const jar = note => c => { R(c, 'rgba(180,220,230,0.35)', 1, 2, 7, 8); R(c, '#a8d0d8', 1, 2, 1, 8); R(c, '#a8d0d8', 7, 2, 1, 8); R(c, '#a8d0d8', 1, 9, 7, 1); R(c, '#8a7a5a', 1, 0, 7, 2); if (note) { R(c, PAL.cream, 3, 3, 3, 6); R(c, PAL.warm2, 3, 5, 3, 1); } };
  mk(scene, 'jar0', 9, 10, jar(false)); mk(scene, 'jar1', 9, 10, jar(true));
  mk(scene, 'tea', 12, 16, c => { R(c, PAL.wood2, 0, 9, 12, 2); R(c, PAL.wood0, 2, 11, 1, 5); R(c, PAL.wood0, 9, 11, 1, 5); R(c, PAL.cream, 4, 5, 4, 4); R(c, PAL.cream, 8, 6, 1, 2); R(c, PAL.warm2, 4, 5, 4, 1); R(c, 'rgba(255,255,255,0.5)', 5, 2); R(c, 'rgba(255,255,255,0.35)', 6, 0); R(c, 'rgba(255,255,255,0.4)', 6, 3); });
  for (const n of NEIGHBORS) mk(scene, 'guy_' + n.id, n.pair ? 15 : 8, 17, c => {
    const one = (x, col, hair, small) => { const t = small ? 5 : 0; R(c, hair, x + 1, t, 5, 3); R(c, '#f0d0b0', x + 2, t + 2, 3, 3); R(c, col, x + 1, t + 5, 5, small ? 4 : 7); R(c, col, x, t + 6, 7, 2); R(c, '#2a2a40', x + 1, small ? 14 : 12, 2, small ? 3 : 5); R(c, '#2a2a40', x + 4, small ? 14 : 12, 2, small ? 3 : 5); };
    one(0, n.color, n.hair, n.small); if (n.pair) one(8, '#6a8ac8', '#3a2a2a', false);
  });
  mk(scene, 'gift0', 8, 12, c => { R(c, '#3a3a4a', 2, 0, 4, 1); R(c, '#3a3a4a', 1, 1, 6, 1); R(c, 'rgba(255,198,90,0.5)', 1, 2, 6, 8); R(c, PAL.warm0, 3, 5, 2, 4); R(c, '#3a3a4a', 1, 2, 1, 8); R(c, '#3a3a4a', 6, 2, 1, 8); R(c, '#3a3a4a', 0, 10, 8, 2); });
  mk(scene, 'gift1', 10, 13, c => { R(c, '#b8603a', 2, 8, 6, 5); R(c, '#d87a4a', 1, 7, 8, 2); for (const [x, y] of [[2, 4], [4, 2], [6, 3], [7, 5], [3, 6], [5, 5], [1, 2], [8, 1]]) { R(c, PAL.green, x, y, 1, 3); R(c, '#c86aa8', x, y - 1); } });
  mk(scene, 'gift2', 16, 6, c => { ell(c, '#5a7ac8', 8, 3, 7, 2); R(c, '#8fa8e8', 3, 2, 10, 1); R(c, PAL.warm0, 7, 3, 2, 1); });
  mk(scene, 'gift3', 7, 14, c => { R(c, '#8a8fa8', 3, 0, 1, 3); R(c, PAL.wood3, 1, 3, 5, 1); for (const [x, h] of [[1, 8], [3, 10], [5, 6]]) { R(c, '#c8d0e8', x, 4, 1, h); } });
  mk(scene, 'cloud', 56, 18, c => { for (const [x, y, rx, ry] of [[14, 11, 12, 5], [28, 8, 13, 7], [42, 11, 12, 5], [22, 12, 16, 4]]) ell(c, '#3a4466', x, y + 1, rx, ry); for (const [x, y, rx, ry] of [[14, 10, 11, 4], [28, 7, 12, 6], [42, 10, 11, 4]]) ell(c, '#59648c', x, y, rx, ry); });
  mk(scene, 'mote', 2, 2, c => R(c, '#fff', 0, 0, 2, 2));
  mk(scene, 'comet_sky', 70, 30, c => { const b = new Buf(70, 30); for (let s = 0; s < 60; s++) b.glow(8 + s, 22 - s * 0.3, 1.2 + s * 0.07, 1.2 + s * 0.07, 0, [170, 220, 255], 0.45 * (1 - s / 62)); b.glow(8, 22, 2, 2, 0, [230, 255, 245], 1.8); b.put(c); });
  for (let p = 0; p < 7; p++) mk(scene, 'moonph' + p, 11, 11, c => { const sh = [-99, -7, -4, 99, 4, 7, 99][p]; for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 26 && !(sh !== 99 && (x - sh) ** 2 + y * y <= 30) && p !== 0 && p !== 6) R(c, (x + y) % 5 === 0 ? '#c8c8d8' : '#f0f0e0', x + 5, y + 5); });
  // ikonki prognozy 12x12
  const star = (c, x, y) => { R(c, PAL.warm0, x, y - 2, 1, 5); R(c, PAL.warm0, x - 2, y, 5, 1); R(c, PAL.white, x, y); };
  const cl = (c, x, y, col) => { ell(c, col, x, y, 4, 2); ell(c, col, x + 1, y - 2, 2, 2); };
  mk(scene, 'w_clear', 12, 12, c => { star(c, 4, 4); star(c, 8, 8); R(c, PAL.warm0, 9, 2); });
  mk(scene, 'w_maybe', 12, 12, c => { star(c, 3, 3); cl(c, 6, 8, '#8a94b8'); });
  mk(scene, 'w_likely', 12, 12, c => { cl(c, 5, 5, '#6a7498'); cl(c, 6, 9, '#aab4d0'); });
  mk(scene, 'ic_tea', 12, 12, c => { R(c, PAL.cream, 3, 5, 5, 5); R(c, PAL.cream, 8, 6, 2, 1); R(c, PAL.cream, 9, 7, 1, 2); R(c, PAL.cream, 8, 8, 1, 1); R(c, PAL.warm2, 3, 5, 5, 1); R(c, '#c8c8d8', 4, 2, 1, 2); R(c, '#c8c8d8', 6, 1, 1, 2); });
  mk(scene, 'paper', 8, 8, c => { R(c, PAL.cream, 0, 0, 8, 8); });
}
