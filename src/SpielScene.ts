import Phaser from 'phaser';
import {
  ABLAGE_FARBE,
  BODENFARBEN,
  FIGUR_FARBE,
  FIGUR_RADIUS,
  HINWEIS_SCHRIFT_PX,
  HUD_FARBE_NORMAL,
  HUD_FARBE_WARNUNG,
  HUD_SCHRIFT_PX,
  KACHEL_BREITE,
  KACHEL_HOEHE,
  MAX_ZEITSCHRITT_SEKUNDEN,
  MELDUNG_KNOPF_SCHRIFT_PX,
  MELDUNG_SCHRIFT_PX,
  MELDUNG_ZEIT_SCHRIFT_PX,
  OVERLAY_ABDUNKLUNG,
  START_FARBE,
  STUFEN_NAMEN,
  TIMER_WARNUNG_SEKUNDEN,
  TISCH_FARBE,
  TISCH_HOEHE,
  WAND_FARBE,
  WAND_HOEHE,
} from './config.ts';
import type { Stufe } from './config.ts';
import {
  ablegen,
  fortschreiben,
  istWarnung,
  nahAnAblage,
  neuerZustand,
  startzeit,
  zeitAufgerundet,
} from './spielzustand.ts';
import type { Spielzustand } from './spielzustand.ts';
import { auswahl } from './auswahl.ts';
import { schritt } from './bewegung.ts';
import type { Eingabe, Position } from './bewegung.ts';
import { BEREICH_ANZEIGE, KARTE, bereichAnZelle, zellArt } from './karte.ts';
import type { BereichName } from './karte.ts';
import { gitterZuBild } from './projektion.ts';

const TASTEN = 'W,A,S,D,UP,LEFT,DOWN,RIGHT';

function tonen(farbe: number, faktor: number): number {
  const r = Math.min(255, Math.round(((farbe >> 16) & 0xff) * faktor));
  const g = Math.min(255, Math.round(((farbe >> 8) & 0xff) * faktor));
  const b = Math.min(255, Math.round((farbe & 0xff) * faktor));
  return (r << 16) | (g << 8) | b;
}

export class SpielScene extends Phaser.Scene {
  // Zustand wird bei jedem Start der Szene in create() neu angelegt.
  private pos!: Position;
  private bereich!: BereichName;
  private tasten!: Record<string, Phaser.Input.Keyboard.Key>;
  private figur!: Phaser.GameObjects.Graphics;
  private folgeZiel!: Phaser.GameObjects.Zone;
  private raumText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private hinweisText!: Phaser.GameObjects.Text;
  private hinweisSichtbar = false;
  private ablegeTasten!: Phaser.Input.Keyboard.Key[];
  private zustand!: Spielzustand;
  private startSekunden = 0;

  constructor() {
    super('Spiel');
  }

  create(): void {
    const stufe = auswahl.stufe;
    if (stufe === null) {
      throw new Error('Spielszene ohne gewaehlte Stufe gestartet');
    }
    const kb = this.input.keyboard;
    if (kb === null) {
      throw new Error('Tastatur nicht verfuegbar');
    }

    // Frischer Zustand: Start, keine gedrueckten Tasten.
    this.pos = { x: KARTE.start[0] + 0.5, y: KARTE.start[1] + 0.5 };
    const startBereich = bereichAnZelle(KARTE, KARTE.start[0], KARTE.start[1]);
    if (startBereich === null) {
      throw new Error('Startzelle liegt in keinem Bereich');
    }
    this.bereich = startBereich;
    this.tasten = kb.addKeys(TASTEN, true) as Record<string, Phaser.Input.Keyboard.Key>;

    this.zeichneKarte();

    this.figur = this.add.graphics();
    const bild = gitterZuBild(this.pos.x, this.pos.y);
    this.folgeZiel = this.add.zone(bild.x, bild.y, 1, 1);

    const cam = this.cameras.main;
    cam.setBounds(
      -KARTE.hoehe * (KACHEL_BREITE / 2),
      -WAND_HOEHE,
      (KARTE.breite + KARTE.hoehe) * (KACHEL_BREITE / 2),
      (KARTE.breite + KARTE.hoehe) * (KACHEL_HOEHE / 2) + WAND_HOEHE,
    );
    cam.startFollow(this.folgeZiel, true, 1, 1);

    // Zustand und Eingabe frisch: keine haengende Taste, Timer voll, keine Meldung.
    kb.resetKeys();
    this.ablegeTasten = [kb.addKey(Phaser.Input.Keyboard.KeyCodes.E), kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)];
    this.startSekunden = startzeit(stufe, window.location.search);
    this.zustand = neuerZustand(this.startSekunden);
    this.hinweisSichtbar = false;

