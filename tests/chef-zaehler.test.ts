// Tests des gespeicherten Zaehlers der Chef-Gespraeche (A-011): laden, speichern, Lauf, Loeschen.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chefDialogFuerErwischen, chefErwischt } from '../src/chef.ts';
import { CHEF_SCHLUESSEL, SPEICHER_SCHLUESSEL, erwischenSpeichern, ladeChefZaehler, loescheSpeicher, speichereChefZaehler, speichereInventar } from '../src/speicher.ts';
import type { SpeicherQuelle } from '../src/speicher.ts';
import { neuerLauf } from '../src/lauf.ts';
import { neuesInventar } from '../src/inventar.ts';
import { ersatzSpeicher } from './hilfe.ts';

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-011): L1 speicher.ts:78; L2 speicher.ts:71; L3 speicher.ts:77; L4 speicher.ts:77; L5
// speicher.ts:77; L6 speicher.ts:76; L7 speicher.ts:76; L8 speicher.ts:75; L9a speicher.ts:79; L9b speicher.ts:79; L10
// speicher.ts:68; S1 speicher.ts:88; S2 speicher.ts:90; S3 speicher.ts:86; S4 speicher.ts:88; S5a speicher.ts:97; S5b
// speicher.ts:97; N1a lauf.ts:26; N1b lauf.ts:26; N1c lauf.ts:26; N2 lauf.ts:26; N3 lauf.ts:26; D1 speicher.ts:104; D2
// speicher.ts:108; D3 speicher.ts:104; D4 speicher.ts:102; D5a speicher.ts:111; D5b speicher.ts:111
const mitWert = (wert: string) => {
  const sp = ersatzSpeicher();
  sp.setItem(CHEF_SCHLUESSEL, wert);
  return sp;
};

describe('Chef-Zähler laden', () => {
  it('ladeChefZaehler: ein gültiger Wert wird gelesen (0, 1, 2)', () => {
    for (const n of [0, 1, 2]) assert.equal(ladeChefZaehler(mitWert(JSON.stringify({ version: 1, erwischt: n }))), n);
  });
  it('ladeChefZaehler: fehlender Schlüssel ergibt 0', () => {
    assert.equal(ladeChefZaehler(ersatzSpeicher()), 0);
  });
  it('ladeChefZaehler: Wert −1 ergibt 0', () => {
    assert.equal(ladeChefZaehler(mitWert('{"version":1,"erwischt":-1}')), 0);
  });
  it('ladeChefZaehler: Wert 3 (über der Reihe) ergibt 0, 2 bleibt 2', () => {
    assert.equal(ladeChefZaehler(mitWert('{"version":1,"erwischt":3}')), 0);
    assert.equal(ladeChefZaehler(mitWert('{"version":1,"erwischt":2}')), 2);
  });
  it('ladeChefZaehler: Wert 1,5 (nicht ganzzahlig) ergibt 0, 1 bleibt 1', () => {
    assert.equal(ladeChefZaehler(mitWert('{"version":1,"erwischt":1.5}')), 0);
    assert.equal(ladeChefZaehler(mitWert('{"version":1,"erwischt":1}')), 1);
  });
  it('ladeChefZaehler: Wert als Text "2" ergibt 0', () => {
    assert.equal(ladeChefZaehler(mitWert('{"version":1,"erwischt":"2"}')), 0);
  });
  it('ladeChefZaehler: null, fehlendes Feld und JSON null ergeben 0', () => {
    assert.equal(ladeChefZaehler(mitWert('{"version":1,"erwischt":null}')), 0);
    assert.equal(ladeChefZaehler(mitWert('{"version":1}')), 0);
    assert.equal(ladeChefZaehler(mitWert('null')), 0);
  });
  it('ladeChefZaehler: andere oder fehlende Version ergibt 0', () => {
    assert.equal(ladeChefZaehler(mitWert('{"version":2,"erwischt":2}')), 0);
    assert.equal(ladeChefZaehler(mitWert('{"erwischt":2}')), 0);
  });
  it('ladeChefZaehler: kein JSON ergibt 0 ohne Wurf', () => {
    assert.equal(ladeChefZaehler(mitWert('{kaputt')), 0);
  });
  it('ladeChefZaehler: werfender Speicher ergibt 0, kein Speicher (null) ergibt 0', () => {
    assert.equal(ladeChefZaehler(ersatzSpeicher({ lesen: true })), 0);
    assert.equal(ladeChefZaehler(null), 0);
  });
});

describe('Chef-Zähler speichern', () => {
  it('speichereChefZaehler: schreibt erwischt modulo 3 (3 → 0, 4 → 1, 5 → 2, 2 → 2)', () => {
    for (const [n, erwartet] of [[3, 0], [4, 1], [5, 2], [2, 2], [0, 0]] as const) {
      const sp = ersatzSpeicher();
      assert.equal(speichereChefZaehler(sp, n), true);
      assert.deepEqual(JSON.parse(sp.daten.get(CHEF_SCHLUESSEL) as string), { version: 1, erwischt: erwartet }, String(n));
    }
  });
  it('speichereChefZaehler: ein werfender Speicher ergibt false ohne Wurf', () => {
    assert.equal(speichereChefZaehler(ersatzSpeicher({ schreiben: true }), 1), false);
  });
  it('speichereChefZaehler: kein Speicher (null) ergibt false', () => {
    assert.equal(speichereChefZaehler(null, 1), false);
  });
  it('Rundlauf: gespeichert und wieder geladen ergibt denselben Stand', () => {
    const sp = ersatzSpeicher();
    for (const n of [1, 2, 3, 7]) {
      speichereChefZaehler(sp, n);
      assert.equal(ladeChefZaehler(sp), n % 3, String(n));
    }
  });
  it('erwischenSpeichern: schreibt den Zähler des Chefs und meldet true, ohne Speicher false', () => {
    const sp = ersatzSpeicher();
    assert.equal(erwischenSpeichern({ erwischt: 2 }, sp), true);
    assert.equal(ladeChefZaehler(sp), 2);
    assert.equal(erwischenSpeichern({ erwischt: 4 }, sp), true);
    assert.equal(ladeChefZaehler(sp), 1);
    assert.equal(erwischenSpeichern({ erwischt: 1 }, null), false);
  });
});

