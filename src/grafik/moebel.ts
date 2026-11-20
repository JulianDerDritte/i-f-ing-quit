// Moebel und Dekor als Pixelraster: Schreibtisch, Kaffeemaschine, Pflanze, Ablage-Markierung, Tuersturz mit Schild.
// Rein, ohne Phaser. Bloecke haben unten Mitte den Eckpunkt s der Zelle (siehe block.ts).
// A-012: Skala 1 (ein Rasterpunkt = ein Weltpunkt); Hoehen aus den Weltmassen geteilt durch SPRITE_SKALA.
import { MASCHINE_HOEHE, PALETTE, SPRITE_SKALA, TISCH_HOEHE } from '../config.ts';
import { blockRaster } from './block.ts';
import type { BlockMaler } from './block.ts';
import { kantenLicht, verdoppeln } from './fein.ts';
import { tonen } from './palette.ts';
import { mitUmriss, rasterAusZeilen, rechteck, ueberlagern, neuesRaster } from './raster.ts';
import type { Raster } from './raster.ts';

const P = PALETTE;
const FARBEN: Record<string, number> = {
  M: P.monitor,
  b: P.monitorLicht,
  B: P.weiss,
  T: P.papier,
  l: P.papierLinie,
  C: P.weiss,
  c: P.kaffee,
  G: P.grauLicht,
  g: P.gruen,
  d: P.topfDunkel,
  t: P.orange,
  u: P.topf,
  y: P.gruenDunkel,
  r: P.gruenLicht,
  Y: P.pfeil,
  q: P.tastatur,
  k: P.tastaturLicht,
  m: P.grau,
};

// Schreibtisch: 24 Rasterzeilen hoch (= TISCH_HOEHE 24 Weltpunkte), darauf Monitor, Papier, Tastatur, Becher
export const TISCH_ZEILEN = TISCH_HOEHE / SPRITE_SKALA;
export const TISCH_AUFSATZ = 20;
export const TISCH_VARIANTEN = 3;

const MONITOR = verdoppeln(['MMMMMMMMM', 'MbbbbbbbM', 'MbBbbbbbM', 'MbbbbbbbM', 'MbbbbbbbM', 'MMMMMMMMM', '....M....', '..MMMMM..']);
const STAPEL = verdoppeln(['TTTTTTT', 'TlllllT', 'TTTTTTT', 'TlllllT', 'lllllll']);
const TASSE = verdoppeln(['CCCC', 'CccC', '.CC.']);
const TASTATUR = ['qqqqqqqqqqqqqqqqqq', 'qkkqkkqkkqkkqkkqkq', 'qqqqqqqqqqqqqqqqqq', 'qkkkkkkkkkkkkkkkkq', 'qqqqqqqqqqqqqqqqqq'];

function tischMaler(): BlockMaler {
  return {
    oben: (_tx, _ty, X, Yb) => ((X + Yb * 2) % 14 < 2 ? P.holz : (X * 3 + Yb) % 23 === 0 ? P.holzDunkel : P.holzLicht),
    links: (_u, v, X) => {
      if (v === 0) return P.holzTief;
      if (v >= 20) return P.holzLicht;
      if (v === 19) return P.holzTief;
      // Schublade mit Griff
      if (X >= 6 && X <= 25 && v >= 5 && v <= 16) {
        if (X === 6 || X === 25 || v === 5 || v === 16) return P.holzTief;
        if (v === 11 && X >= 14 && X <= 17) return P.schwelle;
        if (v === 15) return P.holzLicht;
        return P.holz;
      }
      return P.holz;
    },
    rechts: (_u, v, X) => {
      if (v === 0) return P.holzTief;
      if (v >= 20) return P.holz;
      if (v === 19) return P.holzTief;
      if (X >= 48 && X <= 51) return P.holzTief;
      if (X === 40) return tonen(P.holz, 0.6);
      return tonen(P.holz, 0.78);
    },
  };
}

