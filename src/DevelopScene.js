// Wywoływanie zdjęć: minigierka zależy od typu obiektu.
import Phaser from '../lib/phaser.esm.min.js';
import { OBJ, TYPES } from './data.js';
import { S, ost, develop, devBlockDone, tier, maxP } from './state.js';
import { W, H, setupCam, txt, button, slider } from './ui.js';
import { sfx } from './audio.js';

const ADD = Phaser.BlendModes.ADD;
const CX = W / 2, CY = 220, SC = 4; // kadr 192x192

export class DevelopScene extends Phaser.Scene {
  constructor() { super('Develop'); }
  init(d) { this.id = d.id; this.block = !!d.block; this.finished = false; }

  create() {
    setupCam(this);
    const o = this.o = OBJ[this.id], st = ost(this.id);
    this.tier = tier(this.id); this.extra = this.tier - 1; // więcej światła = łatwiejsze wywoływanie
    this.tol = 0.07 * (1 + 0.4 * this.extra);
    this.add.rectangle(CX, H / 2, W, H, 0x0b1026);
    txt(this, CX, 20, 'Wywoływanie', { size: 11, ox: 0.5, color: '#aab4d0' });
    txt(this, CX, 44, o.name, { size: 14, ox: 0.5, color: '#ffc65a', style: 'bold', wrap: 330, align: 'center' });
    this.add.rectangle(CX, CY, 200, 200, 0x05060f).setStrokeStyle(2, 0x4a3238);
    this.hint = txt(this, CX, CY + 118, '', { size: 11, ox: 0.5, color: '#d8dcf0', align: 'center', wrap: 330 });
    txt(this, CX, 78, `światło ${st.p}/${maxP(this.id)} · starczy najwyżej na ${'★'.repeat(this.tier)}${'☆'.repeat(3 - this.tier)}`, { size: 10, ox: 0.5, color: '#8fe8a8' });
    this.done = button(this, CX, H - 40, 180, 40, 'Gotowe', () => this.finish(), { fill: 0x8a3a56, stroke: 0xe88a9a, size: 15 });
    this.back = button(this, 44, 26, 72, 26, '‹ Wróć', () => this.scene.start('Night'), { size: 11 });
    this.err = () => 1;
    this[TYPES[o.type].game]();
  }

  img(key, a = 1) { return this.add.image(CX, CY, key).setScale(SC).setAlpha(a); }

