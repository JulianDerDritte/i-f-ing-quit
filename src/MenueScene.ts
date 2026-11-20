import Phaser from 'phaser';
import { MENUE_LAYOUT, MENUE_SPEICHER, RAHMEN, STUFEN, STUFEN_NAMEN, TIMER_SEKUNDEN, zeitText } from './config.ts';
import { auswahl } from './auswahl.ts';
import { holeSpeicher, ladeInfos, loescheSpeicher } from './speicher.ts';

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
    this.add.image(w / 2, L.logoY, 'logo').setDisplaySize(L.logoGroesse, L.logoGroesse);
    this.add
      .text(w / 2, L.titelY, 'Schwierigkeit wählen', { fontSize: `${L.titelPx}px`, color: '#aaaaaa' })
      .setOrigin(0.5);

    STUFEN.forEach((stufe, i) => {
      const y = L.stufeY0 + i * L.stufeAbstand;
      const feld = this.add
        .rectangle(w / 2, y, L.knopfBreite, L.knopfHoehe, L.farbe)
        .setStrokeStyle(RAHMEN.staerke, RAHMEN.farbe)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(w / 2, y, `${STUFEN_NAMEN[stufe]}  ${zeitText(TIMER_SEKUNDEN[stufe])}`, {
          fontSize: `${L.schriftPx}px`,
          color: '#ffffff',
        })
        .setOrigin(0.5);
      feld.on('pointerover', () => feld.setFillStyle(L.hoverFarbe));
      feld.on('pointerout', () => feld.setFillStyle(L.farbe));
      feld.on('pointerdown', () => {
        auswahl.stufe = stufe;
        this.scene.start('Spiel');
      });
    });

    // Gespeicherte Infos (aus frueheren Laeufen) und "Speicher löschen".
    const M = MENUE_SPEICHER;
    const speicher = holeSpeicher();
    const zahl = this.add
      .text(M.textX, M.y, `Gespeicherte Infos: ${ladeInfos(speicher).length}`, { fontSize: `${M.schriftPx}px`, color: '#aaaaaa' })
      .setOrigin(0, 0.5);
    const loeschen = this.add
      .rectangle(M.knopfX, M.y, M.knopfBreite, M.knopfHoehe, M.knopfFarbe)
      .setStrokeStyle(RAHMEN.staerke, RAHMEN.farbe)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(M.knopfX, M.y, 'Speicher löschen', { fontSize: `${M.knopfSchriftPx}px`, color: '#ffffff' })
      .setOrigin(0.5);
    loeschen.on('pointerover', () => loeschen.setFillStyle(M.knopfHoverFarbe));
    loeschen.on('pointerout', () => loeschen.setFillStyle(M.knopfFarbe));
    loeschen.on('pointerdown', () => {
      loescheSpeicher(speicher);
      zahl.setText(`Gespeicherte Infos: ${ladeInfos(speicher).length}`);
    });
  }
}
