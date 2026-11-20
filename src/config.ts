// Einzige Stelle fuer Spielwerte.
export type Stufe = 'leicht' | 'normal' | 'schwer';

export const TIMER_SEKUNDEN: Record<Stufe, number> = {
  leicht: 90,
  normal: 60,
  schwer: 40,
};

export const STUFEN: readonly Stufe[] = ['leicht', 'normal', 'schwer'];

export const STUFEN_NAMEN: Record<Stufe, string> = {
  leicht: 'Leicht',
  normal: 'Normal',
  schwer: 'Schwer',
};

// Zeitkosten eines Gespraechs in ganzen Sekunden (bis auf Weiteres; passend zu den kurzen Timern).
export const DIALOG_SEKUNDEN = {
  min: 3,
  max: 8,
};

export type NpcId = 'empfang' | 'buchhaltung' | 'teamleitung' | 'it' | 'vertrieb';
export const NPC_IDS: readonly NpcId[] = ['empfang', 'buchhaltung', 'teamleitung', 'it', 'vertrieb'];

// Dialogkosten je NPC (ganze Sekunden, zwischen DIALOG_SEKUNDEN.min und .max).
export const NPC_DIALOG_KOSTEN: Record<NpcId, number> = {
  empfang: 3,
  buchhaltung: 5,
  teamleitung: 8,
  it: 4,
  vertrieb: 6,
};

// Nachfragen im Gespraech: Zeitkosten in ganzen Sekunden, je Dialogbaum ein Wert (Dialog-id = NPC-id).
export const NACHFRAGE_SEKUNDEN = {
  min: 2,
  max: 5,
};
export const NACHFRAGE_KOSTEN: Record<NpcId, number> = {
  empfang: 2,
  buchhaltung: 3,
  teamleitung: 5,
  it: 4,
  vertrieb: 3,
};

// NPCs: Patrouillentempo (Zellen pro Sekunde), Kollisionsradius der Route (Zellen),
// Kontaktreichweite (Zellen, Abstand Mitte zu Mitte), Darstellung.
export const NPC_TEMPO = 1.5;
export const NPC_RADIUS = 0.3;
export const KONTAKT_RADIUS = 0.8;
export const NPC_SCHRIFT_PX = 12;
export const NPC_FARBEN: Record<NpcId, number> = {
  empfang: 0x4a7fd9,
  buchhaltung: 0x4ab36a,
  teamleitung: 0x9a5fd0,
  it: 0x2ab3b3,
  vertrieb: 0xd0d0d0,
};

// Dialogfenster am unteren Bildrand (Bildpunkte, Bild 800x640).
export const DIALOG_LAYOUT = {
  fensterX: 20,
  fensterY: 324,
  fensterBreite: 760,
  fensterHoehe: 306,
  randX: 20,
  randOben: 10,
  nameHoehe: 26,
  textHoehe: 100,
  kostenHoehe: 26,
  knopfHoehe: 36,
  luecke: 4,
  knopfLuecke: 6,
  textZuKnopfLuecke: 8,
};
export const DIALOG_NAME_SCHRIFT_PX = 20;
export const DIALOG_TEXT_SCHRIFT_PX = 18;
export const DIALOG_KOSTEN_SCHRIFT_PX = 16;
export const DIALOG_ANTWORT_SCHRIFT_PX = 16;
export const DIALOG_FENSTER_FARBE = 0x1c2433;
export const DIALOG_RAHMEN_FARBE = 0xffffff;
export const DIALOG_KNOPF_FARBE = 0x335577;
export const DIALOG_KNOPF_HOVER_FARBE = 0x4477aa;
export const DIALOG_NAME_FARBE = '#ffd966';
export const DIALOG_KOSTEN_FARBE = '#ffaa66';
export const DIALOG_TIEFE = 15000;
// Hoechste Zahl gleichzeitig angebotener Antworten (3 Antworten des Baums + "Kaffee überreichen").
export const DIALOG_MAX_ANTWORTEN = 4;

// Isometrische Darstellung (Rautenverhaeltnis 2:1: Kachelbreite = 2 * Kachelhoehe).
export const KACHEL_BREITE = 64;
export const KACHEL_HOEHE = 32;
// Hoehe der Bloecke in Bildpunkten.
export const WAND_HOEHE = 56;
export const TISCH_HOEHE = 24;

