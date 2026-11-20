// Dialogsysteme (ohne Phaser): Dialogbaeume als Daten, Gespraechsablauf, Fensterlayout.
import { DIALOG_LAYOUT, NACHFRAGE_KOSTEN, zeitText } from './config.ts';

export interface Antwort {
  text: string;
  nachfrage?: boolean; // Nachfrage: kostet Zeit (NACHFRAGE_KOSTEN), je Gespraech einmal waehlbar, bringt eine Zusatz-info
  weiter: string | null; // Id des Folgeknotens; null beendet das Gespraech
  info?: string; // Information, die diese Antwort bringt (kommt ins Inventar)
  verschuettet?: boolean; // Handbewegung: beendet das Gespraech sofort, wenn die Figur Kaffee traegt (Kaffee ist dann weg)
  kaffeeUebergabe?: boolean; // nur im Feld Knoten.kaffeeAntwort: der Kaffee wird uebergeben und ist danach weg
}

export interface Knoten {
  text: string;
  antworten: Antwort[]; // 2 bis 3
  kaffeeAntwort?: Antwort; // zusaetzliche Antwort, die nur angeboten wird, solange die Figur Kaffee traegt (Index = antworten.length)
  info?: string; // Information, die beim Betreten des Knotens gespeichert wird
}

export interface Dialogbaum {
  start: string;
  knoten: Record<string, Knoten>;
}

