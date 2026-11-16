// Główna scena: taras nocą, plan 8 bloków, prognoza, liściki.
import Phaser from '../lib/phaser.esm.min.js';
import { OBJ, OBJECTS, NB, NEIGHBORS, TYPES, SEASONS, CON, seasonObjects, BLOCKS, NIGHTS_PER_SEASON } from './data.js';
import { sfx, toggleMute, isMuted } from './audio.js';
import {
  S, save, startNight, season, nightNo, year, ost, darkness, lightsOff, shownForecast, blocked, maxP, tier, canDevelop, scanCandidates, scanClouded, runBlock, perfectNight, endNight,
  deliverMail, canSend, feat, eventTonight, eclipseNow, isFullMoon, unpasted, mailBlock, sendBlock, talkBlock, canTalk, guests, moonPhase, moonTex, canWrite, writeBlock, teaBlock, calibBlock, catchStar, useWish, WISH_MAX,
} from './state.js';
import { World } from './world.js';
import { W, H, PY, setupCam, txt, button, overlay, panel, dialog, toast } from './ui.js';

const FORE_NAME = { clear: 'czysto', maybe: 'może być chmura', likely: 'raczej chmury' };
const REST_LINES = ['Herbata, koc i cisza. Też dobra godzina.', 'Pies wzdycha przez sen. Nic nie trzeba.', 'Przeglądasz album przy czerwonej latarce.', 'Para z kubka leci prosto w gwiazdy.'];
const SEASON_INTRO = [
  'Jesień. Dopiero się wprowadziłaś i nikogo tu nie znasz. Okolica świeci jak choinka, więc widać tylko najjaśniejsze obiekty. Ale kot już poszedł na zwiady.',
  'Zima. Długie noce, tylko zimno: kokon z koca wytrzymuje 6 godzin. Herbata i pies dodają po jednym.',
  'Wiosna. Sezon galaktyk. Na ulicy mówią, że pod koniec lata ma przylecieć kometa.',
  'Lato. Noce są krótkie: pierwsza i ostatnia godzina to jasny zmierzch. Za to nad tarasem stoi Droga Mleczna.',
];

export class NightScene extends Phaser.Scene {
  constructor() { super('Night'); }