// Spielerfigur.
export const TEMPO_ZELLEN_PRO_SEKUNDE = 4;
export const FIGUR_RADIUS = 0.3; // in Zellen
// Laengster Zeitschritt eines Bildes (Sekunden); schuetzt vor Spruengen nach Tab-Wechsel.
export const MAX_ZEITSCHRITT_SEKUNDEN = 0.1;

// Ablegen der Kuendigung: groesster Abstand (Zellen) der Figurmitte zur Mitte der Ablagezelle.
export const ABLEGE_REICHWEITE = 1.0;

// Darstellung der Szenen (Stufe 7: Layout-Literale aus SpielScene.ts und MenueScene.ts; Werte unveraendert).
// Figur und NPCs (A-009: Pixel-Sprites aus src/grafik/); Hoehen in Bildpunkten ueber dem Fusspunkt.
export const FIGUR_DARSTELLUNG = {
  kameraHoehe: 15, // Punkt, dem die Kamera folgt
  nameHoehe: 46, // Rollenname ueber einem NPC
  schattenAlpha: 0.35,
  schattenFarbe: 0x000000,
};
export const KAMERA_LERP = 1; // Kamera folgt ohne Verzoegerung
export const BODEN_TIEFE = -1; // Bodenflaeche liegt hinter allem
// A-009 Teil a: Pixel-Grafik. Ein Rasterpunkt der Sprites = SPRITE_SKALA Bildschirmpunkte.
export const SPRITE_SKALA = 2;
export const LAUF_TAKT_MS = 110; // Dauer eines Laufbildes, solange sich die Figur bewegt
export const SPRITE_KONSTANTEN = { skala: SPRITE_SKALA, laufTakt: LAUF_TAKT_MS };
export const RAHMEN = { staerke: 2, farbe: 0xffffff };
export const SCHRIFT_RAND = { npc: 3, hud: 4, meldung: 6, maschine: 3, farbe: '#000000' };
export const DIALOG_ANTWORT_EINZUG = 12; // Text im Antwortknopf, Abstand vom linken Rand
// HUD oben links und "Zurück zum Menü" oben rechts.
export const HUD_LAYOUT = {
  raumX: 10,
  raumY: 8,
  raumPx: 22,
  stufeX: 10,
  stufeY: 38,
  stufePx: 14,
  timerY: 6,
  hinweisAbstandUnten: 14,
  zurueckAbstandRechts: 95, // Mitte des Knopfs vom rechten Bildrand
  zurueckY: 28,
  zurueckBreite: 170,
  zurueckHoehe: 36,
  zurueckPx: 16,
  zurueckFarbe: 0x553333,
};
// Meldung nach Sieg oder Niederlage (Abstaende von der Bildmitte).
export const MELDUNG_LAYOUT = {
  tiefe: 20000,
  titelDy: -110,
  zeitDy: -50,
  knopfDx: 110,
  knopfDy: 30,
  knopfBreite: 190,
  knopfHoehe: 56,
  knopfFarbe: 0x335577,
  knopfHoverFarbe: 0x4477aa,
  overlayFarbe: 0x000000,
};
// Startmenue.
export const MENUE_LAYOUT = {
  logoY: 140,
  logoGroesse: 260,
  titelY: 300,
  titelPx: 20,
  stufeY0: 370,
  stufeAbstand: 80,
  knopfBreite: 320,
  knopfHoehe: 64,
  schriftPx: 28,
  farbe: 0x335577,
  hoverFarbe: 0x4477aa,
};

// Zeichentiefe der HUD-Teile, die ab Stufe 6 dazukommen (gleich der bisherigen HUD-Tiefe der Szene).
export const HUD_TIEFE = 10000;

