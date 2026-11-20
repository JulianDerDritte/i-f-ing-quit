// Tests der Figuren (Spieler, NPCs, Chef) als Pixelraster (src/grafik/figuren.ts) und der Chef-Zelle.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHEF_ZELLE, NPC_IDS, PALETTE, SPRITE_SKALA } from '../src/config.ts';
import { KARTE, bereichAnZelle, zellArt } from '../src/karte.ts';
import { CHEF_SCHRITTE, NPC_SCHRITTE, RICHTUNGEN, SPIELER_SCHRITTE, chefBild, chefFigurBild, figurBild, npcBild, schattenBild } from '../src/grafik/figuren.ts';
import { DURCHSICHTIG, gleich, spiegeln, unterschiedsAnteil } from '../src/grafik/raster.ts';
import { hatFarbe, pruefeSprite } from './grafik-hilfe.ts';

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-009a): F1a figuren.ts:153; F1b config.ts:120; F2 figuren.ts:194; F3a figuren.ts:194; F3b
// figuren.ts:194; F4a figuren.ts:188; F4b figuren.ts:185; F5 figuren.ts:161; F6a figuren.ts:152; F6b figuren.ts:202;
// F7a figuren.ts:193; F7b figuren.ts:193; F8 figuren.ts:235; N1 figuren.ts:153; N2 figuren.ts:202; N3a figuren.ts:201;
// N3b figuren.ts:201; N3c figuren.ts:201; N4 figuren.ts:201; N5-empfang figuren.ts:96; N5-buchhaltung figuren.ts:101;
// N5-teamleitung figuren.ts:110; N5-it figuren.ts:114; N5-vertrieb figuren.ts:118; N6 figuren.ts:200; C1a
// figuren.ts:212; C1b figuren.ts:68; C1c figuren.ts:84; C2 config.ts:348; C3 config.ts:348; C4 config.ts:348; C5
// config.ts:348
// A-012 (Skala 1): Die Zeilennummern der A-009a-Wirkstellen oben sind mit dem Neubau von figuren.ts verschoben (nicht neu
// gemessen). Neu gemessen, rot gesehen am 20.11.2026 (Wirkstellen in src/grafik/figuren.ts bzw. config.ts, Stand A-012):
// F-09 Raster/Schatten :380 (Schattenraster 14x6), :251 (Sohlenzeile fehlt); F-09 Farben :254 (Licht/Schatten aus);
// E8 Töne :166 (hemdLicht), :164 (hoseSchatten), :162 und :179 (haarBraunSchatten), :163 (hautLicht); F-09 Details :193 (Mund),
// :203 und :204 (Knoten), :253 (Sohle), :229 und :186 (Mund von hinten); F-15 :409 (Chef Laufbild gleich Stehbild),
// :102 (Schnurrbart), :399 (Schlips von hinten). Nachweiszeilen mit Testnamen: Bericht A-012, Abschnitt Rotproben.
describe('Spieler-Sprite', () => {
  it('jede Richtung und jedes Bild ist ein Sprite (nicht leer, Umriss am Rand) mit Höhe 28 bis 40 Bildschirmpunkten', () => {
    for (const d of RICHTUNGEN) {
      const bilder = [figurBild(d, 0, false), ...Array.from({ length: SPIELER_SCHRITTE }, (_, s) => figurBild(d, s, true))];
      for (const r of bilder) {
        assert.deepEqual(pruefeSprite(r), [], d);
        const hoehe = r.hoehe * SPRITE_SKALA;
        assert.ok(hoehe >= 28 && hoehe <= 40, `${d}: ${hoehe}`);
      }
    }
  });
  it('bei Bewegung sind die 4 Schritte jeder Richtung paarweise verschieden', () => {
    for (const d of RICHTUNGEN) {
      for (let a = 0; a < SPIELER_SCHRITTE; a++) {
        for (let b = a + 1; b < SPIELER_SCHRITTE; b++) assert.ok(!gleich(figurBild(d, a, true), figurBild(d, b, true)), `${d} ${a}/${b}`);
      }
    }
  });
  it('bei Stillstand ist Schritt 0 bis 3 gleich dem Stehbild, und das Stehbild ist kein Laufbild', () => {
    for (const d of RICHTUNGEN) {
      const stehen = figurBild(d, 0, false);
      for (let s = 0; s < SPIELER_SCHRITTE; s++) {
        assert.ok(gleich(figurBild(d, s, false), stehen), `${d} ${s}`);
        assert.ok(!gleich(figurBild(d, s, true), stehen), `${d} Lauf ${s}`);
      }
    }
  });
  it('rechts ist das Spiegelbild von links (oben und unten), oben und unten sind verschieden', () => {
    for (let s = 0; s < SPIELER_SCHRITTE; s++) {
      assert.ok(gleich(figurBild('or', s, true), spiegeln(figurBild('ol', s, true))));
      assert.ok(gleich(figurBild('ur', s, true), spiegeln(figurBild('ul', s, true))));
    }
    assert.ok(!gleich(figurBild('ol', 0, false), figurBild('ul', 0, false)));
    assert.ok(!gleich(figurBild('ul', 0, false), figurBild('ur', 0, false)));
  });
  it('Figur wie im Icon: brauner Haarschopf, weißes Hemd, rote Krawatte, dunkle Hose, braune Schuhe', () => {
    const r = figurBild('ul', 0, false);
    for (const f of [PALETTE.haarBraun, PALETTE.hemd, PALETTE.krawatteRot, PALETTE.hose, PALETTE.schuh]) assert.ok(hatFarbe(r, f), f.toString(16));
  });
  it('Kündigung in der Hand: weiße Blattpunkte mit Linienfarbe, nicht aber bei den NPCs', () => {
    for (const d of RICHTUNGEN) assert.ok(hatFarbe(figurBild(d, 0, false), PALETTE.papierLinie), d);
    for (const id of NPC_IDS) assert.ok(!hatFarbe(npcBild(id, 'ul', 0, false), PALETTE.papierLinie), id);
  });
  it('Schritt außerhalb 0 bis 3 ist ein Fehler', () => {
    assert.throws(() => figurBild('ul', 4, true), /ausserhalb/);
    assert.throws(() => figurBild('ul', -1, true), /ausserhalb/);
  });
  it('der Schatten ist ein Raster mit Punkten', () => {
    const s = schattenBild();
    assert.ok(s.punkte.some((f) => f === PALETTE.schatten));
  });
});

