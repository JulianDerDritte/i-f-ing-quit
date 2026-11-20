// Hilfen zur Palette (die Farben selbst stehen als PALETTE in config.ts).
export function tonen(farbe: number, faktor: number): number {
  const r = Math.min(255, Math.round(((farbe >> 16) & 0xff) * faktor));
  const g = Math.min(255, Math.round(((farbe >> 8) & 0xff) * faktor));
  const b = Math.min(255, Math.round((farbe & 0xff) * faktor));
  return (r << 16) | (g << 8) | b;
}

function linear(k: number): number {
  const c = k / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function leuchtdichte(farbe: number): number {
  return 0.2126 * linear((farbe >> 16) & 0xff) + 0.7152 * linear((farbe >> 8) & 0xff) + 0.0722 * linear(farbe & 0xff);
}

// Kontrastverhaeltnis nach WCAG (1 bis 21).
export function kontrastverhaeltnis(a: number, b: number): number {
  const la = leuchtdichte(a);
  const lb = leuchtdichte(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
