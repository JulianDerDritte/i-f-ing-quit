// Figuren als Pixelmuster (Spieler, fuenf NPCs, Chef). Rein, ohne Phaser.
// Aufbau: Kopf, Rumpf und Beine als Zeichenketten (ohne Umriss), Rollen-Aufsaetze als Einzelpunkte; der schwarze Umriss
// (1 Rasterpunkt = 2 Bildschirmpunkte) kommt aus mitUmriss. Die Blickrichtungen rechts entstehen durch Spiegeln.
import { NPC_FARBEN, PALETTE } from '../config.ts';
import type { NpcId } from '../config.ts';
import { mitUmriss, rasterAusZeilen, spiegeln, ueberlagern } from './raster.ts';
import type { Raster } from './raster.ts';
import { tonen } from './palette.ts';

// oben/unten links/rechts auf dem Bildschirm
export type Richtung = 'ol' | 'or' | 'ul' | 'ur';
export const RICHTUNGEN: readonly Richtung[] = ['ol', 'or', 'ul', 'ur'];
export const SPIELER_SCHRITTE = 4;
export const NPC_SCHRITTE = 2;

type Haar = 'spitz' | 'glatt' | 'lang' | 'dutt' | 'kapuze';
type Rolle = 'spieler' | 'empfang' | 'buchhaltung' | 'teamleitung' | 'it' | 'vertrieb';

interface Aussehen {
  haar: Haar;
  haarFarbe: number;
  haarLicht: number;
  hemd: number;
  hose: number;
  schuh: number;
  rolle: Rolle;
}

const KOPF: Record<Haar, string[]> = {
  spitz: ['..H..hHHHh.H..', '.HHhHHHHHHHHH.', '.HHHHHHHHHHHH.', '.HHHHSSSSHHHH.'],
  glatt: ['....HHHHHH....', '..HHhHHHHHHH..', '.HHHHHHHHHHHH.', '.HHSSSSSSSSHH.'],
  lang: ['...HHHHHHHH...', '..HHhHHHHHHH..', '.HHHHHHHHHHHH.', '.HHHHSSSSHHHH.'],
  dutt: ['......HH......', '....HHhHHH....', '..HHHhHHHHHH..', '.HHHHSSSSHHHH.'],
  kapuze: ['...KKKKKKKK...', '..KKKKKKKKKK..', '.KKKKKKKKKKKK.', '.KKHHSSSSHHKK.'],
};
const GESICHT_NORMAL = ['.HSSSSSSSSSSH.', '.HSSESSSSESSH.', '..sSSSSSSSSs..'];
const GESICHT_LANG = ['.HHSSSSSSSSHH.', '.HHSESSSSESHH.', '.HH.sSSSSs.HH.'];
const GESICHT_KAPUZE = ['.KHSSSSSSSSHK.', '.KHSESSSSESHK.', '..KsSSSSSSsK..'];

const RUMPF = ['..WWWWRRWWWW..', '.WwWWWRRWWWWw.', '.WwWWWRRWWWWw.', '.SwWWWRRWWWwS.', '..PPPPPPPPPP..'];

// Beine je Bild (4 Zeilen): Stehbild und vier Laufbilder (Schritt 0 bis 3)
const BEINE_STEHEN = ['..PPPP..PPPP..', '..PPPP..PPPP..', '..BBBB..BBBB..', '.BBBBB..BBBBB.'];
const BEINE_LAUF = [
  ['..PPPP..PPPP..', '..PPPP...PPP..', '..BBBB...BBB..', '.BBBBB........'],
  ['...PPPPPPPP...', '...PPP..PPP...', '...BBB..BBB...', '..............'],
  ['..PPPP..PPPP..', '..PPP...PPPP..', '..BBB...BBBB..', '........BBBBB.'],
  ['..PPPPPPPPPP..', '...PPP..PPP...', '...BBB...BBB..', '..............'],
];

