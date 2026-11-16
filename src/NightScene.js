// Główna scena: taras nocą, plan 8 bloków, prognoza, liściki.
import Phaser from '../lib/phaser.esm.min.js';
import { OBJ, OBJECTS, NB, NEIGHBORS, TYPES, SEASONS, seasonObjects, BLOCKS, NIGHTS_PER_SEASON } from './data.js';
import {
  S, save, startNight, season, nightNo, year, ost, darkness, lightsOff, shownForecast, blocked, maxP, runBlock, perfectNight, endNight,
  deliverMail, canSend, sendPhoto, feat, eventTonight, eclipseNow, isFullMoon, unpasted,
} from './state.js';
import { World } from './world.js';
import { W, H, setupCam, txt, button, overlay, panel, dialog, toast } from './ui.js';

const PY = 472;
const FORE_NAME = { clear: 'czysto', maybe: 'może być chmura', likely: 'raczej chmury' };
const REST_LINES = ['Herbata, koc i cisza. Też dobry blok.', 'Pies wzdycha przez sen. Nic nie trzeba.', 'Przeglądasz album przy czerwonej latarce.', 'Para z kubka leci prosto w gwiazdy.'];
const SEASON_INTRO = [
  'Jesień. Dopiero się wprowadziłaś i nikogo tu nie znasz. Okolica świeci jak choinka, więc widać tylko najjaśniejsze obiekty. Ale kot już poszedł na zwiady.',
  'Zima. Długie noce, tylko zimno: kokon z koca wytrzymuje 6 bloków. Herbata i pies dodają po jednym.',
  'Wiosna. Sezon galaktyk. Na ulicy mówią, że pod koniec lata ma przylecieć kometa.',
  'Lato. Noce są krótkie: pierwszy i ostatni blok to jasny zmierzch. Za to nad tarasem stoi Droga Mleczna.',
];

export class NightScene extends Phaser.Scene {
  constructor() { super('Night'); }

  create() {
    setupCam(this);
    this._toasts = [];
    if (unpasted().length) { this.scene.start('Album', { paste: unpasted()[0] }); return; }
    if (!S.cur) startNight();
    this.busy = false; this.iss = false;
    this.world = new World(this, { pick: id => this.pickSky(id), lamps: () => this.toggleLamps(), jar: () => this.readMail(), dog: () => this.warm('dog'), tea: () => this.warm('tea') });

    this.hudL = txt(this, 8, 6, '', { size: 12, color: '#ffe9a8' });
    this.hudR = txt(this, W - 8, 6, '', { size: 11, ox: 1, color: '#aab4d0', align: 'right' });
    this.add.rectangle(W / 2, (PY + H) / 2, W, H - PY, 0x0b1026);
    this.add.rectangle(W / 2, PY, W, 2, 0x4a3238);

    this.slots = [];
    for (let i = 0; i < BLOCKS; i++) {
      const x = 24 + i * 44.5;
      const fore = this.add.image(x, PY + 18, 'w_clear').setScale(2);
      const r = this.add.rectangle(x, PY + 58, 41, 44, 0x121a3a).setStrokeStyle(1, 0x2a3a6e).setInteractive();
      const icon = this.add.image(x, PY + 55, 'ic_tea').setScale(0.75);
      const lab = txt(this, x, PY + 73, '', { size: 9, ox: 0.5, oy: 0.5, color: '#aab4d0' });
      const mark = txt(this, x + 13, PY + 42, '', { size: 10, ox: 0.5, oy: 0.5 });
      r.on('pointerdown', () => this.tapSlot(i));
      this.slots.push({ fore, r, icon, lab, mark });
    }
    this.info = txt(this, 10, PY + 86, '', { size: 11, wrap: W - 20, color: '#d8dcf0' });
    this.bAlbum = button(this, 48, H - 24, 80, 34, 'Album', () => !this.busy && this.scene.start('Album', {}));
    this.bMail = button(this, 134, H - 24, 80, 34, 'Liściki', () => !this.busy && this.openRequests());
    this.bGo = button(this, 268, H - 24, 172, 34, 'Zacznij blok', () => this.go(), { fill: 0x8a3a56, stroke: 0xe88a9a, size: 14 });
    this.mailDot = this.add.circle(170, H - 38, 4, 0xffc65a).setVisible(false);

    this.render();
    this.world.setTarget(S.cur.plan[S.cur.b], true);
    if (!S.cur.mail && S.cur.b === this.mailAt() - 1 && S.cur.b > 0) this.world.catGo();

    if (!S.intro) this.intro();
    else if (nightNo() === 0 && S.banner !== S.night) this.seasonBanner();
    else this.afterBanner();
  }

