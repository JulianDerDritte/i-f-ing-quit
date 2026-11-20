// Inventar (ohne Phaser): erhaltene Infos und Gegenstaende, Seitenaufteilung, Fensterlayout.
import { INVENTAR_LAYOUT, NPC_IDS } from './config.ts';
import type { NpcId } from './config.ts';
import type { DialogZustand, Rechteck } from './dialog.ts';
import { NPCS } from './npcs.ts';

export interface InfoEintrag {
  npc: NpcId;
  text: string;
  nachfrage: boolean; // stammt aus einer Nachfrage
  kaffee: boolean; // stammt aus der Kaffee-Uebergabe
}

export interface Inventar {
  infos: InfoEintrag[];
  gegenstaende: string[];
}

export const GEGENSTAND_KAFFEE = 'Kaffee';
export const GEGENSTAND_KUENDIGUNG = 'Kündigung';

// Gegenstaende: die Kuendigung immer, der Kaffee nur, solange er getragen wird.
export function gegenstaendeListe(kaffee: boolean): string[] {
  return kaffee ? [GEGENSTAND_KAFFEE, GEGENSTAND_KUENDIGUNG] : [GEGENSTAND_KUENDIGUNG];
}

export function istNpcId(wert: unknown): wert is NpcId {
  return typeof wert === 'string' && (NPC_IDS as readonly string[]).includes(wert);
}

export function neuesInventar(infos: InfoEintrag[], kaffee: boolean): Inventar {
  return { infos, gegenstaende: gegenstaendeListe(kaffee) };
}

// Gegenstaende nach dem Stand des Kaffees neu setzen; die Infos bleiben.
export function mitKaffee(inv: Inventar, kaffee: boolean): Inventar {
  return { infos: inv.infos, gegenstaende: gegenstaendeListe(kaffee) };
}

// Tragt eine Info ein; dieselbe Info (gleicher NPC, gleicher Text) steht hoechstens einmal drin.
export function infoEintragen(inv: Inventar, e: InfoEintrag): Inventar {
  if (inv.infos.some((i) => i.npc === e.npc && i.text === e.text)) return inv;
  return { infos: [...inv.infos, e], gegenstaende: inv.gegenstaende };
}

// Uebernimmt alle bisher im Gespraech erhaltenen Infos (Dialog-id = NPC-id). Was ein Gespraech nicht erreicht oder
// durch Verschuetten verpasst hat, steht nicht in dialog.infos und kommt deshalb nie hinein.
export function ausGespraech(inv: Inventar, dialog: DialogZustand): Inventar {
  if (!istNpcId(dialog.dialogId)) throw new Error(`Dialog ${dialog.dialogId} gehoert zu keinem NPC`);
  const npc = dialog.dialogId;
  let neu = inv;
  for (const text of dialog.infos) {
    neu = infoEintragen(neu, {
      npc,
      text,
      nachfrage: dialog.nachfrageInfos.includes(text),
      kaffee: dialog.kaffeeInfos.includes(text),
    });
  }
  return neu;
}

export function vermerk(e: InfoEintrag): string {
  if (e.kaffee) return ' [Kaffee]';
  if (e.nachfrage) return ' [Nachfrage]';
  return '';
}

// Zeilen, die ein Text bei einfachem Umbruch an Wortgrenzen mit hoechstens `breite` Zeichen je Zeile braucht.
export function zeilenAnzahl(text: string, breite: number): number {
  let zeilen = 1;
  let laenge = 0;
  for (const wort of text.split(' ')) {
    if (laenge === 0) laenge = wort.length;
    else if (laenge + 1 + wort.length <= breite) laenge += 1 + wort.length;
    else {
      zeilen++;
      laenge = wort.length;
    }
  }
  return zeilen;
}

function rolle(id: NpcId): string {
  const d = NPCS.find((n) => n.id === id);
  if (d === undefined) throw new Error(`NPC ${id} unbekannt`);
  return d.name;
}

// Seitentexte des Inventars: je NPC eine Gruppe (Rollenname, darunter die Infos mit Vermerk). Eine Seite fasst
// hoechstens maxZeilenProSeite Zeilen (Umbruch geschaetzt); ein Eintrag wird nie geteilt.
export function inventarSeiten(
  inv: Inventar,
  breite: number = INVENTAR_LAYOUT.zeichenProZeile,
  maxZeilen: number = INVENTAR_LAYOUT.maxZeilenProSeite,
): string[] {
  if (inv.infos.length === 0) return ['Noch keine Infos gesammelt.'];
  const seiten: string[][] = [[]];
  let zeilen = 0;
  for (const id of NPC_IDS) {
    const eintraege = inv.infos.filter((i) => i.npc === id).map((i) => `- ${i.text}${vermerk(i)}`);
    let kopfSteht = false;
    for (const eintrag of eintraege) {
      const n = zeilenAnzahl(eintrag, breite);
      const kopf = kopfSteht ? 0 : 1;
      if (zeilen > 0 && zeilen + kopf + n > maxZeilen) {
        seiten.push([]);
        zeilen = 0;
        kopfSteht = false;
      }
      const seite = seiten[seiten.length - 1];
      if (!kopfSteht) {
        seite.push(`${rolle(id)}:`);
        zeilen++;
        kopfSteht = true;
      }
      seite.push(eintrag);
      zeilen += n;
    }
  }
  return seiten.map((s) => s.join('\n'));
}

export interface InventarRechtecke {
  fenster: Rechteck;
  titel: Rechteck;
  info: Rechteck;
  gegenstaende: Rechteck;
  zurueck: Rechteck; // Seite zurueck
  anzeige: Rechteck; // "Seite i von n"
  weiter: Rechteck; // Seite weiter
  schliessen: Rechteck;
}

// Rechtecke des Inventarfensters (Bildpunkte). Die Szene zeichnet genau diese.
export function inventarRechtecke(): InventarRechtecke {
  const L = INVENTAR_LAYOUT;
  const innenX = L.fensterX + L.randX;
  const innenBreite = L.fensterBreite - 2 * L.randX;
  let y = L.fensterY + L.randOben;
  const titel = { x: innenX, y, breite: innenBreite, hoehe: L.titelHoehe };
  y += L.titelHoehe + L.luecke;
  const info = { x: innenX, y, breite: innenBreite, hoehe: L.infoHoehe };
  y += L.infoHoehe + L.luecke;
  const gegenstaende = { x: innenX, y, breite: innenBreite, hoehe: L.gegenstandHoehe };
  y += L.gegenstandHoehe + L.luecke;
  const zurueck = { x: innenX, y, breite: L.seiteKnopfBreite, hoehe: L.knopfHoehe };
  const anzeige = { x: zurueck.x + zurueck.breite + L.luecke, y, breite: L.seiteAnzeigeBreite, hoehe: L.knopfHoehe };
  const weiter = { x: anzeige.x + anzeige.breite + L.luecke, y, breite: L.seiteKnopfBreite, hoehe: L.knopfHoehe };
  const schliessen = { x: innenX + innenBreite - L.schliessenBreite, y, breite: L.schliessenBreite, hoehe: L.knopfHoehe };
  const unten = y + L.knopfHoehe + L.randUnten;
  return {
    fenster: { x: L.fensterX, y: L.fensterY, breite: L.fensterBreite, hoehe: unten - L.fensterY },
    titel,
    info,
    gegenstaende,
    zurueck,
    anzeige,
    weiter,
    schliessen,
  };
}
