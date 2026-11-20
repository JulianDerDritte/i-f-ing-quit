import Phaser from 'phaser';
import {
  BODEN_TIEFE,
  DIALOG_ANTWORT_EINZUG,
  FENSTER_STIL,
  FIGUR_DARSTELLUNG,
  HUD_LAYOUT,
  MELDUNG_LAYOUT,
  PALETTE,
  SZENEN_TEXTE,
  DIALOG_ANTWORT_SCHRIFT_PX,
  DIALOG_KOSTEN_SCHRIFT_PX,
  DIALOG_NAME_SCHRIFT_PX,
  DIALOG_TEXT_SCHRIFT_PX,
  DIALOG_TIEFE,
  DIALOG_MAX_ANTWORTEN,
  HINWEIS_SCHRIFT_PX,
  HUD_TIEFE,
  INVENTAR_KNOPF,
  INVENTAR_SCHRIFT_PX,
  INVENTAR_TIEFE,
  INVENTAR_TITEL_SCHRIFT_PX,
  SPRITE_SKALA,
  UI_SKALA,
  KAFFEE_HINWEIS_TEXT,
  KAFFEE_HUD,
  MASCHINE_HOEHE,
  MASCHINE_SCHRIFT_PX,
  MAX_ZEITSCHRITT_SEKUNDEN,
  MELDUNG_KNOPF_SCHRIFT_PX,
  MELDUNG_SCHRIFT_PX,
  MELDUNG_ZEIT_SCHRIFT_PX,
  NPC_DIALOG_KOSTEN,
  CHEF_DIALOG_KOSTEN,
  NPC_SCHRIFT_PX,
  OVERLAY_ABDUNKLUNG,
  STUFEN_NAMEN,
  VERSCHUETTET_MELDUNG,
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
  nahAnAblage,
  startzeit,
  zeitAufgerundet,
} from './spielzustand.ts';
import type { Spielzustand } from './spielzustand.ts';
import { aktionsTaste, kaffeeNachAntwort, nahAnKaffee } from './kaffee.ts';
import { ausGespraech, inventarRechtecke, inventarSeiten, mitKaffee } from './inventar.ts';
import type { Inventar } from './inventar.ts';
import { neuerLauf } from './lauf.ts';
import { erwischenSpeichern, holeSpeicher, speichereInventar } from './speicher.ts';
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
import { CHEF_SCHRITTE, NPC_SCHRITTE, SPIELER_SCHRITTE } from './grafik/figuren.ts';
import { chefErwischt, chefGespraechEnde, chefPosition, chefSchritte } from './chef.ts';
import type { ChefZustand } from './chef.ts';
import { figurZustand, neuerFigurZustand, stehen } from './grafik/animation.ts';
import type { FigurZustand } from './grafik/animation.ts';
import { BODEN_TEXTUR, chefSchluessel, figurSchluessel, npcSchluessel, registriereChef, registriereFiguren, registriereUi, registriereWelt } from './grafik/texturen.ts';
import { PixelText, knopfBauen, neueTextur, pixelTexteAufraeumen, zeichneRechtecke } from './grafik/pixeltext.ts';
import type { KnopfTeil } from './grafik/pixeltext.ts';
import { blinkAn, fensterRechtecke, plaketteRaster, plaketteRechtecke, stufenZeile, zeitZiffern } from './grafik/ui.ts';
import { VORSCHUB_ENG, ZEILE, pixelSkala } from './grafik/schrift.ts';
import { bodenGroesse, weltObjekte } from './grafik/welt.ts';
import { anzeigePunkt, pruefeZuordnung, richteKamerasEin, weltTextSkala } from './grafik/kamera.ts';

const TASTEN = 'W,A,S,D,UP,LEFT,DOWN,RIGHT';

type Sichtbar = { setVisible(sichtbar: boolean): unknown };
const farbeAusText = (s: string): number => parseInt(s.slice(1), 16);

