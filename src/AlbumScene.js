// Album: strony na pory roku + wyczyny. Nowe zdjęcie gracz sam przeciąga na jego miejsce.
import Phaser from '../lib/phaser.esm.min.js';
import { OBJ, SEASONS, TYPES, FEATS, GIFTS, CONS, seasonObjects } from './data.js';
import { fitPoints } from './ConsScene.js';
import { sfx } from './audio.js';
import { S, ost, paste, season, conUnlocked } from './state.js';
import { W, H, setupCam, txt, button, toast, dialog, overlay, panel } from './ui.js';

const COLS = 4, CW = 84, CH = 106, X0 = 54, Y0 = 130;

export class AlbumScene extends Phaser.Scene {
  constructor() { super('Album'); }
  init(d) { this.pasteId = d.paste || null; this.page = this.pasteId ? OBJ[this.pasteId].s : (d.page ?? season()); }

  create() {
    setupCam(this);
    this._toasts = [];
    this.add.rectangle(W / 2, H / 2, W, H, 0x2e2028);
    this.add.rectangle(W / 2, H / 2 + 14, W - 12, H - 76, 0xf6ead0).setStrokeStyle(2, 0x8a6450);
    for (let y = 80; y < H - 40; y += 34) this.add.circle(14, y, 3, 0x2e2028);
    ['Jesień', 'Zima', 'Wiosna', 'Lato', '★', 'Mapa'].forEach((n, i) => {
      const on = i === this.page;
      const b = button(this, 33 + i * 59, 24, 55, 30, n, () => { if (!this.pasteId && i !== this.page) this.scene.restart({ page: i }); }, { fill: on ? 0xf6ead0 : 0x4a3238, stroke: 0x8a6450, color: on ? '#2e2028' : '#f6ead0', size: 12 });
      if (this.pasteId && !on) b.c.setAlpha(0.4);
    });
    this.info = txt(this, W / 2, 522, '', { size: 10, ox: 0.5, color: '#4a3238', align: 'center', wrap: 320 });
    this.slotPos = {};
    if (this.page < 4) this.photoPage(); else if (this.page === 4) this.featPage(); else this.consPage();
    if (this.pasteId) this.startPaste();
    else button(this, W / 2, H - 30, 180, 36, 'Wróć na taras', () => this.scene.start('Night'), { fill: 0x8a3a56, stroke: 0xe88a9a });
  }

  cell(k) { return { x: X0 + (k % COLS) * CW, y: Y0 + Math.floor(k / COLS) * CH }; }

  photoPage() {
    const objs = seasonObjects(this.page);
    const have = objs.filter(o => ost(o.id).album && ost(o.id).album.pasted).length;
    txt(this, W / 2, 56, `${SEASONS[this.page]} · ${have}/${objs.length}` + (S.gifts[this.page] ? ` · prezent: ${GIFTS[this.page]}` : ''), { size: 12, ox: 0.5, color: '#4a3238', style: 'bold' });
    objs.forEach((o, k) => {
      // 10 obiektów: 4 kolumny, ostatni rząd (2 sztuki) wyśrodkowany
      const p = this.cell(k); if (k >= 8) p.x += CW;
      this.slotPos[o.id] = p;
      const a = ost(o.id).album;
      if (a && a.pasted && o.id !== this.pasteId) this.sticker(o, p.x, p.y, a);
      else {
        this.add.rectangle(p.x, p.y, 74, 74, 0xe0d2b4).setStrokeStyle(1, 0xb8a888);
        this.add.image(p.x, p.y, 'obj_' + o.id).setScale(1.5).setTint(0x000000).setAlpha(0.13);
        txt(this, p.x, p.y + 40, o.lvl > 1 ? `poziom ${o.lvl}` : '?', { size: 9, ox: 0.5, color: '#a89878' });
      }
    });
    this.info.setText(this.pasteId ? '' : 'Stuknij zdjęcie, żeby przeczytać ciekawostkę.');
  }

