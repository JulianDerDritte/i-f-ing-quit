// Schreibt Standbilder aller Sprites als PNG in einen uebergebenen Ordner (ausserhalb des Repos, z. B. A-009-belege).
// Aufruf: node scripts/sprites-png.ts <Ordner>
// Beleg fuer die Bildwirkung (kein Browser noetig); die Rasterfunktionen sind dieselben wie im Spiel.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { NPC_IDS } from '../src/config.ts';
import { KARTE } from '../src/karte.ts';
import { gitterZuBild } from '../src/projektion.ts';
import { RICHTUNGEN, chefBild, figurBild, npcBild, schattenBild } from '../src/grafik/figuren.ts';
import { ablageMarkierung, maschineRaster, pflanzeRaster, schildRaster, tischRaster } from '../src/grafik/moebel.ts';
import { weltBildRaster } from '../src/grafik/welt.ts';
import { neuesRaster, rasterAlsRgba, ueberlagern } from '../src/grafik/raster.ts';
import type { Raster } from '../src/grafik/raster.ts';
import { NPCS, npcPosition, neueWelt } from '../src/npcs.ts';

const ordner = process.argv[2];
if (ordner === undefined) throw new Error('Aufruf: node scripts/sprites-png.ts <Ordner>');
mkdirSync(ordner, { recursive: true });

function chunk(typ: string, daten: Buffer): Buffer {
  const kopf = Buffer.alloc(8);
  kopf.writeUInt32BE(daten.length, 0);
  kopf.write(typ, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(typ, 'ascii'), daten])) >>> 0, 0);
  return Buffer.concat([kopf, daten, crc]);
}

function png(r: Raster, skala: number): Buffer {
  const b = r.breite * skala;
  const h = r.hoehe * skala;
  const rgba = rasterAlsRgba(r);
  const zeilen = Buffer.alloc((b * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    zeilen[y * (b * 4 + 1)] = 0;
    for (let x = 0; x < b; x++) {
      const q = (Math.floor(y / skala) * r.breite + Math.floor(x / skala)) * 4;
      const z = y * (b * 4 + 1) + 1 + x * 4;
      zeilen[z] = rgba[q];
      zeilen[z + 1] = rgba[q + 1];
      zeilen[z + 2] = rgba[q + 2];
      zeilen[z + 3] = rgba[q + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(b, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(zeilen)), chunk('IEND', Buffer.alloc(0))]);
}

// Blatt mit Hintergrundfarbe, Sprites in Reihen
function blatt(reihen: Raster[][], hintergrund: number, luecke = 3): Raster {
  const breite = Math.max(...reihen.map((z) => z.reduce((s, r) => s + r.breite + luecke, luecke)));
  const hoehe = reihen.reduce((s, z) => s + Math.max(...z.map((r) => r.hoehe)) + luecke, luecke);
  const bild = neuesRaster(breite, hoehe);
  bild.punkte.fill(hintergrund);
  let y = luecke;
  for (const zeile of reihen) {
    const zh = Math.max(...zeile.map((r) => r.hoehe));
    let x = luecke;
    for (const r of zeile) {
      ueberlagern(bild, r, x, y + zh - r.hoehe);
      x += r.breite + luecke;
    }
    y += zh + luecke;
  }
  return bild;
}

function ausschnitt(r: Raster, x: number, y: number, b: number, h: number): Raster {
  const a = neuesRaster(b, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < b; i++) if (x + i < r.breite && y + j < r.hoehe) a.punkte[j * b + i] = r.punkte[(y + j) * r.breite + x + i];
  return a;
}

const HG = 0x5a6aa8;
const schreibe = (name: string, r: Raster, skala: number): void => {
  writeFileSync(path.join(ordner, name), png(r, skala));
  console.log(`${name}: ${r.breite}x${r.hoehe} Rasterpunkte, Skala ${skala}`);
};

schreibe(
  'figur-spieler.png',
  blatt(
    RICHTUNGEN.map((d) => [figurBild(d, 0, false), ...[0, 1, 2, 3].map((s) => figurBild(d, s, true))]),
    HG,
  ),
  6,
);
schreibe(
  'figur-npcs.png',
  blatt(
    NPC_IDS.map((id) => [...(['ul', 'ur', 'ol', 'or'] as const).map((d) => npcBild(id, d, 0, false)), npcBild(id, 'ul', 0, true), npcBild(id, 'ul', 1, true)]),
    HG,
  ),
  6,
);
schreibe('moebel.png', blatt([[tischRaster(0), tischRaster(1), tischRaster(2), maschineRaster(), pflanzeRaster()], [chefBild(), schildRaster('CHEF'), ablageMarkierung(), schattenBild()]], HG), 6);

// Welt mit Figur am Start und den NPCs an ihren Startpositionen
const welt = neueWelt();
const extra = [
  { raster: figurBild('ur', 0, false), ...(() => { const b = gitterZuBild(KARTE.start[0] + 0.5, KARTE.start[1] + 0.5); return { bildX: b.x, bildY: b.y, tiefe: KARTE.start[0] + KARTE.start[1] + 1 }; })() },
  ...NPCS.map((d) => {
    const p = npcPosition(welt, d.id);
    const b = gitterZuBild(p.x, p.y);
    return { raster: npcBild(d.id, 'ur', 0, false), bildX: b.x, bildY: b.y, tiefe: p.x + p.y };
  }),
  // Figur im Chefbuero am Teppich, damit das Bild Teppich, Chef und Ablage zusammen zeigt
  (() => { const b = gitterZuBild(26.5, 6.5); return { raster: figurBild('or', 1, true), bildX: b.x, bildY: b.y, tiefe: 26.5 + 6.5 }; })(),
];
const gesamt = weltBildRaster(KARTE, extra);
schreibe('welt-gesamt.png', gesamt, 1);
const m = 34;
// Ausschnitte in Rasterpunkten (Ursprung des Bodens + Rand m)
schreibe('welt-vorzimmer.png', ausschnitt(gesamt, 150, m + 20, 300, 190), 4);
schreibe('welt-chefbuero.png', ausschnitt(gesamt, 420, m + 20, 300, 190), 4);
schreibe('welt-tuer.png', ausschnitt(gesamt, 280, m + 40, 300, 190), 4);
