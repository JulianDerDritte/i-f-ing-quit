// Oberflaeche im Pixelstil: Knoepfe, Fenster, Timer-Plakette mit Sieben-Segment-Ziffern, Symbole, HUD-Rechtecke, Menuehintergrund.
// Rein, ohne Phaser; die Szenen zeichnen die gelieferten Rechtecke und Raster.
import {
  BILD_GROESSE,
  HUD_LAYOUT,
  INVENTAR_KNOPF,
  KAFFEE_HUD,
  KANTEN,
  KNOPF_STILE,
  PALETTE,
  PLAKETTE_STIL,
  FENSTER_STIL,
  SZENEN_TEXTE,
  TIMER_WARNUNG_SEKUNDEN,
} from '../config.ts';
import type { KnopfArt } from '../config.ts';
import { tonen } from './palette.ts';
import { mitUmriss, neuesRaster, rasterAusZeilen, rechteck, setzePunkt } from './raster.ts';
import type { Raster } from './raster.ts';
import { ZEILE, pixelSkala, textMasse, umbrechen } from './schrift.ts';

export interface FarbRechteck {
  x: number;
  y: number;
  b: number;
  h: number;
  farbe: number;
}

export type KnopfZustand = 'normal' | 'hover' | 'gedrueckt';

// Farben eines Knopfs: Flaeche (normal oder Hover), Textfarbe, Licht- und Schattenkante (gedrueckt: vertauscht)
export function knopfZustand(art: KnopfArt, zustand: KnopfZustand): { flaeche: number; text: number; licht: number; schatten: number } {
  const s = KNOPF_STILE[art];
  const flaeche = zustand === 'normal' ? s.flaeche : s.hover;
  const licht = KANTEN.licht;
  const schatten = tonen(flaeche, 0.55);
  return zustand === 'gedrueckt' ? { flaeche, text: s.text, licht: schatten, schatten: licht } : { flaeche, text: s.text, licht, schatten };
}

// Gemeinsamer Rahmen: schwarzer Umriss, heller Rahmen, Flaeche (aeusserer Rand = Rechteck x, y, b, h)
function rahmen(x: number, y: number, b: number, h: number, flaeche: number, rahmenFarbe: number): FarbRechteck[] {
  const u = KANTEN.umrissStaerke;
  const r = KANTEN.rahmenStaerke;
  return [
    { x, y, b, h, farbe: KANTEN.umriss },
    { x: x + u, y: y + u, b: b - 2 * u, h: h - 2 * u, farbe: rahmenFarbe },
    { x: x + u + r, y: y + u + r, b: b - 2 * (u + r), h: h - 2 * (u + r), farbe: flaeche },
  ];
}

export function knopfRechtecke(x: number, y: number, b: number, h: number, art: KnopfArt, zustand: KnopfZustand): FarbRechteck[] {
  const f = knopfZustand(art, zustand);
  const i = KANTEN.umrissStaerke + KANTEN.rahmenStaerke;
  const l = KANTEN.lichtStaerke;
  return [
    ...rahmen(x, y, b, h, f.flaeche, KANTEN.rahmen),
    { x: x + i, y: y + i, b: b - 2 * i, h: l, farbe: f.licht },
    { x: x + i, y: y + i + l, b: l, h: h - 2 * i - 2 * l, farbe: f.licht },
    { x: x + i, y: y + h - i - l, b: b - 2 * i, h: l, farbe: f.schatten },
    { x: x + b - i - l, y: y + i + l, b: l, h: h - 2 * i - 2 * l, farbe: f.schatten },
  ];
}

