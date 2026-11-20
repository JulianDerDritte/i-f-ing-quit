// Die drei Gespraeche mit dem Chef (erfunden): chef1, chef2, chef3. Reihum je Erwischen (src/chef.ts).
// Regeln: mindestens 3 Knoten, 2 bis 3 Antworten je Knoten, eine Nachfrage mit Zusatzinfo, keine Kaffee-Antwort,
// keine Ziffern ausser der Durchwahl in chef3, keine echten Namen oder Nummern.
import type { Dialogbaum } from './dialog.ts';

export const DURCHWAHL_INFO = 'Durchwahl der Sekretärin des CEOs: 4172.';

export const CHEF_DIALOGBAEUME: Record<string, Dialogbaum> = {
  chef1: {
    start: 'start',
    knoten: {
      start: {
        text: 'Aha, jemand läuft durch mein Büro. Ich nenne das eine Betriebsbegehung. Was führt Sie zu mir?',
        antworten: [
          { text: 'Ich wollte nur kurz vorbeischauen.', weiter: 'vorbei' },
          { text: 'Ich habe etwas für Sie. Eine Kündigung.', weiter: 'kuendigung' },
          { text: 'Nachfragen', weiter: 'nachgefragt', nachfrage: true },
        ],
      },
      vorbei: {
        text: 'Vorbeischauen ist gut. Ich schaue seit Jahren aus diesem Fenster, und es hat sich noch nichts getan.',
        antworten: [
          { text: 'Schöne Aussicht.', weiter: null, info: 'Der Chef schaut gern aus dem Fenster seines Büros.' },
          { text: 'Ich gehe dann wieder.', weiter: null },
        ],
      },
      kuendigung: {
        text: 'Eine Kündigung? Die legen Sie bitte in die Ablage. Dort wird sie sorgfältig ignoriert, wie alles andere.',
        antworten: [
          { text: 'Das habe ich vor.', weiter: null },
          { text: 'Wird sie wirklich nie gelesen?', weiter: 'vorbei' },
        ],
      },
      nachgefragt: {
        text: 'Meine Runde um den Schreibtisch dauert genau eine Runde. Mehr verrate ich nicht, sonst läuft jeder mit.',
        info: 'Der Chef geht regelmäßig eine Runde um seinen Schreibtisch.',
        antworten: [
          { text: 'Sehr diskret.', weiter: null },
          { text: 'Ich laufe nicht mit.', weiter: null },
        ],
      },
    },
  },
  chef2: {
    start: 'start',
    knoten: {
      start: {
        text: 'Schon wieder Sie. Ich wollte gerade ein Meeting einberufen, aber es war keiner da. Wie immer.',
        antworten: [
          { text: 'Ich bin hier, Chef.', weiter: 'da' },
          { text: 'Welches Meeting denn?', weiter: 'meeting' },
          { text: 'Nachfragen', weiter: 'nachgefragt', nachfrage: true },
        ],
      },
      da: {
        text: 'Sie sind hier, aber sind Sie auch anwesend? Das ist ein Unterschied, den ich seit Jahren predige.',
        antworten: [
          { text: 'Ich bin voll da.', weiter: null, info: 'Der Chef unterscheidet zwischen hier sein und anwesend sein.' },
          { text: 'Ich gehe wieder.', weiter: null },
        ],
      },
      meeting: {
        text: 'Das Meeting zur Verbesserung der Besprechungskultur. Wir besprechen dort, wie man weniger bespricht.',
        antworten: [
          { text: 'Klingt effizient.', weiter: null },
          { text: 'Klingt endlos.', weiter: 'da' },
        ],
      },
      nachgefragt: {
        text: 'Mein Büro hat einen eigenen Raumduft. Er heißt Quartalszahlen. Niemand weiß, woher er kommt.',
        info: 'Das Chefbüro riecht nach Quartalszahlen.',
        antworten: [
          { text: 'Das erklärt einiges.', weiter: null },
          { text: 'Ich rieche nichts.', weiter: null },
        ],
      },
    },
  },
  chef3: {
    start: 'start',
    knoten: {
      start: {
        text: 'Ah, noch einmal Sie. Man könnte meinen, Sie suchen etwas. Eine Nummer vielleicht? Ich habe viele Nummern, aber keine Zeit.',
        antworten: [
          { text: 'Die Nummer der Sekretärin des CEOs, bitte.', weiter: 'sekretaerin', info: DURCHWAHL_INFO },
          { text: 'Ich suche nur den Ausgang.', weiter: 'ausgang' },
          { text: 'Nachfragen', weiter: 'nachgefragt', nachfrage: true },
        ],
      },
      sekretaerin: {
        text: 'Die Sekretärin des CEOs sitzt ganz oben und lässt niemanden vorbei. Ohne ihre Durchwahl bewegt sich kein Aufzug.',
        antworten: [
          { text: 'Danke, ich merke sie mir.', weiter: null },
          { text: 'Und wenn sie nicht abnimmt?', weiter: 'ausgang' },
        ],
      },
      ausgang: {
        text: 'Der Ausgang ist dort, wo die Kündigung hinkommt. Sie wissen schon: die gelbe Ablage.',
        antworten: [
          { text: 'Natürlich, die Ablage.', weiter: null },
          { text: 'Ich dachte, es gäbe eine Tür.', weiter: null },
        ],
      },
      nachgefragt: {
        text: 'Der CEO hat keine Kaffeemaschine, er hat Personal für den Kaffee. Das ist der Unterschied zwischen uns.',
        info: 'Der CEO lässt sich den Kaffee bringen.',
        antworten: [
          { text: 'Das ist ungerecht.', weiter: null },
          { text: 'Ich hole mir meinen selbst.', weiter: null },
        ],
      },
    },
  },
};
