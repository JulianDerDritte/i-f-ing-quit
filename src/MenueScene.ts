import Phaser from 'phaser';
import { STUFEN, STUFEN_NAMEN, TIMER_SEKUNDEN, zeitText } from './config.ts';
import { auswahl } from './auswahl.ts';

export class MenueScene extends Phaser.Scene {
  constructor() {
    super('Menue');
  }

  preload(): void {
    this.load.image('logo', `${import.meta.env.BASE_URL}logo.png`);
  }

  create(): void {
    const w = this.scale.width;
    this.add.image(w / 2, 140, 'logo').setDisplaySize(260, 260);
    this.add
      .text(w / 2, 300, 'Schwierigkeit wählen', { fontSize: '20px', color: '#aaaaaa' })
      .setOrigin(0.5);

    STUFEN.forEach((stufe, i) => {
      const y = 370 + i * 80;
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
