// Skanowanie nieba: prowadzisz szukacz po polu gwiazd, sygnał rośnie przy ukrytym obiekcie.
import Phaser from '../lib/phaser.esm.min.js';
import { TYPES } from './data.js';
import { S, scanCandidates, scanDone } from './state.js';
import { W, H, setupCam, txt, button } from './ui.js';

const FX = 20, FY = 64, FW = 320, FH = 400; // pole widzenia
const HEAT = ['zimno', 'chłodno', 'cieplej', 'ciepło', 'gorąco!'];

export class ScanScene extends Phaser.Scene {
  constructor() { super('Scan'); }

  create() {
    setupCam(this);
    this.found = false; this.lock = 0;
    const cands = scanCandidates(S.cur.b);
    if (!cands.length) { this.scene.start('Night'); return; }
    const o = this.o = cands[Math.floor(Math.random() * cands.length)];

    this.add.rectangle(W / 2, H / 2, W, H, 0x0b1026);
    txt(this, W / 2, 20, 'Skanowanie nieba', { size: 14, ox: 0.5, color: '#ffc65a', style: 'bold' });
    txt(this, W / 2, 42, 'Prowadź szukacz palcem. Im cieplej, tym bliżej.', { size: 10, ox: 0.5, color: '#aab4d0' });
    this.back = button(this, 44, 22, 72, 26, '‹ Wróć', () => this.scene.start('Night'), { size: 11 });

    this.add.image(FX, FY, 'sky').setOrigin(0).setDisplaySize(FW, FH);
    const off = Math.random() * 700;
    for (const [k, a] of [['milky', 0.5], ['stars3', 0.9], ['stars2', 0.9], ['stars1', 1]]) { const t = this.add.tileSprite(FX, FY, FW, FH, k).setOrigin(0).setAlpha(a); t.tilePositionX = off; t.tilePositionY = k === 'milky' ? 0 : off * 0.3; }
    this.add.rectangle(FX + FW / 2, FY + FH / 2, FW, FH).setStrokeStyle(2, 0x4a3238);

    this.pos = { x: FX + 40 + Math.random() * (FW - 80), y: FY + 40 + Math.random() * (FH - 80) };
    this.obj = this.add.image(this.pos.x, this.pos.y, 'obj_' + o.id).setScale(1.5).setAlpha(0);

    // szukacz zaczyna daleko od celu
    const fx = this.pos.x > FX + FW / 2 ? FX + 60 : FX + FW - 60, fy = this.pos.y > FY + FH / 2 ? FY + 60 : FY + FH - 60;
    this.ring = this.add.circle(fx, fy, 38).setStrokeStyle(2, 0xffc65a, 0.9);
    this.cross = [this.add.rectangle(fx, fy, 16, 1, 0xffc65a, 0.7), this.add.rectangle(fx, fy, 1, 16, 0xffc65a, 0.7)];
    this.arc = this.add.graphics();

    txt(this, FX, FY + FH + 14, 'sygnał', { size: 10, color: '#aab4d0' });
    this.heat = txt(this, FX + FW, FY + FH + 14, '', { size: 11, ox: 1, color: '#ffe9a8' });
    this.add.rectangle(W / 2, FY + FH + 40, FW + 2, 12).setStrokeStyle(1, 0x8fb8ff, 0.6);
    this.bar = this.add.rectangle(FX, FY + FH + 40, 1, 10, 0xffc65a).setOrigin(0, 0.5);
    this.msg = txt(this, W / 2, FY + FH + 64, 'Gdzieś tu jest coś, czego jeszcze nie znasz.', { size: 11, ox: 0.5, color: '#d8dcf0', align: 'center', wrap: 320 });

    const zone = this.add.rectangle(FX + FW / 2, FY + FH / 2, FW, FH, 0, 0).setInteractive();
    const move = p => { if (this.found || !p.isDown) return; this.setFinder(Phaser.Math.Clamp(p.worldX, FX + 10, FX + FW - 10), Phaser.Math.Clamp(p.worldY, FY + 10, FY + FH - 10)); };
    zone.on('pointerdown', move); zone.on('pointermove', move);
  }

  setFinder(x, y) { this.ring.setPosition(x, y); this.cross.forEach(c => c.setPosition(x, y)); }

  update(time, dt) {
    if (this.found || !this.ring) return;
    const d = Math.hypot(this.ring.x - this.pos.x, this.ring.y - this.pos.y), near = Math.max(0, 1 - d / 260);
    this.bar.width = FW * near * near;
    this.heat.setText(HEAT[Math.min(4, Math.floor(near * near * 5))]);
    this.obj.setAlpha(Math.max(0, 1 - d / 70) * 0.85);
    this.lock = d < 18 ? this.lock + dt : Math.max(0, this.lock - dt * 2);
    this.arc.clear();
    if (this.lock > 0) { this.arc.lineStyle(3, 0x8fe8a8, 1).beginPath().arc(this.ring.x, this.ring.y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.lock / 900)).strokePath(); this.msg.setText('Trzymaj... namierzanie.'); }
    if (this.lock >= 900) this.win();
  }

  win() {
    this.found = true;
    const o = this.o;
    scanDone(o.id);
    this.back.c.destroy(); this.arc.clear();
    this.setFinder(this.pos.x, this.pos.y);
    this.ring.setStrokeStyle(2, 0x8fe8a8, 1);
    this.obj.setAlpha(1);
    this.tweens.add({ targets: this.obj, scale: 2.5, duration: 500, ease: 'Back.easeOut' });
    this.heat.setText('namierzone');
    this.msg.setText(`Znalezione: ${o.name}\n${TYPES[o.type].label} · poziom ${o.lvl} · ${o.note}`).setColor('#ffe9a8');
    button(this, W / 2, H - 34, 200, 40, 'Wróć na taras', () => this.scene.start('Night'), { fill: 0x8a3a56, stroke: 0xe88a9a, size: 15 });
  }
}
