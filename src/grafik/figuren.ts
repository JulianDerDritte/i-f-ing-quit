// Figuren als Pixelmuster (Spieler, fuenf NPCs, Chef). Rein, ohne Phaser.
// A-012: Skala 1. Aufbau: Kopf, Rumpf und Beine als Zeichenketten im Raster 14 x 16 (ohne Umriss), Rollen-Aufsaetze als
// Einzelpunkte; das Gitter wird verdoppelt (28 x 32), dann kommen Licht- und Schattenkanten je Material, Feindetails
// (Haarstraehnen, Hemdfalten, Krawattenknoten, Schuhsohle, Augenbrauen, Mund) und der Umriss (1 Rasterpunkt = 1 Weltpunkt).
// Die Blickrichtungen rechts entstehen durch Spiegeln.
import { NPC_FARBEN, PALETTE } from '../config.ts';
import type { NpcId } from '../config.ts';
import { kantenLicht, muster, setzeWenn, verdoppeln } from './fein.ts';
import type { Ton } from './fein.ts';
import { mitUmriss, neuesRaster, rasterAusZeilen, spiegeln, ueberlagern } from './raster.ts';
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
  haarSchatten?: number;
  hemd: number;
  hemdLicht?: number;
  hemdSchatten?: number;
  hose: number;
  hoseLicht?: number;
  hoseSchatten?: number;
  schuh: number;
  schuhLicht?: number;
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

// Kuendigung in der Hand (10 x 10, feine Linien)
const BLATT_FEIN = ['TTTTTTTTTT', 'TTTTTTTTTT', 'TllllllTTT', 'TTTTTTTTTT', 'TllllllllT', 'TTTTTTTTTT', 'TllllllTTT', 'TTTTTTTTTT', 'TllllTTTTT', 'TTTTTTTTTT'];

// Zeilen im verdoppelten Gitter
const ZEILE_AUGEN = 10;
const ZEILE_MUND = 12;
const ZEILE_RUMPF_VON = 14;
const ZEILE_ARM_VON = 16;
const ZEILE_ARM_BIS = 21;
const ZEILE_KRAWATTE_BIS = 21;
const ZEILE_KOPF_BIS = 13;

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
    w: a.hemdSchatten ?? tonen(a.hemd, 0.72),
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

// Rollen-Aufsaetze (Koordinaten im 14x16-Gitter vor dem Verdoppeln)
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

// Arm im verdoppelten Gitter um dy Zeilen verschieben (Armschwung): Spalten c0..c1, Zeilen ZEILE_ARM_VON..ZEILE_ARM_BIS.
function armSchwung(z: string[][], c0: number, c1: number, dy: number): void {
  if (dy === 0) return;
  for (let x = c0; x <= c1; x++) {
    const alt: string[] = [];
    for (let y = ZEILE_ARM_VON; y <= ZEILE_ARM_BIS; y++) alt.push(z[y][x]);
    for (let y = ZEILE_ARM_VON; y <= ZEILE_ARM_BIS; y++) {
      const q = y - dy;
      z[y][x] = q < ZEILE_ARM_VON ? 'W' : q > ZEILE_ARM_BIS ? '.' : alt[q - ZEILE_ARM_VON];
    }
  }
}

// Licht und Schatten je Material (feste Tonlisten; Spieler: benannte Palettenfarben, sonst aus der Grundfarbe abgeleitet)
function materialien(a: Aussehen, mehr: readonly [number, Ton][] = []): Map<number, Ton> {
  const m = new Map<number, Ton>();
  m.set(a.haarFarbe, { licht: a.haarLicht, schatten: a.haarSchatten ?? tonen(a.haarFarbe, 0.7) });
  m.set(PALETTE.haut, { licht: PALETTE.hautLicht, schatten: PALETTE.hautSchatten });
  m.set(a.hose, { licht: a.hoseLicht ?? tonen(a.hose, 1.3), schatten: a.hoseSchatten ?? tonen(a.hose, 0.7) });
  m.set(a.schuh, { licht: a.schuhLicht ?? tonen(a.schuh, 1.3), schatten: PALETTE.schuhSohle });
  m.set(a.hemd, { licht: a.hemdLicht ?? tonen(a.hemd, 1.12), schatten: a.hemdSchatten ?? tonen(a.hemd, 0.72) });
  m.set(PALETTE.grau, { licht: PALETTE.grauLicht, schatten: tonen(PALETTE.grau, 0.7) });
  m.set(PALETTE.orange, { licht: tonen(PALETTE.orange, 1.25), schatten: tonen(PALETTE.orange, 0.7) });
  m.set(PALETTE.holz, { licht: PALETTE.holzLicht, schatten: PALETTE.holzDunkel });
  m.set(PALETTE.krawatteRot, { licht: PALETTE.krawatteLicht, schatten: PALETTE.krawatteDunkel });
  for (const [f, t] of mehr) m.set(f, t);
  return m;
}

