# Guitar Tune: Plan

Stand 06.11.2026: Version 1.0.1 gebaut (apk/GuitarTune-1.0.1.apk), neues Icon: flaches weisses Plektrum auf rotem Grund ("Schlicht, gross"). Version 1.0.0 mit dem alten Icon (Kopfplatte). Oberflaeche Variante E mit Schriftzug 6h (Caveat), Tonerkennung nach research/Recherche_Tonerkennung.md. Auf Aarons Handy mit seiner Gitarre geprueft: alle sechs Saiten gestimmt, Gegenprobe mit der App GuitarTuna ergab ebenfalls "stimmt".

## Entscheidungen
- Name: Guitar Tune, Paket de.aaron.guitartune
- Nur Standardstimmung E A D G H e, Kammerton 440 Hz, keine Auswahl
- Gefuehrtes Stimmen: Die App zeigt die Saite, der Benutzer zupft genau diese
- Einstellungsseite wie bei My Notes, ShoppingList, Birthdays: Sprache (Deutsch/Englisch), Darstellung (Automatisch/Hell/Dunkel), Links auf aaron.de und GitHub

## Aufbau (wie die bestehenden Apps)
- Expo 58, React Native 0.88, TypeScript, nur Android, arm64
- scripts/build-apk.sh, eigener Schluessel signing/guitartune.keystore, APK nach apk/GuitarTune-<Version>.apk
- README Deutsch/Englisch mit Banner und Screenshots, MIT Lizenz, eigenes Icon

## Tonerkennung (nach Recherche, Einzelheiten in research/Recherche_Tonerkennung.md)
- Eigenes Kotlin Modul modules/pitch-detector, keine fremde Bibliothek (TarsosDSP ist GPL 3)
- AudioRecord, 48 kHz, mono; Quelle UNPROCESSED, falls vorhanden, sonst VOICE_RECOGNITION; nie MIC oder VOICE_COMMUNICATION; NoiseSuppressor und AutomaticGainControl ausdruecklich aus
- Fenster 8192 Messwerte (171 ms), neue Messung alle 2048 Messwerte (rund 23 pro Sekunde)
- Stufe 1, gezielte Grobsuche: NSDF nach McLeod nur im Bereich der Zielsaite plus/minus 7 Halbtoene; keine Oktavfehler
- Stufe 2, Feinmessung: FFT mit Hann Fenster, achtfach aufgefuellt; erste 8 Teiltoene einzeln vermessen; Grundton ueber f_n = n f0 Wurzel(1 + B n^2) zurueckrechnen
- Stufe 3: Steifigkeitszahl B je Saite in der ersten halben Sekunde lernen (Median), dann festhalten
- Anschlag: erste 120 ms nach einem Anschlag nicht auswerten; Median der letzten 5 Messungen
- Unsichere Messungen verwerfen (Pegel zu niedrig, Teiltoene passen nicht zusammen)
- Ziel aus der Simulation: 95 Prozent der Messungen innerhalb 1 Cent (normales Zimmer) bzw. 2 Cent (laut)
- Vor dem Bau: Pruefung an echten Aufnahmen von Aarons Gitarre (jede Saite leise, normal, kraeftig, plus Aufnahme mit Fernseher im Hintergrund)
- Mikrofon laeuft nur, solange die App im Vordergrund ist

## Oberflaeche (entschieden: Variante E, Entwurf in "Claude outputs/GuitarTune_Screenvorschlaege.html")
- Reihenfolge: tiefe E, A, D, G, H, hohe e; Antippen einer Saite springt direkt zu ihr
- Oben klein die Saite mit Alltagshinweis, z. B. "Tiefe E Saite, die dickste"
- Darunter gross der Zustand: Saite zupfen, Zu tief, Etwas zu tief, Stimmt, Etwas zu hoch, Zu hoch; dazu ein kurzer Satz ("Die Mechanik etwas spannen")
- Waagerechter Balken mit Zeiger und gruenem Zielfeld (plus/minus 5 Cent), darunter Cent und Hz
- Unten grosse Kopfplatte: Saite, Mechanik und Knopf der aktuellen Saite markiert
- Pfeil mittig auf der Mechanik, dunkelgrau: oben spannen, unten lockern; verschwindet bei "Stimmt"
- Treffer eine Sekunde halten, ein Ring fuellt sich, dann naechste Saite
- Gestimmte Saite: Punkt unten und Buchstabe gruen, Knopf mit gruenem Rand und Haken
- Punkte ganz unten mit "x von 6 gestimmt"
- Bildschirm bleibt waehrend des Stimmens an

## Farbcode (eine Farbe, eine Bedeutung)
- Blau: wartet auf den Ton
- Rot: weit daneben, mehr als 15 Cent
- Orange: nah dran, 6 bis 15 Cent
- Gruen: stimmt, hoechstens 5 Cent
- Wort, Zeiger, Saite, Mechanik, Knopf und Punkt haben immer dieselbe Farbe; das Wort steht immer dabei (Rot Gruen Schwaeche)

## Datenschutz
- Einzige Berechtigung: Mikrofon (RECORD_AUDIO), Abfrage beim ersten Start mit kurzer Erklaerung
- INTERNET blockiert, Ton wird nicht gespeichert, kein Tracking

## Tests
- vitest: Saitenzuordnung, Cent Berechnung, Glaettung, Fortschritt
- JVM Test fuer die Tonerkennung mit kuenstlichen Gitarrentoenen (schwacher Grundton, steife Saite, Netzbrummen, Rauschen) und mit Aarons echten Aufnahmen; Grenzwerte aus research/

## Risiken
- Laerm im Raum und schwache Handymikrofone bei tiefen Toenen
- Erste Einrichtung des Android SDK beim Bau 15 bis 25 Minuten

## Umgesetzt in 1.0.0
- Rueckmeldung, wenn eine Saite stimmt: nur Anzeige (kein Ton, keine Vibration)
- Abschluss nach der hohen e Saite: "Alle Saiten gestimmt" mit Knopf "Nochmal"; das Mikrofon geht dann aus
- Mehr als 350 Cent daneben: Hinweis "Sehr weit daneben. Ist es die richtige Saite?"
- Darstellung ohne eigene Wahl: dunkel

## Offen
- Drehrichtung des Pfeils gilt fuer die uebliche Bauweise; bei anderen Mechaniken zeigt der Zeiger den Fehler sofort
