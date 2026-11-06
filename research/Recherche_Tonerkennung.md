# Guitar Tune: Recherche zur Tonerkennung (06.11.2026)

## Ergebnis in Kürze

Die größte Fehlerquelle ist die Saite selbst, nicht das Rauschen im Raum. Eine Stahlsaite ist steif, deshalb schwingen ihre Obertöne etwas höher, als sie rechnerisch sollten. Gemessen wurde das zum Beispiel an einer Stahlsaite einer Westerngitarre ([Hodgkinson, Timoney, Lazzarini, DAFx 2010](https://www.dafx.de/paper-archive/2010/DAFx10/HodgkinsonTimoneyLazzarini_DAFx10_P69.pdf)): Die Steifigkeitszahl liegt dort bei etwa 0,00011. Der zehnte Oberton liegt damit rund 10 Cent zu hoch.

Fast alle Handy Stimmgeräte messen die Dauer einer Schwingung, zum Beispiel mit YIN oder Autokorrelation. Dabei rechnen sie diese zu hohen Obertöne mit ein. Direkt nach dem Anschlag klingen besonders viele Obertöne, später nur noch wenige. Deshalb wandert die Anzeige, obwohl die Saite gleich bleibt. In meiner Simulation zeigte eine perfekt gestimmte Saite:

| Zeit nach dem Anschlag | 0,03 s | 0,15 s | 0,4 s | 0,8 s |
|---|---|---|---|---|
| Schwingungsdauer messen (übliches Verfahren) | +10 Cent | +6 Cent | +3 Cent | +1 Cent |
| Teiltöne einzeln messen (Empfehlung) | 0 Cent | 0 Cent | 0 Cent | 0 Cent |

Ein Anfänger würde beim üblichen Verfahren sehen: „zu hoch“, Saite lockern, nach einer Sekunde ist sie dann zu tief.

## Empfohlenes Verfahren

1. **Gezielte Grobsuche:** Die App weiß, welche Saite dran ist. Sie sucht deshalb nur im Bereich dieser Saite, also bis zu 7 Halbtöne darüber oder darunter. Als Rechenweg dient die Selbstähnlichkeit des Signals nach McLeod (NSDF). Dadurch kann die App nicht in der Oktave danebenliegen. In allen Tests trat damit kein einziger grober Fehler auf. YIN lag bei viel Lärm in bis zu 40 Prozent der Messungen grob daneben.
2. **Feinmessung der einzelnen Teiltöne:** Das Signal wird in seine Frequenzen zerlegt (FFT mit Hann Fenster, achtfach aufgefüllt). Für jeden der ersten 8 Teiltöne bestimmt die App die genaue Frequenz und rechnet daraus mit der Formel für steife Saiten den echten Grundton zurück. Das klappt auch dann, wenn das Handymikrofon den Grundton der tiefen E Saite kaum aufnimmt.
3. **Steifigkeit je Saite lernen:** In der ersten halben Sekunde ermittelt die App die Steifigkeitszahl der Saite und hält sie danach fest. Das macht die Anzeige noch ruhiger.
4. **Anschlag überspringen und glätten:** Beim Anschlag wird die Saite kurz stärker gedehnt und klingt höher ([Forum Delcamp, Erfahrungsbericht](https://www.classicalguitardelcamp.com/viewtopic.php?p=1477173)). Die ersten 120 ms nach einem Anschlag wertet die App nicht aus. Danach bildet sie den Median der letzten 5 Messungen.
5. **Unsichere Messungen verwerfen:** Ist das Signal zu leise oder passen die Teiltöne nicht zusammen, zeigt die App nichts an, statt zu raten.

Mess- und Rechenfenster: 8192 Messwerte bei 48 kHz, das sind 171 ms. Eine neue Messung kommt alle 43 ms, also rund 23 Mal pro Sekunde. Mit dem kürzeren Fenster von 4096 Messwerten war die Streuung bei normalem Raumgeräusch rund viermal so groß.

## Messwerte aus der Simulation

Künstliche Gitarrentöne, alle sechs Saiten, je 25 Anschläge, jede Saite zufällig bis zu 40 Cent verstimmt. Simuliert wurden ein schwacher Grundton, Netzbrummen mit 50 Hz, ein Mikrofon, das tiefe Töne dämpft, Steifigkeitszahl 0,0001, Messung 0,5 s nach dem Anschlag. „95 Prozent“ heißt: 95 von 100 Messungen liegen innerhalb dieses Fehlers.

| Verfahren | normales Zimmer: grobe Fehler | normales Zimmer: 95 Prozent | laut: grobe Fehler | laut: 95 Prozent |
|---|---|---|---|---|
| YIN | 39 % | 8,0 Cent | 40 % | 27,3 Cent |
| McLeod (MPM) | 0 % | 6,0 Cent | 0 % | 21,8 Cent |
| gezielte Grobsuche allein | 0 % | 5,9 Cent | 0 % | 22,6 Cent |
| **Empfehlung (gezielt + Teiltöne + gelernte Steifigkeit)** | **0 %** | **0,9 Cent** | **0 %** | **2,1 Cent** |

„Normales Zimmer“ heißt: Das Rauschen ist 15 dB leiser als die Saite. „Laut“ heißt: nur 5 dB leiser. Bei einer fünfmal steiferen Saite blieb die Empfehlung bei 1,0 und 1,8 Cent, das übliche Verfahren lag schon im Mittel 5 Cent zu hoch. Bei lautem Raum trat einmal unter 150 Messungen ein Ausreißer auf. Schritt 5 und die Glättung fangen solche Ausreißer ab.

Zum Vergleich: Teure Stroboskop Stimmgeräte werben mit 0,1 Cent. Die Zielzone der App liegt bei ±5 Cent.

## Mikrofon unter Android

- 48 kHz, mono, 16 oder 32 Bit (Float).
- Quelle **UNPROCESSED**, wenn das Handy sie anbietet. Das lässt sich über `AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED` abfragen, verfügbar ab Android 7.
- Sonst Quelle **VOICE_RECOGNITION**. Android schreibt für diese Quelle vor, dass Rauschunterdrückung und automatische Lautstärkeregelung ab Werk aus sind. Flach muss sie nur von 100 Hz bis 4 kHz sein ([Android Compatibility Definition, Abschnitt 5.4](https://android.googlesource.com/platform/compatibility/cdd/+/refs/tags/android-mainline-12.0.0_r98/5_multimedia/5_4_audio-recording.md); [source.android.com](https://source.android.com/docs/core/audio/implement-pre-processing)). Der Grundton der tiefen E Saite (82 Hz) kann deshalb gedämpft ankommen. Das gleicht die Teiltonmessung aus.
- Nicht verwenden: MIC und VOICE_COMMUNICATION. Bei diesen Quellen darf das Handy Filter für Sprache einschalten.
- Falls das Handy trotzdem Effekte anhängt (NoiseSuppressor, AutomaticGainControl), schaltet die App sie ausdrücklich ab.
- Die Uhr des Handys weicht höchstens um wenige Hundertstel Promille ab. Das macht unter 0,1 Cent aus und spielt keine Rolle.

## Was ich nicht empfehle

- **KI Modelle (CREPE, SwiftF0, PENN):** Sie sind in Vergleichen stark bei Gesang und Sprache ([pitch-benchmark](https://github.com/lars76/pitch-benchmark)). Gebaut sind sie aber dafür, den Ton grob zu finden, nicht für Abweichungen unter einem Cent. Sie würden die App größer machen und bringen keinen Vorteil, weil die App die Saite ohnehin kennt.
- **YIN allein**, wie im ersten Plan: Damit liegt die App in der Oktave daneben und zeigt durch die Obertöne zu hohe Werte.
- **Bitstream Autocorrelation (Q Library, [cycfi.com](https://www.cycfi.com/2020/07/fast-and-efficient-pitch-detection-revisited/)):** Sie ist sehr schnell und für Gitarre entwickelt, misst aber ebenfalls die Schwingungsdauer. Auch sie hat deshalb das Problem mit den Obertönen. Bei Tönen mit nicht ganzzahligen Obertönen nennt der Autor selbst rund 1 Cent Fehler.
- **TarsosDSP** (Java Bibliothek mit YIN und MPM): Die Bibliothek steht unter GPL 3. Deine Apps stehen unter der MIT Lizenz, beides passt nicht zusammen. Die wenigen nötigen Rechenschritte schreibe ich selbst.

## Risiken und offene Prüfung

- **Simulation ist nicht die echte Gitarre.** Bevor ich die App baue, sollte das Verfahren an echten Aufnahmen geprüft werden. Vorschlag: Du nimmst mit deinem Handy jede Saite drei Mal auf, einmal leise, einmal normal, einmal kräftig angeschlagen, dazu eine Aufnahme mit Fernseher im Hintergrund. Ich lasse das Verfahren darüber laufen. Zusätzlich lässt sich der öffentliche Datensatz GuitarSet mit echten, ausgemessenen Gitarrenaufnahmen nutzen.
- **Rechenaufwand:** etwa 23 Zerlegungen pro Sekunde über 65.536 Punkte. Das schafft jedes aktuelle Handy in wenigen Millisekunden. Auf sehr alten Geräten lässt sich die Auffüllung halbieren.
- **Der Ton sinkt beim Ausklingen leicht.** Nach einem Erfahrungsbericht um bis zu 3 bis 5 Cent bei der G Saite. Die App wertet die Zeit ab 0,12 s nach dem Anschlag aus und verlangt eine Sekunde lang „Stimmt“. Damit wird der Ton gemessen, der beim Spielen trägt.
- **Nylonsaiten (Konzertgitarre):** Für sie habe ich keine Messwerte zur Steifigkeit gefunden. Das Verfahren lernt die Steifigkeit selbst und kommt deshalb auch damit zurecht. Prüfen sollte man es trotzdem.

## Prüfskripte

`lab.py`, `lab2.py` und `drift.py` in diesem Ordner. Sie erzeugen die künstlichen Töne und vergleichen die Verfahren. Mit ihnen lassen sich später auch deine echten Aufnahmen prüfen.
