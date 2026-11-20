// Tests des frischen Laufs (src/lauf.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TIMER_SEKUNDEN } from '../src/config.ts';
import { infoEintragen, mitKaffee, neuesInventar } from '../src/inventar.ts';
import { neuerLauf } from '../src/lauf.ts';
import { NPCS, markiereGesprochen, npcPosition } from '../src/npcs.ts';
import { speichereInventar } from '../src/speicher.ts';
import { ersatzSpeicher } from './hilfe.ts';

const e1 = { npc: 'empfang', text: 'Info A', nachfrage: false, kaffee: false } as const;
const e2 = { npc: 'it', text: 'Info C', nachfrage: true, kaffee: false } as const;

// Rotprobe: rot am 20.11.2026 gegen Kaffee beim neuen Lauf nicht leer (src/lauf.ts:23), grün gegen c55cfbd, rot mit gespeicherte Infos nicht geladen (src/lauf.ts:24), wieder grün
describe('neuerLauf', () => {
  it('Phase laeuft, Timer voll', () => {
    const l = neuerLauf(TIMER_SEKUNDEN.leicht, ersatzSpeicher());
    assert.deepEqual(l.zustand, { phase: 'laeuft', rest: TIMER_SEKUNDEN.leicht });
  });
  it('Kaffee leer, auch wenn der letzte Lauf mit Kaffee endete', () => {
    const sp = ersatzSpeicher();
    speichereInventar(sp, mitKaffee(neuesInventar([e1], false), true));
    const l = neuerLauf(60, sp);
    assert.equal(l.kaffee, false);
    assert.deepEqual(l.inventar.gegenstaende, ['Kündigung']);
  });
  it('gespeicherte Infos sind geladen', () => {
    const sp = ersatzSpeicher();
    speichereInventar(sp, [e1, e2].reduce((a, e) => infoEintragen(a, e), neuesInventar([], false)));
    assert.deepEqual(neuerLauf(60, sp).inventar.infos, [e1, e2]);
  });
  it('ohne Speicher: leeres Inventar', () => {
    assert.deepEqual(neuerLauf(60, null).inventar.infos, []);
  });
  it('NPCs stehen an den Startzellen, keiner hat gesprochen', () => {
    const l = neuerLauf(60, ersatzSpeicher());
    for (const d of NPCS) assert.deepEqual(npcPosition(l.welt, d.id), { x: d.route[0][0], y: d.route[0][1] });
    assert.equal(l.welt.gesprochen.size, 0);
  });
  it('zwei Laeufe teilen keinen Zustand (Welt und Gesprochen-Menge sind neu)', () => {
    const sp = ersatzSpeicher();
    const l1 = neuerLauf(60, sp);
    markiereGesprochen(l1.welt, 'empfang');
    l1.kaffee = true;
    const l2 = neuerLauf(60, sp);
    assert.equal(l2.welt.gesprochen.size, 0);
    assert.equal(l2.kaffee, false);
    assert.notEqual(l1.welt, l2.welt);
  });
});