const KRAWATTE: number[] = [PALETTE.krawatteRot, PALETTE.krawatteLicht, PALETTE.krawatteDunkel];

// Feindetails auf dem farbigen Raster (verdoppeltes Gitter, noch ohne Umriss). Festes Muster, kein Zufall.
function feindetails(r: Raster, a: Aussehen, hinten: boolean): void {
  const haarSchatten = a.haarSchatten ?? tonen(a.haarFarbe, 0.7);
  const hemdSchatten = a.hemdSchatten ?? tonen(a.hemd, 0.72);
  // Haarstraehnen: helle und dunkle Linien ueber der Grundfarbe
  muster(r, a.haarFarbe, a.haarLicht, (x, y) => y <= ZEILE_KOPF_BIS && (x + 2 * y) % 9 === 0);
  muster(r, a.haarFarbe, haarSchatten, (x, y) => y <= ZEILE_KOPF_BIS && (x * 2 + y) % 11 === 5);
  // Hemdfalten: diagonale Schattenlinien auf dem Rumpf
  muster(r, a.hemd, hemdSchatten, (x, y) => y >= ZEILE_ARM_VON && y <= ZEILE_ARM_BIS && (x + 3 * y) % 10 === 0);
  if (!hinten) {
    // Augenbrauen ueber den Augen, Mund unter den Augen (Blick nach links: Augen links der Mitte)
    const augen: number[] = [];
    for (let x = 0; x < r.breite; x++) if (r.punkte[ZEILE_AUGEN * r.breite + x] === PALETTE.augen) augen.push(x);
    for (const x of augen) setzeWenn(r, x, ZEILE_AUGEN - 1, haarSchatten);
    if (augen.length > 0) {
      const mitte = Math.round((augen[0] + augen[augen.length - 1]) / 2);
      for (let x = mitte - 2; x <= mitte + 1; x++) if (([PALETTE.haut, PALETTE.hautLicht, PALETTE.hautSchatten] as number[]).includes(r.punkte[ZEILE_MUND * r.breite + x])) r.punkte[ZEILE_MUND * r.breite + x] = PALETTE.mund;
    }
    // Krawatte: Knoten (breiter, mit Schatten darunter), Licht links, Schatten rechts
    for (let y = ZEILE_RUMPF_VON; y <= ZEILE_KRAWATTE_BIS; y++) {
      const xs: number[] = [];
      for (let x = 0; x < r.breite; x++) if (KRAWATTE.includes(r.punkte[y * r.breite + x])) xs.push(x);
      if (xs.length === 0) continue;
      const links = xs[0];
      const rechts = xs[xs.length - 1];
      if (y <= ZEILE_RUMPF_VON + 1) {
        setzeWenn(r, links - 1, y, PALETTE.krawatteLicht);
        setzeWenn(r, rechts + 1, y, PALETTE.krawatteDunkel);
      } else if (y === ZEILE_RUMPF_VON + 2) {
        for (let x = links; x <= rechts; x++) r.punkte[y * r.breite + x] = PALETTE.krawatteDunkel;
      } else {
        r.punkte[y * r.breite + links] = PALETTE.krawatteLicht;
        r.punkte[y * r.breite + rechts] = PALETTE.krawatteDunkel;
      }
    }
  }
}