const BLATT = ['TTTTT', 'TlllT', 'TTTTT', 'TlllT', 'TTTTT'];

function zeichenGitter(zeilen: string[]): string[][] {
  return zeilen.map((z) => z.split(''));
}

function farbenFuer(a: Aussehen): Record<string, number> {
  return {
    H: a.haarFarbe,
    h: a.haarLicht,
    K: a.hemd,
    S: PALETTE.haut,
    s: PALETTE.hautSchatten,
    E: PALETTE.augen,
    Q: PALETTE.augen,
    W: a.hemd,
    w: tonen(a.hemd, 0.72),
    R: PALETTE.krawatteRot,
    P: a.hose,
    p: PALETTE.hoseLicht,
    B: a.schuh,
    G: PALETTE.grau,
    g: PALETTE.grauLicht,
    F: PALETTE.orange,
    C: PALETTE.weiss,
    c: PALETTE.kaffee,
    Z: PALETTE.gruenLicht,
    A: PALETTE.holz,
    a: PALETTE.holzLicht,
    T: PALETTE.papier,
    l: PALETTE.papierLinie,
    M: PALETTE.schnurrbart,
    N: PALETTE.anzug,
    n: PALETTE.anzugLicht,
    Y: PALETTE.krawatteRot,
  };
}

function setze(g: string[][], x: number, y: number, c: string): void {
  if (y < 0 || y >= g.length || x < 0 || x >= g[y].length) throw new Error(`Aufsatz ausserhalb: ${x},${y}`);
  g[y][x] = c;
}

// Rollen-Aufsaetze (Koordinaten im 14x16-Gitter vor dem Umriss)
function aufsatz(g: string[][], rolle: Rolle, hinten: boolean): void {
  if (rolle === 'empfang') {
    // Headset: Buegel ueber dem Kopf, Hoerer an beiden Seiten, Mikrofon vor dem Mund
    for (let x = 3; x <= 10; x++) setze(g, x, 1, 'G');
    setze(g, 1, 4, 'G'); setze(g, 1, 5, 'G'); setze(g, 12, 4, 'G'); setze(g, 12, 5, 'G');
    if (!hinten) { setze(g, 2, 5, 'G'); setze(g, 3, 6, 'G'); setze(g, 4, 6, 'g'); }
  } else if (rolle === 'buchhaltung') {
    if (!hinten) {
      // Brille
      for (const x of [3, 4, 8, 9]) { setze(g, x, 4, 'Q'); setze(g, x, 6 - 1, 'Q'); }
      setze(g, 5, 5, 'Q'); setze(g, 6, 5, 'Q'); setze(g, 7, 5, 'Q');
    }
    // Mappe in der Hand
    for (let y = 9; y <= 11; y++) for (let x = 9; x <= 12; x++) setze(g, x, y, 'F');
    setze(g, 9, 9, 'a'); setze(g, 10, 9, 'a'); setze(g, 11, 9, 'a');
  } else if (rolle === 'teamleitung') {
    // Anzug mit weissem Kragen, Becher in der Hand
    if (!hinten) { setze(g, 5, 7, 'C'); setze(g, 8, 7, 'C'); }
    setze(g, 11, 9, 'c'); setze(g, 12, 9, 'c'); setze(g, 11, 10, 'C'); setze(g, 12, 10, 'C'); setze(g, 13, 10, 'C');
  } else if (rolle === 'it') {
    // Kapuzenpullover: Tasche und Kabel
    for (let x = 5; x <= 8; x++) setze(g, x, 10, 'w');
    setze(g, 12, 10, 'Z'); setze(g, 13, 11, 'Z'); setze(g, 13, 12, 'Z'); setze(g, 13, 13, 'Z');
  } else if (rolle === 'vertrieb') {
    // Aktentasche
    for (let y = 10; y <= 12; y++) for (let x = 9; x <= 13; x++) setze(g, x, y, 'A');
    setze(g, 9, 10, 'a'); setze(g, 10, 10, 'a'); setze(g, 11, 10, 'a'); setze(g, 12, 10, 'a'); setze(g, 13, 10, 'a');
    setze(g, 10, 9, 'A'); setze(g, 12, 9, 'A');
  }
}

