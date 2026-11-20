// Tests des Inventars (src/inventar.ts) mit echten Gespraechen aus src/dialog.ts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { antworte, starteGespraech } from '../src/dialog.ts';
import type { DialogZustand } from '../src/dialog.ts';
import { ausGespraech, gegenstaendeListe, infoEintragen, inventarSeiten, mitKaffee, neuesInventar, vermerk } from '../src/inventar.ts';
import type { InfoEintrag } from '../src/inventar.ts';

const leer = () => neuesInventar([], false);
const eintrag = (npc: InfoEintrag['npc'], text: string, nachfrage = false, kaffee = false): InfoEintrag => ({ npc, text, nachfrage, kaffee });

function spiele(id: string, wahl: number[], kaffee = false): DialogZustand {
  let z = starteGespraech(id);
  for (const w of wahl) z = antworte(z, w, kaffee);
  return z;
}

// Rotprobe: rot am 20.11.2026 gegen Duplikate nicht verhindert (src/inventar.ts:42), grün gegen c55cfbd, rot mit Duplikat nur ueber den Text (src/inventar.ts:42), wieder grün
describe('infoEintragen', () => {
  it('leeres Inventar plus eine Info -> ein Eintrag', () => {
    assert.equal(infoEintragen(leer(), eintrag('empfang', 'A')).infos.length, 1);
  });
  it('dieselbe Info zweimal -> einmal', () => {
    const inv = infoEintragen(infoEintragen(leer(), eintrag('empfang', 'A')), eintrag('empfang', 'A'));
    assert.equal(inv.infos.length, 1);
  });
  it('gleicher Text, anderer NPC -> zwei Eintraege', () => {
    const inv = infoEintragen(infoEintragen(leer(), eintrag('empfang', 'A')), eintrag('it', 'A'));
    assert.equal(inv.infos.length, 2);
  });
  it('gleicher NPC, anderer Text -> zwei Eintraege', () => {
    const inv = infoEintragen(infoEintragen(leer(), eintrag('empfang', 'A')), eintrag('empfang', 'B'));
    assert.equal(inv.infos.length, 2);
  });
  it('dieselbe Info mit anderem Vermerk bleibt einmal (erster Vermerk gilt)', () => {
    const inv = infoEintragen(infoEintragen(leer(), eintrag('empfang', 'A')), eintrag('empfang', 'A', true));
    assert.equal(inv.infos.length, 1);
    assert.equal(inv.infos[0].nachfrage, false);
  });
});

// Rotprobe: rot am 20.11.2026 gegen Nachfrage-Vermerk fehlt (src/inventar.ts:56), grün gegen c55cfbd, rot mit jede Info mit Kaffee-Vermerk (src/inventar.ts:57), wieder grün
describe('ausGespraech', () => {
  it('Kurzweg-Info (Empfang: Chef, danke) -> eine Info ohne Vermerk', () => {
    const inv = ausGespraech(leer(), spiele('empfang', [0, 0]));
    assert.equal(inv.infos.length, 1);
    assert.equal(inv.infos[0].npc, 'empfang');
    assert.equal(vermerk(inv.infos[0]), '');
  });
  it('Nachfrage-Info -> Vermerk Nachfrage', () => {
    const inv = ausGespraech(leer(), spiele('empfang', [2]));
    assert.equal(inv.infos.length, 1);
    assert.equal(inv.infos[0].nachfrage, true);
    assert.equal(inv.infos[0].kaffee, false);
    assert.equal(vermerk(inv.infos[0]), ' [Nachfrage]');
  });
  it('Kaffee-Info (Uebergabe an die Teamleitung) -> Vermerk Kaffee, keine Nachfrage', () => {
    const inv = ausGespraech(leer(), spiele('teamleitung', [3], true));
    assert.equal(inv.infos.length, 1);
    assert.equal(inv.infos[0].kaffee, true);
    assert.equal(inv.infos[0].nachfrage, false);
    assert.equal(vermerk(inv.infos[0]), ' [Kaffee]');
  });
  it('Info nach Verschuetten ist nicht enthalten (alle fuenf Gespraeche)', () => {
    for (const id of ['empfang', 'buchhaltung', 'teamleitung', 'it', 'vertrieb']) {
      const inv = ausGespraech(leer(), spiele(id, [1], true));
      assert.equal(inv.infos.length, 0, id);
    }
  });
  it('dasselbe Gespraech zweimal aufgenommen -> keine Doppelten', () => {
    const z = spiele('empfang', [0, 0]);
    assert.equal(ausGespraech(ausGespraech(leer(), z), z).infos.length, 1);
  });
  it('ein Dialogzustand ohne NPC wirft (kein stiller Fallback)', () => {
    assert.throws(() => ausGespraech(leer(), { ...starteGespraech('empfang'), dialogId: 'unbekannt' }));
  });
});

// Rotprobe: rot am 20.11.2026 gegen Kaffee fehlt unter den Gegenstaenden (src/inventar.ts:24), grün gegen c55cfbd, rot mit Kuendigung fehlt ohne Kaffee (src/inventar.ts:24), wieder grün
describe('Gegenstaende', () => {
  it('ohne Kaffee: nur die Kuendigung', () => {
    assert.deepEqual(gegenstaendeListe(false), ['Kündigung']);
  });
  it('mit Kaffee: Kaffee und Kuendigung', () => {
    assert.deepEqual(gegenstaendeListe(true), ['Kaffee', 'Kündigung']);
  });
  it('mitKaffee setzt nur die Gegenstaende, die Infos bleiben', () => {
    const inv = infoEintragen(leer(), eintrag('it', 'X'));
    assert.deepEqual(mitKaffee(inv, true).gegenstaende, ['Kaffee', 'Kündigung']);
    assert.equal(mitKaffee(inv, true).infos.length, 1);
    assert.deepEqual(mitKaffee(mitKaffee(inv, true), false).gegenstaende, ['Kündigung']);
  });
  it('neues Inventar traegt die Kuendigung immer', () => {
    assert.ok(neuesInventar([], false).gegenstaende.includes('Kündigung'));
    assert.ok(neuesInventar([], true).gegenstaende.includes('Kündigung'));
  });
});

describe('inventarSeiten', () => {
  it('leeres Inventar -> eine Seite mit Hinweis', () => {
    assert.deepEqual(inventarSeiten(leer()), ['Noch keine Infos gesammelt.']);
  });
  it('Infos stehen unter dem Rollennamen, mit Vermerk', () => {
    const inv = infoEintragen(leer(), eintrag('empfang', 'Text A', true));
    assert.deepEqual(inventarSeiten(inv), ['Empfang:\n- Text A [Nachfrage]']);
  });
  it('bei knapper Zeilenzahl entstehen mehrere Seiten, nichts geht verloren', () => {
    let inv = leer();
    for (const npc of ['empfang', 'buchhaltung', 'teamleitung'] as const) {
      inv = infoEintragen(inv, eintrag(npc, `${npc} eins`));
      inv = infoEintragen(inv, eintrag(npc, `${npc} zwei`));
    }
    const seiten = inventarSeiten(inv, 70, 4);
    assert.ok(seiten.length >= 2);
    for (const i of inv.infos) assert.equal(seiten.filter((s) => s.includes(i.text)).length, 1);
  });
});
