// Schreibt Standbilder der Oberflaeche (Pixelschrift, Timer-Plakette, HUD, Gespraechsfenster mit 4 Antworten, Meldungen, Inventar)
// als PNG in einen uebergebenen Ordner (ausserhalb des Repos). Aufruf: node scripts/ui-png.ts <Ordner>
// Die Bilder entstehen aus denselben reinen Funktionen wie im Spiel (Rechtecke, Raster, Umbruch), 1 Rasterpunkt = 1 Bildpunkt.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import {
  DIALOG_ANTWORT_EINZUG,
  DIALOG_ANTWORT_SCHRIFT_PX,
  DIALOG_KOSTEN_SCHRIFT_PX,
  DIALOG_NAME_SCHRIFT_PX,
  DIALOG_TEXT_SCHRIFT_PX,
  FENSTER_STIL,
  HUD_LAYOUT,
  INVENTAR_KNOPF,
  INVENTAR_SCHRIFT_PX,
  KAFFEE_HUD,
  KNOPF_STILE,
  MELDUNG_LAYOUT,
  MENUE_LAYOUT,
  MENUE_SPEICHER,
  PALETTE,
  SPRITE_SKALA,
  STUFEN,
  STUFEN_NAMEN,
  SZENEN_TEXTE,
  TIMER_SEKUNDEN,
  zeitText,
} from '../src/config.ts';
import type { KnopfArt } from '../src/config.ts';
import { aktuellerKnoten, angeboteneAntworten, antwortBeschriftung, dialogRechtecke, kostenZeile, starteGespraech } from '../src/dialog.ts';
import { inventarRechtecke, inventarSeiten, neuesInventar } from '../src/inventar.ts';
import { VORSCHUB_ENG, ZEICHENSATZ, pixelSkala, textRaster, umbrechen, ZEILE } from '../src/grafik/schrift.ts';
import { neuesRaster, rasterAlsRgba, ueberlagern } from '../src/grafik/raster.ts';
import type { Raster } from '../src/grafik/raster.ts';
import {
  blattSymbolRaster,
  blinkAn,
  fensterRechtecke,
  hudRechtecke,
  knopfRechtecke,
  menueHintergrund,
  plaketteRaster,
  plaketteRechtecke,
  stoppuhrRaster,
  stufenZeile,
  tasseRaster,
  zeitZiffern,
} from '../src/grafik/ui.ts';
import type { FarbRechteck } from '../src/grafik/ui.ts';

const ordner = process.argv[2];
if (ordner === undefined) throw new Error('Aufruf: node scripts/ui-png.ts <Ordner>');
mkdirSync(ordner, { recursive: true });

