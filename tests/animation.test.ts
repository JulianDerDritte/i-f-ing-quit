// Tests von Blickrichtung und Laufschritt (src/grafik/animation.ts) und der Takt-Konstante.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LAUF_TAKT_MS } from '../src/config.ts';
import { figurZustand, laufSchritt, neuerFigurZustand, richtungAusBewegung, stehen } from '../src/grafik/animation.ts';
import { gitterZuBild } from '../src/projektion.ts';

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-009a): A1a animation.ts:12; A1b animation.ts:11; A2 animation.ts:6; A3a animation.ts:11;
// A3b animation.ts:12; A4 config.ts:121; A5a animation.ts:19; A5b animation.ts:19; A6a animation.ts:18; A6b
// animation.ts:18; A7a animation.ts:42; A7b animation.ts:19; A8a animation.ts:40; A8b animation.ts:40; A8c
// animation.ts:40; A9a animation.ts:39; A9b animation.ts:39; A10a animation.ts:47; A10b animation.ts:47; A10c
// animation.ts:47; A10d animation.ts:47
describe('Blickrichtung', () => {
  it('richtungAusBewegung: vier Richtungen aus dem Bildschirmvektor', () => {
    assert.equal(richtungAusBewegung('ul', 32, 16), 'ur');
    assert.equal(richtungAusBewegung('ul', -32, 16), 'ul');
    assert.equal(richtungAusBewegung('ul', 32, -16), 'or');
    assert.equal(richtungAusBewegung('ur', -32, -16), 'ol');
  });
  it('richtungAusBewegung: Gitterbewegung längs der Achsen ergibt die schrägen Bildrichtungen', () => {
    const a = gitterZuBild(5, 5);
    const nachX = gitterZuBild(6, 5); // nach +x: rechts unten
    const nachY = gitterZuBild(5, 6); // nach +y: links unten
    const nachMinusY = gitterZuBild(5, 4); // nach -y: rechts oben
    assert.equal(richtungAusBewegung('ol', nachX.x - a.x, nachX.y - a.y), 'ur');
    assert.equal(richtungAusBewegung('ur', nachY.x - a.x, nachY.y - a.y), 'ul');
    assert.equal(richtungAusBewegung('ul', nachMinusY.x - a.x, nachMinusY.y - a.y), 'or');
  });
  it('richtungAusBewegung: ohne Bewegung bleibt die letzte Richtung, bei rein senkrechter Bewegung bleibt die Seite', () => {
    assert.equal(richtungAusBewegung('or', 0, 0), 'or');
    assert.equal(richtungAusBewegung('ul', 0, 20), 'ul');
    assert.equal(richtungAusBewegung('ur', 0, -20), 'or');
    assert.equal(richtungAusBewegung('ol', 20, 0), 'or');
  });
});

describe('Laufschritt', () => {
  it('LAUF_TAKT_MS ist eine positive ganze Zahl', () => {
    assert.ok(Number.isInteger(LAUF_TAKT_MS) && LAUF_TAKT_MS > 0, String(LAUF_TAKT_MS));
  });
  it('laufSchritt: wechselt alle Takte im Kreis über n Bilder (4 verschiedene Werte in 4 Takten)', () => {
    const werte = [0, 1, 2, 3, 4, 5].map((i) => laufSchritt(i * LAUF_TAKT_MS + 1, LAUF_TAKT_MS, 4));
    assert.deepEqual(werte, [0, 1, 2, 3, 0, 1]);
    assert.equal(laufSchritt(LAUF_TAKT_MS - 1, LAUF_TAKT_MS, 4), 0);
  });
  it('laufSchritt: Takt 0 oder keine Bilder ist ein Fehler', () => {
    assert.throws(() => laufSchritt(10, 0, 4), /positiv/);
    assert.throws(() => laufSchritt(10, 100, 0), /positiv/);
  });
  it('figurZustand: Bewegung lässt den Schritt über die Zeit wechseln (vier verschiedene Schritte)', () => {
    let z = neuerFigurZustand(0, 0, 'ul');
    const gesehen = new Set<number>();
    for (let i = 1; i <= 8; i++) {
      z = figurZustand(z, i * 2, 0, LAUF_TAKT_MS, 4);
      assert.ok(z.bewegt);
      gesehen.add(z.schritt);
    }
    assert.deepEqual([...gesehen].sort(), [0, 1, 2, 3]);
  });
  it('figurZustand: Stillstand setzt Schritt und Zeit zurück, die Richtung bleibt', () => {
    let z = neuerFigurZustand(0, 0, 'ul');
    z = figurZustand(z, 32, 16, 3 * LAUF_TAKT_MS, 4);
    assert.equal(z.richtung, 'ur');
    assert.equal(z.schritt, 3);
    z = figurZustand(z, 32, 16, LAUF_TAKT_MS, 4);
    assert.equal(z.bewegt, false);
    assert.equal(z.schritt, 0);
    assert.equal(z.akkuMs, 0);
    assert.equal(z.richtung, 'ur');
  });
  it('figurZustand: Bewegung heißt Positionsänderung des Bildes (eine Änderung unter der Schwelle zählt nicht)', () => {
    const z0 = neuerFigurZustand(10, 10, 'ol');
    assert.equal(figurZustand(z0, 10.005, 10, LAUF_TAKT_MS, 4).bewegt, false);
    assert.equal(figurZustand(z0, 10.5, 10, LAUF_TAKT_MS, 4).bewegt, true);
  });
  it('stehen: Stehbild an derselben Stelle, Richtung bleibt', () => {
    let z = neuerFigurZustand(0, 0, 'ul');
    z = figurZustand(z, 40, -20, 2 * LAUF_TAKT_MS, 4);
    const s = stehen(z);
    assert.equal(s.bewegt, false);
    assert.equal(s.schritt, 0);
    assert.equal(s.akkuMs, 0);
    assert.equal(s.richtung, z.richtung);
    assert.equal(s.x, z.x);
  });
});