  sticker(o, x, y, a, interactive = true) {
    const c = this.add.container(x, y);
    const fr = this.add.rectangle(0, 0, 80, 80, a.gold ? 0xffc65a : 0xffffff).setStrokeStyle(1, a.gold ? 0xc8902a : 0xb8a888);
    c.add([fr, this.add.rectangle(0, 0, 72, 72, 0x05060f), this.add.image(0, 0, 'obj_' + o.id).setScale(1.5)]);
    c.add(txt(this, 0, 29, '★'.repeat(a.stars), { size: 8, ox: 0.5, oy: 0.5, color: '#ffc65a' }));
    c.add(txt(this, 0, 41, o.short, { size: 8, ox: 0.5, color: '#4a3238' }));
    c.setRotation(((o.id.charCodeAt(0) + o.id.length) % 7 - 3) * 0.012);
    if (interactive) { fr.setInteractive(); fr.on('pointerdown', () => this.card(o, a)); }
    return c;
  }

  // Gwiazdozbiory: połączone mają linie, pozostałe to same kropki
  consPage() {
    txt(this, W / 2, 56, `Gwiazdozbiory · ${CONS.filter(c => S.cons[c.id]).length}/${CONS.length}`, { size: 12, ox: 0.5, color: '#4a3238', style: '800' });
    CONS.forEach((con, k) => {
      const p = this.cell(k), got = !!S.cons[con.id], open = !got && conUnlocked(con), pts = fitPoints(con.pts, 70, 0.12);
      const bg = this.add.rectangle(p.x, p.y, 74, 74, got ? 0x12163c : open ? 0x1e2456 : 0x2e3358).setStrokeStyle(open ? 2 : 1, got || open ? 0xffc65a : 0xb8a888).setRounded(8);
      if (open) { bg.setInteractive({ useHandCursor: true }); bg.on('pointerdown', () => this.scene.start('Cons', { id: con.id })); this.tweens.add({ targets: bg, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 }); }
      else if (!got) { bg.setInteractive(); bg.on('pointerdown', () => this.info.setText(`${con.name}: sfotografuj coś z tego gwiazdozbioru,\nnp. ${con.members.map(id => OBJ[id].short).join(', ')}.`)); }
      const g = this.add.graphics();
      if (got) { g.lineStyle(1.5, 0xffe9a8, 0.95); for (const [a, b] of con.edges) g.lineBetween(p.x - 35 + pts[a][0], p.y - 35 + pts[a][1], p.x - 35 + pts[b][0], p.y - 35 + pts[b][1]); }
      g.fillStyle(0xffffff, got ? 1 : 0.6);
      for (const [x, y] of pts) g.fillCircle(p.x - 35 + x, p.y - 35 + y, got ? 2 : 1.5);
      txt(this, p.x, p.y + 40, open ? con.name + ' ✎' : con.name, { size: 8, ox: 0.5, color: got || open ? '#4a3238' : '#a89878' });
    });
    this.info.setText('Zdjęcie obiektu z gwiazdozbioru odblokowuje jego wzór.\nŚwiecące pola stuknij i połącz gwiazdy palcem.');
  }

