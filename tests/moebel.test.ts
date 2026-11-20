// Tests der Moebel und des Dekors als Pixelraster (src/grafik/moebel.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, SPRITE_SKALA } from '../src/config.ts';
import { ablageMarkierung, maschineRaster, pflanzeRaster, schildRaster, sturzRaster, tischRaster, TISCH_VARIANTEN, STURZ_VON } from '../src/grafik/moebel.ts';
import { WAND_ZEILEN } from '../src/grafik/welt.ts';
import { gleich, gefuelltAnzahl, DURCHSICHTIG } from '../src/grafik/raster.ts';
import type { Raster } from '../src/grafik/raster.ts';
import { hatFarbe, pruefeSprite } from './grafik-hilfe.ts';

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-009a): M1a moebel.ts:68; M1b moebel.ts:76; M1c moebel.ts:81; M2a moebel.ts:77; M2b
// moebel.ts:81; M2c moebel.ts:62; M3a moebel.ts:18; M3b moebel.ts:100; M4a moebel.ts:20; M4b moebel.ts:23; M5a
// moebel.ts:26; M5b moebel.ts:15; M6a moebel.ts:174; M6b moebel.ts:178; M7a block.ts:57; M7b moebel.ts:197; M7c
// moebel.ts:189
// A-012 (Skala 1): Die Zeilennummern der A-009a-Wirkstellen oben sind mit dem Neubau von moebel.ts/block.ts verschoben (nicht
// neu gemessen). Neu gemessen, rot gesehen am 20.11.2026 (src/grafik/moebel.ts, Stand A-012): F-16 :35 (Tisch Skala-2-Höhe),
// F-17 :137 (Pflanze), F-18 :102 (Maschine), F-19 :230 (Sturz halbe Höhe), F-20 :198 (Schild), F-21 :174 (Ablage), H3 :222
// (STURZ_VON 20). Nachweiszeilen mit Testnamen: Bericht A-012, Abschnitt Rotproben.
describe('Möbel-Sprites', () => {
  it('Schreibtisch: jede Variante ist ein Sprite (Umriss am Rand) mit Holz, Monitor oder Papier', () => {
    for (let v = 0; v < TISCH_VARIANTEN; v++) {
      const r = tischRaster(v);
      assert.deepEqual(pruefeSprite(r), [], `Variante ${v}`);
      assert.ok(hatFarbe(r, PALETTE.holzLicht), `Holz ${v}`);
    }
    assert.ok(hatFarbe(tischRaster(0), PALETTE.monitorLicht), 'Monitor');
    assert.ok(hatFarbe(tischRaster(2), PALETTE.papierLinie), 'Papierstapel');
  });
  it('Schreibtisch: die Varianten unterscheiden sich, eine unbekannte Variante ist ein Fehler', () => {
    assert.ok(!gleich(tischRaster(0), tischRaster(1)));
    assert.ok(!gleich(tischRaster(1), tischRaster(2)));
    assert.throws(() => tischRaster(TISCH_VARIANTEN), /unbekannt/);
  });
  it('Kaffeemaschine: Sprite mit Kanne (Kaffeefarbe), Anzeige und Umriss', () => {
    const r = maschineRaster();
    assert.deepEqual(pruefeSprite(r), []);
    assert.ok(hatFarbe(r, PALETTE.kaffee) && hatFarbe(r, PALETTE.gruenLicht));
  });
  it('Pflanze: Sprite mit grünen Blättern und Topf', () => {
    const r = pflanzeRaster();
    assert.deepEqual(pruefeSprite(r), []);
    assert.ok(hatFarbe(r, PALETTE.gruen) && hatFarbe(r, PALETTE.topf));
  });
  it('Ablage-Markierung: Sprite mit Blatt und gelbem Pfeil', () => {
    const r = ablageMarkierung();
    assert.deepEqual(pruefeSprite(r), []);
    assert.ok(hatFarbe(r, PALETTE.papier) && hatFarbe(r, PALETTE.pfeil));
  });
  it('Schild: "CHEF" ist ein Sprite, ein Buchstabe außerhalb des Zeichensatzes ist ein Fehler', () => {
    const r = schildRaster('CHEF');
    assert.deepEqual(pruefeSprite(r), []);
    assert.ok(hatFarbe(r, PALETTE.schildGrau));
    assert.throws(() => schildRaster('CHEX'), /fehlt im Schild/);
  });
  // A-012 (H3): Wandhöhe jetzt WAND_ZEILEN (56 statt 28 Rasterzeilen), Durchgang unter 40 Weltpunkten (40 Rasterzeilen statt 20)
  it('Türsturz: Sprite mit Umriss; unterhalb von 40 Weltpunkten (40 Rasterzeilen) bleibt der Durchgang frei', () => {
    const r = sturzRaster(WAND_ZEILEN, PALETTE.wandKopf, () => false);
    assert.deepEqual(pruefeSprite(r), []);
    // Die untersten Zeilen (Durchgang) enthalten keinen Punkt: Seitenflaechen beginnen erst ab Hoehe STURZ_VON.
    const unten = r.punkte.slice((r.hoehe - 8) * r.breite);
    assert.equal(unten.filter((f) => f !== DURCHSICHTIG).length, 0);
    assert.ok(STURZ_VON * SPRITE_SKALA >= 40);
    assert.ok(gefuelltAnzahl(r) > 0);
  });
});

