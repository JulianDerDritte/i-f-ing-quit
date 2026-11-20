// Isometrischer Block (2:1) als Pixelraster: Deckflaeche und zwei Seitenflaechen, Umriss nur an den Silhouetten, die an
// keinen Nachbarblock grenzen. Rein, ohne Phaser. A-012: Skala 1, Raster 64 Punkte breit (= Kachelbreite 64 / Skala 1),
// unten Mitte = Eckpunkt s. Die Deckflaeche ist eine volle Raute von 64 x 32 Rasterpunkten.
import { KACHEL_BREITE, KACHEL_HOEHE, SPRITE_SKALA } from '../config.ts';
import { DURCHSICHTIG, neuesRaster } from './raster.ts';
import type { Raster } from './raster.ts';

export const BLOCK_BREITE = KACHEL_BREITE / SPRITE_SKALA;
export const KACHEL_ZEILEN = KACHEL_HOEHE / SPRITE_SKALA; // Hoehe der Deckflaeche in Rasterzeilen

export interface BlockMaler {
  // tx, ty: Lage in der Zelle (0..1); X, Yb: Rasterpunkt, Yb von der Oberkante der Deckflaeche
  oben(tx: number, ty: number, X: number, Yb: number): number;
  // u: 0..1 entlang der Flaeche, v: Rasterzeilen ueber dem Boden (0 = unten)
  links(u: number, v: number, X: number, Yb: number): number;
  rechts(u: number, v: number, X: number, Yb: number): number;
}

export interface BlockOpt {
  hoehe: number; // Rasterzeilen der Seitenflaechen (Weltpunkte / Skala)
  oben: number; // zusaetzliche leere Zeilen ueber dem Block (fuer Aufsaetze)
  vonHoehe?: number; // Seitenflaechen erst ab dieser Hoehe (Tuersturz)
  nachbar: (dx: number, dy: number) => boolean; // steht dort ein Block derselben Art (Seitenflaechen)?
  nachbarOben?: (dx: number, dy: number) => boolean; // wie nachbar, aber fuer die Kanten der Deckflaeche (Standard: nachbar)
  maler: BlockMaler;
  umriss: number;
  kante: number; // Farbe der Deckkante zu einer sichtbaren Seitenflaeche
}

// Randbreite der Deckflaeche in Zellanteilen: etwa 1,2 Rasterpunkte (die Zelle misst quer rund 28,6 Punkte)
const RAND = 0.042;
// Die Raute reicht bis an die Spitzen: Pixel zaehlen, wenn ihre Mitte hoechstens einen halben Punkt ausserhalb der Raute liegt.
const SPITZE = 1 / BLOCK_BREITE + 0.002; // eine halbe Punktbreite in Anteilen der halben Breite, mit Rundungsreserve

export function blockRaster(o: BlockOpt): Raster {
  const hoeheGesamt = KACHEL_ZEILEN + o.hoehe + o.oben;
  const r = neuesRaster(BLOCK_BREITE, hoeheGesamt);
  const nb = o.nachbar;
  const nbo = o.nachbarOben ?? o.nachbar;
  const flaeche = new Uint8Array(r.punkte.length); // 1 oben, 2 links, 3 rechts
  const hb = BLOCK_BREITE / 2;
  const hz = KACHEL_ZEILEN / 2;
  for (let Y = o.oben; Y < hoeheGesamt; Y++) {
    const Yb = Y - o.oben;
    for (let X = 0; X < BLOCK_BREITE; X++) {
      const cx = X + 0.5;
      const cy = Yb + 0.5;
      const sx = (cx - hb) / hb;
      const sy = (cy - hz) / hz;
      let f = DURCHSICHTIG;
      if (Math.abs(sx) + Math.abs(sy) <= 1 + SPITZE) {
        const tx = (sx + sy) / 2 + 0.5;
        const ty = (sy - sx) / 2 + 0.5;
        if (tx < RAND && !nbo(-1, 0)) f = o.umriss;
        else if (ty < RAND && !nbo(0, -1)) f = o.umriss;
        else if (tx > 1 - RAND && !nbo(1, 0)) f = o.kante;
        else if (ty > 1 - RAND && !nbo(0, 1)) f = o.kante;
        else f = o.maler.oben(Math.min(1, Math.max(0, tx)), Math.min(1, Math.max(0, ty)), X, Yb);
        flaeche[Y * BLOCK_BREITE + X] = 1;
      } else if (X < hb) {
        const yL = hz + cx / 2;
        if (cy > yL && cy <= yL + o.hoehe) {
          const v = Math.floor(yL + o.hoehe - cy);
          if (o.vonHoehe === undefined || v >= o.vonHoehe) {
            f = o.maler.links(cx / hb, v, X, Yb);
            flaeche[Y * BLOCK_BREITE + X] = 2;
          }
        }
      } else {
        const yR = 2 * hz - (cx - hb) / 2;
        if (cy > yR && cy <= yR + o.hoehe) {
          const v = Math.floor(yR + o.hoehe - cy);
          if (o.vonHoehe === undefined || v >= o.vonHoehe) {
            f = o.maler.rechts((cx - hb) / hb, v, X, Yb);
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
        if (X === hb - 1 && !nb(1, 0) && !nb(0, 1)) r.punkte[Y * BLOCK_BREITE + X] = o.kante; // Kante zwischen beiden Seiten
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
