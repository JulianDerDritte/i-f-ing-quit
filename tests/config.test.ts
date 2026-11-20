// Konsistenz der Spielwerte in src/config.ts (Bereiche, Ganzzahligkeit von Farben und Massen).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/config.ts';

const zahlen = (o: Record<string, unknown>): [string, number][] =>
  Object.entries(o).filter((e): e is [string, number] => typeof e[1] === 'number');

// Rotprobe: rot am 20.11.2026 gegen Dialogkosten Teamleitung ausserhalb 3 bis 8 (src/config.ts:31), grün gegen c55cfbd, rot mit Timer schwer unter der Warnschwelle (src/config.ts:7), wieder grün
describe('Zeitwerte', () => {
  it('jede NPC_DIALOG_KOSTEN liegt in DIALOG_SEKUNDEN', () => {
    for (const [id, k] of Object.entries(c.NPC_DIALOG_KOSTEN)) {
      assert.ok(Number.isInteger(k) && k >= c.DIALOG_SEKUNDEN.min && k <= c.DIALOG_SEKUNDEN.max, `${id}: ${k}`);
    }
  });
  it('jede NACHFRAGE_KOSTEN liegt in NACHFRAGE_SEKUNDEN', () => {
    for (const [id, k] of Object.entries(c.NACHFRAGE_KOSTEN)) {
      assert.ok(Number.isInteger(k) && k >= c.NACHFRAGE_SEKUNDEN.min && k <= c.NACHFRAGE_SEKUNDEN.max, `${id}: ${k}`);
    }
  });
  it('Kosten gibt es genau fuer die NPC-Ids', () => {
    assert.deepEqual(Object.keys(c.NPC_DIALOG_KOSTEN).sort(), [...c.NPC_IDS].sort());
    assert.deepEqual(Object.keys(c.NACHFRAGE_KOSTEN).sort(), [...c.NPC_IDS].sort());
  });
  it('alle TIMER_SEKUNDEN sind groesser als TIMER_WARNUNG_SEKUNDEN', () => {
    for (const stufe of c.STUFEN) assert.ok(c.TIMER_SEKUNDEN[stufe] > c.TIMER_WARNUNG_SEKUNDEN, stufe);
  });
  it('die Bereiche sind geordnet (min kleiner max)', () => {
    assert.ok(c.DIALOG_SEKUNDEN.min < c.DIALOG_SEKUNDEN.max);
    assert.ok(c.NACHFRAGE_SEKUNDEN.min < c.NACHFRAGE_SEKUNDEN.max);
  });
  it('KAFFEE_NEHMEN_SEKUNDEN ist eine positive ganze Zahl', () => {
    assert.ok(Number.isInteger(c.KAFFEE_NEHMEN_SEKUNDEN) && c.KAFFEE_NEHMEN_SEKUNDEN > 0);
  });
});