  mailAt() { return S.night === 0 ? 1 : 2; }

  intro() {
    dialog(this, 'Under a Blanket of Stars', 'Nowy dom, nowa okolica, nikogo znajomego. Za to jest taras z desek, girlanda lampek, teleskop, kot i pies.\n\nZawijasz się w koc jak w kokon i patrzysz w górę.', [{
      label: 'Dalej', cb: () => dialog(this, 'Jak grać', 'Noc ma 8 bloków. Stuknij blok i wybierz, na co patrzy teleskop. Ikonki nad blokami to prognoza: dwa najbliższe bloki są już pewne, dalsze to zgadywanka.\n\nGotowy kadr wywołujesz w osobnym bloku, najlepiej gdy są chmury.\n\nNic nie przepada. Zebrane światło zostaje na kolejne noce, a plan możesz zmieniać, kiedy chcesz.', [{ label: 'Zaczynam', cb: () => { S.intro = true; S.banner = S.night; save(); this.afterBanner(); } }]),
    }]);
  }
  seasonBanner() {
    S.banner = S.night; save();
    dialog(this, SEASONS[season()] + (year() ? ` · rok ${year() + 1}` : ''), SEASON_INTRO[season()], [{ label: 'Dobrze', cb: () => this.afterBanner() }]);
  }
  afterBanner() {
    this.flushToasts();
    const c = S.cur;
    if ((eventTonight('geminids') || eventTonight('perseids')) && c.meteors === undefined) return this.meteorNight();
    if (c.done) return this.nightEnd();
    if (c.b === 0) {
      let m = 'Stuknij blok, żeby wybrać cel dla teleskopu.';
      if (eventTonight('comet')) m = 'To dziś. Kometa wisi nad dachami, a na taras przyszli wszyscy.';
      else if (eventTonight('eclipse')) m = 'Pełnia, ale w blokach 4 i 5 Księżyc wejdzie w cień Ziemi: zrobi się ciemno jak nigdy.';
      else if (isFullMoon()) m = 'Pełnia. Niebo jest dziś jaśniejsze o 1.';
      else if (S.night > 0) m = ['Cicha noc. Co dziś trafi do albumu?', 'Deski tarasu jeszcze ciepłe od dnia.', 'Gdzieś szczeka pies. Twój tylko strzyże uchem.'][S.night % 3];
      this.say(m);
    }
    if (c.b > 0) this.mail();
    if (c.b === 2) this.maybeISS();
  }

  say(s) { this.info.setText(s); }
  flushToasts() { let i = 0; while (S.toasts.length) { const t = S.toasts.shift(); this.time.delayedCall(i++ * 900, () => toast(this, t, 130)); } save(); }

