// Tests des laufenden Chefs (A-010): Ring und Zyklus, Erwischen, Schutzfrist, drei Gespraeche, Durchwahl, Inventar und Speicher.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHEF_DIALOG_KOSTEN,
  CHEF_NACHFRAGE_KOSTEN,
  CHEF_RING,
  CHEF_RUNDE_SEKUNDEN,
  CHEF_SCHUTZ_SEKUNDEN,
  CHEF_ZYKLUS_SEKUNDEN,
  DIALOG_SEKUNDEN,
  KONTAKT_RADIUS,
  NACHFRAGE_SEKUNDEN,
  NPC_TEMPO,
  TIMER_SEKUNDEN,
} from '../src/config.ts';
import type { Phase } from '../src/spielzustand.ts';
import {
  CHEF_RING_LAENGE,
  chefDialogFuerErwischen,
  chefErwischt,
  chefFortschreiben,
  chefGespraechEnde,
  chefPosition,
  chefSchritte,
  erwischtAb,
  kontaktChef,
  neuerChef,
  teilschritte,
} from '../src/chef.ts';
import { DIALOGE, angeboteneAntworten, antworte, nachfrageSekunden, starteGespraech } from '../src/dialog.ts';
import { DURCHWAHL_INFO } from '../src/chefdialoge.ts';
import { ausGespraech, istInfoQuelle, inventarSeiten, neuesInventar } from '../src/inventar.ts';
import { KARTE, zellArt } from '../src/karte.ts';
import { neuerLauf } from '../src/lauf.ts';
import { NPCS } from '../src/npcs.ts';
import { ladeInfos, speichereInventar } from '../src/speicher.ts';
import { abziehen, ablegen, nachfrageAbziehen, neuerZustand } from '../src/spielzustand.ts';
import { CHEF_SCHRITTE, RICHTUNGEN, chefFigurBild } from '../src/grafik/figuren.ts';
import { ersatzSpeicher } from './hilfe.ts';
import { gleich, spiegeln as spiegelnTest } from '../src/grafik/raster.ts';
import { pruefeSprite } from './grafik-hilfe.ts';