// links: das Gesicht blickt nach links (Augen und Krawatte wandern nach links); hinten: Rueckenansicht
function koerper(a: Aussehen, legs: string[], links: boolean, hinten: boolean, mitBlatt: boolean): Raster {
  const gesicht = a.haar === 'lang' ? GESICHT_LANG : a.haar === 'kapuze' ? GESICHT_KAPUZE : GESICHT_NORMAL;
  const g = zeichenGitter([...KOPF[a.haar], ...gesicht, ...RUMPF, ...legs]);
  if (links && !hinten) {
    // Augen zwei Punkte nach links, Krawatte einen Punkt nach links
    const e = g[5];
    for (let x = 0; x < e.length; x++) if (e[x] === 'E') e[x] = a.haar === 'kapuze' ? 'S' : a.haar === 'lang' ? 'S' : 'S';
    const augenA = a.haar === 'kapuze' ? [3, 6] : a.haar === 'lang' ? [3, 6] : [3, 6];
    for (const x of augenA) e[x] = 'E';
    for (let y = 7; y <= 10; y++) {
      g[y][7] = 'W';
      g[y][5] = 'R';
    }
  }
  if (hinten) {
    const deck = a.haar === 'kapuze' ? 'K' : 'H';
    for (let y = 3; y <= 6; y++) {
      for (let x = 0; x < g[y].length; x++) {
        if ('SsEQ'.includes(g[y][x])) g[y][x] = deck;
      }
    }
    for (let y = 7; y <= 10; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] === 'R') g[y][x] = 'W';
  }
  aufsatz(g, a.rolle, hinten);
  const r = rasterAusZeilen(g.map((z) => z.join('')), farbenFuer(a));
  if (mitBlatt) ueberlagern(r, rasterAusZeilen(BLATT, farbenFuer(a)), 0, 9);
  return mitUmriss(r, PALETTE.umriss);
}

const SPIELER: Aussehen = {
  haar: 'spitz',
  haarFarbe: PALETTE.haarBraun,
  haarLicht: PALETTE.haarBraunLicht,
  hemd: PALETTE.hemd,
  hose: PALETTE.hose,
  schuh: PALETTE.schuh,
  rolle: 'spieler',
};

const NPC_AUSSEHEN: Record<NpcId, Aussehen> = {
  empfang: { haar: 'lang', haarFarbe: PALETTE.haarBlond, haarLicht: PALETTE.haarBlondLicht, hemd: NPC_FARBEN.empfang, hose: PALETTE.hose, schuh: PALETTE.schuhSchwarz, rolle: 'empfang' },
  buchhaltung: { haar: 'dutt', haarFarbe: PALETTE.haarGrau, haarLicht: PALETTE.haarGrauLicht, hemd: NPC_FARBEN.buchhaltung, hose: PALETTE.hoseLicht, schuh: PALETTE.schuh, rolle: 'buchhaltung' },
  teamleitung: { haar: 'glatt', haarFarbe: PALETTE.haarSchwarz, haarLicht: PALETTE.haarSchwarzLicht, hemd: NPC_FARBEN.teamleitung, hose: PALETTE.anzug, schuh: PALETTE.schuhSchwarz, rolle: 'teamleitung' },
  it: { haar: 'kapuze', haarFarbe: PALETTE.haarRot, haarLicht: PALETTE.haarRotLicht, hemd: NPC_FARBEN.it, hose: PALETTE.hose, schuh: PALETTE.hemd, rolle: 'it' },
  vertrieb: { haar: 'glatt', haarFarbe: PALETTE.haarBraunLicht, haarLicht: PALETTE.haarBlondLicht, hemd: NPC_FARBEN.vertrieb, hose: PALETTE.grau, schuh: PALETTE.schuh, rolle: 'vertrieb' },
};

