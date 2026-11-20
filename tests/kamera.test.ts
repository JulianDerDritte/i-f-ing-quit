// Tests der Kamera-Rechnungen (src/grafik/kamera.ts) und der Masse zu Zoom und Skala (A-012).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BILD_GROESSE, KACHEL_BREITE, KACHEL_HOEHE, KAMERA_LERP, KAMERA_ZOOM, MASCHINE_SCHRIFT_PX, NPC_SCHRIFT_PX, SPRITE_SKALA, WAND_HOEHE } from '../src/config.ts';
import { KARTE } from '../src/karte.ts';
import { figurBild } from '../src/grafik/figuren.ts';
import { weltObjekte } from '../src/grafik/welt.ts';
import { anzeigePunkt, effektiveGlyphHoehe, kameraGrenzen, pruefeZuordnung, richteKamerasEin, sichtbarerAusschnitt, weltTextSkala } from '../src/grafik/kamera.ts';
import type { KameraSchnittstelle, KameraVerwaltung } from '../src/grafik/kamera.ts';

// Rotprobe: rot gesehen am 20.11.2026 (Wirkstellen der Mutation, je Test mindestens eine, danach wieder grün; Nachweiszeilen im
// Bericht A-012): F-01/F-04 config.ts:143 (Zoom 1); F-02 kamera.ts:31; F-03 kamera.ts:25 (Höhe), :22 (x), :44 (Lerp);
// F-06 config.ts:424; F-08 kamera.ts:40 (relativer Zoom und wachsender Zoom); E7 kamera.ts:45 (Oberflächenkamera fehlt), :46
// (Zoom 2), :47 (Scroll); H5 kamera.ts:43 und :48; E2 kamera.ts:54; E5 kamera.ts:64; E7 pruefeZuordnung kamera.ts:74 und :75

// Nachgebaute Kamera: misst den Zustand nach dem Aufruf (Zoom, Grenzen, Runden), nicht das Protokoll der Aufrufe.
class Kamera implements KameraSchnittstelle {
  zoom = 1;
  grenzen: { x: number; y: number; breite: number; hoehe: number } | null = null;
  rund = false;
  scroll: [number, number] = [7, 7];
  folgt: { ziel: object; rund: boolean; lerpX: number; lerpY: number } | null = null;
  groesse: [number, number, number, number] | null = null;
  setZoom(zoom: number): this {
    this.zoom = zoom;
    return this;
  }
  setBounds(x: number, y: number, breite: number, hoehe: number): this {
    this.grenzen = { x, y, breite, hoehe };
    return this;
  }
  setRoundPixels(rund: boolean): this {
    this.rund = rund;
    return this;
  }
  setScroll(x: number, y: number): this {
    this.scroll = [x, y];
    return this;
  }
  startFollow(ziel: object, rund: boolean, lerpX: number, lerpY: number): this {
    this.folgt = { ziel, rund, lerpX, lerpY };
    return this;
  }
}
class Verwaltung implements KameraVerwaltung<Kamera> {
  main = new Kamera();
  zusaetzlich: Kamera[] = [];
  add(x: number, y: number, breite: number, hoehe: number): Kamera {
    const k = new Kamera();
    k.groesse = [x, y, breite, hoehe];
    this.zusaetzlich.push(k);
    return k;
  }
}