// Fenster (Gespraech, Inventar): Rahmen, Eck-Dekor, optional Namensleiste in Gelb (Rechteck der Leiste in Bildpunkten)
export function fensterRechtecke(x: number, y: number, b: number, h: number, flaeche: number, leiste?: { x: number; y: number; b: number; h: number }): FarbRechteck[] {
  const liste = rahmen(x, y, b, h, flaeche, KANTEN.rahmen);
  const e = 8;
  const d = KANTEN.umrissStaerke + KANTEN.rahmenStaerke + 2;
  for (const [ex, ey] of [
    [x + d, y + d],
    [x + b - d - e, y + d],
    [x + d, y + h - d - e],
    [x + b - d - e, y + h - d - e],
  ]) {
    liste.push({ x: ex, y: ey, b: e, h: e, farbe: KANTEN.umriss }, { x: ex + 2, y: ey + 2, b: e - 4, h: e - 4, farbe: FENSTER_STIL.eck });
  }
  if (leiste !== undefined) {
    liste.push({ x: leiste.x - 2, y: leiste.y - 2, b: leiste.b + 4, h: leiste.h + 4, farbe: KANTEN.umriss }, { x: leiste.x, y: leiste.y, b: leiste.b, h: leiste.h, farbe: FENSTER_STIL.leiste });
  }
  return liste;
}

export function plaketteRechtecke(x: number, y: number, b: number, h: number): FarbRechteck[] {
  return rahmen(x, y, b, h, PLAKETTE_STIL.flaeche, PLAKETTE_STIL.rahmen);
}

// ---------------------------------------------------------------- Timer-Plakette
// MM:SS aus Restsekunden (aufgerundet wie zeitAufgerundet), Anzeige hoechstens 99:59; der Zaehler im Spiel bleibt unberuehrt.
export function zeitZiffern(sekunden: number): string {
  const s = Math.min(5999, Math.max(0, Math.ceil(sekunden)));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Blinken der Warnung (Restzeit <= Warnschwelle): halbsekundenweise, rein aus der Restzeit
export function blinkAn(rest: number): boolean {
  return rest <= TIMER_WARNUNG_SEKUNDEN && Math.floor(rest * 2) % 2 === 0;
}

export const SEGMENTE: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
// Segment -> [x, y, Breite, Hoehe] im 5x9-Raster einer Ziffer
const SEG_LAGE: Record<string, [number, number, number, number]> = { a: [1, 0, 3, 1], b: [4, 1, 1, 3], c: [4, 5, 1, 3], d: [1, 8, 3, 1], e: [0, 5, 1, 3], f: [0, 1, 1, 3], g: [1, 4, 3, 1] };

// Muster einer Ziffer: 9 Zeilen zu 5 Zeichen, '#' = leuchtendes Segment
export function ziffernMuster(z: string): string[] {
  const an = SEGMENTE[z];
  if (an === undefined) throw new Error(`Keine Ziffer: ${z}`);
  const zeilen = Array.from({ length: 9 }, () => Array.from({ length: 5 }, () => '.'));
  for (const s of an) {
    const [x, y, b, h] = SEG_LAGE[s];
    for (let j = y; j < y + h; j++) for (let i = x; i < x + b; i++) zeilen[j][i] = '#';
  }
  return zeilen.map((z2) => z2.join(''));
}

export const PLAKETTE_ZIFFERN_BREITE = 27;
export const PLAKETTE_ZIFFERN_HOEHE = 9;
const ZIFFERN_X = [0, 6, 16, 22];

// Raster der Ziffernanzeige "MM:SS" (27 x 9 Punkte): blasses Geisterbild aller Segmente, leuchtende Segmente in Rot
export function plaketteRaster(text: string, hell: boolean): Raster {
  if (!/^\d\d:\d\d$/.test(text)) throw new Error(`Format MM:SS erwartet: ${text}`);
  const r = neuesRaster(PLAKETTE_ZIFFERN_BREITE, PLAKETTE_ZIFFERN_HOEHE);
  const an = hell ? PLAKETTE_STIL.ziffernHell : PLAKETTE_STIL.ziffer;
  const ziffern = [text[0], text[1], text[3], text[4]];
  ziffern.forEach((z, k) => {
    const x0 = ZIFFERN_X[k];
    for (const s of Object.keys(SEG_LAGE)) {
      const [x, y, b, h] = SEG_LAGE[s];
      rechteck(r, x0 + x, y, b, h, SEGMENTE[z].includes(s) ? an : PLAKETTE_STIL.geist);
    }
  });
  for (const y of [2, 6]) rechteck(r, 12, y, 2, 2, an);
  return r;
}

// ---------------------------------------------------------------- Symbole
// Stoppuhr (gross: Plakette, klein: Kostenzeile im Gespraech): weisses Zifferblatt, roter Sektor, Zeiger, Krone
export function stoppuhrRaster(gross: boolean): Raster {
  const radius = gross ? 6 : 3.5;
  const w = Math.ceil(radius * 2) + 1;
  const hoehe = w + 2;
  const r = neuesRaster(w, hoehe);
  const cx = (w - 1) / 2;
  const cy = 2 + (w - 1) / 2;
  for (let y = 2; y < hoehe; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > radius + 0.3) continue;
      let f: number = PALETTE.hemd;
      if (d > radius - 1.3) f = PALETTE.grau;
      else if (x >= cx && y <= cy && (x > cx || y < cy)) f = PALETTE.krawatteRot;
      setzePunkt(r, x, y, f);
    }
  }
  for (let y = Math.round(cy - radius + 2); y <= cy; y++) setzePunkt(r, Math.round(cx), y, PALETTE.umriss);
  for (let x = Math.round(cx); x <= cx + 2 && x < w; x++) setzePunkt(r, x, Math.round(cy), PALETTE.umriss);
  for (const x of [Math.round(cx) - 1, Math.round(cx), Math.round(cx) + 1]) for (const y of [0, 1]) setzePunkt(r, x, y, PALETTE.grauLicht);
  return mitUmriss(r, PALETTE.umriss);
}