export const DIALOGE: Record<string, Dialogbaum> = {
  empfang: {
    start: 'start',
    knoten: {
      start: {
        text: 'Guten Morgen! Haben Sie einen Termin? Ich frage nur, weil sonst niemand freiwillig bei mir vorbeikommt.',
        antworten: [
          { text: 'Ich muss kurz zum Chef.', weiter: 'chef' },
          { text: 'Wild gestikulieren: „Ich bin der neue Praktikant!“', weiter: 'praktikant', verschuettet: true },
          { text: 'Nachfragen', weiter: 'nachgefragt', nachfrage: true },
        ],
      },
      nachgefragt: {
        text: 'Im Vertrauen: Der Chef verlässt sein Büro nie vor Feierabend. Er isst dort sogar sein Mittagessen.',
        info: 'Der Chef bleibt bis Feierabend in seinem Büro.',
        antworten: [
          { text: 'Danke für den Hinweis.', weiter: null },
          { text: 'Und das Mittagessen?', weiter: null },
        ],
      },
      chef: {
        text: 'Zum Chef? Ganz hinten rechts, zwei Türen weiter. Er hat dort eine gelbe Ablage aufgestellt, die niemand benutzen darf.',
        antworten: [
          {
            text: 'Danke, ich finde hin.',
            weiter: null,
            info: 'Das Chefbüro liegt ganz rechts, dort steht die gelbe Ablage.',
          },
          { text: 'Gibt es einen kürzeren Weg?', weiter: 'weg' },
        ],
      },
      praktikant: {
        text: 'Ah, der Praktikant! Kaffee gibt es in der Küche, Anerkennung nirgends. Dafür ist Ihr Stuhl sehr ergonomisch.',
        antworten: [
          { text: 'Das motiviert mich ungemein.', weiter: null },
          { text: 'Und wohin jetzt?', weiter: 'weg' },
        ],
      },
      weg: {
        text: 'In den Trennwänden sind Türen. Alles andere ist Wand, und Wände sind erstaunlich stur.',
        antworten: [
          { text: 'Verstanden, danke.', weiter: null },
          { text: 'Das war nicht besonders hilfreich.', weiter: null },
        ],
      },
    },
  },
  buchhaltung: {
    start: 'start',
    knoten: {
      start: {
        text: 'Schon wieder jemand ohne Beleg! Haben Sie Ihre Reisekostenabrechnung dabei? Nein? Dann haben wir ein Problem.',
        antworten: [
          { text: 'Ich kündige.', weiter: 'kuendigen' },
          { text: 'Wild gestikulieren: „Welche Abrechnung?“', weiter: 'abrechnung', verschuettet: true },
          { text: 'Nachfragen', weiter: 'nachgefragt', nachfrage: true },
        ],
      },
      nachgefragt: {
        text: 'Hinter der Ablage liegt ein Stapel alter Belege, den niemand liest. Darin geht alles verloren, auch Kündigungen.',
        info: 'In der Ablage verschwinden Papiere spurlos, auch eine Kündigung.',
        antworten: [
          { text: 'Das ist beruhigend.', weiter: null },
          { text: 'Das ist beunruhigend.', weiter: null },
        ],
      },
      kuendigen: {
        text: 'Kündigen? Dazu brauche ich das gelbe Formular in dreifacher Ausfertigung. Oder einen sehr guten Grund.',
        antworten: [
          { text: 'Ich habe einen sehr guten Grund.', weiter: null },
          { text: 'Welches gelbe Formular?', weiter: 'formular' },
        ],
      },
      abrechnung: {
        text: 'Die für Ihren Kaffeebecher. Er kostet die Firma mehr als Ihr Gehalt. Wir prüfen das noch.',
        antworten: [
          { text: 'Das ist mir jetzt peinlich.', weiter: null },
          { text: 'Ich spüle ihn gleich ab.', weiter: null },
        ],
      },
      formular: {
        text: 'Das Formular liegt im Chefbüro bei der Ablage. Wer es dort einwirft, ist offiziell weg.',
        antworten: [
          {
            text: 'Das merke ich mir.',
            weiter: null,
            info: 'Die Kündigung wird im Chefbüro an der gelben Ablage eingeworfen.',
          },
          { text: 'Danke, ich bin schon weg.', weiter: null },
        ],
      },
    },
  },
  teamleitung: {
    start: 'start',
    knoten: {
      start: {
        text: 'Gut, dass ich Sie treffe! Haben Sie kurz Zeit? Es dauert nur ein Meeting. Oder zwei. Maximal ein Dutzend.',
        antworten: [
          { text: 'Ich habe leider keine Zeit.', weiter: 'ausrede' },
          { text: 'Wild gestikulieren: „Worum geht es denn?“', weiter: 'thema', verschuettet: true },
          { text: 'Nachfragen', weiter: 'nachgefragt', nachfrage: true },
        ],
        kaffeeAntwort: { text: 'Kaffee überreichen', weiter: 'kaffee', kaffeeUebergabe: true },
      },
      kaffee: {
        text: 'Kaffee! Sie sind der Erste seit Wochen, der mitdenkt. Zum Dank ein Tipp: Der Chef trägt im Büro Kopfhörer und hört nichts.',
        info: 'Der Chef trägt im Büro Kopfhörer und hört keine Schritte.',
        antworten: [
          { text: 'Gern geschehen.', weiter: null },
          { text: 'Das war mein letzter Kaffee.', weiter: null },
        ],
      },
      nachgefragt: {
        text: 'Zwischen uns: Abends ist das Chefbüro leer, nur die Ablage bleibt stehen. Ich habe nichts gesagt, Sie auch nicht.',
        info: 'Abends ist das Chefbüro leer, nur die Ablage steht noch da.',
        antworten: [
          { text: 'Mein Mund ist versiegelt.', weiter: null },
          { text: 'Ich schreibe nichts auf.', weiter: null },
        ],
      },
      ausrede: {
        text: 'Keine Zeit? Perfekt, dann verschieben wir das auf nach dem Meeting. Ich schicke Ihnen gleich eine Einladung.',
        antworten: [
          { text: 'Bitte keine Einladung!', weiter: null },
          { text: 'Ich nehme die Einladung an.', weiter: null },
        ],
      },
      thema: {
        text: 'Synergien, Prozesse und die Zukunft der Kaffeemaschine. Außerdem sitzt der Chef gerade ganz hinten über seinen Berichten.',
        antworten: [
          { text: 'Der Chef ist also beschäftigt?', weiter: 'chef' },
          { text: 'Ich muss weiter.', weiter: null },
        ],
      },
      chef: {
        text: 'Sehr beschäftigt. Er bemerkt niemanden, der leise an seiner Ablage vorbeigeht. Das habe ich aber nie gesagt.',
        antworten: [
          {
            text: 'Gut zu wissen.',
            weiter: null,
            info: 'Der Chef ist in seine Berichte vertieft und bemerkt Besucher kaum.',
          },
          { text: 'Ich habe nichts gehört.', weiter: null },
        ],
      },
    },
  },
  it: {
    start: 'start',
    knoten: {
      start: {
        text: 'IT-Support, guten Tag. Haben Sie es schon mit Aus- und Wiedereinschalten versucht? Das löst fast alles.',
        antworten: [
          { text: 'Ich habe ein anderes Problem.', weiter: 'problem' },
          { text: 'Wild gestikulieren: „Ja, selbstverständlich!“', weiter: 'luege', verschuettet: true },
          { text: 'Nachfragen', weiter: 'nachgefragt', nachfrage: true },
        ],
      },
      nachgefragt: {
        text: 'Im Chefbüro ist das Netz tot. Kameras gibt es dort auch keine, die waren zu teuer.',
        info: 'Im Chefbüro gibt es weder Netz noch Kameras.',
        antworten: [
          { text: 'Sehr gut zu wissen.', weiter: null },
          { text: 'Das habe ich nie gefragt.', weiter: null },
        ],
      },
      problem: {
        text: 'Ein anderes Problem? Das System meldet gerade, dass alle Probleme gelöst sind. Es lügt natürlich.',
        antworten: [
          { text: 'Ich will ins Chefbüro.', weiter: 'zugang' },
          { text: 'Dann ist ja alles gut.', weiter: null },
        ],
      },
      luege: {
        text: 'Sie lügen. Das Protokoll zeigt, dass Sie nur den Bildschirm ausgeschaltet haben. Aber ich bin heute gnädig.',
        antworten: [
          { text: 'Erwischt.', weiter: null },
          { text: 'Der Bildschirm gehört auch dazu.', weiter: null },
        ],
      },
      zugang: {
        text: 'Die Türen brauchen keine Karte, nur Mut. Ich habe die Schlösser vor Jahren aus Versehen abgeschaltet.',
        antworten: [
          {
            text: 'Sehr praktisch.',
            weiter: null,
            info: 'Die Türen zwischen den Räumen sind nicht abgeschlossen.',
          },
          { text: 'Das erzähle ich nicht weiter.', weiter: null },
        ],
      },
    },
  },
  vertrieb: {
    start: 'start',
    knoten: {
      start: {
        text: 'Hey! Genau der Richtige! Ich habe ein Angebot, das Sie nicht ablehnen können: ein Abonnement für Büroklammern.',
        antworten: [
          { text: 'Ich nehme nichts, danke.', weiter: 'absage' },
          { text: 'Wild gestikulieren: „Was kostet das?“', weiter: 'preis', verschuettet: true },
          { text: 'Nachfragen', weiter: 'nachgefragt', nachfrage: true },
        ],
      },
      nachgefragt: {
        text: 'Streng geheim: Der Chef unterschreibt alles, was auf der gelben Ablage liegt, ohne es zu lesen.',
        info: 'Der Chef unterschreibt ungelesen, was auf der gelben Ablage liegt.',
        antworten: [
          { text: 'Das bleibt unter uns.', weiter: null },
          { text: 'Erstaunlich.', weiter: null },
        ],
      },
      absage: {
        text: 'Kein Problem! Wir haben auch Büroklammern im Jahresabo. Mit Kündigungsfrist.',
        antworten: [
          { text: 'Kündigungsfrist? Das Wort mag ich nicht.', weiter: 'frist' },
          { text: 'Tschüss.', weiter: null },
        ],
      },
      preis: {
        text: 'Heute ausnahmsweise nur ein Lächeln und Ihre Unterschrift. Die Unterschrift ist natürlich verbindlich.',
        antworten: [
          { text: 'Ich unterschreibe nie etwas.', weiter: null },
          { text: 'Und wie ist die Frist?', weiter: 'frist' },
        ],
      },
      frist: {
        text: 'Drei Monate zum Quartalsende. Es sei denn, man legt im Chefbüro persönlich eine Kündigung ab. Das gilt sofort.',
        info: 'Eine Kündigung, die im Chefbüro abgelegt wird, gilt sofort und ohne Frist.',
        antworten: [
          { text: 'Das nehme ich mit.', weiter: null },
          { text: 'Zu spät, ich bin schon weg.', weiter: null },
        ],
      },
    },
  },
};