function chunk(typ: string, daten: Buffer): Buffer {
  const kopf = Buffer.alloc(8);
  kopf.writeUInt32BE(daten.length, 0);
  kopf.write(typ, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(typ, 'ascii'), daten])) >>> 0, 0);
  return Buffer.concat([kopf, daten, crc]);
}
function png(r: Raster): Buffer {
  const rgba = rasterAlsRgbaKopie(r);
  const zeilen = Buffer.alloc((r.breite * 4 + 1) * r.hoehe);
  for (let y = 0; y < r.hoehe; y++) {
    zeilen[y * (r.breite * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * r.breite * 4, r.breite * 4).copy(zeilen, y * (r.breite * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(r.breite, 0);
  ihdr.writeUInt32BE(r.hoehe, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(zeilen)), chunk('IEND', Buffer.alloc(0))]);
}
function rasterAlsRgbaKopie(r: Raster): Uint8ClampedArray {
  return rasterAlsRgba(r);
}
const schreibe = (name: string, r: Raster): void => {
  writeFileSync(path.join(ordner, name), png(r));
  console.log(`${name}: ${r.breite}x${r.hoehe} Punkte`);
};

// Zeichenhilfen auf einem Raster in Bildpunkten
function flaeche(b: number, h: number, farbe: number): Raster {
  const r = neuesRaster(b, h);
  r.punkte.fill(farbe);
  return r;
}
function skaliert(r: Raster, s: number): Raster {
  const z = neuesRaster(r.breite * s, r.hoehe * s);
  for (let y = 0; y < z.hoehe; y++) for (let x = 0; x < z.breite; x++) z.punkte[y * z.breite + x] = r.punkte[Math.floor(y / s) * r.breite + Math.floor(x / s)];
  return z;
}
function rechtecke(bild: Raster, liste: readonly FarbRechteck[]): void {
  for (const q of liste) for (let y = q.y; y < q.y + q.h; y++) for (let x = q.x; x < q.x + q.b; x++) if (x >= 0 && y >= 0 && x < bild.breite && y < bild.hoehe) bild.punkte[y * bild.breite + x] = q.farbe;
}
function text(bild: Raster, t: string, x: number, y: number, skala: number, farbe: number, rand: number | null, ox = 0, oy = 0, umbruch?: number, vorschub?: number): void {
  const s = umbruch === undefined ? t : umbrechen(t, umbruch, skala);
  const r = skaliert(textRaster(s, farbe, rand, vorschub), skala);
  const pad = rand === null ? 0 : skala;
  ueberlagern(bild, r, Math.round(x - pad - ox * (r.breite - 2 * pad)), Math.round(y - pad - oy * (r.hoehe - 2 * pad)), true);
}
function knopf(bild: Raster, x: number, y: number, b: number, h: number, art: KnopfArt, zustand: 'normal' | 'hover' | 'gedrueckt', beschriftung: string, skala: number, einzug: number | null = null, vorschub?: number): void {
  rechtecke(bild, knopfRechtecke(x, y, b, h, art, zustand));
  const tx = einzug === null ? x + b / 2 : x + einzug;
  text(bild, beschriftung, tx, y + h / 2, skala, KNOPF_STILE[art].text, null, einzug === null ? 0.5 : 0, 0.5, undefined, vorschub);
}
function hintergrundWelt(): Raster {
  const bild = flaeche(800, 640, 0x4a5cc8);
  for (let y = 0; y < 640; y++) for (let x = 0; x < 800; x++) if ((Math.floor(x / 64) + Math.floor(y / 32)) % 2 === 0) bild.punkte[y * 800 + x] = 0x6474c8;
  return bild;
}

// 1. Zeichensatz
{
  const zeilen: string[] = [];
  const alle = [...ZEICHENSATZ].filter((c) => c !== ' ');
  for (let i = 0; i < alle.length; i += 26) zeilen.push(alle.slice(i, i + 26).join(''));
  const bild = flaeche(26 * 6 * 3 + 24, zeilen.length * ZEILE * 3 + 24, FENSTER_STIL.flaeche);
  zeilen.forEach((z, i) => text(bild, z, 12, 12 + i * ZEILE * 3, 3, 0xffffff, null));
  schreibe('ui-zeichensatz.png', bild);
}

// 2. HUD mit Plakette (Restzeit 9 s: Warnung, 600 s: 10:00) und Kaffee getragen
function hud(rest: number, stufe: (typeof STUFEN)[number], raum: string, mitKaffee: boolean): Raster {
  const bild = hintergrundWelt();
  const stufeText = stufenZeile(STUFEN_NAMEN[stufe], zeitText(TIMER_SEKUNDEN[stufe]));
  text(bild, `${SZENEN_TEXTE.raum}${raum}`, HUD_LAYOUT.raumX, HUD_LAYOUT.raumY, pixelSkala(HUD_LAYOUT.raumPx), 0xffffff, PALETTE.umriss);
  text(bild, stufeText, HUD_LAYOUT.stufeX, HUD_LAYOUT.stufeY, pixelSkala(HUD_LAYOUT.stufePx), 0xffffff, PALETTE.umriss, 0, 0, HUD_LAYOUT.stufeUmbruch);
  const px = (800 - HUD_LAYOUT.plaketteBreite) / 2;
  rechtecke(bild, plaketteRechtecke(px, HUD_LAYOUT.timerY, HUD_LAYOUT.plaketteBreite, HUD_LAYOUT.plaketteHoehe));
  ueberlagern(bild, skaliert(stoppuhrRaster(true), SPRITE_SKALA), px + 12, HUD_LAYOUT.timerY + HUD_LAYOUT.plaketteHoehe / 2 - 17, true);
  ueberlagern(bild, skaliert(plaketteRaster(zeitZiffern(rest), blinkAn(rest)), 4), px + 52, HUD_LAYOUT.timerY + HUD_LAYOUT.plaketteHoehe / 2 - 18, true);
  knopf(bild, 620, 10, 170, 36, 'zurueck', 'normal', SZENEN_TEXTE.zurueckMenue, pixelSkala(HUD_LAYOUT.zurueckPx), null, VORSCHUB_ENG);
  knopf(bild, INVENTAR_KNOPF.x, INVENTAR_KNOPF.y, INVENTAR_KNOPF.breite, INVENTAR_KNOPF.hoehe, 'inventar', 'hover', SZENEN_TEXTE.inventarKnopf, pixelSkala(INVENTAR_KNOPF.schriftPx));
  if (mitKaffee) {
    ueberlagern(bild, skaliert(tasseRaster(), SPRITE_SKALA), KAFFEE_HUD.symbolX, KAFFEE_HUD.symbolY, true);
    text(bild, SZENEN_TEXTE.kaffee, KAFFEE_HUD.textX, KAFFEE_HUD.textY, pixelSkala(KAFFEE_HUD.schriftPx), 0xffffff, PALETTE.umriss);
  }
  void hudRechtecke;
  return bild.hoehe > 150 ? beschneiden(bild, 800, 150) : bild;
}
function beschneiden(r: Raster, b: number, h: number): Raster {
  const z = neuesRaster(b, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < b; x++) z.punkte[y * b + x] = r.punkte[y * r.breite + x];
  return z;
}
schreibe('ui-hud-0-09.png', hud(8.4, 'leicht', 'Großraumbüro', true));
schreibe('ui-hud-0-09-hell.png', hud(8.9, 'leicht', 'Großraumbüro', true));
schreibe('ui-hud-10-00.png', hud(600, 'normal', 'Chefbüro', false));
schreibe('ui-hud-01-30.png', hud(90, 'leicht', 'Vorzimmer', false));

// 3. Gespraechsfenster mit 4 Antworten (Kaffee wird getragen) und mit 3
function dialog(n: 3 | 4): Raster {
  const bild = hintergrundWelt();
  const z = starteGespraech('empfang');
  const knoten = aktuellerKnoten(z);
  if (knoten === null) throw new Error('kein Knoten');
  const angeboten = angeboteneAntworten(z, n === 4);
  const d = dialogRechtecke(angeboten.length);
  const f = d.fenster;
  const leiste = { x: f.x + 22, y: d.name.y, b: f.breite - 44, h: d.name.hoehe };
  rechtecke(bild, fensterRechtecke(f.x, f.y, f.breite, f.hoehe, FENSTER_STIL.flaeche, leiste));
  text(bild, 'Empfang', leiste.x + 8, leiste.y + (leiste.h - ZEILE * pixelSkala(DIALOG_NAME_SCHRIFT_PX)) / 2, pixelSkala(DIALOG_NAME_SCHRIFT_PX), FENSTER_STIL.leisteText, null);
  text(bild, knoten.text, d.text.x, d.text.y, pixelSkala(DIALOG_TEXT_SCHRIFT_PX), FENSTER_STIL.text, null, 0, 0, d.text.breite);
  ueberlagern(bild, skaliert(stoppuhrRaster(false), SPRITE_SKALA), d.kosten.x, d.kosten.y + 2, true);
  text(bild, kostenZeile(zeitText(3)), d.kosten.x + 26, d.kosten.y + 2, pixelSkala(DIALOG_KOSTEN_SCHRIFT_PX), FENSTER_STIL.kosten, null);
  d.knoepfe.forEach((k, i) => knopf(bild, k.x, k.y, k.breite, k.hoehe, 'antwort', i === 1 ? 'hover' : 'normal', antwortBeschriftung(z, angeboten[i].antwort), pixelSkala(DIALOG_ANTWORT_SCHRIFT_PX), DIALOG_ANTWORT_EINZUG));
  return bild;
}
schreibe('ui-dialog-4-antworten.png', dialog(4));
schreibe('ui-dialog-3-antworten.png', dialog(3));

// 4. Meldungen (Sieg und Niederlage): Schleier, Titel in Rot mit Rand, Knoepfe
function meldung(sieg: boolean): Raster {
  const bild = hintergrundWelt();
  for (let i = 0; i < bild.punkte.length; i++) {
    const f = bild.punkte[i];
    bild.punkte[i] = (Math.round(((f >> 16) & 0xff) * 0.3) << 16) | (Math.round(((f >> 8) & 0xff) * 0.3) << 8) | Math.round((f & 0xff) * 0.3);
  }
  text(bild, sieg ? SZENEN_TEXTE.sieg : SZENEN_TEXTE.niederlage, 400, 320 + MELDUNG_LAYOUT.titelDy, 6, PALETTE.krawatteRot, PALETTE.umriss, 0.5, 0.5);
  if (sieg) text(bild, `${SZENEN_TEXTE.uebrigeZeit}1:12`, 400, 320 + MELDUNG_LAYOUT.zeitDy, 3, 0xffffff, PALETTE.umriss, 0.5, 0.5);
  const b = MELDUNG_LAYOUT.knopfBreite;
  knopf(bild, 400 - MELDUNG_LAYOUT.knopfDx - b / 2, 320 + MELDUNG_LAYOUT.knopfDy - 28, b, 56, 'meldung', 'hover', sieg ? SZENEN_TEXTE.nochmal : SZENEN_TEXTE.neustart, 3);
  knopf(bild, 400 + MELDUNG_LAYOUT.knopfDx - b / 2, 320 + MELDUNG_LAYOUT.knopfDy - 28, b, 56, 'meldung', 'normal', SZENEN_TEXTE.zumMenue, 3);
  return bild;
}
schreibe('ui-meldung-sieg.png', meldung(true));
schreibe('ui-meldung-niederlage.png', meldung(false));

// 5. Inventar mit zwei Infos und Kuendigung
{
  const bild = hintergrundWelt();
  const r = inventarRechtecke();
  const inv = neuesInventar(
    [
      { npc: 'empfang', text: 'Der Chef bleibt bis Feierabend in seinem Büro.', nachfrage: true, kaffee: false },
      { npc: 'it', text: 'Das WLAN im Chefbüro ist gut.', nachfrage: false, kaffee: false },
    ],
    true,
  );
  const leiste = { x: r.fenster.x + 22, y: r.titel.y, b: r.fenster.breite - 44, h: r.titel.hoehe };
  rechtecke(bild, fensterRechtecke(r.fenster.x, r.fenster.y, r.fenster.breite, r.fenster.hoehe, FENSTER_STIL.inventarFlaeche, leiste));
  text(bild, SZENEN_TEXTE.inventarTitel, leiste.x + 8, leiste.y + 5, 2, FENSTER_STIL.leisteText, null);
  const s = pixelSkala(INVENTAR_SCHRIFT_PX);
  text(bild, inventarSeiten(inv)[0], r.info.x, r.info.y, s, FENSTER_STIL.text, null, 0, 0, r.info.breite);
  ueberlagern(bild, skaliert(blattSymbolRaster(), SPRITE_SKALA), r.gegenstaende.x, r.gegenstaende.y + 2, true);
  text(bild, `${SZENEN_TEXTE.gegenstaende}${inv.gegenstaende.join(', ')}`, r.gegenstaende.x + 26, r.gegenstaende.y, s, FENSTER_STIL.kosten, null);
  knopf(bild, r.zurueck.x, r.zurueck.y, r.zurueck.breite, r.zurueck.hoehe, 'inventar', 'hover', SZENEN_TEXTE.zurueck, s);
  knopf(bild, r.weiter.x, r.weiter.y, r.weiter.breite, r.weiter.hoehe, 'inventar', 'normal', SZENEN_TEXTE.weiter, s);
  knopf(bild, r.schliessen.x, r.schliessen.y, r.schliessen.breite, r.schliessen.hoehe, 'inventar', 'normal', SZENEN_TEXTE.schliessen, s);
  text(bild, `${SZENEN_TEXTE.seite}1${SZENEN_TEXTE.von}1`, r.anzeige.x + r.anzeige.breite / 2, r.anzeige.y + r.anzeige.hoehe / 2, s, FENSTER_STIL.text, null, 0.5, 0.5);
  schreibe('ui-inventar.png', bild);
}

// 6. Menue (ohne logo.png: es wird im Spiel als Bild geladen)
{
  const bild = skaliert(menueHintergrund(), SPRITE_SKALA);
  const L = MENUE_LAYOUT;
  rechtecke(bild, [{ x: 270, y: 20, b: 260, h: 240, farbe: 0x8a4a1c }]);
  text(bild, '(Logo)', 400, 140, 3, 0xffffff, PALETTE.umriss, 0.5, 0.5);
  text(bild, SZENEN_TEXTE.menueTitel, 400, L.titelY, pixelSkala(L.titelPx), 0xdfe6ff, PALETTE.umriss, 0.5, 0.5);
  STUFEN.forEach((s, i) => knopf(bild, 400 - L.knopfBreite / 2, L.stufeY0 + i * L.stufeAbstand - L.knopfHoehe / 2, L.knopfBreite, L.knopfHoehe, 'stufe', i === 1 ? 'hover' : 'normal', `${STUFEN_NAMEN[s]}  ${zeitText(TIMER_SEKUNDEN[s])}`, pixelSkala(L.schriftPx)));
  text(bild, `${SZENEN_TEXTE.menueInfos}3`, MENUE_SPEICHER.textX, MENUE_SPEICHER.y, pixelSkala(MENUE_SPEICHER.schriftPx), 0xdfe6ff, PALETTE.umriss, 0, 0.5);
  knopf(bild, MENUE_SPEICHER.knopfX - MENUE_SPEICHER.knopfBreite / 2, MENUE_SPEICHER.y - MENUE_SPEICHER.knopfHoehe / 2, MENUE_SPEICHER.knopfBreite, MENUE_SPEICHER.knopfHoehe, 'speicher', 'normal', SZENEN_TEXTE.menueLoeschen, pixelSkala(MENUE_SPEICHER.knopfSchriftPx));
  schreibe('ui-menue-komposit.png', bild);
}
