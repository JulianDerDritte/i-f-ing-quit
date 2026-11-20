// Bewegung und Kollision der Figur (ohne Phaser). Position in Zellen, Figur ist ein Kreis.
import { FIGUR_RADIUS, TEMPO_ZELLEN_PRO_SEKUNDE } from './config.ts';
import { istFest } from './karte.ts';
import type { Karte } from './karte.ts';
import { bildZuGitter } from './projektion.ts';

export interface Eingabe {
  links: boolean;
  rechts: boolean;
  hoch: boolean;
  runter: boolean;
}

export interface Position {
  x: number;
  y: number;
}

// Technische Konstanten (kein Spielverhalten): laengster Teilschritt gegen Durchtunneln,
// Sicherheitsabstand beim Herausschieben.
const TEILSCHRITT = 0.1;
const ABSTAND_EPS = 1e-9;

// Geschwindigkeit in Gitterzellen pro Sekunde. Die Eingabe ist eine Bildschirmrichtung
// (hoch = Bildschirm oben usw.), umgerechnet ueber die Projektion; der Betrag ist immer
// das Tempo, auch bei zwei Tasten.
export function geschwindigkeit(e: Eingabe): Position {
  const sx = (e.rechts ? 1 : 0) - (e.links ? 1 : 0);
  const sy = (e.runter ? 1 : 0) - (e.hoch ? 1 : 0);
  if (sx === 0 && sy === 0) return { x: 0, y: 0 };
  const g = bildZuGitter(sx, sy);
  const l = Math.hypot(g.x, g.y);
  return { x: (g.x / l) * TEMPO_ZELLEN_PRO_SEKUNDE, y: (g.y / l) * TEMPO_ZELLEN_PRO_SEKUNDE };
}

function klemme(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

// Kleinster Abstand der Kreismitte zu einer festen Zelle in der Naehe; Infinity, wenn keine.
export function abstandZurNaechstenFestenZelle(karte: Karte, x: number, y: number, r: number): number {
  let best = Infinity;
  for (let cx = Math.floor(x - r) - 1; cx <= Math.floor(x + r) + 1; cx++) {
    for (let cy = Math.floor(y - r) - 1; cy <= Math.floor(y + r) + 1; cy++) {
      if (!istFest(karte, cx, cy)) continue;
      const d = Math.hypot(x - klemme(x, cx, cx + 1), y - klemme(y, cy, cy + 1));
      if (d < best) best = d;
    }
  }
  return best;
}

export function ueberlappt(karte: Karte, x: number, y: number, r: number): boolean {
  return abstandZurNaechstenFestenZelle(karte, x, y, r) < r;
}

// Schiebt den Kreis aus festen Zellen heraus (laeuft entlang der Flaeche: Gleiten).
function ausschieben(karte: Karte, p: Position, r: number): Position {
  let x = p.x;
  let y = p.y;
  for (let runde = 0; runde < 8; runde++) {
    // Tiefste Ueberlappung zuerst: so schiebt eine Wandflaeche senkrecht und
    // die Naht zwischen zwei Wandzellen bremst das Gleiten nicht.
    let tiefsteCx = 0;
    let tiefsteCy = 0;
    let tiefsteD = r;
    for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
      for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) {
        if (!istFest(karte, cx, cy)) continue;
        const d = Math.hypot(x - klemme(x, cx, cx + 1), y - klemme(y, cy, cy + 1));
        if (d < tiefsteD) {
          tiefsteD = d;
          tiefsteCx = cx;
          tiefsteCy = cy;
        }
      }
    }
    if (tiefsteD >= r) break;
    const cx = tiefsteCx;
    const cy = tiefsteCy;
    if (tiefsteD === 0) {
      // Mitte liegt in der Zelle: auf dem kuerzesten Weg hinaus.
      const wege: [number, number, number][] = [
        [x - cx, -1, 0],
        [cx + 1 - x, 1, 0],
        [y - cy, 0, -1],
        [cy + 1 - y, 0, 1],
      ];
      wege.sort((a, b) => a[0] - b[0]);
      const [tiefe, nx, ny] = wege[0];
      x += nx * (tiefe + r + ABSTAND_EPS);
      y += ny * (tiefe + r + ABSTAND_EPS);
    } else {
      const px = klemme(x, cx, cx + 1);
      const py = klemme(y, cy, cy + 1);
      const schub = r - tiefsteD + ABSTAND_EPS;
      x += ((x - px) / tiefsteD) * schub;
      y += ((y - py) / tiefsteD) * schub;
    }
  }
  return { x, y };
}

function versuche(karte: Karte, nx: number, ny: number, r: number): Position | null {
  const p = ausschieben(karte, { x: nx, y: ny }, r);
  return ueberlappt(karte, p.x, p.y, r) ? null : p;
}

// Bewegt den Kreis um (dx, dy) in kleinen Teilschritten. Faellt ein Teilschritt auch nach dem
// Herausschieben in eine feste Zelle, wird er achsenweise versucht und sonst nicht ausgefuehrt.
export function bewegeKreis(karte: Karte, von: Position, dx: number, dy: number, r: number): Position {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / TEILSCHRITT));
  let p = von;
  for (let i = 0; i < n; i++) {
    const sx = dx / n;
    const sy = dy / n;
    const voll = versuche(karte, p.x + sx, p.y + sy, r);
    if (voll) {
      p = voll;
      continue;
    }
    const nurX = versuche(karte, p.x + sx, p.y, r);
    if (nurX) p = nurX;
    const nurY = versuche(karte, p.x, p.y + sy, r);
    if (nurY) p = nurY;
  }
  return p;
}

// Ein Zeitschritt: Position nach dt Sekunden mit der gegebenen Eingabe.
export function schritt(karte: Karte, von: Position, e: Eingabe, dt: number): Position {
  const v = geschwindigkeit(e);
  if (v.x === 0 && v.y === 0) return von;
  return bewegeKreis(karte, von, v.x * dt, v.y * dt, FIGUR_RADIUS);
}