// links: das Gesicht blickt nach links (Augen und Krawatte wandern nach links); hinten: Rueckenansicht
function koerper(a: Aussehen, legs: string[], links: boolean, hinten: boolean, mitBlatt: boolean, armDy: number): Raster {
  const gesicht = a.haar === 'lang' ? GESICHT_LANG : a.haar === 'kapuze' ? GESICHT_KAPUZE : GESICHT_NORMAL;
  const g = zeichenGitter([...KOPF[a.haar], ...gesicht, ...RUMPF, ...legs]);
  if (links && !hinten) {
    // Augen zwei Punkte nach links, Krawatte einen Punkt nach links
    const e = g[5];
    for (let x = 0; x < e.length; x++) if (e[x] === 'E') e[x] = 'S';
    for (const x of [3, 6]) e[x] = 'E';
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
  // verdoppeltes Gitter: Armschwung (Spieler: rechter Arm, sonst linker Arm; die Seite mit Gegenstand schwingt nicht)
  const z = zeichenGitter(verdoppeln(g.map((zl) => zl.join(''))));
  if (a.rolle === 'spieler') armSchwung(z, 22, 25, armDy);
  else armSchwung(z, 2, 5, armDy);
  const r = feinVerdoppelt(z.map((zl) => zl.join('')), a, farbenFuer(a), hinten);
  if (mitBlatt) ueberlagern(r, rasterAusZeilen(BLATT_FEIN, farbenFuer(a)), 0, 18);
  return mitUmriss(r, PALETTE.umriss);
}

// Gitter (schon verdoppelt) -> Raster: Sohlenzeile anhaengen, Licht und Schatten je Material, Feindetails. Der Umriss kommt danach.
function feinVerdoppelt(zeilen: string[], a: Aussehen, farben: Record<string, number>, hinten: boolean, mehr: readonly [number, Ton][] = []): Raster {
  const r0 = rasterAusZeilen(zeilen, farben);
  const r = neuesRaster(r0.breite, r0.hoehe + 1);
  r.punkte.set(r0.punkte);
  for (let x = 0; x < r0.breite; x++) if (r0.punkte[(r0.hoehe - 1) * r0.breite + x] === a.schuh) r.punkte[r0.hoehe * r0.breite + x] = PALETTE.schuhSohle;
  const k = kantenLicht(r, materialien(a, mehr));
  feindetails(k, a, hinten);
  return k;
}

const SPIELER: Aussehen = {
  haar: 'spitz',
  haarFarbe: PALETTE.haarBraun,
  haarLicht: PALETTE.haarBraunLicht,
  haarSchatten: PALETTE.haarBraunSchatten,
  hemd: PALETTE.hemd,
  hemdLicht: PALETTE.hemdLicht,
  hemdSchatten: PALETTE.hemdSchatten,
  hose: PALETTE.hose,
  hoseLicht: PALETTE.hoseLicht,
  hoseSchatten: PALETTE.hoseSchatten,
  schuh: PALETTE.schuh,
  schuhLicht: PALETTE.schuhLicht,
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

// Armschwung je Laufbild (Zeilen im verdoppelten Gitter); im Stand 0
const ARM_DY = [-2, 0, 2, 0];

function ansicht(a: Aussehen, richtung: Richtung, beine: string[], blatt: boolean, kennung: string, armDy: number): Raster {
  const hinten = richtung[0] === 'o';
  const links = richtung[1] === 'l';
  const links_roh = gemerkt(`${kennung}-${hinten ? 'o' : 'u'}l-${beine.join('')}-${armDy}`, () => koerper(a, beine, true, hinten, blatt, armDy));
  return links ? links_roh : gemerkt(`${kennung}-${hinten ? 'o' : 'u'}r-${beine.join('')}-${armDy}`, () => spiegeln(links_roh));
}

// Bild des Spielers: bei Stillstand immer das Stehbild, bei Bewegung das Laufbild `schritt` (0 bis 3)
export function figurBild(richtung: Richtung, schritt: number, bewegt: boolean): Raster {
  if (!Number.isInteger(schritt) || schritt < 0 || schritt >= SPIELER_SCHRITTE) throw new Error(`Schritt ${schritt} ausserhalb 0..${SPIELER_SCHRITTE - 1}`);
  const beine = bewegt ? BEINE_LAUF[schritt] : BEINE_STEHEN;
  return ansicht(SPIELER, richtung, beine, true, 'spieler', bewegt ? ARM_DY[schritt] : 0);
}

// Bild eines NPC: Stehbild oder eines von zwei Laufbildern
export function npcBild(id: NpcId, richtung: Richtung, schritt: number, bewegt: boolean): Raster {
  if (!Number.isInteger(schritt) || schritt < 0 || schritt >= NPC_SCHRITTE) throw new Error(`NPC-Schritt ${schritt} ausserhalb 0..${NPC_SCHRITTE - 1}`);
  const beine = bewegt ? BEINE_LAUF[schritt * 2] : BEINE_STEHEN;
  return ansicht(NPC_AUSSEHEN[id], richtung, beine, false, `npc-${id}`, bewegt ? ARM_DY[schritt * 2] : 0);
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

const CHEF: Aussehen = {
  haar: 'glatt',
  haarFarbe: PALETTE.haarSchwarz,
  haarLicht: PALETTE.haarSchwarzLicht,
  hemd: PALETTE.hemd,
  hemdLicht: PALETTE.hemdLicht,
  hemdSchatten: PALETTE.hemdSchatten,
  hose: PALETTE.anzug,
  hoseLicht: PALETTE.anzugLicht,
  schuh: PALETTE.schuhSchwarz,
  rolle: 'spieler',
};

// Chef: Feindetails zusaetzlich zu den gemeinsamen: Schnurrbart mit Licht, verschraenkte Arme (Falten), Einstecktuch
function chefFein(zeilen: string[], hinten: boolean): Raster {
  const farben = { ...farbenFuer(CHEF), W: PALETTE.hemd };
  const mehr: [number, Ton][] = [
    [PALETTE.anzug, { licht: PALETTE.anzugLicht, schatten: tonen(PALETTE.anzug, 0.6) }],
  ];
  const r = feinVerdoppelt(verdoppeln(zeilen), CHEF, farben, hinten, mehr);
  if (!hinten) {
    // verschraenkte Arme: gekreuzte Faltenlinien auf dem Armband (Zeilen 18 bis 21)
    for (let y = 18; y <= 21; y++) {
      for (const x of [5 + (y - 18) * 5, 22 - (y - 18) * 5]) {
        setzeWenn(r, x, y, PALETTE.anzug);
        setzeWenn(r, x + 1, y, PALETTE.anzug);
      }
    }
    // Einstecktuch an der Brust
    setzeWenn(r, 21, 16, PALETTE.papier);
    setzeWenn(r, 22, 16, PALETTE.papier);
    setzeWenn(r, 21, 17, PALETTE.hemdSchatten);
  }
  return mitUmriss(r, PALETTE.umriss);
}

// Chef: dunkler Anzug, Schnurrbart, verschraenkte Arme, roter Schlips; blickt nach vorn
export function chefBild(): Raster {
  return gemerkt('chef', () => chefFein(CHEF_ZEILEN, false));
}

// Weicher Schatten unter einer Figur (Raster 28 x 12, Ellipse mit harten Pixelkanten), wird mit Alpha ausgegeben
export function schattenBild(): Raster {
  return gemerkt('schatten', () => {
    const r = neuesRaster(28, 12);
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 28; x++) {
        const dx = (x + 0.5 - 14) / 14;
        const dy = (y + 0.5 - 6) / 6;
        if (dx * dx + dy * dy <= 1) r.punkte[y * 28 + x] = PALETTE.schatten;
      }
    }
    return r;
  });
}

// ---------------------------------------------------------------- beweglicher Chef (A-010)
export const CHEF_SCHRITTE = 2;

function chefGrundbild(hinten: boolean, beine: string[]): Raster {
  const zeilen = CHEF_ZEILEN.slice(0, 12).concat(beine).map((z) => z.split(''));
  if (hinten) {
    for (let y = 3; y <= 6; y++) for (let x = 0; x < zeilen[y].length; x++) if ('SsEQM'.includes(zeilen[y][x])) zeilen[y][x] = 'H';
    for (let y = 7; y <= 8; y++) for (let x = 0; x < zeilen[y].length; x++) if (zeilen[y][x] === 'R') zeilen[y][x] = 'N';
  } else {
    zeilen[5] = '.HSESSESSSSSH.'.split(''); // Blick nach links
  }
  return chefFein(zeilen.map((z) => z.join('')), hinten);
}

// Chef in vier Blickrichtungen: Stehbild oder eines von zwei Laufbildern (rechts = Spiegelbild von links)
export function chefFigurBild(richtung: Richtung, schritt: number, bewegt: boolean): Raster {
  if (!Number.isInteger(schritt) || schritt < 0 || schritt >= CHEF_SCHRITTE) throw new Error(`Chef-Schritt ${schritt} ausserhalb 0..${CHEF_SCHRITTE - 1}`);
  const beine = bewegt ? BEINE_LAUF[schritt * 2] : BEINE_STEHEN;
  const hinten = richtung[0] === 'o';
  const links = gemerkt(`chef-${hinten ? 'o' : 'u'}l-${beine.join('')}`, () => chefGrundbild(hinten, beine));
  return richtung[1] === 'l' ? links : gemerkt(`chef-${hinten ? 'o' : 'u'}r-${beine.join('')}`, () => spiegeln(links));
}