describe('Lauf übernimmt den Zähler', () => {
  it('neuerLauf: Speicher mit 2 ergibt chef.erwischt 2, t und schutzRest 0, das nächste Erwischen liefert chef3', () => {
    const l = neuerLauf(60, mitWert('{"version":1,"erwischt":2}'));
    assert.deepEqual(l.chef, { t: 0, erwischt: 2, schutzRest: 0 });
    assert.equal(chefErwischt(l.chef).dialogId, 'chef3');
  });
  it('neuerLauf: leerer Speicher oder kein Speicher ergibt 0 (wie bisher)', () => {
    assert.equal(neuerLauf(60, ersatzSpeicher()).chef.erwischt, 0);
    assert.equal(neuerLauf(60, null).chef.erwischt, 0);
  });
  it('neuerLauf: zwei Läufe mit demselben Speicher teilen keinen Chef', () => {
    const sp = mitWert('{"version":1,"erwischt":1}');
    const a = neuerLauf(60, sp);
    a.chef.t = 5;
    a.chef.erwischt = 9;
    const b = neuerLauf(60, sp);
    assert.deepEqual(b.chef, { t: 0, erwischt: 1, schutzRest: 0 });
    assert.notEqual(a.chef, b.chef);
  });
  it('Rundlauf über drei Läufe: zweimal erwischt, Lauf 2 beginnt bei 2 und liefert chef3, Lauf 3 liefert chef1', () => {
    const sp = ersatzSpeicher();
    let l1 = neuerLauf(60, sp).chef;
    for (let i = 0; i < 2; i++) {
      l1 = chefErwischt(l1).chef;
      erwischenSpeichern(l1, sp);
    }
    assert.equal(ladeChefZaehler(sp), 2);
    const l2 = neuerLauf(60, sp).chef;
    assert.equal(l2.erwischt, 2);
    const e2 = chefErwischt(l2);
    assert.equal(e2.dialogId, 'chef3');
    erwischenSpeichern(e2.chef, sp);
    assert.equal(ladeChefZaehler(sp), 0);
    assert.equal(chefErwischt(neuerLauf(60, sp).chef).dialogId, 'chef1');
    assert.equal(chefDialogFuerErwischen(1), 'chef1');
  });
  it('Neustart, Nochmal und Zum Menü setzen den Zähler nicht zurück: ein neuer Lauf nach Speichern liest ihn wieder', () => {
    const sp = ersatzSpeicher();
    erwischenSpeichern({ erwischt: 1 }, sp);
    speichereInventar(sp, neuesInventar([], false)); // Ende eines Laufs speichert das Inventar, nicht den Zähler
    assert.equal(neuerLauf(60, sp).chef.erwischt, 1);
    assert.equal(neuerLauf(60, sp).chef.erwischt, 1);
  });
});

describe('Speicher löschen', () => {
  it('loescheSpeicher: entfernt beide Schlüssel und meldet true; danach beginnt die Reihe bei chef1', () => {
    const sp = ersatzSpeicher();
    speichereInventar(sp, neuesInventar([], false));
    speichereChefZaehler(sp, 2);
    assert.ok(sp.daten.has(SPEICHER_SCHLUESSEL) && sp.daten.has(CHEF_SCHLUESSEL));
    assert.equal(loescheSpeicher(sp), true);
    assert.equal(sp.daten.has(SPEICHER_SCHLUESSEL), false);
    assert.equal(sp.daten.has(CHEF_SCHLUESSEL), false);
    assert.equal(ladeChefZaehler(sp), 0);
    assert.equal(chefErwischt(neuerLauf(60, sp).chef).dialogId, 'chef1');
  });
  it('loescheSpeicher: wirft das Entfernen des Inventarschlüssels, ist das Ergebnis false und der Chef-Schlüssel dennoch entfernt', () => {
    const sp = ersatzSpeicher();
    speichereChefZaehler(sp, 2);
    const wirft: SpeicherQuelle = { getItem: (k) => sp.getItem(k), setItem: (k, v) => sp.setItem(k, v), removeItem: (k) => { if (k === SPEICHER_SCHLUESSEL) throw new Error('gesperrt'); sp.removeItem(k); } };
    assert.equal(loescheSpeicher(wirft), false);
    assert.equal(sp.daten.has(CHEF_SCHLUESSEL), false);
  });
  it('loescheSpeicher: wirft das Entfernen des Chef-Schlüssels, ist das Ergebnis false und der Inventarschlüssel dennoch entfernt', () => {
    const sp = ersatzSpeicher();
    speichereInventar(sp, neuesInventar([], false));
    const wirft: SpeicherQuelle = { getItem: (k) => sp.getItem(k), setItem: (k, v) => sp.setItem(k, v), removeItem: (k) => { if (k === CHEF_SCHLUESSEL) throw new Error('gesperrt'); sp.removeItem(k); } };
    assert.equal(loescheSpeicher(wirft), false);
    assert.equal(sp.daten.has(SPEICHER_SCHLUESSEL), false);
  });
  it('loescheSpeicher: kein Speicher (null) ergibt false', () => {
    assert.equal(loescheSpeicher(null), false);
  });
});
