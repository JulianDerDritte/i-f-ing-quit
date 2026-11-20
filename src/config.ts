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

export function zeitText(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
