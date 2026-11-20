// Tests der Pixelschrift (src/grafik/schrift.ts): Zeichensatz, Zeichenabdeckung aller Szenentexte, Raster, Umbruch, Skala.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIALOG_ANTWORT_SCHRIFT_PX,
  DIALOG_LAYOUT,
  DIALOG_NAME_SCHRIFT_PX,
  DIALOG_TEXT_SCHRIFT_PX,
  HINWEIS_SCHRIFT_PX,
  HUD_LAYOUT,
  INVENTAR_KNOPF,
  INVENTAR_LAYOUT,
  INVENTAR_SCHRIFT_PX,
  INVENTAR_TITEL_SCHRIFT_PX,
  KAFFEE_HINWEIS_TEXT,
  KAFFEE_HUD,
  MASCHINE_SCHRIFT_PX,
  MELDUNG_KNOPF_SCHRIFT_PX,
  MELDUNG_LAYOUT,
  MELDUNG_SCHRIFT_PX,
  MELDUNG_ZEIT_SCHRIFT_PX,
  MENUE_LAYOUT,
  MENUE_SPEICHER,
  NPC_SCHRIFT_PX,
  STUFEN_NAMEN,
  SZENEN_TEXTE,
  VERSCHUETTET_MELDUNG,
  zeitText,
  PALETTE,
} from '../src/config.ts';
import { DIALOGE, antwortBeschriftung, kostenZeile, starteGespraech } from '../src/dialog.ts';
import { inventarSeiten, neuesInventar } from '../src/inventar.ts';
import { BEREICH_ANZEIGE } from '../src/karte.ts';
import { NPCS } from '../src/npcs.ts';
import { GLYPH_HOEHE, VORSCHUB, VORSCHUB_ENG, ZEICHENSATZ, ZEILE, fehlendeZeichen, pixelSkala, textMasse, textRaster, umbrechen } from '../src/grafik/schrift.ts';
import { DURCHSICHTIG, gleich } from '../src/grafik/raster.ts';

const STUFEN_NAMEN_LISTE = Object.values(STUFEN_NAMEN);

