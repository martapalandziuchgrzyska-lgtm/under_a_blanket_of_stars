// Pomocnicze elementy interfejsu. Współrzędne logiczne: 360x640 (kamera ma zoom 2, grafika pixel-art skalę 2).
export const W = 360, H = 640;
// Nunito: zaokrąglony font interfejsu; Patrick Hand: odręczne liściki. Oba ładuje index.html (Google Fonts).
export const FONT = 'Nunito, Verdana, Geneva, sans-serif';
export const SERIF = '"Patrick Hand", Georgia, serif';

export function setupCam(scene) { scene.cameras.main.setZoom(2).centerOn(W / 2, H / 2); }

export function txt(scene, x, y, str, o = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: o.font || FONT, fontSize: (o.size || 12) + 'px', color: o.color || '#f6ead0', align: o.align || 'left',
    fontStyle: o.style || '600', lineSpacing: o.ls ?? 3, wordWrap: o.wrap ? { width: o.wrap } : undefined,
  });
  t.setResolution(2).setOrigin(o.ox ?? 0, o.oy ?? 0);
  return t;
}

export function button(scene, x, y, w, h, label, cb, o = {}) {
  const fill = o.fill ?? 0x2a3a6e, c = scene.add.container(x, y);
  const r = scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(1, o.stroke ?? 0x8fb8ff, 0.8).setRounded(Math.min(10, h / 2));
  const t = txt(scene, 0, 0, label, { size: o.size || 13, ox: 0.5, oy: 0.5, color: o.color || '#f6ead0', align: 'center' });
  c.add([r, t]);
  let enabled = true;
  r.setInteractive({ useHandCursor: true });
  r.on('pointerdown', () => { if (!enabled) return; scene.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true }); cb(); });
  return {
    c, r, t,
    setLabel(s) { t.setText(s); return this; },
    setEnabled(v) { enabled = v; c.setAlpha(v ? 1 : 0.4); return this; },
    setFill(f) { r.setFillStyle(f); return this; },
  };
}

// Półprzezroczysta zasłona blokująca dotyk pod spodem + kontener na treść okienka.
export function overlay(scene, depth = 100, alpha = 0.72) {
  const c = scene.add.container(0, 0).setDepth(depth);
  const bg = scene.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x070a18, alpha).setInteractive();
  c.add(bg);
  return c;
}
export function panel(scene, x, y, w, h, fill = 0x121a3a, stroke = 0x8fb8ff) {
  return scene.add.rectangle(x, y, w, h, fill).setStrokeStyle(1, stroke, 0.7).setRounded(12);
}

// Okienko z tekstem i przyciskami: [{label, cb}]
export function dialog(scene, title, body, buttons, o = {}) {
  const c = overlay(scene, o.depth ?? 200);
  const w = 300, tb = txt(scene, W / 2, 0, body, { wrap: w - 36, ox: 0.5, font: o.serif ? SERIF : FONT, size: o.serif ? 15 : 12, style: o.serif ? 'normal' : '', color: o.serif ? '#3a2a2e' : '#f6ead0', ls: 4 });
  const h = tb.height + 96 + (title ? 0 : -20), y0 = H / 2 - h / 2;
  c.add(panel(scene, W / 2, H / 2, w, h, o.serif ? 0xf6ead0 : 0x121a3a, o.serif ? 0xe88a3a : 0x8fb8ff));
  if (title) c.add(txt(scene, W / 2, y0 + 14, title, { size: 15, ox: 0.5, color: o.serif ? '#8a3a56' : '#ffc65a', style: '800' }));
  tb.setY(y0 + (title ? 40 : 20)); c.add(tb);
  const bw = buttons.length > 1 ? 130 : 160;
  buttons.forEach((b, i) => {
    const bx = W / 2 + (i - (buttons.length - 1) / 2) * (bw + 10);
    c.add(button(scene, bx, y0 + h - 28, bw, 32, b.label, () => { c.destroy(); b.cb && b.cb(); }, { fill: i === 0 ? 0x8a3a56 : 0x2a3a6e, stroke: i === 0 ? 0xe88a9a : 0x8fb8ff }).c);
  });
  return c;
}

export function toast(scene, str, y = 300) {
  // kolejne komunikaty układają się jeden pod drugim, zamiast na siebie nachodzić
  const live = (scene._toasts ||= []);
  if (live.length) y = Math.max(y, live[live.length - 1] + 6);
  const t = txt(scene, W / 2, y, str, { size: 12, ox: 0.5, oy: 0.5, color: '#ffe9a8', align: 'center', wrap: 300 }).setDepth(500);
  y += t.height / 2 + 6; t.setY(y);
  const bottom = y + t.height / 2 + 6;
  live.push(bottom);
  const bg = scene.add.rectangle(W / 2, y, t.width + 20, t.height + 12, 0x070a18, 0.88).setStrokeStyle(1, 0xffc65a, 0.8).setRounded(8).setDepth(499);
  scene.tweens.add({ targets: [t, bg], alpha: 0, delay: 2600, duration: 600, onComplete: () => { t.destroy(); bg.destroy(); live.splice(live.indexOf(bottom), 1); } });
}

// Suwak: zwraca obiekt z polem v (0..1)
export function slider(scene, x, y, w, label, onChange, v0 = 0.5) {
  const s = { v: v0 };
  if (label) txt(scene, x, y - 22, label, { size: 11, color: '#aab4d0' });
  scene.add.rectangle(x + w / 2, y, w, 6, 0x2a3a6e).setStrokeStyle(1, 0x8fb8ff, 0.5).setRounded(3);
  const knob = scene.add.rectangle(x + w * v0, y, 16, 24, 0xffc65a).setStrokeStyle(1, 0xffffff, 0.8).setRounded(7);
  const zone = scene.add.rectangle(x + w / 2, y, w + 30, 40, 0, 0).setInteractive({ useHandCursor: true });
  const set = p => { s.v = Math.max(0, Math.min(1, (p.worldX - x) / w)); knob.x = x + w * s.v; onChange(s.v); };
  let down = false;
  zone.on('pointerdown', p => { down = true; set(p); });
  scene.input.on('pointermove', p => { if (down && p.isDown) set(p); });
  scene.input.on('pointerup', () => { down = false; });
  return s;
}
