import Phaser from 'phaser';
import {
  ABLAGE_FARBE,
  BODENFARBEN,
  DIALOG_ANTWORT_SCHRIFT_PX,
  DIALOG_FENSTER_FARBE,
  DIALOG_KNOPF_FARBE,
  DIALOG_KNOPF_HOVER_FARBE,
  DIALOG_KOSTEN_FARBE,
  DIALOG_KOSTEN_SCHRIFT_PX,
  DIALOG_NAME_FARBE,
  DIALOG_NAME_SCHRIFT_PX,
  DIALOG_RAHMEN_FARBE,
  DIALOG_TEXT_SCHRIFT_PX,
  DIALOG_TIEFE,
  FIGUR_FARBE,
  FIGUR_RADIUS,
  DIALOG_MAX_ANTWORTEN,
  HINWEIS_SCHRIFT_PX,
  HUD_FARBE_NORMAL,
  HUD_FARBE_WARNUNG,
  HUD_SCHRIFT_PX,
  HUD_TIEFE,
  INVENTAR_FENSTER_FARBE,
  INVENTAR_KNOPF,
  INVENTAR_SCHRIFT_PX,
  INVENTAR_TIEFE,
  INVENTAR_TITEL_FARBE,
  INVENTAR_TITEL_SCHRIFT_PX,
  KACHEL_BREITE,
  KACHEL_HOEHE,
  KAFFEE_HINWEIS_TEXT,
  KAFFEE_HUD,
  MASCHINE_FARBE,
  MASCHINE_HOEHE,
  MASCHINE_SCHRIFT_PX,
  MAX_ZEITSCHRITT_SEKUNDEN,
  MELDUNG_KNOPF_SCHRIFT_PX,
  MELDUNG_SCHRIFT_PX,
  MELDUNG_ZEIT_SCHRIFT_PX,
  NPC_DIALOG_KOSTEN,
  NPC_FARBEN,
  NPC_RADIUS,
  NPC_SCHRIFT_PX,
  OVERLAY_ABDUNKLUNG,
  START_FARBE,
  STUFEN_NAMEN,
  TIMER_WARNUNG_SEKUNDEN,
  TISCH_FARBE,
  TISCH_HOEHE,
  VERSCHUETTET_MELDUNG,
  WAND_FARBE,
  WAND_HOEHE,
  zeitText,
} from './config.ts';
import type { NpcId, Stufe } from './config.ts';
import {
  abziehen,
  dialogBeenden,
  fortschreiben,
  inventarOeffnen,
  inventarSchliessen,
  nachfrageAbziehen,
  istWarnung,
  nahAnAblage,
  startzeit,
  zeitAufgerundet,
} from './spielzustand.ts';
import type { Spielzustand } from './spielzustand.ts';
import { aktionsTaste, kaffeeNachAntwort, nahAnKaffee } from './kaffee.ts';
import { ausGespraech, inventarRechtecke, inventarSeiten, mitKaffee } from './inventar.ts';
import type { Inventar } from './inventar.ts';
import { neuerLauf } from './lauf.ts';
import { holeSpeicher, speichereInventar } from './speicher.ts';
import type { SpeicherQuelle } from './speicher.ts';
import { NPCS, kontaktNpc, markiereGesprochen, npcPosition, npcsFortschreiben } from './npcs.ts';
import type { NpcWelt } from './npcs.ts';
import {
  aktuellerKnoten,
  angeboteneAntworten,
  antworte,
  antwortBeschriftung,
  dialogRechtecke,
  istBeendet,
  kostenZeile,
  nachfrageKosten,
  starteGespraech,
} from './dialog.ts';
import type { DialogZustand } from './dialog.ts';
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
  private hinweisArt: 'keiner' | 'ablage' | 'kaffee' = 'keiner';
  private ablegeTasten!: Phaser.Input.Keyboard.Key[];
  private inventarTaste!: Phaser.Input.Keyboard.Key;
  private escTaste!: Phaser.Input.Keyboard.Key;
  private zustand!: Spielzustand;
  private startSekunden = 0;
  private welt!: NpcWelt;
  private npcGrafiken: Phaser.GameObjects.Graphics[] = [];
  private npcNamen: Phaser.GameObjects.Text[] = [];
  private dialog: DialogZustand | null = null;
  private dialogObjekte: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[] = []; // alle Teile des Dialogfensters (nur ein-/ausgeblendet)
  private dialogName!: Phaser.GameObjects.Text;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogKosten!: Phaser.GameObjects.Text;
  private antwortFelder: Phaser.GameObjects.Rectangle[] = [];
  private antwortTexte: Phaser.GameObjects.Text[] = [];
  private dialogFenster!: Phaser.GameObjects.Rectangle;
  private kaffee = false; // wird gerade Kaffee getragen?
  private inventar!: Inventar;
  private speicher: SpeicherQuelle | null = null;
  private kaffeeSymbol!: Phaser.GameObjects.Rectangle;
  private kaffeeText!: Phaser.GameObjects.Text;
  private verschuettetText!: Phaser.GameObjects.Text;
  private verschuettetRest = 0; // Restdauer der Meldung in Sekunden (echte Zeit, kein Zeitgeber)
  private inventarObjekte: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[] = [];
  private inventarKnoepfe: Phaser.GameObjects.Rectangle[] = [];
  private inventarInfoText!: Phaser.GameObjects.Text;
  private inventarGegenText!: Phaser.GameObjects.Text;
  private inventarAnzeige!: Phaser.GameObjects.Text;
  private inventarSeitenTexte: string[] = [];
  private inventarSeite = 0;

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
    this.inventarTaste = kb.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.escTaste = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.startSekunden = startzeit(stufe, window.location.search);
    this.hinweisArt = 'keiner';

    // Lauf frisch: Timer voll, NPCs am Start (keiner gesprochen), kein Kaffee, Inventar = gespeicherte Infos.
    this.speicher = holeSpeicher();
    const lauf = neuerLauf(this.startSekunden, this.speicher);
    this.zustand = lauf.zustand;
    this.welt = lauf.welt;
    this.kaffee = lauf.kaffee;
    this.inventar = lauf.inventar;
    this.dialog = null;
    this.verschuettetRest = 0;
    this.inventarSeitenTexte = [];
    this.inventarSeite = 0;
    this.npcGrafiken = NPCS.map(() => this.add.graphics());
    this.npcNamen = NPCS.map((d) =>
      this.add
        .text(0, 0, d.name, { fontSize: `${NPC_SCHRIFT_PX}px`, color: '#ffffff', stroke: '#000000', strokeThickness: 3 })
        .setOrigin(0.5, 1),
    );

    this.baueAnzeige(stufe);
    this.baueDialogFenster();
    this.baueInventarFenster();
    this.zeichneFigur();
    this.zeichneNpcs();
  }

  update(_zeit: number, delta: number): void {
    this.meldungZaehlen(delta / 1000);
    // I und Escape werden in jedem Bild gelesen (auch wenn sie nichts tun), damit kein Druck liegen bleibt.
    const iDruck = Phaser.Input.Keyboard.JustDown(this.inventarTaste);
    const escDruck = Phaser.Input.Keyboard.JustDown(this.escTaste);
    if (this.zustand.phase === 'inventar') {
      if (iDruck || escDruck) this.schliesseInventar(); // Timer, Figur und NPCs stehen, bis das Fenster zu ist.
      return;
    }
    if (this.zustand.phase !== 'laeuft') return; // Gespraech, Sieg oder Niederlage: alles steht.
    if (iDruck) {
      this.oeffneInventar();
      return;
    }

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
    this.welt = npcsFortschreiben(this.welt, dt, this.zustand.phase);
    this.zeichneNpcs();

    const b =bereichAnZelle(KARTE, Math.floor(this.pos.x), Math.floor(this.pos.y));
    if (b !== null && b !== this.bereich) {
      this.bereich = b;
      this.raumText.setText(`Raum: ${BEREICH_ANZEIGE[b]}`);
    }
    this.zeichneFigur();

    // Hinweis: an der Ablage hat sie Vorrang; an der Maschine nur, solange kein Kaffee getragen wird.
    const art = nahAnAblage(KARTE, this.pos.x, this.pos.y)
      ? 'ablage'
      : !this.kaffee && nahAnKaffee(KARTE, this.pos.x, this.pos.y)
        ? 'kaffee'
        : 'keiner';
    this.setzeHinweis(art);
    if (this.ablegeTasten.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      const erg = aktionsTaste(this.zustand, this.kaffee, KARTE, this.pos.x, this.pos.y);
      this.zustand = erg.zustand;
      this.setzeKaffee(erg.kaffee);
      this.zeigeTimer();
      if (this.zustand.phase === 'sieg' || this.zustand.phase === 'niederlage') {
        this.zeigeMeldung();
        return;
      }
    }

    const kontakt = kontaktNpc(this.welt, this.pos.x, this.pos.y, this.zustand.phase);
    if (kontakt !== null) this.oeffneDialog(kontakt);
  }

  // Meldung "Kaffee verschüttet!" laeuft nach echter Zeit ab, in jeder Phase (kein Zeitgeber, der einen Neustart ueberlebt).
  private meldungZaehlen(dt: number): void {
    if (this.verschuettetRest <= 0) return;
    this.verschuettetRest -= dt;
    if (this.verschuettetRest <= 0) this.verschuettetText.setVisible(false);
  }

  private setzeHinweis(art: 'keiner' | 'ablage' | 'kaffee'): void {
    if (art === this.hinweisArt) return;
    this.hinweisArt = art;
    if (art === 'ablage') this.hinweisText.setText('E: Kündigung ablegen');
    if (art === 'kaffee') this.hinweisText.setText(KAFFEE_HINWEIS_TEXT);
    this.hinweisText.setVisible(art !== 'keiner');
  }

  // Kaffee getragen oder nicht: HUD und Gegenstaende folgen.
  private setzeKaffee(kaffee: boolean): void {
    if (kaffee === this.kaffee) return;
    this.kaffee = kaffee;
    this.inventar = mitKaffee(this.inventar, kaffee);
    this.kaffeeSymbol.setVisible(kaffee);
    this.kaffeeText.setVisible(kaffee);
  }

  // Schreibt das Inventar (Infos und Gegenstaende) in den Speicher; scheitert das, laeuft das Spiel ohne Speichern weiter.
  private speichere(): void {
    speichereInventar(this.speicher, mitKaffee(this.inventar, this.kaffee));
  }

  // Neue Infos aus dem Gespraech ins Inventar und sofort in den Speicher.
  private inventarAbgleichen(dialog: DialogZustand): void {
    const neu = ausGespraech(this.inventar, dialog);
    if (neu === this.inventar) return;
    this.inventar = neu;
    this.speichere();
  }

  private zumMenue(): void {
    this.speichere();
    this.scene.start('Menue');
  }

  private oeffneInventar(): void {
    this.zustand = inventarOeffnen(this.zustand);
    if (this.zustand.phase !== 'inventar') return;
    this.setzeHinweis('keiner');
    this.inventarSeitenTexte = inventarSeiten(this.inventar);
    this.inventarSeite = 0;
    this.inventarGegenText.setText(`Gegenstände: ${this.inventar.gegenstaende.join(', ')}`);
    this.inventarObjekte.forEach((o) => o.setVisible(true));
    this.inventarKnoepfe.forEach((k) => {
      if (k.input) k.input.enabled = true;
    });
    this.zeigeInventarSeite();
  }

  private schliesseInventar(): void {
    this.zustand = inventarSchliessen(this.zustand);
    this.inventarObjekte.forEach((o) => o.setVisible(false));
    this.inventarKnoepfe.forEach((k) => {
      if (k.input) k.input.enabled = false;
    });
    // Eine waehrend des Fensters gedrueckte E-/Leertaste soll nicht nachtraeglich wirken.
    this.ablegeTasten.forEach((k) => Phaser.Input.Keyboard.JustDown(k));
  }

  private zeigeInventarSeite(): void {
    const n = this.inventarSeitenTexte.length;
    this.inventarInfoText.setText(this.inventarSeitenTexte[this.inventarSeite]);
    this.inventarAnzeige.setText(`Seite ${this.inventarSeite + 1} von ${n}`);
  }

  private blaettere(richtung: number): void {
    if (this.zustand.phase !== 'inventar') return;
    const neu = this.inventarSeite + richtung;
    if (neu < 0 || neu >= this.inventarSeitenTexte.length) return;
    this.inventarSeite = neu;
    this.zeigeInventarSeite();
  }

  // Kontakt: Kosten sofort abziehen; reicht die Zeit nicht mehr, ist das Spiel verloren (kein Fenster).
  private oeffneDialog(id: NpcId): void {
    const def = NPCS.find((d) => d.id === id);
    if (def === undefined) throw new Error(`NPC ${id} unbekannt`);
    markiereGesprochen(this.welt, id);
    this.zustand = abziehen(this.zustand, NPC_DIALOG_KOSTEN[id]);
    this.setzeHinweis('keiner');
    this.zeigeTimer();
    if (this.zustand.phase === 'niederlage') {
      this.zeigeMeldung();
      return;
    }
    this.dialog = starteGespraech(def.dialogId);
    this.dialogName.setText(def.name);
    this.dialogKosten.setText(kostenZeile(zeitText(NPC_DIALOG_KOSTEN[id])));
    this.dialogObjekte.forEach((o) => o.setVisible(true));
    this.zeigeKnoten();
  }

  // Zeigt Text und Antworten des aktuellen Knotens; nicht benoetigte Antwortfelder sind aus und nicht klickbar.
  private zeigeKnoten(): void {
    if (this.dialog === null) return;
    const k = aktuellerKnoten(this.dialog);
    if (k === null) return;
    const angeboten = angeboteneAntworten(this.dialog, this.kaffee);
    const r = dialogRechtecke(angeboten.length);
    // Das Fenster waechst nach oben, wenn mehr als 3 Antworten angeboten werden: alle Teile folgen dem Layout.
    this.dialogFenster.setPosition(r.fenster.x + r.fenster.breite / 2, r.fenster.y + r.fenster.hoehe / 2);
    this.dialogFenster.setSize(r.fenster.breite, r.fenster.hoehe);
    this.dialogName.setPosition(r.name.x, r.name.y);
    this.dialogText.setPosition(r.text.x, r.text.y);
    this.dialogKosten.setPosition(r.kosten.x, r.kosten.y);
    this.dialogText.setText(k.text);
    for (let i = 0; i < this.antwortFelder.length; i++) {
      const feld = this.antwortFelder[i];
      const text = this.antwortTexte[i];
      const an = i < angeboten.length;
      feld.setVisible(an);
      text.setVisible(an);
      if (feld.input) feld.input.enabled = an;
      if (an) {
        const kr = r.knoepfe[i];
        feld.setPosition(kr.x + kr.breite / 2, kr.y + kr.hoehe / 2);
        text.setPosition(kr.x + 12, kr.y + kr.hoehe / 2);
        text.setText(antwortBeschriftung(this.dialog, angeboten[i].antwort));
      }
    }
  }

  // Slot = Platz des Knopfs im Fenster; der echte Antwortindex kommt aus den angebotenen Antworten.
  private waehleAntwort(slot: number): void {
    if (this.dialog === null || this.zustand.phase !== 'dialog') return;
    const gewaehlt = angeboteneAntworten(this.dialog, this.kaffee)[slot];
    if (gewaehlt === undefined) return;
    const kosten = nachfrageKosten(this.dialog, gewaehlt.index);
    const neu = antworte(this.dialog, gewaehlt.index, this.kaffee);
    if (neu === this.dialog) return;
    this.dialog = neu;
    // Verschuetten oder Uebergabe: der Kaffee ist weg; bei der Handbewegung erscheint die Meldung.
    const hatteKaffee = this.kaffee;
    this.setzeKaffee(kaffeeNachAntwort(this.kaffee, neu));
    if (hatteKaffee && !this.kaffee && neu.kaffeeWeg === 'verschuettet') this.zeigeVerschuettet();
    this.inventarAbgleichen(neu);
    if (kosten !== null) {
      // Nachfrage: Kosten sofort abziehen; reicht die Zeit nicht, ist das Spiel verloren (Meldung statt Fenster).
      this.zustand = nachfrageAbziehen(this.zustand, kosten);
      this.zeigeTimer();
      if (this.zustand.phase === 'niederlage') {
        this.dialog = null;
        this.dialogObjekte.forEach((o) => o.setVisible(false));
        this.antwortFelder.forEach((f) => {
          if (f.input) f.input.enabled = false;
        });
        this.zeigeMeldung();
        return;
      }
    }
    if (istBeendet(this.dialog)) this.schliesseDialog();
    else this.zeigeKnoten();
  }

  // Gespraechsende: Fenster aus, Timer laeuft weiter; Bewegung liest wieder den echten Tastenzustand.
  private schliesseDialog(): void {
    this.dialog = null;
    this.dialogObjekte.forEach((o) => o.setVisible(false));
    this.antwortFelder.forEach((f) => {
      if (f.input) f.input.enabled = false;
    });
    this.zustand = dialogBeenden(this.zustand);
    // Eine waehrend des Gespraechs gedrueckte E-/Leertaste soll nicht nachtraeglich ablegen.
    this.ablegeTasten.forEach((k) => Phaser.Input.Keyboard.JustDown(k));
  }

  private baueDialogFenster(): void {
    const r = dialogRechtecke(DIALOG_MAX_ANTWORTEN); // Platz fuer alle Knoepfe; zeigeKnoten stellt je Knoten das Layout ein
    const f = r.fenster;
    this.dialogObjekte = [];
    this.antwortFelder = [];
    this.antwortTexte = [];
    const tiefe = DIALOG_TIEFE;
    const mitte = (q: { x: number; y: number; breite: number; hoehe: number }) => ({
      x: q.x + q.breite / 2,
      y: q.y + q.hoehe / 2,
    });
    const fm = mitte(f);
    this.dialogFenster = this.add
      .rectangle(fm.x, fm.y, f.breite, f.hoehe, DIALOG_FENSTER_FARBE)
      .setStrokeStyle(2, DIALOG_RAHMEN_FARBE)
      .setScrollFactor(0)
      .setDepth(tiefe);
    this.dialogObjekte.push(this.dialogFenster);
    this.dialogName = this.add
      .text(r.name.x, r.name.y, '', { fontSize: `${DIALOG_NAME_SCHRIFT_PX}px`, color: DIALOG_NAME_FARBE, fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.dialogText = this.add
      .text(r.text.x, r.text.y, '', {
        fontSize: `${DIALOG_TEXT_SCHRIFT_PX}px`,
        color: '#ffffff',
        wordWrap: { width: r.text.breite },
      })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.dialogKosten = this.add
      .text(r.kosten.x, r.kosten.y, '', { fontSize: `${DIALOG_KOSTEN_SCHRIFT_PX}px`, color: DIALOG_KOSTEN_FARBE })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.dialogObjekte.push(this.dialogName, this.dialogText, this.dialogKosten);
    r.knoepfe.forEach((kr, i) => {
      const m = mitte(kr);
      const feld = this.add
        .rectangle(m.x, m.y, kr.breite, kr.hoehe, DIALOG_KNOPF_FARBE)
        .setStrokeStyle(2, DIALOG_RAHMEN_FARBE)
        .setScrollFactor(0)
        .setDepth(tiefe + 1)
        .setInteractive({ useHandCursor: true });
      const text = this.add
        .text(kr.x + 12, m.y, '', { fontSize: `${DIALOG_ANTWORT_SCHRIFT_PX}px`, color: '#ffffff' })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(tiefe + 2);
      feld.on('pointerover', () => feld.setFillStyle(DIALOG_KNOPF_HOVER_FARBE));
      feld.on('pointerout', () => feld.setFillStyle(DIALOG_KNOPF_FARBE));
      feld.on('pointerdown', () => this.waehleAntwort(i));
      this.antwortFelder.push(feld);
      this.antwortTexte.push(text);
      this.dialogObjekte.push(feld, text);
    });
    // Anfangs aus: unsichtbar und nicht klickbar.
    this.dialogObjekte.forEach((o) => o.setVisible(false));
    this.antwortFelder.forEach((fe) => {
      if (fe.input) fe.input.enabled = false;
    });
  }

  private zeichneNpcs(): void {
    NPCS.forEach((d, i) => {
      const p = npcPosition(this.welt, d.id);
      const bild = gitterZuBild(p.x, p.y);
      const g = this.npcGrafiken[i];
      g.clear();
      g.setDepth(p.x + p.y);
      const rx = NPC_RADIUS * Math.SQRT2 * KACHEL_BREITE;
      const ry = NPC_RADIUS * Math.SQRT2 * KACHEL_HOEHE;
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(bild.x, bild.y, rx, ry);
      g.fillStyle(NPC_FARBEN[d.id], 1);
      g.fillRect(bild.x - 8, bild.y - 30, 16, 30);
      g.fillStyle(tonen(NPC_FARBEN[d.id], 1.2), 1);
      g.fillCircle(bild.x, bild.y - 36, 8);
      this.npcNamen[i].setPosition(bild.x, bild.y - 46).setDepth(p.x + p.y);
    });
  }

  private zeigeTimer(): void {
    this.timerText.setText(zeitAufgerundet(this.zustand.rest));
    this.timerText.setColor(istWarnung(this.zustand.rest, TIMER_WARNUNG_SEKUNDEN) ? HUD_FARBE_WARNUNG : HUD_FARBE_NORMAL);
  }

  // Abdunkeln, Meldung und zwei Knoepfe. Wird genau einmal je Spiel aufgerufen (danach laeuft update nicht mehr).
  private zeigeMeldung(): void {
    this.setzeHinweis('keiner');
    this.speichere(); // Ende des Laufs: Infos und Gegenstaende in den Speicher
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
    this.baueKnopf(w / 2 + 110, h / 2 + 30, 190, 'Zum Menü', () => this.zumMenue());
  }

  private zeigeVerschuettet(): void {
    this.verschuettetRest = VERSCHUETTET_MELDUNG.sekunden;
    this.verschuettetText.setVisible(true);
  }

  private baueInventarFenster(): void {
    const r = inventarRechtecke();
    this.inventarObjekte = [];
    this.inventarKnoepfe = [];
    const tiefe = INVENTAR_TIEFE;
    const mitte = (q: { x: number; y: number; breite: number; hoehe: number }) => ({
      x: q.x + q.breite / 2,
      y: q.y + q.hoehe / 2,
    });
    const fm = mitte(r.fenster);
    this.inventarObjekte.push(
      this.add
        .rectangle(fm.x, fm.y, r.fenster.breite, r.fenster.hoehe, INVENTAR_FENSTER_FARBE)
        .setStrokeStyle(2, DIALOG_RAHMEN_FARBE)
        .setScrollFactor(0)
        .setDepth(tiefe),
    );
    this.inventarObjekte.push(
      this.add
        .text(r.titel.x, r.titel.y, 'Inventar', {
          fontSize: `${INVENTAR_TITEL_SCHRIFT_PX}px`,
          color: INVENTAR_TITEL_FARBE,
          fontStyle: 'bold',
        })
        .setScrollFactor(0)
        .setDepth(tiefe + 1),
    );
    this.inventarInfoText = this.add
      .text(r.info.x, r.info.y, '', {
        fontSize: `${INVENTAR_SCHRIFT_PX}px`,
        color: '#ffffff',
        wordWrap: { width: r.info.breite },
      })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.inventarGegenText = this.add
      .text(r.gegenstaende.x, r.gegenstaende.y, '', {
        fontSize: `${INVENTAR_SCHRIFT_PX}px`,
        color: DIALOG_KOSTEN_FARBE,
        wordWrap: { width: r.gegenstaende.breite },
      })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.inventarAnzeige = this.add
      .text(mitte(r.anzeige).x, mitte(r.anzeige).y, '', { fontSize: `${INVENTAR_SCHRIFT_PX}px`, color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.inventarObjekte.push(this.inventarInfoText, this.inventarGegenText, this.inventarAnzeige);
    const knopf = (q: { x: number; y: number; breite: number; hoehe: number }, beschriftung: string, aktion: () => void) => {
      const m = mitte(q);
      const feld = this.add
        .rectangle(m.x, m.y, q.breite, q.hoehe, DIALOG_KNOPF_FARBE)
        .setStrokeStyle(2, DIALOG_RAHMEN_FARBE)
        .setScrollFactor(0)
        .setDepth(tiefe + 1)
        .setInteractive({ useHandCursor: true });
      const text = this.add
        .text(m.x, m.y, beschriftung, { fontSize: `${INVENTAR_SCHRIFT_PX}px`, color: '#ffffff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(tiefe + 2);
      feld.on('pointerover', () => feld.setFillStyle(DIALOG_KNOPF_HOVER_FARBE));
      feld.on('pointerout', () => feld.setFillStyle(DIALOG_KNOPF_FARBE));
      feld.on('pointerdown', aktion);
      this.inventarKnoepfe.push(feld);
      this.inventarObjekte.push(feld, text);
    };
    knopf(r.zurueck, 'Zurück', () => this.blaettere(-1));
    knopf(r.weiter, 'Weiter', () => this.blaettere(1));
    knopf(r.schliessen, 'Schließen', () => {
      if (this.zustand.phase === 'inventar') this.schliesseInventar();
    });
    // Anfangs aus: unsichtbar und nicht klickbar.
    this.inventarObjekte.forEach((o) => o.setVisible(false));
    this.inventarKnoepfe.forEach((k) => {
      if (k.input) k.input.enabled = false;
    });
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
        if (art === 'maschine') {
          // Kaffeemaschine: Block mit Beschriftung auf der Deckflaeche; darunter Boden des Bereichs.
          this.zeichneBoden(boden, x, y, this.bodenFarbe(x, y));
          this.zeichneBlock(x, y, MASCHINE_HOEHE, MASCHINE_FARBE);
          const deckel = gitterZuBild(x + 0.5, y + 0.5);
          this.add
            .text(deckel.x, deckel.y - MASCHINE_HOEHE, 'Kaffee', {
              fontSize: `${MASCHINE_SCHRIFT_PX}px`,
              color: '#ffffff',
              stroke: '#000000',
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(x + y + 2);
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
    zurueck.on('pointerdown', () => this.zumMenue());

    // Knopf "Inventar" unter "Zurück zum Menü" (nur in Phase "laeuft" wirksam).
    const ik = INVENTAR_KNOPF;
    const inventarFeld = this.add
      .rectangle(ik.x + ik.breite / 2, ik.y + ik.hoehe / 2, ik.breite, ik.hoehe, DIALOG_KNOPF_FARBE)
      .setStrokeStyle(2, DIALOG_RAHMEN_FARBE)
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(ik.x + ik.breite / 2, ik.y + ik.hoehe / 2, 'Inventar (I)', { fontSize: `${ik.schriftPx}px`, color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE + 1);
    inventarFeld.on('pointerover', () => inventarFeld.setFillStyle(DIALOG_KNOPF_HOVER_FARBE));
    inventarFeld.on('pointerout', () => inventarFeld.setFillStyle(DIALOG_KNOPF_FARBE));
    inventarFeld.on('pointerdown', () => {
      if (this.zustand.phase === 'laeuft') this.oeffneInventar();
    });

    // Kaffee im HUD (nur sichtbar, solange er getragen wird) und die kurze Meldung beim Verschütten.
    const kh = KAFFEE_HUD;
    this.kaffeeSymbol = this.add
      .rectangle(kh.symbolX + kh.symbolBreite / 2, kh.symbolY + kh.symbolHoehe / 2, kh.symbolBreite, kh.symbolHoehe, kh.symbolFarbe)
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setVisible(this.kaffee);
    this.kaffeeText = this.add
      .text(kh.textX, kh.textY, 'Kaffee', { ...stil, fontSize: `${kh.schriftPx}px` })
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setVisible(this.kaffee);
    this.verschuettetText = this.add
      .text(w / 2, VERSCHUETTET_MELDUNG.y, 'Kaffee verschüttet!', {
        ...stil,
        color: VERSCHUETTET_MELDUNG.farbe,
        fontSize: `${VERSCHUETTET_MELDUNG.schriftPx}px`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setVisible(false);
  }
}