// Rotprobe: rot gesehen am 20.11.2026 (Kennung Wirkstelle der Mutation, je Test mindestens eine, danach wieder grün;
// Nachweiszeilen im Bericht A-009b): S1a schrift.ts:68; S1b schrift.ts:93; S2a schrift.ts:91; S2b schrift.ts:90; S2c
// schrift.ts:15; S3a schrift.ts:106; S3b schrift.ts:95; S4a schrift.ts:147; S4b schrift.ts:146; S4c schrift.ts:146; S5a
// schrift.ts:100; S5b schrift.ts:100; S6 config.ts:381; S7 dialog.ts:30; S8 inventar.ts:97; S9a schrift.ts:8; S9b
// schrift.ts:178; S10a schrift.ts:9; S10b config.ts:201; S11 schrift.ts:170; S12 schrift.ts:189; S13a schrift.ts:164;
// S13b schrift.ts:164; S14 schrift.ts:164; S15a config.ts:218; S15b config.ts:67
describe('Pixelschrift: Zeichensatz', () => {
  it('Zeichensatz: Buchstaben, Ziffern, Umlaute, ß und die Satzzeichen . , : ; ! ? ( ) [ ] - / + „ “ · − sind vorhanden', () => {
    const soll = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?()[]-/+„“·−äöüÄÖÜß'];
    for (const c of soll) assert.ok(ZEICHENSATZ.includes(c), `fehlt: ${c}`);
  });
  it('fehlendeZeichen: „E/Leertaste“ und „−“ sind setzbar, ein „%“ wird abgewiesen', () => {
    assert.deepEqual(fehlendeZeichen('E/Leertaste: Kaffee nehmen'), []);
    assert.deepEqual(fehlendeZeichen('(−0:05)'), []);
    assert.deepEqual(fehlendeZeichen('100% sicher'), ['%']);
    assert.deepEqual(fehlendeZeichen('a%b%c#'), ['%', '#']);
  });
  it('jedes Zeichen außer dem Leerzeichen hat Punkte, alle Zeichen sehen paarweise verschieden aus (ausgenommen Minus und Bindestrich)', () => {
    const raster = new Map<string, ReturnType<typeof textRaster>>();
    for (const c of ZEICHENSATZ) {
      const r = textRaster(c, 0xffffff, null);
      if (c !== ' ') assert.ok(r.punkte.some((f) => f !== DURCHSICHTIG), `leer: ${c}`);
      raster.set(c, r);
    }
    const zeichen = ZEICHENSATZ.filter((c) => c !== '−');
    for (let a = 0; a < zeichen.length; a++) {
      for (let b = a + 1; b < zeichen.length; b++) assert.ok(!gleich(raster.get(zeichen[a])!, raster.get(zeichen[b])!), `${zeichen[a]} = ${zeichen[b]}`);
    }
  });
  it('Umlaute: ä, ö, ü haben zwei Punkte über dem Grundbuchstaben, Ä, Ö, Ü zwei Punkte in der Akzentzeile', () => {
    for (const [u, b] of [['ä', 'a'], ['ö', 'o'], ['ü', 'u']]) {
      const ru = textRaster(u, 1, null);
      const rb = textRaster(b, 1, null);
      assert.ok(!gleich(ru, rb), u);
      const punkteOben = [1, 3].map((x) => ru.punkte[2 * ru.breite + x]);
      assert.deepEqual(punkteOben, [1, 1], `${u} Punkte in Zeile 2`);
    }
    for (const [u, b] of [['Ä', 'A'], ['Ö', 'O'], ['Ü', 'U']]) {
      const ru = textRaster(u, 1, null);
      assert.ok(!gleich(ru, textRaster(b, 1, null)), u);
      assert.deepEqual([1, 3].map((x) => ru.punkte[x]), [1, 1], `${u} Punkte in Akzentzeile 0`);
    }
  });
  it('Unterlängen: g, j, p, q, y und das Komma reichen unter die Grundlinie', () => {
    for (const c of ['g', 'j', 'p', 'q', 'y', ',']) {
      const r = textRaster(c, 1, null);
      let unten = 0;
      for (let y = 9; y < ZEILE; y++) for (let x = 0; x < r.breite; x++) if (r.punkte[y * r.breite + x] !== DURCHSICHTIG) unten++;
      assert.ok(unten > 0, c);
    }
    const a = textRaster('a', 1, null);
    assert.ok(a.punkte.slice(9 * a.breite).every((f) => f === DURCHSICHTIG));
  });
});

describe('Pixelschrift: Zeichenabdeckung der Szenentexte', () => {
  it('jeder feste Text der Szenen (SZENEN_TEXTE, Kaffee-Hinweis, Stufen, Bereiche, Meldung) lässt sich setzen', () => {
    const texte = [...Object.values(SZENEN_TEXTE), KAFFEE_HINWEIS_TEXT, ...Object.values(STUFEN_NAMEN), ...Object.values(BEREICH_ANZEIGE), 'Kaffee verschüttet!', `${STUFEN_NAMEN.leicht}  ${zeitText(90)}`];
    const fehlt = texte.flatMap((t) => fehlendeZeichen(t));
    assert.deepEqual(fehlt, []);
    assert.ok(texte.length >= 30);
  });
  it('jeder Dialogtext, jede Antwort (mit Zeitzusatz „(−m:ss)“), jede Info und jeder Name lässt sich setzen', () => {
    const fehlt: string[] = [];
    let n = 0;
    for (const [id, baum] of Object.entries(DIALOGE)) {
      const z = starteGespraech(id);
      for (const k of Object.values(baum.knoten)) {
        const alle = [...k.antworten, ...(k.kaffeeAntwort ? [k.kaffeeAntwort] : [])];
        const texte = [k.text, k.info ?? '', ...alle.map((a) => a.text), ...alle.map((a) => antwortBeschriftung(z, a)), ...alle.map((a) => a.info ?? '')];
        for (const t of texte) {
          n++;
          fehlt.push(...fehlendeZeichen(t));
        }
      }
    }
    for (const d of NPCS) fehlt.push(...fehlendeZeichen(d.name));
    fehlt.push(...fehlendeZeichen(kostenZeile(zeitText(5))));
    assert.deepEqual(fehlt, []);
    assert.ok(n > 200, String(n));
  });
  it('jeder Inventartext (leeres Inventar, Seiten mit Infos) lässt sich setzen', () => {
    const leer = neuesInventar([], false);
    assert.deepEqual(fehlendeZeichen(inventarSeiten(leer).join('\n')), []);
    const mit = neuesInventar([{ npc: 'empfang', text: 'Der Chef bleibt bis Feierabend in seinem Büro.', nachfrage: true, kaffee: false }], true);
    assert.deepEqual(fehlendeZeichen(inventarSeiten(mit).join('\n')), []);
  });
});

