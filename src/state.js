// Stan gry, zapis i reguły (ciemność, pogoda, prośby sąsiadów).
import { OBJ, NEIGHBORS, NB, seasonObjects, NIGHTS_PER_SEASON, BLOCKS, FORECAST_W, EVENTS, FEATS, phaseOf, brightMoon, moonIndex, TALKS } from './data.js';

const KEY = 'pod_kocem_gwiazd_v1';
export let S = null;

export function hasSave() { try { return !!localStorage.getItem(KEY); } catch { return false; } }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* tryb prywatny */ } }
export function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 3) newGame();
  return S;
}
export function newGame() {
  S = { v: 3, night: 0, obj: {}, nb: {}, lamps: true, feats: {}, gifts: [false, false, false, false], inbox: [], cur: null, intro: false, toasts: [] };
  for (const n of NEIGHBORS) S.nb[n.id] = { met: false, rel: 0, req: null, off: false, asks: 0, sent: [], talks: 0 };
  save();
}

export const season = () => Math.floor(S.night / NIGHTS_PER_SEASON) % 4;
export const nightNo = () => S.night % NIGHTS_PER_SEASON;
export const year = () => Math.floor(S.night / (NIGHTS_PER_SEASON * 4));
// p: zebrane bloki światła (nie znikają po wywołaniu), found: czy obiekt jest namierzony (jasne widać od razu)
export const ost = id => (S.obj[id] ??= { p: 0, streak: true, gold: false, lastB: -99, album: null, found: OBJ[id].lvl === 1 });
export const lightsOff = () => NEIGHBORS.filter(n => S.nb[n.id].off).length;
export const moonPhase = () => phaseOf(nightNo()); // null = nów
export const isFullMoon = () => brightMoon(nightNo());
export const moonTex = () => 'moon' + moonIndex(nightNo());
export const eventTonight = id => { const e = EVENTS[id]; return e.s === season() && (e.nights ? e.nights.includes(nightNo()) : e.night === nightNo()); };
export const eclipseNow = b => eventTonight('eclipse') && EVENTS.eclipse.blocks.includes(b);
export const twilight = b => season() === 3 && (b === 0 || b === BLOCKS - 1);

// Ciemność nieba w danym bloku: 2 + zgaszone światła, minus lampki i jasny Księżyc.
export function darkness(b = S.cur ? S.cur.b : 0) {
  if (twilight(b)) return 1;
  let d = 2 + lightsOff();
  if (S.lamps) d -= 1;
  if (isFullMoon() && !eclipseNow(b)) d -= 1;
  return Math.max(1, d);
}

export function feat(id) {
  if (S.feats[id]) return false;
  S.feats[id] = true;
  S.toasts.push('Nowa naklejka w albumie: ' + FEATS.find(f => f.id === id).name);
  return true;
}

// ---------- noc
const pick = (w, r) => (r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2);
const F = ['clear', 'maybe', 'likely'];
export function startNight() {
  const w = FORECAST_W[season()];
  const fore = [], early = [], act = [];
  for (let i = 0; i < BLOCKS; i++) {
    const f = pick(w, Math.random());
    fore.push(F[f]);
    // wczesna prognoza bywa o jeden stopień obok ostatecznej
    const r = Math.random();
    early.push(F[Math.max(0, Math.min(2, f + (r < 0.2 ? -1 : r > 0.8 ? 1 : 0)))]);
    const a = Math.random();
    act.push(f === 0 ? (a < 0.9 ? 'clear' : 'thin') : f === 1 ? (a < 0.5 ? 'clear' : a < 0.8 ? 'thin' : 'cloud') : (a < 0.22 ? 'clear' : a < 0.5 ? 'thin' : 'cloud'));
  }
  // nowa pora roku: prośby o obiekty, których już nie widać, wracają do sąsiadów (napiszą o coś innego)
  for (const n of NEIGHBORS) { const st = S.nb[n.id]; if (st.req && OBJ[st.req].s !== season() && !(ost(st.req).album && ost(st.req).album.pasted)) st.req = null; }
  if (S.night === 0) { fore[0] = early[0] = act[0] = 'clear'; fore[1] = 'clear'; act[1] = 'clear'; }
  S.cur = {
    fore, early, act, b: 0, plan: Array(BLOCKS).fill(null), res: Array(BLOCKS).fill(null),
    avail: season() === 1 ? 6 : BLOCKS, tea: false, dog: false, mail: false, done: false, got: 0, talked: {},
  };
  save();
}
export const shownForecast = i => (i <= S.cur.b + 1 ? S.cur.fore[i] : S.cur.early[i]);