  render() {
    const c = S.cur;
    this.hudL.setText(`${SEASONS[season()]} · noc ${nightNo() + 1}/${NIGHTS_PER_SEASON}`);
    const d = darkness(Math.min(c.b, BLOCKS - 1));
    this.hudR.setText(`ciemność ${'●'.repeat(Math.min(6, d))}${'○'.repeat(Math.max(0, 6 - d))}` + (S.lamps ? '\nlampki −1' : '') + (isFullMoon() && !eclipseNow(c.b) ? '\npełnia −1' : ''));
    this.slots.forEach((s, i) => {
      const past = i < c.b, cur = i === c.b && !c.done, locked = i >= c.avail, id = c.plan[i], dev = !!id && id.startsWith('dev:'), oid = dev ? id.slice(4) : id;
      s.fore.setTexture('w_' + (past ? { clear: 'clear', thin: 'maybe', cloud: 'likely' }[c.act[i]] : shownForecast(i))).setAlpha(locked ? 0.15 : past ? 0.35 : i <= c.b + 1 ? 1 : 0.6);
      s.r.setFillStyle(locked ? 0x0b1026 : past ? 0x0e1430 : 0x121a3a).setStrokeStyle(cur ? 2 : 1, cur ? 0xffc65a : 0x2a3a6e);
      s.icon.setTexture(id ? 'obj_' + oid : 'ic_tea').setScale(id ? 0.75 : 2).setAlpha(locked ? 0 : past ? 0.4 : id ? 1 : 0.35);
      s.lab.setText(locked ? 'zimno' : dev ? 'wywołaj' : id && OBJ[id] ? `${Math.min(ost(id).p, OBJ[id].b)}/${OBJ[id].b}` : '');
      s.mark.setText(past ? (c.res[i] === 'ok' ? '✓' : c.res[i] === 'cloud' ? '☁' : '') : '').setColor(c.res[i] === 'ok' ? '#8fe8a8' : '#aab4d0');
    });
    this.bGo.setLabel(c.done ? 'Dobranoc' : `Zacznij blok ${c.b + 1}`);
    this.mailDot.setVisible(S.inbox.length > 0 || NEIGHBORS.some(n => canSend(n.id)));
    this.world.refresh(Math.min(c.b, BLOCKS - 1));
  }

  // ---------- plan
  tapSlot(i) {
    const c = S.cur;
    if (this.busy || c.done) return;
    if (i >= c.avail) return this.say('Za zimno na ten blok. Herbata albo pies mogą Cię ogrzać (stuknij).');
    if (i < c.b) return this.say('Ten blok już minął.');
    this.openPicker(i);
  }
  openPicker(i) {
    const c = S.cur, ov = overlay(this, 100, 0.88);
    const close = () => { ov.destroy(); this.render(); this.world.setTarget(c.plan[c.b]); };
    ov.add(txt(this, W / 2, 20, `Blok ${i + 1} · prognoza: ${FORE_NAME[shownForecast(i)]}`, { size: 13, ox: 0.5, color: '#ffc65a', style: 'bold' }));
    ov.add(txt(this, W / 2, 40, `ciemność nieba w tym bloku: ${darkness(i)}`, { size: 10, ox: 0.5, color: '#aab4d0' }));
    const rows = [];
    for (const o of OBJECTS) if (ost(o.id).p >= o.b) rows.push({ id: 'dev:' + o.id, tex: o.id, name: 'Wywołaj: ' + o.short, sub: 'zajmuje blok · chmury nie przeszkadzają', ok: true });
    if (eventTonight('comet')) rows.push({ id: 'comet', name: 'Kometa', sub: 'jedyna taka noc', ok: true });
    if (eclipseNow(i)) rows.push({ id: 'eclipse', name: 'Zaćmienie Księżyca', sub: 'Księżyc w cieniu Ziemi', ok: true });
    for (const o of seasonObjects(season())) {
      const st = ost(o.id), why = blocked(o.id, i);
      const alb = st.album ? ' · w albumie ' + '★'.repeat(st.album.stars) : '';
      rows.push({ id: o.id, name: o.short, sub: why || `${TYPES[o.type].label} · poziom ${o.lvl}${alb}`, ok: !why, o, st });
    }
    rows.push({ id: null, name: 'Odpoczynek', sub: 'herbata, album, nicnierobienie', ok: true });
    const rh = Math.min(42, (H - 110) / rows.length);
    rows.forEach((row, k) => {
      const y = 62 + k * rh + rh / 2, sel = c.plan[i] === row.id;
      const bg = this.add.rectangle(W / 2, y, W - 16, rh - 3, sel ? 0x2a3a6e : 0x121a3a).setStrokeStyle(1, sel ? 0xffc65a : 0x2a3a6e).setInteractive();
      const ic = this.add.image(28, y, row.id ? 'obj_' + (row.tex || row.id) : 'ic_tea').setScale(row.id ? Math.min(0.75, (rh - 6) / 48) : 2).setAlpha(row.ok ? 1 : 0.35);
      const nm = txt(this, 52, y - 8, row.name, { size: 12, oy: 0.5, color: row.ok ? '#f6ead0' : '#6a7498' });
      const sb = txt(this, 52, y + 8, row.sub, { size: 9, oy: 0.5, color: row.ok ? '#aab4d0' : '#b8707a' });
      ov.add([bg, ic, nm, sb]);
      if (row.o) {
        const p = row.st.p, need = row.o.b;
        ov.add(txt(this, W - 16, y - 8, '■'.repeat(Math.min(p, need)) + '□'.repeat(Math.max(0, need - p)) + (p > need ? ' +' + (p - need) : ''), { size: 11, ox: 1, oy: 0.5, color: p >= need ? '#8fe8a8' : '#ffc65a' }));
      }
      bg.on('pointerdown', () => { if (!row.ok) return; this.assign(i, row.id); close(); });
    });
    ov.add(button(this, W / 2, H - 24, 140, 30, 'Zamknij', close).c);
  }

