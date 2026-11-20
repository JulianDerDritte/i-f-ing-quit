// Kamera-Rechnungen ohne Phaser (A-012): Zoom der Welt, Grenzen, Ausschnitt, Textskala, Rundung, Zuordnungspruefung.
import { BILD_GROESSE, KACHEL_BREITE, KACHEL_HOEHE, KAMERA_LERP, KAMERA_ZOOM, WAND_HOEHE } from '../config.ts';
import type { Karte } from '../karte.ts';
import { GLYPH_HOEHE, pixelSkala } from './schrift.ts';

// Kleine Schnittstelle der Phaser-Kamera (nur, was gebraucht wird), damit richteKamerasEin ohne Phaser testbar ist.
export interface KameraSchnittstelle {
  setZoom(zoom: number): unknown;
  setBounds(x: number, y: number, breite: number, hoehe: number): unknown;
  setRoundPixels(rund: boolean): unknown;
  setScroll(x: number, y: number): unknown;
  startFollow(ziel: object, roundPixels: boolean, lerpX: number, lerpY: number): unknown;
}
export interface KameraVerwaltung<K extends KameraSchnittstelle> {
  main: K;
  add(x: number, y: number, breite: number, hoehe: number): K;
}

// Grenzen der Hauptkamera in Weltpunkten: die ganze Karte samt Wandhoehe (Zoom rechnet Phaser selbst ein).
export function kameraGrenzen(karte: Karte): { x: number; y: number; breite: number; hoehe: number } {
  return {
    x: -karte.hoehe * (KACHEL_BREITE / 2),
    y: -WAND_HOEHE,
    breite: (karte.breite + karte.hoehe) * (KACHEL_BREITE / 2),
    hoehe: (karte.breite + karte.hoehe) * (KACHEL_HOEHE / 2) + WAND_HOEHE,
  };
}

// Sichtbarer Ausschnitt der Welt: Weltpunkte und Kachelmasse (Breite in Kachelbreiten, Hoehe in Kachelhoehen).
export function sichtbarerAusschnitt(zoom: number): { breite: number; hoehe: number; kachelnX: number; kachelnY: number } {
  const breite = BILD_GROESSE.breite / zoom;
  const hoehe = BILD_GROESSE.hoehe / zoom;
  return { breite, hoehe, kachelnX: breite / KACHEL_BREITE, kachelnY: hoehe / KACHEL_HOEHE };
}

// Szenenstart: Hauptkamera zoomt (absolut, nie relativ), folgt dem Ziel ohne Verzoegerung und bleibt in den Kartengrenzen;
// die Oberflaechenkamera deckt das ganze Bild ab, hat Zoom 1 und Scroll 0. Beide runden auf ganze Punkte.
export function richteKamerasEin<K extends KameraSchnittstelle>(kameras: KameraVerwaltung<K>, ziel: object, karte: Karte): { haupt: K; oberflaeche: K } {
  const haupt = kameras.main;
  haupt.setZoom(KAMERA_ZOOM);
  const g = kameraGrenzen(karte);
  haupt.setBounds(g.x, g.y, g.breite, g.hoehe);
  haupt.setRoundPixels(true);
  haupt.startFollow(ziel, true, KAMERA_LERP, KAMERA_LERP);
  const oberflaeche = kameras.add(0, 0, BILD_GROESSE.breite, BILD_GROESSE.hoehe);
  oberflaeche.setZoom(1);
  oberflaeche.setScroll(0, 0);
  oberflaeche.setRoundPixels(true);
  return { haupt, oberflaeche };
}

// Skala eines Textes der Welt: die Hauptkamera zoomt mit, also Skala / Zoom (Bildschirmgroesse wie ohne Zoom).
export function weltTextSkala(px: number): number {
  return pixelSkala(px) / KAMERA_ZOOM;
}

// Glyphhoehe in Bildschirmpunkten, wenn ein Welt-Text die Skala `skala` hat.
export function effektiveGlyphHoehe(skala: number): number {
  return GLYPH_HOEHE * skala * KAMERA_ZOOM;
}

// Anzeigeposition: ganze Weltpunkte (nur Anzeige, die Logik bleibt unberuehrt).
export function anzeigePunkt(x: number, y: number): { x: number; y: number } {
  return { x: Math.round(x), y: Math.round(y) };
}

// Jedes Objekt muss von genau einer der beiden Kameras ignoriert werden (Bit der Kamera im Filterwert gesetzt).
// Liefert je Fehler einen Satz; leere Liste = in Ordnung.
export function pruefeZuordnung(filterwerte: readonly number[], idHaupt: number, idUi: number): string[] {
  const fehler: string[] = [];
  filterwerte.forEach((w, i) => {
    const haupt = (w & idHaupt) !== 0;
    const ui = (w & idUi) !== 0;
    if (!haupt && !ui) fehler.push(`Objekt ${i}: von keiner Kamera ignoriert (wird doppelt gezeichnet)`);
    else if (haupt && ui) fehler.push(`Objekt ${i}: von beiden Kameras ignoriert (unsichtbar)`);
  });
  return fehler;
}