describe('NPC-Sprites', () => {
  it('jede NPC-Id in jeder Richtung und jedem Bild ist ein Sprite', () => {
    for (const id of NPC_IDS) {
      for (const d of RICHTUNGEN) {
        assert.deepEqual(pruefeSprite(npcBild(id, d, 0, false)), [], `${id} ${d}`);
        for (let s = 0; s < NPC_SCHRITTE; s++) assert.deepEqual(pruefeSprite(npcBild(id, d, s, true)), [], `${id} ${d} ${s}`);
      }
    }
  });
  it('alle 5 NPC-Sprites sind paarweise um mindestens 20 % der gefüllten Punkte verschieden', () => {
    for (const d of RICHTUNGEN) {
      for (let a = 0; a < NPC_IDS.length; a++) {
        for (let b = a + 1; b < NPC_IDS.length; b++) {
          const anteil = unterschiedsAnteil(npcBild(NPC_IDS[a], d, 0, false), npcBild(NPC_IDS[b], d, 0, false));
          assert.ok(anteil >= 0.2, `${NPC_IDS[a]} / ${NPC_IDS[b]} ${d}: ${anteil}`);
        }
      }
    }
  });
  it('jeder NPC hat in jeder Richtung zwei verschiedene Laufbilder, die vom Stehbild abweichen', () => {
    for (const id of NPC_IDS) {
      for (const d of RICHTUNGEN) {
        assert.ok(!gleich(npcBild(id, d, 0, true), npcBild(id, d, 1, true)), `${id} ${d}`);
        assert.ok(!gleich(npcBild(id, d, 0, true), npcBild(id, d, 0, false)), `${id} ${d} Stehbild 0`);
        assert.ok(!gleich(npcBild(id, d, 1, true), npcBild(id, d, 0, false)), `${id} ${d} Stehbild 1`);
      }
    }
  });
  it('bei Stillstand liefert jeder NPC das Stehbild, gleich für beide Schritte', () => {
    for (const id of NPC_IDS) assert.ok(gleich(npcBild(id, 'ur', 0, false), npcBild(id, 'ur', 1, false)), id);
  });
  it('Rollenmerkmale: Headset, Brille, Becher, Kabel und Aktentasche sind in den Farben zu finden', () => {
    assert.ok(hatFarbe(npcBild('empfang', 'ul', 0, false), PALETTE.grau), 'Headset');
    assert.ok(hatFarbe(npcBild('buchhaltung', 'ul', 0, false), PALETTE.orange), 'Mappe');
    assert.ok(hatFarbe(npcBild('teamleitung', 'ul', 0, false), PALETTE.kaffee), 'Becher');
    assert.ok(hatFarbe(npcBild('it', 'ul', 0, false), PALETTE.gruenLicht), 'Kabel');
    assert.ok(hatFarbe(npcBild('vertrieb', 'ul', 0, false), PALETTE.holz), 'Aktentasche');
  });
  it('NPC-Schritt außerhalb 0 bis 1 ist ein Fehler', () => {
    assert.throws(() => npcBild('it', 'ul', 2, true), /ausserhalb/);
  });
});