  // Wpisuje cel do planu; dla obiektu wypełnia też kolejne wolne bloki, ile jeszcze trzeba.
  assign(i, id) {
    const c = S.cur, o = OBJ[id];
    c.plan[i] = id;
    if (o) {
      let need = Math.max(1, o.b - ost(id).p) - 1;
      for (let j = i + 1; j < c.avail && need > 0; j++) { if (c.plan[j] || blocked(id, j)) break; c.plan[j] = id; need--; }
    }
    save();
  }
  // Stuknięcie obiektu na niebie: ustawia go jako cel bieżącego bloku.
  pickSky(id) {
    const c = S.cur, o = OBJ[id];
    if (this.busy || c.done) return;
    const why = blocked(id, c.b);
    if (why) return this.say(`${o.name}: ${why}.`);
    this.assign(c.b, id); this.render(); this.world.setTarget(id);
    this.say(`Teleskop patrzy na: ${o.name}.\n${o.note}`);
  }

  // ---------- blok
  go() {
    if (this.busy) return;
    const c = S.cur;
    if (c.done) return this.nightEnd(true);
    const pid = c.plan[c.b];
    if (pid && pid.startsWith('dev:')) { // blok w ciemni: minigierka, pogoda bez znaczenia
      const oid = pid.slice(4);
      if (ost(oid).p >= OBJ[oid].b) return this.scene.start('Develop', { id: oid, block: true });
      c.plan[c.b] = null;
    }
    this.busy = true;
    const b = c.b;
    this.world.setTarget(c.plan[b]);
    this.world.refresh(b);
    this.say(c.plan[b] ? 'Zbierasz światło...' : 'Odpoczywasz...');
    this.bGo.setEnabled(false);
    const r = runBlock();
    this.world.blockFx(r.kind, r.act, () => {
      this.busy = false; this.bGo.setEnabled(true);
      const o = r.id && OBJ[r.id];
      if (r.kind === 'ok') this.say(`+1 światło: ${o.short} (${Math.min(ost(r.id).p, o.b)}/${o.b})` + (ost(r.id).p > o.b ? ', dodatkowy materiał' : '') + (r.lucky ? '\nZostałaś mimo prognozy i się rozchmurzyło!' : r.act === 'thin' ? '\nCienka chmura jasnym obiektom nie szkodzi.' : ''));
      else if (r.kind === 'cloud') this.say((r.act === 'thin' ? 'Cienka chmura: słabe światło przez nią nie przejdzie.' : 'Chmury zasłoniły niebo.') + (o ? '\nZebrany postęp zostaje.' : ''));
      else if (r.kind === 'blocked') this.say(`${o.short}: ${r.why}. Blok przepadł, postęp nie.`);
      else if (r.kind === 'event') this.say(r.id === 'comet' ? 'Kometa na zdjęciu. Na zawsze.' : 'Miedziany Księżyc złapany w kadr.');
      else this.say(REST_LINES[(S.night + b) % REST_LINES.length]);
      this.render();
      this.world.setTarget(c.done ? null : c.plan[c.b]);
      this.flushToasts();
      this.mail();
      if (c.b === 2) this.maybeISS();
      if (r.kind === 'event' && r.id === 'comet') return this.finale();
      if (r.kind === 'ok' && r.ready) toast(this, `Kadr gotowy: ${o.short}.\nDodaj blok „Wywołaj”, najlepiej na chmury.`, 200);
      if (c.done) this.nightEnd();
    });
  }
  mail() {
    const c = S.cur;
    if (c.mail) return;
    if (c.b >= this.mailAt()) { const n = deliverMail(); this.world.catBack(() => { if (n) { toast(this, 'Kot wrócił z liścikiem. Zajrzyj do słoika na płocie.', 200); } this.render(); }); }
    else if (c.b === this.mailAt() - 1) this.world.catGo();
  }
  nightEnd(force) {
    const c = S.cur;
    this.render();
    if (!force && season() === 1 && c.avail < BLOCKS && (!c.tea || !c.dog) && c.meteors === undefined)
      return this.say('Robi się zimno. Stuknij herbatę albo psa, żeby zostać dłużej, albo powiedz „Dobranoc”.');
    if (!c.mail) deliverMail();
    const used = c.res.filter(x => x === 'ok').length;
    const perfect = perfectNight() && feat('perfect');
    let body = c.meteors !== undefined ? `Spadające gwiazdy: ${c.meteors}` : `Udane bloki: ${used}/${BLOCKS}\nNowe zdjęcia: ${c.got}`;
    if (perfectNight()) body += '\n\nIdealna noc: wszystkie 8 bloków wykorzystane!';
    body += '\n\nZebrane światło poczeka do jutra.';
    this.flushToasts();
    dialog(this, `Koniec nocy ${nightNo() + 1}`, body, [{ label: 'Dobranoc', cb: () => { endNight(); this.cameras.main.fadeOut(500, 7, 10, 24); this.time.delayedCall(520, () => this.scene.restart()); } }]);
  }
  finale() {
    this.world.refresh();
    dialog(this, 'Kometa', 'Rok temu nie znałaś tu nikogo. Dziś na tarasie jest ciasno: ktoś przyniósł szarlotkę, ktoś kakao, ktoś składane krzesło.\n\nWszystkie światła w okolicy zgasły, żeby było ją lepiej widać. Kot i pies śpią razem, pierwszy raz.\n\nKometa odleci. Sąsiedzi zostaną.', [{ label: 'Zostań na tarasie', cb: () => { this.render(); if (S.cur.done) this.nightEnd(); else this.say('Niebo zostaje. Możesz dalej uzupełniać album, rok po roku.'); } }], { serif: true });
  }

