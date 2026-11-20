// Einzige Stelle fuer Spielwerte.
export type Stufe = 'leicht' | 'normal' | 'schwer';

export const TIMER_SEKUNDEN: Record<Stufe, number> = {
  leicht: 600,
  normal: 450,
  schwer: 300,
};

export const STUFEN: readonly Stufe[] = ['leicht', 'normal', 'schwer'];

export const STUFEN_NAMEN: Record<Stufe, string> = {
  leicht: 'Leicht',
  normal: 'Normal',
  schwer: 'Schwer',
};

export const DIALOG_SEKUNDEN = {
  min: 30,
  max: 60,
};

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
export const TIMER_WARNUNG_SEKUNDEN = 60; // ab dieser Restzeit (einschliesslich) ist die Zahl rot
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