describe('Chef', () => {
  it('der Chef ist ein Sprite mit Schnurrbart, rotem Schlips und Anzug', () => {
    const r = chefBild();
    assert.deepEqual(pruefeSprite(r), []);
    for (const f of [PALETTE.schnurrbart, PALETTE.krawatteRot, PALETTE.anzugLicht]) assert.ok(hatFarbe(r, f), f.toString(16));
  });
  it('CHEF_ZELLE liegt im Bereich Chefbüro', () => {
    assert.equal(bereichAnZelle(KARTE, CHEF_ZELLE[0], CHEF_ZELLE[1]), 'Chefbuero');
  });
  it('CHEF_ZELLE ist Boden (keine Wand, kein Tisch, keine Maschine)', () => {
    assert.equal(zellArt(KARTE, CHEF_ZELLE[0], CHEF_ZELLE[1]), 'boden');
  });
  it('CHEF_ZELLE ist nicht die Ablagezelle', () => {
    assert.notDeepEqual([...CHEF_ZELLE], [...KARTE.ablage]);
  });
  it('CHEF_ZELLE ist nicht die Startzelle', () => {
    assert.notDeepEqual([...CHEF_ZELLE], [...KARTE.start]);
  });
});

// A-012: feinere Figuren im Raster Skala 1. Rotprobe: rot gesehen am 20.11.2026 (Wirkstellen im Bericht A-012)
describe('Feinere Figuren (A-012)', () => {
  it('F-09 Raster des Spielers 30 mal 35 Rasterpunkte (heute 16 mal 18), Schatten 28 mal 12', () => {
    const r = figurBild('ul', 0, false);
    assert.equal(r.breite, 30);
    assert.equal(r.hoehe, 35);
    const s = schattenBild();
    assert.equal(s.breite, 28);
    assert.equal(s.hoehe, 12);
  });
  it('F-09 Spieler-Stehbild hat mindestens 18 verschiedene Farben (heute 12)', () => {
    const farben = new Set<number>([...figurBild('ul', 0, false).punkte].filter((f) => f !== DURCHSICHTIG));
    assert.ok(farben.size >= 18, `${farben.size}`);
  });
  it('F-09 Haar, Haut, Hemd und Hose des Spielers haben je drei benannte Töne (Licht, Mittelton, Schatten) im Stehbild, dazu der Umriss', () => {
    const material: [string, number[]][] = [
      ['Haar', [PALETTE.haarBraun, PALETTE.haarBraunLicht, PALETTE.haarBraunSchatten]],
      ['Haut', [PALETTE.haut, PALETTE.hautLicht, PALETTE.hautSchatten]],
      ['Hemd', [PALETTE.hemd, PALETTE.hemdLicht, PALETTE.hemdSchatten]],
      ['Hose', [PALETTE.hose, PALETTE.hoseLicht, PALETTE.hoseSchatten]],
    ];
    for (const d of ['ul', 'ur'] as const) {
      const r = figurBild(d, 0, false);
      for (const [name, toene] of material) {
        assert.equal(new Set(toene).size, 3, `${name}: drei verschiedene Schlüssel`);
        for (const t of toene) assert.ok(hatFarbe(r, t), `${d} ${name} ${t.toString(16)}`);
      }
      assert.ok(hatFarbe(r, PALETTE.umriss));
    }
  });
  it('F-09 Details: Mund vorn (hinten keiner), Krawattenknoten breiter als die Krawatte, Schuhsohle in den zwei untersten Zeilen', () => {
    const vorn = figurBild('ul', 0, false);
    assert.ok(hatFarbe(vorn, PALETTE.mund));
    assert.ok(!hatFarbe(figurBild('ol', 0, false), PALETTE.mund));
    const krawatte: number[] = [PALETTE.krawatteRot, PALETTE.krawatteLicht, PALETTE.krawatteDunkel];
    const breite = (y: number): number => Array.from({ length: vorn.breite }, (_, x) => vorn.punkte[y * vorn.breite + x]).filter((f) => krawatte.includes(f)).length;
    assert.ok(breite(15) > breite(20), `Knoten ${breite(15)} gegen Krawatte ${breite(20)}`);
    const sohle = (y: number): number => Array.from({ length: vorn.breite }, (_, x) => vorn.punkte[y * vorn.breite + x]).filter((f) => f === PALETTE.schuhSohle).length;
    assert.ok(sohle(vorn.hoehe - 2) >= 10 && sohle(vorn.hoehe - 3) >= 10, `Sohle ${sohle(vorn.hoehe - 3)}/${sohle(vorn.hoehe - 2)}`);
  });
});

