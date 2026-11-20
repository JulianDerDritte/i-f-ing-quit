# IFingQuit

Browser-Spielprototyp (Vite, TypeScript, Phaser 3). Die Spielgrafik besteht aus gezeichneten Formen; nur Logo und Icon sind Bilder von Julian (siehe Abschnitt "Bilder").

## Befehle

- `npm install` - Abhaengigkeiten holen
- `npm run dev` - Entwicklungsserver (Vite, die Adresse steht in der Ausgabe)
- `npm run build` - Produktionsbuild nach `dist`
- `npm run typecheck` - Typpruefung

## Bilder

Logo und Icon stammen von Julian. Die Originale liegen nur lokal unter `image/` (nicht im Repo, in `.gitignore`); verkleinerte Kopien liegen in `public/` (`logo.png`, `icon-192.png`, `icon-32.png`) und sind im Repo. Neu erzeugen: aus den Originalen mit einem Bildwerkzeug wie `sharp` (ausserhalb des Repos eingerichtet, keine Abhaengigkeit dieses Projekts) auf die Kantenlaengen der Dateinamen verkleinern.

## Steuerung

Nach der Wahl der Schwierigkeit im Startmenue laeuft die Figur durch Vorzimmer, Grossraumbuero und Chefbuero (isometrische Ansicht).

- `W`, `A`, `S`, `D` oder die Pfeiltasten bewegen die Figur in Bildschirmrichtung (hoch, links, runter, rechts); zwei Tasten ergeben eine Diagonale mit gleichem Tempo.
- Waende und Tische sind Hindernisse; an Waenden gleitet die Figur entlang.
- Der Knopf "Zurueck zum Menue" oben rechts fuehrt ins Startmenue.
- Oben in der Bildmitte laeuft der Timer (m:ss, aufgerundet, rot ab der Warnzeit). Er startet mit der Spielszene.
- Sieg: im Chefbuero nahe der goldenen Ablagezelle mit `E` oder der Leertaste die Kuendigung ablegen (ein Hinweis erscheint in Reichweite). Niederlage: der Timer erreicht null. Beide Male friert das Spiel ein; "Nochmal" bzw. "Neustart" startet dieselbe Stufe neu, "Zum Menue" fuehrt ins Startmenue.

- `I` oder der Knopf "Inventar" oeffnet das Inventar (nur waehrend das Spiel laeuft); `I`, `Escape` oder der Knopf "Schliessen" schliessen es wieder. Solange es offen ist, stehen Timer, Figur und NPCs.
- An der Kaffeemaschine (Zelle "Kaffee" im Grossraumbuero) nimmt `E` oder die Leertaste Kaffee, solange keiner getragen wird; das kostet etwas Zeit. An der Ablage hat das Ablegen der Kuendigung Vorrang.
- Im Startmenue zeigt "Gespeicherte Infos" die gemerkten Informationen; der Knopf "Speicher loeschen" entfernt sie.

## NPCs und Gespraeche

- Im Gebaeude patrouillieren NPCs (Rollen wie Empfang oder Buchhaltung) auf festen Routen: vom ersten Wegpunkt zum letzten und zurueck, endlos. Sie laufen nur, solange das Spiel laeuft; im Gespraech, nach Sieg und nach Niederlage stehen sie.
- Kommt die Figur einem NPC naeher als die Kontaktreichweite, beginnt ein Gespraech. Jeder NPC spricht je Spiel hoechstens einmal, es gibt keine Kollision mit der Figur: Ausweichen spart Zeit.
- Das Gespraech kostet Zeit, die beim Oeffnen sofort vom Timer abgezogen wird (je NPC ein Wert aus der Konfiguration). Waehrend das Dialogfenster offen ist, steht der Timer, und Figur und NPCs stehen. Reicht die Zeit nach dem Abzug nicht mehr, ist das Spiel verloren, und es erscheint kein Fenster.
- Das Dialogfenster am unteren Bildrand zeigt Rolle, Text, die Kostenzeile und klickbare Antworten. Jede Antwort fuehrt zu einem Folgetext oder beendet das Gespraech. Antworten koennen eine Information (`info`) tragen; sie wird nur gemerkt und noch nicht angezeigt (das Inventar folgt spaeter).
- In jedem Gespraech gibt es einen Knopf "Nachfragen" mit eigenen Zeitkosten (im Knopf angezeigt, Werte in der Konfiguration). Er zieht die Kosten sofort ab und bringt eine Zusatzinformation; je Gespraech ist er nur einmal waehlbar. Jedes Gespraech laesst sich auch ganz ohne Nachfrage beenden (dann nur die Kurzinfo). Reicht die Zeit fuer eine Nachfrage nicht, ist das Spiel verloren.
- Neustart, "Nochmal" und der Weg ueber das Menue legen alles frisch an: NPCs am Start, keiner gesprochen, kein Fenster, Timer voll.
- Die kurzen Timer je Stufe, die Gespraechskosten, Tempo, Radien und Fensterwerte stehen in `src/config.ts`.