// Zustand eines laufenden Gespraechs. knoten === null: beendet.
export interface DialogZustand {
  dialogId: string;
  knoten: string | null;
  infos: string[]; // bisher gesammelte Informationen
  nachfrageInfos: string[]; // davon die Informationen, die aus einer Nachfrage stammen (nur Vermerk)
  kaffeeInfos: string[]; // davon die Informationen, die aus der Kaffee-Uebergabe stammen (nur Vermerk)
  kaffeeWeg: 'verschuettet' | 'uebergeben' | null; // was in diesem Gespraech mit dem Kaffee geschah
  genutzt: string[]; // bereits gewaehlte Nachfragen ("knoten:index"), je Gespraech nur einmal waehlbar
}

function baum(dialogId: string): Dialogbaum {
  const b = DIALOGE[dialogId];
  if (b === undefined) throw new Error(`Dialog ${dialogId} unbekannt`);
  return b;
}

function betreten(b: Dialogbaum, id: string, infos: string[]): string[] {
  const k = b.knoten[id];
  if (k === undefined) throw new Error(`Dialogknoten ${id} fehlt`);
  return k.info !== undefined ? [...infos, k.info] : infos;
}

export function starteGespraech(dialogId: string): DialogZustand {
  const b = baum(dialogId);
  return { dialogId, knoten: b.start, infos: betreten(b, b.start, []), nachfrageInfos: [], kaffeeInfos: [], kaffeeWeg: null, genutzt: [] };
}

