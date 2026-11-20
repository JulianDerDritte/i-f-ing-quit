// Tests der Oberflaeche im Pixelstil (src/grafik/ui.ts): Timer-Plakette, Knoepfe, Fenster, HUD-Rechtecke, Kontrast, Klickflaechen.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BILD_GROESSE,
  DIALOG_KOSTEN_FARBE,
  FENSTER_STIL,
  HUD_LAYOUT,
  INVENTAR_KNOPF,
  KANTEN,
  KNOPF_ARTEN,
  KNOPF_STILE,
  MELDUNG_LAYOUT,
  MENUE_LAYOUT,
  MENUE_SPEICHER,
  PALETTE,
  PLAKETTE_STIL,
  STUFEN,
  STUFEN_NAMEN,
  TIMER_SEKUNDEN,
  zeitText,
} from '../src/config.ts';
import { dialogRechtecke } from '../src/dialog.ts';
import { kontrastverhaeltnis } from '../src/grafik/palette.ts';
import { gleich } from '../src/grafik/raster.ts';
import {
  PLAKETTE_ZIFFERN_BREITE,
  PLAKETTE_ZIFFERN_HOEHE,
  SEGMENTE,
  blattSymbolRaster,
  blinkAn,
  fensterRechtecke,
  hudRechtecke,
  knopfRechtecke,
  knopfZustand,
  menueHintergrund,
  plaketteRaster,
  plaketteRechtecke,
  stoppuhrRaster,
  stufenZeile,
  tasseRaster,
  ueberlappt,
  zeitZiffern,
  ziffernMuster,
} from '../src/grafik/ui.ts';
import type { FarbRechteck } from '../src/grafik/ui.ts';
import { pruefeSprite, hatFarbe } from './grafik-hilfe.ts';

