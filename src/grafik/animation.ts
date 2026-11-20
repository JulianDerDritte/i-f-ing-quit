// Blickrichtung und Laufschritt aus der Bewegung (ohne Phaser). Die Szene ruft nur figurZustand auf.
import { LAUF_TAKT_MS } from '../config.ts';
import type { Richtung } from './figuren.ts';

// Positionsaenderung des Bildes (Bildschirmpunkte), ab der die Figur als bewegt gilt.
export const BEWEGUNG_EPS = 0.01;

// Richtung aus dem Bildschirmvektor (dbx, dby); jede Achse behaelt bei (fast) 0 den alten Wert.
// Erste Stelle: o = oben (dby < 0), u = unten; zweite Stelle: l = links (dbx < 0), r = rechts.
export function richtungAusBewegung(letzte: Richtung, dbx: number, dby: number): Richtung {
  const senkrecht = Math.abs(dby) > BEWEGUNG_EPS ? (dby < 0 ? 'o' : 'u') : letzte[0];
  const waagerecht = Math.abs(dbx) > BEWEGUNG_EPS ? (dbx < 0 ? 'l' : 'r') : letzte[1];
  return (senkrecht + waagerecht) as Richtung;
}

// Laufbild nach akkuMs Bewegungszeit: wechselt alle taktMs, laeuft im Kreis ueber `anzahl` Bilder.
export function laufSchritt(akkuMs: number, taktMs: number, anzahl: number): number {
  if (!(taktMs > 0) || anzahl < 1) throw new Error('Takt und Bildzahl muessen positiv sein');
  return Math.floor(Math.max(0, akkuMs) / taktMs) % anzahl;
}

export interface FigurZustand {
  richtung: Richtung;
  schritt: number;
  bewegt: boolean;
  akkuMs: number; // Bewegungszeit seit dem letzten Stillstand
  x: number; // letzte Bildposition
  y: number;
}

export function neuerFigurZustand(x: number, y: number, richtung: Richtung): FigurZustand {
  return { richtung, schritt: 0, bewegt: false, akkuMs: 0, x, y };
}

// Naechster Zustand bei neuer Bildposition (x, y) nach deltaMs; bewegt heisst: Position hat sich geaendert.
export function figurZustand(alt: FigurZustand, x: number, y: number, deltaMs: number, anzahl: number, taktMs: number = LAUF_TAKT_MS): FigurZustand {
  const dx = x - alt.x;
  const dy = y - alt.y;
  const bewegt = Math.hypot(dx, dy) > BEWEGUNG_EPS;
  if (!bewegt) return { richtung: alt.richtung, schritt: 0, bewegt: false, akkuMs: 0, x, y };
  const akkuMs = alt.akkuMs + Math.max(0, deltaMs);
  return { richtung: richtungAusBewegung(alt.richtung, dx, dy), schritt: laufSchritt(akkuMs, taktMs, anzahl), bewegt: true, akkuMs, x, y };
}

// Stehbild an derselben Stelle (Gespraech, Inventar, Ende): Richtung bleibt.
export function stehen(alt: FigurZustand): FigurZustand {
  return { ...alt, schritt: 0, bewegt: false, akkuMs: 0 };
}
