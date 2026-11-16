// Taras, domy i niebo. Wszystko siedzi w kontenerze o skali 2 (współrzędne grafiki 180x236).
import Phaser from '../lib/phaser.esm.min.js';
import { NEIGHBORS, HOUSES, EVENTS } from './data.js';
import { S, darkness, lightsOff, nightNo, season, guests, eventTonight, eclipseNow, isFullMoon } from './state.js';
import { rng } from './art.js';

const ADD = Phaser.BlendModes.ADD;
export const skyPos = id => { const r = rng('pos' + id); return { x: 26 + r() * 128, y: 22 + r() * 66 }; };

export class World {
  constructor(scene, handlers = {}) {
    this.s = scene; this.h = handlers;
    const c = this.c = scene.add.container(0, 0).setScale(2);
    const img = (x, y, key) => { const i = scene.add.image(x, y, key).setOrigin(0); c.add(i); return i; };
    const rect = (x, y, w, h, col, a = 1) => { const r = scene.add.rectangle(x, y, w, h, col, a).setOrigin(0); c.add(r); return r; };
    const glow = (x, y, sc, col, a) => { const g = scene.add.image(x, y, 'glow').setScale(sc).setTint(col).setAlpha(a).setBlendMode(ADD); c.add(g); return g; };

    img(0, 0, 'sky');
    this.milky = img(0, 0, 'milky');
    this.st = [img(0, 0, 'stars1'), img(0, 0, 'stars2'), img(0, 0, 'stars3')];
    scene.tweens.add({ targets: this.st[0], alpha: 0.75, duration: 1700, yoyo: true, repeat: -1 });
    this.moon = img(146, 34, 'moonph3');
    this.comet = img(46, 34, 'comet_sky').setVisible(false).setOrigin(0.12, 0.75);
    this.target = scene.add.image(0, 0, 'obj_moon').setScale(0.5).setVisible(false); c.add(this.target);
    this.targetRing = scene.add.rectangle(0, 0, 28, 28).setStrokeStyle(1, 0xffc65a, 0.7).setVisible(false); c.add(this.targetRing);
    this.poll = img(0, 0, 'pollution');
    this.clouds = [];
    for (let i = 0; i < 6; i++) this.clouds.push(img(-80, 10 + i * 17, 'cloud').setAlpha(0));
    img(0, 88, 'houses');

    // światła sąsiadów i zwykłe okna
    this.lights = {}; this.anon = [];
    HOUSES.forEach((h, i) => {
      const parts = [];
      const base = 150;
      if (h.nb === 'lady') parts.push(rect(h.x + 5, base - 11, 2, 2, 0xffe9a8), glow(h.x + 6, base - 10, 1.1, 0xffc65a, 0.8));
      if (h.nb === 'kid') parts.push(rect(h.x + 15, base - 27, 5, 5, 0xffc65a), rect(h.x + 17, base - 27, 1, 5, 0x0d1330), glow(h.x + 17, base - 25, 0.9, 0xffc65a, 0.6));
      if (h.nb === 'gardener') parts.push(rect(h.x + 32, base - 21, 3, 2, 0xffffff), glow(h.x + 31, base - 14, 1.6, 0xe8f0ff, 0.75));
      if (h.nb === 'student') parts.push(rect(h.x + 11, base - h.h - 7, 4, 4, 0xe8f0ff), glow(h.x + 13, base - h.h - 5, 0.9, 0xbcd0ff, 0.7));
      if (h.nb === 'couple') for (let x = 2; x < 34; x += 4) parts.push(rect(h.x + x, base - 5 + (x % 8 ? 0 : 1), 1, 1, [0xffc65a, 0xe88a9a, 0x8fb8ff, 0xffe9a8][(x / 4) % 4]), ...(x % 8 ? [] : [glow(h.x + x, base - 5, 0.4, 0xffc65a, 0.5)]));
      this.lights[h.nb] = parts;
      this.anon.push(rect(h.x + 5, base - 15, 4, 5, 0xc8903a, 0.85));
      if (i % 2) this.anon.push(rect(h.x + h.w - 9, base - h.h + 5, 3, 4, 0xa8783a, 0.7));
    });

    img(0, 146, 'terrace');
    this.lampGlow = scene.add.image(90, 150, 'glow').setScale(7, 3.2).setTint(0xffc65a).setAlpha(0.2).setBlendMode(ADD); c.add(this.lampGlow);
    this.garland = img(0, 108, 'garland_on');
    this.gifts = [img(8, 194, 'gift0'), img(165, 176, 'gift1'), img(26, 214, 'gift2'), img(170, 122, 'gift3')];
    this.giftGlow = glow(12, 200, 0.8, 0xffc65a, 0.5);
    this.guys = {};
    NEIGHBORS.forEach((n, i) => { this.guys[n.id] = img([116, 128, 138, 150, 160][i], 164, 'guy_' + n.id); });
    this.jar = img(148, 136, 'jar0');
    this.jarGlow = glow(152, 141, 0.7, 0xffe9a8, 0.7).setVisible(false);
    scene.tweens.add({ targets: this.jarGlow, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    this.tea = img(90, 196, 'tea');
    this.hero = scene.add.image(77, 212, 'hero').setOrigin(0.5, 1); c.add(this.hero);
    scene.tweens.add({ targets: this.hero, scaleY: 1.03, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    img(104, 187, 'tripod');
    this.tube = scene.add.image(111, 188, 'tube').setOrigin(0.3, 0.5).setRotation(-0.7); c.add(this.tube);
    this.dog = img(30, 205, 'dog0');
    this.cat = scene.add.image(140, 222, 'cat0').setOrigin(0.5, 1); c.add(this.cat);
    this.catWalk();
    this.fx = scene.add.container(0, 0); c.add(this.fx);

    // strefy dotyku (współrzędne grafiki; kontener je skaluje)
    const zone = (x, y, w, h, cb) => { const z = scene.add.rectangle(x, y, w, h, 0, 0).setOrigin(0).setInteractive(); z.on('pointerdown', () => cb && cb()); c.add(z); return z; };
    zone(0, 108, 180, 26, () => this.h.lamps && this.h.lamps());
    zone(138, 128, 28, 26, () => this.h.jar && this.h.jar());
    zone(24, 196, 36, 26, () => this.h.dog && this.h.dog());
    zone(84, 190, 22, 26, () => this.h.tea && this.h.tea());
    this.refresh();
  }

  refresh(block) {
    const d = darkness(block), raw = 1 + lightsOff();
    this.st[1].setAlpha(Math.max(0.08, Math.min(1, (d - 1) / 2)));
    this.st[2].setAlpha(Math.max(0, Math.min(1, (d - 3) / 2.5)));
    this.milky.setAlpha(season() === 3 ? Math.max(0, Math.min(0.9, (d - 2) / 4)) : Math.max(0, (d - 4) / 8));
    this.poll.setAlpha(Math.max(0.06, 1 - (raw - 1) / 5.2) * (S.lamps ? 1 : 0.85));
    for (const n of NEIGHBORS) for (const p of this.lights[n.id]) p.setVisible(!S.nb[n.id].off);
    const late = S.cur ? S.cur.b : 0;
    this.anon.forEach((w, i) => w.setVisible(i >= lightsOff() && late < 3 + i));
    this.garland.setTexture(S.lamps ? 'garland_on' : 'garland_off');
    this.lampGlow.setVisible(S.lamps);
    const ph = nightNo();
    this.moon.setTexture('moonph' + ph).setVisible(ph > 0 && ph < 6);
    this.moon.setTint(eclipseNow(block ?? (S.cur ? S.cur.b : 0)) ? 0xc8603a : 0xffffff);
    this.comet.setVisible(eventTonight('comet')).setScale(0.35 + raw * 0.13, 0.6 + raw * 0.07);
    S.gifts.forEach((g, i) => this.gifts[i].setVisible(g)); this.giftGlow.setVisible(S.gifts[0]);
    const party = eventTonight('perseids') || eventTonight('comet');
    const gs = guests();
    for (const n of NEIGHBORS) this.guys[n.id].setVisible(party ? S.nb[n.id].met : (S.lamps && gs.includes(n.id) && (S.night + NEIGHBORS.indexOf(n)) % 2 === 0));
    this.jar.setTexture(S.inbox.length ? 'jar1' : 'jar0'); this.jarGlow.setVisible(S.inbox.length > 0);
    if (S.feats.comet) { this.cat.setTexture('cat2').setPosition(52, 215).setFlipX(false); this.s.tweens.killTweensOf(this.cat); this.catAway = false; this.cat.setVisible(true); }
  }

  setTarget(id, quiet) {
    if (!id || id === 'rest') { this.target.setVisible(false); this.targetRing.setVisible(false); return; }
    const p = id === 'comet' ? { x: 52, y: 44 } : id === 'eclipse' ? { x: 151, y: 39 } : skyPos(id);
    this.target.setTexture('obj_' + id).setPosition(p.x, p.y).setVisible(id !== 'comet' && id !== 'eclipse').setAlpha(0.9);
    this.targetRing.setPosition(p.x, p.y).setVisible(true);
    const ang = Math.atan2(p.y - 188, p.x - 111);
    if (this.tp !== id) {
      this.tp = id;
      this.s.tweens.add({ targets: this.tube, rotation: ang, duration: quiet ? 1 : 700, ease: 'Sine.easeInOut' });
      if (!quiet) this.dogUp();
    }
    this.tpos = p;
  }
  dogUp() { this.dog.setTexture('dog1'); this.s.time.delayedCall(1400, () => this.dog.setTexture('dog0')); }

  // Animacja bloku: światło spływa do teleskopu albo chmury przechodzą po niebie.
  blockFx(kind, act, done) {
    const s = this.s, dur = 2400;
    if (act !== 'clear') {
      const n = act === 'cloud' ? 6 : 3, a = act === 'cloud' ? 0.92 : 0.45;
      this.clouds.slice(0, n).forEach((cl, i) => { cl.setPosition(-70 - i * 22, 6 + ((i * 37) % 80)).setAlpha(a); s.tweens.add({ targets: cl, x: 200 + i * 6, duration: dur + 1400 + i * 300, onComplete: () => cl.setAlpha(0) }); });
    }
    if (kind === 'ok' || kind === 'event') {
      const p = this.tpos || { x: 90, y: 50 };
      for (let i = 0; i < 16; i++) s.time.delayedCall(i * 120, () => {
        const m = s.add.image(p.x + (Math.random() - 0.5) * 12, p.y + (Math.random() - 0.5) * 12, 'mote').setTint(0xffe9a8).setBlendMode(ADD);
        this.fx.add(m);
        s.tweens.add({ targets: m, x: 116, y: 184, duration: 650, ease: 'Quad.easeIn', onComplete: () => m.destroy() });
      });
      s.tweens.add({ targets: this.targetRing, scale: 1.4, alpha: 0.2, duration: 400, yoyo: true, repeat: 2, onComplete: () => this.targetRing.setScale(1).setAlpha(1) });
    } else if (kind === 'rest') {
      for (let i = 0; i < 5; i++) s.time.delayedCall(i * 350, () => { const m = s.add.image(96 + Math.random() * 3, 198, 'mote').setAlpha(0.6); this.fx.add(m); s.tweens.add({ targets: m, y: 184, alpha: 0, duration: 900, onComplete: () => m.destroy() }); });
    }
    s.time.delayedCall(dur, done);
  }

  catWalk() {
    if (S.feats.comet) return;
    const s = this.s; this.catAway = false;
    s.tweens.killTweensOf(this.cat);
    this.cat.setVisible(true).setY(222);
    if (this.catFrame) this.catFrame.remove();
    this.catFrame = s.time.addEvent({ delay: 220, loop: true, callback: () => { if (this.catMoving) this.cat.setTexture(this.cat.texture.key === 'cat0' ? 'cat1' : 'cat0'); } });
    const step = () => {
      if (this.catAway || S.feats.comet) return;
      const nx = 112 + Math.random() * 54;
      this.cat.setFlipX(nx > this.cat.x); this.catMoving = true;
      s.tweens.add({ targets: this.cat, x: nx, duration: Math.abs(nx - this.cat.x) * 70 + 200, onComplete: () => { this.catMoving = false; this.cat.setTexture('cat2'); s.time.delayedCall(1500 + Math.random() * 3000, () => { if (!this.catAway) { this.cat.setTexture('cat0'); step(); } }); } });
    };
    step();
  }
  // Kot znika za płotem; wraca przy catBack.
  catGo() {
    if (S.feats.comet || this.catAway) return;
    this.catAway = true; this.catMoving = true;
    const s = this.s; s.tweens.killTweensOf(this.cat);
    this.cat.setTexture('cat0').setFlipX(true);
    s.tweens.add({ targets: this.cat, x: 190, duration: 1500, onComplete: () => this.cat.setVisible(false) });
  }
  catBack(cb) {
    if (S.feats.comet) { cb && cb(); return; }
    const s = this.s; s.tweens.killTweensOf(this.cat);
    this.cat.setVisible(true).setTexture('cat0').setFlipX(false).setX(190); this.catMoving = true;
    s.tweens.add({ targets: this.cat, x: 152, duration: 1100, onComplete: () => { this.catMoving = false; cb && cb(); this.catWalk(); } });
  }
}
