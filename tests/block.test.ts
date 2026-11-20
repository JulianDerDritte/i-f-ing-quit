// Test der Deckfläche des isometrischen Blocks (src/grafik/block.ts), A-012 E4.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { KACHEL_BREITE, KACHEL_HOEHE, SPRITE_SKALA } from '../src/config.ts';
import { BLOCK_BREITE, KACHEL_ZEILEN, blockRaster } from '../src/grafik/block.ts';
import { DURCHSICHTIG } from '../src/grafik/raster.ts';

// Rotprobe: rot gesehen am 20.11.2026 (Wirkstellen im Bericht A-012): E4 block.ts:9 (KACHEL_ZEILEN 32 gleich 31);
// block.ts:33 (Spitzenreserve entfernt: Raute 62 breit); block.ts:48 (Raute um einen Punkt verschoben)
describe('blockRaster ohne Aufbau (E4)', () => {
  const flach = blockRaster({
    hoehe: 0,
    oben: 0,
    nachbar: () => false,
    maler: { oben: () => 0x112233, links: () => 0x445566, rechts: () => 0x778899 },
    umriss: 0x000001,
    kante: 0x000002,
  });
  const gefuellt = (x: number, y: number): boolean => flach.punkte[y * flach.breite + x] !== DURCHSICHTIG;
  const zeile = (y: number): number[] => Array.from({ length: flach.breite }, (_, x) => x).filter((x) => gefuellt(x, y));

  it('E4 Deckfläche genau 64 mal 32 Rasterpunkte (Kachelmaße geteilt durch die Skala)', () => {
    assert.equal(BLOCK_BREITE, KACHEL_BREITE / SPRITE_SKALA);
    assert.equal(KACHEL_ZEILEN, KACHEL_HOEHE / SPRITE_SKALA);
    assert.equal(flach.breite, 64);
    assert.equal(flach.hoehe, 32);
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (let y = 0; y < flach.hoehe; y++) for (let x = 0; x < flach.breite; x++) if (gefuellt(x, y)) { xs.add(x); ys.add(y); }
    assert.equal(Math.min(...xs), 0);
    assert.equal(Math.max(...xs), 63);
    assert.equal(Math.min(...ys), 0);
    assert.equal(Math.max(...ys), 31);
  });
  it('E4 die Raute ist symmetrisch zur Mittelspalte und die Unterkante ist die Spitze (gleich der Oberkante)', () => {
    for (let y = 0; y < flach.hoehe; y++) {
      for (let x = 0; x < flach.breite; x++) assert.equal(gefuellt(x, y), gefuellt(flach.breite - 1 - x, y), `Zeile ${y} Spalte ${x}`);
    }
    const oben = zeile(0);
    const unten = zeile(flach.hoehe - 1);
    assert.deepEqual(unten, oben);
    assert.ok(oben.includes(31) && oben.includes(32));
    assert.ok(oben.length <= 6, `Spitze ${oben.length} Punkte breit`);
  });
});
