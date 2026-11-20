// Gemeinsame Helfer der Tests (keine Testdatei).
import type { SpeicherQuelle } from '../src/speicher.ts';

export interface ErsatzSpeicher extends SpeicherQuelle {
  daten: Map<string, string>;
}

// Ersatz fuer localStorage; je Schalter wirft der Zugriff, wie ein gesperrter Browserspeicher.
export function ersatzSpeicher(wirft: { lesen?: boolean; schreiben?: boolean; loeschen?: boolean } = {}): ErsatzSpeicher {
  const daten = new Map<string, string>();
  return {
    daten,
    getItem(k) {
      if (wirft.lesen) throw new Error('Lesen gesperrt');
      return daten.has(k) ? (daten.get(k) as string) : null;
    },
    setItem(k, v) {
      if (wirft.schreiben) throw new Error('Schreiben gesperrt');
      daten.set(k, String(v));
    },
    removeItem(k) {
      if (wirft.loeschen) throw new Error('Loeschen gesperrt');
      daten.delete(k);
    },
  };
}
