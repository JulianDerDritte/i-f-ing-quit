// Hilfen fuer das feine Zeichnen (A-012, Skala 1): Zeichengitter verdoppeln, Licht- und Schattenkanten, Punktmuster. Rein, ohne Phaser.
import { DURCHSICHTIG, kopie, punktAn } from './raster.ts';
import type { Raster } from './raster.ts';

// Jedes Zeichen wird ein 2 x 2 grosser Block (alte Zeichnung in doppelter Aufloesung).
export function verdoppeln(zeilen: readonly string[]): string[] {
  const aus: string[] = [];
  for (const z of zeilen) {
    const breit = [...z].map((c) => c + c).join('');
    aus.push(breit, breit);
  }
  return aus;
}

export interface Ton {
  licht: number;
  schatten: number;
}

// Licht- und Schattenkante je Material: Ein Punkt der Materialfarbe, dessen linker oder oberer Nachbar nicht dieselbe Farbe
// hat, bekommt die Lichtfarbe; sonst einer, dessen rechter oder unterer Nachbar nicht dieselbe Farbe hat, die Schattenfarbe.
export function kantenLicht(r: Raster, material: ReadonlyMap<number, Ton>): Raster {
  const z = kopie(r);
  for (let y = 0; y < r.hoehe; y++) {
    for (let x = 0; x < r.breite; x++) {
      const f = r.punkte[y * r.breite + x];
      const t = material.get(f);
      if (t === undefined) continue;
      if (punktAn(r, x - 1, y) !== f || punktAn(r, x, y - 1) !== f) z.punkte[y * r.breite + x] = t.licht;
      else if (punktAn(r, x + 1, y) !== f || punktAn(r, x, y + 1) !== f) z.punkte[y * r.breite + x] = t.schatten;
    }
  }
  return z;
}

// Zeichnet `farbe` auf alle Punkte der Farbe `auf`, fuer die `regel(x, y)` gilt (feste Muster, kein Zufall).
export function muster(r: Raster, auf: number, farbe: number, regel: (x: number, y: number) => boolean): void {
  for (let y = 0; y < r.hoehe; y++) {
    for (let x = 0; x < r.breite; x++) {
      if (r.punkte[y * r.breite + x] === auf && regel(x, y)) r.punkte[y * r.breite + x] = farbe;
    }
  }
}

export function setzeWenn(r: Raster, x: number, y: number, farbe: number): void {
  if (x < 0 || y < 0 || x >= r.breite || y >= r.hoehe) throw new Error(`Detailpunkt ausserhalb: ${x},${y}`);
  if (r.punkte[y * r.breite + x] !== DURCHSICHTIG) r.punkte[y * r.breite + x] = farbe;
}
