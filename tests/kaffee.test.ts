// Tests von Kaffee, Maschine und Aktionstaste (src/kaffee.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ABLEGE_REICHWEITE, KAFFEE_NEHMEN_SEKUNDEN, KAFFEE_REICHWEITE } from '../src/config.ts';
import { antworte, starteGespraech } from '../src/dialog.ts';
import { KARTE } from '../src/karte.ts';
import { aktionsTaste, kaffeeNachAntwort, kaffeeNehmen, nahAnKaffee } from '../src/kaffee.ts';
import type { Phase, Spielzustand } from '../src/spielzustand.ts';

const mx = KARTE.kaffee[0] + 0.5;
const my = KARTE.kaffee[1] + 0.5;
const laeuft = (rest: number): Spielzustand => ({ phase: 'laeuft', rest });

// Rotprobe: rot am 20.11.2026 gegen Reichweite ohne Grenzwert (src/kaffee.ts:15), grün gegen c55cfbd, rot mit doppelte Reichweite (src/kaffee.ts:15), wieder grün
describe('nahAnKaffee', () => {
  it('Abstand knapp innerhalb der Reichweite (0,99) -> wahr', () => {
    assert.equal(nahAnKaffee(KARTE, mx + KAFFEE_REICHWEITE - 0.01, my), true);
  });
  it('Abstand genau KAFFEE_REICHWEITE -> wahr', () => {
    assert.equal(nahAnKaffee(KARTE, mx, my - KAFFEE_REICHWEITE), true);
  });
  it('Abstand knapp ausserhalb (1,01) -> falsch', () => {
    assert.equal(nahAnKaffee(KARTE, mx + KAFFEE_REICHWEITE + 0.01, my), false);
  });
  it('weit weg (Startzelle) -> falsch', () => {
    assert.equal(nahAnKaffee(KARTE, KARTE.start[0] + 0.5, KARTE.start[1] + 0.5), false);
  });
});

// Rotprobe: rot am 20.11.2026 gegen kein Zeitabzug beim Kaffeenehmen (src/kaffee.ts:22), grün gegen c55cfbd, rot mit Zeitabzug um 1 s zu gross (src/kaffee.ts:22), wieder grün
describe('kaffeeNehmen: Zeitabzug', () => {
  it('in Reichweite: Kaffee getragen, Rest minus KAFFEE_NEHMEN_SEKUNDEN, Phase laeuft', () => {
    const r = kaffeeNehmen(laeuft(50), false, KARTE, mx + 0.5, my);
    assert.equal(r.kaffee, true);
    assert.deepEqual(r.zustand, { phase: 'laeuft', rest: 50 - KAFFEE_NEHMEN_SEKUNDEN });
  });
  it('Rest genau gleich den Kosten -> niederlage mit Rest 0', () => {
    const r = kaffeeNehmen(laeuft(KAFFEE_NEHMEN_SEKUNDEN), false, KARTE, mx + 0.5, my);
    assert.deepEqual(r.zustand, { phase: 'niederlage', rest: 0 });
  });
  it('Rest knapp ueber den Kosten -> laeuft mit kleinem Rest und Kaffee', () => {
    const r = kaffeeNehmen(laeuft(KAFFEE_NEHMEN_SEKUNDEN + 0.1), false, KARTE, mx + 0.5, my);
    assert.equal(r.zustand.phase, 'laeuft');
    assert.ok(Math.abs(r.zustand.rest - 0.1) < 1e-9);
    assert.equal(r.kaffee, true);
  });
});