// Dlaczego obiektu nie da się teraz zbierać (null = można)
export function blocked(id, b) {
  const o = OBJ[id];
  if (id === 'moon' && !moonPhase()) return 'nów, Księżyca nie widać';
  if (!ost(id).found) return 'nieodkryty, przeskanuj niebo';
  if (ost(id).p >= maxP(id)) return 'masz już komplet światła';
  if (o.win && (b + 1 < o.win[0] || b + 1 > o.win[1])) return b + 1 < o.win[0] ? `za dachem do bloku ${o.win[0]}` : 'już zaszedł';
  if (twilight(b) && o.lvl > 1) return 'za jasno (zmierzch)';
  if (o.noMoon && isFullMoon()) return 'pełnia go zagłusza';
  if (o.lvl > darkness(b)) return `za jasno (trzeba ciemności ${o.lvl})`;
  return null;
}
// Światło układa się w progi: b bloków = 1 gwiazdka, 2b = 2, 3b = 3 (komplet).
export const maxP = id => OBJ[id].b * 3;
export const tier = id => Math.min(3, Math.floor(ost(id).p / OBJ[id].b));
export const canDevelop = id => tier(id) > (ost(id).album ? ost(id).album.stars : 0);

// Rozstrzyga bieżący blok. Zwraca opis wyniku do pokazania.
export function runBlock() {
  const c = S.cur, b = c.b, id = c.plan[b], act = c.act[b];
  let r = { kind: 'rest', act };
  if (id === 'comet' || id === 'eclipse' || id === 'phase') {
    const fid = id === 'phase' ? (moonPhase() || {}).id : id;
    if (act !== 'cloud' && fid) { r = { kind: 'event', id, act }; c.got++; feat(fid); } else r = { kind: 'cloud', id, act };
  } else if (id) {
    const o = OBJ[id], st = ost(id);
    const why = blocked(id, b);
    if (why) r = { kind: 'blocked', id, why, act };
    else if (act === 'clear' || (act === 'thin' && o.lvl === 1)) {
      const gb = S.night * BLOCKS + b;
      if (st.p === 0) st.streak = true; else if (st.lastB !== gb - 1 || Math.floor(st.lastB / BLOCKS) !== S.night) st.streak = false;
      st.lastB = gb;
      const before = tier(id), gain = darkness(b) >= o.lvl + 3 ? 2 : 1; // bardzo ciemne niebo: podwójne światło
      if (st.p < o.b && st.p + gain >= o.b) st.gold = st.streak && o.b > 1;
      st.p = Math.min(maxP(id), st.p + gain);
      if (id === 'moon' && moonPhase()) feat(moonPhase().id);
      const lucky = c.fore[b] === 'likely' && act === 'clear' && o.lvl > 1;
      if (lucky) feat('lucky');
      r = { kind: 'ok', id, act, lucky, gain, ready: tier(id) > before && canDevelop(id) };
    } else { r = { kind: 'cloud', id, act }; if (st.p > 0) st.streak = false; }
  }
  c.res[b] = r.kind === 'ok' || r.kind === 'event' ? 'ok' : r.kind === 'rest' ? 'rest' : 'cloud';
  c.b++;
  if (c.b >= c.avail) c.done = true;
  save();
  return r;
}
// Blok spędzony na wywoływaniu zdjęcia (pogoda nie ma znaczenia) liczy się jako udany.
export function devBlockDone() {
  const c = S.cur;
  if (!c || c.done) return;
  c.res[c.b] = 'ok'; c.b++;
  if (c.b >= c.avail) c.done = true;
  save();
}
// ---------- skanowanie nieba: namierzanie nieodkrytych obiektów
export const scanCandidates = b => seasonObjects(season()).filter(o => !ost(o.id).found && o.lvl <= darkness(b));
function closeBlock(res) { const c = S.cur; c.res[c.b] = res; c.b++; if (c.b >= c.avail) c.done = true; save(); }
export function scanDone(id) { ost(id).found = true; if (S.cur && !S.cur.done) closeBlock('ok'); else save(); }
export function scanClouded() { closeBlock('cloud'); }
export function perfectNight() { return S.cur.avail === BLOCKS && S.cur.res.every(x => x === 'ok'); }
export function endNight() { S.night++; S.cur = null; save(); }