  create() {
    setupCam(this);
    this._toasts = [];
    if (unpasted().length) { this.scene.start('Album', { paste: unpasted()[0] }); return; }
    if (!S.cur) startNight();
    this.busy = false; this.iss = false;
    this.world = new World(this, { pick: id => this.pickSky(id), lamps: () => this.toggleLamps(), jar: () => this.quickPlan('read'), guest: id => this.quickPlan('talk:' + id), wish: () => this.onWish(), dog: () => this.warm('dog'), tea: () => this.warm('tea') });

    this.hudL = txt(this, 8, 6, '', { size: 12, color: '#ffe9a8' });
    this.hudR = txt(this, W - 8, 6, '', { size: 11, ox: 1, color: '#aab4d0', align: 'right' });
    this.bLamps = button(this, 44, 36, 74, 20, '', () => this.toggleLamps(), { size: 10, fill: 0x1b2650 });
    this.bMute = button(this, 104, 36, 36, 20, '', () => { toggleMute(); this.bMute.setLabel(isMuted() ? '♪ ×' : '♪'); }, { size: 10, fill: 0x1b2650 });
    this.bMute.setLabel(isMuted() ? '♪ ×' : '♪');
    this.bWish = button(this, 152, 36, 52, 20, '', () => this.wishMenu(), { size: 10, fill: 0x3a2a5e, stroke: 0xe88ad0 });
    this.add.rectangle(W / 2, (PY + H) / 2, W, H - PY, 0x0b1026);
    this.add.rectangle(W / 2, PY, W, 2, 0x4a3238);

    this.slots = [];
    for (let i = 0; i < BLOCKS; i++) {
      const x = 24 + i * 44.5;
      const fore = this.add.image(x, PY + 18, 'w_clear').setScale(2);
      const r = this.add.rectangle(x, PY + 58, 41, 44, 0x121a3a).setStrokeStyle(1, 0x2a3a6e).setRounded(8).setInteractive();
      const icon = this.add.image(x, PY + 55, 'ic_tea').setScale(0.75);
      const lab = txt(this, x, PY + 73, '', { size: 9, ox: 0.5, oy: 0.5, color: '#aab4d0' });
      const mark = txt(this, x + 13, PY + 42, '', { size: 10, ox: 0.5, oy: 0.5 });
      r.on('pointerdown', () => this.tapSlot(i));
      this.slots.push({ fore, r, icon, lab, mark });
    }
    this.info = txt(this, 10, PY + 86, '', { size: 11, wrap: W - 20, color: '#d8dcf0' });
    this.bAlbum = button(this, 48, H - 24, 80, 34, 'Album', () => !this.busy && this.scene.start('Album', {}));
    this.bMail = button(this, 134, H - 24, 80, 34, 'Liściki', () => !this.busy && this.openRequests());
    this.bGo = button(this, 268, H - 24, 172, 34, 'Zacznij godzinę', () => this.go(), { fill: 0x8a3a56, stroke: 0xe88a9a, size: 14 });
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
      label: 'Dalej', cb: () => dialog(this, 'Jak grać', 'Noc ma 8 godzin. Stuknij godzinę i wybierz, co wtedy robisz. Ikonki nad godzinami to prognoza: dwie najbliższe są już pewne, dalsze to zgadywanka.\n\nSłabszych obiektów najpierw trzeba poszukać: „Skanuj niebo”. Im więcej światła zbierzesz, tym więcej gwiazdek może dostać zdjęcie (komplet to trzy). Wywoływanie zajmuje godzinę, najlepiej pochmurną. Na chmury są też liściki, rozmowy z gośćmi i łączenie gwiazdozbiorów w albumie. A jak spadnie gwiazda, złap ją i pomyśl życzenie.\n\nNic nie przepada. Zebrane światło zostaje na kolejne noce, a plan możesz zmieniać, kiedy chcesz.', [{ label: 'Zaczynam', cb: () => { S.intro = true; S.banner = S.night; save(); this.afterBanner(); } }]),
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
      let m = 'Stuknij godzinę albo obiekt na niebie, żeby wybrać, co robisz. Mgliste plamki to obiekty do namierzenia skanowaniem.';
      if (eventTonight('comet')) m = 'To dziś. Kometa wisi nad dachami, a na taras przyszli wszyscy.';
      else if (eventTonight('eclipse')) m = 'Pełnia, ale w godzinach 4 i 5 Księżyc wejdzie w cień Ziemi: zrobi się ciemno jak nigdy.';
      else if (isFullMoon()) m = 'Księżyc blisko pełni: niebo jest dziś jaśniejsze o 1.';
      else if (!moonPhase() && S.night > 0) m = 'Nów. Księżyca nie ma, więc niebo jest najciemniejsze w całym miesiącu.';
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
    this.hudR.setText(`ciemność ${'●'.repeat(Math.min(7, d))}${'○'.repeat(Math.max(0, 7 - d))}` + (isFullMoon() && !eclipseNow(c.b) ? '\njasny Księżyc −1' : ''));
    this.slots.forEach((s, i) => {
      const past = i < c.b, cur = i === c.b && !c.done, locked = i >= c.avail, id = c.plan[i], pi = this.planInfo(id);
      s.fore.setTexture('w_' + (past ? { clear: 'clear', thin: 'maybe', cloud: 'likely' }[c.act[i]] : shownForecast(i))).setAlpha(locked ? 0.15 : past ? 0.35 : i <= c.b + 1 ? 1 : 0.6);
      s.r.setFillStyle(locked ? 0x0b1026 : past ? 0x0e1430 : 0x121a3a).setStrokeStyle(cur ? 2 : 1, cur ? 0xffc65a : 0x2a3a6e);
      s.icon.setTexture(pi.tex).setScale(pi.sc).setAlpha(locked ? 0 : past ? 0.4 : id ? 1 : 0.35);
      s.lab.setText(locked ? 'zimno' : pi.lab);
      s.mark.setText(past ? (c.res[i] === 'ok' ? '✓' : c.res[i] === 'cloud' ? '☁' : '') : '').setColor(c.res[i] === 'ok' ? '#8fe8a8' : '#aab4d0');
    });
    this.bGo.setLabel(c.done ? 'Dobranoc' : `Zacznij godzinę ${c.b + 1}`);
    this.bLamps.setLabel(S.lamps ? 'lampki: wł.' : 'lampki: wył.');
    this.bWish.setLabel(`✧ ${S.wishes}`);
    this.mailDot.setVisible(S.inbox.length > 0 || NEIGHBORS.some(n => canSend(n.id)));
    this.world.refresh(Math.min(c.b, BLOCKS - 1));
  }