// Kaffee (Stufe 6): Nehmen an der Maschine kostet Zeit; Reichweite = groesster Abstand (Zellen) der Figurmitte
// zur Mitte der Maschinenzelle.
export const KAFFEE_NEHMEN_SEKUNDEN = 2;
export const KAFFEE_REICHWEITE = 1.0;
export const MASCHINE_FARBE = 0x5a3a28;
export const MASCHINE_HOEHE = 30; // Bildpunkte
export const MASCHINE_SCHRIFT_PX = 14;
export const KAFFEE_HINWEIS_TEXT = 'E/Leertaste: Kaffee nehmen';
// Kaffee im HUD (Bildpunkte, Bild 800x640): Symbol (Tasse) und Beschriftung links unter der Stufenzeile.
export const KAFFEE_HUD = {
  symbolX: 10,
  symbolY: 66,
  symbolBreite: 22,
  symbolHoehe: 20,
  symbolFarbe: 0xc58b4a,
  textX: 38,
  textY: 62,
  schriftPx: 20,
};
// Meldung "Kaffee verschüttet!" (Mitte oben unter dem Timer).
export const VERSCHUETTET_MELDUNG = { sekunden: 2, schriftPx: 28, y: 110, farbe: '#ffb060' };

// Inventarfenster (Bildpunkte, Bild 800x640); der Knopf "Inventar" liegt unter "Zurück zum Menü".
export const INVENTAR_KNOPF = { x: 620, y: 52, breite: 170, hoehe: 36, schriftPx: 16 };
export const INVENTAR_LAYOUT = {
  fensterX: 20,
  fensterY: 100,
  fensterBreite: 760,
  randX: 20,
  randOben: 8,
  randUnten: 16,
  titelHoehe: 32,
  luecke: 6,
  infoHoehe: 300,
  gegenstandHoehe: 56,
  knopfHoehe: 40,
  seiteKnopfBreite: 110,
  seiteAnzeigeBreite: 150,
  schliessenBreite: 150,
  // Seitenaufteilung (Schaetzung fuer Courier: Zeichenbreite 0,6 em, Zeilenhoehe 1,25 em; bewusst vorsichtig).
  zeichenProZeile: 70,
  maxZeilenProSeite: 12,
};
export const INVENTAR_TITEL_SCHRIFT_PX = 22;
export const INVENTAR_SCHRIFT_PX = 16;
export const INVENTAR_TIEFE = 16000;
export const INVENTAR_FENSTER_FARBE = 0x1c2433;
export const INVENTAR_TITEL_FARBE = '#ffd966';

// Startmenue: gespeicherte Infos und "Speicher löschen" (unter den Stufenknoepfen).
export const MENUE_SPEICHER = {
  textX: 40,
  y: 602,
  schriftPx: 20,
  knopfX: 640,
  knopfBreite: 240,
  knopfHoehe: 44,
  knopfSchriftPx: 20,
  knopfFarbe: 0x553333,
  knopfHoverFarbe: 0x774444,
};

// Timer-HUD und Meldungen.
export const TIMER_WARNUNG_SEKUNDEN = 10; // ab dieser Restzeit (einschliesslich) ist die Zahl rot
export const HUD_SCHRIFT_PX = 40;
export const HUD_FARBE_NORMAL = '#ffffff';
export const HUD_FARBE_WARNUNG = '#ff4040';
export const HINWEIS_SCHRIFT_PX = 20;
export const OVERLAY_ABDUNKLUNG = 0.7; // Deckkraft des schwarzen Schleiers (0 bis 1)
export const MELDUNG_SCHRIFT_PX = 48;
export const MELDUNG_ZEIT_SCHRIFT_PX = 24;
export const MELDUNG_KNOPF_SCHRIFT_PX = 24;

// Farben (Platzhalter). Je Bereich eine andere Bodenfarbe.
export const BODENFARBEN = {
  Vorzimmer: 0x6b8f71,
  Grossraumbuero: 0x7a8aa8,
  Chefbuero: 0xa88a6b,
  Tuer: 0x777777,
} as const;
export const WAND_FARBE = 0x8a8a96;
export const TISCH_FARBE = 0x9a6a3a;
export const ABLAGE_FARBE = 0xf2d24b;
export const START_FARBE = 0xffffff;
export const FIGUR_FARBE = 0xd94a4a;

