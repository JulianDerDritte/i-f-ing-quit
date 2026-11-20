// Isometrischer Block (2:1) als Pixelraster: Deckflaeche und zwei Seitenflaechen, Umriss nur an den Silhouetten, die an
// keinen Nachbarblock grenzen. Rein, ohne Phaser. Raster: 32 Punkte breit (= Kachelbreite 64 / Skala 2), unten Mitte = Eckpunkt s.
import { DURCHSICHTIG, neuesRaster } from './raster.ts';
import type { Raster } from './raster.ts';

export const BLOCK_BREITE = 32;
export const KACHEL_ZEILEN = 16; // Hoehe der Deckflaeche in Rasterzeilen

export interface BlockMaler {
  // tx, ty: Lage in der Zelle (0..1); X, Yb: Rasterpunkt, Yb von der Oberkante der Deckflaeche
  oben(tx: number, ty: number, X: number, Yb: number): number;
  // u: 0..1 entlang der Flaeche, v: Rasterzeilen ueber dem Boden (0 = unten)
  links(u: number, v: number, X: number, Yb: number): number;
  rechts(u: number, v: number, X: number, Yb: number): number;
}

export interface BlockOpt {
  hoehe: number; // Rasterzeilen der Seitenflaechen (Bildschirmpunkte / 2)
  oben: number; // zusaetzliche leere Zeilen ueber dem Block (fuer Aufsaetze)
  vonHoehe?: number; // Seitenflaechen erst ab dieser Hoehe (Tuersturz)
  nachbar: (dx: number, dy: number) => boolean; // steht dort ein Block derselben Art (Seitenflaechen)?
  nachbarOben?: (dx: number, dy: number) => boolean; // wie nachbar, aber fuer die Kanten der Deckflaeche (Standard: nachbar)
  maler: BlockMaler;
  umriss: number;
  kante: number; // Farbe der Deckkante zu einer sichtbaren Seitenflaeche
}

const RAND = 0.08;

export function blockRaster(o: BlockOpt): Raster {
  const hoeheGesamt = KACHEL_ZEILEN + o.hoehe + o.oben;
  const r = neuesRaster(BLOCK_BREITE, hoeheGesamt);
  const nb = o.nachbar;
  const nbo = o.nachbarOben ?? o.nachbar;
  const flaeche = new Uint8Array(r.punkte.length); // 1 oben, 2 links, 3 rechts
  for (let Y = o.oben; Y < hoeheGesamt; Y++) {
    const Yb = Y - o.oben;
    for (let X = 0; X < BLOCK_BREITE; X++) {
      const cx = X + 0.5;
      const cy = Yb + 0.5;
      const sx = (cx - 16) / 16;
      const sy = (cy - 8) / 8;
      let f = DURCHSICHTIG;
      if (Math.abs(sx) + Math.abs(sy) <= 1) {
        const tx = (sx + sy) / 2 + 0.5;
        const ty = (sy - sx) / 2 + 0.5;
        if (tx < RAND && !nbo(-1, 0)) f = o.umriss;
        else if (ty < RAND && !nbo(0, -1)) f = o.umriss;
        else if (tx > 1 - RAND && !nbo(1, 0)) f = o.kante;
        else if (ty > 1 - RAND && !nbo(0, 1)) f = o.kante;
        else f = o.maler.oben(tx, ty, X, Yb);
        flaeche[Y * BLOCK_BREITE + X] = 1;
      } else if (X < 16) {
        const yL = 8 + cx / 2;
        if (cy > yL && cy <= yL + o.hoehe) {
          const v = Math.floor(yL + o.hoehe - cy);
          if (o.vonHoehe === undefined || v >= o.vonHoehe) {
            f = o.maler.links(cx / 16, v, X, Yb);
            flaeche[Y * BLOCK_BREITE + X] = 2;
          }
        }
      } else {
        const yR = 16 - (cx - 16) / 2;
        if (cy > yR && cy <= yR + o.hoehe) {
          const v = Math.floor(yR + o.hoehe - cy);
          if (o.vonHoehe === undefined || v >= o.vonHoehe) {
            f = o.maler.rechts((cx - 16) / 16, v, X, Yb);
            flaeche[Y * BLOCK_BREITE + X] = 3;
          }
        }
      }
      r.punkte[Y * BLOCK_BREITE + X] = f;
    }
  }
  // Silhouette der Seitenflaechen
  const vor = r.punkte.slice();
  const leer = (x: number, y: number): boolean => x < 0 || y < 0 || x >= BLOCK_BREITE || y >= hoeheGesamt || vor[y * BLOCK_BREITE + x] === DURCHSICHTIG;
  const unten = o.vonHoehe !== undefined;
  for (let Y = o.oben; Y < hoeheGesamt; Y++) {
    for (let X = 0; X < BLOCK_BREITE; X++) {
      const art = flaeche[Y * BLOCK_BREITE + X];
      if (art === 2) {
        if (X === 15 && !nb(1, 0) && !nb(0, 1)) r.punkte[Y * BLOCK_BREITE + X] = o.kante; // Kante zwischen beiden Seiten
        if (leer(X, Y + 1) && (unten || !nb(0, 1))) r.punkte[Y * BLOCK_BREITE + X] = o.umriss;
        if (leer(X - 1, Y) && !(nb(-1, 0) && !nb(-1, 1))) r.punkte[Y * BLOCK_BREITE + X] = o.umriss;
      } else if (art === 3) {
        if (leer(X, Y + 1) && (unten || !nb(1, 0))) r.punkte[Y * BLOCK_BREITE + X] = o.umriss;
        if (leer(X + 1, Y) && !(nb(0, -1) && !nb(1, -1))) r.punkte[Y * BLOCK_BREITE + X] = o.umriss;
      }
    }
  }
  return r;
}