export class SpielScene extends Phaser.Scene {
  // Zustand wird bei jedem Start der Szene in create() neu angelegt.
  private pos!: Position;
  private bereich!: BereichName;
  private tasten!: Record<string, Phaser.Input.Keyboard.Key>;
  private figurBild!: Phaser.GameObjects.Image;
  private figurSchatten!: Phaser.GameObjects.Image;
  private figZ!: FigurZustand;
  private npcZ: FigurZustand[] = [];
  private chef!: ChefZustand;
  private chefBild!: Phaser.GameObjects.Image;
  private chefSchatten!: Phaser.GameObjects.Image;
  private chefZ!: FigurZustand;
  private chefName!: PixelText;
  private dialogIstChef = false; // das offene Gespraech ist ein Chef-Gespraech (danach beginnt die Schutzfrist)
  private npcSchatten: Phaser.GameObjects.Image[] = [];
  private folgeZiel!: Phaser.GameObjects.Zone;
  private weltKamera!: Phaser.Cameras.Scene2D.Camera; // zoomt die Spielwelt
  private uiKamera!: Phaser.Cameras.Scene2D.Camera; // Oberflaeche ohne Zoom
  private raumText!: PixelText;
  private plaketteBild!: Phaser.GameObjects.Image;
  private plaketteSchluessel: string | null = null;
  private plaketteText = '';
  private plaketteHell = false;
  private hinweisText!: PixelText;
  private hinweisArt: 'keiner' | 'ablage' | 'kaffee' = 'keiner';
  private ablegeTasten!: Phaser.Input.Keyboard.Key[];
  private inventarTaste!: Phaser.Input.Keyboard.Key;
  private escTaste!: Phaser.Input.Keyboard.Key;
  private zustand!: Spielzustand;
  private startSekunden = 0;
  private welt!: NpcWelt;
  private npcBilder: Phaser.GameObjects.Image[] = [];
  private npcNamen: PixelText[] = [];
  private dialog: DialogZustand | null = null;
  private dialogObjekte: Sichtbar[] = []; // alle Teile des Dialogfensters (nur ein-/ausgeblendet)
  private dialogName!: PixelText;
  private dialogText!: PixelText;
  private dialogKosten!: PixelText;
  private dialogRahmen!: Phaser.GameObjects.Graphics;
  private kostenSymbol!: Phaser.GameObjects.Image;
  private antwortKnoepfe: KnopfTeil[] = [];
  private antwortFelder: Phaser.GameObjects.Rectangle[] = [];
  private kaffee = false; // wird gerade Kaffee getragen?
  private inventar!: Inventar;
  private speicher: SpeicherQuelle | null = null;
  private kaffeeSymbol!: Phaser.GameObjects.Image;
  private kaffeeText!: PixelText;
  private verschuettetText!: PixelText;
  private verschuettetRest = 0; // Restdauer der Meldung in Sekunden (echte Zeit, kein Zeitgeber)
  private inventarObjekte: Sichtbar[] = [];
  private inventarKnoepfe: Phaser.GameObjects.Rectangle[] = [];
  private inventarInfoText!: PixelText;
  private inventarGegenText!: PixelText;
  private inventarAnzeige!: PixelText;
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

    // Dynamische Textur-Texte und die Plakette beim Ende der Szene freigeben (Neustart, Menue).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => pixelTexteAufraeumen(this.textures));
    registriereUi(this.textures);

    // Kameras (A-012): die Hauptkamera zoomt die Welt, eine zweite Kamera ohne Zoom zeigt die Oberflaeche.
    const bild = gitterZuBild(this.pos.x, this.pos.y);
    this.folgeZiel = this.add.zone(bild.x, bild.y, 1, 1);
    const kameras = richteKamerasEin(this.cameras, this.folgeZiel, KARTE);
    this.weltKamera = kameras.haupt;
    this.uiKamera = kameras.oberflaeche;
    this.uiKamera.ignore(this.folgeZiel);

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
    this.chef = lauf.chef;
    this.dialogIstChef = false;
    this.kaffee = lauf.kaffee;
    this.inventar = lauf.inventar;
    this.dialog = null;
    this.verschuettetRest = 0;
    this.inventarSeitenTexte = [];
    this.inventarSeite = 0;

