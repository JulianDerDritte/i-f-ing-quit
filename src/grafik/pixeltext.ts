// Szenen-Helfer der Oberflaeche (nutzt Phaser, nicht in Node getestet): Pixeltext, Rechtecke zeichnen, Texturen tauschen.
// Die Raster und Rechtecke selbst kommen aus schrift.ts und ui.ts (rein, getestet).
import Phaser from 'phaser';
import { rasterAlsTextur } from './texturen.ts';
import { textRaster, umbrechen } from './schrift.ts';
import { KNOPF_STILE } from '../config.ts';
import type { KnopfArt } from '../config.ts';
import { knopfRechtecke } from './ui.ts';
import type { KnopfZustand } from './ui.ts';
import type { Raster } from './raster.ts';
import type { FarbRechteck } from './ui.ts';

let zaehler = 0;
const belegt = new Set<string>();

// Legt eine neue Textur fuer das Raster an (Nearest) und entfernt die alte, falls angegeben; liefert den Schluessel.
export function neueTextur(textures: Phaser.Textures.TextureManager, raster: Raster, alt: string | null): string {
  const schluessel = `pt-${++zaehler}`;
  rasterAlsTextur(textures, schluessel, raster);
  belegt.add(schluessel);
  if (alt !== null && belegt.delete(alt)) textures.remove(alt);
  return schluessel;
}

// Beim Ende einer Szene alle dynamischen Texturen (Texte, Plakette) wieder freigeben.
export function pixelTexteAufraeumen(textures: Phaser.Textures.TextureManager): void {
  for (const k of belegt) if (textures.exists(k)) textures.remove(k);
  belegt.clear();
}

export function zeichneRechtecke(g: Phaser.GameObjects.Graphics, rechtecke: readonly FarbRechteck[]): void {
  g.clear();
  for (const r of rechtecke) {
    g.fillStyle(r.farbe, 1);
    g.fillRect(r.x, r.y, r.b, r.h);
  }
}

export interface PixelOptionen {
  skala: number;
  farbe: number;
  rand?: number | null; // Randfarbe (ein Rasterpunkt breit) oder keiner
  ox?: number; // Ursprung 0 links/oben, 0.5 Mitte, 1 rechts/unten
  oy?: number;
  umbruch?: number; // Umbruch bei dieser Breite in Bildschirmpunkten
  vorschub?: number; // Abstand der Zeichen in Rasterpunkten (Standard 6, eng 5)
}

export class PixelText {
  private readonly scene: Phaser.Scene;
  private readonly opt: PixelOptionen;
  private readonly bild: Phaser.GameObjects.Image;
  private text: string;
  private farbe: number;
  private schluessel: string;
  private x: number;
  private y: number;
  private ox: number;
  private oy: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opt: PixelOptionen) {
    this.scene = scene;
    this.opt = opt;
    this.text = text;
    this.farbe = opt.farbe;
    this.x = x;
    this.y = y;
    this.ox = opt.ox ?? 0;
    this.oy = opt.oy ?? 0;
    this.schluessel = neueTextur(scene.textures, this.raster(), null);
    this.bild = scene.add.image(x, y, this.schluessel).setScale(opt.skala).setOrigin(this.ox, this.oy);
    this.platziere();
  }

  private raster(): Raster {
    const t = this.opt.umbruch === undefined ? this.text : umbrechen(this.text, this.opt.umbruch, this.opt.skala);
    return textRaster(t, this.farbe, this.opt.rand ?? null, this.opt.vorschub);
  }

  private platziere(): void {
    const pad = (this.opt.rand ?? null) === null ? 0 : this.opt.skala;
    this.bild.setPosition(this.x - pad * (1 - 2 * this.ox), this.y - pad * (1 - 2 * this.oy));
  }

  private neuZeichnen(): void {
    this.schluessel = neueTextur(this.scene.textures, this.raster(), this.schluessel);
    this.bild.setTexture(this.schluessel);
  }

  setText(text: string): this {
    if (text === this.text) return this;
    this.text = text;
    this.neuZeichnen();
    return this;
  }

  setColor(farbe: number): this {
    if (farbe === this.farbe) return this;
    this.farbe = farbe;
    this.neuZeichnen();
    return this;
  }

  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    this.platziere();
    return this;
  }

  setOrigin(ox: number, oy: number): this {
    this.ox = ox;
    this.oy = oy;
    this.bild.setOrigin(ox, oy);
    this.platziere();
    return this;
  }

  setVisible(sichtbar: boolean): this {
    this.bild.setVisible(sichtbar);
    return this;
  }

  setDepth(tiefe: number): this {
    this.bild.setDepth(tiefe);
    return this;
  }

  setScrollFactor(f: number): this {
    this.bild.setScrollFactor(f);
    return this;
  }
}

// ---------------------------------------------------------------- Knopf im Pixelstil
export interface KnopfTeil {
  feld: Phaser.GameObjects.Rectangle; // unsichtbare Klickflaeche (genau das Rechteck x, y, b, h wie bisher)
  grafik: Phaser.GameObjects.Graphics;
  text: PixelText;
  art: KnopfArt;
  x: number;
  y: number;
  b: number;
  h: number;
  zustand: KnopfZustand;
  zeichne: () => void;
  setzeOrt: (x: number, y: number) => void;
}

// Baut einen Knopf: Flaeche aus Rechtecken (Zustand normal, Hover, gedrueckt), Beschriftung in Pixelschrift, Klickflaeche.
// Gezeichnet wird nur bei Zustandswechsel oder Umzug (Ereignisse), nicht in jedem Bild.
export function knopfBauen(
  scene: Phaser.Scene,
  x: number,
  y: number,
  b: number,
  h: number,
  art: KnopfArt,
  beschriftung: string,
  skala: number,
  tiefe: number,
  aktion: () => void,
  einzug: number | null = null, // null: Text mittig, sonst linksbuendig mit diesem Abstand
  vorschub?: number,
): KnopfTeil {
  const grafik = scene.add.graphics().setScrollFactor(0).setDepth(tiefe);
  const text = new PixelText(scene, 0, 0, beschriftung, { skala, farbe: KNOPF_STILE[art].text, ox: einzug === null ? 0.5 : 0, oy: 0.5, vorschub }).setScrollFactor(0).setDepth(tiefe + 1);
  const feld = scene.add.rectangle(x + b / 2, y + h / 2, b, h, 0x000000, 0).setScrollFactor(0).setDepth(tiefe + 2).setInteractive({ useHandCursor: true });
  const k: KnopfTeil = {
    feld,
    grafik,
    text,
    art,
    x,
    y,
    b,
    h,
    zustand: 'normal',
    zeichne: () => {
      zeichneRechtecke(grafik, knopfRechtecke(k.x, k.y, k.b, k.h, art, k.zustand));
      text.setPosition(einzug === null ? k.x + k.b / 2 : k.x + einzug, k.y + k.h / 2);
    },
    setzeOrt: (nx, ny) => {
      k.x = nx;
      k.y = ny;
      feld.setPosition(nx + k.b / 2, ny + k.h / 2);
      k.zustand = 'normal';
      k.zeichne();
    },
  };
  k.zeichne();
  feld.on('pointerover', () => {
    k.zustand = 'hover';
    k.zeichne();
  });
  feld.on('pointerout', () => {
    k.zustand = 'normal';
    k.zeichne();
  });
  feld.on('pointerup', () => {
    k.zustand = 'hover';
    k.zeichne();
  });
  feld.on('pointerdown', () => {
    k.zustand = 'gedrueckt';
    k.zeichne();
    aktion();
  });
  return k;
}