// ---------- liściki i prośby
// Sąsiad nigdy nie prosi drugi raz o to samo. Najpierw o zdjęcia, których jeszcze nie masz.
function chooseRequest(n) {
  const taken = NEIGHBORS.map(m => S.nb[m.id].req).filter(Boolean);
  const st = S.nb[n.id];
  const free = id => !taken.includes(id) && !st.sent.includes(id);
  if (st.asks === 0 && n.first && OBJ[n.first].s === season() && free(n.first)) return n.first;
  const max = 2 + lightsOff();
  const pool = seasonObjects(season()).filter(o => o.lvl <= max && free(o.id));
  const tiers = [o => n.likes.includes(o.type) && !ost(o.id).album, o => !ost(o.id).album, o => n.likes.includes(o.type), () => true];
  for (const t of tiers) { const c = pool.filter(t); if (c.length) return c[Math.floor(Math.random() * c.length)].id; }
  return null;
}
// Kot wraca z liścikami: nowi sąsiedzi i nowe prośby. Zapalone lampki = jeden liścik więcej.
export function deliverMail() {
  if (S.cur.mail) return 0;
  S.cur.mail = true;
  let left = S.lamps ? 3 : 2, n0 = S.inbox.length;
  // najpierw piszą ci, których znasz najsłabiej (nowi sąsiedzi nie czekają w kolejce)
  const order = [...NEIGHBORS].sort((a, b) => (S.nb[a.id].met ? S.nb[a.id].rel : -1) - (S.nb[b.id].met ? S.nb[b.id].rel : -1));
  for (const n of order) {
    const st = S.nb[n.id];
    if (left <= 0 || S.night < n.from || st.req) continue;
    const req = chooseRequest(n);
    if (!req) continue;
    let text = n.ask[st.asks % n.ask.length].replace('{o}', OBJ[req].name);
    if (!st.met) { st.met = true; text = n.hello + '\n\n' + text; }
    st.req = req; st.asks++; left--;
    S.inbox.push({ from: n.id, text });
  }
  save();
  return S.inbox.length - n0;
}
// +1 serce; przy 2 sąsiad gasi światło, przy 3 zaczyna wpadać na taras
function bumpRel(nid) {
  const st = S.nb[nid], n = NB[nid];
  st.rel++;
  if (st.rel === 2) { st.off = true; S.inbox.push({ from: nid, text: n.off }); return 'off'; }
  if (st.rel === 3) { S.inbox.push({ from: nid, text: n.guest }); return 'guest'; }
  return null;
}
export const canSend = nid => { const r = S.nb[nid].req; return !!(r && ost(r).album && ost(r).album.pasted); };
export function sendPhoto(nid) {
  const st = S.nb[nid], n = NB[nid];
  st.sent.push(st.req); st.req = null;
  const ev = bumpRel(nid);
  save();
  return ev;
}
// Kto dziś siedzi na tarasie: w noce wydarzeń wszyscy znajomi, poza tym co drugą noc, gdy palą się lampki
export function guests() {
  const party = eventTonight('perseids') || eventTonight('comet');
  return NEIGHBORS.filter((n, i) => (party ? S.nb[n.id].met : S.lamps && S.nb[n.id].rel >= 3 && (S.night + i) % 2 === 0)).map(n => n.id);
}

// ---------- bloki bez teleskopu: poczta, wysyłka zdjęć, rozmowa z gościem
export function mailBlock() { const notes = S.inbox.splice(0); closeBlock('ok'); return notes; }
export function sendBlock() {
  const out = [];
  for (const n of NEIGHBORS) if (canSend(n.id)) { const obj = S.nb[n.id].req; out.push({ nb: n.id, obj, ev: sendPhoto(n.id) }); }
  closeBlock('ok');
  return out;
}
export const canTalk = nid => guests().includes(nid) && !S.cur.talked[nid];
export function talkBlock(nid) {
  const st = S.nb[nid], line = TALKS[nid][st.talks % TALKS[nid].length];
  st.talks++; S.cur.talked[nid] = true;
  const ev = st.talks <= 4 ? bumpRel(nid) : null; // pierwsze rozmowy zbliżają
  closeBlock('ok');
  return { line, ev };
}

// ---------- album
// Wywołane zdjęcie: gwiazdki nie przekroczą progu zebranego światła. Lepsza odbitka sama podmienia naklejkę.
export function develop(id, stars) {
  const st = ost(id), was = st.album;
  stars = Math.max(1, Math.min(stars, tier(id)));
  st.album = { stars: Math.max(stars, was ? was.stars : 0), gold: st.gold || !!(was && was.gold), pasted: !!(was && was.pasted) };
  if (st.album.gold) feat('streak');
  if (S.cur) S.cur.got++;
  save();
  return { stars, upgrade: !!(was && was.pasted) };
}
export function paste(id) {
  ost(id).album.pasted = true;
  feat('first');
  const s = OBJ[id].s;
  let gift = null;
  if (!S.gifts[s] && seasonObjects(s).every(o => ost(o.id).album && ost(o.id).album.pasted)) { S.gifts[s] = true; gift = s; }
  save();
  return gift;
}
export const unpasted = () => Object.keys(S.obj).filter(id => S.obj[id].album && !S.obj[id].album.pasted);