// Gemeinsame Palette der Pixel-Grafik (kraeftige Farben wie im Icon; Name -> Farbzahl).
export const PALETTE = {
  umriss: 0x0b0b14,
  weiss: 0xffffff,
  augen: 0x14141e,
  haut: 0xf2b27a,
  schnurrbart: 0x1a1008,
  hautSchatten: 0xc98450,
  haarBraun: 0x8a4a1c,
  haarBraunLicht: 0xc0782e,
  haarBlond: 0xe0b040,
  haarBlondLicht: 0xf8d870,
  haarSchwarz: 0x2a2a38,
  haarSchwarzLicht: 0x4a4a62,
  haarGrau: 0x8c8c9c,
  haarGrauLicht: 0xb8b8c8,
  haarRot: 0xc04a1c,
  haarRotLicht: 0xe87a38,
  hemd: 0xf6f6ff,
  hemdSchatten: 0xb4badc,
  krawatte: FIGUR_FARBE,
  krawatteRot: 0xe01818,
  hose: 0x2e2c52,
  hoseLicht: 0x46447c,
  schuh: 0x6b3a1c,
  schuhSchwarz: 0x1c1c24,
  anzug: 0x30305e,
  anzugLicht: 0x4a4a8a,
  papier: 0xf6f6ff,
  papierLinie: 0x7a6ab8,
  grau: 0x6a6a7c,
  grauLicht: 0xa0a0b4,
  orange: 0xe08a30,
  kaffee: 0x5a3416,
  gruen: 0x30a83c,
  gruenLicht: 0x62d058,
  gruenDunkel: 0x1a6a2a,
  topf: 0xc8642c,
  topfDunkel: 0x8a3c18,
  erde: 0x3a2412,
  wandKopf: 0x8a8ee0,
  wandKopfLicht: 0xb4b8f4,
  wandLinks: 0x4a5cc8,
  wandLinksLicht: 0x6074e0,
  wandRechts: 0x3a4ab0,
  wandRechtsLicht: 0x4a5cc8,
  wandNaht: 0x34429a,
  sockel: 0x252c70,
  sockelLicht: 0x5666d0,
  fenster: 0x9ad8f0,
  fensterLicht: 0xd8f4ff,
  fensterRahmen: 0x1c2455,
  fensterBrett: 0xc0c8f8,
  lampe: 0xfff6b0,
  lampeKern: 0xffffff,
  lampeRand: 0xe0c060,
  fliesenHell: 0x8494e4,
  fliesenDunkel: 0x6474c8,
  fuge: 0x2a3274,
  fliesenGlanz: 0xa4b2f6,
  parkettHell: 0xb87a3c,
  parkettDunkel: 0x9c6430,
  parkettFuge: 0x56301a,
  teppich: 0xc8202c,
  teppichLicht: 0xe03c48,
  teppichDunkel: 0x5c0c16,
  schwelle: 0xe0b84c,
  schwelleDunkel: 0x6e4e1a,
  holz: TISCH_FARBE,
  holzLicht: 0xc88a48,
  holzDunkel: 0x6a3e18,
  holzTief: 0x4a2a10,
  monitor: 0x20243c,
  monitorLicht: 0x5ac8ff,
  maschine: MASCHINE_FARBE,
  maschineLicht: 0x8a5a3c,
  tuerHolz: 0x6a3a1c,
  tuerHolzLicht: 0x9a5a2c,
  gelb: ABLAGE_FARBE,
  gelbDunkel: 0xc89a10,
  pfeil: 0xf0a000,
  startWeiss: 0xf6f6ff,
  schildGrau: 0xb4b4c4,
  schatten: 0x1a1a2e,
} as const;

// Dekor und Wege der Pixel-Welt (nur Anzeige, keine Kollision; Karte und Spielregeln unveraendert).
// Chef: steht hinter den Chef-Tisch-Zellen (27-28, 3-4); reine Anzeige, die Figur darf dorthin laufen.
export const CHEF_ZELLE: [number, number] = [28, 2];
// Roter Teppichlaeufer: Zeilen 7 und 8 von x=9 bis x=26, dazu (26,6) und (26,5) (endet neben der Ablagezelle (27,5)).
export const TEPPICH_ZELLEN: [number, number][] = [
  ...Array.from({ length: 18 }, (_, i): [number, number] => [9 + i, 7]),
  ...Array.from({ length: 18 }, (_, i): [number, number] => [9 + i, 8]),
  [26, 6],
  [26, 5],
];
// Zimmerpflanzen in Ecken (Boden an der Wand).
export const PFLANZEN_ZELLEN: [number, number][] = [
  [1, 1],
  [8, 16],
  [10, 1],
  [23, 16],
  [25, 16],
  [30, 1],
];

export function zeitText(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