  // ---------- taras
  toggleLamps() {
    if (this.busy) return;
    S.lamps = !S.lamps; save(); this.render();
    toast(this, S.lamps ? 'Lampki zapalone: przytulnie, kot nosi więcej liścików,\nale niebo jaśnieje o 1.' : 'Lampki zgaszone: niebo ciemniejsze o 1.', 190);
  }
  warm(what) {
    const c = S.cur;
    if (this.busy) return;
    if (what === 'dog') this.world.dogUp();
    if (season() === 1 && !c[what] && c.avail < BLOCKS && c.meteors === undefined) {
      c[what] = true; c.avail++; c.done = false; save(); this.render();
      toast(this, what === 'dog' ? 'Pies wtula się w kokon. Cieplej: +1 blok.' : 'Gorąca herbata. Cieplej: +1 blok.', 380);
    } else toast(this, what === 'dog' ? 'Pies macha ogonem przez sen.' : 'Łyk herbaty. Jest dobrze.', 380);
  }
  readMail() {
    if (this.busy) return;
    if (!S.inbox.length) return toast(this, S.cur.mail ? 'Słoik jest pusty.' : 'Słoik jest pusty. Kot jeszcze nie wrócił.', 250);
    const m = S.inbox[0], n = NB[m.from];
    dialog(this, n.name, m.text, [{ label: 'Schowaj liścik', cb: () => { S.inbox.shift(); save(); this.render(); if (S.inbox.length) this.readMail(); } }], { serif: true });
  }
  openRequests() {
    const ov = overlay(this, 100, 0.9);
    const close = () => { ov.destroy(); this.render(); };
    ov.add(txt(this, W / 2, 22, 'Sąsiedzi i prośby', { size: 14, ox: 0.5, color: '#ffc65a', style: 'bold' }));
    const met = NEIGHBORS.filter(n => S.nb[n.id].met);
    if (!met.length) ov.add(txt(this, W / 2, 200, 'Nikogo jeszcze nie znasz.\nKot poszedł na zwiady, wróci z liścikiem.', { size: 12, ox: 0.5, align: 'center', color: '#aab4d0' }));
    met.forEach((n, k) => {
      const st = S.nb[n.id], y = 90 + k * 98;
      ov.add(panel(this, W / 2, y, W - 16, 90));
      ov.add(this.add.image(30, y - 8, 'guy_' + n.id).setScale(3));
      ov.add(txt(this, 58, y - 38, n.name, { size: 13, color: '#f6ead0', style: 'bold' }));
      ov.add(txt(this, 58, y - 20, n.who, { size: 10, color: '#aab4d0' }));
      ov.add(txt(this, W - 18, y - 38, '♥'.repeat(Math.min(5, st.rel)) + '♡'.repeat(Math.max(0, 5 - st.rel)), { size: 13, ox: 1, color: '#e88a9a' }));
      ov.add(txt(this, W - 18, y - 20, st.off ? 'światło zgaszone' : `świeci: ${n.light}`, { size: 9, ox: 1, color: st.off ? '#8fe8a8' : '#ffc65a' }));
      if (st.req) {
        ov.add(this.add.image(72, y + 18, 'obj_' + st.req).setScale(0.6));
        ov.add(txt(this, 92, y + 4, 'Prosi o zdjęcie:', { size: 9, color: '#aab4d0' }));
        ov.add(txt(this, 92, y + 17, OBJ[st.req].short, { size: 12 }));
        if (canSend(n.id)) ov.add(button(this, W - 62, y + 20, 92, 28, 'Wyślij kotem', () => {
          const ev = sendPhoto(n.id); ov.destroy(); this.render();
          toast(this, `Zdjęcie przypięte do obroży. ${n.name}: ♥ ${S.nb[n.id].rel}`, 220);
          if (ev === 'off') dialog(this, 'Gaśnie światło', `${n.name} gasi ${n.light}.\n\nNiebo nad tarasem ciemnieje i odsłania słabsze obiekty.` + (S.lamps ? '\n\nTwoje lampki też świecą: stuknij girlandę, żeby je zgasić.' : ''), [{ label: 'Pięknie', cb: () => this.openRequests() }]);
          else this.openRequests();
        }, { size: 11, fill: 0x8a3a56, stroke: 0xe88a9a }).c);
        else ov.add(txt(this, W - 18, y + 20, 'jeszcze nie\nw albumie', { size: 9, ox: 1, oy: 0.5, align: 'right', color: '#6a7498' }));
      } else ov.add(txt(this, 58, y + 12, st.rel >= 5 ? 'Wpada czasem na taras, gdy palą się lampki.' : 'Kot przyniesie kolejny liścik.', { size: 10, color: '#6a7498', wrap: 280 }));
    });
    ov.add(button(this, W / 2, H - 24, 140, 30, 'Zamknij', close).c);
  }

