// Welt als Pixelraster: Boden (ein Gesamtbild der Karte), Waende, Fenster, Lampen, Welt-Objekte in Zeichenreihenfolge.
// Rein, ohne Phaser; Karte und Listen kommen aus karte.ts und config.ts.
import { CHEF_ZELLE, KACHEL_BREITE, KACHEL_HOEHE, PALETTE, PFLANZEN_ZELLEN, SPRITE_SKALA, TEPPICH_ZELLEN, WAND_HOEHE, ABLAGE_FARBE } from '../config.ts';
import { bereichAnZelle, zellArt } from '../karte.ts';
import type { Karte } from '../karte.ts';
import { bildZuGitter, gitterZuBild } from '../projektion.ts';
import { blockRaster } from './block.ts';
import type { BlockMaler } from './block.ts';
import { chefBild } from './figuren.ts';
import { ablageMarkierung, maschineRaster, pflanzeRaster, schildRaster, sturzRaster, tischRaster, TISCH_VARIANTEN } from './moebel.ts';
import { neuesRaster, ueberlagern } from './raster.ts';
import type { Raster } from './raster.ts';

const P = PALETTE;
export const WAND_ZEILEN = WAND_HOEHE / SPRITE_SKALA;

// In der Karte steht an (x, y) eine Wand (ausserhalb der Karte nie: dort wird kein Block gezeichnet).
export function istWandZelle(karte: Karte, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < karte.breite && y < karte.hoehe && zellArt(karte, x, y) === 'wand';
}

export function istTuerZelle(karte: Karte, x: number, y: number): boolean {
  return karte.tueren.some((t) => t.zellen.some(([tx, ty]) => tx === x && ty === y));
}

export interface FensterZelle {
  x: number;
  y: number;
  seite: 'links' | 'rechts'; // links = Seitenflaeche zur +y-Seite, rechts = zur +x-Seite (die beiden sichtbaren Seiten)
}

// Fenster an den Wandflaechen, die ins Innere blicken: Aussenwand oben und links, die beiden Trennwaende; nicht neben Tueren.
export function fensterZellen(karte: Karte): FensterZelle[] {
  const liste: FensterZelle[] = [];
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      if (!istWandZelle(karte, x, y)) continue;
      const nebenTuer = [-1, 0, 1].some((d) => istTuerZelle(karte, x, y + d)) && (x === 9 || x === 24);
      if (y === 0 && x >= 1 && x <= karte.breite - 2 && x % 4 !== 0) liste.push({ x, y, seite: 'links' });
      else if ((x === 0 || x === 9 || x === 24) && y >= 1 && y <= karte.hoehe - 2 && y % 4 !== 0 && !nebenTuer) liste.push({ x, y, seite: 'rechts' });
    }
  }
  return liste;
}

// Deckenlampen als Teil der Wandtextur "mit Lampe" (Wandkopf), in regelmaessigem Abstand.
export function lampenZellen(karte: Karte): [number, number][] {
  const liste: [number, number][] = [];
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      if (!istWandZelle(karte, x, y)) continue;
      const nebenTuer = [-1, 0, 1].some((d) => istTuerZelle(karte, x, y + d)) && (x === 9 || x === 24);
      if ((y === 0 && x % 4 === 2) || ((x === 0 || x === 9 || x === 24) && y % 4 === 2 && !nebenTuer && y > 0 && y < karte.hoehe - 1)) liste.push([x, y]);
    }
  }
  return liste;
}

// ---------------------------------------------------------------- Waende
export interface WandOpt {
  maske: number; // Bit (dy+1)*3+(dx+1): dort steht eine Wand
  tuerMaske: number; // dasselbe fuer Tuerzellen
  fensterLinks: boolean;
  fensterRechts: boolean;
  lampe: boolean;
}

function bit(dx: number, dy: number): number {
  return 1 << ((dy + 1) * 3 + (dx + 1));
}

