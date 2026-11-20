import Phaser from 'phaser';
import { STUFEN_NAMEN, TIMER_SEKUNDEN, zeitText } from './config';
import { auswahl } from './auswahl';

export class SpielScene extends Phaser.Scene {
  constructor() {
    super('Spiel');
  }

  create(): void {
    const stufe = auswahl.stufe;
    if (stufe === null) {
      throw new Error('Spielszene ohne gewaehlte Stufe gestartet');
    }
    const w = this.scale.width;
    this.add.text(w / 2, 120, 'Platzhalter-Spielszene', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(w / 2, 220, `Stufe: ${STUFEN_NAMEN[stufe]}`, { fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(w / 2, 270, `Startzeit: ${zeitText(TIMER_SEKUNDEN[stufe])}`, { fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);

    const zurueck = this.add
      .rectangle(w / 2, 420, 320, 64, 0x553333)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add.text(w / 2, 420, 'Zurück zum Menü', { fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
    zurueck.on('pointerdown', () => this.scene.start('Menue'));
  }
}
