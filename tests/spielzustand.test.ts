// Tests der Timer-Logik (src/spielzustand.ts). Laufen mit `npm test` (node:test), ohne Phaser.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ABLEGE_REICHWEITE, TIMER_SEKUNDEN } from '../src/config.ts';
import { KARTE } from '../src/karte.ts';
import {
  ablegen,
  abziehen,
  dialogBeenden,
  fortschreiben,
  istWarnung,
  nachfrageAbziehen,
  nahAnAblage,
  neuerZustand,
  startzeit,
  zeitAufgerundet,
} from '../src/spielzustand.ts';
import type { Phase, Spielzustand } from '../src/spielzustand.ts';

const AUSSER_LAEUFT: Phase[] = ['dialog', 'sieg', 'niederlage', 'inventar'];
const ax = KARTE.ablage[0] + 0.5;
const ay = KARTE.ablage[1] + 0.5;

describe('neuerZustand', () => {
  it('startet in Phase laeuft mit der Startzeit', () => {
    assert.deepEqual(neuerZustand(90), { phase: 'laeuft', rest: 90 });
  });
});

// Rotprobe: rot am 20.11.2026 gegen Toleranz REST_EPS entfernt (src/spielzustand.ts:25), grün gegen c55cfbd, rot mit Niederlage schon unter 1 s (src/spielzustand.ts:25), wieder grün
describe('fortschreiben: Rest und Niederlage', () => {
  it('Rest 25, dt 1 -> Rest 24 und laeuft', () => {
    assert.deepEqual(fortschreiben({ phase: 'laeuft', rest: 25 }, 1), { phase: 'laeuft', rest: 24 });
  });
  it('Rest 1, dt 1 -> niederlage mit Rest 0', () => {
    assert.deepEqual(fortschreiben({ phase: 'laeuft', rest: 1 }, 1), { phase: 'niederlage', rest: 0 });
  });
  it('Rest 600 minus 599,9 minus 0,1 (zwei Schritte, Gleitkommarest) -> niederlage mit Rest 0', () => {
    const z1 = fortschreiben({ phase: 'laeuft', rest: 600 }, 599.9);
    assert.equal(z1.phase, 'laeuft');
    assert.deepEqual(fortschreiben(z1, 0.1), { phase: 'niederlage', rest: 0 });
  });
  it('Rest 0,1, dt 0,05 -> laeuft mit Rest 0,05', () => {
    const z = fortschreiben({ phase: 'laeuft', rest: 0.1 }, 0.05);
    assert.equal(z.phase, 'laeuft');
    assert.ok(Math.abs(z.rest - 0.05) < 1e-12);
  });
  it('Rest 5, dt 10 -> niederlage mit Rest 0 (nie negativ)', () => {
    assert.deepEqual(fortschreiben({ phase: 'laeuft', rest: 5 }, 10), { phase: 'niederlage', rest: 0 });
  });
});