export function wandOptionen(karte: Karte, x: number, y: number, fenster: readonly FensterZelle[], lampen: readonly [number, number][]): WandOpt {
  let maske = 0;
  let tuerMaske = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (istWandZelle(karte, x + dx, y + dy)) maske |= bit(dx, dy);
      if (istTuerZelle(karte, x + dx, y + dy)) tuerMaske |= bit(dx, dy);
    }
  }
  return {
    maske,
    tuerMaske,
    fensterLinks: fenster.some((f) => f.x === x && f.y === y && f.seite === 'links'),
    fensterRechts: fenster.some((f) => f.x === x && f.y === y && f.seite === 'rechts'),
    lampe: lampen.some(([lx, ly]) => lx === x && ly === y),
  };
}

export function wandSchluessel(o: WandOpt): string {
  return `wand-${o.maske}-${o.tuerMaske}-${o.fensterLinks ? 1 : 0}${o.fensterRechts ? 1 : 0}${o.lampe ? 1 : 0}`;
}

function fensterMalen(Xl: number, v: number): number {
  // Fenster in einer Seitenflaeche (Xl 0..31): Brett, Rahmen mit Kreuzsprossen, Scheibe mit Verlauf und Spiegelung
  if (v >= 18 && v <= 19 && Xl >= 2 && Xl <= 29) return v === 19 ? P.fensterBrett : P.wandNaht;
  if (Xl < 4 || Xl > 27 || v < 20 || v > 45) return -1;
  if (Xl <= 5 || Xl >= 26 || v <= 21 || v >= 44) return P.fensterRahmen;
  if (Xl === 15 || Xl === 16 || v === 32 || v === 33) return P.fensterRahmen;
  const spiegel = (Xl + v) % 18;
  if (spiegel < 3 || spiegel === 4) return P.fensterLicht;
  return v < 32 ? P.fensterTief : P.fenster;
}

function wandMaler(o: WandOpt): BlockMaler {
  const seite = (Xl: number, v: number, haupt: number, licht: number, fenster: boolean, jamb: boolean): number => {
    if (jamb) return v >= WAND_ZEILEN - 2 ? P.tuerHolzLicht : P.tuerHolz;
    if (v >= WAND_ZEILEN - 2) return P.wandKopfLicht;
    if (v >= WAND_ZEILEN - 4) return P.wandKopf;
    if (v <= 7) return P.sockel;
    if (v <= 9) return P.sockelLicht;
    if (fenster) {
      const f = fensterMalen(Xl, v);
      if (f !== -1) return f;
    }
    if (v === 34) return P.wandNaht;
    if (Xl % 16 === 0 && v >= 10 && v < 34) return P.wandNaht; // Paneelfuge
    return v > 34 ? licht : haupt;
  };
  const tuerLinks = (o.tuerMaske & bit(0, 1)) !== 0;
  return {
    oben: (tx, ty, X, Yb) => {
      if (o.lampe) {
        const a = Math.abs(tx - 0.5);
        const b = Math.abs(ty - 0.5);
        if (a < 0.26 && b < 0.07) return P.lampeKern;
        if (a < 0.33 && b < 0.12) return P.lampe;
        if (a < 0.38 && b < 0.16) return P.lampeRand;
      }
      return (X + Yb) % 16 < 2 ? P.wandKopfLicht : P.wandKopf;
    },
    links: (_u, v, X) => seite(X, v, P.wandLinks, P.wandLinksLicht, o.fensterLinks, tuerLinks),
    rechts: (_u, v, X) => seite(X - 32, v, P.wandRechts, P.wandRechtsLicht, o.fensterRechts, false),
  };
}

export function wandRaster(o: WandOpt): Raster {
  return blockRaster({
    hoehe: WAND_ZEILEN,
    oben: 0,
    nachbar: (dx, dy) => (o.maske & bit(dx, dy)) !== 0,
    nachbarOben: (dx, dy) => ((o.maske | o.tuerMaske) & bit(dx, dy)) !== 0,
    maler: wandMaler(o),
    umriss: P.umriss,
    kante: P.wandNaht,
  });
}

