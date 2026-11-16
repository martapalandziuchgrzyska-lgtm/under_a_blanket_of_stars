// Świt między nocami: niebo jaśnieje, wschodzi słońce, a w dzienniku przybywa jedno zdanie.
import Phaser from '../lib/phaser.esm.min.js';
import { SEASONS, NIGHTS_PER_SEASON, DIARY } from './data.js';
import { S, season, nightNo, year, moonPhase } from './state.js';
import { W, H, setupCam, txt, button, SERIF } from './ui.js';

const ADD = Phaser.BlendModes.ADD;

export class DawnScene extends Phaser.Scene {
  constructor() { super('Dawn'); }
  init(d) { this.night = d.night ?? Math.max(0, S.night - 1); }

  create() {
    setupCam(this);
    const s = Math.floor(this.night / NIGHTS_PER_SEASON) % 4, n = this.night % NIGHTS_PER_SEASON;
    if (!this.textures.exists('dawn')) {
      const t = this.textures.createCanvas('dawn', 8, 240), g = t.context.createLinearGradient(0, 0, 0, 240);
      [[0, '#2a2f7a'], [0.4, '#7a5a9e'], [0.7, '#e8875e'], [0.88, '#ffc88a'], [1, '#ffe9b8']].forEach(([p, c]) => g.addColorStop(p, c));
      t.context.fillStyle = g; t.context.fillRect(0, 0, 8, 240); t.refresh();
    }
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, 470);
    const stars = ['stars3', 'stars2', 'stars1'].map(k => this.add.tileSprite(0, 0, W, 440, k).setOrigin(0));
    const dawn = this.add.image(0, 0, 'dawn').setOrigin(0).setDisplaySize(W, 470).setAlpha(0);
    const halo = this.add.image(250, 480, 'glow').setScale(11).setTint(0xffc65a).setAlpha(0).setBlendMode(ADD);
    const sun = this.add.circle(250, 480, 24, 0xfff0c0);
    this.add.image(0, 290, 'city').setOrigin(0).setAlpha(0.8);
    this.add.image(-20, 320, 'houses').setOrigin(0);
    this.add.image(0, 452, 'terrace').setOrigin(0);
    this.add.image(36, 540, 'dog0').setOrigin(0);
    this.add.image(120, 572, 'hero').setOrigin(0.5, 1);
    this.add.image(176, 532, 'tripod').setOrigin(0); this.add.image(191, 536, 'tube').setOrigin(0.3, 0.5).setRotation(-0.6);
    const cat = this.add.image(-20, 478, 'cat0').setOrigin(0.5, 1).setFlipX(true);
    const warm = this.add.rectangle(W / 2, 540, W, 200, 0xffb070, 0).setBlendMode(ADD);

    this.tweens.add({ targets: dawn, alpha: 1, duration: 3200, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: stars, alpha: 0, duration: 2400 });
    this.tweens.add({ targets: [sun, halo], y: 392, duration: 3800, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: halo, alpha: 0.55, duration: 3000 });
    this.tweens.add({ targets: warm, fillAlpha: 0.16, duration: 3500 });
    this.tweens.add({ targets: cat, x: W + 20, duration: 9000 });
    this.time.addEvent({ delay: 220, loop: true, callback: () => cat.setTexture(cat.texture.key === 'cat0' ? 'cat1' : 'cat0') });
    // klucz ptaków
    const birds = this.add.container(-40, 200);
    [[0, 0], [-14, 8], [-12, -9], [-28, 15], [-25, -17]].forEach(([x, y]) => { const b = this.add.graphics(); b.lineStyle(1.5, 0x2a2440, 0.9); b.beginPath(); b.moveTo(x - 4, y - 2); b.lineTo(x, y); b.lineTo(x - 4, y + 2); b.strokePath(); birds.add(b); });
    this.tweens.add({ targets: birds, x: W + 60, y: 150, duration: 7000, delay: 900 });

    txt(this, W / 2, 26, `Świt po nocy ${n + 1}`, { size: 12, ox: 0.5, color: '#d8dcf0' });
    const line = DIARY[s][n % DIARY[s].length];
    const paper = this.add.rectangle(W / 2, 130, 312, 104, 0xf6ead0, 0.95).setStrokeStyle(1, 0xe88a3a, 0.8).setRounded(12).setAlpha(0);
    const head = txt(this, W / 2, 90, 'z dziennika', { size: 10, ox: 0.5, color: '#8a3a56', style: '800' }).setAlpha(0);
    const body = txt(this, W / 2, 106, line, { size: 16, ox: 0.5, font: SERIF, style: 'normal', color: '#3a2a2e', wrap: 284, align: 'center', ls: 2 }).setAlpha(0);
    paper.setSize(312, body.height + 46).setY(84 + (body.height + 46) / 2);
    this.tweens.add({ targets: [paper, head, body], alpha: 1, duration: 900, delay: 700 });

    const ph = moonPhase(), first = nightNo() === 0;
    const next = (first ? `Zaczyna się ${SEASONS[season()].toLowerCase()}` + (year() ? `, rok ${year() + 1}` : '') : `${SEASONS[season()]} · przed Tobą noc ${nightNo() + 1} z ${NIGHTS_PER_SEASON}`) + `\nKsiężyc: ${ph ? ph.name.toLowerCase() : 'nów'}`;
    const info = txt(this, W / 2, 232, next, { size: 12, ox: 0.5, align: 'center', color: '#2a2440', style: '800' }).setAlpha(0);
    this.tweens.add({ targets: info, alpha: 1, duration: 800, delay: 2200 });
    this.time.delayedCall(1600, () => button(this, W / 2, H - 30, 200, 40, 'Kolejna noc', () => {
      this.cameras.main.fadeOut(450, 7, 8, 31);
      this.time.delayedCall(470, () => this.scene.start('Night'));
    }, { fill: 0x8a3a56, stroke: 0xe88a9a, size: 15 }));
  }
}