// Rotprobe: rot am 20.11.2026 gegen Phasensperre nur fuer sieg und niederlage (src/spielzustand.ts:23), grün gegen c55cfbd, rot mit Timer laeuft in Phase inventar weiter (src/spielzustand.ts:23), wieder grün
describe('fortschreiben: ausserhalb von laeuft unveraendert', () => {
  for (const phase of AUSSER_LAEUFT) {
    it(`Phase ${phase}: Zustand unveraendert`, () => {
      const z: Spielzustand = { phase, rest: 12 };
      assert.deepEqual(fortschreiben(z, 5), { phase, rest: 12 });
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen Kosten werden nicht abgezogen (src/spielzustand.ts:35), grün gegen c55cfbd, rot mit keine Niederlage bei Rest 0 (src/spielzustand.ts:34), wieder grün
describe('abziehen (Gespraechsbeginn)', () => {
  it('Rest 30, Kosten 5 -> Rest 25 und dialog', () => {
    assert.deepEqual(abziehen({ phase: 'laeuft', rest: 30 }, 5), { phase: 'dialog', rest: 25 });
  });
  it('Rest 5, Kosten 5 -> niederlage mit Rest 0', () => {
    assert.deepEqual(abziehen({ phase: 'laeuft', rest: 5 }, 5), { phase: 'niederlage', rest: 0 });
  });
  it('Rest 5,1, Kosten 5 -> Rest 0,1 und dialog', () => {
    const z = abziehen({ phase: 'laeuft', rest: 5.1 }, 5);
    assert.equal(z.phase, 'dialog');
    assert.ok(Math.abs(z.rest - 0.1) < 1e-9);
  });
  for (const phase of AUSSER_LAEUFT) {
    it(`Phase ${phase}: unveraendert`, () => {
      assert.deepEqual(abziehen({ phase, rest: 30 }, 5), { phase, rest: 30 });
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen Phasensperre nur fuer sieg (src/spielzustand.ts:41), grün gegen c55cfbd, rot mit keine Niederlage bei Rest 0 (src/spielzustand.ts:43), wieder grün
describe('nachfrageAbziehen', () => {
  it('in dialog: Rest 30, Kosten 3 -> Rest 27 und dialog', () => {
    assert.deepEqual(nachfrageAbziehen({ phase: 'dialog', rest: 30 }, 3), { phase: 'dialog', rest: 27 });
  });
  it('in dialog: Rest 3, Kosten 3 -> niederlage mit Rest 0', () => {
    assert.deepEqual(nachfrageAbziehen({ phase: 'dialog', rest: 3 }, 3), { phase: 'niederlage', rest: 0 });
  });
  it('in dialog: Rest 3,1, Kosten 3 -> Rest 0,1 und dialog', () => {
    const z = nachfrageAbziehen({ phase: 'dialog', rest: 3.1 }, 3);
    assert.equal(z.phase, 'dialog');
    assert.ok(Math.abs(z.rest - 0.1) < 1e-9);
  });
  for (const phase of ['laeuft', 'sieg', 'niederlage', 'inventar'] as Phase[]) {
    it(`Phase ${phase}: unveraendert`, () => {
      assert.deepEqual(nachfrageAbziehen({ phase, rest: 30 }, 3), { phase, rest: 30 });
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen Rest nach dem Gespraech 0 (src/spielzustand.ts:50), grün gegen c55cfbd, rot mit Phasensperre nur fuer sieg (src/spielzustand.ts:49), wieder grün
describe('dialogBeenden', () => {
  it('dialog -> laeuft mit gleichem Rest', () => {
    assert.deepEqual(dialogBeenden({ phase: 'dialog', rest: 17.5 }), { phase: 'laeuft', rest: 17.5 });
  });
  for (const phase of ['laeuft', 'sieg', 'niederlage', 'inventar'] as Phase[]) {
    it(`Phase ${phase}: unveraendert`, () => {
      assert.deepEqual(dialogBeenden({ phase, rest: 9 }), { phase, rest: 9 });
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen Reichweite um 0,5 zu gross (src/spielzustand.ts:80), grün gegen c55cfbd, rot mit Raumpruefung Chefbuero entfernt (src/spielzustand.ts:79), wieder grün
describe('ablegen und nahAnAblage', () => {
  it('genau an der Ablage -> sieg mit unveraendertem Rest', () => {
    assert.deepEqual(ablegen({ phase: 'laeuft', rest: 33 }, KARTE, ax, ay), { phase: 'sieg', rest: 33 });
  });
  it('Abstand genau ABLEGE_REICHWEITE -> sieg', () => {
    assert.equal(ablegen({ phase: 'laeuft', rest: 33 }, KARTE, ax, ay + ABLEGE_REICHWEITE).phase, 'sieg');
  });
  it('knapp zu weit (Reichweite + 0,01) -> unveraendert', () => {
    const z: Spielzustand = { phase: 'laeuft', rest: 33 };
    assert.deepEqual(ablegen(z, KARTE, ax, ay + ABLEGE_REICHWEITE + 0.01), z);
    assert.equal(nahAnAblage(KARTE, ax, ay + ABLEGE_REICHWEITE + 0.01), false);
  });
  it('anderer Raum (Ablagezelle im Grossraumbuero, Figur darauf) -> nicht nah, unveraendert', () => {
    const k = { ...KARTE, ablage: [KARTE.start[0] + 8, 5] as [number, number] }; // Grossraumbuero
    assert.equal(nahAnAblage(k, k.ablage[0] + 0.5, k.ablage[1] + 0.5), false);
    const z: Spielzustand = { phase: 'laeuft', rest: 33 };
    assert.deepEqual(ablegen(z, k, k.ablage[0] + 0.5, k.ablage[1] + 0.5), z);
  });
  for (const phase of AUSSER_LAEUFT) {
    it(`Phase ${phase} direkt an der Ablage -> unveraendert`, () => {
      assert.deepEqual(ablegen({ phase, rest: 33 }, KARTE, ax, ay), { phase, rest: 33 });
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen abgerundet statt aufgerundet (src/spielzustand.ts:92), grün gegen c55cfbd, rot mit gerundet statt aufgerundet (src/spielzustand.ts:92), wieder grün
describe('zeitAufgerundet', () => {
  const faelle: [number, string][] = [
    [25, '0:25'],
    [24.1, '0:25'],
    [0, '0:00'],
    [0.0001, '0:01'],
    [90, '1:30'],
    [-3, '0:00'],
  ];
  for (const [sek, text] of faelle) {
    it(`${sek} -> ${text}`, () => {
      assert.equal(zeitAufgerundet(sek), text);
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen Schwelle nicht eingeschlossen (src/spielzustand.ts:96), grün gegen c55cfbd, rot mit Schwelle um 5 s zu hoch (src/spielzustand.ts:96), wieder grün
describe('istWarnung', () => {
  it('Rest gleich der Schwelle -> wahr', () => {
    assert.equal(istWarnung(10, 10), true);
  });
  it('Rest knapp darueber -> falsch', () => {
    assert.equal(istWarnung(10.01, 10), false);
  });
  it('Rest darunter -> wahr', () => {
    assert.equal(istWarnung(3, 10), true);
  });
});

// Rotprobe: rot am 20.11.2026 gegen 0 als Probezeit erlaubt (src/spielzustand.ts:104), grün gegen c55cfbd, rot mit negative Probezeit erlaubt (src/spielzustand.ts:104), wieder grün
describe('startzeit', () => {
  it('?zeit=60 -> 60', () => {
    assert.equal(startzeit('leicht', '?zeit=60'), 60);
  });
  const ungueltig = ['', '?zeit=', '?zeit=0', '?zeit=-5', '?zeit=abc'];
  for (const s of ungueltig) {
    it(`"${s}" -> Wert der Stufe`, () => {
      assert.equal(startzeit('normal', s), TIMER_SEKUNDEN.normal);
    });
  }
  it('jede Stufe liefert ohne Parameter ihren Wert', () => {
    assert.equal(startzeit('leicht', ''), TIMER_SEKUNDEN.leicht);
    assert.equal(startzeit('schwer', ''), TIMER_SEKUNDEN.schwer);
  });
});