const zwischenspeicher = new Map<string, Raster>();
function gemerkt(schluessel: string, bauen: () => Raster): Raster {
  let r = zwischenspeicher.get(schluessel);
  if (r === undefined) {
    r = bauen();
    zwischenspeicher.set(schluessel, r);
  }
  return r;
}

function ansicht(a: Aussehen, richtung: Richtung, beine: string[], blatt: boolean, kennung: string): Raster {
  const hinten = richtung[0] === 'o';
  const links = richtung[1] === 'l';
  const links_roh = gemerkt(`${kennung}-${hinten ? 'o' : 'u'}l-${beine.join('')}`, () => koerper(a, beine, true, hinten, blatt));
  return links ? links_roh : gemerkt(`${kennung}-${hinten ? 'o' : 'u'}r-${beine.join('')}`, () => spiegeln(links_roh));
}

// Bild des Spielers: bei Stillstand immer das Stehbild, bei Bewegung das Laufbild `schritt` (0 bis 3)
export function figurBild(richtung: Richtung, schritt: number, bewegt: boolean): Raster {
  if (!Number.isInteger(schritt) || schritt < 0 || schritt >= SPIELER_SCHRITTE) throw new Error(`Schritt ${schritt} ausserhalb 0..${SPIELER_SCHRITTE - 1}`);
  const beine = bewegt ? BEINE_LAUF[schritt] : BEINE_STEHEN;
  return ansicht(SPIELER, richtung, beine, true, 'spieler');
}

// Bild eines NPC: Stehbild oder eines von zwei Laufbildern
export function npcBild(id: NpcId, richtung: Richtung, schritt: number, bewegt: boolean): Raster {
  if (!Number.isInteger(schritt) || schritt < 0 || schritt >= NPC_SCHRITTE) throw new Error(`NPC-Schritt ${schritt} ausserhalb 0..${NPC_SCHRITTE - 1}`);
  const beine = bewegt ? BEINE_LAUF[schritt * 2] : BEINE_STEHEN;
  return ansicht(NPC_AUSSEHEN[id], richtung, beine, false, `npc-${id}`);
}

const CHEF_ZEILEN = [
  '....HHHHHH....',
  '..HHhHHHHHHH..',
  '.HHHHHHHHHHHH.',
  '.HHSSSSSSSSHH.',
  '.HSQQSSSSQQSH.',
  '.HSSESSSSESSH.',
  '..sSMMMMMMSs..',
  '..NNWWRRWWNN..',
  '.NNNNNRRNNNNN.',
  '.NnnnnnnnnnnN.',
  '.NSnnnnnnnnSN.',
  '..NNNNNNNNNN..',
  '..PPPP..PPPP..',
  '..PPPP..PPPP..',
  '..BBBB..BBBB..',
  '.BBBBB..BBBBB.',
];

// Chef: dunkler Anzug, Schnurrbart, verschraenkte Arme, roter Schlips; blickt nach vorn
export function chefBild(): Raster {
  return gemerkt('chef', () => {
    const farben = { ...farbenFuer({ ...SPIELER, haarFarbe: PALETTE.haarSchwarz, haarLicht: PALETTE.haarSchwarzLicht, hose: PALETTE.anzug, schuh: PALETTE.schuhSchwarz }), W: PALETTE.hemd };
    return mitUmriss(rasterAusZeilen(CHEF_ZEILEN, farben), PALETTE.umriss);
  });
}

// Kleiner weicher Schatten unter einer Figur (Raster 14x6), wird mit Alpha ausgegeben
export function schattenBild(): Raster {
  return gemerkt('schatten', () =>
    rasterAusZeilen(['....SSSSSS....', '..SSSSSSSSSS..', '.SSSSSSSSSSSS.', '.SSSSSSSSSSSS.', '..SSSSSSSSSS..', '....SSSSSS....'], { S: PALETTE.schatten }),
  );
}
