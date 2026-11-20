// NPCs (ohne Phaser): Daten, Patrouille, Kontakt, Vermerk "gesprochen". Positionen in Zellen.
import { KONTAKT_RADIUS, NPC_TEMPO } from './config.ts';
import type { NpcId } from './config.ts';
import type { Phase } from './spielzustand.ts';

export interface NpcDef {
  id: NpcId;
  name: string; // Rolle, kein Personenname
  start: [number, number]; // Startzelle
  route: [number, number][]; // Wegpunkte in Zellmitten; route[0] ist die Mitte der Startzelle
  dialogId: string;
}

export const NPCS: readonly NpcDef[] = [
  {
    id: 'empfang',
    name: 'Empfang',
    start: [7, 10],
    route: [
      [7.5, 10.5],
      [3.5, 10.5],
    ],
    dialogId: 'empfang',
  },
  {
    id: 'buchhaltung',
    name: 'Buchhaltung',
    start: [14, 1],
    route: [
      [14.5, 1.5],
      [14.5, 7.5],
    ],
    dialogId: 'buchhaltung',
  },
  {
    id: 'teamleitung',
    name: 'Teamleitung',
    start: [22, 5],
    route: [
      [22.5, 5.5],
      [22.5, 11.5],
    ],
    dialogId: 'teamleitung',
  },
  {
    id: 'it',
    name: 'IT-Support',
    start: [11, 5],
    route: [
      [11.5, 5.5],
      [19.5, 5.5],
    ],
    dialogId: 'it',
  },
  {
    id: 'vertrieb',
    name: 'Vertrieb',
    start: [10, 9],
    route: [
      [10.5, 9.5],
      [21.5, 9.5],
    ],
    dialogId: 'vertrieb',
  },
];

// Laufzustand eines NPC: zurueckgelegte Strecke s auf dem Hin-und-Zurueck-Weg der Route.
export interface NpcLaeufer {
  id: NpcId;
  s: number;
}

export interface NpcWelt {
  laeufer: NpcLaeufer[];
  gesprochen: Set<NpcId>;
}

// Frischer Zustand fuer ein neues Spiel: alle NPCs am Start, keiner gesprochen.
export function neueWelt(defs: readonly NpcDef[] = NPCS): NpcWelt {
  return {
    laeufer: defs.map((d) => ({ id: d.id, s: 0 })),
    gesprochen: new Set<NpcId>(),
  };
}

function streckenLaengen(route: [number, number][]): number[] {
  const l: number[] = [];
  for (let i = 0; i + 1 < route.length; i++) {
    l.push(Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]));
  }
  return l;
}

// Laenge der Route in einer Richtung (erster bis letzter Wegpunkt).
export function routenLaenge(def: NpcDef): number {
  return streckenLaengen(def.route).reduce((a, b) => a + b, 0);
}

// Position nach der Strecke s (zyklisch: erster -> letzter Wegpunkt und zurueck).
export function positionBeiStrecke(def: NpcDef, s: number): { x: number; y: number } {
  const laengen = streckenLaengen(def.route);
  const l = laengen.reduce((a, b) => a + b, 0);
  const m = ((s % (2 * l)) + 2 * l) % (2 * l);
  let rest = m <= l ? m : 2 * l - m;
  for (let i = 0; i < laengen.length; i++) {
    if (rest <= laengen[i] || i === laengen.length - 1) {
      const t = laengen[i] === 0 ? 0 : Math.min(1, rest / laengen[i]);
      const a = def.route[i];
      const b = def.route[i + 1];
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
    }
    rest -= laengen[i];
  }
  throw new Error('Route ohne Strecke');
}

export function npcPosition(welt: NpcWelt, id: NpcId, defs: readonly NpcDef[] = NPCS): { x: number; y: number } {
  const def = defs.find((d) => d.id === id);
  const l = welt.laeufer.find((n) => n.id === id);
  if (def === undefined || l === undefined) throw new Error(`NPC ${id} unbekannt`);
  return positionBeiStrecke(def, l.s);
}

// Fortschreiben um dt Sekunden; die NPCs laufen nur in Phase 'laeuft'.
export function npcsFortschreiben(welt: NpcWelt, dt: number, phase: Phase, defs: readonly NpcDef[] = NPCS): NpcWelt {
  if (phase !== 'laeuft') return welt;
  const laeufer = welt.laeufer.map((n) => {
    const def = defs.find((d) => d.id === n.id);
    if (def === undefined) throw new Error(`NPC ${n.id} unbekannt`);
    const zyklus = 2 * routenLaenge(def);
    return { id: n.id, s: (n.s + dt * NPC_TEMPO) % zyklus };
  });
  return { laeufer, gesprochen: welt.gesprochen };
}

// Naechster NPC im Kontakt (Abstand kleiner als KONTAKT_RADIUS), der noch nicht gesprochen hat; sonst null.
// Nur in Phase 'laeuft'.
export function kontaktNpc(
  welt: NpcWelt,
  fx: number,
  fy: number,
  phase: Phase,
  defs: readonly NpcDef[] = NPCS,
): NpcId | null {
  if (phase !== 'laeuft') return null;
  let best: NpcId | null = null;
  let bestD = Infinity;
  for (const n of welt.laeufer) {
    if (welt.gesprochen.has(n.id)) continue;
    const p = npcPosition(welt, n.id, defs);
    const d = Math.hypot(fx - p.x, fy - p.y);
    if (d < KONTAKT_RADIUS && d < bestD) {
      best = n.id;
      bestD = d;
    }
  }
  return best;
}

export function markiereGesprochen(welt: NpcWelt, id: NpcId): void {
  welt.gesprochen.add(id);
}
