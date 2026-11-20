import Phaser from 'phaser';
import {
  BODEN_TIEFE,
  DIALOG_ANTWORT_EINZUG,
  FIGUR_DARSTELLUNG,
  HUD_LAYOUT,
  KAMERA_LERP,
  MELDUNG_LAYOUT,
  RAHMEN,
  SCHRIFT_RAND,
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
  SPRITE_SKALA,
  KACHEL_BREITE,
  KACHEL_HOEHE,
  KAFFEE_HINWEIS_TEXT,
  KAFFEE_HUD,
  MASCHINE_HOEHE,
  MASCHINE_SCHRIFT_PX,
  MAX_ZEITSCHRITT_SEKUNDEN,
  MELDUNG_KNOPF_SCHRIFT_PX,
  MELDUNG_SCHRIFT_PX,
  MELDUNG_ZEIT_SCHRIFT_PX,
  NPC_DIALOG_KOSTEN,
  NPC_SCHRIFT_PX,
  OVERLAY_ABDUNKLUNG,
  STUFEN_NAMEN,
  TIMER_WARNUNG_SEKUNDEN,
  VERSCHUETTET_MELDUNG,
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
import { NPC_SCHRITTE, SPIELER_SCHRITTE } from './grafik/figuren.ts';
import { figurZustand, neuerFigurZustand, stehen } from './grafik/animation.ts';
import type { FigurZustand } from './grafik/animation.ts';
import { BODEN_TEXTUR, figurSchluessel, npcSchluessel, registriereFiguren, registriereWelt } from './grafik/texturen.ts';
import { bodenGroesse, weltObjekte } from './grafik/welt.ts';

const TASTEN = 'W,A,S,D,UP,LEFT,DOWN,RIGHT';

export class SpielScene extends Phaser.Scene {
  // Zustand wird bei jedem Start der Szene in create() neu angelegt.
  private pos!: Position;
  private bereich!: BereichName;
  private tasten!: Record<string, Phaser.Input.Keyboard.Key>;
  private figurBild!: Phaser.GameObjects.Image;
  private figurSchatten!: Phaser.GameObjects.Image;
  private figZ!: FigurZustand;
  private npcZ: FigurZustand[] = [];
  private npcSchatten: Phaser.GameObjects.Image[] = [];
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
  private npcBilder: Phaser.GameObjects.Image[] = [];
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

    registriereFiguren(this.textures);
    const bild = gitterZuBild(this.pos.x, this.pos.y);
    // Pixel-Figur: Schatten und Bild, Fusspunkt unten Mitte; Blick am Anfang nach rechts unten (zur ersten Tuer)
    this.figZ = neuerFigurZustand(bild.x, bild.y, 'ur');
    this.figurSchatten = this.add.image(bild.x, bild.y, 'schatten').setScale(SPRITE_SKALA).setAlpha(FIGUR_DARSTELLUNG.schattenAlpha);
    this.figurBild = this.add.image(bild.x, bild.y, figurSchluessel('ur', 0, false)).setOrigin(0.5, 1).setScale(SPRITE_SKALA);
    this.folgeZiel = this.add.zone(bild.x, bild.y, 1, 1);

    const cam = this.cameras.main;
    cam.setBounds(
      -KARTE.hoehe * (KACHEL_BREITE / 2),
      -WAND_HOEHE,
      (KARTE.breite + KARTE.hoehe) * (KACHEL_BREITE / 2),
      (KARTE.breite + KARTE.hoehe) * (KACHEL_HOEHE / 2) + WAND_HOEHE,
    );
    cam.startFollow(this.folgeZiel, true, KAMERA_LERP, KAMERA_LERP);

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
    this.npcBilder = NPCS.map((d) => this.add.image(0, 0, npcSchluessel(d.id, 'ur', 0, false)).setOrigin(0.5, 1).setScale(SPRITE_SKALA));
    this.npcSchatten = NPCS.map(() => this.add.image(0, 0, 'schatten').setScale(SPRITE_SKALA).setAlpha(FIGUR_DARSTELLUNG.schattenAlpha));
    this.npcZ = NPCS.map((d) => {
      const p = npcPosition(this.welt, d.id);
      const b = gitterZuBild(p.x, p.y);
      return neuerFigurZustand(b.x, b.y, 'ur');
    });
    this.npcNamen = NPCS.map((d) =>
      this.add
        .text(0, 0, d.name, { fontSize: `${NPC_SCHRIFT_PX}px`, color: '#ffffff', stroke: SCHRIFT_RAND.farbe, strokeThickness: SCHRIFT_RAND.npc })
        .setOrigin(0.5, 1),
    );

    this.baueAnzeige(stufe);
    this.baueDialogFenster();
    this.baueInventarFenster();
    this.zeichneFigur(0);
    this.zeichneNpcs(0);
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
    this.zeichneNpcs(delta);

    const b =bereichAnZelle(KARTE, Math.floor(this.pos.x), Math.floor(this.pos.y));
    if (b !== null && b !== this.bereich) {
      this.bereich = b;
      this.raumText.setText(`Raum: ${BEREICH_ANZEIGE[b]}`);
    }
    this.zeichneFigur(delta);

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
    this.figurSteht();
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
    this.figurSteht();
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
        text.setPosition(kr.x + DIALOG_ANTWORT_EINZUG, kr.y + kr.hoehe / 2);
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
      .setStrokeStyle(RAHMEN.staerke, DIALOG_RAHMEN_FARBE)
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
        .setStrokeStyle(RAHMEN.staerke, DIALOG_RAHMEN_FARBE)
        .setScrollFactor(0)
        .setDepth(tiefe + 1)
        .setInteractive({ useHandCursor: true });
      const text = this.add
        .text(kr.x + DIALOG_ANTWORT_EINZUG, m.y, '', { fontSize: `${DIALOG_ANTWORT_SCHRIFT_PX}px`, color: '#ffffff' })
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

  // NPCs: Bild nach Blickrichtung und Laufschritt aus der Bewegung des Bildes (Stillstand im Gespraech: Stehbild)
  private zeichneNpcs(deltaMs: number): void {
    NPCS.forEach((d, i) => {
      const p = npcPosition(this.welt, d.id);
      const bild = gitterZuBild(p.x, p.y);
      this.npcZ[i] = figurZustand(this.npcZ[i], bild.x, bild.y, deltaMs, NPC_SCHRITTE);
      const z = this.npcZ[i];
      this.npcBilder[i].setTexture(npcSchluessel(d.id, z.richtung, z.schritt, z.bewegt)).setPosition(bild.x, bild.y).setDepth(p.x + p.y);
      this.npcSchatten[i].setPosition(bild.x, bild.y).setDepth(p.x + p.y - 0.01);
      this.npcNamen[i].setPosition(bild.x, bild.y - FIGUR_DARSTELLUNG.nameHoehe).setDepth(p.x + p.y);
    });
  }

  // Spieler und NPCs zeigen das Stehbild (Gespraech, Inventar, Ende), die Blickrichtung bleibt.
  private figurSteht(): void {
    this.figZ = stehen(this.figZ);
    this.figurBild.setTexture(figurSchluessel(this.figZ.richtung, 0, false));
    NPCS.forEach((d, i) => {
      this.npcZ[i] = stehen(this.npcZ[i]);
      this.npcBilder[i].setTexture(npcSchluessel(d.id, this.npcZ[i].richtung, 0, false));
    });
  }

  private zeigeTimer(): void {
    this.timerText.setText(zeitAufgerundet(this.zustand.rest));
    this.timerText.setColor(istWarnung(this.zustand.rest, TIMER_WARNUNG_SEKUNDEN) ? HUD_FARBE_WARNUNG : HUD_FARBE_NORMAL);
  }

  // Abdunkeln, Meldung und zwei Knoepfe. Wird genau einmal je Spiel aufgerufen (danach laeuft update nicht mehr).
  private zeigeMeldung(): void {
    this.figurSteht();
    this.setzeHinweis('keiner');
    this.speichere(); // Ende des Laufs: Infos und Gegenstaende in den Speicher
    this.zeigeTimer();
    const sieg = this.zustand.phase === 'sieg';
    const w = this.scale.width;
    const h = this.scale.height;
    this.add
      .rectangle(w / 2, h / 2, w, h, MELDUNG_LAYOUT.overlayFarbe, OVERLAY_ABDUNKLUNG)
      .setScrollFactor(0)
      .setDepth(MELDUNG_LAYOUT.tiefe);
    const stil = { color: '#ffffff', stroke: SCHRIFT_RAND.farbe, strokeThickness: SCHRIFT_RAND.meldung };
    this.add
      .text(w / 2, h / 2 + MELDUNG_LAYOUT.titelDy, sieg ? 'Kündigung abgelegt!' : 'Zeit abgelaufen!', {
        ...stil,
        fontSize: `${MELDUNG_SCHRIFT_PX}px`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(MELDUNG_LAYOUT.tiefe + 1);
    if (sieg) {
      this.add
        .text(w / 2, h / 2 + MELDUNG_LAYOUT.zeitDy, `Übrige Zeit: ${zeitAufgerundet(this.zustand.rest)}`, {
          ...stil,
          fontSize: `${MELDUNG_ZEIT_SCHRIFT_PX}px`,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(MELDUNG_LAYOUT.tiefe + 1);
    }
    this.baueKnopf(w / 2 - MELDUNG_LAYOUT.knopfDx, h / 2 + MELDUNG_LAYOUT.knopfDy, MELDUNG_LAYOUT.knopfBreite, sieg ? 'Nochmal' : 'Neustart', () => this.scene.restart());
    this.baueKnopf(w / 2 + MELDUNG_LAYOUT.knopfDx, h / 2 + MELDUNG_LAYOUT.knopfDy, MELDUNG_LAYOUT.knopfBreite, 'Zum Menü', () => this.zumMenue());
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
        .setStrokeStyle(RAHMEN.staerke, DIALOG_RAHMEN_FARBE)
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
        .setStrokeStyle(RAHMEN.staerke, DIALOG_RAHMEN_FARBE)
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
      .rectangle(x, y, breite, MELDUNG_LAYOUT.knopfHoehe, MELDUNG_LAYOUT.knopfFarbe)
      .setStrokeStyle(RAHMEN.staerke, RAHMEN.farbe)
      .setScrollFactor(0)
      .setDepth(MELDUNG_LAYOUT.tiefe + 1)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, beschriftung, { fontSize: `${MELDUNG_KNOPF_SCHRIFT_PX}px`, color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(MELDUNG_LAYOUT.tiefe + 2);
    feld.on('pointerover', () => feld.setFillStyle(MELDUNG_LAYOUT.knopfHoverFarbe));
    feld.on('pointerout', () => feld.setFillStyle(MELDUNG_LAYOUT.knopfFarbe));
    feld.on('pointerdown', aktion);
  }

  // Pixel-Welt: ein Bodenbild, dazu Waende, Moebel, Tueren, Pflanzen und Chef als Bilder (Tiefe wie bisher x + y + 1).
  private zeichneKarte(): void {
    registriereWelt(this.textures);
    const g = bodenGroesse(KARTE);
    this.add.image(g.ursprungX, 0, BODEN_TEXTUR).setOrigin(0, 0).setScale(SPRITE_SKALA).setDepth(BODEN_TIEFE);
    for (const o of weltObjekte(KARTE)) {
      this.add.image(o.bildX, o.bildY, o.schluessel).setOrigin(0.5, 1).setScale(SPRITE_SKALA).setDepth(o.tiefe);
      if (o.art === 'maschine') {
        // Kaffeemaschine: Beschriftung bleibt Phaser-Text (Teil b stellt sie auf Pixelschrift um).
        const deckel = gitterZuBild(o.x + 0.5, o.y + 0.5);
        this.add
          .text(deckel.x, deckel.y - MASCHINE_HOEHE, 'Kaffee', {
            fontSize: `${MASCHINE_SCHRIFT_PX}px`,
            color: '#ffffff',
            stroke: SCHRIFT_RAND.farbe,
            strokeThickness: SCHRIFT_RAND.maschine,
          })
          .setOrigin(0.5)
          .setDepth(o.x + o.y + 2);
      }
    }
  }

  // Spieler: Bild nach Blickrichtung und Laufschritt (aus der Bewegung des Bildes), Schatten am Fusspunkt.
  private zeichneFigur(deltaMs: number): void {
    const bild = gitterZuBild(this.pos.x, this.pos.y);
    this.figZ = figurZustand(this.figZ, bild.x, bild.y, deltaMs, SPIELER_SCHRITTE);
    const z = this.figZ;
    this.figurBild.setTexture(figurSchluessel(z.richtung, z.schritt, z.bewegt)).setPosition(bild.x, bild.y).setDepth(this.pos.x + this.pos.y);
    this.figurSchatten.setPosition(bild.x, bild.y).setDepth(this.pos.x + this.pos.y - 0.01);
    this.folgeZiel.setPosition(bild.x, bild.y - FIGUR_DARSTELLUNG.kameraHoehe);
  }

  private baueAnzeige(stufe: Stufe): void {
    const w = this.scale.width;
    const stil = { color: '#ffffff', stroke: SCHRIFT_RAND.farbe, strokeThickness: SCHRIFT_RAND.hud };
    this.raumText = this.add
      .text(HUD_LAYOUT.raumX, HUD_LAYOUT.raumY, `Raum: ${BEREICH_ANZEIGE[this.bereich]}`, { ...stil, fontSize: `${HUD_LAYOUT.raumPx}px` })
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE);
    this.add
      .text(HUD_LAYOUT.stufeX, HUD_LAYOUT.stufeY, `Stufe: ${STUFEN_NAMEN[stufe]} · Startzeit ${zeitAufgerundet(this.startSekunden)}`, {
        ...stil,
        fontSize: `${HUD_LAYOUT.stufePx}px`,
      })
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE);
    this.timerText = this.add
      .text(w / 2, HUD_LAYOUT.timerY, zeitAufgerundet(this.zustand.rest), {
        ...stil,
        fontSize: `${HUD_SCHRIFT_PX}px`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE);
    this.zeigeTimer();
    this.hinweisText = this.add
      .text(w / 2, this.scale.height - HUD_LAYOUT.hinweisAbstandUnten, 'E: Kündigung ablegen', { ...stil, fontSize: `${HINWEIS_SCHRIFT_PX}px` })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setVisible(false);

    const zurueck = this.add
      .rectangle(w - HUD_LAYOUT.zurueckAbstandRechts, HUD_LAYOUT.zurueckY, HUD_LAYOUT.zurueckBreite, HUD_LAYOUT.zurueckHoehe, HUD_LAYOUT.zurueckFarbe)
      .setStrokeStyle(RAHMEN.staerke, RAHMEN.farbe)
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(w - HUD_LAYOUT.zurueckAbstandRechts, HUD_LAYOUT.zurueckY, 'Zurück zum Menü', { fontSize: `${HUD_LAYOUT.zurueckPx}px`, color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE + 1);
    zurueck.on('pointerdown', () => this.zumMenue());

    // Knopf "Inventar" unter "Zurück zum Menü" (nur in Phase "laeuft" wirksam).
    const ik = INVENTAR_KNOPF;
    const inventarFeld = this.add
      .rectangle(ik.x + ik.breite / 2, ik.y + ik.hoehe / 2, ik.breite, ik.hoehe, DIALOG_KNOPF_FARBE)
      .setStrokeStyle(RAHMEN.staerke, DIALOG_RAHMEN_FARBE)
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