  // ---------- wydarzenia
  maybeISS() {
    if (!eventTonight('iss') || S.feats.iss || this.iss) return;
    this.iss = true;
    toast(this, 'Coś jasnego sunie po niebie... stuknij w porę!', 330);
    const dot = this.add.rectangle(-10, 190, 6, 6, 0xffffff).setDepth(50);
    const halo = this.add.circle(-10, 190, 26, 0xffe9a8, 0.12).setDepth(49).setInteractive();
    halo.on('pointerdown', () => { if (feat('iss')) { this.flushToasts(); this.say('To była stacja kosmiczna. Ktoś tam na górze właśnie pił herbatę.'); } halo.destroy(); dot.destroy(); });
    this.tweens.add({ targets: [dot, halo], x: W + 20, y: 60, duration: 7000, onComplete: () => { if (dot.active) { dot.destroy(); halo.destroy(); this.say('Jasna kropka przeleciała i zgasła. Jeszcze wróci.'); } } });
  }
  meteorNight() {
    const gem = eventTonight('geminids'), c = S.cur;
    this.world.setTarget(null);
    dialog(this, gem ? 'Geminidy' : 'Perseidy', gem ? 'Dziś teleskop zostaje pod pokrowcem. Leżysz z psem pod kocem i liczysz spadające gwiazdy.\n\nStukaj w każdą, którą zobaczysz.' : 'Noc spadających gwiazd. Sąsiedzi przyszli na taras z leżakami.\n\nStukaj w każdą gwiazdę, którą zobaczycie.', [{
      label: 'Patrzę w górę', cb: () => {
        this.busy = true; let count = 0, left = 30;
        const cover = this.add.rectangle(W / 2, (PY + H) / 2 + 2, W, H - PY, 0x0b1026).setDepth(60).setInteractive();
        const lab = txt(this, W / 2, PY + 50, '', { size: 16, ox: 0.5, color: '#ffe9a8', align: 'center' }).setDepth(61);
        const upd = () => lab.setText(`Spadające gwiazdy: ${count}\n\nzostało ${left} s`);
        upd();
        const spawn = () => {
          const x0 = 20 + Math.random() * 300, y0 = 20 + Math.random() * 150, dx = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 80), dy = 40 + Math.random() * 60;
          const m = this.add.rectangle(x0, y0, 22, 2, 0xffffff).setRotation(Math.atan2(dy, dx)).setDepth(50);
          const hit = this.add.circle(x0, y0, 30, 0xffffff, 0.001).setDepth(51).setInteractive();
          hit.on('pointerdown', () => { count++; upd(); const f = this.add.circle(hit.x, hit.y, 6, 0xffe9a8).setDepth(52); this.tweens.add({ targets: f, scale: 4, alpha: 0, duration: 400, onComplete: () => f.destroy() }); hit.destroy(); });
          this.tweens.add({ targets: [m, hit], x: x0 + dx, y: y0 + dy, duration: 900 + Math.random() * 500, onComplete: () => { m.destroy(); hit.destroy(); } });
          this.tweens.add({ targets: m, alpha: 0, delay: 600, duration: 500 });
        };
        const sp = this.time.addEvent({ delay: 800, loop: true, callback: () => { spawn(); if (Math.random() < 0.3) this.time.delayedCall(250, spawn); } });
        this.time.addEvent({ delay: 1000, repeat: 29, callback: () => {
          left--; upd();
          if (left <= 0) { sp.remove(); c.meteors = count; c.done = true; c.res.fill('rest'); feat(gem ? 'geminids' : 'perseids'); deliverMail(); save(); cover.destroy(); lab.destroy(); this.busy = false; this.nightEnd(true); }
        } });
      },
    }]);
  }
}
