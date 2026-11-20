// Tests der Moebel und des Dekors als Pixelraster (src/grafik/moebel.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE } from '../src/config.ts';
import { ablageMarkierung, maschineRaster, pflanzeRaster, schildRaster, sturzRaster, tischRaster, TISCH_VARIANTEN, STURZ_VON } from '../src/grafik/moebel.ts';
import { gleich, gefuelltAnzahl, DURCHSICHTIG } from '../src/grafik/raster.ts';
import { hatFarbe, pruefeSprite } from './grafik-hilfe.ts';

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-009a): M1a moebel.ts:68; M1b moebel.ts:76; M1c moebel.ts:81; M2a moebel.ts:77; M2b
// moebel.ts:81; M2c moebel.ts:62; M3a moebel.ts:18; M3b moebel.ts:100; M4a moebel.ts:20; M4b moebel.ts:23; M5a
// moebel.ts:26; M5b moebel.ts:15; M6a moebel.ts:174; M6b moebel.ts:178; M7a block.ts:57; M7b moebel.ts:197; M7c
// moebel.ts:189
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
  it('Türsturz: Sprite mit Umriss; unterhalb von 40 Bildschirmpunkten (Höhe 20 Rasterzeilen) bleibt der Durchgang frei', () => {
    const r = sturzRaster(28, PALETTE.wandKopf, () => false);
    assert.deepEqual(pruefeSprite(r), []);
    // Die untersten Zeilen (Durchgang) enthalten keinen Punkt: Seitenflaechen beginnen erst ab Hoehe STURZ_VON.
    const unten = r.punkte.slice((r.hoehe - 8) * r.breite);
    assert.equal(unten.filter((f) => f !== DURCHSICHTIG).length, 0);
    assert.ok(STURZ_VON * 2 >= 40);
    assert.ok(gefuelltAnzahl(r) > 0);
  });
});
