// Einzige Stelle fuer Spielwerte.
export type Stufe = 'leicht' | 'normal' | 'schwer';

export const TIMER_SEKUNDEN: Record<Stufe, number> = {
  leicht: 600,
  normal: 450,
  schwer: 300,
};

export const STUFEN: readonly Stufe[] = ['leicht', 'normal', 'schwer'];

export const STUFEN_NAMEN: Record<Stufe, string> = {
  leicht: 'Leicht',
  normal: 'Normal',
  schwer: 'Schwer',
};

export const DIALOG_SEKUNDEN = {
  min: 30,
  max: 60,
};

export function zeitText(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
