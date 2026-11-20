// Zustand des laufenden Spiels (ohne Phaser): Phase, Restzeit, Ablegen, Formatierung, Probeparameter.
import { ABLEGE_REICHWEITE, TIMER_SEKUNDEN, zeitText } from './config.ts';
import type { Stufe } from './config.ts';
import { bereichAnZelle } from './karte.ts';
import type { Karte } from './karte.ts';

export type Phase = 'laeuft' | 'dialog' | 'sieg' | 'niederlage';

export interface Spielzustand {
  phase: Phase;
  rest: number; // Sekunden
}

// Technische Toleranz gegen Gleitkommarest (kein Spielwert): 600 - 599,9 - 0,1 ergibt sonst 2e-14 statt 0.
const REST_EPS = 1e-9;

export function neuerZustand(startSekunden: number): Spielzustand {
  return { phase: 'laeuft', rest: startSekunden };
}

// Fortschreiben um dt Sekunden; nur in Phase 'laeuft' wirksam.
export function fortschreiben(z: Spielzustand, dt: number): Spielzustand {
  if (z.phase !== 'laeuft') return z;
  const rest = z.rest - dt;
  if (rest <= REST_EPS) return { phase: 'niederlage', rest: 0 };
  return { phase: 'laeuft', rest };
}

// Gespraechsbeginn: zieht die Kosten sofort ab. Bleibt nichts uebrig, ist das Spiel verloren (kein Dialog);
// sonst steht der Timer in Phase 'dialog'. Wirkt nur in Phase 'laeuft'.
export function abziehen(z: Spielzustand, kosten: number): Spielzustand {
  if (z.phase !== 'laeuft') return z;
  const rest = z.rest - kosten;
  if (rest <= REST_EPS) return { phase: 'niederlage', rest: 0 };
  return { phase: 'dialog', rest };
}

// Nachfrage im Gespraech: zieht die Kosten sofort ab, der Timer steht sonst weiter. Reicht der Rest nicht,
// ist das Spiel verloren. Wirkt nur in Phase 'dialog'.
export function nachfrageAbziehen(z: Spielzustand, kosten: number): Spielzustand {
  if (z.phase !== 'dialog') return z;
  const rest = z.rest - kosten;
  if (rest <= REST_EPS) return { phase: 'niederlage', rest: 0 };
  return { phase: 'dialog', rest };
}

// Gespraechsende: zurueck in Phase 'laeuft' mit dem Rest nach dem Abzug.
export function dialogBeenden(z: Spielzustand): Spielzustand {
  if (z.phase !== 'dialog') return z;
  return { phase: 'laeuft', rest: z.rest };
}

// Mitte der Ablagezelle, Figurmitte in Zellen.
function abstandZurAblage(karte: Karte, x: number, y: number): number {
  return Math.hypot(x - (karte.ablage[0] + 0.5), y - (karte.ablage[1] + 0.5));
}

// Figurmitte im Chefbuero und hoechstens ABLEGE_REICHWEITE von der Mitte der Ablagezelle entfernt.
export function nahAnAblage(karte: Karte, x: number, y: number): boolean {
  if (bereichAnZelle(karte, Math.floor(x), Math.floor(y)) !== 'Chefbuero') return false;
  return abstandZurAblage(karte, x, y) <= ABLEGE_REICHWEITE;
}

// Ablegen der Kuendigung: wirkt nur in Phase 'laeuft' und nahe der Ablage; der Rest bleibt stehen.
export function ablegen(z: Spielzustand, karte: Karte, x: number, y: number): Spielzustand {
  if (z.phase !== 'laeuft') return z;
  if (!nahAnAblage(karte, x, y)) return z;
  return { phase: 'sieg', rest: z.rest };
}

// m:ss, auf volle Sekunden aufgerundet (Start 25 -> 0:25, 0:00 erst bei Ende).
export function zeitAufgerundet(sekunden: number): string {
  return zeitText(Math.max(0, Math.ceil(sekunden)));
}

export function istWarnung(rest: number, warnSekunden: number): boolean {
  return rest <= warnSekunden;
}

// Startzeit der Stufe; ?zeit=<Sekunden> in der Adresse ersetzt sie, wenn der Wert eine Zahl > 0 ist.
export function startzeit(stufe: Stufe, adressSuche: string): number {
  const roh = new URLSearchParams(adressSuche).get('zeit');
  if (roh !== null && roh.trim() !== '') {
    const wert = Number(roh);
    if (Number.isFinite(wert) && wert > 0) return wert;
  }
  return TIMER_SEKUNDEN[stufe];
}