const nah = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
const CHEF_IDS = ['chef1', 'chef2', 'chef3'];

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-010): C1 chef.ts:34; C2 config.ts:39; C3a config.ts:40; C4 config.ts:34; C5 config.ts:34;
// C6 config.ts:34; C7a config.ts:31; C7b config.ts:36; C8-dialog chef.ts:54; C8-inventar chef.ts:54; C8-sieg
// chef.ts:54; C8-niederlage chef.ts:54; C9a chef.ts:55; C9b chef.ts:55; C10a chef.ts:62; C10b chef.ts:60; C11a
// chef.ts:76; C11b chef.ts:77; C12 chef.ts:49; C13 chef.ts:69; C14 chef.ts:69; C15a chef.ts:67; C15b chef.ts:67; C15c
// chef.ts:67; C16a config.ts:41; C16b chef.ts:67; C17b chef.ts:49; C18 npcs.ts:40; C19a chef.ts:88; C19b chef.ts:87;
// C19c chef.ts:87; C20 chef.ts:93; C21 lauf.ts:26; C22a config.ts:43; C22b config.ts:44; C22c config.ts:44; C23a
// chefdialoge.ts:15; C23b chefdialoge.ts:24; C24a chefdialoge.ts:71; C24b chefdialoge.ts:58; C25 chefdialoge.ts:48;
// C26a chefdialoge.ts:36; C26b chefdialoge.ts:6; C26c chefdialoge.ts:85; C26d chefdialoge.ts:48; C27a inventar.ts:40;
// C27b inventar.ts:97; C27c inventar.ts:41; C28a inventar.ts:34; C28b inventar.ts:34; C29a speicher.ts:28; C29b
// speicher.ts:28; C30a figuren.ts:251; C30b figuren.ts:257; C30c figuren.ts:260; C30d figuren.ts:258; C30e
// figuren.ts:256; C3b chef.ts:34; C17a chef.ts:49; C22d config.ts:43
describe('Chef: Ring und Zyklus', () => {
  it('chefPosition: t = 0, 4, 8, 9, 10 (Start, Mitte der Ablagezelle, Start, Start, Start)', () => {
    const erwartet: [number, number, number][] = [[0, 28.5, 2.5], [4, 27.5, 5.5], [8, 28.5, 2.5], [9, 28.5, 2.5], [10, 28.5, 2.5]];
    for (const [t, x, y] of erwartet) {
      const p = chefPosition(t);
      assert.ok(nah(p.x, x) && nah(p.y, y), `t=${t}: ${p.x}, ${p.y}`);
    }
  });
  it('chefPosition: periodisch mit 10 s (Toleranz 1e-9), nicht mit 11 s', () => {
    for (const t of [3.7, 0.4, 6.1, 9.9]) {
      const a = chefPosition(t);
      const b = chefPosition(t + 10);
      assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9, String(t));
    }
    const a = chefPosition(3.7);
    const c = chefPosition(3.7 + 11);
    assert.ok(Math.abs(a.x - c.x) > 1e-3 || Math.abs(a.y - c.y) > 1e-3, 'Zyklus 11 s waere unbemerkt');
  });
  it('Zyklus: 10 s mit 8 s Runde und 2 s Stehen am Start', () => {
    assert.equal(CHEF_ZYKLUS_SEKUNDEN, 10);
    assert.equal(CHEF_RUNDE_SEKUNDEN, 8);
    const start = chefPosition(0);
    for (const t of [8, 8.5, 9, 9.99]) assert.deepEqual(chefPosition(t), start, String(t));
    const unterwegs = chefPosition(7.9);
    assert.ok(Math.hypot(unterwegs.x - start.x, unterwegs.y - start.y) > 0.1);
    assert.ok(Math.hypot(chefPosition(0.5).x - start.x, chefPosition(0.5).y - start.y) > 0.1);
  });
  it('Ring: Abtastung alle 0,25 Zellen berührt nur Bodenzellen (kein Tisch, keine Wand, keine Maschine)', () => {
    const zellen = new Set<string>();
    for (let i = 0; i + 1 < CHEF_RING.length; i++) {
      const [x0, y0] = CHEF_RING[i];
      const [x1, y1] = CHEF_RING[i + 1];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.25);
      for (let k = 0; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n;
        const y = y0 + ((y1 - y0) * k) / n;
        const zx = Math.floor(x);
        const zy = Math.floor(y);
        zellen.add(`${zx},${zy}`);
        assert.equal(zellArt(KARTE, zx, zy), 'boden', `${zx},${zy}`);
      }
    }
    assert.ok(zellen.size >= 12);
  });
  it('Ring: umschließt den Tisch (alle acht Bodenzellen am Tisch werden berührt)', () => {
    const beruehrt = new Set<string>();
    for (let t = 0; t < 8; t += 0.05) {
      const p = chefPosition(t);
      beruehrt.add(`${Math.floor(p.x)},${Math.floor(p.y)}`);
    }
    for (const z of ['27,2', '28,2', '26,3', '29,3', '26,4', '29,4', '27,5', '28,5']) assert.ok(beruehrt.has(z), z);
    for (const z of ['27,3', '28,3', '27,4', '28,4']) assert.ok(!beruehrt.has(z), `Tisch ${z}`);
  });
  it('Ring: Länge 12 Zellen, Länge ÷ Rundenzeit = NPC_TEMPO (Toleranz 1e-9)', () => {
    assert.ok(nah(CHEF_RING_LAENGE, 12));
    assert.ok(nah(CHEF_RING_LAENGE / CHEF_RUNDE_SEKUNDEN, NPC_TEMPO));
  });
  it('Ring: Start ist die Mitte von CHEF_ZELLE und der Ring schließt sich', () => {
    assert.deepEqual(CHEF_RING[0], [28.5, 2.5]);
    assert.deepEqual(CHEF_RING[CHEF_RING.length - 1], CHEF_RING[0]);
  });
});

describe('Chef: Zeit nur in Phase läuft', () => {
  const alt = { t: 2, erwischt: 1, schutzRest: 3 };
  for (const phase of ['dialog', 'inventar', 'sieg', 'niederlage'] as const) {
    it(`chefFortschreiben: in Phase ${phase} bleiben t und schutzRest unverändert`, () => {
      assert.deepEqual(chefFortschreiben(alt, 1, phase), alt);
    });
  }
  it('chefFortschreiben: in Phase laeuft wächst t und sinkt schutzRest (nicht unter 0)', () => {
    assert.deepEqual(chefFortschreiben(alt, 1, 'laeuft'), { t: 3, erwischt: 1, schutzRest: 2 });
    assert.equal(chefFortschreiben(alt, 10, 'laeuft').schutzRest, 0);
  });
});

