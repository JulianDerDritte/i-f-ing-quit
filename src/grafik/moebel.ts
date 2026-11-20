// Moebel und Dekor als Pixelraster: Schreibtisch, Kaffeemaschine, Pflanze, Ablage-Markierung, Tuersturz mit Schild.
// Rein, ohne Phaser. Bloecke haben unten Mitte den Eckpunkt s der Zelle (siehe block.ts).
import { MASCHINE_HOEHE, PALETTE, TISCH_HOEHE } from '../config.ts';
import { blockRaster } from './block.ts';
import type { BlockMaler } from './block.ts';
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
};

// Schreibtisch: 12 Rasterzeilen hoch (= TISCH_HOEHE 24 Bildschirmpunkte), darauf Monitor, Papier, Tasse
export const TISCH_ZEILEN = TISCH_HOEHE / 2;
export const TISCH_AUFSATZ = 10;
export const TISCH_VARIANTEN = 3;

const MONITOR = ['MMMMMMMMM', 'MbbbbbbbM', 'MbBbbbbbM', 'MbbbbbbbM', 'MbbbbbbbM', 'MMMMMMMMM', '....M....', '..MMMMM..'];
const STAPEL = ['TTTTTTT', 'TlllllT', 'TTTTTTT', 'lllllll'];
const TASSE = ['CCCC', 'CccC', '.CC.'];

function tischMaler(): BlockMaler {
  return {
    oben: (_tx, _ty, X, Yb) => ((X + Yb * 2) % 7 === 0 ? P.holz : P.holzLicht),
    links: (_u, v, X) => {
      if (v === 0) return P.holzTief;
      if (v >= 10) return P.holzLicht;
      // Schublade mit Griff
      if (X >= 3 && X <= 12 && v >= 3 && v <= 8) {
        if (X === 3 || X === 12 || v === 3 || v === 8) return P.holzTief;
        if (v === 6 && X >= 7 && X <= 8) return P.schwelle;
        return P.holz;
      }
      return P.holz;
    },
    rechts: (_u, v, X) => {
      if (v === 0) return P.holzTief;
      if (v >= 10) return P.holz;
      if (X === 24 || X === 25) return P.holzTief;
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
  const mitte = TISCH_AUFSATZ + 8;
  const setze = (zeilen: string[], mx: number): void => {
    const o = mitUmriss(rasterAusZeilen(zeilen, FARBEN), P.umriss);
    ueberlagern(r, o, mx - Math.floor(o.breite / 2), mitte + 1 - o.hoehe);
  };
  if (variante === 0) setze(MONITOR, 16);
  if (variante === 1) {
    setze(MONITOR, 12);
    setze(STAPEL, 21);
  }
  if (variante === 2) {
    setze(STAPEL, 14);
    setze(TASSE, 21);
  }
  return r;
}

// Kaffeemaschine (Zelle K): Block mit Anzeige und Knoepfen, oben Kanne und Tasse
export const MASCHINE_ZEILEN = MASCHINE_HOEHE / 2;
export const MASCHINE_AUFSATZ = 10;
const KANNE = ['.GGGG.', 'GccccG', 'GccccG', 'GccccG', 'GccccG', '.GGGG.'];

export function maschineRaster(): Raster {
  const maler: BlockMaler = {
    oben: (_tx, _ty, X, Yb) => ((X + Yb) % 5 === 0 ? P.grau : P.grauLicht),
    links: (_u, v, X) => {
      if (v === 0) return P.holzTief;
      if (v >= 13) return P.maschineLicht;
      // Anzeige und Knoepfe
      if (v >= 8 && v <= 11 && X >= 3 && X <= 12) return X === 3 || X === 12 || v === 8 || v === 11 ? P.umriss : P.gruenLicht;
      if (v === 5 && (X === 4 || X === 7 || X === 10)) return P.krawatteRot;
      return P.maschine;
    },
    rechts: (_u, v, X) => {
      if (v === 0) return P.holzTief;
      if (v >= 13) return P.maschine;
      if (X === 24 || X === 25) return P.holzTief;
      return tonen(P.maschine, 0.78);
    },
  };
  const r = blockRaster({ hoehe: MASCHINE_ZEILEN, oben: MASCHINE_AUFSATZ, nachbar: () => false, maler, umriss: P.umriss, kante: P.holzTief });
  const mitte = MASCHINE_AUFSATZ + 8;
  const kanne = mitUmriss(rasterAusZeilen(KANNE, FARBEN), P.umriss);
  ueberlagern(r, kanne, 11, mitte + 1 - kanne.hoehe);
  const tasse = mitUmriss(rasterAusZeilen(TASSE, FARBEN), P.umriss);
  ueberlagern(r, tasse, 20, mitte + 2 - tasse.hoehe);
  return r;
}

const PFLANZE = [
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
];

export function pflanzeRaster(): Raster {
  return mitUmriss(rasterAusZeilen(PFLANZE, FARBEN), P.umriss);
}

// Markierung auf der Ablagezelle: Blatt mit gelbem Pfeil (flach auf dem Boden)
const ABLAGE = [
  'TTTTTT..Y...',
  'TlllTT..YY..',
  'TTTTTTYYYYY.',
  'TlllTTYYYYYY',
  'TTTTTTYYYYY.',
  'TlllTT..YY..',
  'TTTTTT..Y...',
];

export function ablageMarkierung(): Raster {
  return mitUmriss(rasterAusZeilen(ABLAGE, FARBEN), P.umriss);
}

// Schild mit Grossbuchstaben (3x5-Schrift, nur die benoetigten Buchstaben)
const BUCHSTABEN: Record<string, string[]> = {
  C: ['XXX', 'X..', 'X..', 'X..', 'XXX'],
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
};

export function schildRaster(text: string): Raster {
  const n = text.length;
  const breite = n * 3 + (n - 1) + 2;
  const r = neuesRaster(breite, 7);
  rechteck(r, 0, 0, breite, 7, P.schildGrau);
  const tinte = 0x2a2a3c;
  [...text].forEach((c, i) => {
    const m = BUCHSTABEN[c];
    if (m === undefined) throw new Error(`Buchstabe ${c} fehlt im Schild-Zeichensatz`);
    m.forEach((zeile, y) => {
      [...zeile].forEach((p, x) => {
        if (p === 'X') r.punkte[(1 + y) * breite + 1 + i * 4 + x] = tinte;
      });
    });
  });
  return mitUmriss(r, P.umriss);
}

// Tuersturz ueber einer Tuerzelle: Block erst ab Hoehe 40 Bildschirmpunkte (Figur 36 hoch geht darunter durch)
export const STURZ_VON = 20;

export function sturzRaster(wandHoeheZeilen: number, kopfFarbe: number, nachbar: (dx: number, dy: number) => boolean): Raster {
  const maler: BlockMaler = {
    oben: (_tx, _ty, X, Yb) => ((X + Yb) % 6 === 0 ? tonen(kopfFarbe, 1.1) : kopfFarbe),
    links: (_u, v) => (v === STURZ_VON ? P.holzTief : v === STURZ_VON + 1 ? P.tuerHolzLicht : P.tuerHolz),
    rechts: (_u, v) => (v === STURZ_VON ? P.holzTief : v === STURZ_VON + 1 ? P.tuerHolz : tonen(P.tuerHolz, 0.8)),
  };
  return blockRaster({ hoehe: wandHoeheZeilen, oben: 0, vonHoehe: STURZ_VON, nachbar, maler, umriss: P.umriss, kante: P.holzTief });
}