// Rotprobe: rot am 20.11.2026 gegen Wandfarbe ueber 0xffffff (src/config.ts:257), grün gegen c55cfbd, rot mit Wandfarbe nicht ganzzahlig (src/config.ts:257), wieder grün
describe('Farben', () => {
  const alsZahl: [string, number][] = [
    ...zahlen(c.NPC_FARBEN),
    ...zahlen(c.BODENFARBEN),
    ['WAND_FARBE', c.WAND_FARBE],
    ['TISCH_FARBE', c.TISCH_FARBE],
    ['ABLAGE_FARBE', c.ABLAGE_FARBE],
    ['START_FARBE', c.START_FARBE],
    ['FIGUR_FARBE', c.FIGUR_FARBE],
    ['MASCHINE_FARBE', c.MASCHINE_FARBE],
    ['DIALOG_FENSTER_FARBE', c.DIALOG_FENSTER_FARBE],
    ['DIALOG_RAHMEN_FARBE', c.DIALOG_RAHMEN_FARBE],
    ['DIALOG_KNOPF_FARBE', c.DIALOG_KNOPF_FARBE],
    ['DIALOG_KNOPF_HOVER_FARBE', c.DIALOG_KNOPF_HOVER_FARBE],
    ['INVENTAR_FENSTER_FARBE', c.INVENTAR_FENSTER_FARBE],
    ['KAFFEE_HUD.symbolFarbe', c.KAFFEE_HUD.symbolFarbe],
    ['MENUE_SPEICHER.knopfFarbe', c.MENUE_SPEICHER.knopfFarbe],
    ['MENUE_SPEICHER.knopfHoverFarbe', c.MENUE_SPEICHER.knopfHoverFarbe],
  ];
  for (const [name, wert] of alsZahl) {
    it(`${name} ist eine ganze Zahl von 0 bis 0xffffff`, () => {
      assert.ok(Number.isInteger(wert) && wert >= 0 && wert <= 0xffffff, String(wert));
    });
  }
  const alsText: [string, string][] = [
    ['HUD_FARBE_NORMAL', c.HUD_FARBE_NORMAL],
    ['HUD_FARBE_WARNUNG', c.HUD_FARBE_WARNUNG],
    ['DIALOG_NAME_FARBE', c.DIALOG_NAME_FARBE],
    ['DIALOG_KOSTEN_FARBE', c.DIALOG_KOSTEN_FARBE],
    ['VERSCHUETTET_MELDUNG.farbe', c.VERSCHUETTET_MELDUNG.farbe],
    ['INVENTAR_TITEL_FARBE', c.INVENTAR_TITEL_FARBE],
  ];
  for (const [name, wert] of alsText) {
    it(`${name} ist eine Farbe der Form #rrggbb`, () => {
      assert.match(wert, /^#[0-9a-f]{6}$/i);
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen Kachelbreite nicht ganzzahlig (src/config.ts:94), grün gegen c55cfbd, rot mit Kachelbreite negativ (src/config.ts:94), wieder grün
describe('Masse (Bildpunkte)', () => {
  const gruppen: [string, Record<string, unknown>][] = [
    ['DIALOG_LAYOUT', c.DIALOG_LAYOUT],
    ['INVENTAR_LAYOUT', c.INVENTAR_LAYOUT],
    ['INVENTAR_KNOPF', c.INVENTAR_KNOPF],
    ['KAFFEE_HUD (ohne Farbe)', Object.fromEntries(Object.entries(c.KAFFEE_HUD).filter(([k]) => k !== 'symbolFarbe'))],
    ['MENUE_SPEICHER (ohne Farben)', Object.fromEntries(Object.entries(c.MENUE_SPEICHER).filter(([k]) => !k.endsWith('Farbe')))],
  ];
  for (const [name, g] of gruppen) {
    it(`${name}: alle Werte ganzzahlig und nicht negativ`, () => {
      for (const [k, v] of zahlen(g)) assert.ok(Number.isInteger(v) && v >= 0, `${k}: ${v}`);
    });
  }
  const einzeln: [string, number][] = [
    ['KACHEL_BREITE', c.KACHEL_BREITE],
    ['KACHEL_HOEHE', c.KACHEL_HOEHE],
    ['WAND_HOEHE', c.WAND_HOEHE],
    ['TISCH_HOEHE', c.TISCH_HOEHE],
    ['MASCHINE_HOEHE', c.MASCHINE_HOEHE],
    ['DIALOG_TIEFE', c.DIALOG_TIEFE],
    ['HUD_TIEFE', c.HUD_TIEFE],
    ['INVENTAR_TIEFE', c.INVENTAR_TIEFE],
    ['DIALOG_MAX_ANTWORTEN', c.DIALOG_MAX_ANTWORTEN],
  ];
  for (const [name, wert] of einzeln) {
    it(`${name} ist ganzzahlig und nicht negativ`, () => {
      assert.ok(Number.isInteger(wert) && wert >= 0, String(wert));
    });
  }
  const schriften: [string, number][] = [
    ['NPC_SCHRIFT_PX', c.NPC_SCHRIFT_PX],
    ['DIALOG_NAME_SCHRIFT_PX', c.DIALOG_NAME_SCHRIFT_PX],
    ['DIALOG_TEXT_SCHRIFT_PX', c.DIALOG_TEXT_SCHRIFT_PX],
    ['DIALOG_KOSTEN_SCHRIFT_PX', c.DIALOG_KOSTEN_SCHRIFT_PX],
    ['DIALOG_ANTWORT_SCHRIFT_PX', c.DIALOG_ANTWORT_SCHRIFT_PX],
    ['HUD_SCHRIFT_PX', c.HUD_SCHRIFT_PX],
    ['HINWEIS_SCHRIFT_PX', c.HINWEIS_SCHRIFT_PX],
    ['MELDUNG_SCHRIFT_PX', c.MELDUNG_SCHRIFT_PX],
    ['MASCHINE_SCHRIFT_PX', c.MASCHINE_SCHRIFT_PX],
    ['INVENTAR_SCHRIFT_PX', c.INVENTAR_SCHRIFT_PX],
  ];
  for (const [name, wert] of schriften) {
    it(`${name} ist eine ganze Zahl von mindestens 12`, () => {
      assert.ok(Number.isInteger(wert) && wert >= 12, String(wert));
    });
  }
});