  // Księżyc, planety, gwiazdy podwójne: ostrość
  focus() {
    const dbl = this.o.type === 'double';
    this.hint.setText(dbl ? 'Kręć ostrością, aż dwie gwiazdy się rozdzielą.' : 'Ustaw ostrość: obraz ma być jeden i wyraźny.');
    const t = 0.15 + Math.random() * 0.7;
    const ghosts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => ({ d, i: this.img('obj_' + this.id, 0.3).setBlendMode(ADD) }));
    const main = this.img('obj_' + this.id);
    const upd = v => {
      const e = Math.abs(v - t), px = Math.round(e * 70 / 4) * 4;
      ghosts.forEach(g => g.i.setPosition(CX + g.d[0] * px, CY + g.d[1] * px).setScale(SC * (1 + e * 0.5)).setVisible(px > 0));
      main.setAlpha(px > 0 ? 0.45 : 1).setScale(SC * (px > 0 ? 1 + e * 0.3 : 1));
    };
    const s = slider(this, 60, 410, 240, 'ostrość', upd, t > 0.5 ? 0.08 : 0.92);
    upd(s.v);
    this.err = () => Math.abs(s.v - t) * 0.8;
  }

  // Gromady: nakładanie przesuniętych klatek
  stack() {
    const n = this.extra ? 2 : 3;
    let k = 0, sum = 0;
    this.img('obj_' + this.id, 0.45);
    const ghost = this.img('obj_' + this.id, 0.6).setBlendMode(ADD).setInteractive({ draggable: true });
    const place = () => { const a = Math.random() * 6.28, r = 36 + Math.random() * 30; ghost.setPosition(CX + Math.cos(a) * r, CY + Math.sin(a) * r).setTint([0xffb0b0, 0xb0ffb8, 0xb0c8ff][k % 3]); this.hint.setText(`Przeciągnij klatkę ${k + 1} z ${n} tak, żeby gwiazdy się pokryły.`); };
    this.input.on('drag', (p, obj, x, y) => { obj.setPosition(Math.round(x / 2) * 2, Math.round(y / 2) * 2); });
    place();
    this.done.setLabel('Nałóż klatkę');
    this.err = () => {
      sum += Math.hypot(ghost.x - CX, ghost.y - CY) / 110; k++;
      this.img('obj_' + this.id, 0.25).setBlendMode(ADD);
      if (k < n) { place(); this.children.bringToTop(ghost); return null; }
      ghost.destroy();
      return sum / n;
    };
  }

  // Mgławice: wyciąganie koloru suwakami
  color() {
    this.hint.setText('Przesuwaj suwaki, aż każda barwa zaświeci najmocniej.');
    const keys = ['a', 'b', 's'], labels = ['wodór (czerwień)', 'tlen (błękit)', 'gwiazdy i tło'];
    const t = keys.map(() => 0.12 + Math.random() * 0.76);
    this.img('noise', 0.25);
    const layers = keys.map(k => this.img(`obj_${this.id}_${k}`));
    const sl = keys.map((k, i) => {
      const upd = v => layers[i].setAlpha(Math.max(0.06, 1 - Math.abs(v - t[i]) * 3.2));
      const s = slider(this, 60, 384 + i * 58, 240, labels[i], upd, t[i] > 0.5 ? 0.1 : 0.9);
      upd(s.v);
      return s;
    });
    this.hint.setY(CY + 108);
    this.err = () => sl.reduce((a, s, i) => a + Math.abs(s.v - t[i]), 0) / 3 * 1.3;
  }

  // Galaktyki: ścieranie szumu palcem
  rub() {
    const G = 12, cell = 4; // siatka 12x12 komórek po 4 piksele grafiki
    this.img('obj_' + this.id);
    if (this.textures.exists('rubnoise')) this.textures.remove('rubnoise');
    const tex = this.textures.createCanvas('rubnoise', 48, 48), ctx = tex.context;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const v = Math.random(); ctx.fillStyle = `rgba(${70 + v * 150 | 0},${70 + v * 140 | 0},${90 + v * 150 | 0},${v < 0.75 ? 0.95 : 0.6})`; ctx.fillRect(x, y, 1, 1); }
    tex.refresh();
    this.img('rubnoise');
    const clean = new Uint8Array(G * G);
    let budget = 1500 * (1 + 0.35 * this.extra), total = budget, cleaned = 0, last = null;
    const bar = this.add.rectangle(CX - 100, CY + 158, 200, 6, 0x8fb8ff).setOrigin(0, 0.5);
    this.add.rectangle(CX, CY + 158, 202, 8).setStrokeStyle(1, 0x8fb8ff, 0.6);
    this.hint.setText('Ścieraj szum palcem. Ściereczka się zużywa, więc nie machaj na oślep.');
    const zone = this.add.rectangle(CX, CY, 200, 200, 0, 0).setInteractive();
    const wipe = p => {
      if (!p.isDown || budget <= 0) { last = null; return; }
      if (last) budget -= Math.hypot(p.worldX - last.x, p.worldY - last.y);
      last = { x: p.worldX, y: p.worldY };
      const gx = Math.floor((p.worldX - (CX - 96)) / (cell * SC)), gy = Math.floor((p.worldY - (CY - 96)) / (cell * SC));
      let ch = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x < 0 || y < 0 || x >= G || y >= G || clean[y * G + x] || (dx && dy && Math.random() < 0.5)) continue;
        clean[y * G + x] = 1; cleaned++; ch = true; ctx.clearRect(x * cell, y * cell, cell, cell);
      }
      if (ch) tex.refresh();
      bar.width = 200 * Math.max(0, budget / total);
      if (budget <= 0) this.hint.setText('Ściereczka zużyta. Stuknij „Gotowe”.');
    };
    zone.on('pointerdown', p => { last = null; wipe(p); });
    zone.on('pointermove', wipe);
    this.input.on('pointerup', () => { last = null; });
    this.err = () => { const f = cleaned / (G * G); return f >= 0.93 ? 0 : f >= 0.72 ? this.tol * 1.5 : 1; };
  }

  finish() {
    if (this.finished) return;
    const e = this.err();
    if (e === null) return; // kolejna klatka
    this.finished = true;
    let stars = e <= this.tol ? 3 : e <= this.tol * 2.6 ? 2 : 1;
    const res = develop(this.id, stars), capped = stars > res.stars;
    sfx('jingle');
    stars = res.stars;
    if (this.block) devBlockDone();
    this.back.c.destroy();
    const st = ost(this.id);
    this.done.c.destroy();
    this.add.rectangle(CX, H / 2, W, H, 0x0b1026, 0.93);
    this.add.rectangle(CX, CY, 204, 204, st.album.gold ? 0xffc65a : 0xf6ead0);
    this.add.rectangle(CX, CY, 192, 192, 0x05060f);
    const im = this.img('obj_' + this.id).setAlpha(0);
    this.tweens.add({ targets: im, alpha: 1, duration: 900 });
    txt(this, CX, 60, this.o.name, { size: 14, ox: 0.5, color: '#ffc65a', style: 'bold', wrap: 330, align: 'center' });
    txt(this, CX, CY + 122, '★'.repeat(stars) + '☆'.repeat(3 - stars), { size: 26, ox: 0.5, color: '#ffc65a' });
    txt(this, CX, CY + 162, (capped ? 'Dobra robota, ale na więcej gwiazdek trzeba więcej światła.' : ['Trochę nieostre, ale Twoje.', 'Ładny kadr!', 'Zdjęcie jak z atlasu!'][stars - 1]) + (res.upgrade ? '\nNaklejka w albumie sama się podmieniła.' : '') + (st.album.gold ? '\nZebrane jednym ciągiem: złota ramka.' : '') + `\n\n${this.o.fact}`, { size: 12, ox: 0.5, align: 'center', wrap: 320, color: '#d8dcf0' });
    button(this, CX, H - 40, 200, 40, res.upgrade ? 'Wróć na taras' : 'Wklej do albumu', () => (res.upgrade ? this.scene.start('Night') : this.scene.start('Album', { paste: this.id })), { fill: 0x8a3a56, stroke: 0xe88a9a, size: 15 });
  }
}
