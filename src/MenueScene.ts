import Phaser from 'phaser';
import { STUFEN, STUFEN_NAMEN, TIMER_SEKUNDEN, zeitText } from './config.ts';
import { auswahl } from './auswahl.ts';

export class MenueScene extends Phaser.Scene {
  constructor() {
    super('Menue');
  }

  create(): void {
    const w = this.scale.width;
    this.add
      .text(w / 2, 90, 'I f***ing QUIT!', { fontSize: '48px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(w / 2, 150, 'Schwierigkeit wählen', { fontSize: '20px', color: '#aaaaaa' })
      .setOrigin(0.5);

    STUFEN.forEach((stufe, i) => {
      const y = 250 + i * 90;
      const feld = this.add
        .rectangle(w / 2, y, 320, 64, 0x335577)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(w / 2, y, `${STUFEN_NAMEN[stufe]}  ${zeitText(TIMER_SEKUNDEN[stufe])}`, {
          fontSize: '28px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      feld.on('pointerover', () => feld.setFillStyle(0x4477aa));
      feld.on('pointerout', () => feld.setFillStyle(0x335577));
      feld.on('pointerdown', () => {
        auswahl.stufe = stufe;
        this.scene.start('Spiel');
      });
    });
  }
}