describe('Zoom und Skala (A-012)', () => {
  it('F-01 KAMERA_ZOOM ist genau 2, ganzzahlig und liegt in 1,75 bis 2,25', () => {
    assert.equal(KAMERA_ZOOM, 2);
    assert.ok(Number.isInteger(KAMERA_ZOOM));
    assert.ok(KAMERA_ZOOM >= 1.75 && KAMERA_ZOOM <= 2.25);
    assert.equal(SPRITE_SKALA, 1);
  });
  it('F-02 sichtbarer Ausschnitt: Breite und Höhe in Kachelmaßen höchstens das 0,55-fache von heute (6,25 mal 10 statt 12,5 mal 20)', () => {
    const heute = sichtbarerAusschnitt(1);
    assert.equal(heute.kachelnX, BILD_GROESSE.breite / KACHEL_BREITE);
    assert.equal(heute.kachelnY, BILD_GROESSE.hoehe / KACHEL_HOEHE);
    const neu = sichtbarerAusschnitt(KAMERA_ZOOM);
    assert.ok(neu.kachelnX <= 0.55 * heute.kachelnX, `${neu.kachelnX}`);
    assert.ok(neu.kachelnY <= 0.55 * heute.kachelnY, `${neu.kachelnY}`);
    assert.equal(neu.kachelnX, 6.25);
    assert.equal(neu.kachelnY, 10);
    assert.equal(neu.breite, 400);
    assert.equal(neu.hoehe, 320);
  });
  it('F-03 kameraGrenzen: Kartenmaße samt Wandhöhe (x -576, y -56, 1600 mal 856), die Kamera folgt ohne Verzögerung', () => {
    assert.deepEqual(kameraGrenzen(KARTE), { x: -576, y: -WAND_HOEHE, breite: 1600, hoehe: 856 });
    assert.equal(KAMERA_LERP, 1);
  });
  it('F-03 alle Weltobjekte liegen in den Kameragrenzen und das Bild von 400 mal 320 Weltpunkten passt hinein', () => {
    const g = kameraGrenzen(KARTE);
    for (const o of weltObjekte(KARTE)) {
      const r = o.raster();
      assert.ok(o.bildX - r.breite / 2 >= g.x && o.bildX + r.breite / 2 <= g.x + g.breite, `${o.art} ${o.x},${o.y} waagerecht`);
      assert.ok(o.bildY - r.hoehe >= g.y && o.bildY <= g.y + g.hoehe, `${o.art} ${o.x},${o.y} senkrecht`);
    }
    const a = sichtbarerAusschnitt(KAMERA_ZOOM);
    assert.ok(a.breite <= g.breite && a.hoehe <= g.hoehe);
  });
  it('F-04 Spieler auf dem Bildschirm 1,8 bis 2,2 mal so hoch wie vor A-012 (18 Rasterzeilen mal Skala 2 mal Zoom 1 = 36)', () => {
    const heute = 18 * 2 * 1;
    const neu = figurBild('ul', 0, false).hoehe * SPRITE_SKALA * KAMERA_ZOOM;
    const faktor = neu / heute;
    assert.ok(faktor >= 1.8 && faktor <= 2.2, `${neu} Bildschirmpunkte, Faktor ${faktor}`);
  });
  it('F-06 das Spielfenster bleibt 800 mal 640 Bildpunkte', () => {
    assert.deepEqual(BILD_GROESSE, { breite: 800, hoehe: 640 });
  });
});