// Tuersturz: Nachbarn sind Wand oder andere Tuerzellen
export function sturzOptionen(karte: Karte, x: number, y: number): { schluessel: string; nachbar: (dx: number, dy: number) => boolean } {
  let maske = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (istWandZelle(karte, x + dx, y + dy) || istTuerZelle(karte, x + dx, y + dy)) maske |= bit(dx, dy);
    }
  }
  return { schluessel: `sturz-${maske}`, nachbar: (dx, dy) => (maske & bit(dx, dy)) !== 0 };
}

// ---------------------------------------------------------------- Boden
export type Boden = 'wand' | 'fliese' | 'parkett' | 'teppich' | 'ablage' | 'start';

function teppichMenge(teppich: readonly [number, number][]): Set<string> {
  return new Set(teppich.map(([x, y]) => `${x},${y}`));
}

export function bodenArt(karte: Karte, teppich: ReadonlySet<string>, x: number, y: number): Boden {
  if (zellArt(karte, x, y) === 'wand') return 'wand';
  if (x === karte.ablage[0] && y === karte.ablage[1]) return 'ablage';
  if (x === karte.start[0] && y === karte.start[1]) return 'start';
  if (teppich.has(`${x},${y}`)) return 'teppich';
  return bereichAnZelle(karte, x, y) === 'Chefbuero' ? 'parkett' : 'fliese';
}

export function bodenGroesse(karte: Karte): { breite: number; hoehe: number; ursprungX: number } {
  return {
    breite: ((karte.breite + karte.hoehe) * (KACHEL_BREITE / 2)) / SPRITE_SKALA,
    hoehe: ((karte.breite + karte.hoehe) * (KACHEL_HOEHE / 2)) / SPRITE_SKALA,
    ursprungX: -karte.hoehe * (KACHEL_BREITE / 2),
  };
}

// Ein Raster der ganzen Karte (Ursprung bei Bildschirmpunkt (ursprungX, 0), Skala SPRITE_SKALA)
export function bodenRaster(karte: Karte, teppichZellen: readonly [number, number][] = TEPPICH_ZELLEN): Raster {
  const g = bodenGroesse(karte);
  const r = neuesRaster(g.breite, g.hoehe);
  const teppich = teppichMenge(teppichZellen);
  for (let Y = 0; Y < g.hoehe; Y++) {
    for (let X = 0; X < g.breite; X++) {
      const w = bildZuGitter(g.ursprungX + (X + 0.5) * SPRITE_SKALA, (Y + 0.5) * SPRITE_SKALA);
      const gx = Math.floor(w.x);
      const gy = Math.floor(w.y);
      if (gx < 0 || gy < 0 || gx >= karte.breite || gy >= karte.hoehe) continue;
      const art = bodenArt(karte, teppich, gx, gy);
      r.punkte[Y * g.breite + X] = bodenFarbe(karte, teppich, art, gx, gy, w.x - gx, w.y - gy, X, Y);
    }
  }
  // Markierung der Ablagezelle: Blatt mit gelbem Pfeil flach auf dem Boden
  const m = ablageMarkierung();
  const c = gitterZuBild(karte.ablage[0] + 0.5, karte.ablage[1] + 0.5);
  ueberlagern(r, m, Math.round((c.x - g.ursprungX) / SPRITE_SKALA - m.breite / 2), Math.round(c.y / SPRITE_SKALA - m.hoehe / 2));
  return r;
}

// Breite des Schattenbands neben festen Zellen (Anteil der Zelle); hoechstens 0,4, damit die Zellmitte hell bleibt.
export const SCHATTEN_BREITE = 0.28;

// Schattenband auf der Lichtseite (West- und Nordkante), wenn dort Wand, Tisch oder Maschine steht; nie auf Start-, Ablage- und Tuerzellen.
export function imSchatten(karte: Karte, art: Boden, gx: number, gy: number, tx: number, ty: number): boolean {
  if (art === 'ablage' || art === 'start' || art === 'wand') return false;
  if (istTuerZelle(karte, gx, gy)) return false;
  const west = zellArt(karte, gx - 1, gy) !== 'boden';
  const nord = zellArt(karte, gx, gy - 1) !== 'boden';
  return (west && tx < SCHATTEN_BREITE) || (nord && ty < SCHATTEN_BREITE);
}

