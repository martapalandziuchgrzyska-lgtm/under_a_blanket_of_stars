import Phaser from '../lib/phaser.esm.min.js';
import { buildWorld, buildObjects } from './art.js';
import { S, load, newGame, hasSave, season, nightNo } from './state.js';
import { SEASONS } from './data.js';
import { World } from './world.js';
import { NightScene } from './NightScene.js';
import { DevelopScene } from './DevelopScene.js';
import { AlbumScene } from './AlbumScene.js';
import { ScanScene } from './ScanScene.js';
import { DawnScene } from './DawnScene.js';
import { ConsScene } from './ConsScene.js';
import { setupAudio, toggleMute, isMuted } from './audio.js';
import { W, H, PY, setupCam, txt, button, dialog } from './ui.js';

class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    setupCam(this);
    buildWorld(this); buildObjects(this);
    const had = hasSave();
    load();
    const world = new World(this);
    world.garland.setTexture('garland_on'); world.twinkle.setVisible(true); world.lampGlow.setVisible(true); // na ekranie tytułowym lampki zawsze świecą
    this.add.rectangle(W / 2, (PY + H) / 2, W, H - PY, 0x0b1026);
    this.add.rectangle(W / 2, PY, W, 2, 0x4a3238);
    txt(this, W / 2, 70, 'Under a Blanket\nof Stars', { size: 32, ox: 0.5, style: '800', color: '#ffe9a8', align: 'center', ls: -2 });
    const mute = button(this, W - 40, H - 22, 64, 26, isMuted() ? '♪ wył.' : '♪ wł.', () => { toggleMute(); mute.setLabel(isMuted() ? '♪ wył.' : '♪ wł.'); }, { size: 11, fill: 0x1b2650 });
    const started = had && (S.night > 0 || S.intro);
    button(this, W / 2, PY + 54, 220, 44, started ? `Kontynuuj (${SEASONS[season()]}, noc ${nightNo() + 1})` : 'Wyjdź na taras', () => this.scene.start('Night'), { fill: 0x8a3a56, stroke: 0xe88a9a, size: 14 });
    if (started) button(this, W / 2, PY + 108, 220, 32, 'Nowa gra', () => dialog(this, 'Nowa gra', 'Zacząć od nowa? Album i znajomości z sąsiadami przepadną.', [{ label: 'Od nowa', cb: () => { newGame(); this.scene.start('Night'); } }, { label: 'Anuluj' }]), { size: 12 });
  }
}

// Fonty muszą być gotowe, zanim Phaser narysuje pierwszy tekst (z polskimi znakami).
const PL = 'aąćęłńóśźż ĄĆĘŁŃÓŚŹŻ';
await Promise.race([
  Promise.all(['600 12px Nunito', '800 12px Nunito', '12px "Patrick Hand"'].map(f => document.fonts.load(f, PL))).catch(() => {}),
  new Promise(r => setTimeout(r, 2500)),
]);

// przeglądarki pozwalają grać dźwięk dopiero po dotknięciu ekranu
setupAudio();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W * 2, height: H * 2,
  backgroundColor: '#070a18',
  pixelArt: true,
  audio: { noAudio: true }, // dźwięk robi src/audio.js; drugi kontekst audio przeszkadza na iOS
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene, NightScene, DevelopScene, AlbumScene, ScanScene, DawnScene, ConsScene],
});
window.__game = game; // do podglądania stanu w konsoli
