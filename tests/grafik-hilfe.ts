// Gemeinsame Helfer der Grafiktests (keine Testdatei).
import { PALETTE } from '../src/config.ts';
import { DURCHSICHTIG, gefuelltAnzahl, randOhneUmriss } from '../src/grafik/raster.ts';
import type { Raster } from '../src/grafik/raster.ts';

// Liste der Maengel eines Sprites: nicht leer, mehrere Farben, Umrissfarbe vorhanden, jeder Randpunkt traegt den Umriss.
// Leere Liste = Sprite in Ordnung.
export function pruefeSprite(r: Raster, mindestPunkte = 30): string[] {
  const probleme: string[] = [];
  const n = gefuelltAnzahl(r);
  if (n < mindestPunkte) probleme.push(`zu wenige gefuellte Punkte: ${n}`);
  const farben = new Set<number>();
  for (const f of r.punkte) if (f !== DURCHSICHTIG && f !== PALETTE.umriss) farben.add(f);
  if (farben.size < 2) probleme.push(`weniger als 2 Farben ausser dem Umriss: ${farben.size}`);
  if (!r.punkte.includes(PALETTE.umriss)) probleme.push('keine Umrissfarbe vorhanden');
  const rand = randOhneUmriss(r, PALETTE.umriss);
  if (rand.length > 0) probleme.push(`${rand.length} Randpunkte ohne Umrissfarbe, erster bei ${rand[0][0]},${rand[0][1]}`);
  return probleme;
}

export function hatFarbe(r: Raster, farbe: number): boolean {
  return r.punkte.includes(farbe);
}