    this.inWelt(() => {
      this.zeichneKarte();
      registriereFiguren(this.textures);
      // Pixel-Figur: Schatten und Bild, Fusspunkt unten Mitte; Blick am Anfang nach rechts unten (zur ersten Tuer)
      this.figZ = neuerFigurZustand(bild.x, bild.y, 'ur');
      this.figurSchatten = this.add.image(bild.x, bild.y, 'schatten').setScale(SPRITE_SKALA).setAlpha(FIGUR_DARSTELLUNG.schattenAlpha);
      this.figurBild = this.add.image(bild.x, bild.y, figurSchluessel('ur', 0, false)).setOrigin(0.5, 1).setScale(SPRITE_SKALA);
      this.npcBilder = NPCS.map((d) => this.add.image(0, 0, npcSchluessel(d.id, 'ur', 0, false)).setOrigin(0.5, 1).setScale(SPRITE_SKALA));
      this.npcSchatten = NPCS.map(() => this.add.image(0, 0, 'schatten').setScale(SPRITE_SKALA).setAlpha(FIGUR_DARSTELLUNG.schattenAlpha));
      this.npcZ = NPCS.map((d) => {
        const p = npcPosition(this.welt, d.id);
        const b = gitterZuBild(p.x, p.y);
        return neuerFigurZustand(b.x, b.y, 'ur');
      });
      // Namen in der Welt: laufen mit dem Zoom der Hauptkamera, Skala = Skala / Zoom (Bildschirmgroesse wie ohne Zoom)
      this.npcNamen = NPCS.map((d) => new PixelText(this, 0, 0, d.name, { skala: weltTextSkala(NPC_SCHRIFT_PX), farbe: 0xffffff, rand: PALETTE.umriss, ox: 0.5, oy: 1 }));

      // Der Chef: laeuft nach der Zeit um seinen Schreibtisch (chef.ts), Bild und Name wie die NPCs.
      registriereChef(this.textures);
      const cp = chefPosition(this.chef.t);
      const cb = gitterZuBild(cp.x, cp.y);
      this.chefZ = neuerFigurZustand(cb.x, cb.y, 'ur');
      this.chefSchatten = this.add.image(cb.x, cb.y, 'schatten').setScale(SPRITE_SKALA).setAlpha(FIGUR_DARSTELLUNG.schattenAlpha);
      this.chefBild = this.add.image(cb.x, cb.y, chefSchluessel('ur', 0, false)).setOrigin(0.5, 1).setScale(SPRITE_SKALA);
      this.chefName = new PixelText(this, 0, 0, SZENEN_TEXTE.chefName, { skala: weltTextSkala(NPC_SCHRIFT_PX), farbe: 0xffffff, rand: PALETTE.umriss, ox: 0.5, oy: 1 });
    });

    this.inOberflaeche(() => {
      this.baueAnzeige(stufe);
      this.baueDialogFenster();
      this.baueInventarFenster();
    });
    this.zeichneFigur(0);
    this.zeichneNpcs(0);
    this.zeichneChef(0);