// Rotprobe: rot am 20.11.2026 gegen zweiter Druck mit Kaffee nimmt erneut (src/kaffee.ts:21), grün gegen c55cfbd, rot mit Phasenpruefung entfernt (src/kaffee.ts:21), wieder grün
describe('kaffeeNehmen: wirkungslos', () => {
  it('zweiter Druck mit Kaffee in der Hand -> nichts', () => {
    const z = laeuft(40);
    const r = kaffeeNehmen(z, true, KARTE, mx + 0.5, my);
    assert.equal(r.zustand, z);
    assert.equal(r.kaffee, true);
  });
  it('zu weit weg -> nichts', () => {
    const z = laeuft(40);
    const r = kaffeeNehmen(z, false, KARTE, mx + KAFFEE_REICHWEITE + 0.01, my);
    assert.equal(r.zustand, z);
    assert.equal(r.kaffee, false);
  });
  for (const phase of ['dialog', 'sieg', 'niederlage', 'inventar'] as Phase[]) {
    it(`Phase ${phase}: nichts`, () => {
      const z: Spielzustand = { phase, rest: 40 };
      const r = kaffeeNehmen(z, false, KARTE, mx + 0.5, my);
      assert.equal(r.zustand, z);
      assert.equal(r.kaffee, false);
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen Ablage hat keinen Vorrang (src/kaffee.ts:27), grün gegen c55cfbd, rot mit Taste an der Ablage legt nicht ab (src/kaffee.ts:27), wieder grün
describe('aktionsTaste', () => {
  it('an der Maschine: Kaffee nehmen', () => {
    const r = aktionsTaste(laeuft(50), false, KARTE, mx + 0.5, my);
    assert.equal(r.kaffee, true);
    assert.equal(r.zustand.rest, 50 - KAFFEE_NEHMEN_SEKUNDEN);
  });
  it('an der Ablage: Sieg mit unveraendertem Rest, kein Kaffee', () => {
    const r = aktionsTaste(laeuft(50), false, KARTE, KARTE.ablage[0] + 0.5, KARTE.ablage[1] + 0.5);
    assert.deepEqual(r.zustand, { phase: 'sieg', rest: 50 });
    assert.equal(r.kaffee, false);
  });
  it('Sieg mit Kaffee in der Hand: der Kaffee bleibt getragen', () => {
    const r = aktionsTaste(laeuft(50), true, KARTE, KARTE.ablage[0] + 0.5, KARTE.ablage[1] + 0.5);
    assert.equal(r.zustand.phase, 'sieg');
    assert.equal(r.kaffee, true);
  });
  it('beide Zellen in Reichweite (synthetische Karte): die Ablage hat Vorrang', () => {
    const k = { ...KARTE, ablage: [27, 5] as [number, number], kaffee: [27, 6] as [number, number] };
    const x = 27.5;
    const y = 5.9;
    assert.ok(Math.hypot(x - 27.5, y - 5.5) <= ABLEGE_REICHWEITE && nahAnKaffee(k, x, y));
    const r = aktionsTaste(laeuft(50), false, k, x, y);
    assert.deepEqual(r.zustand, { phase: 'sieg', rest: 50 });
    assert.equal(r.kaffee, false);
  });
  it('weit weg von beidem: nichts', () => {
    const z = laeuft(50);
    const r = aktionsTaste(z, false, KARTE, KARTE.start[0] + 0.5, KARTE.start[1] + 0.5);
    assert.equal(r.zustand, z);
    assert.equal(r.kaffee, false);
  });
});

// Rotprobe: rot am 20.11.2026 gegen Kaffee bleibt nach Verschuetten und Uebergabe (src/kaffee.ts:33), grün gegen c55cfbd, rot mit Kaffee nach jeder Antwort weg (src/kaffee.ts:33), wieder grün
describe('kaffeeNachAntwort', () => {
  it('nach dem Verschuetten (Handbewegung mit Kaffee) ist der Kaffee weg', () => {
    const z = antworte(starteGespraech('empfang'), 1, true);
    assert.equal(z.kaffeeWeg, 'verschuettet');
    assert.equal(kaffeeNachAntwort(true, z), false);
  });
  it('nach der Uebergabe an die Teamleitung ist der Kaffee weg', () => {
    const z = antworte(starteGespraech('teamleitung'), 3, true);
    assert.equal(z.kaffeeWeg, 'uebergeben');
    assert.equal(kaffeeNachAntwort(true, z), false);
  });
  it('nach einer anderen Antwort bleibt der Kaffee', () => {
    const z = antworte(starteGespraech('empfang'), 0, true);
    assert.equal(kaffeeNachAntwort(true, z), true);
  });
  it('ohne Kaffee bleibt es ohne Kaffee', () => {
    assert.equal(kaffeeNachAntwort(false, starteGespraech('empfang')), false);
  });
});
