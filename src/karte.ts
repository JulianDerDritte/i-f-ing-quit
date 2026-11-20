// Karte als Daten (ohne Phaser). Zelle (x, y) belegt [x, x+1) x [y, y+1).
// Zeichen: '#' Wand, '.' Boden, 'T' Tisch (Hindernis), 'S' Start, 'A' Ablagezelle.

export type BereichName = 'Vorzimmer' | 'Grossraumbuero' | 'Chefbuero';

export const BEREICH_ANZEIGE: Record<BereichName, string> = {
  Vorzimmer: 'Vorzimmer',
  Grossraumbuero: 'Großraumbüro',
  Chefbuero: 'Chefbüro',
};

export interface Bereich {
  name: BereichName;
  // Zellbereich, Grenzen eingeschlossen.
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Tuer {
  zwischen: [BereichName, BereichName];
  zellen: [number, number][];
}

export interface Karte {
  zeilen: string[];
  breite: number;
  hoehe: number;
  bereiche: Bereich[];
  tueren: Tuer[];
  start: [number, number];
  ablage: [number, number];
}

const ZEILEN: string[] = [
  '################################',
  '#........#..............#......#',
  '#........#..............#......#',
  '#..TTT...#..TT..TT..TT..#..TT..#',
  '#........#..............#..TT..#',
  '#........#..............#..A...#',
  '#........#..............#......#',
  '#..............................#',
  '#..............................#',
  '#........#..............#......#',
  '#........#..............#......#',
  '#........#..TT..TT..TT..#......#',
  '#........#..............#......#',
  '#...S....#..............#......#',
  '#........#..............#......#',
  '#........#..............#......#',
  '#........#..............#......#',
  '################################',
];

function findeZeichen(zeilen: string[], zeichen: string): [number, number] {
  for (let y = 0; y < zeilen.length; y++) {
    const x = zeilen[y].indexOf(zeichen);
    if (x >= 0) return [x, y];
  }
  throw new Error(`Zeichen ${zeichen} fehlt in der Karte`);
}

export const KARTE: Karte = {
  zeilen: ZEILEN,
  breite: ZEILEN[0].length,
  hoehe: ZEILEN.length,
  bereiche: [
    { name: 'Vorzimmer', x0: 1, y0: 1, x1: 8, y1: 16 },
    { name: 'Grossraumbuero', x0: 10, y0: 1, x1: 23, y1: 16 },
    { name: 'Chefbuero', x0: 25, y0: 1, x1: 30, y1: 16 },
  ],
  tueren: [
    {
      zwischen: ['Vorzimmer', 'Grossraumbuero'],
      zellen: [
        [9, 7],
        [9, 8],
      ],
    },
    {
      zwischen: ['Grossraumbuero', 'Chefbuero'],
      zellen: [
        [24, 7],
        [24, 8],
      ],
    },
  ],
  start: findeZeichen(ZEILEN, 'S'),
  ablage: findeZeichen(ZEILEN, 'A'),
};

export type ZellArt = 'wand' | 'boden' | 'tisch';

export function zeichenAn(karte: Karte, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= karte.breite || y >= karte.hoehe) return '#';
  return karte.zeilen[y][x];
}

export function zellArt(karte: Karte, x: number, y: number): ZellArt {
  const z = zeichenAn(karte, x, y);
  if (z === '#') return 'wand';
  if (z === 'T') return 'tisch';
  return 'boden';
}

// Wand, Tisch und alles ausserhalb der Karte.
export function istFest(karte: Karte, x: number, y: number): boolean {
  return zellArt(karte, x, y) !== 'boden';
}

// Bereich der Zelle; null an Tuerzellen und Waenden.
export function bereichAnZelle(karte: Karte, x: number, y: number): BereichName | null {
  for (const b of karte.bereiche) {
    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return b.name;
  }
  return null;
}

// Kopie der Karte, in der die Tuer mit dem Index zugemauert ist.
export function mitZugemauerterTuer(karte: Karte, tuerIndex: number): Karte {
  const zeilen = karte.zeilen.map((z) => z.split(''));
  for (const [x, y] of karte.tueren[tuerIndex].zellen) zeilen[y][x] = '#';
  return { ...karte, zeilen: zeilen.map((z) => z.join('')) };
}