  // Jak pokazać wpis planu w kafelku bloku: tekstura, skala i podpis.
  planInfo(id) {
    if (!id) return { tex: 'ic_tea', sc: 2, lab: '' };
    if (id === 'scan') return { tex: 'ic_scan', sc: 2, lab: 'skan' };
    if (id === 'read') return { tex: 'jar1', sc: 1.4, lab: 'liściki' };
    if (id === 'send') return { tex: 'cat0', sc: 1.1, lab: 'wyślij' };
    if (id === 'phase') return { tex: moonTex(), sc: 1.1, lab: 'faza' };
    if (id === 'write') return { tex: 'ic_pen', sc: 2, lab: 'napisz' };
    if (id === 'tea') return { tex: 'ic_tea', sc: 2, lab: 'herbata' };
    if (id === 'calib') return { tex: 'tube', sc: 0.8, lab: 'optyka' };
    if (id.startsWith('talk:')) return { tex: 'guy_' + id.slice(5), sc: 0.9, lab: 'rozmowa' };
    if (id.startsWith('dev:')) return { tex: 'obj_' + id.slice(4), sc: 0.75, lab: 'wywołaj' };
    return { tex: 'obj_' + id, sc: 0.75, lab: OBJ[id] ? `${ost(id).p}/${maxP(id)}` : '' };
  }

