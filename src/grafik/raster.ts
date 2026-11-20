// Pixelraster ohne Phaser: Punkte als Farbzahl 0xRRGGBB, -1 = durchsichtig. Reine Funktionen (mit Node testbar).
export interface Raster {
  breite: number;
  hoehe: number;
  punkte: Int32Array;
}

export const DURCHSICHTIG = -1;

export function neuesRaster(breite: number, hoehe: number): Raster {
  return { breite, hoehe, punkte: new Int32Array(breite * hoehe).fill(DURCHSICHTIG) };
}

// Eine Zeichenkette je Zeile, ein Zeichen je Punkt; '.' ist durchsichtig, jedes andere Zeichen muss in `farben` stehen.
export function rasterAusZeilen(zeilen: readonly string[], farben: Readonly<Record<string, number>>): Raster {
  const breite = zeilen[0].length;
  const r = neuesRaster(breite, zeilen.length);
  zeilen.forEach((z, y) => {
    if (z.length !== breite) throw new Error(`Zeile ${y} hat ${z.length} statt ${breite} Zeichen: "${z}"`);
    for (let x = 0; x < breite; x++) {
      const c = z[x];
      if (c === '.') continue;
      const f = farben[c];
      if (f === undefined) throw new Error(`Zeichen "${c}" in Zeile ${y} hat keine Farbe`);
      r.punkte[y * breite + x] = f;
    }
  });
  return r;
}

export function punktAn(r: Raster, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= r.breite || y >= r.hoehe) return DURCHSICHTIG;
  return r.punkte[y * r.breite + x];
}

export function setzePunkt(r: Raster, x: number, y: number, farbe: number): void {
  if (x < 0 || y < 0 || x >= r.breite || y >= r.hoehe) throw new Error(`Punkt (${x},${y}) ausserhalb ${r.breite}x${r.hoehe}`);
  r.punkte[y * r.breite + x] = farbe;
}

export function kopie(r: Raster): Raster {
  return { breite: r.breite, hoehe: r.hoehe, punkte: r.punkte.slice() };
}

export function spiegeln(r: Raster): Raster {
  const s = neuesRaster(r.breite, r.hoehe);
  for (let y = 0; y < r.hoehe; y++) {
    for (let x = 0; x < r.breite; x++) s.punkte[y * r.breite + x] = r.punkte[y * r.breite + (r.breite - 1 - x)];
  }
  return s;
}

// Legt `quelle` mit der linken oberen Ecke auf (ox, oy) ueber `ziel`; durchsichtige Punkte bleiben aus. Mit `beschneiden`
// werden Punkte ausserhalb des Ziels uebergangen, sonst ist das ein Fehler.
export function ueberlagern(ziel: Raster, quelle: Raster, ox: number, oy: number, beschneiden = false): void {
  for (let y = 0; y < quelle.hoehe; y++) {
    for (let x = 0; x < quelle.breite; x++) {
      const f = quelle.punkte[y * quelle.breite + x];
      if (f === DURCHSICHTIG) continue;
      const zx = ox + x;
      const zy = oy + y;
      if (zx < 0 || zy < 0 || zx >= ziel.breite || zy >= ziel.hoehe) {
        if (beschneiden) continue;
        throw new Error(`Ueberlagerung ausserhalb: (${zx},${zy}) in ${ziel.breite}x${ziel.hoehe}`);
      }
      ziel.punkte[zy * ziel.breite + zx] = f;
    }
  }
}

export function rechteck(r: Raster, x: number, y: number, b: number, h: number, farbe: number): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + b; i++) setzePunkt(r, i, j, farbe);
}

// Raster mit je einem Punkt Rand rundherum; jeder durchsichtige Punkt mit gefuelltem 4er-Nachbarn wird Umriss.
export function mitUmriss(r: Raster, farbe: number): Raster {
  const z = neuesRaster(r.breite + 2, r.hoehe + 2);
  for (let y = 0; y < r.hoehe; y++) for (let x = 0; x < r.breite; x++) z.punkte[(y + 1) * z.breite + x + 1] = r.punkte[y * r.breite + x];
  const aus = z.punkte.slice();
  const voll = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < z.breite && y < z.hoehe && aus[y * z.breite + x] !== DURCHSICHTIG;
  for (let y = 0; y < z.hoehe; y++) {
    for (let x = 0; x < z.breite; x++) {
      if (aus[y * z.breite + x] !== DURCHSICHTIG) continue;
      if (voll(x - 1, y) || voll(x + 1, y) || voll(x, y - 1) || voll(x, y + 1)) z.punkte[y * z.breite + x] = farbe;
    }
  }
  return z;
}

export function gefuelltAnzahl(r: Raster): number {
  let n = 0;
  for (const f of r.punkte) if (f !== DURCHSICHTIG) n++;
  return n;
}

// Randpunkte (gefuellt, mit durchsichtigem 4er-Nachbarn oder am Rasterrand), die NICHT die Umrissfarbe tragen.
export function randOhneUmriss(r: Raster, umriss: number): [number, number][] {
  const fehler: [number, number][] = [];
  for (let y = 0; y < r.hoehe; y++) {
    for (let x = 0; x < r.breite; x++) {
      const f = r.punkte[y * r.breite + x];
      if (f === DURCHSICHTIG || f === umriss) continue;
      const rand = [punktAn(r, x - 1, y), punktAn(r, x + 1, y), punktAn(r, x, y - 1), punktAn(r, x, y + 1)].some((n) => n === DURCHSICHTIG);
      if (rand) fehler.push([x, y]);
    }
  }
  return fehler;
}

export function gleich(a: Raster, b: Raster): boolean {
  if (a.breite !== b.breite || a.hoehe !== b.hoehe) return false;
  for (let i = 0; i < a.punkte.length; i++) if (a.punkte[i] !== b.punkte[i]) return false;
  return true;
}

// Anteil der Punkte, die in mindestens einem der beiden gleich grossen Raster gefuellt sind und verschieden belegt sind.
export function unterschiedsAnteil(a: Raster, b: Raster): number {
  if (a.breite !== b.breite || a.hoehe !== b.hoehe) throw new Error('Raster verschieden gross');
  let vereinigung = 0;
  let verschieden = 0;
  for (let i = 0; i < a.punkte.length; i++) {
    if (a.punkte[i] === DURCHSICHTIG && b.punkte[i] === DURCHSICHTIG) continue;
    vereinigung++;
    if (a.punkte[i] !== b.punkte[i]) verschieden++;
  }
  return vereinigung === 0 ? 0 : verschieden / vereinigung;
}

// RGBA-Bytes fuer eine Canvas-Textur oder PNG.
export function rasterAlsRgba(r: Raster): Uint8ClampedArray {
  const d = new Uint8ClampedArray(r.breite * r.hoehe * 4);
  for (let i = 0; i < r.punkte.length; i++) {
    const f = r.punkte[i];
    if (f === DURCHSICHTIG) continue;
    d[i * 4] = (f >> 16) & 0xff;
    d[i * 4 + 1] = (f >> 8) & 0xff;
    d[i * 4 + 2] = f & 0xff;
    d[i * 4 + 3] = 255;
  }
  return d;
}
