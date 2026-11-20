// Tests von Boden, Teppich, Waenden, Fenstern, Lampen, Pflanzen und der Tiefenordnung der Welt (src/grafik/welt.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHEF_ZELLE, PALETTE, PFLANZEN_ZELLEN, SPRITE_SKALA, TEPPICH_ZELLEN, KACHEL_BREITE, KACHEL_HOEHE } from '../src/config.ts';
import { KARTE, zellArt } from '../src/karte.ts';
import { gitterZuBild } from '../src/projektion.ts';
import { bodenGroesse, bodenRaster, fensterZellen, istTuerZelle, istWandZelle, lampenZellen, wandRaster, weltObjekte } from '../src/grafik/welt.ts';
import { gleich } from '../src/grafik/raster.ts';
import type { Raster } from '../src/grafik/raster.ts';
import { pruefeSprite } from './grafik-hilfe.ts';

const schluessel = (x: number, y: number): string => `${x},${y}`;

// Zellen des Teppichs, die ueber 4er-Nachbarn von (start) aus erreichbar sind
function erreichbar(liste: readonly [number, number][], start: [number, number]): Set<string> {
  const menge = new Set(liste.map(([x, y]) => schluessel(x, y)));
  const besucht = new Set<string>();
  if (!menge.has(schluessel(start[0], start[1]))) return besucht;
  const arbeit: [number, number][] = [start];
  while (arbeit.length > 0) {
    const [x, y] = arbeit.pop() as [number, number];
    if (besucht.has(schluessel(x, y)) || !menge.has(schluessel(x, y))) continue;
    besucht.add(schluessel(x, y));
    arbeit.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return besucht;
}

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-009a): W1a config.ts:354; W1b config.ts:354; W1c config.ts:354; W2a config.ts:351; W2b
// config.ts:353; W3a config.ts:354; W3G (Gegenfall, bleibt grün) config.ts:354; W4 karte.ts:43; W5 config.ts:354; B1
// welt.ts:176; B2a welt.ts:225; B2b welt.ts:210; B2c welt.ts:215; B3a welt.ts:229; B3b welt.ts:227; B4a welt.ts:234;
// B4b welt.ts:232; B5a welt.ts:208; B5b welt.ts:210; B6a welt.ts:223; B6b welt.ts:222; WA1a welt.ts:39; WA1c
// welt.ts:37; WA2 welt.ts:40; WA3a welt.ts:53; WA3b welt.ts:53; WA3c welt.ts:51; WA4 block.ts:84; WA5a welt.ts:129;
// WA5b welt.ts:120; WA5c welt.ts:130; WA6a welt.ts:108; WA6b welt.ts:109; PO1a config.ts:363; PO1b config.ts:363; PO1c
// config.ts:363; PO1d config.ts:363; PO2-wand welt.ts:262; PO2-tisch welt.ts:265; PO2-maschine welt.ts:267; PO2-sturz
// welt.ts:271; PO2-schild welt.ts:284; PO2-chef welt.ts:286; PO2-pflanze welt.ts:277; PO3a welt.ts:262; PO3b
// welt.ts:286; PO4a welt.ts:265; PO4b welt.ts:92; PO4c moebel.ts:68; D1a welt.ts:117; D1b welt.ts:117
describe('Teppich (TEPPICH_ZELLEN)', () => {
  it('keine Teppichzelle ist Wand, Tisch, Maschine oder die Startzelle', () => {
    for (const [x, y] of TEPPICH_ZELLEN) {
      assert.equal(zellArt(KARTE, x, y), 'boden', `${x},${y}`);
      assert.notDeepEqual([x, y], [...KARTE.start], `Start ${x},${y}`);
    }
  });
  it('der Teppich enthält beide Türzellen (24,7) und (24,8) und die Zelle (26,5)', () => {
    const menge = new Set(TEPPICH_ZELLEN.map(([x, y]) => schluessel(x, y)));
    for (const z of ['24,7', '24,8', '26,5', '9,7', '9,8']) assert.ok(menge.has(z), z);
  });
  it('der Teppich hängt von (9,7) aus über 4er-Nachbarn lückenlos zusammen', () => {
    const erreicht = erreichbar(TEPPICH_ZELLEN, [9, 7]);
    for (const [x, y] of TEPPICH_ZELLEN) assert.ok(erreicht.has(schluessel(x, y)), `nicht erreichbar: ${x},${y}`);
  });
  it('(26,5) grenzt an die Ablagezelle', () => {
    const [ax, ay] = KARTE.ablage;
    assert.equal(Math.abs(26 - ax) + Math.abs(5 - ay), 1);
  });
  it('die Liste hat keine doppelten Zellen', () => {
    assert.equal(new Set(TEPPICH_ZELLEN.map(([x, y]) => schluessel(x, y))).size, TEPPICH_ZELLEN.length);
  });
});