export function tischRaster(variante: number): Raster {
  if (!Number.isInteger(variante) || variante < 0 || variante >= TISCH_VARIANTEN) throw new Error(`Tischvariante ${variante} unbekannt`);
  const r = blockRaster({
    hoehe: TISCH_ZEILEN,
    oben: TISCH_AUFSATZ,
    nachbar: () => false,
    maler: tischMaler(),
    umriss: P.umriss,
    kante: P.holzTief,
  });
  const mitte = TISCH_AUFSATZ + 16;
  const setze = (zeilen: string[], mx: number, dy = 2): void => {
    const o = mitUmriss(rasterAusZeilen(zeilen, FARBEN), P.umriss);
    ueberlagern(r, o, mx - Math.floor(o.breite / 2), mitte + dy - o.hoehe);
  };
  if (variante === 0) {
    setze(MONITOR, 26);
    setze(TASTATUR, 44, 5);
  }
  if (variante === 1) {
    setze(MONITOR, 24);
    setze(STAPEL, 42);
  }
  if (variante === 2) {
    setze(STAPEL, 28);
    setze(TASSE, 44);
  }
  return r;
}

// Kaffeemaschine (Zelle K): Block mit Anzeige und Knoepfen, oben Kanne und Tasse
export const MASCHINE_ZEILEN = MASCHINE_HOEHE / SPRITE_SKALA;
export const MASCHINE_AUFSATZ = 20;
const KANNE = verdoppeln(['.GGGG.', 'GccccG', 'GccccG', 'GccccG', 'GccccG', '.GGGG.']);

export function maschineRaster(): Raster {
  const maler: BlockMaler = {
    oben: (_tx, _ty, X, Yb) => ((X + Yb) % 10 < 2 ? P.grau : P.grauLicht),
    links: (_u, v, X) => {
      if (v === 0) return P.holzTief;
      if (v >= 26) return P.maschineLicht;
      // Anzeige (mit Glanz) und Knoepfe
      if (v >= 16 && v <= 23 && X >= 6 && X <= 25) {
        if (X === 6 || X === 25 || v === 16 || v === 23) return P.umriss;
        return v === 22 && X < 14 ? P.fensterLicht : P.gruenLicht;
      }
      if (v >= 9 && v <= 10 && ((X >= 8 && X <= 9) || (X >= 14 && X <= 15) || (X >= 20 && X <= 21))) return P.krawatteRot;
      if (v === 4 && X >= 8 && X <= 23) return P.holzTief; // Ausgabeschlitz
      return P.maschine;
    },
    rechts: (_u, v, X) => {
      if (v === 0) return P.holzTief;
      if (v >= 26) return P.maschine;
      if (X >= 48 && X <= 51) return P.holzTief;
      return tonen(P.maschine, 0.78);
    },
  };
  const r = blockRaster({ hoehe: MASCHINE_ZEILEN, oben: MASCHINE_AUFSATZ, nachbar: () => false, maler, umriss: P.umriss, kante: P.holzTief });
  const mitte = MASCHINE_AUFSATZ + 16;
  const kanne = mitUmriss(rasterAusZeilen(KANNE, FARBEN), P.umriss);
  ueberlagern(r, kanne, 22, mitte + 2 - kanne.hoehe);
  const tasse = mitUmriss(rasterAusZeilen(TASSE, FARBEN), P.umriss);
  ueberlagern(r, tasse, 40, mitte + 4 - tasse.hoehe);
  return r;
}

const PFLANZE = verdoppeln([
  '......rg......',
  '.r...rgyg...r.',
  '.rg..rgyg..gr.',
  '.rgg.gyyg.ggr.',
  '..rggygygggr..',
  '...rgygygyr...',
  '.gr.gyygyg.rg.',
  '.ggygygygyggy.',
  '..gyygygyygy..',
  '...gyygygyg...',
  '....gygygy....',
  '.....gygy.....',
  '.......y......',
  '.......y......',
  '.......y......',
  '...tttttttt...',
  '...uuuuuuuu...',
  '...uuuuuuudu..',
  '....uuuuud....',
  '....uuuuud....',
]);