describe('Chef: Teilschritte', () => {
  it('teilschritte: Summe gleich dem Zeitschritt (1e-9), jeder Teil höchstens 0,1 s', () => {
    for (const dt of [0.016, 0.1, 0.25, 3, 7.77]) {
      const teile = teilschritte(dt);
      assert.ok(Math.abs(teile.reduce((a, b) => a + b, 0) - dt) < 1e-9, String(dt));
      for (const x of teile) assert.ok(x <= 0.1 + 1e-12, String(x));
    }
    assert.deepEqual(teilschritte(0), []);
  });
  it('chefSchritte: ein Sprung von 3 s über die Figur wird als Kontakt erkannt, ohne Zerlegung wäre er verpasst worden', () => {
    const figur = { x: 29.5, y: 4 };
    const r = chefSchritte(neuerChef(), 3, figur.x, figur.y, 'laeuft');
    assert.equal(r.kontakt, true);
    assert.ok(r.chef.t < 3, String(r.chef.t));
    // Gegenprobe: ein einziger Schritt von 3 s endet 1,5 Zellen von der Figur entfernt
    const ende = chefPosition(3);
    assert.ok(Math.hypot(ende.x - figur.x, ende.y - figur.y) > KONTAKT_RADIUS);
  });
  it('chefSchritte: ohne Figur in der Nähe kein Kontakt, die Zeit läuft um den ganzen Schritt', () => {
    const r = chefSchritte(neuerChef(), 3, 5, 13, 'laeuft');
    assert.equal(r.kontakt, false);
    assert.ok(nah(r.chef.t, 3));
  });
});

describe('Chef: Erwischen', () => {
  it('erwischtAb: 0,79 und 0,7999 ja, 0,8 und 0,81 nein (strikt kleiner als KONTAKT_RADIUS)', () => {
    assert.equal(erwischtAb(0.79), true);
    assert.equal(erwischtAb(0.7999), true);
    assert.equal(erwischtAb(KONTAKT_RADIUS), false);
    assert.equal(erwischtAb(0.81), false);
  });
  it('kontaktChef: Figur 0,79 vom Chef bei t = 0 ja, 0,81 nein', () => {
    const c = neuerChef();
    assert.equal(kontaktChef(c, 28.5 + 0.79, 2.5, 'laeuft'), true);
    assert.equal(kontaktChef(c, 28.5 + 0.81, 2.5, 'laeuft'), false);
  });
  it('kontaktChef: Chef und Figur auf derselben Zelle (Abstand 0) ist Kontakt', () => {
    assert.equal(kontaktChef(neuerChef(), 28.5, 2.5, 'laeuft'), true);
  });
  it('kontaktChef: in Phase sieg oder niederlage kein Kontakt', () => {
    for (const phase of ['sieg', 'niederlage'] as Phase[]) assert.equal(kontaktChef(neuerChef(), 28.5, 2.5, phase), false, phase);
  });
  it('kontaktChef: bei offenem Gespräch (Phase dialog) kein Kontakt', () => {
    assert.equal(kontaktChef(neuerChef(), 28.5, 2.5, 'dialog'), false);
  });
  it('kontaktChef: bei offenem Inventar (Phase inventar) kein Kontakt', () => {
    assert.equal(kontaktChef(neuerChef(), 28.5, 2.5, 'inventar'), false);
  });
  it('Schutzfrist: nach dem Gespräch kein Kontakt, mit einem dt von 4,99 s noch nicht, mit 5,0 s wieder', () => {
    assert.equal(CHEF_SCHUTZ_SEKUNDEN, 5);
    const c = chefGespraechEnde(neuerChef());
    assert.equal(c.schutzRest, 5);
    assert.equal(kontaktChef(c, 28.5, 2.5, 'laeuft'), false);
    const knapp = chefFortschreiben(c, 4.99, 'laeuft');
    assert.equal(kontaktChef(knapp, chefPosition(knapp.t).x, chefPosition(knapp.t).y, 'laeuft'), false);
    const fertig = chefFortschreiben(c, 5.0, 'laeuft');
    assert.equal(kontaktChef(fertig, chefPosition(fertig.t).x, chefPosition(fertig.t).y, 'laeuft'), true);
  });
  it('Ablagezelle: bei t = 4 steht der Chef auf der Ablage, die Figur dort wird erwischt; nach dem Gespräch und 5 s kann abgelegt werden', () => {
    const c = { t: 4, erwischt: 0, schutzRest: 0 };
    assert.deepEqual([KARTE.ablage[0] + 0.5, KARTE.ablage[1] + 0.5], [27.5, 5.5]);
    assert.equal(kontaktChef(c, 27.5, 5.5, 'laeuft'), true);
    assert.equal(kontaktChef(c, 27.5, 7.5, 'laeuft'), false);
    const nachher = chefGespraechEnde(c);
    assert.equal(kontaktChef(nachher, 27.5, 5.5, 'laeuft'), false);
    assert.equal(ablegen(neuerZustand(TIMER_SEKUNDEN.leicht), KARTE, 27.5, 5.5).phase, 'sieg');
  });
  it('NPC und Chef können nie gleichzeitig Kontakt haben (Mindestabstand von Ring und NPC-Routen über 2 × KONTAKT_RADIUS)', () => {
    let min = Infinity;
    for (let t = 0; t < 8; t += 0.05) {
      const p = chefPosition(t);
      for (const d of NPCS) {
        for (let i = 0; i + 1 < d.route.length; i++) {
          const [x0, y0] = d.route[i];
          const [x1, y1] = d.route[i + 1];
          for (let k = 0; k <= 40; k++) min = Math.min(min, Math.hypot(p.x - (x0 + ((x1 - x0) * k) / 40), p.y - (y0 + ((y1 - y0) * k) / 40)));
        }
      }
    }
    assert.ok(min > 2 * KONTAKT_RADIUS, String(min));
    assert.ok(min >= 3.9, String(min));
  });
});

