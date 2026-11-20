import Phaser from 'phaser';
import { MENUE_LAYOUT, MENUE_SPEICHER, PALETTE, STUFEN, STUFEN_NAMEN, SZENEN_TEXTE, UI_SKALA, TIMER_SEKUNDEN, zeitText } from './config.ts';
import { auswahl } from './auswahl.ts';
import { holeSpeicher, ladeInfos, loescheSpeicher } from './speicher.ts';
import { PixelText, knopfBauen, pixelTexteAufraeumen } from './grafik/pixeltext.ts';
import { rasterAlsTextur } from './grafik/texturen.ts';
import { menueHintergrund } from './grafik/ui.ts';
import { pixelSkala } from './grafik/schrift.ts';

export class MenueScene extends Phaser.Scene {
  constructor() {
    super('Menue');
  }

  preload(): void {
    this.load.image('logo', `${import.meta.env.BASE_URL}logo.png`);
  }

  create(): void {
    const w = this.scale.width;
    const L = MENUE_LAYOUT;
    // Dynamische Textur-Texte beim Ende der Szene freigeben.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => pixelTexteAufraeumen(this.textures));
    // Buerohintergrund (blau, Deckenlinien, Deckenlicht, Fenster, Fliesen mit Teppich) statt weissem Rechteck.
    rasterAlsTextur(this.textures, 'menue-bg', menueHintergrund());
    this.add.image(0, 0, 'menue-bg').setOrigin(0, 0).setScale(UI_SKALA).setDepth(-1);
    this.add.image(w / 2, L.logoY, 'logo').setDisplaySize(L.logoGroesse, L.logoGroesse);
    new PixelText(this, w / 2, L.titelY, SZENEN_TEXTE.menueTitel, { skala: pixelSkala(L.titelPx), farbe: 0xdfe6ff, rand: PALETTE.umriss, ox: 0.5, oy: 0.5 });

    STUFEN.forEach((stufe, i) => {
      const y = L.stufeY0 + i * L.stufeAbstand;
      knopfBauen(this, w / 2 - L.knopfBreite / 2, y - L.knopfHoehe / 2, L.knopfBreite, L.knopfHoehe, 'stufe', `${STUFEN_NAMEN[stufe]}  ${zeitText(TIMER_SEKUNDEN[stufe])}`, pixelSkala(L.schriftPx), 0, () => {
        auswahl.stufe = stufe;
        this.scene.start('Spiel');
      });
    });

    // Gespeicherte Infos (aus frueheren Laeufen) und "Speicher löschen".
    const M = MENUE_SPEICHER;
    const speicher = holeSpeicher();
    const zahl = new PixelText(this, M.textX, M.y, `${SZENEN_TEXTE.menueInfos}${ladeInfos(speicher).length}`, { skala: pixelSkala(M.schriftPx), farbe: 0xdfe6ff, rand: PALETTE.umriss, ox: 0, oy: 0.5 });
    knopfBauen(this, M.knopfX - M.knopfBreite / 2, M.y - M.knopfHoehe / 2, M.knopfBreite, M.knopfHoehe, 'speicher', SZENEN_TEXTE.menueLoeschen, pixelSkala(M.knopfSchriftPx), 0, () => {
      loescheSpeicher(speicher);
      zahl.setText(`${SZENEN_TEXTE.menueInfos}${ladeInfos(speicher).length}`);
    });
  }
}