// Kosten (ganze Sekunden) der Nachfragen dieses Dialogbaums, aus der Konfiguration (Dialog-id = NPC-id).
export function nachfrageSekunden(dialogId: string): number {
  const k = (NACHFRAGE_KOSTEN as Record<string, number>)[dialogId];
  if (k === undefined) throw new Error(`Keine Nachfragekosten fuer ${dialogId}`);
  return k;
}

function genutztSchluessel(z: DialogZustand, index: number): string {
  return `${z.knoten}:${index}`;
}

// Kosten der Nachfrage, die dieser Index jetzt waehlen wuerde; null, wenn der Index keine waehlbare Nachfrage ist
// (ungueltig, keine Nachfrage oder schon gewaehlt).
export function nachfrageKosten(z: DialogZustand, index: number): number | null {
  const k = aktuellerKnoten(z);
  if (k === null || !Number.isInteger(index) || index < 0 || index >= k.antworten.length) return null;
  if (k.antworten[index].nachfrage !== true) return null;
  if (z.genutzt.includes(genutztSchluessel(z, index))) return null;
  return nachfrageSekunden(z.dialogId);
}

// Antworten, die jetzt angeboten werden (bereits gewaehlte Nachfragen entfallen; die Kaffee-Antwort nur mit Kaffee),
// mit ihrem echten Index.
export function angeboteneAntworten(z: DialogZustand, traegtKaffee = false): { index: number; antwort: Antwort }[] {
  const k = aktuellerKnoten(z);
  if (k === null) return [];
  const aus: { index: number; antwort: Antwort }[] = [];
  k.antworten.forEach((antwort, index) => {
    if (antwort.nachfrage === true && z.genutzt.includes(genutztSchluessel(z, index))) return;
    aus.push({ index, antwort });
  });
  if (traegtKaffee && k.kaffeeAntwort !== undefined) aus.push({ index: k.antworten.length, antwort: k.kaffeeAntwort });
  return aus;
}

// Beschriftung eines Antwortknopfs; Nachfragen zeigen ihre Kosten, z. B. "Nachfragen (-0:03)".
export function antwortBeschriftung(z: DialogZustand, a: Antwort): string {
  if (a.nachfrage !== true) return a.text;
  return `${a.text} (−${zeitText(nachfrageSekunden(z.dialogId))})`;
}

export function aktuellerKnoten(z: DialogZustand): Knoten | null {
  if (z.knoten === null) return null;
  return baum(z.dialogId).knoten[z.knoten] ?? null;
}

// Antwort zu einem Index: die Antworten des Knotens, an letzter Stelle die Kaffee-Antwort (nur mit Kaffee).
function antwortZuIndex(k: Knoten, index: number, traegtKaffee: boolean): Antwort | undefined {
  if (index < k.antworten.length) return k.antworten[index];
  if (index === k.antworten.length && traegtKaffee) return k.kaffeeAntwort;
  return undefined;
}

