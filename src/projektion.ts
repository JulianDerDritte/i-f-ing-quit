// Manuelle isometrische Projektion (ohne Phaser). Gitterkoordinaten in Zellen,
// Bildkoordinaten in Bildpunkten ohne Hoehenanteil.
import { KACHEL_BREITE, KACHEL_HOEHE } from './config.ts';

export interface Punkt {
  x: number;
  y: number;
}

export function gitterZuBild(gx: number, gy: number): Punkt {
  return {
    x: ((gx - gy) * KACHEL_BREITE) / 2,
    y: ((gx + gy) * KACHEL_HOEHE) / 2,
  };
}

export function bildZuGitter(bx: number, by: number): Punkt {
  const a = bx / (KACHEL_BREITE / 2);
  const b = by / (KACHEL_HOEHE / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
