// Konsistenz der Layout-Werte der Szenen, die in Stufe 7 nach src/config.ts gezogen wurden.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/config.ts';

const zahlen = (o: Record<string, unknown>): [string, number][] =>
  Object.entries(o).filter((e): e is [string, number] => typeof e[1] === 'number');

// Rotprobe: rot am 20.11.2026 gegen HUD-Abstand nicht ganzzahlig (src/config.ts:131), Zustand 2 nicht herstellbar: HUD_LAYOUT, MELDUNG_LAYOUT, MENUE_LAYOUT und die uebrigen geprueften Werte stehen erst seit dem Literal-Umzug in config.ts; Stand c55cfbd hat sie nicht, rot mit HUD-Abstand negativ (src/config.ts:131), wieder grün
// A-009a (Teil a): geändert wegen entfernter Konstanten der Rechteck-Figur (FIGUR_DARSTELLUNG ohne Körpermaße,
// BODEN_LINIE und BLOCK_TOENE weg), neu: SPRITE_KONSTANTEN und der Test "Schlüssel ist eine Zahl". Rotprobe: rot
// gesehen am 20.11.2026: L1 config.ts:121; L2 config.ts:112; L3 config.ts:113; L4 config.ts:114
describe('Layout-Werte der Szenen', () => {
  const masse: [string, Record<string, unknown>][] = [
    ['HUD_LAYOUT (ohne Farbe)', Object.fromEntries(Object.entries(c.HUD_LAYOUT).filter(([k]) => k !== 'zurueckFarbe'))],
    ['MENUE_LAYOUT (ohne Farben)', Object.fromEntries(Object.entries(c.MENUE_LAYOUT).filter(([k]) => !k.toLowerCase().endsWith('farbe')))],
    ['RAHMEN (ohne Farbe)', { staerke: c.RAHMEN.staerke }],
    ['SCHRIFT_RAND', { npc: c.SCHRIFT_RAND.npc, hud: c.SCHRIFT_RAND.hud, meldung: c.SCHRIFT_RAND.meldung, maschine: c.SCHRIFT_RAND.maschine }],
    ['SPRITE_KONSTANTEN (Skala, Lauftakt)', { skala: c.SPRITE_KONSTANTEN.skala, takt: c.SPRITE_KONSTANTEN.laufTakt }],
    ['FIGUR_DARSTELLUNG (Masse)', { kamera: c.FIGUR_DARSTELLUNG.kameraHoehe, name: c.FIGUR_DARSTELLUNG.nameHoehe }],
    ['MELDUNG_LAYOUT (ohne Abstaende mit Vorzeichen und Farben)', { tiefe: c.MELDUNG_LAYOUT.tiefe, knopfDx: c.MELDUNG_LAYOUT.knopfDx, knopfDy: c.MELDUNG_LAYOUT.knopfDy, knopfBreite: c.MELDUNG_LAYOUT.knopfBreite, knopfHoehe: c.MELDUNG_LAYOUT.knopfHoehe }],
    ['DIALOG_ANTWORT_EINZUG', { einzug: c.DIALOG_ANTWORT_EINZUG }],
  ];
  for (const [name, g] of masse) {
    it(`${name}: ganzzahlig und nicht negativ`, () => {
      for (const [k, v] of zahlen(g)) assert.ok(Number.isInteger(v) && v >= 0, `${k}: ${v}`);
    });
  }
  it('jeder in den Maßen genannte Schlüssel ist eine Zahl (zahlen() überspringt sonst Fehlendes still)', () => {
    for (const [name, g] of masse) for (const [k, v] of Object.entries(g)) assert.equal(typeof v, 'number', `${name}.${k}: ${String(v)}`);
  });
  it('Abstaende mit Vorzeichen (titelDy, zeitDy, BODEN_TIEFE) sind ganzzahlig', () => {
    assert.ok(Number.isInteger(c.MELDUNG_LAYOUT.titelDy) && Number.isInteger(c.MELDUNG_LAYOUT.zeitDy) && Number.isInteger(c.BODEN_TIEFE));
  });
  const farben: [string, number][] = [
    ['HUD_LAYOUT.zurueckFarbe', c.HUD_LAYOUT.zurueckFarbe],
    ['MELDUNG_LAYOUT.knopfFarbe', c.MELDUNG_LAYOUT.knopfFarbe],
    ['MELDUNG_LAYOUT.knopfHoverFarbe', c.MELDUNG_LAYOUT.knopfHoverFarbe],
    ['MELDUNG_LAYOUT.overlayFarbe', c.MELDUNG_LAYOUT.overlayFarbe],
    ['MENUE_LAYOUT.farbe', c.MENUE_LAYOUT.farbe],
    ['MENUE_LAYOUT.hoverFarbe', c.MENUE_LAYOUT.hoverFarbe],
    ['RAHMEN.farbe', c.RAHMEN.farbe],
    ['FIGUR_DARSTELLUNG.schattenFarbe', c.FIGUR_DARSTELLUNG.schattenFarbe],
  ];
  for (const [name, wert] of farben) {
    it(`${name} ist eine ganze Zahl von 0 bis 0xffffff`, () => {
      assert.ok(Number.isInteger(wert) && wert >= 0 && wert <= 0xffffff, String(wert));
    });
  }
  it('Faktoren liegen zwischen 0 und 2 (Toene, Alpha, Helligkeit)', () => {
    for (const v of [c.FIGUR_DARSTELLUNG.schattenAlpha]) {
      assert.ok(v > 0 && v <= 2, String(v));
    }
  });
  it('Schriftgroessen der Szenen sind ganzzahlig und mindestens 12', () => {
    for (const v of [c.HUD_LAYOUT.raumPx, c.HUD_LAYOUT.stufePx, c.HUD_LAYOUT.zurueckPx, c.MENUE_LAYOUT.titelPx, c.MENUE_LAYOUT.schriftPx]) {
      assert.ok(Number.isInteger(v) && v >= 12, String(v));
    }
  });
});