const R = (x: number, y: number, b: number, h: number): FarbRechteck => ({ x, y, b, h, farbe: 0 });

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-009b): U1 ui.ts:92; U2a ui.ts:91; U2b ui.ts:91; U2c ui.ts:91; U3a ui.ts:97; U3b ui.ts:97;
// U4a ui.ts:100; U4b ui.ts:100; U5a ui.ts:124; U5b ui.ts:122; U6 ui.ts:125; U7a ui.ts:152; U7b ui.ts:164; U7c
// ui.ts:169; U7d ui.ts:164; U8a ui.ts:35; U8b ui.ts:38; U9a ui.ts:46; U9b ui.ts:61; U9c ui.ts:36; U10a ui.ts:73; U10b
// ui.ts:78; U10c dialog.ts:397; U11 ui.ts:85; U12a ui.ts:230; U12b ui.ts:241; U12c ui.ts:214; U13a config.ts:131; U13b
// config.ts:143; U13c config.ts:145; U13d config.ts:194; U14a config.ts:144; U14b config.ts:130; U15a ui.ts:174; U15b
// ui.ts:174; U16 config.ts:131; U17a config.ts:168; U17b config.ts:232; U17c config.ts:138; U17d config.ts:201; U17e
// config.ts:152; U18a config.ts:172; U18b config.ts:416; U19a config.ts:425; U19b config.ts:427; U19c config.ts:431;
// U20a palette.ts:22; U20b palette.ts:22
describe('Timer-Plakette: Zeit und Ziffern', () => {
  it('zeitZiffern: 0, 9, 10, 59, 60, 599, 600 ergeben MM:SS mit führender Null', () => {
    assert.deepEqual([0, 9, 10, 59, 60, 599, 600].map(zeitZiffern), ['00:00', '00:09', '00:10', '00:59', '01:00', '09:59', '10:00']);
  });
  it('zeitZiffern: Restzeit wird aufgerundet wie zeitAufgerundet, die Anzeige ist bei 99:59 gedeckelt (5999 und 6000 s)', () => {
    assert.equal(zeitZiffern(0.1), '00:01');
    assert.equal(zeitZiffern(9.01), '00:10');
    assert.equal(zeitZiffern(5999), '99:59');
    assert.equal(zeitZiffern(6000), '99:59');
    assert.equal(zeitZiffern(-3), '00:00');
  });
  it('blinkAn: nur bei Restzeit bis 10 s, halbsekundenweise im Wechsel', () => {
    assert.equal(blinkAn(30), false);
    assert.equal(blinkAn(10.01), false);
    assert.equal(blinkAn(10), true);
    assert.equal(blinkAn(9.6), false);
    assert.equal(blinkAn(9.4), true);
    assert.equal(blinkAn(0.2), true);
  });
  it('Ziffernmuster: alle 10 Ziffern sind paarweise verschieden (8 gegen 0, 6 gegen 9), 9 Zeilen zu 5 Punkten', () => {
    const muster = Array.from({ length: 10 }, (_, z) => ziffernMuster(String(z)));
    for (const m of muster) {
      assert.equal(m.length, 9);
      assert.ok(m.every((z) => z.length === 5));
    }
    for (let a = 0; a < 10; a++) for (let b = a + 1; b < 10; b++) assert.notDeepEqual(muster[a], muster[b], `${a} = ${b}`);
    assert.ok(Object.keys(SEGMENTE).length === 10);
    assert.throws(() => ziffernMuster('x'), /Keine Ziffer/);
  });
  it('plaketteRaster: 27 x 9 Punkte, rote leuchtende und blasse Geister-Segmente, Warnbild heller, falsches Format ist ein Fehler', () => {
    const r = plaketteRaster('00:30', false);
    assert.equal(r.breite, PLAKETTE_ZIFFERN_BREITE);
    assert.equal(r.hoehe, PLAKETTE_ZIFFERN_HOEHE);
    assert.ok(r.punkte.includes(PLAKETTE_STIL.ziffer) && r.punkte.includes(PLAKETTE_STIL.geist));
    const hell = plaketteRaster('00:30', true);
    assert.ok(hell.punkte.includes(PLAKETTE_STIL.ziffernHell) && !hell.punkte.includes(PLAKETTE_STIL.ziffer));
    assert.ok(!gleich(r, hell));
    assert.throws(() => plaketteRaster('0:30', false), /Format MM:SS/);
  });
  it('plaketteRaster: verschiedene Zeiten geben verschiedene Bilder, gleiche Zeit gleiche Bilder', () => {
    assert.ok(!gleich(plaketteRaster('00:08', false), plaketteRaster('00:09', false)));
    assert.ok(!gleich(plaketteRaster('10:00', false), plaketteRaster('00:10', false)));
    assert.ok(gleich(plaketteRaster('12:34', false), plaketteRaster('12:34', false)));
  });
  it('Plakette: Stoppuhr mit rotem Sektor, Tasse und Blatt-Symbol sind Sprites mit Umriss', () => {
    for (const r of [stoppuhrRaster(true), stoppuhrRaster(false), tasseRaster(), blattSymbolRaster()]) assert.deepEqual(pruefeSprite(r, 20), []);
    assert.ok(hatFarbe(stoppuhrRaster(true), PALETTE.krawatteRot));
    assert.ok(hatFarbe(tasseRaster(), PALETTE.kaffee));
    assert.ok(hatFarbe(blattSymbolRaster(), PALETTE.papierLinie));
  });
});