  // ---------- plan
  tapSlot(i) {
    const c = S.cur;
    if (this.busy || c.done) return;
    if (i >= c.avail) return this.say('Za zimno na tę godzinę. Herbata albo pies mogą Cię ogrzać (stuknij).');
    if (i < c.b) return this.say('Ta godzina już minęła.');
    this.openPicker(i);
  }
  openPicker(i) {
    const c = S.cur, ov = overlay(this, 100, 0.88);
    const close = () => { ov.destroy(); this.render(); this.world.setTarget(c.plan[c.b]); };
    ov.add(txt(this, W / 2, 20, `Godzina ${i + 1} · prognoza: ${FORE_NAME[shownForecast(i)]}`, { size: 13, ox: 0.5, color: '#ffc65a', style: 'bold' }));
    ov.add(txt(this, W / 2, 40, `ciemność nieba w tej godzinie: ${darkness(i)}`, { size: 10, ox: 0.5, color: '#aab4d0' }));
    const rows = [];
    if (S.wishes > 0) {
      if (shownForecast(i) !== 'clear' || c.act[i] !== 'clear') rows.push({ wish: 'clear', icon: 'ic_wish', name: '✧ Rozgoń chmury w tej godzinie', sub: `zużywa odłamek życzenia (masz ${S.wishes})`, ok: true });
      if (!c.dark[i]) rows.push({ wish: 'dark', icon: 'ic_wish', name: '✧ Przyciemnij niebo w tej godzinie', sub: 'ciemność +1 · zużywa odłamek życzenia', ok: true });
    }
    for (const o of OBJECTS) if (canDevelop(o.id)) rows.push({ id: 'dev:' + o.id, tex: o.id, name: 'Wywołaj: ' + o.short, sub: `na ${'★'.repeat(tier(o.id))} · chmury nie przeszkadzają`, ok: true });
    const hidden = scanCandidates(i).length, unknown = seasonObjects(season()).filter(o => !ost(o.id).found).length;
    if (unknown) rows.push({ id: 'scan', icon: 'ic_scan', name: 'Skanuj niebo', sub: hidden ? `do namierzenia przy tej ciemności: ${hidden}` : 'reszta jest za słaba na tę ciemność', ok: hidden > 0 });
    if (S.inbox.length) rows.push({ id: 'read', icon: 'jar1', is: 1.3, name: 'Przeczytaj liściki', sub: `w słoiku: ${S.inbox.length} · chmury nie przeszkadzają`, ok: true });
    const ready = NEIGHBORS.filter(n => canSend(n.id));
    if (ready.length) rows.push({ id: 'send', icon: 'cat0', is: 1.1, name: 'Wyślij zdjęcia kotem', sub: 'dla: ' + ready.map(n => n.name).join(', '), ok: true });
    for (const g of guests()) if (canTalk(g)) rows.push({ id: 'talk:' + g, icon: 'guy_' + g, is: 0.9, name: 'Porozmawiaj: ' + NB[g].name, sub: 'gość na tarasie', ok: true });
    if (canWrite()) rows.push({ id: 'write', icon: 'ic_pen', name: 'Napisz liścik do sąsiada', sub: 'kot zaniesie i od razu wróci z odpowiedzią', ok: true });
    if (!c.extra) rows.push({ id: 'tea', icon: 'ic_tea', name: 'Zaparz herbatę', sub: 'następne zbieranie światła: +1 · chmury nie przeszkadzają', ok: true });
    if (!c.calib) rows.push({ id: 'calib', icon: 'tube', is: 0.8, name: 'Wyczyść i skalibruj teleskop', sub: 'następne udane zbieranie: podwójnie · w sam raz na chmury', ok: true });
    const ph = moonPhase();
    if (ph && !S.feats[ph.id]) rows.push({ id: 'phase', icon: moonTex(), is: 1.1, name: 'Księżyc: ' + ph.name.toLowerCase(), sub: 'nowa faza do kolekcji', ok: true });
    if (eventTonight('comet')) rows.push({ id: 'comet', name: 'Kometa', sub: 'jedyna taka noc', ok: true });
    if (eclipseNow(i)) rows.push({ id: 'eclipse', name: 'Zaćmienie Księżyca', sub: 'Księżyc w cieniu Ziemi', ok: true });
    for (const o of seasonObjects(season())) {
      const st = ost(o.id), why = blocked(o.id, i);
      const alb = st.album ? ' · w albumie ' + '★'.repeat(st.album.stars) : '';
      if (st.found) rows.push({ id: o.id, name: o.short, sub: why || `${TYPES[o.type].label} · poziom ${o.lvl}${alb}`, ok: !why, o, st });
    }
    rows.push({ id: null, name: 'Odpoczynek', sub: 'herbata, album, nicnierobienie', ok: true });
    const rh = Math.max(30, Math.min(42, (H - 110) / rows.length));
    rows.forEach((row, k) => {
      const y = 62 + k * rh + rh / 2, sel = !row.wish && c.plan[i] === row.id;
      const bg = this.add.rectangle(W / 2, y, W - 16, rh - 3, sel ? 0x2a3a6e : 0x121a3a).setStrokeStyle(1, sel ? 0xffc65a : 0x2a3a6e).setRounded(8).setInteractive();
      const ic = this.add.image(28, y, row.icon || (row.id ? 'obj_' + (row.tex || row.id) : 'ic_tea')).setScale(row.is || (row.icon || !row.id ? 2 : Math.min(0.75, (rh - 6) / 48))).setAlpha(row.ok ? 1 : 0.35);
      const nm = txt(this, 52, y - 8, row.name, { size: 12, oy: 0.5, color: row.ok ? '#f6ead0' : '#6a7498' });
      const sb = txt(this, 52, y + 8, row.sub, { size: 9, oy: 0.5, color: row.ok ? '#aab4d0' : '#b8707a' });
      ov.add([bg, ic, nm, sb]);
      if (row.o) {
        const t = tier(row.id);
        ov.add(txt(this, W - 16, y - 8, `${'★'.repeat(t)}${'☆'.repeat(3 - t)}  ${row.st.p}/${maxP(row.id)}`, { size: 11, ox: 1, oy: 0.5, color: canDevelop(row.id) ? '#8fe8a8' : '#ffc65a' }));
      }
      bg.on('pointerdown', () => {
        if (!row.ok) return;
        if (row.wish) { useWish(row.wish, i); sfx('wish'); ov.destroy(); this.render(); return this.openPicker(i); }
        this.assign(i, row.id); close();
      });
    });
    ov.add(button(this, W / 2, H - 24, 140, 30, 'Zamknij', close).c);
  }

