# KI-Labor – Bring einer KI das Sehen bei!

**DBR-Schwelm Informatik-Differenzierung**

## 1. Projektbeschreibung

Ein interaktives Labor für den Informatikunterricht der 10. Klasse. In Modus A trainieren Lernende einen Klassifikator mit eigenen beschrifteten Fotos. In Modus B untersuchen sie dieselbe Grundidee der Bildmerkmale, indem sie Fotos ohne Gruppenvorgaben mit k-Means gruppieren. Beide Modi enthalten Forscheraufträge und einklappbare Erklärungen. In Modus C baut Klasse 8 ein Expertensystem mit Ja-Nein-Fragen und Lösungsblättern. Die Blätter können Kamerafotos oder Bilddateien enthalten, die zu Beginn eines Testlaufs zur Auswahl stehen.

## 2. Verwendete Technik

Die statische Anwendung verwendet HTML, CSS und native JavaScript-Module. Die Build- und Testskripte benötigen nur Node.js. Im Browser berechnet TensorFlow.js 4.22.0 mit einem vortrainierten MobileNet V1 (Breitenfaktor 0,25) je Bild 256 Merkmale. Die Fotos werden proportional in ein Quadrat mit 224 × 224 Pixeln eingepasst. Der ursprüngliche ImageNet-Klassifikationskopf wurde entfernt und die verbleibenden Gewichte in einer Datei zusammengefasst.

In Modus A lernt ein linearer Softmax-Klassifikator seine Gewichte mit Gradientenabstieg auf den normalisierten Merkmalsvektoren und den zugeordneten Kategorien. Die Oberfläche zeigt Softmax-Modellwerte. Diese sind keine Garantie für eine richtige Zuordnung. In Modus B ordnet k-Means die normalisierten Merkmalsvektoren anhand quadrierter euklidischer Abstände Gruppenzentren zu und berechnet die Zentren anschließend neu.

Quellen und Lizenzen der mitgelieferten Komponenten finden sich in [vendor](vendor) und [model/QUELLE.md](model/QUELLE.md).

## 3. Lokaler Start, Tests und Produktionsbuild

Node.js 22 oder neuer genügt. Die Bibliothek und die Modellgewichte sind enthalten. Öffne ein Terminal im Projektordner und führe aus:

```sh
node --test scripts/lab.test.mjs
node scripts/build.mjs
node scripts/serve.mjs dist
```

Öffne [die lokale Vorschau](http://127.0.0.1:4173/) im Browser. Mit `node scripts/serve.mjs` kann auch direkt aus dem Quellordner gearbeitet werden. Das Öffnen über `file://` eignet sich wegen der Browserregeln für Module und Modell-Dateien nicht.

Die automatisierten Tests laden die mitgelieferten MobileNet-Gewichte und berechnen Merkmale für künstliche Bildmuster. Sie prüfen unterschiedliche Vorhersagen für neue Bilder, geänderte Vorhersagen nach Vertauschen der Trainingslabels, Gruppierung und einen Sonderfall mit identischen Merkmalen. Sie prüfen auch die Freigabe der Tensoren nach Inferenz und Modellfreigabe.

## 4. Auf GitHub Pages veröffentlichen

1. Lege ein GitHub-Repository an und übernimm den gesamten Projektordner einschließlich `.github/workflows/pages.yml` in den Branch `main`.
2. Wähle im Repository unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions**.
3. Starte unter **Actions** den Workflow **KI-Labor auf GitHub Pages**, falls er noch nicht gelaufen ist. Der Workflow testet das Projekt, baut `dist/` und veröffentlicht den Build. Spätere Pushes auf `main` lösen ihn automatisch aus.
4. Öffne die im Workflow oder unter **Settings → Pages** angezeigte HTTPS-Adresse. Aktiviere dort **Enforce HTTPS**, falls die Einstellung verfügbar ist. Gib den Lernenden diese Adresse.

Die Anwendung verwendet relative Pfade und kann unter der Projektadresse eines Repositorys liegen. [Offizielle Anleitung zu GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 5. Datenverarbeitung

Der Host liefert ausschließlich statische Projektdateien. Fotodateien werden mit der systemeigenen Dateiauswahl an den Browser übergeben. Bilder und Vorschaudaten, Merkmalsvektoren, der trainierte Klassifikator und Gruppen bleiben im Arbeitsspeicher des Tabs. Es gibt keine Bildübermittlung, Konten, Cookies, Web-Speicher, Analysewerkzeuge oder externen KI-Dienste. Die Content Security Policy beschränkt Netzwerkverbindungen auf den Ursprung der Seite.

**Gesamtes Lernprojekt löschen** bricht laufende Arbeiten ab, widerruft temporäre Bild-URLs und gibt den Klassifikator, die Merkmale und das geladene Bildmodell frei. Ein Neuladen startet ein leeres Lernprojekt. Die Kamera wird über die systemeigene Fotoauswahl geöffnet. Die App hält keinen laufenden Kamerastream. Originale in der Fotomediathek bleiben erhalten.

## 6. iPad-Einschränkungen und Prüfstatus

Die App ist für aktuelles iPadOS Safari mit aktiviertem JavaScript ausgelegt. Die Kamera-Schaltfläche verwendet die native Dateiauswahl mit dem Hinweis auf die rückwärtige Kamera. Ob direkt die Kamera oder ein Auswahlmenü erscheint, entscheidet iPadOS. Bei gesperrter Kamera können vorhandene Bilder über **Bilder auswählen** gewählt werden. Safari-Unterstützung für HEIC hängt von Version und Auswahlweg ab. Falls ein Foto nicht geöffnet werden kann, verwende JPEG oder PNG.

Es passen höchstens 20 Fotos je Kategorie beziehungsweise 20 in die gemeinsame Sammlung. Die App verarbeitet jeweils ein Bild und speichert die verkleinerte Fassung. Bilder ab 32 × 32 Pixeln und bis 24 MB sind zugelassen. Das erste Training lädt Bibliothek und Modell vom selben Host. Auf langsameren Geräten kann die erste Merkmalsberechnung dauern.

Produktionsbuild und automatisierte Modelltests wurden unter Windows ausgeführt. Im integrierten Chromium-Browser wurden der Dateiimport, das Training, zwei unterschiedliche Vorhersagen, k-Means mit zwei und vier Gruppen, der Löschdialog und der Neustart per Neuladen mit künstlich erzeugten Testbildern geprüft. **Echte iPads wurden nicht getestet.** Kamera, Fotomediathek, Touch-Bedienung, Speicherdruck und Laufzeit auf Schul-iPads sind deshalb unbestätigt.

## 7. Kurzanleitung für Lehrkräfte

1. Öffnen Sie die HTTPS-Adresse auf einem Schul-iPad. Prüfen Sie vor der Stunde Kamera, Fotomediathek und den ersten Modellstart.
2. Lassen Sie Kleingruppen mit zwei Objektarten starten, etwa Stiften und Radiergummis. Sammeln Sie einige Beispiele und testen Sie mit frischen Fotos.
3. Lassen Sie die Lernenden Bilder ergänzen, Hintergründe wechseln und ein fremdes Objekt testen. Vergleichen Sie die Modellwerte vor und nach dem erneuten Training.
4. Wechseln Sie zu Modus B. Lassen Sie 6–20 Fotos ohne Labels sammeln und vergleichen Sie die Gruppierung für zwei, drei und vier Gruppen.
5. Schließen Sie mit der Frage, wer in welchem Modus die Zuordnung vorgibt. Löschen Sie anschließend das Lernprojekt über die Schaltfläche im Kopfbereich.