describe('Knöpfe und Fenster', () => {
  it('knopfZustand: normal, Hover und gedrückt unterscheiden sich, gedrückt vertauscht Licht und Schatten', () => {
    for (const art of KNOPF_ARTEN) {
      const n = knopfZustand(art, 'normal');
      const h = knopfZustand(art, 'hover');
      const g = knopfZustand(art, 'gedrueckt');
      assert.notEqual(n.flaeche, h.flaeche, art);
      assert.equal(h.flaeche, g.flaeche, art);
      assert.equal(g.licht, h.schatten, art);
      assert.equal(g.schatten, h.licht, art);
      assert.equal(n.licht, KANTEN.licht, art);
    }
  });
  it('knopfRechtecke: schwarzer Umriss zuerst und außen, alle Rechtecke im Knopf, Lichtkante gelb, Zustände ergeben andere Farben', () => {
    const r = knopfRechtecke(240, 338, 320, 64, 'stufe', 'normal');
    assert.deepEqual([r[0].x, r[0].y, r[0].b, r[0].h, r[0].farbe], [240, 338, 320, 64, KANTEN.umriss]);
    for (const q of r) assert.ok(q.x >= 240 && q.y >= 338 && q.x + q.b <= 560 && q.y + q.h <= 402, JSON.stringify(q));
    assert.ok(r.some((q) => q.farbe === KANTEN.licht));
    assert.notDeepEqual(knopfRechtecke(240, 338, 320, 64, 'stufe', 'hover'), r);
    assert.notDeepEqual(knopfRechtecke(240, 338, 320, 64, 'stufe', 'gedrueckt'), r);
  });
  it('fensterRechtecke: Umriss außen, vier Eck-Dekore, Namensleiste in Gelb liegt im Fenster; Fenster mit 4 Antworten wächst nach oben', () => {
    for (const n of [3, 4]) {
      const d = dialogRechtecke(n);
      const f = d.fenster;
      const leiste = { x: f.x + 22, y: d.name.y, b: f.breite - 44, h: d.name.hoehe };
      const r = fensterRechtecke(f.x, f.y, f.breite, f.hoehe, FENSTER_STIL.flaeche, leiste);
      assert.deepEqual([r[0].x, r[0].y, r[0].b, r[0].h], [f.x, f.y, f.breite, f.hoehe]);
      assert.equal(r.filter((q) => q.farbe === FENSTER_STIL.eck).length, 4);
      assert.ok(r.some((q) => q.farbe === FENSTER_STIL.leiste && q.x === leiste.x && q.y === leiste.y));
      for (const q of r) assert.ok(q.x >= f.x && q.y >= f.y && q.x + q.b <= f.x + f.breite && q.y + q.h <= f.y + f.hoehe, `${n}: ${JSON.stringify(q)}`);
      // alle Antwortknöpfe liegen im Fenster
      for (const k of d.knoepfe) assert.ok(k.y >= f.y && k.y + k.hoehe <= f.y + f.hoehe);
    }
    assert.ok(dialogRechtecke(4).fenster.y < dialogRechtecke(3).fenster.y);
  });
  it('plaketteRechtecke: dunkle Plakette mit Umriss, innen liegen alle Teile', () => {
    const r = plaketteRechtecke(310, 6, 180, 52);
    assert.deepEqual([r[0].x, r[0].y, r[0].b, r[0].h], [310, 6, 180, 52]);
    assert.ok(r.some((q) => q.farbe === PLAKETTE_STIL.flaeche));
  });
  it('Menühintergrund: 400 x 320 Punkte mit Deckenlicht, Fenstern, Fliesen und Teppich', () => {
    const r = menueHintergrund();
    assert.deepEqual([r.breite, r.hoehe], [400, 320]);
    for (const f of [PALETTE.lampeKern, PALETTE.fenster, PALETTE.fliesenHell, PALETTE.teppich, PALETTE.wandLinks]) assert.ok(r.punkte.includes(f), f.toString(16));
    assert.ok(r.punkte.every((f) => f !== -1));
  });
});

