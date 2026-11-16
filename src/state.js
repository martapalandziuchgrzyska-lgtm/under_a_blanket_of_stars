// Stan gry, zapis i reguły (ciemność, pogoda, prośby sąsiadów).
import { OBJ, NEIGHBORS, NB, seasonObjects, NIGHTS_PER_SEASON, BLOCKS, FORECAST_W, EVENTS, FULL_MOON_NIGHT, FEATS } from './data.js';

const KEY = 'pod_kocem_gwiazd_v1';
export let S = null;

export function hasSave() { try { return !!localStorage.getItem(KEY); } catch { return false; } }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* tryb prywatny */ } }
export function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1) newGame();
  return S;
}
export function newGame() {
  S = { v: 1, night: 0, obj: {}, nb: {}, lamps: true, feats: {}, gifts: [false, false, false, false], inbox: [], cur: null, intro: false, toasts: [] };
  for (const n of NEIGHBORS) S.nb[n.id] = { met: false, rel: 0, req: null, off: false, asks: 0 };
  save();
}

export const season = () => Math.floor(S.night / NIGHTS_PER_SEASON) % 4;
export const nightNo = () => S.night % NIGHTS_PER_SEASON;
export const year = () => Math.floor(S.night / (NIGHTS_PER_SEASON * 4));
export const ost = id => (S.obj[id] ??= { p: 0, streak: true, lastB: -99, album: null });
export const lightsOff = () => NEIGHBORS.filter(n => S.nb[n.id].off).length;
export const isFullMoon = () => nightNo() === FULL_MOON_NIGHT;
export const eventTonight = id => { const e = EVENTS[id]; return e.s === season() && (e.nights ? e.nights.includes(nightNo()) : e.night === nightNo()); };
export const eclipseNow = b => eventTonight('eclipse') && EVENTS.eclipse.blocks.includes(b);
export const twilight = b => season() === 3 && (b === 0 || b === BLOCKS - 1);

// Ciemność nieba w danym bloku: 1 + zgaszone światła, minus lampki i pełnia.
export function darkness(b = S.cur ? S.cur.b : 0) {
  if (twilight(b)) return 1;
  let d = 1 + lightsOff();
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
    avail: season() === 1 ? 6 : BLOCKS, tea: false, dog: false, mail: false, done: false, got: 0,
  };
  save();
}
export const shownForecast = i => (i <= S.cur.b + 1 ? S.cur.fore[i] : S.cur.early[i]);

// Dlaczego obiektu nie da się teraz zbierać (null = można)
export function blocked(id, b) {
  const o = OBJ[id];
  if (o.win && (b + 1 < o.win[0] || b + 1 > o.win[1])) return b + 1 < o.win[0] ? `za dachem do bloku ${o.win[0]}` : 'już zaszedł';
  if (twilight(b) && o.lvl > 1) return 'za jasno (zmierzch)';
  if (o.noMoon && isFullMoon()) return 'pełnia go zagłusza';
  if (o.lvl > darkness(b)) return `za jasno (trzeba ciemności ${o.lvl})`;
  return null;
}
export const maxP = id => OBJ[id].b + 2;

// Rozstrzyga bieżący blok. Zwraca opis wyniku do pokazania.
export function runBlock() {
  const c = S.cur, b = c.b, id = c.plan[b], act = c.act[b];
  let r = { kind: 'rest', act };
  if (id === 'comet' || id === 'eclipse') {
    if (act !== 'cloud') { r = { kind: 'event', id, act }; c.got++; feat(id); } else r = { kind: 'cloud', id, act };
  } else if (id) {
    const o = OBJ[id], st = ost(id);
    const why = blocked(id, b);
    if (why) r = { kind: 'blocked', id, why, act };
    else if (act === 'clear' || (act === 'thin' && o.lvl === 1)) {
      const gb = S.night * BLOCKS + b;
      if (st.p === 0) st.streak = true; else if (st.lastB !== gb - 1 || Math.floor(st.lastB / BLOCKS) !== S.night) st.streak = false;
      st.lastB = gb;
      st.p = Math.min(maxP(id), st.p + 1);
      const lucky = c.fore[b] === 'likely' && act === 'clear' && o.lvl > 1;
      if (lucky) feat('lucky');
      r = { kind: 'ok', id, act, lucky, ready: st.p >= o.b };
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
export function perfectNight() { return S.cur.avail === BLOCKS && S.cur.res.every(x => x === 'ok'); }
export function endNight() { S.night++; S.cur = null; save(); }

// ---------- liściki i prośby
function chooseRequest(n) {
  const taken = NEIGHBORS.map(m => S.nb[m.id].req).filter(Boolean);
  const st = S.nb[n.id];
  if (st.asks === 0 && n.first && OBJ[n.first].s === season() && !taken.includes(n.first)) return n.first;
  const max = 1 + lightsOff();
  const pool = seasonObjects(season()).filter(o => o.lvl <= max && !taken.includes(o.id));
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
export const canSend = nid => { const r = S.nb[nid].req; return !!(r && ost(r).album && ost(r).album.pasted); };
export function sendPhoto(nid) {
  const st = S.nb[nid], n = NB[nid];
  st.req = null; st.rel++;
  let ev = null;
  if (st.rel === 3) { st.off = true; S.inbox.push({ from: nid, text: n.off }); ev = 'off'; }
  else if (st.rel === 5) { S.inbox.push({ from: nid, text: n.guest }); ev = 'guest'; }
  save();
  return ev;
}
export const guests = () => NEIGHBORS.filter(n => S.nb[n.id].rel >= 5).map(n => n.id);

// ---------- album
export function develop(id, stars) {
  const st = ost(id), gold = st.streak && OBJ[id].b > 1;
  if (!st.album || stars > st.album.stars || (gold && !st.album.gold)) {
    st.album = { stars: Math.max(stars, st.album ? st.album.stars : 0), gold: gold || !!(st.album && st.album.gold), pasted: !!(st.album && st.album.pasted) };
  }
  if (gold) feat('streak');
  st.p = 0; st.streak = true; st.lastB = -99;
  if (S.cur) S.cur.got++;
  save();
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