// Waehlt die Antwort mit dem Index. Ein ungueltiger Index (nicht ganzzahlig, kleiner 0, nicht kleiner als
// die Zahl der Antworten; die Kaffee-Antwort zaehlt nur mit Kaffee) oder ein beendetes Gespraech aendert nichts
// und wirft keinen Fehler. Traegt die Figur Kaffee und ist die Antwort eine Handbewegung (verschuettet), endet
// das Gespraech sofort: der Kaffee ist verschuettet, die Infos hinter der Antwort sind verpasst.
export function antworte(z: DialogZustand, index: number, traegtKaffee = false): DialogZustand {
  const k = aktuellerKnoten(z);
  if (k === null) return z;
  if (!Number.isInteger(index) || index < 0) return z;
  const a = antwortZuIndex(k, index, traegtKaffee);
  if (a === undefined) return z;
  const nachfrage = a.nachfrage === true;
  if (nachfrage && z.genutzt.includes(genutztSchluessel(z, index))) return z;
  if (a.verschuettet === true && traegtKaffee) {
    return { ...z, knoten: null, kaffeeWeg: 'verschuettet' };
  }
  const vorher = z.infos.length;
  let infos = a.info !== undefined ? [...z.infos, a.info] : z.infos;
  const genutzt = nachfrage ? [...z.genutzt, genutztSchluessel(z, index)] : z.genutzt;
  const ziel = a.weiter;
  if (ziel !== null) infos = betreten(baum(z.dialogId), ziel, infos);
  // Infos, die diese Antwort neu bringt, gelten bei einer Nachfrage als Nachfrage-Infos, bei der Uebergabe als Kaffee-Infos.
  const nachfrageInfos = nachfrage ? [...z.nachfrageInfos, ...infos.slice(vorher)] : z.nachfrageInfos;
  const uebergabe = a.kaffeeUebergabe === true;
  const kaffeeInfos = uebergabe ? [...z.kaffeeInfos, ...infos.slice(vorher)] : z.kaffeeInfos;
  const kaffeeWeg = uebergabe ? 'uebergeben' : z.kaffeeWeg;
  return { dialogId: z.dialogId, knoten: ziel, infos, nachfrageInfos, kaffeeInfos, kaffeeWeg, genutzt };
}

export function istBeendet(z: DialogZustand): boolean {
  return z.knoten === null;
}

export interface Rechteck {
  x: number;
  y: number;
  breite: number;
  hoehe: number;
}

export interface DialogRechtecke {
  fenster: Rechteck;
  name: Rechteck;
  text: Rechteck;
  kosten: Rechteck;
  knoepfe: Rechteck[]; // genau n Stueck
}

// Rechtecke des Dialogfensters fuer n Antwortknoepfe (Bildpunkte). Die Szene zeichnet genau diese.
// Bis 3 Antworten bleibt das Fenster, wie es ist; jede weitere Antwort schiebt die Oberkante um einen Knopf nach oben
// (die Unterkante bleibt).
export function dialogRechtecke(n: number): DialogRechtecke {
  const L = DIALOG_LAYOUT;
  const extra = Math.max(0, n - 3) * (L.knopfHoehe + L.knopfLuecke);
  const fensterY = L.fensterY - extra;
  const innenX = L.fensterX + L.randX;
  const innenBreite = L.fensterBreite - 2 * L.randX;
  let y = fensterY + L.randOben;
  const name = { x: innenX, y, breite: innenBreite, hoehe: L.nameHoehe };
  y += L.nameHoehe + L.luecke;
  const text = { x: innenX, y, breite: innenBreite, hoehe: L.textHoehe };
  y += L.textHoehe + L.luecke;
  const kosten = { x: innenX, y, breite: innenBreite, hoehe: L.kostenHoehe };
  y += L.kostenHoehe + L.textZuKnopfLuecke;
  const knoepfe: Rechteck[] = [];
  for (let i = 0; i < n; i++) {
    knoepfe.push({ x: innenX, y, breite: innenBreite, hoehe: L.knopfHoehe });
    y += L.knopfHoehe + L.knopfLuecke;
  }
  return {
    fenster: { x: L.fensterX, y: fensterY, breite: L.fensterBreite, hoehe: L.fensterHoehe + extra },
    name,
    text,
    kosten,
    knoepfe,
  };
}

// Dialogkosten-Zeile, z. B. "Dieses Gespräch kostet 0:05" (zeitText aus config).
export function kostenZeile(kostenText: string): string {
  return `Dieses Gespräch kostet ${kostenText}`;
}