describe('HUD und Klickflächen', () => {
  const stufenTexte = STUFEN.map((s) => stufenZeile(STUFEN_NAMEN[s], zeitText(TIMER_SEKUNDEN[s])));
  const raeume = ['Vorzimmer', 'Großraumbüro', 'Chefbüro'].map((n) => `Raum: ${n}`);
  it('HUD: Plakette, Raumtext, Stufenzeile (zwei Zeilen), Kaffee-Symbol, Kaffee-Text und beide Knöpfe überlappen sich in keiner Stufe und keinem Raum', () => {
    let geprueft = 0;
    for (const raum of raeume) {
      for (const stufe of stufenTexte) {
        const r = hudRechtecke(raum, stufe);
        const namen = Object.keys(r);
        assert.ok(namen.length >= 8, namen.join(','));
        for (let a = 0; a < namen.length; a++) {
          for (let b = a + 1; b < namen.length; b++) {
            assert.ok(!ueberlappt(r[namen[a]], r[namen[b]]), `${raum} / ${stufe}: ${namen[a]} schneidet ${namen[b]}`);
            geprueft++;
          }
        }
      }
    }
    assert.ok(geprueft > 100);
  });
  it('HUD: Zahlen des Endstands (Plakette 180 x 52 bei x 310 bis 490, Stufenzeile Umbruch 300, Zeile 1 x 10 bis 310, Raumtext x 10 bis 226)', () => {
    const r = hudRechtecke('Raum: Großraumbüro', stufenTexte[0]);
    assert.deepEqual([r.plakette.x, r.plakette.y, r.plakette.b, r.plakette.h], [310, 6, 180, 52]);
    assert.deepEqual([r.raum.x, r.raum.y, r.raum.b, r.raum.h], [10, 8, 216, 22]);
    assert.deepEqual([r.stufe1.x, r.stufe1.y, r.stufe1.b, r.stufe1.h], [10, 38, 300, 22]);
    assert.equal(r.stufe2.y, 60);
    assert.deepEqual([r.zurueck.x, r.zurueck.y, r.zurueck.b, r.zurueck.h], [620, 10, 170, 36]);
    assert.deepEqual([r.inventar.x, r.inventar.y, r.inventar.b, r.inventar.h], [620, 52, 170, 36]);
    assert.ok(r.kaffeeText.y >= 84 && r.kaffeeSymbol.y >= 88 && r.kaffeeText.y >= r.stufe2.y + r.stufe2.h);
  });
  it('ueberlappt: Berührung nur an der Kante ist frei, eine Überschneidung nicht (zulässt Zeile bis genau x=310, weist ab 360 breite Zeile)', () => {
    assert.equal(ueberlappt(R(10, 38, 300, 22), R(310, 6, 180, 52)), false);
    assert.equal(ueberlappt(R(10, 38, 360, 22), R(310, 6, 180, 52)), true);
    assert.equal(ueberlappt(R(294, 6, 212, 52), R(10, 38, 360, 22)), true);
  });
  it('HUD: ein Layout-Wert, der Stufenzeile und Plakette schneidet, würde erkannt (stufeX 300 statt 10)', () => {
    const r = hudRechtecke('Raum: Vorzimmer', stufenTexte[0]);
    const verschoben = { ...r.stufe1, x: 300 };
    assert.equal(ueberlappt(verschoben, r.plakette), true);
    assert.equal(ueberlappt(r.stufe1, r.plakette), false);
    assert.equal(HUD_LAYOUT.stufeX, 10);
  });
  it('Klickflächen unverändert (Rechenvergleich vorher/nachher): Stufenknöpfe, Speicher löschen, Zurück, Inventar, Meldungsknöpfe', () => {
    const w = BILD_GROESSE.breite;
    const L = MENUE_LAYOUT;
    const stufen = STUFEN.map((_, i) => [w / 2 - L.knopfBreite / 2, L.stufeY0 + i * L.stufeAbstand - L.knopfHoehe / 2, L.knopfBreite, L.knopfHoehe]);
    assert.deepEqual(stufen, [[240, 338, 320, 64], [240, 418, 320, 64], [240, 498, 320, 64]]);
    const M = MENUE_SPEICHER;
    assert.deepEqual([M.knopfX - M.knopfBreite / 2, M.y - M.knopfHoehe / 2, M.knopfBreite, M.knopfHoehe], [520, 580, 240, 44]);
    const r = hudRechtecke('Raum: Vorzimmer', stufenTexte[0]);
    assert.deepEqual([r.zurueck.x, r.zurueck.y, r.zurueck.b, r.zurueck.h], [620, 10, 170, 36]);
    assert.deepEqual([INVENTAR_KNOPF.x, INVENTAR_KNOPF.y, INVENTAR_KNOPF.breite, INVENTAR_KNOPF.hoehe], [620, 52, 170, 36]);
    const m = MELDUNG_LAYOUT;
    const hoehe = BILD_GROESSE.hoehe;
    assert.deepEqual([w / 2 - m.knopfDx - m.knopfBreite / 2, hoehe / 2 + m.knopfDy - m.knopfHoehe / 2, m.knopfBreite, m.knopfHoehe], [195, 322, 190, 56]);
    assert.deepEqual([w / 2 + m.knopfDx - m.knopfBreite / 2, hoehe / 2 + m.knopfDy - m.knopfHoehe / 2], [415, 322]);
  });
});