  // Wpisuje cel do planu; dla obiektu wypełnia też kolejne wolne bloki, ile jeszcze trzeba.
  assign(i, id) {
    const c = S.cur, o = OBJ[id];
    c.plan[i] = id;
    if (o) {
      let need = o.b - (ost(id).p % o.b) - 1; // do najbliższego progu gwiazdki
      for (let j = i + 1; j < c.avail && need > 0; j++) { if (c.plan[j] || blocked(id, j)) break; c.plan[j] = id; need--; }
    }
    save();
  }
  // Stuknięcie obiektu na niebie: ustawia go jako cel bieżącego bloku.
  pickSky(id) {
    const c = S.cur, o = OBJ[id];
    if (this.busy || c.done) return;
    if (id === 'phase') {
      const ph = moonPhase();
      if (S.feats[ph.id]) return this.say(`Księżyc: ${ph.name.toLowerCase()}. Tę fazę masz już w albumie, jutro będzie wyglądał inaczej.`);
      this.assign(c.b, 'phase'); this.render(); this.world.setTarget('phase');
      return this.say(`Księżyc: ${ph.name.toLowerCase()}. Jedna godzina i ta faza trafi do albumu.`);
    }
    const why = blocked(id, c.b);
    if (!ost(id).found) return this.say('Coś tam majaczy, ale nie wiesz co. Zaplanuj „Skanuj niebo”, żeby to namierzyć.');
    if (why && why.startsWith('za jasno')) return this.say(`${o.name}: za jasno na zdjęcie. Musisz przekonać sąsiada do zgaszenia światła.` + (S.wishes ? ' Odłamek życzenia przyciemni niebo na godzinę.' : ''));
    if (why) return this.say(`${o.name}: ${why}.`);
    this.assign(c.b, id); this.render(); this.world.setTarget(id);
    this.say(`Teleskop patrzy na: ${o.name}.\n${o.note}`);
  }
  // Stuknięcie słoika albo gościa: wpisuje czynność do bieżącego bloku.
  quickPlan(id) {
    const c = S.cur;
    if (this.busy || c.done) return;
    if (id === 'read' && !S.inbox.length) return toast(this, c.mail ? 'Słoik jest pusty.' : 'Słoik jest pusty. Kot jeszcze nie wrócił.', 250);
    if (id.startsWith('talk:') && !canTalk(id.slice(5))) return this.say('Już dziś rozmawialiście. Wystarczy posiedzieć razem.');
    this.assign(c.b, id); this.render(); this.world.setTarget(null);
    this.say(id === 'read' ? 'Tę godzinę spędzisz na czytaniu liścików. Stuknij „Zacznij godzinę”.' : `Ta godzina to rozmowa: ${NB[id.slice(5)].name}. Stuknij „Zacznij godzinę”.`);
  }
  // Wspólne zakończenie każdego bloku: odświeżenie, kot z pocztą, wydarzenia, koniec nocy.
  afterBlock() {
    const c = S.cur;
    this.busy = false; this.bGo.setEnabled(true);
    this.render();
    this.world.setTarget(c.done ? null : c.plan[c.b]);
    this.flushToasts();
    this.mail();
    if (c.b === 2) this.maybeISS();
    if (c.done) this.nightEnd();
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
    if (pid === 'scan') {
      if (!scanCandidates(c.b).length) c.plan[c.b] = null;
      else if (c.act[c.b] === 'cloud') { scanClouded(); this.say('Chmury zasłoniły niebo, nie ma czego skanować.'); return this.afterBlock(); }
      else return this.scene.start('Scan');
    }
    if (pid === 'read') {
      if (!S.inbox.length) c.plan[c.b] = null;
      else {
        const notes = mailBlock(); sfx('paper');
        const next = () => { const m = notes.shift(); if (!m) return this.afterBlock(); dialog(this, NB[m.from].name, m.text, [{ label: notes.length ? 'Następny liścik' : 'Schowaj liścik', cb: next }], { serif: true }); };
        this.say('Czytasz liściki przy czerwonej latarce.'); return next();
      }
    }
    if (pid === 'tea' || pid === 'calib') {
      (pid === 'tea' ? teaBlock : calibBlock)(); sfx(pid === 'tea' ? 'soft' : 'link');
      this.say(pid === 'tea' ? 'Herbata paruje w kubku. Następne zbieranie da jedno światło więcej.' : 'Lusterko czyste, szukacz ustawiony. Następne udane zbieranie da podwójne światło.');
      return this.afterBlock();
    }
    if (pid === 'write') {
      const r = writeBlock();
      if (!r) c.plan[c.b] = null;
      else { sfx('paper'); this.world.catGo(); this.time.delayedCall(1500, () => this.world.catBack()); return dialog(this, NB[r.from].name + ' odpisuje', r.text, [{ label: 'Schowaj liścik', cb: () => this.afterBlock() }], { serif: true }); }
    }
    if (pid === 'send') {
      const out = sendBlock(); sfx('meow');
      let body = out.map(x => `${OBJ[x.obj].short} → ${NB[x.nb].name} (♥ ${S.nb[x.nb].rel})`).join('\n');
      for (const x of out) if (x.ev === 'off') body += `\n\n${NB[x.nb].name} gasi ${NB[x.nb].light}. Niebo ciemnieje.`; else if (x.ev === 'guest') body += `\n\n${NB[x.nb].name} odpisze liścikiem od serca.`;
      this.say('Kot poszedł z przesyłką.'); this.world.catGo(); this.time.delayedCall(1800, () => this.world.catBack());
      return dialog(this, 'Zdjęcia w drodze', body || 'Nie było czego wysłać, ale kot i tak zrobił rundkę.', [{ label: 'Dobrze', cb: () => this.afterBlock() }]);
    }
    if (pid && pid.startsWith('talk:')) {
      const nid = pid.slice(5);
      if (!canTalk(nid)) c.plan[c.b] = null;
      else {
        const t = talkBlock(nid);
        let body = '„' + t.line + '”';
        if (t.ev === 'off') body += `\n\n${NB[nid].name} obiecuje zgasić ${NB[nid].light}.`;
        return dialog(this, NB[nid].name, body, [{ label: 'Posiedzieć razem', cb: () => this.afterBlock() }], { serif: true });
      }
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
      sfx(r.kind === 'ok' || r.kind === 'event' ? 'collect' : r.kind === 'rest' ? 'soft' : 'cloud');
      if (r.kind === 'ok') this.say(`+${r.gain} światło: ${o.short} (${ost(r.id).p}/${maxP(r.id)})` + (r.buffs.length ? ` · ${r.buffs.join(', ')}` : '') + (darkness(r.b) >= o.lvl + 3 ? '\nBardzo ciemne niebo: podwójne światło.' : '') + (r.lucky ? '\nZostałaś mimo prognozy i się rozchmurzyło!' : r.act === 'thin' ? '\nCienka chmura jasnym obiektom nie szkodzi.' : ''));
      else if (r.kind === 'cloud') this.say((r.act === 'thin' ? 'Cienka chmura: słabe światło przez nią nie przejdzie.' : 'Chmury zasłoniły niebo.') + (o ? '\nZebrany postęp zostaje.' : ''));
      else if (r.kind === 'blocked') this.say(r.why.startsWith('za jasno') ? `${o.short}: za jasno na zdjęcie. Musisz przekonać sąsiada do zgaszenia światła.` : `${o.short}: ${r.why}. Godzina przepadła, postęp nie.`);
      else if (r.kind === 'event') this.say(r.id === 'comet' ? 'Kometa na zdjęciu. Na zawsze.' : r.id === 'phase' ? 'Księżyc w kadrze: nowa faza w albumie.' : 'Miedziany Księżyc złapany w kadr.');
      else this.say(REST_LINES[(S.night + b) % REST_LINES.length]);
      this.render();
      this.world.setTarget(c.done ? null : c.plan[c.b]);
      this.flushToasts();
      this.mail();
      if (c.b === 2) this.maybeISS();
      if (r.kind === 'event' && r.id === 'comet') return this.finale();
      if (r.kind === 'ok' && r.ready) toast(this, `${o.short}: światła starczy na ${'★'.repeat(tier(r.id))}.\nZaplanuj „Wywołaj” albo zbieraj dalej.`, 200);
      if (c.done) this.nightEnd();
    });
  }
  mail() {
    const c = S.cur;
    if (c.mail) return;
    if (c.b >= this.mailAt()) { const n = deliverMail(); this.world.catBack(() => { if (n) { sfx('meow'); toast(this, 'Kot wrócił z liścikiem.\nStuknij słoik, żeby przeczytać go w tej godzinie.', 200); } this.render(); }); }
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
    let body = c.meteors !== undefined ? `Spadające gwiazdy: ${c.meteors}` : `Udane godziny: ${used}/${BLOCKS}\nNowe zdjęcia: ${c.got}`;
    if (perfectNight()) body += '\n\nIdealna noc: wszystkie 8 godzin wykorzystane!';
    body += '\n\nZebrane światło poczeka do jutra.';
    this.flushToasts(); sfx('night');
    dialog(this, `Koniec nocy ${nightNo() + 1}`, body, [{ label: 'Dobranoc', cb: () => { const night = S.night; endNight(); this.scene.start('Dawn', { night }); } }]);
  }
  finale() {
    this.world.refresh();
    dialog(this, 'Kometa', 'Rok temu nie znałaś tu nikogo. Dziś na tarasie jest ciasno: ktoś przyniósł szarlotkę, ktoś kakao, ktoś składane krzesło.\n\nWszystkie światła w okolicy zgasły, żeby było ją lepiej widać. Kot i pies śpią razem, pierwszy raz.\n\nKometa odleci. Sąsiedzi zostaną.', [{ label: 'Zostań na tarasie', cb: () => { this.render(); if (S.cur.done) this.nightEnd(); else this.say('Niebo zostaje. Możesz dalej uzupełniać album, rok po roku.'); } }], { serif: true });
  }

  // Złapana spadająca gwiazda: odłamek życzenia do wykorzystania później.
  onWish() {
    sfx('wish');
    if (!S.cur || S.cur.done) return;
    if (!catchStar()) return toast(this, S.wishes >= WISH_MAX ? `Masz już ${WISH_MAX} odłamków. Wykorzystaj któryś!` : 'Piękna! Ale na dziś odłamków wystarczy.', 200);
    this.render(); this.flushToasts();
    toast(this, `Odłamek życzenia! Masz: ${S.wishes}.\nUżyjesz go, stukając ✧ albo godzinę.`, 200);
  }
  // Przycisk ✧: wydłużenie nocy (rozganianie chmur i przyciemnianie są w wyborze godziny)
  wishMenu() {
    const c = S.cur;
    if (this.busy) return;
    if (!S.wishes) return toast(this, 'Nie masz odłamków. Łap spadające gwiazdy na niebie.', 200);
    const opts = [];
    if (c.plan.length === BLOCKS || c.avail < c.plan.length) opts.push({ label: 'Wydłuż noc o godzinę', cb: () => { useWish('extend'); sfx('wish'); this.render(); this.say('Noc się wydłużyła. Masz jeszcze jedną godzinę.'); } });
    opts.push({ label: 'Później', cb: () => {} });
    dialog(this, `Odłamki życzeń: ${S.wishes}`, 'Odłamkiem możesz:\n· rozgonić chmury w wybranej godzinie,\n· przyciemnić niebo o 1 w wybranej godzinie\n(stuknij godzinę, opcje są na górze listy),\n· albo wydłużyć noc o godzinę.', opts, { stack: true });
  }

  // ---------- taras
  toggleLamps() {
    if (this.busy) return;
    S.lamps = !S.lamps; save(); this.render();
    toast(this, S.lamps ? 'Lampki zapalone. Od razu przytulniej.' : 'Lampki zgaszone. Taras w samym świetle gwiazd.', 190);
  }
  warm(what) {
    const c = S.cur;
    if (this.busy) return;
    if (what === 'dog') this.world.dogUp();
    if (season() === 1 && !c[what] && c.avail < BLOCKS && c.meteors === undefined) {
      c[what] = true; c.avail++; c.done = false; save(); this.render();
      toast(this, what === 'dog' ? 'Pies wtula się w kokon. Cieplej: +1 godzina.' : 'Gorąca herbata. Cieplej: +1 godzina.', 380);
    } else toast(this, what === 'dog' ? 'Pies macha ogonem przez sen.' : 'Łyk herbaty. Jest dobrze.', 380);
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
        if (canSend(n.id)) ov.add(button(this, W - 62, y + 20, 92, 28, 'Zaplanuj wysyłkę', () => { ov.destroy(); if (!S.cur.done) { this.assign(S.cur.b, 'send'); this.say('Tę godzinę kot spędzi na roznoszeniu zdjęć. Stuknij „Zacznij godzinę”.'); } this.render(); }, { size: 10, fill: 0x8a3a56, stroke: 0xe88a9a }).c);
        else ov.add(txt(this, W - 18, y + 20, 'jeszcze nie\nw albumie', { size: 9, ox: 1, oy: 0.5, align: 'right', color: '#6a7498' }));
      } else ov.add(txt(this, 58, y + 12, 'Wpada na taras co drugą noc. Kot przyniesie kolejny liścik.', { size: 10, color: '#6a7498', wrap: 280 }));
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
          const x0 = 20 + Math.random() * 300, y0 = 30 + Math.random() * 320, dx = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 80), dy = 40 + Math.random() * 60;
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