export function pflanzeRaster(): Raster {
  const r = rasterAusZeilen(PFLANZE, FARBEN);
  const k = kantenLicht(
    r,
    new Map([
      [P.gruen, { licht: P.gruenLicht, schatten: P.gruenDunkel }],
      [P.topf, { licht: P.topfLicht, schatten: P.topfDunkel }],
      [P.orange, { licht: tonen(P.orange, 1.25), schatten: P.topf }],
    ]),
  );
  return mitUmriss(k, P.umriss);
}

// Markierung auf der Ablagezelle: Blatt mit gelbem Pfeil (flach auf dem Boden)
const ABLAGE = verdoppeln([
  'TTTTTT..Y...',
  'TlllTT..YY..',
  'TTTTTTYYYYY.',
  'TlllTTYYYYYY',
  'TTTTTTYYYYY.',
  'TlllTT..YY..',
  'TTTTTT..Y...',
]);

export function ablageMarkierung(): Raster {
  return mitUmriss(rasterAusZeilen(ABLAGE, FARBEN), P.umriss);
}

// Schild mit Grossbuchstaben (3x5-Schrift verdoppelt, nur die benoetigten Buchstaben)
const BUCHSTABEN: Record<string, string[]> = {
  C: ['XXX', 'X..', 'X..', 'X..', 'XXX'],
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
};

export function schildRaster(text: string): Raster {
  const n = text.length;
  const breite = n * 6 + (n - 1) * 2 + 4;
  const hoehe = 14;
  const r = neuesRaster(breite, hoehe);
  rechteck(r, 0, 0, breite, hoehe, P.schildGrau);
  // Leiste: oben und links hell, unten und rechts dunkel
  rechteck(r, 0, 0, breite, 1, P.schildLicht);
  rechteck(r, 0, 0, 1, hoehe, P.schildLicht);
  rechteck(r, 0, hoehe - 1, breite, 1, P.grau);
  rechteck(r, breite - 1, 0, 1, hoehe, P.grau);
  const tinte = 0x2a2a3c;
  [...text].forEach((c, i) => {
    const m = BUCHSTABEN[c];
    if (m === undefined) throw new Error(`Buchstabe ${c} fehlt im Schild-Zeichensatz`);
    m.forEach((zeile, y) => {
      [...zeile].forEach((p, x) => {
        if (p !== 'X') return;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) r.punkte[(2 + y * 2 + dy) * breite + 2 + i * 8 + x * 2 + dx] = tinte;
      });
    });
  });
  return mitUmriss(r, P.umriss);
}

// Tuersturz ueber einer Tuerzelle: Block erst ab Hoehe 40 Weltpunkte (Figur 36 hoch geht darunter durch)
export const STURZ_VON = 40;

export function sturzRaster(wandHoeheZeilen: number, kopfFarbe: number, nachbar: (dx: number, dy: number) => boolean): Raster {
  const maler: BlockMaler = {
    oben: (_tx, _ty, X, Yb) => ((X + Yb) % 12 < 2 ? tonen(kopfFarbe, 1.1) : kopfFarbe),
    links: (_u, v, X) => (v === STURZ_VON ? P.holzTief : v <= STURZ_VON + 3 ? P.tuerHolzLicht : (X + v) % 9 === 0 ? P.holzTief : P.tuerHolz),
    rechts: (_u, v, X) => (v === STURZ_VON ? P.holzTief : v <= STURZ_VON + 3 ? P.tuerHolz : (X + v) % 9 === 0 ? tonen(P.tuerHolz, 0.6) : tonen(P.tuerHolz, 0.8)),
  };
  return blockRaster({ hoehe: wandHoeheZeilen, oben: 0, vonHoehe: STURZ_VON, nachbar, maler, umriss: P.umriss, kante: P.holzTief });
}