describe('Boden-Raster', () => {
  const g = bodenGroesse(KARTE);
  const boden = bodenRaster(KARTE);
  // Farbe an einer Stelle in der Zelle (tx, ty in 0..1)
  const farbeAn = (gx: number, gy: number, tx: number, ty: number): number => {
    const b = gitterZuBild(gx + tx, gy + ty);
    const X = Math.floor((b.x - g.ursprungX) / SPRITE_SKALA);
    const Y = Math.floor(b.y / SPRITE_SKALA);
    return boden.punkte[Y * boden.breite + X];
  };
  it('Größe: 800 x 400 Rasterpunkte (1600 x 800 Bildschirmpunkte)', () => {
    assert.equal(boden.breite * SPRITE_SKALA, (KARTE.breite + KARTE.hoehe) * (KACHEL_BREITE / 2));
    assert.equal(boden.hoehe * SPRITE_SKALA, (KARTE.breite + KARTE.hoehe) * (KACHEL_HOEHE / 2));
  });
  it('Teppichzelle ist rot, Fliese im Großraumbüro blau, Parkett im Chefbüro braun', () => {
    const rot = [PALETTE.teppich, PALETTE.teppichLicht];
    assert.ok(rot.includes(farbeAn(15, 7, 0.5, 0.5)), farbeAn(15, 7, 0.5, 0.5).toString(16));
    assert.ok([PALETTE.fliesenHell, PALETTE.fliesenDunkel].includes(farbeAn(14, 3, 0.5, 0.5)));
    assert.ok([PALETTE.parkettHell, PALETTE.parkettDunkel, PALETTE.parkettFuge].includes(farbeAn(29, 12, 0.5, 0.5)));
  });
  it('Start (4,13) bleibt weiß, Ablage (27,5) bleibt gelb', () => {
    assert.equal(farbeAn(KARTE.start[0], KARTE.start[1], 0.5, 0.5), PALETTE.startWeiss);
    assert.equal(farbeAn(KARTE.ablage[0], KARTE.ablage[1], 0.1, 0.1), PALETTE.gelb);
  });
  it('Türzellen tragen den Schwellenstreifen, auch auf dem Teppich', () => {
    for (const [x, y] of [[9, 7], [24, 8]] as const) assert.equal(farbeAn(x, y, 0.5, 0.5), PALETTE.schwelle, `${x},${y}`);
    assert.notEqual(farbeAn(15, 7, 0.5, 0.5), PALETTE.schwelle);
  });
  it('Fliesen haben Fugen und wechseln im Schachbrett', () => {
    assert.equal(farbeAn(14, 3, 0.02, 0.5), PALETTE.fuge);
    assert.notEqual(farbeAn(14, 3, 0.5, 0.5), farbeAn(15, 3, 0.5, 0.5));
  });
  it('der Teppich hat einen dunklen Rand zum Boden und keinen zwischen zwei Teppichzellen', () => {
    assert.equal(farbeAn(15, 7, 0.5, 0.02), PALETTE.teppichDunkel); // nach (15,6): kein Teppich
    assert.notEqual(farbeAn(15, 7, 0.5, 0.98), PALETTE.teppichDunkel); // nach (15,8): Teppich
  });
});

