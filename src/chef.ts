// Der Chef laeuft um seinen Schreibtisch und verwickelt die Figur in ein Gespraech (ohne Phaser).
// Zustand je Lauf: Zeit im Zyklus, Zahl der Gespraeche (Erwischen), Schutzfrist nach einem Gespraech.
import {
  CHEF_RING,
  CHEF_RUNDE_SEKUNDEN,
  CHEF_SCHUTZ_SEKUNDEN,
  CHEF_TEILSCHRITT_SEKUNDEN,
  CHEF_ZYKLUS_SEKUNDEN,
  KONTAKT_RADIUS,
} from './config.ts';
import type { Phase } from './spielzustand.ts';

export interface ChefZustand {
  t: number; // Spielzeit in Sekunden (laeuft nur in Phase 'laeuft')
  erwischt: number; // Zahl der bisherigen Gespraeche mit dem Chef in diesem Lauf
  schutzRest: number; // Sekunden, in denen er nicht erneut erwischt
}

export function neuerChef(): ChefZustand {
  return { t: 0, erwischt: 0, schutzRest: 0 };
}

const TEILE: number[] = [];
for (let i = 0; i + 1 < CHEF_RING.length; i++) {
  TEILE.push(Math.hypot(CHEF_RING[i + 1][0] - CHEF_RING[i][0], CHEF_RING[i + 1][1] - CHEF_RING[i][1]));
}
export const CHEF_RING_LAENGE = TEILE.reduce((a, b) => a + b, 0);
// Tempo: Ringlaenge in der Rundenzeit (12 Zellen in 8 s = 1,5 Zellen/s = NPC_TEMPO)
export const CHEF_TEMPO = CHEF_RING_LAENGE / CHEF_RUNDE_SEKUNDEN;

// Position (Zellen) nach t Sekunden: Runde in CHEF_RUNDE_SEKUNDEN, danach Stehen am Start bis zum Ende des Zyklus.
export function chefPosition(t: number): { x: number; y: number } {
  const u = ((t % CHEF_ZYKLUS_SEKUNDEN) + CHEF_ZYKLUS_SEKUNDEN) % CHEF_ZYKLUS_SEKUNDEN;
  let rest = u >= CHEF_RUNDE_SEKUNDEN ? CHEF_RING_LAENGE : u * CHEF_TEMPO;
  for (let i = 0; i < TEILE.length; i++) {
    if (rest <= TEILE[i] || i === TEILE.length - 1) {
      const f = TEILE[i] === 0 ? 0 : Math.min(1, rest / TEILE[i]);
      const a = CHEF_RING[i];
      const b = CHEF_RING[i + 1];
      return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f };
    }
    rest -= TEILE[i];
  }
  throw new Error('Ring ohne Strecke');
}

// Erwischt: Abstand strikt kleiner als KONTAKT_RADIUS (ohne Toleranz).
export function erwischtAb(abstand: number): boolean {
  return abstand < KONTAKT_RADIUS;
}

// Fortschreiben um dt Sekunden; die Zeit laeuft nur in Phase 'laeuft' (Gespraech, Inventar, Meldungen: Stillstand).
export function chefFortschreiben(c: ChefZustand, dt: number, phase: Phase): ChefZustand {
  if (phase !== 'laeuft') return c;
  return { t: c.t + dt, erwischt: c.erwischt, schutzRest: Math.max(0, c.schutzRest - dt) };
}

// Zerlegt einen Zeitschritt in gleich grosse Teilschritte von hoechstens `maximal` Sekunden (Summe = dt).
export function teilschritte(dt: number, maximal: number = CHEF_TEILSCHRITT_SEKUNDEN): number[] {
  if (!(dt > 0)) return [];
  const n = Math.max(1, Math.ceil(dt / maximal - 1e-9));
  return Array.from({ length: n }, () => dt / n);
}

// Kontakt: nur in Phase 'laeuft', ohne Schutzfrist und mit Abstand unter KONTAKT_RADIUS zur Chefposition.
export function kontaktChef(c: ChefZustand, fx: number, fy: number, phase: Phase): boolean {
  if (phase !== 'laeuft' || c.schutzRest > 0) return false;
  const p = chefPosition(c.t);
  return erwischtAb(Math.hypot(fx - p.x, fy - p.y));
}

// Ein Bild lang fortschreiben: in Teilschritten von hoechstens CHEF_TEILSCHRITT_SEKUNDEN, nach jedem Schritt wird der
// Kontakt geprueft; beim ersten Kontakt bleibt der Chef dort stehen (die Szene oeffnet das Gespraech).
export function chefSchritte(c: ChefZustand, dt: number, fx: number, fy: number, phase: Phase): { chef: ChefZustand; kontakt: boolean } {
  let z = c;
  for (const teil of teilschritte(dt)) {
    z = chefFortschreiben(z, teil, phase);
    if (kontaktChef(z, fx, fy, phase)) return { chef: z, kontakt: true };
  }
  return { chef: z, kontakt: false };
}

export const CHEF_DIALOGE: readonly string[] = ['chef1', 'chef2', 'chef3'];

// n-tes Erwischen eines Laufs (n = 1, 2, 3, ...): chef1, chef2, chef3, chef1, ...
export function chefDialogFuerErwischen(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Erwischen-Nummer ungueltig: ${n}`);
  return CHEF_DIALOGE[(n - 1) % CHEF_DIALOGE.length];
}

// Gespraech beginnt: Zaehler +1, liefert den Dialogbaum dieses Erwischens.
export function chefErwischt(c: ChefZustand): { chef: ChefZustand; dialogId: string } {
  const n = c.erwischt + 1;
  return { chef: { t: c.t, erwischt: n, schutzRest: c.schutzRest }, dialogId: chefDialogFuerErwischen(n) };
}

// Gespraech endet: Schutzfrist beginnt.
export function chefGespraechEnde(c: ChefZustand): ChefZustand {
  return { t: c.t, erwischt: c.erwischt, schutzRest: CHEF_SCHUTZ_SEKUNDEN };
}
