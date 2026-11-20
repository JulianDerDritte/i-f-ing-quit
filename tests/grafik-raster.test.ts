// Tests der Raster-Grundlagen (src/grafik/raster.ts, palette.ts, PALETTE in config.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE } from '../src/config.ts';
import { kontrastverhaeltnis, leuchtdichte } from '../src/grafik/palette.ts';
import { DURCHSICHTIG, gleich, mitUmriss, neuesRaster, randOhneUmriss, rasterAusZeilen, spiegeln, unterschiedsAnteil } from '../src/grafik/raster.ts';
import { pruefeSprite } from './grafik-hilfe.ts';

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-009a): R1 raster.ts:22; R2a raster.ts:24; R2b raster.ts:19; R3a raster.ts:48; R3b
// raster.ts:48; R4a raster.ts:84; R4b raster.ts:77; R5 raster.ts:104; R6a grafik-hilfe.ts:11; R6b grafik-hilfe.ts:14;
// R7 raster.ts:122; R8 config.ts:262; R9 config.ts:262; R10a palette.ts:22; R10b palette.ts:22
describe('Raster', () => {
  it('rasterAusZeilen: Zeichen werden Palettenfarben, "." ist durchsichtig', () => {
    const r = rasterAusZeilen(['A.', '.B'], { A: 0x112233, B: 0x445566 });
    assert.deepEqual([...r.punkte], [0x112233, DURCHSICHTIG, DURCHSICHTIG, 0x445566]);
  });
  it('rasterAusZeilen: unbekanntes Zeichen und ungleiche Zeilenlänge sind Fehler', () => {
    assert.throws(() => rasterAusZeilen(['AX'], { A: 1 }), /keine Farbe/);
    assert.throws(() => rasterAusZeilen(['AA', 'A'], { A: 1 }), /statt 2 Zeichen/);
  });
  it('spiegeln: zweimal gespiegelt ergibt das Original, einmal gespiegelt nicht', () => {
    const r = rasterAusZeilen(['AB.', 'A..'], { A: 1, B: 2 });
    assert.ok(gleich(spiegeln(spiegeln(r)), r));
    assert.ok(!gleich(spiegeln(r), r));
    assert.deepEqual([...spiegeln(r).punkte], [DURCHSICHTIG, 2, 1, DURCHSICHTIG, DURCHSICHTIG, 1]);
  });
  it('mitUmriss: jeder Randpunkt trägt die Umrissfarbe, das Raster wird 2 Punkte größer', () => {
    const r = mitUmriss(rasterAusZeilen(['AA', 'AA'], { A: 0xff0000 }), PALETTE.umriss);
    assert.equal(r.breite, 4);
    assert.equal(r.hoehe, 4);
    assert.deepEqual(randOhneUmriss(r, PALETTE.umriss), []);
    assert.equal(r.punkte[1 * 4 + 1], 0xff0000);
    assert.equal(r.punkte[0 * 4 + 1], PALETTE.umriss);
  });
  it('randOhneUmriss: ein Randpunkt in anderer Farbe wird gemeldet', () => {
    const r = rasterAusZeilen(['AB', 'AA'], { A: PALETTE.umriss, B: 0x00ff00 });
    assert.deepEqual(randOhneUmriss(r, PALETTE.umriss), [[1, 0]]);
  });
  it('pruefeSprite: Raster mit Umrissrand ist zulässig, ein einzelner schwarzer Punkt wird abgewiesen', () => {
    const zeilen = Array.from({ length: 8 }, () => 'AAAAAAAB');
    const gut = mitUmriss(rasterAusZeilen(zeilen, { A: 0xcc2222, B: 0x2222cc }), PALETTE.umriss);
    assert.deepEqual(pruefeSprite(gut), []);
    const punkt = neuesRaster(10, 10);
    punkt.punkte[55] = PALETTE.umriss;
    assert.ok(pruefeSprite(punkt).length >= 2, pruefeSprite(punkt).join('; '));
  });
  it('unterschiedsAnteil: gleiche Raster 0, ganz verschiedene 1, Nenner ist die Vereinigung der gefüllten Punkte', () => {
    const a = rasterAusZeilen(['AA..'], { A: 1, B: 2 });
    const b = rasterAusZeilen(['AB..'], { A: 1, B: 2 });
    const c = rasterAusZeilen(['..BB'], { A: 1, B: 2 });
    assert.equal(unterschiedsAnteil(a, a), 0);
    assert.equal(unterschiedsAnteil(a, b), 0.5);
    assert.equal(unterschiedsAnteil(a, c), 1);
  });
});

describe('Palette', () => {
  it('PALETTE: jeder Wert ist eine ganze Farbzahl von 0 bis 0xffffff', () => {
    for (const [name, wert] of Object.entries(PALETTE)) assert.ok(Number.isInteger(wert) && wert >= 0 && wert <= 0xffffff, `${name}: ${wert}`);
  });
  it('PALETTE.umriss ist fast schwarz (Leuchtdichte unter 0,02)', () => {
    assert.ok(leuchtdichte(PALETTE.umriss) < 0.02, String(leuchtdichte(PALETTE.umriss)));
  });
  it('kontrastverhaeltnis: Weiß auf Schwarz 21, gleiche Farbe 1', () => {
    assert.ok(Math.abs(kontrastverhaeltnis(0xffffff, 0x000000) - 21) < 1e-9);
    assert.equal(kontrastverhaeltnis(0x335577, 0x335577), 1);
  });
});
