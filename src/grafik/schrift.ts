// Pixelschrift im Code (5x7-Glyphen, ohne Webfont und ohne Datei). Rein, ohne Phaser.
// Zelle je Zeichen: Vorschub 6 Punkte, Zeile 11 Punkte (2 Zeilen Akzent oben, 7 Zeilen Hoehe, 2 Zeilen Unterlaenge).
import { mitUmriss, neuesRaster, setzePunkt } from './raster.ts';
import type { Raster } from './raster.ts';

export const GLYPH_BREITE = 5;
export const GLYPH_HOEHE = 7;
export const VORSCHUB = 6;
export const VORSCHUB_ENG = 5; // enge Schrift (Glyphen ohne Luecke) fuer eine Beschriftung, die sonst nicht in ihren Knopf passt
export const ZEILE = 11;
const AKZENT_OBEN = 2;

// 7 Zeilen je Zeichen ('#' = Punkt); Unterlaengen (g j p q y , ;) als zusaetzliche 2 Zeilen
const G: Record<string, string[]> = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '#.##.', '##..#', '#...#', '##..#', '#.##.'],
  c: ['.....', '.....', '.###.', '#...#', '#....', '#...#', '.###.'],
  d: ['....#', '....#', '.##.#', '#..##', '#...#', '#..##', '.##.#'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#..#', '.#...', '###..', '.#...', '.#...', '.#...'],
  g: ['.....', '.....', '.####', '#...#', '#...#', '#...#', '.####'],
  h: ['#....', '#....', '#.##.', '##..#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '...#.', '...#.'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '#.##.', '##..#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '#.##.', '##..#', '#...#', '##..#', '#.##.'],
  q: ['.....', '.....', '.##.#', '#..##', '#...#', '#..##', '.##.#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '###..', '.#...', '.#...', '.#..#', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '.....', '#...#', '#...#', '.#.#.', '..#..', '..#..'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  ß: ['.###.', '#...#', '#...#', '#.##.', '#...#', '#...#', '#.##.'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '−': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '„': ['.....', '.....', '.....', '.....', '##.##', '##.##', '#..#.'],
  '“': ['#..#.', '##.##', '##.##', '.....', '.....', '.....', '.....'],
  '·': ['.....', '.....', '.....', '..#..', '.....', '.....', '.....'],
  "'": ['.##..', '.##..', '.#...', '.....', '.....', '.....', '.....'],
};
// Unterlaengen (2 Zeilen unter dem Glyph)
const UNTEN: Record<string, string[]> = {
  g: ['....#', '.###.'],
  j: ['#..#.', '.##..'],
  p: ['#....', '#....'],
  q: ['....#', '....#'],
  y: ['.#...', '#....'],
  ',': ['.#...', '#....'],
  ';': ['.#...', '#....'],
};
// Umlaut-Punkte: Kleinbuchstaben in Zeile 0 des Glyphs, Grossbuchstaben in der Akzentzeile 0 ueber dem Glyph
const UMLAUT: Record<string, { basis: string; gross: boolean }> = {
  ä: { basis: 'a', gross: false },
  ö: { basis: 'o', gross: false },
  ü: { basis: 'u', gross: false },
  Ä: { basis: 'A', gross: true },
  Ö: { basis: 'O', gross: true },
  Ü: { basis: 'U', gross: true },
};

// Alle setzbaren Zeichen
export const ZEICHENSATZ: readonly string[] = [...Object.keys(G), ...Object.keys(UMLAUT)];

// Zeichen eines Textes ohne Glyph (Zeilenumbruch zaehlt nicht); leere Liste = alles setzbar
export function fehlendeZeichen(text: string): string[] {
  const satz = new Set(ZEICHENSATZ);
  const fehlt: string[] = [];
  for (const c of text) if (c !== '\n' && !satz.has(c) && !fehlt.includes(c)) fehlt.push(c);
  return fehlt;
}

// Glyph als Raster der Zelle (6 x 11): Punkte der Farbe `farbe`
function glyphInZelle(r: Raster, c: string, ox: number, farbe: number): void {
  let zeilen = G[c];
  let umlaut: { basis: string; gross: boolean } | undefined;
  if (zeilen === undefined) {
    umlaut = UMLAUT[c];
    if (umlaut === undefined) throw new Error(`Zeichen "${c}" fehlt in der Pixelschrift`);
    zeilen = G[umlaut.basis];
  }
  zeilen.forEach((z, y) => {
    for (let x = 0; x < GLYPH_BREITE; x++) if (z[x] === '#') setzePunkt(r, ox + x, AKZENT_OBEN + y, farbe);
  });
  const unten = UNTEN[c] ?? (umlaut !== undefined ? UNTEN[umlaut.basis] : undefined);
  unten?.forEach((z, y) => {
    for (let x = 0; x < GLYPH_BREITE; x++) if (z[x] === '#') setzePunkt(r, ox + x, AKZENT_OBEN + GLYPH_HOEHE + y, farbe);
  });
  if (umlaut !== undefined) {
    const y = umlaut.gross ? 0 : AKZENT_OBEN;
    setzePunkt(r, ox + 1, y, farbe);
    setzePunkt(r, ox + 3, y, farbe);
  }
}

// Breite eines Textes in Rasterpunkten (laengste Zeile)
export function textBreitePunkte(text: string, vorschub: number = VORSCHUB): number {
  return Math.max(...text.split('\n').map((z) => [...z].length)) * vorschub;
}

// Breite und Hoehe des Textes in Bildschirmpunkten bei Skala s (ohne Rand)
export function textMasse(text: string, skala: number, vorschub: number = VORSCHUB): { breite: number; hoehe: number } {
  return { breite: textBreitePunkte(text, vorschub) * skala, hoehe: text.split('\n').length * ZEILE * skala };
}

// Pixelskala fuer eine Zielgroesse in Bildpunkten: ganze Vielfache der Glyphhoehe 7, mindestens 2 (= 14 Punkte)
export function pixelSkala(px: number): number {
  return Math.max(2, Math.floor(px / GLYPH_HOEHE));
}

// Raster eines (mehrzeiligen) Textes; mit `rand` ein Punkt breiter Rand (Raster ist dann 2 Punkte breiter und hoeher)
export function textRaster(text: string, farbe: number, rand: number | null, vorschub: number = VORSCHUB): Raster {
  const fehlt = fehlendeZeichen(text);
  if (fehlt.length > 0) throw new Error(`Zeichen ohne Glyph: ${fehlt.join(' ')}`);
  const zeilen = text.split('\n');
  const r = neuesRaster(Math.max(1, textBreitePunkte(text, vorschub)), zeilen.length * ZEILE);
  zeilen.forEach((z, i) => {
    const t = neuesRaster(r.breite, ZEILE);
    [...z].forEach((c, k) => glyphInZelle(t, c, k * vorschub, farbe));
    for (let y = 0; y < ZEILE; y++) for (let x = 0; x < r.breite; x++) r.punkte[(i * ZEILE + y) * r.breite + x] = t.punkte[y * r.breite + x];
  });
  return rand === null ? r : mitUmriss(r, rand);
}

// Umbruch an Leerzeichen auf hoechstens maxPunkte Bildschirmpunkte Breite (Skala s); ein zu langes Wort bleibt ganz.
export function umbrechen(text: string, maxPunkte: number, skala: number): string {
  const maxZeichen = Math.max(1, Math.floor(maxPunkte / (VORSCHUB * skala)));
  const zeilen: string[] = [];
  for (const absatz of text.split('\n')) {
    let aktuell = '';
    for (const wort of absatz.split(' ')) {
      if (aktuell === '') aktuell = wort;
      else if ([...aktuell].length + 1 + [...wort].length <= maxZeichen) aktuell += ' ' + wort;
      else {
        zeilen.push(aktuell);
        aktuell = wort;
      }
    }
    zeilen.push(aktuell);
  }
  return zeilen.join('\n');
}
