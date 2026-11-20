// Einzige Datei von src/grafik/, die Phaser benutzt: legt Raster als Canvas-Texturen an (ungeglaettet) und
// registriert alle Welt- und Figurentexturen einer Szene.
import Phaser from 'phaser';
import { KARTE } from '../karte.ts';
import { NPC_IDS } from '../config.ts';
import { NPC_SCHRITTE, RICHTUNGEN, SPIELER_SCHRITTE, chefBild, figurBild, npcBild, schattenBild } from './figuren.ts';
import { bodenRaster, weltObjekte } from './welt.ts';
import { rasterAlsRgba } from './raster.ts';
import type { Raster } from './raster.ts';
import type { NpcId } from '../config.ts';
import type { Richtung } from './figuren.ts';

// Legt die Textur an, falls es sie noch nicht gibt (die Szene startet bei Neustart und "Nochmal" neu).
export function rasterAlsTextur(textures: Phaser.Textures.TextureManager, schluessel: string, raster: Raster): void {
  if (textures.exists(schluessel)) return;
  const tex = textures.createCanvas(schluessel, raster.breite, raster.hoehe);
  if (tex === null) throw new Error(`Textur ${schluessel} konnte nicht angelegt werden`);
  const ctx = tex.getContext();
  const bild = ctx.createImageData(raster.breite, raster.hoehe);
  bild.data.set(rasterAlsRgba(raster));
  ctx.putImageData(bild, 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST); // harte Pixelkanten, keine Glaettung
}

export const BODEN_TEXTUR = 'boden';

export function figurSchluessel(richtung: Richtung, schritt: number, bewegt: boolean): string {
  return bewegt ? `figur-${richtung}-l${schritt}` : `figur-${richtung}-s`;
}

export function npcSchluessel(id: NpcId, richtung: Richtung, schritt: number, bewegt: boolean): string {
  return bewegt ? `npc-${id}-${richtung}-l${schritt}` : `npc-${id}-${richtung}-s`;
}

export function registriereWelt(textures: Phaser.Textures.TextureManager): void {
  rasterAlsTextur(textures, BODEN_TEXTUR, bodenRaster(KARTE));
  for (const o of weltObjekte(KARTE)) {
    if (!textures.exists(o.schluessel)) rasterAlsTextur(textures, o.schluessel, o.raster());
  }
  rasterAlsTextur(textures, 'schatten', schattenBild());
  rasterAlsTextur(textures, 'chef', chefBild());
}

export function registriereFiguren(textures: Phaser.Textures.TextureManager): void {
  for (const d of RICHTUNGEN) {
    rasterAlsTextur(textures, figurSchluessel(d, 0, false), figurBild(d, 0, false));
    for (let s = 0; s < SPIELER_SCHRITTE; s++) rasterAlsTextur(textures, figurSchluessel(d, s, true), figurBild(d, s, true));
    for (const id of NPC_IDS) {
      rasterAlsTextur(textures, npcSchluessel(id, d, 0, false), npcBild(id, d, 0, false));
      for (let s = 0; s < NPC_SCHRITTE; s++) rasterAlsTextur(textures, npcSchluessel(id, d, s, true), npcBild(id, d, s, true));
    }
  }
}