    this.baueAnzeige(stufe);
    this.zeichneFigur();
  }

  update(_zeit: number, delta: number): void {
    if (this.zustand.phase !== 'laeuft') return; // Sieg oder Niederlage: alles steht.

    // Der Timer laeuft mit der echten Bildzeit, die Bewegung mit der gekuerzten.
    this.zustand = fortschreiben(this.zustand, delta / 1000);
    this.zeigeTimer();
    if (this.zustand.phase !== 'laeuft') {
      this.zeigeMeldung();
      return;
    }

    const dt = Math.min(delta / 1000, MAX_ZEITSCHRITT_SEKUNDEN);
    const t = this.tasten;
    const eingabe: Eingabe = {
      links: t.A.isDown || t.LEFT.isDown,
      rechts: t.D.isDown || t.RIGHT.isDown,
      hoch: t.W.isDown || t.UP.isDown,
      runter: t.S.isDown || t.DOWN.isDown,
    };
    this.pos = schritt(KARTE, this.pos, eingabe, dt);

    const b = bereichAnZelle(KARTE, Math.floor(this.pos.x), Math.floor(this.pos.y));
    if (b !== null && b !== this.bereich) {
      this.bereich = b;
      this.raumText.setText(`Raum: ${BEREICH_ANZEIGE[b]}`);
    }
    this.zeichneFigur();

    const nah = nahAnAblage(KARTE, this.pos.x, this.pos.y);
    if (nah !== this.hinweisSichtbar) {
      this.hinweisSichtbar = nah;
      this.hinweisText.setVisible(nah);
    }
    if (this.ablegeTasten.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      this.zustand = ablegen(this.zustand, KARTE, this.pos.x, this.pos.y);
      if (this.zustand.phase === 'sieg') this.zeigeMeldung();
    }
  }

  private zeigeTimer(): void {
    this.timerText.setText(zeitAufgerundet(this.zustand.rest));
    this.timerText.setColor(istWarnung(this.zustand.rest, TIMER_WARNUNG_SEKUNDEN) ? HUD_FARBE_WARNUNG : HUD_FARBE_NORMAL);
  }

  // Abdunkeln, Meldung und zwei Knoepfe. Wird genau einmal je Spiel aufgerufen (danach laeuft update nicht mehr).
  private zeigeMeldung(): void {
    this.hinweisText.setVisible(false);
    this.zeigeTimer();
    const sieg = this.zustand.phase === 'sieg';
    const w = this.scale.width;
    const h = this.scale.height;
    this.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, OVERLAY_ABDUNKLUNG)
      .setScrollFactor(0)
      .setDepth(20000);
    const stil = { color: '#ffffff', stroke: '#000000', strokeThickness: 6 };
    this.add
      .text(w / 2, h / 2 - 110, sieg ? 'Kündigung abgelegt!' : 'Zeit abgelaufen!', {
        ...stil,
        fontSize: `${MELDUNG_SCHRIFT_PX}px`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    if (sieg) {
      this.add
        .text(w / 2, h / 2 - 50, `Übrige Zeit: ${zeitAufgerundet(this.zustand.rest)}`, {
          ...stil,
          fontSize: `${MELDUNG_ZEIT_SCHRIFT_PX}px`,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(20001);
    }
    this.baueKnopf(w / 2 - 110, h / 2 + 30, 190, sieg ? 'Nochmal' : 'Neustart', () => this.scene.restart());
    this.baueKnopf(w / 2 + 110, h / 2 + 30, 190, 'Zum Menü', () => this.scene.start('Menue'));
  }

  private baueKnopf(x: number, y: number, breite: number, beschriftung: string, aktion: () => void): void {
    const feld = this.add
      .rectangle(x, y, breite, 56, 0x335577)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(20001)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, beschriftung, { fontSize: `${MELDUNG_KNOPF_SCHRIFT_PX}px`, color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20002);
    feld.on('pointerover', () => feld.setFillStyle(0x4477aa));
    feld.on('pointerout', () => feld.setFillStyle(0x335577));
    feld.on('pointerdown', aktion);
  }

  private zeichneKarte(): void {
    const boden = this.add.graphics().setDepth(-1);
    for (let y = 0; y < KARTE.hoehe; y++) {
      for (let x = 0; x < KARTE.breite; x++) {
        const art = zellArt(KARTE, x, y);
        if (art === 'wand') {
          this.zeichneBlock(x, y, WAND_HOEHE, WAND_FARBE);
          continue;
        }
        if (art === 'tisch') {
          // Unter dem Tisch liegt Boden des Bereichs.
          this.zeichneBoden(boden, x, y, this.bodenFarbe(x, y));
          this.zeichneBlock(x, y, TISCH_HOEHE, TISCH_FARBE);
          continue;
        }
        let farbe = this.bodenFarbe(x, y);
        if (x === KARTE.ablage[0] && y === KARTE.ablage[1]) farbe = ABLAGE_FARBE;
        if (x === KARTE.start[0] && y === KARTE.start[1]) farbe = START_FARBE;
        this.zeichneBoden(boden, x, y, farbe);
      }
    }
  }

  private bodenFarbe(x: number, y: number): number {
    const b = bereichAnZelle(KARTE, x, y);
    return b === null ? BODENFARBEN.Tuer : BODENFARBEN[b];
  }

  private zeichneBoden(g: Phaser.GameObjects.Graphics, x: number, y: number, farbe: number): void {
    const n = gitterZuBild(x, y);
    const o = gitterZuBild(x + 1, y);
    const s = gitterZuBild(x + 1, y + 1);
    const w = gitterZuBild(x, y + 1);
    g.fillStyle(farbe, 1);
    g.fillPoints([n, o, s, w], true);
    g.lineStyle(1, tonen(farbe, 0.8), 1);
    g.strokePoints([n, o, s, w], true);
  }

  // Block mit Deckflaeche und zwei unterschiedlich getoenten Seitenflaechen.
  private zeichneBlock(x: number, y: number, hoehe: number, farbe: number): void {
    const g = this.add.graphics().setDepth(x + y + 1);
    const n = gitterZuBild(x, y);
    const o = gitterZuBild(x + 1, y);
    const s = gitterZuBild(x + 1, y + 1);
    const w = gitterZuBild(x, y + 1);
    const hoch = (p: Phaser.Types.Math.Vector2Like) => ({ x: p.x as number, y: (p.y as number) - hoehe });
    g.fillStyle(tonen(farbe, 0.7), 1);
    g.fillPoints([w, s, hoch(s), hoch(w)], true);
    g.fillStyle(tonen(farbe, 0.5), 1);
    g.fillPoints([s, o, hoch(o), hoch(s)], true);
    g.fillStyle(farbe, 1);
    g.fillPoints([hoch(n), hoch(o), hoch(s), hoch(w)], true);
    g.lineStyle(1, tonen(farbe, 0.35), 1);
    g.strokePoints([hoch(n), hoch(o), hoch(s), hoch(w)], true);
  }

  private zeichneFigur(): void {
    const bild = gitterZuBild(this.pos.x, this.pos.y);
    const g = this.figur;
    g.clear();
    g.setDepth(this.pos.x + this.pos.y);
    // Schatten: der Kollisionskreis in der Projektion.
    const rx = FIGUR_RADIUS * Math.SQRT2 * KACHEL_BREITE;
    const ry = FIGUR_RADIUS * Math.SQRT2 * KACHEL_HOEHE;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(bild.x, bild.y, rx, ry);
    g.fillStyle(FIGUR_FARBE, 1);
    g.fillRect(bild.x - 8, bild.y - 30, 16, 30);
    g.fillStyle(tonen(FIGUR_FARBE, 1.2), 1);
    g.fillCircle(bild.x, bild.y - 36, 8);
    this.folgeZiel.setPosition(bild.x, bild.y - 15);
  }

  private baueAnzeige(stufe: Stufe): void {
    const w = this.scale.width;
    const stil = { color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    this.raumText = this.add
      .text(10, 8, `Raum: ${BEREICH_ANZEIGE[this.bereich]}`, { ...stil, fontSize: '22px' })
      .setScrollFactor(0)
      .setDepth(10000);
    this.add
      .text(10, 38, `Stufe: ${STUFEN_NAMEN[stufe]} · Startzeit ${zeitAufgerundet(this.startSekunden)}`, {
        ...stil,
        fontSize: '14px',
      })
      .setScrollFactor(0)
      .setDepth(10000);
    this.timerText = this.add
      .text(w / 2, 6, zeitAufgerundet(this.zustand.rest), {
        ...stil,
        fontSize: `${HUD_SCHRIFT_PX}px`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10000);
    this.zeigeTimer();
    this.hinweisText = this.add
      .text(w / 2, this.scale.height - 14, 'E: Kündigung ablegen', { ...stil, fontSize: `${HINWEIS_SCHRIFT_PX}px` })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(10000)
      .setVisible(false);

    const zurueck = this.add
      .rectangle(w - 95, 28, 170, 36, 0x553333)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(w - 95, 28, 'Zurück zum Menü', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);
    zurueck.on('pointerdown', () => this.scene.start('Menue'));
  }
}