describe('Chef in vier Richtungen (A-012)', () => {
  it('F-15 jede Richtung des Chefs: Stehbild und zwei Laufbilder sind Sprites, die Laufbilder unterscheiden sich vom Stehbild und voneinander', () => {
    for (const d of RICHTUNGEN) {
      const stehen = chefFigurBild(d, 0, false);
      assert.deepEqual(pruefeSprite(stehen), [], `${d} Stehbild`);
      assert.equal(stehen.hoehe, 35);
      for (let s = 0; s < CHEF_SCHRITTE; s++) {
        assert.deepEqual(pruefeSprite(chefFigurBild(d, s, true)), [], `${d} Lauf ${s}`);
        assert.ok(!gleich(chefFigurBild(d, s, true), stehen), `${d} Lauf ${s} gleich Stehbild`);
      }
      assert.ok(!gleich(chefFigurBild(d, 0, true), chefFigurBild(d, 1, true)), `${d} Laufbilder gleich`);
    }
  });
  it('F-15 der Chef trägt Schnurrbart, roten Schlips und Anzug nach vorn (unten), von hinten keinen Schlips', () => {
    for (const d of ['ul', 'ur'] as const) for (const f of [PALETTE.schnurrbart, PALETTE.krawatteRot, PALETTE.anzugLicht]) assert.ok(hatFarbe(chefFigurBild(d, 0, false), f), `${d} ${f.toString(16)}`);
    assert.ok(!hatFarbe(chefFigurBild('ol', 0, false), PALETTE.krawatteRot));
  });
});
