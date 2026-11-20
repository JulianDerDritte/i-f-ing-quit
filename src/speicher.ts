// Persistenz der Infos (ohne Phaser): localStorage als austauschbarer Speicher.
// Fehlt der Speicher, ist sein Inhalt ungueltig oder wirft er, laeuft das Spiel ohne Meldung mit leerem Inventar
// weiter (Vorgabe K7); Schreiben und Loeschen melden nur zurueck, ob es geklappt hat.
import { infoEintragen, istInfoQuelle, neuesInventar } from './inventar.ts';
import type { InfoEintrag, Inventar } from './inventar.ts';

export const SPEICHER_SCHLUESSEL = 'ifingquit.inventar.v1';
export const SPEICHER_VERSION = 1;
export const CHEF_SCHLUESSEL = 'ifingquit.chef.v1';

export interface SpeicherQuelle {
  getItem(schluessel: string): string | null;
  setItem(schluessel: string, wert: string): void;
  removeItem(schluessel: string): void;
}

// Der Browserspeicher; null, wenn es ihn nicht gibt oder schon der Zugriff scheitert (z. B. gesperrt).
export function holeSpeicher(): SpeicherQuelle | null {
  try {
    return (globalThis as { localStorage?: SpeicherQuelle }).localStorage ?? null;
  } catch {
    return null;
  }
}

function istEintrag(e: unknown): e is InfoEintrag {
  if (typeof e !== 'object' || e === null) return false;
  const o = e as Record<string, unknown>;
  return istInfoQuelle(o.npc) && typeof o.text === 'string' && o.text !== '' && typeof o.nachfrage === 'boolean' && typeof o.kaffee === 'boolean';
}

// Gespeicherte Infos; bei jedem Problem (kein Speicher, kein JSON, andere Version, falsche Form, Wurf): leer.
export function ladeInfos(sp: SpeicherQuelle | null): InfoEintrag[] {
  if (sp === null) return [];
  try {
    const roh = sp.getItem(SPEICHER_SCHLUESSEL);
    if (roh === null) return [];
    const daten: unknown = JSON.parse(roh);
    if (typeof daten !== 'object' || daten === null) return [];
    const d = daten as Record<string, unknown>;
    if (d.version !== SPEICHER_VERSION) return [];
    if (!Array.isArray(d.infos) || !d.infos.every(istEintrag)) return [];
    if (!Array.isArray(d.gegenstaende) || !d.gegenstaende.every((g) => typeof g === 'string')) return [];
    let inv: Inventar = neuesInventar([], false);
    for (const e of d.infos as InfoEintrag[]) {
      inv = infoEintragen(inv, { npc: e.npc, text: e.text, nachfrage: e.nachfrage, kaffee: e.kaffee });
    }
    return inv.infos;
  } catch {
    return [];
  }
}

// Speichert das Inventar (Infos und Gegenstaende am Ende des Laufs). true, wenn es geschrieben wurde.
export function speichereInventar(sp: SpeicherQuelle | null, inv: Inventar): boolean {
  if (sp === null) return false;
  try {
    sp.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({ version: SPEICHER_VERSION, infos: inv.infos, gegenstaende: inv.gegenstaende }));
    return true;
  } catch {
    return false;
  }
}

// Stand der Reihe der Chef-Gespraeche (0 bis 2 = Zahl der schon gefuehrten Gespraeche modulo 3); bei jedem Problem
// (kein Speicher, kein JSON, andere Version, falsche Form, nicht ganzzahlig, ausserhalb 0 bis 2, Wurf): 0.
export function ladeChefZaehler(sp: SpeicherQuelle | null): number {
  if (sp === null) return 0;
  try {
    const roh = sp.getItem(CHEF_SCHLUESSEL);
    if (roh === null) return 0;
    const daten: unknown = JSON.parse(roh);
    if (typeof daten !== 'object' || daten === null) return 0;
    const d = daten as Record<string, unknown>;
    if (d.version !== SPEICHER_VERSION) return 0;
    const n = d.erwischt;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 2) return 0;
    return n;
  } catch {
    return 0;
  }
}

// Schreibt den Stand der Reihe (erwischt modulo 3). true, wenn es geschrieben wurde.
export function speichereChefZaehler(sp: SpeicherQuelle | null, erwischt: number): boolean {
  if (sp === null) return false;
  try {
    sp.setItem(CHEF_SCHLUESSEL, JSON.stringify({ version: SPEICHER_VERSION, erwischt: erwischt % 3 }));
    return true;
  } catch {
    return false;
  }
}

// Nach jedem Erwischen (Start eines Chef-Gespraechs) sofort speichern; liefert, ob es geschrieben wurde.
export function erwischenSpeichern(chef: { erwischt: number }, sp: SpeicherQuelle | null): boolean {
  return speichereChefZaehler(sp, chef.erwischt);
}

// Loescht den Speicher (Infos und Zaehler der Chef-Gespraeche); true nur, wenn beide Entfernungen geklappt haben.
export function loescheSpeicher(sp: SpeicherQuelle | null): boolean {
  if (sp === null) return false;
  let ok = true;
  for (const schluessel of [SPEICHER_SCHLUESSEL, CHEF_SCHLUESSEL]) {
    try {
      sp.removeItem(schluessel);
    } catch {
      ok = false;
    }
  }
  return ok;
}