// A-012 (E3): Raster Skala 1, je Fall F-16 bis F-21 Rastermaße und mindestens 4 verschiedene Farben einschließlich Umriss.
// Rotprobe: rot gesehen am 20.11.2026 (Wirkstellen im Bericht A-012): je Sprite die Funktion auf Skala-2-Maße zurückgestellt.
const farbenZahl = (r: Raster): number => new Set([...r.punkte].filter((f) => f !== DURCHSICHTIG)).size;
describe('Möbel im Raster Skala 1 (A-012)', () => {
  it('F-16 Schreibtisch: jede Variante 64 mal 76 Rasterpunkte mit mindestens 4 Farben einschließlich Umriss (Skala 2 wäre 32 mal 38)', () => {
    for (let v = 0; v < TISCH_VARIANTEN; v++) {
      const r = tischRaster(v);
      assert.equal(r.breite, 64, `Variante ${v}`);
      assert.equal(r.hoehe, 76, `Variante ${v}`);
      assert.ok(farbenZahl(r) >= 4 && hatFarbe(r, PALETTE.umriss), `Variante ${v}`);
    }
    assert.ok(hatFarbe(tischRaster(0), PALETTE.tastatur), 'Tastatur');
    assert.ok(hatFarbe(tischRaster(2), PALETTE.kaffee), 'Becher');
  });
  it('F-17 Pflanze: 30 mal 42 Rasterpunkte, Blätter in zwei Grüntönen und Topf, mindestens 4 Farben', () => {
    const r = pflanzeRaster();
    assert.equal(r.breite, 30);
    assert.equal(r.hoehe, 42);
    assert.ok(hatFarbe(r, PALETTE.gruen) && hatFarbe(r, PALETTE.gruenLicht) && hatFarbe(r, PALETTE.gruenDunkel) && hatFarbe(r, PALETTE.topf));
    assert.ok(farbenZahl(r) >= 4 && hatFarbe(r, PALETTE.umriss));
  });
  it('F-18 Kaffeemaschine: 64 mal 82 Rasterpunkte mit Kanne, Tasse und Anzeige, mindestens 4 Farben', () => {
    const r = maschineRaster();
    assert.equal(r.breite, 64);
    assert.equal(r.hoehe, 82);
    assert.ok(hatFarbe(r, PALETTE.kaffee) && hatFarbe(r, PALETTE.weiss) && hatFarbe(r, PALETTE.gruenLicht));
    assert.ok(farbenZahl(r) >= 4 && hatFarbe(r, PALETTE.umriss));
  });
  it('F-19 Türsturz (Türrahmen mit offenem Durchgang): 64 mal 88 Rasterpunkte, Rahmenholz, mindestens 4 Farben', () => {
    const r = sturzRaster(WAND_ZEILEN, PALETTE.wandKopf, () => false);
    assert.equal(r.breite, 64);
    assert.equal(r.hoehe, 32 + WAND_ZEILEN);
    assert.ok(hatFarbe(r, PALETTE.tuerHolz) && hatFarbe(r, PALETTE.tuerHolzLicht));
    assert.ok(farbenZahl(r) >= 4 && hatFarbe(r, PALETTE.umriss));
  });
  it('F-20 Schild CHEF: 36 mal 16 Rasterpunkte mit Leiste, Schrift und Umriss, mindestens 4 Farben', () => {
    const r = schildRaster('CHEF');
    assert.equal(r.breite, 36);
    assert.equal(r.hoehe, 16);
    assert.ok(hatFarbe(r, PALETTE.schildGrau) && hatFarbe(r, PALETTE.schildLicht));
    assert.ok(farbenZahl(r) >= 4 && hatFarbe(r, PALETTE.umriss));
  });
  it('F-21 Ablagemarkierung: 26 mal 16 Rasterpunkte mit Blatt, Linien und gelbem Pfeil, mindestens 4 Farben', () => {
    const r = ablageMarkierung();
    assert.equal(r.breite, 26);
    assert.equal(r.hoehe, 16);
    assert.ok(farbenZahl(r) >= 4 && hatFarbe(r, PALETTE.umriss) && hatFarbe(r, PALETTE.pfeil));
  });
});