describe('Pixelschrift: Raster, Umbruch, Größen', () => {
  it('textRaster: Breite = Zeichen × 6 Punkte, Höhe = Zeilen × 11 Punkte, ein Rand macht das Raster 2 Punkte größer', () => {
    const r = textRaster('Abc', 1, null);
    assert.equal(r.breite, 3 * VORSCHUB);
    assert.equal(r.hoehe, ZEILE);
    const z = textRaster('Ab\ncdef', 1, PALETTE.umriss);
    assert.equal(z.breite, 4 * VORSCHUB + 2);
    assert.equal(z.hoehe, 2 * ZEILE + 2);
    assert.deepEqual(textMasse('Ab\ncdef', 2), { breite: 48, hoehe: 44 });
  });
  it('enger Vorschub: „Zurück zum Menü“ passt damit in den Knopf (150 Punkte), mit normalem Vorschub nicht (180 Punkte)', () => {
    const innen = HUD_LAYOUT.zurueckBreite - 12; // abzueglich Umriss, Rahmen und Lichtkante
    const s = pixelSkala(HUD_LAYOUT.zurueckPx);
    assert.equal(textMasse(SZENEN_TEXTE.zurueckMenue, s, VORSCHUB_ENG).breite, 150);
    assert.ok(textMasse(SZENEN_TEXTE.zurueckMenue, s, VORSCHUB_ENG).breite <= innen);
    assert.equal(textMasse(SZENEN_TEXTE.zurueckMenue, s).breite, 180);
    assert.ok(textMasse(SZENEN_TEXTE.zurueckMenue, s).breite > innen);
    assert.equal(textRaster('Ab', 1, null, VORSCHUB_ENG).breite, 2 * VORSCHUB_ENG);
    // alle anderen Knopfbeschriftungen passen mit normalem Vorschub
    const knoepfe: [string, number, number][] = [
      [SZENEN_TEXTE.inventarKnopf, pixelSkala(INVENTAR_KNOPF.schriftPx), INVENTAR_KNOPF.breite],
      [SZENEN_TEXTE.menueLoeschen, pixelSkala(MENUE_SPEICHER.knopfSchriftPx), MENUE_SPEICHER.knopfBreite],
      [SZENEN_TEXTE.zumMenue, pixelSkala(MELDUNG_KNOPF_SCHRIFT_PX), MELDUNG_LAYOUT.knopfBreite],
      [SZENEN_TEXTE.schliessen, pixelSkala(INVENTAR_SCHRIFT_PX), INVENTAR_LAYOUT.schliessenBreite],
      [SZENEN_TEXTE.zurueck, pixelSkala(INVENTAR_SCHRIFT_PX), INVENTAR_LAYOUT.seiteKnopfBreite],
      ...STUFEN_NAMEN_LISTE.map((n): [string, number, number] => [`${n}  1:30`, pixelSkala(MENUE_LAYOUT.schriftPx), MENUE_LAYOUT.knopfBreite]),
    ];
    for (const [t, sk, b] of knoepfe) assert.ok(textMasse(t, sk).breite <= b - 12, `${t}: ${textMasse(t, sk).breite} > ${b - 12}`);
  });
  it('textRaster: ein Zeichen ohne Glyph ist ein Fehler, kein stilles Weglassen', () => {
    assert.throws(() => textRaster('50%', 1, null), /ohne Glyph/);
  });
  it('umbrechen: bricht an Leerzeichen bei der Breite, ein zu langes Wort bleibt ganz, genau passende Zeile passt', () => {
    assert.equal(umbrechen('aaa bbb ccc', 6 * 2 * 7, 2), 'aaa bbb\nccc');
    assert.equal(umbrechen('aaa bbb', 6 * 2 * 7, 2), 'aaa bbb');
    assert.equal(umbrechen('aaaaaaaaaa b', 6 * 2 * 3, 2), 'aaaaaaaaaa\nb');
    assert.equal(umbrechen('a\nb c', 1000, 2), 'a\nb c');
  });
  it('pixelSkala: ganze Vielfache von 7, nie unter 2', () => {
    assert.deepEqual([12, 14, 16, 18, 20, 22, 24, 28, 40, 48].map(pixelSkala), [2, 2, 2, 2, 2, 3, 3, 4, 5, 6]);
    assert.equal(pixelSkala(1), 2);
  });
  it('Mindestschrift: die effektive Höhe (Skala × 7) jeder Schriftgröße der Szenen ist mindestens 12 Bildpunkte', () => {
    const px = [
      DIALOG_NAME_SCHRIFT_PX, DIALOG_TEXT_SCHRIFT_PX, DIALOG_ANTWORT_SCHRIFT_PX, INVENTAR_SCHRIFT_PX, INVENTAR_TITEL_SCHRIFT_PX, INVENTAR_KNOPF.schriftPx,
      HINWEIS_SCHRIFT_PX, MELDUNG_SCHRIFT_PX, MELDUNG_ZEIT_SCHRIFT_PX, MELDUNG_KNOPF_SCHRIFT_PX, NPC_SCHRIFT_PX, MASCHINE_SCHRIFT_PX, KAFFEE_HUD.schriftPx,
      VERSCHUETTET_MELDUNG.schriftPx, HUD_LAYOUT.raumPx, HUD_LAYOUT.stufePx, HUD_LAYOUT.zurueckPx, MENUE_LAYOUT.titelPx, MENUE_LAYOUT.schriftPx,
      MENUE_SPEICHER.schriftPx, MENUE_SPEICHER.knopfSchriftPx,
    ];
    assert.ok(px.length >= 20);
    for (const p of px) assert.ok(pixelSkala(p) * GLYPH_HOEHE >= 12, String(p));
  });
  it('Texte passen: längste Antwort im Antwortknopf, längster Knotentext in höchstens 4 Zeilen, Inventarzeile in das Textfeld', () => {
    const s = pixelSkala(DIALOG_ANTWORT_SCHRIFT_PX);
    const knopfBreite = DIALOG_LAYOUT.fensterBreite - 2 * DIALOG_LAYOUT.randX;
    let maxAntwort = 0;
    let maxKnoten = 0;
    for (const [id, baum] of Object.entries(DIALOGE)) {
      const z = starteGespraech(id);
      for (const k of Object.values(baum.knoten)) {
        maxKnoten = Math.max(maxKnoten, k.text.length);
        for (const a of [...k.antworten, ...(k.kaffeeAntwort ? [k.kaffeeAntwort] : [])]) maxAntwort = Math.max(maxAntwort, textMasse(antwortBeschriftung(z, a), s).breite);
        const zeilen = umbrechen(k.text, knopfBreite, pixelSkala(DIALOG_TEXT_SCHRIFT_PX)).split('\n').length;
        assert.ok(zeilen <= 4 && zeilen * ZEILE * pixelSkala(DIALOG_TEXT_SCHRIFT_PX) <= DIALOG_LAYOUT.textHoehe, `${zeilen} Zeilen`);
      }
    }
    assert.ok(maxAntwort + 12 <= knopfBreite, `${maxAntwort}`);
    assert.ok(maxKnoten >= 100);
    // zeichenProZeile (E7): Textfeld des Inventars 720 Punkte / Vorschub bei Skala
    const zeichenProZeile = Math.floor((INVENTAR_LAYOUT.fensterBreite - 2 * INVENTAR_LAYOUT.randX) / (VORSCHUB * pixelSkala(INVENTAR_SCHRIFT_PX)));
    assert.ok(INVENTAR_LAYOUT.zeichenProZeile <= zeichenProZeile, `${INVENTAR_LAYOUT.zeichenProZeile} > ${zeichenProZeile}`);
    assert.equal(INVENTAR_LAYOUT.zeichenProZeile, 58);
    assert.ok(INVENTAR_LAYOUT.maxZeilenProSeite * ZEILE * pixelSkala(INVENTAR_SCHRIFT_PX) <= INVENTAR_LAYOUT.infoHoehe);
  });
});