function bodenFarbe(karte: Karte, teppich: ReadonlySet<string>, art: Boden, gx: number, gy: number, tx: number, ty: number, X: number, Y: number): number {
  const d = Math.min(tx, ty, 1 - tx, 1 - ty);
  const schatten = imSchatten(karte, art, gx, gy, tx, ty);
  let farbe: number;
  if (art === 'wand') return P.fuge;
  if (art === 'fliese') {
    const hell = (gx + gy) % 2 === 0;
    if (d < 0.04) farbe = P.fuge;
    else if (schatten) farbe = hell ? P.fliesenHellSchatten : P.fliesenDunkelSchatten;
    else if (d < 0.08 && (tx < 0.08 || ty < 0.08)) farbe = P.fliesenGlanz;
    else if ((gx * 7 + gy * 13) % 11 === 0 && ty > 0.25 && ty < 0.65 && Math.abs(tx - (ty * 0.6 + 0.3)) < 0.012) farbe = P.fliesenKratzer;
    else if ((gx * 5 + gy * 3) % 17 === 0 && (tx - 0.6) * (tx - 0.6) + (ty - 0.3) * (ty - 0.3) < 0.006) farbe = P.fliesenFleck;
    else if ((X + 2 * Y) % 96 < 3 && !schatten && d > 0.1) farbe = P.fliesenGlanz;
    else farbe = hell ? P.fliesenHell : P.fliesenDunkel;
  } else if (art === 'parkett') {
    const s = X + 2 * Y;
    const brett = Math.floor(s / 12);
    if (s % 12 === 0 || (X - 2 * Y + brett * 10 + 4800) % 48 === 0) farbe = P.parkettFuge;
    else if (schatten) farbe = brett % 2 === 0 ? P.parkettHellSchatten : P.parkettDunkelSchatten;
    else if ((X * 3 + Y * 5 + brett * 11) % 19 === 0) farbe = P.parkettMaser;
    else farbe = brett % 2 === 0 ? P.parkettHell : P.parkettDunkel;
  } else if (art === 'teppich') {
    // Abstand zu Kanten, an denen kein Teppich weitergeht
    let m = 1;
    if (!teppich.has(`${gx - 1},${gy}`)) m = Math.min(m, tx);
    if (!teppich.has(`${gx},${gy - 1}`)) m = Math.min(m, ty);
    if (!teppich.has(`${gx + 1},${gy}`)) m = Math.min(m, 1 - tx);
    if (!teppich.has(`${gx},${gy + 1}`)) m = Math.min(m, 1 - ty);
    if (m < 0.035) farbe = P.teppichDunkel;
    else if (m < 0.07) farbe = P.teppichLicht;
    else if (m >= 0.1 && m < 0.125) farbe = P.teppichBorte;
    else if (schatten) farbe = P.teppichDunkel;
    else farbe = (X + 2 * Y) % 24 < 2 || (X - 2 * Y + 4800) % 24 < 2 ? P.teppichLicht : P.teppich;
  } else if (art === 'ablage') {
    farbe = d < 0.035 ? P.gelbDunkel : ABLAGE_FARBE;
  } else {
    farbe = d < 0.035 ? P.fuge : d < 0.07 ? P.hemdSchatten : P.startWeiss;
  }
  // Tuerschwelle: schmaler Metallstreifen quer zur Wandlinie
  if (istTuerZelle(karte, gx, gy)) {
    const a = Math.abs(tx - 0.5);
    if (a < 0.05) farbe = P.schwelle;
    else if (a < 0.09) farbe = P.schwelleDunkel;
  }
  return farbe;
}

// ---------------------------------------------------------------- Welt-Objekte in Zeichenreihenfolge
export interface WeltObjekt {
  art: 'wand' | 'tisch' | 'maschine' | 'pflanze' | 'sturz' | 'schild' | 'chef';
  schluessel: string;
  raster: () => Raster;
  bildX: number; // Fusspunkt (unten Mitte) in Bildschirmpunkten
  bildY: number;
  tiefe: number;
  x: number;
  y: number;
}