const TASSE = ['.bbbbbbb...', 'wwwwwwwww..', 'wwwwwwwwwww', 'wwwwwwwww.w', 'wwwwwwwww.w', '.wwwwwww.ww', '..wwwww....'];
export function tasseRaster(): Raster {
  return mitUmriss(rasterAusZeilen(TASSE, { b: PALETTE.kaffee, w: PALETTE.hemd }), PALETTE.umriss);
}

const BLATT = ['TTTTTT', 'TllllT', 'TTTTTT', 'TllllT', 'TTTTTT', 'TllllT', 'TTTTTT'];
export function blattSymbolRaster(): Raster {
  return mitUmriss(rasterAusZeilen(BLATT, { T: PALETTE.papier, l: PALETTE.papierLinie }), PALETTE.umriss);
}

// ---------------------------------------------------------------- HUD-Rechtecke (Layout-Rechnung, Bildschirmpunkte)
export function ueberlappt(a: FarbRechteck, b: FarbRechteck): boolean {
  return a.x < b.x + b.b && b.x < a.x + a.b && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function stufenZeile(stufeName: string, startzeit: string): string {
  return `${SZENEN_TEXTE.stufe}${stufeName}${SZENEN_TEXTE.startzeit}${startzeit}`;
}

// Alle HUD-Teile als Rechtecke aus Textlaenge x Vorschub x Skala; die Stufenzeile bricht bei HUD_LAYOUT.stufeUmbruch Punkten um.
export function hudRechtecke(raumText: string, stufeText: string): Record<string, FarbRechteck> {
  const sRaum = pixelSkala(HUD_LAYOUT.raumPx);
  const sStufe = pixelSkala(HUD_LAYOUT.stufePx);
  const raum = textMasse(raumText, sRaum);
  const zeilen = umbrechen(stufeText, HUD_LAYOUT.stufeUmbruch, sStufe).split('\n');
  const rects: Record<string, FarbRechteck> = {
    raum: { x: HUD_LAYOUT.raumX, y: HUD_LAYOUT.raumY, b: raum.breite, h: raum.hoehe, farbe: 0 },
    plakette: { x: (BILD_GROESSE.breite - HUD_LAYOUT.plaketteBreite) / 2, y: HUD_LAYOUT.timerY, b: HUD_LAYOUT.plaketteBreite, h: HUD_LAYOUT.plaketteHoehe, farbe: 0 },
    kaffeeSymbol: { x: KAFFEE_HUD.symbolX, y: KAFFEE_HUD.symbolY, b: KAFFEE_HUD.symbolBreite, h: KAFFEE_HUD.symbolHoehe, farbe: 0 },
    kaffeeText: { x: KAFFEE_HUD.textX, y: KAFFEE_HUD.textY, ...rename(textMasse(SZENEN_TEXTE.kaffee, pixelSkala(KAFFEE_HUD.schriftPx))), farbe: 0 },
    zurueck: {
      x: BILD_GROESSE.breite - HUD_LAYOUT.zurueckAbstandRechts - HUD_LAYOUT.zurueckBreite / 2,
      y: HUD_LAYOUT.zurueckY - HUD_LAYOUT.zurueckHoehe / 2,
      b: HUD_LAYOUT.zurueckBreite,
      h: HUD_LAYOUT.zurueckHoehe,
      farbe: 0,
    },
    inventar: { x: INVENTAR_KNOPF.x, y: INVENTAR_KNOPF.y, b: INVENTAR_KNOPF.breite, h: INVENTAR_KNOPF.hoehe, farbe: 0 },
  };
  zeilen.forEach((z, i) => {
    const m = textMasse(z, sStufe);
    rects[`stufe${i + 1}`] = { x: HUD_LAYOUT.stufeX, y: HUD_LAYOUT.stufeY + i * ZEILE * sStufe, b: m.breite, h: m.hoehe, farbe: 0 };
  });
  return rects;
}

function rename(m: { breite: number; hoehe: number }): { b: number; h: number } {
  return { b: m.breite, h: m.hoehe };
}

// ---------------------------------------------------------------- Menuehintergrund im Bueroston (400 x 320 Punkte, Skala 2)
export function menueHintergrund(): Raster {
  const B = 400;
  const H = 320;
  const r = neuesRaster(B, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      let f: number;
      if (y < 60) f = x % 40 === 0 || y % 20 === 0 ? PALETTE.wandRechts : PALETTE.wandNaht; // Decke mit Plattenfugen
      else if (y < 170) f = y === 60 ? PALETTE.wandKopfLicht : y < 64 ? PALETTE.wandKopf : y > 140 ? PALETTE.wandLinksLicht : PALETTE.wandLinks; // Wand
      else if (y < 180) f = y === 170 ? PALETTE.sockelLicht : PALETTE.sockel;
      else f = x % 20 === 0 || y % 10 === 0 ? PALETTE.fuge : (Math.floor(x / 20) + Math.floor(y / 10)) % 2 === 0 ? PALETTE.fliesenHell : PALETTE.fliesenDunkel;
      r.punkte[y * B + x] = f;
    }
  }
  // Deckenlicht: drei helle Leuchtbalken
  for (const x0 of [40, 170, 300]) {
    rechteck(r, x0, 22, 60, 8, PALETTE.lampeRand);
    rechteck(r, x0 + 2, 24, 56, 4, PALETTE.lampeKern);
  }
  // Fensterband
  for (let k = 0; k < 8; k++) {
    const x0 = 10 + k * 48;
    rechteck(r, x0, 82, 40, 44, PALETTE.fensterRahmen);
    rechteck(r, x0 + 2, 84, 36, 40, PALETTE.fenster);
    rechteck(r, x0 + 19, 84, 2, 40, PALETTE.fensterRahmen);
    rechteck(r, x0 + 4, 88, 8, 4, PALETTE.fensterLicht);
  }
  // Teppich in der Mitte des Bodens
  for (let y = 180; y < H; y++) {
    const x0 = 150 - Math.floor((y - 180) / 3);
    const x1 = 250 + Math.floor((y - 180) / 3);
    for (let x = Math.max(0, x0); x < Math.min(B, x1); x++) r.punkte[y * B + x] = x < x0 + 2 || x >= x1 - 2 ? PALETTE.teppichDunkel : (x + y) % 4 === 0 ? PALETTE.teppichLicht : PALETTE.teppich;
  }
  return r;
}