describe('richteKamerasEin (Szenenstart)', () => {
  const ziel = {};
  it('F-08 Hauptkamera mit schon gesetztem Zoom 2 (Zustand nach einem Lauf): Zoom danach 2 (nicht 4), Grenzen gesetzt, genau eine Oberflächenkamera', () => {
    const v = new Verwaltung();
    v.main.zoom = 2;
    const k = richteKamerasEin(v, ziel, KARTE);
    assert.equal(k.haupt.zoom, 2);
    assert.equal(k.haupt.zoom, KAMERA_ZOOM);
    assert.deepEqual(k.haupt.grenzen, kameraGrenzen(KARTE));
    assert.equal(v.zusaetzlich.length, 1);
    assert.equal(k.oberflaeche, v.zusaetzlich[0]);
  });
  it('F-08 Menü, Spiel, Menü, Spiel: jeder Start mit frischen Kameras ergibt denselben Zustand', () => {
    const lauf = () => {
      const v = new Verwaltung();
      const k = richteKamerasEin(v, ziel, KARTE);
      return { zoom: k.haupt.zoom, grenzen: k.haupt.grenzen, ui: k.oberflaeche.zoom, anzahl: v.zusaetzlich.length };
    };
    assert.deepEqual(lauf(), lauf());
  });
  it('E7 Oberflächenkamera: ganzes Bild, Zoom 1, Scroll 0', () => {
    const v = new Verwaltung();
    const k = richteKamerasEin(v, ziel, KARTE);
    assert.deepEqual(k.oberflaeche.groesse, [0, 0, BILD_GROESSE.breite, BILD_GROESSE.hoehe]);
    assert.equal(k.oberflaeche.zoom, 1);
    assert.deepEqual(k.oberflaeche.scroll, [0, 0]);
  });
  it('E7 Oberflächenkamera fehlt nicht: genau eine zusätzliche Kamera, die nicht die Hauptkamera ist', () => {
    const v = new Verwaltung();
    const k = richteKamerasEin(v, ziel, KARTE);
    assert.equal(v.zusaetzlich.length, 1);
    assert.notEqual(k.oberflaeche, k.haupt);
  });
  it('H5 beide Kameras runden auf ganze Punkte', () => {
    const v = new Verwaltung();
    const k = richteKamerasEin(v, ziel, KARTE);
    assert.equal(k.haupt.rund, true);
    assert.equal(k.oberflaeche.rund, true);
  });
  it('F-03 die Hauptkamera folgt dem Ziel ohne Verzögerung', () => {
    const v = new Verwaltung();
    const k = richteKamerasEin(v, ziel, KARTE);
    assert.ok(k.haupt.folgt !== null);
    assert.equal(k.haupt.folgt.ziel, ziel);
    assert.equal(k.haupt.folgt.lerpX, 1);
    assert.equal(k.haupt.folgt.lerpY, 1);
  });
});

describe('Texte der Welt, Rundung, Zuordnung', () => {
  it('E2 weltTextSkala: effektive Glyphhöhe der Welt-Texte 14 (12 bis 16); Skala 2 (28) und 0,5 (7) werden abgewiesen', () => {
    for (const px of [NPC_SCHRIFT_PX, MASCHINE_SCHRIFT_PX]) {
      const h = effektiveGlyphHoehe(weltTextSkala(px));
      assert.equal(h, 14, `${px}`);
      assert.ok(h >= 12 && h <= 16);
    }
    for (const falsch of [2, 0.5]) {
      const h = effektiveGlyphHoehe(falsch);
      assert.ok(h < 12 || h > 16, `Skala ${falsch} gibt ${h}`);
    }
  });
  it('E5 anzeigePunkt: gerundet auf ganze Weltpunkte (100,4 gibt 100, 100,5 gibt 101), nie ein gebrochener Wert', () => {
    assert.deepEqual(anzeigePunkt(100.4, 7.6), { x: 100, y: 8 });
    assert.deepEqual(anzeigePunkt(100.5, -3.5), { x: 101, y: -3 });
    for (const w of [0.1, 55.49, 55.5, -12.7, 1599.999]) {
      const p = anzeigePunkt(w, w);
      assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y), `${w}`);
    }
  });
  it('E7 pruefeZuordnung: genau ein gesetztes Bit der beiden Kameras ist in Ordnung', () => {
    assert.deepEqual(pruefeZuordnung([1, 2, 1 | 4, 2 | 4], 1, 2), []);
  });
  it('E7 pruefeZuordnung: 0 Bits (doppelt gezeichnet) wird abgewiesen', () => {
    const f = pruefeZuordnung([1, 0, 4], 1, 2);
    assert.equal(f.length, 2);
    assert.match(f[0], /doppelt/);
  });
  it('E7 pruefeZuordnung: beide Bits (unsichtbar) wird abgewiesen', () => {
    const f = pruefeZuordnung([3, 1], 1, 2);
    assert.equal(f.length, 1);
    assert.match(f[0], /unsichtbar/);
  });
});
