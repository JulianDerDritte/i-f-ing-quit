// Tests der Persistenz (src/speicher.ts) mit einem Ersatzspeicher.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { infoEintragen, mitKaffee, neuesInventar } from '../src/inventar.ts';
import type { InfoEintrag } from '../src/inventar.ts';
import { SPEICHER_SCHLUESSEL, ladeInfos, loescheSpeicher, speichereInventar } from '../src/speicher.ts';
import { ersatzSpeicher } from './hilfe.ts';

const e1: InfoEintrag = { npc: 'empfang', text: 'Info A', nachfrage: false, kaffee: false };
const e2: InfoEintrag = { npc: 'teamleitung', text: 'Info B', nachfrage: false, kaffee: true };
const e3: InfoEintrag = { npc: 'it', text: 'Info C', nachfrage: true, kaffee: false };
const inv = [e1, e2, e3].reduce((a, e) => infoEintragen(a, e), neuesInventar([], false));
const gut = { version: 1, infos: [e1], gegenstaende: ['Kündigung'] };

function mit(roh: string) {
  const sp = ersatzSpeicher();
  sp.daten.set(SPEICHER_SCHLUESSEL, roh);
  return sp;
}

// Rotprobe: rot am 20.11.2026 gegen Version 0 geschrieben (src/speicher.ts:57), grün gegen c55cfbd, rot mit Infos nicht geschrieben (src/speicher.ts:57), wieder grün
describe('speichern und laden', () => {
  it('Schluessel ist ifingquit.inventar.v1', () => {
    assert.equal(SPEICHER_SCHLUESSEL, 'ifingquit.inventar.v1');
  });
  it('speichern meldet true, laden gibt dieselben Infos zurueck', () => {
    const sp = ersatzSpeicher();
    assert.equal(speichereInventar(sp, inv), true);
    assert.deepEqual(ladeInfos(sp), inv.infos);
  });
  it('gespeichert wird JSON mit version 1, infos und gegenstaende (Zustand am Ende des Laufs)', () => {
    const sp = ersatzSpeicher();
    speichereInventar(sp, mitKaffee(inv, true));
    const roh = JSON.parse(sp.daten.get(SPEICHER_SCHLUESSEL) as string);
    assert.equal(roh.version, 1);
    assert.deepEqual(roh.gegenstaende, ['Kaffee', 'Kündigung']);
    assert.equal(roh.infos.length, 3);
  });
  it('leerer Speicher -> leer', () => {
    assert.deepEqual(ladeInfos(ersatzSpeicher()), []);
  });
  it('doppelte Eintraege in den Daten werden beim Laden zusammengefuehrt', () => {
    const sp = mit(JSON.stringify({ ...gut, infos: [e1, e1] }));
    assert.equal(ladeInfos(sp).length, 1);
  });
});

// Rotprobe: rot am 20.11.2026 gegen Version beim Laden nicht geprueft (src/speicher.ts:40), grün gegen c55cfbd, rot mit nur Version 2 akzeptiert (src/speicher.ts:40), wieder grün
describe('ladeInfos: Version', () => {
  it('Version 1 wird geladen', () => {
    assert.equal(ladeInfos(mit(JSON.stringify(gut))).length, 1);
  });
  it('Version 2 -> leer', () => {
    assert.deepEqual(ladeInfos(mit(JSON.stringify({ ...gut, version: 2 }))), []);
  });
  it('Version fehlt -> leer', () => {
    assert.deepEqual(ladeInfos(mit(JSON.stringify({ infos: [e1], gegenstaende: [] }))), []);
  });
  it('Version als Text -> leer', () => {
    assert.deepEqual(ladeInfos(mit(JSON.stringify({ ...gut, version: '1' }))), []);
  });
});

// Rotprobe: rot am 20.11.2026 gegen Form der Eintraege nicht geprueft (src/speicher.ts:41), grün gegen c55cfbd, rot mit Form der Gegenstaende nicht geprueft (src/speicher.ts:42), wieder grün
describe('ladeInfos: kaputte Daten -> leer, kein Wurf', () => {
  const faelle: [string, string][] = [
    ['kein JSON', '{{{ nicht json'],
    ['leerer Text', ''],
    ['JSON-Zahl', '42'],
    ['JSON null', 'null'],
    ['infos ist Text', JSON.stringify({ ...gut, infos: 'abc' })],
    ['Eintrag ohne Text', JSON.stringify({ ...gut, infos: [{ npc: 'empfang', nachfrage: false, kaffee: false }] })],
    // A-010: 'chef' ist jetzt eine gültige Quelle (istInfoQuelle), der ungültige Wert wurde von 'chef' auf 'praktikant' geändert.
    // Rotprobe: rot gesehen am 20.11.2026, Wächter lässt jeden Wert durch (inventar.ts:34), danach wieder grün.
    ['Eintrag mit unbekanntem NPC', JSON.stringify({ ...gut, infos: [{ ...e1, npc: 'praktikant' }] })],
    ['Eintrag mit nachfrage als Text', JSON.stringify({ ...gut, infos: [{ ...e1, nachfrage: 'ja' }] })],
    ['Eintrag ist null', JSON.stringify({ ...gut, infos: [null] })],
    ['gegenstaende fehlt', JSON.stringify({ version: 1, infos: [e1] })],
    ['gegenstaende mit Zahl', JSON.stringify({ ...gut, gegenstaende: [3] })],
  ];
  for (const [name, roh] of faelle) {
    it(name, () => {
      assert.deepEqual(ladeInfos(mit(roh)), []);
    });
  }
});

// Rotprobe: rot am 20.11.2026 gegen Fehler beim Speichern gehen nach aussen (src/speicher.ts:59), grün gegen c55cfbd, rot mit Speichern meldet bei Fehler true (src/speicher.ts:60), wieder grün
describe('werfender oder fehlender Speicher', () => {
  it('Lesen wirft -> leer, kein Wurf nach aussen', () => {
    assert.deepEqual(ladeInfos(ersatzSpeicher({ lesen: true })), []);
  });
  it('Schreiben wirft -> false, kein Wurf nach aussen', () => {
    assert.equal(speichereInventar(ersatzSpeicher({ schreiben: true }), inv), false);
  });
  it('Loeschen wirft -> false, kein Wurf nach aussen', () => {
    assert.equal(loescheSpeicher(ersatzSpeicher({ loeschen: true })), false);
  });
  it('kein Speicher (null): laden leer, speichern false, loeschen false', () => {
    assert.deepEqual(ladeInfos(null), []);
    assert.equal(speichereInventar(null, inv), false);
    assert.equal(loescheSpeicher(null), false);
  });
});

// Rotprobe: rot am 20.11.2026 gegen Schluessel wird nicht entfernt (src/speicher.ts:68), grün gegen c55cfbd, rot mit Loeschen meldet immer false (src/speicher.ts:69), wieder grün
describe('loescheSpeicher', () => {
  it('entfernt den Schluessel, danach ist die Zahl der Infos 0', () => {
    const sp = ersatzSpeicher();
    speichereInventar(sp, inv);
    assert.equal(ladeInfos(sp).length, 3);
    assert.equal(loescheSpeicher(sp), true);
    assert.equal(sp.daten.has(SPEICHER_SCHLUESSEL), false);
    assert.equal(ladeInfos(sp).length, 0);
  });
});
