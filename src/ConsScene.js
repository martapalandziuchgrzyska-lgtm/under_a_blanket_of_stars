// Łączenie gwiazdozbioru: przeciągasz palcem od gwiazdy do gwiazdy według wzoru, który widać tylko przez chwilę.
import Phaser from '../lib/phaser.esm.min.js';
import { CON, SEASONS } from './data.js';
import { consDone } from './state.js';
import { rng } from './art.js';
import { sfx } from './audio.js';
import { W, H, setupCam, txt, button } from './ui.js';

const BX = 40, BY = 110, BS = 280; // pole z gwiazdami

// Przeskalowuje punkty gwiazdozbioru do kwadratu o boku `size` z marginesem.
export function fitPoints(pts, size, pad = 0.14) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1;
  const k = size * (1 - pad * 2) / Math.max(w, h);
  return pts.map(p => [size / 2 + (p[0] - x0 - w / 2) * k, size / 2 + (p[1] - y0 - h / 2) * k]);
}

export class ConsScene extends Phaser.Scene {
  constructor() { super('Cons'); }
  init(d) { this.id = d.id; this.finished = false; }

  create() {
    setupCam(this);
    const con = CON[this.id], r = rng('con' + this.id);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b1026);
    this.add.image(BX - 20, BY - 20, 'sky').setOrigin(0).setDisplaySize(BS + 40, BS + 40);
    this.add.tileSprite(BX - 20, BY - 20, BS + 40, BS + 40, 'stars3').setOrigin(0).setAlpha(0.6);
    this.add.rectangle(BX + BS / 2, BY + BS / 2, BS + 40, BS + 40).setStrokeStyle(2, 0x4a3238).setRounded(14);
    txt(this, W / 2, 20, 'Mapa Nieba', { size: 11, ox: 0.5, color: '#aab4d0' });
    txt(this, W / 2, 40, con.name, { size: 18, ox: 0.5, color: '#ffc65a', style: '800' });
    txt(this, W / 2, 66, SEASONS[con.s].toLowerCase() + ' · połącz gwiazdy jak we wzorze', { size: 10, ox: 0.5, color: '#aab4d0' });
    this.back = button(this, 44, 22, 72, 26, '‹ Album', () => this.scene.start('Album', { page: 5 }), { size: 11 });

    const real = fitPoints(con.pts, BS).map(([x, y]) => ({ x: BX + x, y: BY + y }));
    const stars = [...real];
    for (let i = 0, t = 0; i < 6 && t < 400; t++) { // gwiazdy-zmyłki
      const p = { x: BX + 14 + r() * (BS - 28), y: BY + 14 + r() * (BS - 28) };
      if (stars.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 34)) { stars.push(p); i++; }
    }
    const hint = this.add.graphics(), lines = this.add.graphics(), rubber = this.add.graphics();
    const showHint = () => {
      hint.clear().setAlpha(1).lineStyle(2, 0x9fb4ff, 0.75);
      for (const [a, b] of con.edges) hint.lineBetween(real[a].x, real[a].y, real[b].x, real[b].y);
      this.tweens.killTweensOf(hint);
      this.tweens.add({ targets: hint, alpha: 0, delay: 2200, duration: 700 });
    };
    stars.forEach((p, i) => {
      const big = i < real.length;
      this.add.circle(p.x, p.y, big ? 9 : 7, 0xbcd0ff, 0.14);
      this.add.circle(p.x, p.y, big ? 4 : 3, 0xffffff, big ? 1 : 0.85);
    });
    const done = new Set(), key = (a, b) => (a < b ? a + '-' + b : b + '-' + a), valid = new Set(con.edges.map(([a, b]) => key(a, b)));
    const prog = txt(this, W / 2, BY + BS + 34, '', { size: 12, ox: 0.5, color: '#d8dcf0' });
    const upd = () => prog.setText(`połączone linie: ${done.size} z ${valid.size}`);
    upd();
    button(this, W / 2, BY + BS + 70, 150, 32, 'Pokaż wzór', showHint, { size: 12 });
    const near = (x, y) => { let best = -1, bd = 30; stars.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } }); return best; };
    let from = -1;
    const zone = this.add.rectangle(BX + BS / 2, BY + BS / 2, BS + 40, BS + 40, 0, 0).setInteractive();
    zone.on('pointerdown', p => { if (!this.finished) from = near(p.worldX, p.worldY); });
    this.input.on('pointermove', p => {
      rubber.clear();
      if (from < 0 || !p.isDown || this.finished) return;
      rubber.lineStyle(2, 0xffc65a, 0.8).lineBetween(stars[from].x, stars[from].y, p.worldX, p.worldY);
    });
    this.input.on('pointerup', p => {
      rubber.clear();
      if (from < 0 || this.finished) return;
      const to = near(p.worldX, p.worldY), a = from; from = -1;
      if (to < 0 || to === a) return;
      const k = key(a, to);
      if (valid.has(k) && !done.has(k)) {
        done.add(k); sfx('link');
        lines.lineStyle(2.5, 0xffe9a8, 1).lineBetween(stars[a].x, stars[a].y, stars[to].x, stars[to].y);
        upd();
        if (done.size === valid.size) this.win(con);
      } else if (!done.has(k)) {
        sfx('soft');
        const bad = this.add.graphics().lineStyle(2, 0xe86a6a, 0.9).lineBetween(stars[a].x, stars[a].y, stars[to].x, stars[to].y);
        this.tweens.add({ targets: bad, alpha: 0, duration: 450, onComplete: () => bad.destroy() });
      }
    });
    showHint();
    this.prog = prog;
  }

  win(con) {
    this.finished = true;
    consDone(this.id);
    sfx('jingle');
    this.back.c.destroy();
    this.prog.setText(`${con.name} na Mapie Nieba!`).setColor('#ffe9a8');
    // rysunek ożywa: złota linia rozbłyskuje i zostaje
    const g = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const real = fitPoints(con.pts, BS).map(([x, y]) => ({ x: BX + x, y: BY + y }));
    g.lineStyle(6, 0xffc65a, 0.35);
    for (const [a, b] of con.edges) g.lineBetween(real[a].x, real[a].y, real[b].x, real[b].y);
    g.setAlpha(0); this.tweens.add({ targets: g, alpha: 1, duration: 500, yoyo: true, hold: 300 });
    button(this, W / 2, H - 34, 200, 40, 'Wróć do albumu', () => this.scene.start('Album', { page: 5 }), { fill: 0x8a3a56, stroke: 0xe88a9a, size: 15 });
  }
}