## Tests

- `npm test` fuehrt alle Tests im Ordner `tests/` mit dem eingebauten Testlaeufer von Node aus (`node:test`, keine zusaetzliche Abhaengigkeit). Die Ausgabe nennt jeden Test mit seinem Ergebnis; der Ausgang ist ungleich null, sobald ein Test rot ist. Die Tests liegen bewusst ausserhalb von `src` und werden nicht vom Typpruefer erfasst.
- `npm run smoke` baut das Spiel, startet die Vorschau als Kindprozess, ruft die Startseite und alle Dateien ab, auf die sie verweist (Skript, Bilder, Icons), und prueft Titel, Dateiart und Groesse des Bundles. Danach beendet es den Kindprozess ueber seine Prozesskennung und stellt sicher, dass der Port wieder frei ist.
- Rotprobe-Regel fuer jede Testgruppe: Zuerst laeuft sie gegen einen absichtlich kaputten Stand und muss rot sein. Dann laeuft sie gegen den unveraenderten Stand und ist gruen. Dann laeuft sie gegen eine zweite, anders kaputte Fassung derselben Stelle und ist wieder rot. Nach dem Zuruecknehmen ist sie gruen. Ein Kommentar direkt ueber der Gruppe haelt fest, dass und wann das geschah (Datum und Stand). Laesst sich ein Zustand nicht herstellen, steht das mit Grund im Kommentar, und die Gruppe gilt nicht als belegt.
- Findet ein Test einen echten Fehler im Spielcode, wird dieser nicht still repariert, sondern gemeldet.
- Spiel- und Layoutwerte stehen in `src/config.ts`; die Konsistenztests dort pruefen Bereiche und Ganzzahligkeit.

## Veroeffentlichung

- Adresse der Seite: https://julianderdritte.github.io/i-f-ing-quit/ (statische Seite ueber GitHub Pages; der Workflow `.github/workflows/deploy.yml` testet, baut und veroeffentlicht bei jedem Push auf `main` und auf Wunsch von Hand).
- Das Repository ist oeffentlich, weil GitHub Pages fuer ein privates Repository im Tarif nicht angeboten wird; die Seite ist ohne Anmeldung ueber den Link erreichbar. Nichts aus `image/` liegt im Repository.
- Die Vite-Basis ist relativ (`vite.config.ts`), die Seite laeuft deshalb aus jedem Unterpfad.
- `?zeit=<Sekunden>` an der Adresse ist eine reine Probehilfe (siehe Probeparameter): wer sie nutzt, gibt sich nur mehr oder weniger Zeit; es gibt keine Daten und keine Sicherheitswirkung.
- `npm run smoke -- <Adresse>` prueft eine veroeffentlichte Seite ohne Server und ohne Bau: Startseite, Titel, alle Dateien, Dateiart und Groesse des Bundles.

## Probeparameter

Die Adresse mit `?zeit=<Sekunden>` (zum Beispiel `?zeit=20`) ersetzt fuer diesen Start die Startzeit der gewaehlten Stufe, damit Sieg und Niederlage ohne langes Warten probiert werden koennen. Ohne Parameter oder bei ungueltigem oder nicht positivem Wert gilt die Konfiguration. Nur ein Probehilfsmittel, spaeter entfernbar.

## Aufbau

- `src/config.ts` - einzige Stelle fuer Spielwerte (Timer, Dialogdauer, Kachelmasse, Tempo, Radius)
- `src/karte.ts` - Karte als Textraster, Bereiche und Tueren
- `src/projektion.ts` - isometrische Projektion (Gitter zu Bild und zurueck)
- `src/bewegung.ts` - Bewegung und Kollision (Kreis gegen Zellen)
- `src/spielzustand.ts` - Spielphase (laeuft, Gespraech, Sieg, Niederlage), Restzeit, Zeitabzug fuer Gespraeche, Ablegen, Zeitformat, Probeparameter
- `src/npcs.ts` - NPC-Daten (Rollen, Startzellen, Routen), Patrouille, Kontakt, Vermerk "gesprochen"
- `src/dialog.ts` - Dialogbaeume mit Texten, Gespraechsablauf, Rechtecke des Dialogfensters
- `src/SpielScene.ts`, `src/MenueScene.ts` - Szenen

`karte.ts`, `projektion.ts`, `bewegung.ts`, `spielzustand.ts`, `npcs.ts` und `dialog.ts` importieren kein Phaser und enthalten nur reine Logik; Importe tragen die Endung `.ts`, damit Node sie direkt laden kann.