describe('Chef: drei Gespräche reihum', () => {
  it('chefDialogFuerErwischen: n = 1 bis 6 ergibt chef1, chef2, chef3, chef1, chef2, chef3', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(chefDialogFuerErwischen), ['chef1', 'chef2', 'chef3', 'chef1', 'chef2', 'chef3']);
  });
  it('chefDialogFuerErwischen: 0, −1 und 1,5 sind Fehler', () => {
    for (const n of [0, -1, 1.5]) assert.throws(() => chefDialogFuerErwischen(n), /ungueltig/, String(n));
  });
  it('chefErwischt: zählt je Erwischen hoch und liefert den Baum dieses Erwischens', () => {
    let c = neuerChef();
    const folge: string[] = [];
    for (let i = 0; i < 4; i++) {
      const e = chefErwischt(c);
      c = e.chef;
      folge.push(e.dialogId);
    }
    assert.deepEqual(folge, ['chef1', 'chef2', 'chef3', 'chef1']);
    assert.equal(c.erwischt, 4);
  });
  it('Neustart: neuerLauf liefert jedes Mal einen frischen Chef (0, 0, 0), unabhängig vom ersten Lauf', () => {
    const l1 = neuerLauf(60, ersatzSpeicher());
    l1.chef.erwischt = 2;
    l1.chef.t = 5;
    l1.chef.schutzRest = 3;
    const l2 = neuerLauf(60, ersatzSpeicher());
    assert.deepEqual(l2.chef, { t: 0, erwischt: 0, schutzRest: 0 });
    assert.notEqual(l2.chef, l1.chef);
    assert.deepEqual(chefDialogFuerErwischen(chefErwischt(l2.chef).chef.erwischt), 'chef1');
  });
  it('Kosten: CHEF_DIALOG_KOSTEN ist 4 s im erlaubten Bereich, CHEF_NACHFRAGE_KOSTEN hat genau chef1 bis chef3 mit 2 bis 5 s', () => {
    assert.equal(CHEF_DIALOG_KOSTEN, 4);
    assert.ok(CHEF_DIALOG_KOSTEN >= DIALOG_SEKUNDEN.min && CHEF_DIALOG_KOSTEN <= DIALOG_SEKUNDEN.max);
    assert.deepEqual(Object.keys(CHEF_NACHFRAGE_KOSTEN).sort(), CHEF_IDS);
    for (const id of CHEF_IDS) {
      const k = CHEF_NACHFRAGE_KOSTEN[id as 'chef1'];
      assert.ok(k >= NACHFRAGE_SEKUNDEN.min && k <= NACHFRAGE_SEKUNDEN.max, id);
      assert.equal(nachfrageSekunden(id), k);
    }
  });
  it('Gesprächskosten: 4 s vom Timer; reichen die Sekunden nicht, ist das Spiel verloren (wie bei den NPCs)', () => {
    assert.equal(abziehen(neuerZustand(3), CHEF_DIALOG_KOSTEN).phase, 'niederlage');
    const z = abziehen(neuerZustand(10), CHEF_DIALOG_KOSTEN);
    assert.deepEqual([z.phase, z.rest], ['dialog', 6]);
    assert.equal(nachfrageAbziehen(z, CHEF_NACHFRAGE_KOSTEN.chef3).rest, 3);
  });
  it('Bäume: chef1 bis chef3 sind wohlgeformt (Start, mindestens 3 Knoten, 2 bis 3 Antworten, weiter zeigt auf einen Knoten oder null)', () => {
    for (const id of CHEF_IDS) {
      const b = DIALOGE[id];
      assert.ok(b !== undefined && b.knoten[b.start] !== undefined, id);
      const knoten = Object.entries(b.knoten);
      assert.ok(knoten.length >= 3, id);
      for (const [name, k] of knoten) {
        assert.ok(k.antworten.length >= 2 && k.antworten.length <= 3, `${id}.${name}: ${k.antworten.length}`);
        for (const a of k.antworten) assert.ok(a.weiter === null || b.knoten[a.weiter] !== undefined, `${id}.${name} -> ${a.weiter}`);
      }
    }
  });
  it('Bäume: je Baum eine Nachfrage, deren Ziel eine Info trägt, und eine Kurzinfo an einer normalen Antwort', () => {
    for (const id of CHEF_IDS) {
      const b = DIALOGE[id];
      const nachfragen = Object.values(b.knoten).flatMap((k) => k.antworten.filter((a) => a.nachfrage === true));
      assert.equal(nachfragen.length, 1, id);
      const ziel = b.knoten[nachfragen[0].weiter as string];
      assert.ok(ziel.info !== undefined, id);
      const normal = Object.values(b.knoten).flatMap((k) => k.antworten.filter((a) => a.nachfrage !== true && a.info !== undefined));
      assert.ok(normal.length >= 1, id);
    }
  });
  it('Kaffee: in keinem Chef-Knoten gibt es eine Kaffee-Antwort, auch mit Kaffee höchstens 3 Antworten', () => {
    for (const id of CHEF_IDS) {
      for (const [name, k] of Object.entries(DIALOGE[id].knoten)) {
        assert.equal(k.kaffeeAntwort, undefined, `${id}.${name}`);
        const z = { ...starteGespraech(id), knoten: name };
        assert.equal(angeboteneAntworten(z, true).length, k.antworten.length, `${id}.${name}`);
        assert.ok(k.antworten.length <= 3);
      }
    }
  });
});

