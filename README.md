# IFingQuit

Browser-Spielprototyp (Vite, TypeScript, Phaser 3). Platzhalter-Grafik, keine externen Assets.

## Befehle

- `npm install` - Abhaengigkeiten holen
- `npm run dev` - Entwicklungsserver (Vite, die Adresse steht in der Ausgabe)
- `npm run build` - Produktionsbuild nach `dist`
- `npm run typecheck` - Typpruefung

## Steuerung

Nach der Wahl der Schwierigkeit im Startmenue laeuft die Figur durch Vorzimmer, Grossraumbuero und Chefbuero (isometrische Ansicht).

- `W`, `A`, `S`, `D` oder die Pfeiltasten bewegen die Figur in Bildschirmrichtung (hoch, links, runter, rechts); zwei Tasten ergeben eine Diagonale mit gleichem Tempo.
- Waende und Tische sind Hindernisse; an Waenden gleitet die Figur entlang.
- Der Knopf "Zurueck zum Menue" oben rechts fuehrt ins Startmenue.
- Oben in der Bildmitte laeuft der Timer (m:ss, aufgerundet, rot ab der Warnzeit). Er startet mit der Spielszene.
- Sieg: im Chefbuero nahe der goldenen Ablagezelle mit `E` oder der Leertaste die Kuendigung ablegen (ein Hinweis erscheint in Reichweite). Niederlage: der Timer erreicht null. Beide Male friert das Spiel ein; "Nochmal" bzw. "Neustart" startet dieselbe Stufe neu, "Zum Menue" fuehrt ins Startmenue.

## Probeparameter

Die Adresse mit `?zeit=<Sekunden>` (zum Beispiel `?zeit=20`) ersetzt fuer diesen Start die Startzeit der gewaehlten Stufe, damit Sieg und Niederlage ohne langes Warten probiert werden koennen. Ohne Parameter oder bei ungueltigem oder nicht positivem Wert gilt die Konfiguration. Nur ein Probehilfsmittel, spaeter entfernbar.

## Aufbau

- `src/config.ts` - einzige Stelle fuer Spielwerte (Timer, Dialogdauer, Kachelmasse, Tempo, Radius)
- `src/karte.ts` - Karte als Textraster, Bereiche und Tueren
- `src/projektion.ts` - isometrische Projektion (Gitter zu Bild und zurueck)
- `src/bewegung.ts` - Bewegung und Kollision (Kreis gegen Zellen)
- `src/spielzustand.ts` - Spielphase, Restzeit, Ablegen, Zeitformat, Probeparameter
- `src/SpielScene.ts`, `src/MenueScene.ts` - Szenen

`karte.ts`, `projektion.ts`, `bewegung.ts` und `spielzustand.ts` importieren kein Phaser und enthalten nur reine Logik; Importe tragen die Endung `.ts`, damit Node sie direkt laden kann.