describe('Kontrast (E2)', () => {
  const mind = 4.5;
  it('jede Knopfart hat einen Stil, und Text auf Fläche erreicht in normal und Hover mindestens 4,5 : 1', () => {
    assert.deepEqual([...KNOPF_ARTEN].sort(), Object.keys(KNOPF_STILE).sort());
    assert.equal(KNOPF_ARTEN.length, 6);
    for (const art of KNOPF_ARTEN) {
      const s = KNOPF_STILE[art];
      assert.ok(kontrastverhaeltnis(s.text, s.flaeche) >= mind, `${art} normal: ${kontrastverhaeltnis(s.text, s.flaeche)}`);
      assert.ok(kontrastverhaeltnis(s.text, s.hover) >= mind, `${art} Hover: ${kontrastverhaeltnis(s.text, s.hover)}`);
    }
  });
  it('Fenster: Text, Kosten und Gegenstände auf der Fensterfläche, Namensleiste, Plakettenziffern auf der Plakette erreichen mindestens 4,5 : 1', () => {
    const paare: [string, number, number][] = [
      ['Fenstertext', FENSTER_STIL.text, FENSTER_STIL.flaeche],
      ['Kostenzeile', FENSTER_STIL.kosten, FENSTER_STIL.flaeche],
      ['Kostenfarbe Konstante', Number.parseInt(DIALOG_KOSTEN_FARBE.slice(1), 16), FENSTER_STIL.flaeche],
      ['Namensleiste', FENSTER_STIL.leisteText, FENSTER_STIL.leiste],
      ['Inventartext', FENSTER_STIL.text, FENSTER_STIL.inventarFlaeche],
      ['Inventar-Gegenstände', FENSTER_STIL.kosten, FENSTER_STIL.inventarFlaeche],
      ['Plakettenziffer', PLAKETTE_STIL.ziffer, PLAKETTE_STIL.flaeche],
      ['Plakettenziffer hell', PLAKETTE_STIL.ziffernHell, PLAKETTE_STIL.flaeche],
    ];
    for (const [name, text, flaeche] of paare) assert.ok(kontrastverhaeltnis(text, flaeche) >= mind, `${name}: ${kontrastverhaeltnis(text, flaeche)}`);
  });
  it('Kontrast: Weiß auf 0x335577 wird zugelassen, Weiß auf Gelb abgewiesen, Hover liegt nicht unter 4,5', () => {
    assert.ok(kontrastverhaeltnis(0xffffff, 0x335577) >= mind);
    assert.ok(kontrastverhaeltnis(0xffffff, 0xf2d24b) < mind);
    assert.ok(kontrastverhaeltnis(0xffffff, 0x4477aa) >= mind);
  });
});
