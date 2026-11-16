// Muzyka i efekty generowane w przeglądarce (Web Audio), bez plików dźwiękowych.
// Dźwięk rusza dopiero po pierwszym dotknięciu ekranu, bo tak wymagają przeglądarki.
const MUTE_KEY = 'pod_kocem_gwiazd_mute';
let ctx = null, master = null, music = null, fx = null, noiseBuf = null, timer = null, nextChord = 0, chordNo = 0;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* tryb prywatny */ }

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
// spokojna kołysanka: a-moll 9, F-dur 7, C-dur 7, G z sekstą
const CHORDS = [[45, 52, 60, 64, 71], [41, 48, 57, 60, 64], [48, 55, 59, 64, 67], [43, 50, 59, 62, 64]];
const TWINKLE = [69, 72, 74, 76, 79, 81, 84, 88];
const CHORD_LEN = 8;

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* nic */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
  return muted;
}

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { ctx = new AC(); } catch { return; }
  master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  fx = ctx.createGain(); fx.gain.value = 0.5; fx.connect(master);
  // muzyka przechodzi przez filtr i pogłos z opóźnienia
  music = ctx.createGain(); music.gain.value = 0.42;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.42;
  const fb = ctx.createGain(); fb.gain.value = 0.38;
  music.connect(lp); lp.connect(master); lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  nextChord = ctx.currentTime + 0.3;
  timer = setInterval(schedule, 400);
  schedule();
}

function voice(dest, freq, t, dur, type, vol, attack, release) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}

function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  while (nextChord < ctx.currentTime + 1.2) {
    const ch = CHORDS[chordNo % CHORDS.length], t = nextChord;
    ch.forEach((m, i) => {
      voice(music, mtof(m), t, CHORD_LEN + 1.5, 'sine', i === 0 ? 0.11 : 0.055, 2.6, 3.2);
      if (i > 0) voice(music, mtof(m) * 1.004, t, CHORD_LEN + 1.5, 'triangle', 0.02, 3, 3.2);
    });
    // kilka pojedynczych „gwiazdek” w wysokim rejestrze
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const m = TWINKLE[Math.floor(Math.random() * TWINKLE.length)];
      voice(music, mtof(m), t + 0.5 + Math.random() * (CHORD_LEN - 1.5), 1.8, 'sine', 0.035 + Math.random() * 0.02, 0.02, 1.7);
    }
    nextChord += CHORD_LEN; chordNo++;
  }
}

function tone(freq, dur, o = {}) {
  const t = ctx.currentTime + (o.at || 0), osc = voice(fx, freq, t, dur, o.type || 'sine', o.vol ?? 0.2, o.attack ?? 0.005, dur * 0.8);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
}
function noise(dur, freq, vol, at = 0) {
  const t = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(fx);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}

const SFX = {
  tap: () => tone(620, 0.07, { vol: 0.12, to: 760 }),
  soft: () => tone(220, 0.28, { vol: 0.14, to: 150 }),
  collect: () => [880, 1108, 1318].forEach((f, i) => tone(f, 0.22, { at: i * 0.1, vol: 0.14 })),
  cloud: () => { noise(0.9, 400, 0.12); tone(160, 0.5, { vol: 0.08, to: 110 }); },
  link: () => { tone(988, 0.16, { vol: 0.14 }); tone(1480, 0.2, { at: 0.06, vol: 0.09 }); },
  found: () => [659, 784, 988, 1318, 1568].forEach((f, i) => tone(f, 0.3, { at: i * 0.08, vol: 0.13 })),
  jingle: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.45, { at: i * 0.13, vol: 0.15, type: 'triangle' })),
  stick: () => { noise(0.07, 1800, 0.25); tone(190, 0.12, { vol: 0.2, to: 120 }); },
  paper: () => { noise(0.22, 3200, 0.14); noise(0.18, 2400, 0.1, 0.16); },
  wish: () => { tone(1400, 0.9, { vol: 0.12, to: 2800 }); [2093, 2637, 3136].forEach((f, i) => tone(f, 0.5, { at: 0.15 + i * 0.12, vol: 0.07 })); },
  meow: () => { tone(620, 0.32, { vol: 0.1, to: 880, type: 'triangle' }); tone(880, 0.28, { at: 0.28, vol: 0.08, to: 560, type: 'triangle' }); },
  night: () => [784, 659, 523, 392].forEach((f, i) => tone(f, 0.6, { at: i * 0.22, vol: 0.12, type: 'triangle' })),
  birds: () => { for (let i = 0; i < 7; i++) tone(2400 + Math.random() * 1400, 0.09, { at: i * 0.17 + Math.random() * 0.08, vol: 0.06, to: 3200 + Math.random() * 1200 }); },
};
export function sfx(name) {
  if (!ctx || muted || ctx.state !== 'running' || !SFX[name]) return;
  try { SFX[name](); } catch { /* dźwięk nie może zatrzymać gry */ }
}