describe('Wände, Fenster, Lampen', () => {
  it('fensterZellen ist nicht leer und jede Fensterzelle ist eine Wand', () => {
    const f = fensterZellen(KARTE);
    assert.ok(f.length > 0);
    for (const z of f) assert.ok(istWandZelle(KARTE, z.x, z.y), `${z.x},${z.y}`);
  });
  it('keine Fensterzelle liegt neben einer Tür (y innerhalb einer Zelle der Türzellen der Trennwand)', () => {
    for (const z of fensterZellen(KARTE)) {
      for (const d of [-1, 0, 1]) assert.ok(!(istTuerZelle(KARTE, z.x, z.y + d) && (z.x === 9 || z.x === 24)), `${z.x},${z.y}`);
    }
  });
  it('lampenZellen ist nicht leer, liegt an Wänden und hat einen regelmäßigen Abstand an der Oberwand', () => {
    const l = lampenZellen(KARTE);
    assert.ok(l.length > 0);
    for (const [x, y] of l) assert.ok(istWandZelle(KARTE, x, y), `${x},${y}`);
    const oben = l.filter(([, y]) => y === 0).map(([x]) => x);
    assert.ok(oben.length >= 3);
    for (let i = 1; i < oben.length; i++) assert.equal(oben[i] - oben[i - 1], 4);
  });
  it('Wandsprite ohne Nachbarn: ganze Silhouette im schwarzen Umriss', () => {
    const r = wandRaster({ maske: 0, tuerMaske: 0, fensterLinks: false, fensterRechts: false, lampe: false });
    assert.deepEqual(pruefeSprite(r), []);
  });
  it('Fenster und Lampe verändern das Wandsprite', () => {
    const basis = { maske: 0, tuerMaske: 0, fensterLinks: false, fensterRechts: false, lampe: false };
    const mit = wandRaster({ ...basis, fensterLinks: true });
    assert.ok(!gleich(mit, wandRaster(basis)));
    assert.ok(mit.punkte.includes(PALETTE.fenster));
    const lampe = wandRaster({ ...basis, lampe: true });
    assert.ok(!gleich(lampe, wandRaster(basis)));
    assert.ok(lampe.punkte.includes(PALETTE.lampeKern));
    assert.ok(!wandRaster(basis).punkte.includes(PALETTE.fenster));
  });
  it('Wand neben einer Tür trägt an der Türseite das Türholz, eine Wand ohne Tür nicht', () => {
    const basis = { maske: 0, tuerMaske: 0, fensterLinks: false, fensterRechts: false, lampe: false };
    assert.ok(!wandRaster(basis).punkte.includes(PALETTE.tuerHolz));
    assert.ok(wandRaster({ ...basis, tuerMaske: 1 << 7 }).punkte.includes(PALETTE.tuerHolz)); // Tür an (0,+1): Bit (dy+1)*3+(dx+1) = 7
  });
  it('Sockel: unten dunkle Tönung in beiden Seitenflächen', () => {
    const r = wandRaster({ maske: 0, tuerMaske: 0, fensterLinks: false, fensterRechts: false, lampe: false });
    assert.ok(r.punkte.includes(PALETTE.sockel));
    assert.ok(r.punkte.includes(PALETTE.sockelLicht));
  });
});

describe('Pflanzen und Welt-Objekte', () => {
  it('Pflanzen stehen auf Boden an einer Wand, nicht auf Teppich oder Tür', () => {
    const teppich = new Set(TEPPICH_ZELLEN.map(([x, y]) => schluessel(x, y)));
    for (const [x, y] of PFLANZEN_ZELLEN) {
      assert.equal(zellArt(KARTE, x, y), 'boden', `${x},${y}`);
      const anWand = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => istWandZelle(KARTE, x + dx, y + dy));
      assert.ok(anWand, `nicht an der Wand: ${x},${y}`);
      assert.ok(!teppich.has(schluessel(x, y)) && !istTuerZelle(KARTE, x, y), `Weg: ${x},${y}`);
    }
  });
  it('weltObjekte: eine Wand je Wandzelle, ein Tisch je T-Zelle, eine Maschine, vier Stürze, ein Schild, ein Chef', () => {
    const objekte = weltObjekte(KARTE);
    const zahl = (art: string): number => objekte.filter((o) => o.art === art).length;
    assert.equal(zahl('wand'), 124);
    assert.equal(zahl('tisch'), 19);
    assert.equal(zahl('maschine'), 1);
    assert.equal(zahl('sturz'), 4);
    assert.equal(zahl('schild'), 1);
    assert.equal(zahl('chef'), 1);
    assert.equal(zahl('pflanze'), PFLANZEN_ZELLEN.length);
  });
  it('Tiefe: Wände, Tische, Maschine, Stürze und Chef liegen bei x + y + 1', () => {
    const objekte = weltObjekte(KARTE);
    for (const o of objekte) if (o.art === 'wand' || o.art === 'tisch' || o.art === 'maschine' || o.art === 'sturz') assert.equal(o.tiefe, o.x + o.y + 1, `${o.art} ${o.x},${o.y}`);
    const chef = objekte.find((o) => o.art === 'chef');
    assert.ok(chef !== undefined);
    assert.equal(chef.tiefe, CHEF_ZELLE[0] + CHEF_ZELLE[1] + 1);
  });
  it('weltObjekte: jedes Objekt liefert ein Sprite mit Umriss (isolierte Wand und Möbel), gleiche Schlüssel gleiche Bilder', () => {
    const gesehen = new Map<string, Raster>();
    for (const o of weltObjekte(KARTE)) {
      const r = o.raster();
      const alt = gesehen.get(o.schluessel);
      if (alt === undefined) gesehen.set(o.schluessel, r);
      else assert.ok(gleich(alt, r), o.schluessel);
      if (o.art !== 'wand' && o.art !== 'sturz') assert.deepEqual(pruefeSprite(r), [], o.schluessel);
    }
    assert.ok(gesehen.size < 60, `${gesehen.size} Texturen`);
  });
});