describe('Chef: die Durchwahl', () => {
  it('„4172“ steht genau einmal in allen Dialogen (Rohtexte), und zwar in chef3', () => {
    const fundstellen: string[] = [];
    for (const [id, b] of Object.entries(DIALOGE)) {
      for (const [name, k] of Object.entries(b.knoten)) {
        const texte = [k.text, k.info ?? '', ...k.antworten.flatMap((a) => [a.text, a.info ?? ''])];
        for (const t of texte) if (t.includes('4172')) fundstellen.push(`${id}.${name}`);
      }
    }
    assert.deepEqual(fundstellen, ['chef3.start']);
  });
  it('Die Info lautet wörtlich „Durchwahl der Sekretärin des CEOs: 4172.“ und hängt an einer normalen Antwort im Startknoten von chef3', () => {
    assert.equal(DURCHWAHL_INFO, 'Durchwahl der Sekretärin des CEOs: 4172.');
    const start = DIALOGE.chef3.knoten[DIALOGE.chef3.start];
    const a = start.antworten.find((x) => x.info === DURCHWAHL_INFO);
    assert.ok(a !== undefined);
    assert.notEqual(a.nachfrage, true);
    assert.equal(start.info, undefined);
  });
  it('Sonst keine Ziffer in den Chef-Bäumen (chef1, chef2 und chef3 ohne die Durchwahl-Info)', () => {
    for (const id of CHEF_IDS) {
      for (const [name, k] of Object.entries(DIALOGE[id].knoten)) {
        const texte = [k.text, k.info ?? '', ...k.antworten.flatMap((a) => [a.text, a.info === DURCHWAHL_INFO ? '' : (a.info ?? '')])];
        for (const t of texte) assert.ok(!/\d/.test(t), `${id}.${name}: ${t}`);
      }
    }
  });
  it('Die Info kommt nach der gewählten Antwort ins Inventar unter „Chef“ und steht im Seitentext', () => {
    const z0 = starteGespraech('chef3');
    const idx = DIALOGE.chef3.knoten.start.antworten.findIndex((a) => a.info === DURCHWAHL_INFO);
    const z1 = antworte(z0, idx);
    const inv = ausGespraech(neuesInventar([], false), z1);
    assert.deepEqual(inv.infos, [{ npc: 'chef', text: DURCHWAHL_INFO, nachfrage: false, kaffee: false }]);
    assert.ok(inventarSeiten(inv)[0].startsWith('Chef:\n- Durchwahl'));
    assert.equal(ausGespraech(neuesInventar([], false), z0).infos.length, 0, 'ohne Antwort noch keine Info');
  });
  it('Gespräch chef1 und ein unbekannter Dialog: chef1 gehört zur Quelle „chef“, unbekannt wirft', () => {
    const inv = ausGespraech(neuesInventar([], false), antworte(starteGespraech('chef1'), 0));
    assert.ok(inv.infos.every((i) => i.npc === 'chef'));
    assert.throws(() => ausGespraech(neuesInventar([], false), { ...starteGespraech('chef1'), dialogId: 'chef9' }));
  });
});