  // Karta zdjęcia: duży kadr, notatka i ciekawostka
  card(o, a) {
    if (this.pasteId) return;
    const ov = overlay(this, 300, 0.86);
    const body = txt(this, W / 2, 0, `${o.note}\n\n${o.fact}`, { size: 12, wrap: 268, ox: 0.5, ls: 4 });
    const h = body.height + 262, y0 = H / 2 - h / 2;
    ov.add(panel(this, W / 2, H / 2, 304, h));
    ov.add(txt(this, W / 2, y0 + 14, o.name, { size: 14, ox: 0.5, color: '#ffc65a', style: '800', wrap: 280, align: 'center' }));
    ov.add(this.add.rectangle(W / 2, y0 + 118, 136, 136, a.gold ? 0xffc65a : 0xf6ead0).setRounded(6));
    ov.add(this.add.rectangle(W / 2, y0 + 118, 126, 126, 0x05060f));
    ov.add(this.add.image(W / 2, y0 + 118, 'obj_' + o.id).setScale(2.5));
    ov.add(txt(this, W / 2, y0 + 192, `${'★'.repeat(a.stars)}${'☆'.repeat(3 - a.stars)}  ·  ${TYPES[o.type].label}  ·  poziom ${o.lvl}`, { size: 11, ox: 0.5, color: '#aab4d0' }));
    body.setY(y0 + 212); ov.add(body);
    ov.add(button(this, W / 2, y0 + h - 24, 140, 30, 'Zamknij', () => ov.destroy()).c);
  }

  featPage() {
    const have = FEATS.filter(f => S.feats[f.id]).length;
    txt(this, W / 2, 56, `Wyczyny i wydarzenia · ${have}/${FEATS.length}`, { size: 12, ox: 0.5, color: '#4a3238', style: 'bold' });
    FEATS.forEach((f, k) => {
      const p = this.cell(k), got = S.feats[f.id];
      const r = this.add.circle(p.x, p.y, 32, got ? Phaser.Display.Color.HexStringToColor(f.color).color : 0xe0d2b4).setStrokeStyle(got ? 3 : 1, got ? 0xffffff : 0xb8a888);
      txt(this, p.x, p.y, got ? f.sym : '?', { size: got ? 20 : 18, ox: 0.5, oy: 0.5, color: got ? '#ffffff' : '#b8a888', style: 'bold' });
      txt(this, p.x, p.y + 38, f.name, { size: 8, ox: 0.5, color: got ? '#4a3238' : '#a89878' });
      r.setInteractive(); r.on('pointerdown', () => this.info.setText(`${f.name}\n${f.hint}`));
    });
  }

  startPaste() {
    const o = OBJ[this.pasteId], a = ost(o.id).album, p = this.slotPos[o.id];
    const hl = this.add.rectangle(p.x, p.y, 82, 82).setStrokeStyle(2, 0xe88a3a);
    this.tweens.add({ targets: hl, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    this.info.setText('Przeciągnij naklejkę na jej miejsce w albumie.');
    const home = { x: W / 2, y: 452 };
    const tray = this.add.rectangle(home.x, home.y, W - 12, 104, 0x2e2028, 0.92).setDepth(9);
    const st = this.sticker(o, home.x, home.y, a, false).setDepth(10);
    st.setSize(80, 80).setInteractive({ draggable: true });
    this.input.on('drag', (ptr, obj, x, y) => obj.setPosition(x, y));
    this.input.on('dragend', (ptr, obj) => {
      if (Math.hypot(obj.x - p.x, obj.y - p.y) < 50) {
        obj.disableInteractive(); hl.destroy(); tray.destroy();
        this.tweens.add({ targets: obj, x: p.x, y: p.y, duration: 150, onComplete: () => this.cameras.main.shake(80, 0.004) });
        const gift = paste(o.id); sfx('stick');
        this.info.setText('Wklejone!');
        while (S.toasts.length) toast(this, S.toasts.shift(), 300 - S.toasts.length * 40);
        const back = () => button(this, W / 2, H - 30, 180, 36, 'Wróć na taras', () => this.scene.start('Night'), { fill: 0x8a3a56, stroke: 0xe88a9a }).c.setDepth(20);
        if (gift !== null) this.time.delayedCall(600, () => dialog(this, 'Strona zapełniona!', `Cała ${SEASONS[gift].toLowerCase()} w albumie.\n\nRano na progu czeka prezent od sąsiadów: ${GIFTS[gift]}. Stanie na tarasie.`, [{ label: 'Jak miło', cb: back }]));
        else back();
      } else this.tweens.add({ targets: obj, x: home.x, y: home.y, duration: 200 });
    });
  }
}
