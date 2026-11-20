// Frischer Zustand eines Laufs (ohne Phaser): Timer, NPCs, Kaffee, Inventar. Die Szene legt ihn bei jedem Start
// (Menue, Neustart, Nochmal) neu an; nichts ueberlebt einen Lauf ausser den gespeicherten Infos.
import { neueWelt } from './npcs.ts';
import type { NpcWelt } from './npcs.ts';
import { neuesInventar } from './inventar.ts';
import type { Inventar } from './inventar.ts';
import { ladeInfos } from './speicher.ts';
import type { SpeicherQuelle } from './speicher.ts';
import { neuerChef } from './chef.ts';
import type { ChefZustand } from './chef.ts';
import { neuerZustand } from './spielzustand.ts';
import type { Spielzustand } from './spielzustand.ts';

export interface Lauf {
  zustand: Spielzustand;
  welt: NpcWelt;
  chef: ChefZustand;
  kaffee: boolean;
  inventar: Inventar;
}

export function neuerLauf(startSekunden: number, speicher: SpeicherQuelle | null): Lauf {
  return {
    zustand: neuerZustand(startSekunden),
    welt: neueWelt(),
    chef: neuerChef(),
    kaffee: false,
    inventar: neuesInventar(ladeInfos(speicher), false),
  };
}