describe('Chef: Wächter, Speicher und Neustart', () => {
  it('istInfoQuelle: „chef“ und „empfang“ ja, „praktikant“ und „chef1“ nein', () => {
    assert.equal(istInfoQuelle('chef'), true);
    assert.equal(istInfoQuelle('empfang'), true);
    assert.equal(istInfoQuelle('praktikant'), false);
    assert.equal(istInfoQuelle('chef1'), false);
    assert.equal(istInfoQuelle(42), false);
  });
  it('Rundlauf: ein Eintrag mit npc „chef“ wird gespeichert und wieder geladen', () => {
    const sp = ersatzSpeicher();
    const e = { npc: 'chef', text: DURCHWAHL_INFO, nachfrage: false, kaffee: false } as const;
    assert.equal(speichereInventar(sp, neuesInventar([e], false)), true);
    assert.deepEqual(ladeInfos(sp), [e]);
  });
  it('Neues Spiel: die gespeicherte Durchwahl steht im Inventar des neuen Laufs (Verhalten wie A-006)', () => {
    const sp = ersatzSpeicher();
    speichereInventar(sp, neuesInventar([{ npc: 'chef', text: DURCHWAHL_INFO, nachfrage: false, kaffee: false }], false));
    assert.deepEqual(neuerLauf(60, sp).inventar.infos.map((i) => i.text), [DURCHWAHL_INFO]);
    assert.deepEqual(neuerLauf(60, ersatzSpeicher()).inventar.infos, []);
  });
});

describe('Chef: Sprites', () => {
  it('chefFigurBild: alle 4 Richtungen mit Stehbild und zwei Laufbildern sind Sprites (Umriss am Rand)', () => {
    for (const d of RICHTUNGEN) {
      assert.deepEqual(pruefeSprite(chefFigurBild(d, 0, false)), [], `${d} stehen`);
      for (let s = 0; s < CHEF_SCHRITTE; s++) assert.deepEqual(pruefeSprite(chefFigurBild(d, s, true)), [], `${d} ${s}`);
    }
  });
  it('chefFigurBild: die zwei Laufbilder sind verschieden und vom Stehbild getrennt, Stillstand ist unabhängig vom Schritt', () => {
    for (const d of RICHTUNGEN) {
      assert.ok(!gleich(chefFigurBild(d, 0, true), chefFigurBild(d, 1, true)), d);
      assert.ok(!gleich(chefFigurBild(d, 0, true), chefFigurBild(d, 0, false)), `${d} 0`);
      assert.ok(!gleich(chefFigurBild(d, 1, true), chefFigurBild(d, 0, false)), `${d} 1`);
      assert.ok(gleich(chefFigurBild(d, 0, false), chefFigurBild(d, 1, false)), `${d} Stehbild`);
    }
  });
  it('chefFigurBild: rechts ist das Spiegelbild von links, oben und unten sind verschieden, ein Schritt außerhalb ist ein Fehler', () => {
    assert.ok(gleich(chefFigurBild('ur', 0, true), spiegelnTest(chefFigurBild('ul', 0, true))));
    assert.ok(gleich(chefFigurBild('or', 1, true), spiegelnTest(chefFigurBild('ol', 1, true))));
    assert.ok(!gleich(chefFigurBild('ol', 0, false), chefFigurBild('ul', 0, false)));
    assert.throws(() => chefFigurBild('ul', 2, true), /ausserhalb/);
  });
});
