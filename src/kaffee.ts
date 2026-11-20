// Kaffee (ohne Phaser): Maschine, Nehmen, Tragen, Verlust im Gespraech.
import { KAFFEE_NEHMEN_SEKUNDEN, KAFFEE_REICHWEITE } from './config.ts';
import type { DialogZustand } from './dialog.ts';
import type { Karte } from './karte.ts';
import { ablegen, nahAnAblage, sofortAbziehen } from './spielzustand.ts';
import type { Spielzustand } from './spielzustand.ts';

export interface KaffeeErgebnis {
  zustand: Spielzustand;
  kaffee: boolean; // wird der Kaffee getragen?
}

// Figurmitte hoechstens KAFFEE_REICHWEITE von der Mitte der Maschinenzelle entfernt.
export function nahAnKaffee(karte: Karte, x: number, y: number): boolean {
  return Math.hypot(x - (karte.kaffee[0] + 0.5), y - (karte.kaffee[1] + 0.5)) <= KAFFEE_REICHWEITE;
}

// Kaffee nehmen: wirkt nur in Phase 'laeuft', ohne Kaffee in der Hand und nahe der Maschine. Zieht
// KAFFEE_NEHMEN_SEKUNDEN ab (bleibt nichts uebrig: Niederlage); die Phase bleibt sonst 'laeuft'.
export function kaffeeNehmen(z: Spielzustand, kaffee: boolean, karte: Karte, x: number, y: number): KaffeeErgebnis {
  if (z.phase !== 'laeuft' || kaffee || !nahAnKaffee(karte, x, y)) return { zustand: z, kaffee };
  return { zustand: sofortAbziehen(z, KAFFEE_NEHMEN_SEKUNDEN), kaffee: true };
}

// Taste E oder Leertaste: an der Ablage legt sie die Kuendigung ab (Vorrang), sonst nimmt sie an der Maschine Kaffee.
export function aktionsTaste(z: Spielzustand, kaffee: boolean, karte: Karte, x: number, y: number): KaffeeErgebnis {
  if (z.phase === 'laeuft' && nahAnAblage(karte, x, y)) return { zustand: ablegen(z, karte, x, y), kaffee };
  return kaffeeNehmen(z, kaffee, karte, x, y);
}

// Kaffee nach einer Gespraechsantwort: nach Verschuetten oder Uebergabe ist er weg, sonst bleibt der Stand.
export function kaffeeNachAntwort(kaffee: boolean, dialog: DialogZustand): boolean {
  return dialog.kaffeeWeg === null ? kaffee : false;
}