    // Probelauf (nur mit ?probe=...): ein Objekt ausserhalb der Huellen wird absichtlich nicht zugeordnet, die Pruefung muss dann werfen.
    const probe = new URLSearchParams(window.location.search).get('probe');
    if (probe === 'zuordnung') this.add.rectangle(0, 0, 10, 10, 0xff00ff);
    this.pruefeKameraZuordnung();
    if (probe !== null) (window as unknown as { __probe: unknown }).__probe = { szene: this, haupt: this.weltKamera, ui: this.uiKamera };
  }

  // Objekte, die `bauen` anlegt, gehoeren zur Welt: die Oberflaechenkamera ignoriert sie (Mengenunterschied der Anzeigeliste).
  private inWelt(bauen: () => void): void {
    this.uiKamera.ignore(this.neueObjekte(bauen));
  }

  // Objekte, die `bauen` anlegt, gehoeren zur Oberflaeche: die Hauptkamera (mit Zoom) ignoriert sie.
  private inOberflaeche(bauen: () => void): void {
    this.weltKamera.ignore(this.neueObjekte(bauen));
  }

  private neueObjekte(bauen: () => void): Phaser.GameObjects.GameObject[] {
    const vorher = new Set<Phaser.GameObjects.GameObject>(this.children.list);
    bauen();
    return this.children.list.filter((o) => !vorher.has(o));
  }

  // Jedes Objekt der Szene wird von genau einer der beiden Kameras ignoriert; sonst Fehler (laut, nicht still).
  private pruefeKameraZuordnung(): void {
    const fehler = pruefeZuordnung(
      this.children.list.map((o) => o.cameraFilter),
      this.weltKamera.id,
      this.uiKamera.id,
    );
    if (fehler.length > 0) throw new Error(`Kamerazuordnung fehlerhaft: ${fehler.join('; ')}`);
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
    // Chef: Zeit wie der Timer (ungekappt), in Teilschritten von hoechstens 0,1 s; der Kontakt wird je Teilschritt geprueft.
    const ch = chefSchritte(this.chef, delta / 1000, this.pos.x, this.pos.y, this.zustand.phase);
    this.chef = ch.chef;
    this.zeichneChef(delta);

    const b =bereichAnZelle(KARTE, Math.floor(this.pos.x), Math.floor(this.pos.y));
    if (b !== null && b !== this.bereich) {
      this.bereich = b;
      this.raumText.setText(`${SZENEN_TEXTE.raum}${BEREICH_ANZEIGE[b]}`);
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
    else if (ch.kontakt && this.zustand.phase === 'laeuft') this.oeffneChefGespraech(); // Vorrang: NPC; Phase neu gelesen
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
    if (art === 'ablage') this.hinweisText.setText(SZENEN_TEXTE.hinweisAblegen);
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
    this.inventarGegenText.setText(`${SZENEN_TEXTE.gegenstaende}${this.inventar.gegenstaende.join(', ')}`);
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
    this.inventarAnzeige.setText(`${SZENEN_TEXTE.seite}${this.inventarSeite + 1}${SZENEN_TEXTE.von}${n}`);
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
    this.dialogIstChef = false;
    this.oeffneGespraech(def.name, def.dialogId, NPC_DIALOG_KOSTEN[id]);
  }

  // Der Chef erwischt die Figur: n-tes Gespraech dieses Laufs (chef1, chef2, chef3, ...), Kosten CHEF_DIALOG_KOSTEN.
  private oeffneChefGespraech(): void {
    const e = chefErwischt(this.chef);
    this.chef = e.chef;
    erwischenSpeichern(this.chef, this.speicher); // sofort, nicht erst am Laufende: Neuladen im Gespraech verliert nichts
    this.dialogIstChef = true;
    this.oeffneGespraech(SZENEN_TEXTE.chefName, e.dialogId, CHEF_DIALOG_KOSTEN);
  }

  private oeffneGespraech(name: string, dialogId: string, kosten: number): void {
    this.figurSteht();
    this.zustand = abziehen(this.zustand, kosten);
    this.setzeHinweis('keiner');
    this.zeigeTimer();
    if (this.zustand.phase === 'niederlage') {
      this.zeigeMeldung();
      return;
    }
    this.dialog = starteGespraech(dialogId);
    this.dialogName.setText(name);
    this.dialogKosten.setText(kostenZeile(zeitText(kosten)));
    this.dialogObjekte.forEach((o) => o.setVisible(true));
    this.zeigeKnoten();
  }

  // Zeigt Text und Antworten des aktuellen Knotens; nicht benoetigte Antwortfelder sind aus und nicht klickbar.
  // Zeigt Text und Antworten des aktuellen Knotens; nicht benoetigte Antwortfelder sind aus und nicht klickbar.
  private zeigeKnoten(): void {
    if (this.dialog === null) return;
    const k = aktuellerKnoten(this.dialog);
    if (k === null) return;
    const angeboten = angeboteneAntworten(this.dialog, this.kaffee);
    const r = dialogRechtecke(angeboten.length);
    // Das Fenster waechst nach oben, wenn mehr als 3 Antworten angeboten werden: Rahmen und alle Teile folgen dem Layout.
    const leiste = { x: r.fenster.x + 22, y: r.name.y, b: r.fenster.breite - 44, h: r.name.hoehe };
    zeichneRechtecke(this.dialogRahmen, fensterRechtecke(r.fenster.x, r.fenster.y, r.fenster.breite, r.fenster.hoehe, FENSTER_STIL.flaeche, leiste));
    this.dialogName.setPosition(leiste.x + 8, leiste.y + (leiste.h - ZEILE * pixelSkala(DIALOG_NAME_SCHRIFT_PX)) / 2);
    this.dialogText.setPosition(r.text.x, r.text.y);
    this.dialogKosten.setPosition(r.kosten.x + 26, r.kosten.y + 2);
    this.kostenSymbol.setPosition(r.kosten.x, r.kosten.y + 2);
    this.dialogText.setText(k.text);
    for (let i = 0; i < this.antwortFelder.length; i++) {
      const knopf = this.antwortKnoepfe[i];
      const an = i < angeboten.length;
      knopf.grafik.setVisible(an);
      knopf.text.setVisible(an);
      knopf.feld.setVisible(an);
      if (knopf.feld.input) knopf.feld.input.enabled = an;
      if (an) {
        const kr = r.knoepfe[i];
        knopf.setzeOrt(kr.x, kr.y);
        knopf.text.setText(antwortBeschriftung(this.dialog, angeboten[i].antwort));
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
    if (this.dialogIstChef) {
      this.chef = chefGespraechEnde(this.chef);
      this.dialogIstChef = false;
    }
    // Eine waehrend des Gespraechs gedrueckte E-/Leertaste soll nicht nachtraeglich ablegen.
    this.ablegeTasten.forEach((k) => Phaser.Input.Keyboard.JustDown(k));
  }

  private baueDialogFenster(): void {
    const r = dialogRechtecke(DIALOG_MAX_ANTWORTEN); // Platz fuer alle Knoepfe; zeigeKnoten stellt je Knoten das Layout ein
    this.dialogObjekte = [];
    this.antwortFelder = [];
    this.antwortKnoepfe = [];
    const tiefe = DIALOG_TIEFE;
    this.dialogRahmen = this.add.graphics().setScrollFactor(0).setDepth(tiefe);
    this.dialogName = new PixelText(this, r.name.x, r.name.y, '', { skala: pixelSkala(DIALOG_NAME_SCHRIFT_PX), farbe: FENSTER_STIL.leisteText }).setScrollFactor(0).setDepth(tiefe + 1);
    this.dialogText = new PixelText(this, r.text.x, r.text.y, '', { skala: pixelSkala(DIALOG_TEXT_SCHRIFT_PX), farbe: FENSTER_STIL.text, umbruch: r.text.breite })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.dialogKosten = new PixelText(this, r.kosten.x + 26, r.kosten.y, '', { skala: pixelSkala(DIALOG_KOSTEN_SCHRIFT_PX), farbe: FENSTER_STIL.kosten })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.kostenSymbol = this.add.image(r.kosten.x, r.kosten.y, 'stoppuhr-klein').setOrigin(0, 0).setScale(UI_SKALA).setScrollFactor(0).setDepth(tiefe + 1);
    this.dialogObjekte.push(this.dialogRahmen, this.dialogName, this.dialogText, this.dialogKosten, this.kostenSymbol);
    r.knoepfe.forEach((kr, i) => {
      const knopf = knopfBauen(this, kr.x, kr.y, kr.breite, kr.hoehe, 'antwort', '', pixelSkala(DIALOG_ANTWORT_SCHRIFT_PX), tiefe + 1, () => this.waehleAntwort(i), DIALOG_ANTWORT_EINZUG);
      this.antwortKnoepfe.push(knopf);
      this.antwortFelder.push(knopf.feld);
      this.dialogObjekte.push(knopf.grafik, knopf.text, knopf.feld);
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
      const a = anzeigePunkt(bild.x, bild.y);
      this.npcBilder[i].setTexture(npcSchluessel(d.id, z.richtung, z.schritt, z.bewegt)).setPosition(a.x, a.y).setDepth(p.x + p.y);
      this.npcSchatten[i].setPosition(a.x, a.y).setDepth(p.x + p.y - 0.01);
      this.npcNamen[i].setPosition(a.x, a.y - FIGUR_DARSTELLUNG.nameHoehe).setDepth(p.x + p.y);
    });
  }

  // Chef: Bild nach Blickrichtung und Laufschritt aus der Bewegung des Bildes (Stehphase und Gespraech: Stehbild); Tiefe x + y.
  private zeichneChef(deltaMs: number): void {
    const p = chefPosition(this.chef.t);
    const bild = gitterZuBild(p.x, p.y);
    this.chefZ = figurZustand(this.chefZ, bild.x, bild.y, deltaMs, CHEF_SCHRITTE);
    const z = this.chefZ;
    const a = anzeigePunkt(bild.x, bild.y);
    this.chefBild.setTexture(chefSchluessel(z.richtung, z.schritt, z.bewegt)).setPosition(a.x, a.y).setDepth(p.x + p.y);
    this.chefSchatten.setPosition(a.x, a.y).setDepth(p.x + p.y - 0.01);
    this.chefName.setPosition(a.x, a.y - FIGUR_DARSTELLUNG.nameHoehe).setDepth(p.x + p.y);
  }

  // Spieler und NPCs zeigen das Stehbild (Gespraech, Inventar, Ende), die Blickrichtung bleibt.
  private figurSteht(): void {
    this.figZ = stehen(this.figZ);
    this.figurBild.setTexture(figurSchluessel(this.figZ.richtung, 0, false));
    this.chefZ = stehen(this.chefZ);
    this.chefBild.setTexture(chefSchluessel(this.chefZ.richtung, 0, false));
    NPCS.forEach((d, i) => {
      this.npcZ[i] = stehen(this.npcZ[i]);
      this.npcBilder[i].setTexture(npcSchluessel(d.id, this.npcZ[i].richtung, 0, false));
    });
  }

  // Timer-Plakette: Ziffern MM:SS, bei Restzeit unter der Warnschwelle blinkend; neu gerechnet nur bei Aenderung (hoechstens 2 mal je Sekunde).
  private zeigeTimer(): void {
    const text = zeitZiffern(this.zustand.rest);
    const hell = blinkAn(this.zustand.rest);
    if (text === this.plaketteText && hell === this.plaketteHell) return;
    this.plaketteText = text;
    this.plaketteHell = hell;
    this.plaketteSchluessel = neueTextur(this.textures, plaketteRaster(text, hell), this.plaketteSchluessel);
    this.plaketteBild.setTexture(this.plaketteSchluessel);
  }


  // Abdunkeln, Meldung und zwei Knoepfe. Wird genau einmal je Spiel aufgerufen (danach laeuft update nicht mehr).
  // Abdunkeln, Meldung und zwei Knoepfe. Wird genau einmal je Spiel aufgerufen (danach laeuft update nicht mehr).
  private zeigeMeldung(): void {
    this.inOberflaeche(() => this.baueMeldung());
    this.pruefeKameraZuordnung();
  }

  private baueMeldung(): void {
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
    new PixelText(this, w / 2, h / 2 + MELDUNG_LAYOUT.titelDy, sieg ? SZENEN_TEXTE.sieg : SZENEN_TEXTE.niederlage, {
      skala: pixelSkala(MELDUNG_SCHRIFT_PX),
      farbe: PALETTE.krawatteRot,
      rand: PALETTE.umriss,
      ox: 0.5,
      oy: 0.5,
    })
      .setScrollFactor(0)
      .setDepth(MELDUNG_LAYOUT.tiefe + 1);
    if (sieg) {
      new PixelText(this, w / 2, h / 2 + MELDUNG_LAYOUT.zeitDy, `${SZENEN_TEXTE.uebrigeZeit}${zeitAufgerundet(this.zustand.rest)}`, {
        skala: pixelSkala(MELDUNG_ZEIT_SCHRIFT_PX),
        farbe: 0xffffff,
        rand: PALETTE.umriss,
        ox: 0.5,
        oy: 0.5,
      })
        .setScrollFactor(0)
        .setDepth(MELDUNG_LAYOUT.tiefe + 1);
    }
    this.baueKnopf(w / 2 - MELDUNG_LAYOUT.knopfDx, h / 2 + MELDUNG_LAYOUT.knopfDy, MELDUNG_LAYOUT.knopfBreite, sieg ? SZENEN_TEXTE.nochmal : SZENEN_TEXTE.neustart, () => this.scene.restart());
    this.baueKnopf(w / 2 + MELDUNG_LAYOUT.knopfDx, h / 2 + MELDUNG_LAYOUT.knopfDy, MELDUNG_LAYOUT.knopfBreite, SZENEN_TEXTE.zumMenue, () => this.zumMenue());
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
    const leiste = { x: r.fenster.x + 22, y: r.titel.y, b: r.fenster.breite - 44, h: r.titel.hoehe };
    const rahmen = this.add.graphics().setScrollFactor(0).setDepth(tiefe);
    zeichneRechtecke(rahmen, fensterRechtecke(r.fenster.x, r.fenster.y, r.fenster.breite, r.fenster.hoehe, FENSTER_STIL.inventarFlaeche, leiste));
    this.inventarObjekte.push(rahmen);
    const titelSkala = Math.min(pixelSkala(INVENTAR_TITEL_SCHRIFT_PX), Math.floor(leiste.h / ZEILE));
    this.inventarObjekte.push(
      new PixelText(this, leiste.x + 8, leiste.y + (leiste.h - ZEILE * titelSkala) / 2, SZENEN_TEXTE.inventarTitel, { skala: titelSkala, farbe: FENSTER_STIL.leisteText })
        .setScrollFactor(0)
        .setDepth(tiefe + 1),
    );
    const sText = pixelSkala(INVENTAR_SCHRIFT_PX);
    this.inventarInfoText = new PixelText(this, r.info.x, r.info.y, '', { skala: sText, farbe: FENSTER_STIL.text, umbruch: r.info.breite }).setScrollFactor(0).setDepth(tiefe + 1);
    this.inventarGegenText = new PixelText(this, r.gegenstaende.x + 26, r.gegenstaende.y, '', { skala: sText, farbe: FENSTER_STIL.kosten, umbruch: r.gegenstaende.breite - 26 })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    const blatt = this.add.image(r.gegenstaende.x, r.gegenstaende.y + 2, 'blatt-symbol').setOrigin(0, 0).setScale(UI_SKALA).setScrollFactor(0).setDepth(tiefe + 1);
    this.inventarAnzeige = new PixelText(this, mitte(r.anzeige).x, mitte(r.anzeige).y, '', { skala: sText, farbe: FENSTER_STIL.text, ox: 0.5, oy: 0.5 })
      .setScrollFactor(0)
      .setDepth(tiefe + 1);
    this.inventarObjekte.push(this.inventarInfoText, this.inventarGegenText, blatt, this.inventarAnzeige);
    const knopf = (q: { x: number; y: number; breite: number; hoehe: number }, beschriftung: string, aktion: () => void) => {
      const k = knopfBauen(this, q.x, q.y, q.breite, q.hoehe, 'inventar', beschriftung, sText, tiefe + 1, aktion);
      this.inventarKnoepfe.push(k.feld);
      this.inventarObjekte.push(k.grafik, k.text, k.feld);
    };
    knopf(r.zurueck, SZENEN_TEXTE.zurueck, () => this.blaettere(-1));
    knopf(r.weiter, SZENEN_TEXTE.weiter, () => this.blaettere(1));
    knopf(r.schliessen, SZENEN_TEXTE.schliessen, () => {
      if (this.zustand.phase === 'inventar') this.schliesseInventar();
    });
    // Anfangs aus: unsichtbar und nicht klickbar.
    this.inventarObjekte.forEach((o) => o.setVisible(false));
    this.inventarKnoepfe.forEach((k) => {
      if (k.input) k.input.enabled = false;
    });
  }


  // Knopf der Meldung; (x, y) ist die Mitte, wie bisher.
  private baueKnopf(x: number, y: number, breite: number, beschriftung: string, aktion: () => void): void {
    knopfBauen(this, x - breite / 2, y - MELDUNG_LAYOUT.knopfHoehe / 2, breite, MELDUNG_LAYOUT.knopfHoehe, 'meldung', beschriftung, pixelSkala(MELDUNG_KNOPF_SCHRIFT_PX), MELDUNG_LAYOUT.tiefe + 1, aktion);
  }


  // Pixel-Welt: ein Bodenbild, dazu Waende, Moebel, Tueren, Pflanzen und Chef als Bilder (Tiefe wie bisher x + y + 1).
  private zeichneKarte(): void {
    registriereWelt(this.textures);
    const g = bodenGroesse(KARTE);
    this.add.image(g.ursprungX, 0, BODEN_TEXTUR).setOrigin(0, 0).setScale(SPRITE_SKALA).setDepth(BODEN_TIEFE);
    for (const o of weltObjekte(KARTE)) {
      if (o.art === 'chef') continue; // der Chef wird beweglich gezeichnet (zeichneChef)
      this.add.image(o.bildX, o.bildY, o.schluessel).setOrigin(0.5, 1).setScale(SPRITE_SKALA).setDepth(o.tiefe);
      if (o.art === 'maschine') {
        // Kaffeemaschine: Beschriftung in Pixelschrift.
        const deckel = gitterZuBild(o.x + 0.5, o.y + 0.5);
        new PixelText(this, deckel.x, deckel.y - MASCHINE_HOEHE, SZENEN_TEXTE.kaffee, { skala: weltTextSkala(MASCHINE_SCHRIFT_PX), farbe: 0xffffff, rand: PALETTE.umriss, ox: 0.5, oy: 0.5 }).setDepth(o.x + o.y + 2);
      }
    }
  }

  // Spieler: Bild nach Blickrichtung und Laufschritt (aus der Bewegung des Bildes), Schatten am Fusspunkt.
  private zeichneFigur(deltaMs: number): void {
    const bild = gitterZuBild(this.pos.x, this.pos.y);
    this.figZ = figurZustand(this.figZ, bild.x, bild.y, deltaMs, SPIELER_SCHRITTE);
    const z = this.figZ;
    const a = anzeigePunkt(bild.x, bild.y);
    this.figurBild.setTexture(figurSchluessel(z.richtung, z.schritt, z.bewegt)).setPosition(a.x, a.y).setDepth(this.pos.x + this.pos.y);
    this.figurSchatten.setPosition(a.x, a.y).setDepth(this.pos.x + this.pos.y - 0.01);
    this.folgeZiel.setPosition(a.x, a.y - FIGUR_DARSTELLUNG.kameraHoehe);
  }

  private baueAnzeige(stufe: Stufe): void {
    const w = this.scale.width;
    const rand = PALETTE.umriss;
    this.raumText = new PixelText(this, HUD_LAYOUT.raumX, HUD_LAYOUT.raumY, `${SZENEN_TEXTE.raum}${BEREICH_ANZEIGE[this.bereich]}`, { skala: pixelSkala(HUD_LAYOUT.raumPx), farbe: 0xffffff, rand })
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE);
    new PixelText(this, HUD_LAYOUT.stufeX, HUD_LAYOUT.stufeY, stufenZeile(STUFEN_NAMEN[stufe], zeitAufgerundet(this.startSekunden)), {
      skala: pixelSkala(HUD_LAYOUT.stufePx),
      farbe: 0xffffff,
      rand,
      umbruch: HUD_LAYOUT.stufeUmbruch,
    })
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE);

    // Timer-Plakette im Logo-Stil: dunkle Plakette, Stoppuhr links, rote Digitalziffern MM:SS.
    const pb = HUD_LAYOUT.plaketteBreite;
    const ph = HUD_LAYOUT.plaketteHoehe;
    const px = (w - pb) / 2;
    const py = HUD_LAYOUT.timerY;
    zeichneRechtecke(this.add.graphics().setScrollFactor(0).setDepth(HUD_TIEFE), plaketteRechtecke(px, py, pb, ph));
    this.add.image(px + 12, py + ph / 2, 'stoppuhr').setOrigin(0, 0.5).setScale(UI_SKALA).setScrollFactor(0).setDepth(HUD_TIEFE + 1);
    this.plaketteText = '';
    this.plaketteSchluessel = null;
    this.plaketteBild = this.add.image(px + 52, py + ph / 2, '__DEFAULT').setOrigin(0, 0.5).setScale(4).setScrollFactor(0).setDepth(HUD_TIEFE + 1);
    this.zeigeTimer();
    this.hinweisText = new PixelText(this, w / 2, this.scale.height - HUD_LAYOUT.hinweisAbstandUnten, SZENEN_TEXTE.hinweisAblegen, {
      skala: pixelSkala(HINWEIS_SCHRIFT_PX),
      farbe: 0xffffff,
      rand,
      ox: 0.5,
      oy: 1,
    })
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setVisible(false);

    // "Zurück zum Menü" und darunter "Inventar (I)" (nur in Phase "laeuft" wirksam).
    knopfBauen(
      this,
      w - HUD_LAYOUT.zurueckAbstandRechts - HUD_LAYOUT.zurueckBreite / 2,
      HUD_LAYOUT.zurueckY - HUD_LAYOUT.zurueckHoehe / 2,
      HUD_LAYOUT.zurueckBreite,
      HUD_LAYOUT.zurueckHoehe,
      'zurueck',
      SZENEN_TEXTE.zurueckMenue,
      pixelSkala(HUD_LAYOUT.zurueckPx),
      HUD_TIEFE,
      () => this.zumMenue(),
      null,
      VORSCHUB_ENG, // 15 Zeichen: bei Vorschub 6 waeren es 180 Punkte, der Knopf ist 170 breit
    );
    const ik = INVENTAR_KNOPF;
    knopfBauen(this, ik.x, ik.y, ik.breite, ik.hoehe, 'inventar', SZENEN_TEXTE.inventarKnopf, pixelSkala(ik.schriftPx), HUD_TIEFE, () => {
      if (this.zustand.phase === 'laeuft') this.oeffneInventar();
    });

    // Kaffee im HUD (nur sichtbar, solange er getragen wird) und die kurze Meldung beim Verschütten.
    const kh = KAFFEE_HUD;
    this.kaffeeSymbol = this.add.image(kh.symbolX, kh.symbolY, 'tasse').setOrigin(0, 0).setScale(UI_SKALA).setScrollFactor(0).setDepth(HUD_TIEFE).setVisible(this.kaffee);
    this.kaffeeText = new PixelText(this, kh.textX, kh.textY, SZENEN_TEXTE.kaffee, { skala: pixelSkala(kh.schriftPx), farbe: 0xffffff, rand })
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setVisible(this.kaffee);
    this.verschuettetText = new PixelText(this, w / 2, VERSCHUETTET_MELDUNG.y, SZENEN_TEXTE.verschuettet, {
      skala: pixelSkala(VERSCHUETTET_MELDUNG.schriftPx),
      farbe: farbeAusText(VERSCHUETTET_MELDUNG.farbe),
      rand,
      ox: 0.5,
      oy: 0.5,
    })
      .setScrollFactor(0)
      .setDepth(HUD_TIEFE)
      .setVisible(false);
  }

}