export function weltObjekte(karte: Karte): WeltObjekt[] {
  const fenster = fensterZellen(karte);
  const lampen = lampenZellen(karte);
  const liste: WeltObjekt[] = [];
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      const art = zellArt(karte, x, y);
      const s = gitterZuBild(x + 1, y + 1);
      if (art === 'wand') {
        const o = wandOptionen(karte, x, y, fenster, lampen);
        liste.push({ art: 'wand', schluessel: wandSchluessel(o), raster: () => wandRaster(o), bildX: s.x, bildY: s.y, tiefe: x + y + 1, x, y });
      } else if (art === 'tisch') {
        const v = (x + y) % TISCH_VARIANTEN;
        liste.push({ art: 'tisch', schluessel: `tisch-${v}`, raster: () => tischRaster(v), bildX: s.x, bildY: s.y, tiefe: x + y + 1, x, y });
      } else if (art === 'maschine') {
        liste.push({ art: 'maschine', schluessel: 'maschine', raster: maschineRaster, bildX: s.x, bildY: s.y, tiefe: x + y + 1, x, y });
      }
      if (istTuerZelle(karte, x, y)) {
        const t = sturzOptionen(karte, x, y);
        liste.push({ art: 'sturz', schluessel: t.schluessel, raster: () => sturzRaster(WAND_ZEILEN, P.wandKopf, t.nachbar), bildX: s.x, bildY: s.y, tiefe: x + y + 1, x, y });
      }
    }
  }
  for (const [x, y] of PFLANZEN_ZELLEN) {
    const c = gitterZuBild(x + 0.5, y + 0.5);
    liste.push({ art: 'pflanze', schluessel: 'pflanze', raster: pflanzeRaster, bildX: c.x, bildY: c.y + 4, tiefe: x + y + 1, x, y });
  }
  // Schild "CHEF" ueber der Tuer zum Chefbuero (zweite Tuer der Karte), mittig ueber den beiden Tuerzellen
  const chefTuer = karte.tueren[karte.tueren.length - 1];
  const ys = chefTuer.zellen.map(([, y]) => y);
  const tx = chefTuer.zellen[0][0];
  const j = gitterZuBild(tx + 1, (Math.min(...ys) + Math.max(...ys) + 1) / 2 + 0.5);
  liste.push({ art: 'schild', schluessel: 'schild-chef', raster: () => schildRaster('CHEF'), bildX: j.x, bildY: j.y - WAND_HOEHE + 6, tiefe: tx + Math.max(...ys) + 1.1, x: tx, y: Math.max(...ys) });
  const cz = gitterZuBild(CHEF_ZELLE[0] + 0.5, CHEF_ZELLE[1] + 0.5);
  liste.push({ art: 'chef', schluessel: 'chef', raster: chefBild, bildX: cz.x, bildY: cz.y, tiefe: CHEF_ZELLE[0] + CHEF_ZELLE[1] + 1, x: CHEF_ZELLE[0], y: CHEF_ZELLE[1] });
  return liste;
}

export interface Ausgabe {
  raster: Raster;
  bildX: number;
  bildY: number;
  tiefe: number;
}

// Ganzes Bild (Boden plus Objekte nach Tiefe) in Rasterpunkten, mit `rand` Zeilen Platz oberhalb fuer hohe Bloecke.
export function weltBildRaster(karte: Karte, extra: readonly Ausgabe[] = [], rand = 70): Raster {
  const g = bodenGroesse(karte);
  const boden = bodenRaster(karte);
  const bild = neuesRaster(g.breite, g.hoehe + rand);
  ueberlagern(bild, boden, 0, rand);
  const alle: Ausgabe[] = [
    ...weltObjekte(karte).map((o) => ({ raster: o.raster(), bildX: o.bildX, bildY: o.bildY, tiefe: o.tiefe })),
    ...extra,
  ].sort((a, b) => a.tiefe - b.tiefe);
  for (const o of alle) {
    const ox = Math.round((o.bildX - g.ursprungX) / SPRITE_SKALA - o.raster.breite / 2);
    const oy = Math.round(o.bildY / SPRITE_SKALA - o.raster.hoehe) + rand;
    ueberlagern(bild, o.raster, ox, oy, true);
  }
  return bild;
}
