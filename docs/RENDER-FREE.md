# Render Free: Spengler Picks

Die Anwendung läuft als Node-Web-Service auf Render Free. Der öffentliche
Quellcode enthält keine Match-CSV-Dateien. Die Daten kommen aus einem separat
hinterlegten Secret File. Das Secret ist komprimiert und Base64-kodiert, nicht
verschlüsselt. Behandle es wie die ursprünglichen vertraulichen CSV-Dateien.

## 1. Lokal vorbereitet

- `render.yaml`: Free, Frankfurt, Branch `main`, Auto-Deploy bei jedem Commit,
  Build- und Startbefehl, Node 24.22.1 und Health Check `/api/health`.
- `.node-version` und `package.json`: feste Node-/pnpm-Konfiguration.
- `pnpm run render:pack-data`: erzeugt `.render-secrets/match-data.b64` aus den
  fünf erwarteten CSVs in `data/`. Originaldateien bleiben unverändert.
- `pnpm run render:start`: liest das Render Secret File, validiert Dateinamen und
  Prüfsummen, entpackt nach `.render-data/`, führt Datentests aus und startet
  Next.js auf `0.0.0.0:$PORT`.
- `MATCH_DATA_DIR`: optionaler interner Datenpfad. Lokal bleibt `data/` der
  Standard; beim Render-Start standardmässig `.render-data/`.
- `MATCH_DATA_SECRET_FILE`: nur für einen abweichenden Secret-Pfad oder lokale
  Tests nötig. Standard: `/etc/secrets/match-data.b64`, dann `./match-data.b64`.

`.render-secrets/`, `.render-data/`, `match-data.b64` und `data/` sind in Git
ignoriert. Keine dieser Dateien manuell mit `git add -f` hinzufügen. Keine
CSV-Dateien oder das Secret nach `public/` kopieren. Die Erzeugung bricht ab,
wenn das Secret grösser als 950.000 Bytes wird. Render erlaubt insgesamt
höchstens 1 MB Secret Files pro Service bzw. Environment Group.

## 2. Änderungen auf GitHub bereitstellen

Prüfe `git diff` und `git status`. Committe die Codeänderungen, Konfiguration,
Tests und diese Anleitung und pushe sie nach `main`. Bereits vorhandene lokale
Änderungen gehören ebenfalls in eine bewusst geprüfte Abgabe. Das Secret darf
nicht in der Liste der zu committenden Dateien stehen.

Render sieht nur gepushte Commits. Der lokale Projektordner auf dem Mac ist
für Render nicht zugänglich. Dieses Setup pusht oder veröffentlicht nichts
selbständig.

## 3. Service bei Render anlegen

Der unkomplizierte Weg ist die manuelle Anlage eines Web Service mit den Werten
aus `render.yaml`. Dabei kannst du das Secret vor dem ersten Start hinterlegen.

1. In Render **New > Web Service** wählen.
2. Unter **Git Provider** GitHub verbinden und Zugriff auf
   `nadlerfabian/SIC-Hackathon-FHGR` erlauben. Nicht nur die öffentliche
   Repository-URL einfügen: Für Auto-Deploy wird die GitHub-Verknüpfung benötigt.
3. Folgende Einstellungen verwenden:

| Einstellung | Wert |
| --- | --- |
| Name | `spengler-picks-demo` oder verfügbarer Wunschname |
| Branch | `main` |
| Region | Frankfurt |
| Root Directory | leer, das Projekt liegt im Repository-Root |
| Language / Runtime | Node |
| Instance Type | **Free** |
| Build Command | `pnpm install --frozen-lockfile && pnpm run test:deployment && pnpm build` |
| Start Command | `pnpm run render:start` |
| Health Check Path | `/api/health` |
| Auto-Deploy | **On Commit** |

Node wird über `.node-version` festgelegt. Optional zusätzlich
`NODE_VERSION=24.22.1` und `NEXT_TELEMETRY_DISABLED=1` setzen, wie in `render.yaml`.
`PORT` stellt Render bereit; nicht fest auf 3000 einstellen. Keine eigene
Datenbank, kein Laufwerk und keine Zahlungsoption sind für dieses Setup nötig.

Alternativ **New > Blueprint** verwenden und die `render.yaml` aus dem verbundenen
Repository auswählen. Der erste Start kann dabei wegen des noch fehlenden Secret
Files scheitern. Dann das Secret wie unten hinzufügen und erneut deployen. Bei
Blueprint-Verwaltung Konfigurationsänderungen künftig in `render.yaml` pflegen.
Bei manueller Anlage liest Render diese YAML nicht automatisch ein.

## 4. Secret File hinterlegen

1. Lokal `pnpm run render:pack-data` ausführen. Das wurde für den aktuellen
   Datensatz bereits erledigt.
2. `.render-secrets/match-data.b64` lokal als Textdatei öffnen und den vollständigen
   Inhalt kopieren. Optional unter macOS im Projektordner:

   ```sh
   pbcopy < .render-secrets/match-data.b64
   ```

3. Im Render-Service **Environment > Secret Files > Add Secret File** wählen.
4. Filename exakt **`match-data.b64`**, ohne Ordnerpfad.
5. Den gesamten Dateiinhalt in **Contents** einfügen und speichern.
6. Service erstellen bzw. nach dem Speichern neu deployen. Falls nötig
   **Manual Deploy > Deploy latest commit** auslösen.

Ein fehlendes oder beschädigtes Secret führt zu einem fehlgeschlagenen Start.
Das Skript verwendet dann absichtlich keine eventuell vorhandenen alten Daten.
Der normale Build benötigt das Secret nicht: Dort laufen Tests ohne Matchdaten.
Beim Start prüfen die Daten- und Replay-Tests die tatsächlichen entpackten CSVs.

## 5. Ersten Deploy kontrollieren

In den Logs sollten nacheinander erscheinen:

- erfolgreicher Produktions-Build;
- `Restored 5 private match-data files`;
- erfolgreiche Daten-/Replay-Tests;
- Next.js startet und Render meldet den Service als **Live**.

Die Adresse lautet etwa `https://spengler-picks-demo.onrender.com`, sofern der
Name frei ist. `/api/health` muss HTTP 200 und `{"status":"ok"}` zurückgeben.
Danach `/`, `/picks`, `/stats` und `/progress` und alle Demo-Runden prüfen.
Direkte Zugriffe auf `/data/...`, `/.render-data/...` und `/match-data.b64`
dürfen keine Dateien liefern.

## 6. Weitere Codeänderungen und neue Daten

- Code ändern, lokal testen, committen und nach `main` pushen.
- Render baut automatisch neu. Das Secret bleibt separat hinterlegt.
- **On Commit** verwenden. **After CI Checks Pass** wartet auf GitHub-Checks;
  dieses Projekt richtet keine GitHub-Actions-Pipeline ein. Die Prüfungen
  laufen stattdessen im Render-Build und beim Serverstart.
- Wenn die CSVs wechseln: Secret lokal neu erzeugen und in Render ersetzen.
  Ohne neue Matchdaten ist kein erneutes Hochladen erforderlich.
- Für einen stabilen Vortragsstand während des Vortrags keine neuen Änderungen
  nach `main` pushen. Alternativ Render später mit einem eigenen `demo`-Branch
  verbinden und nur geprüfte Versionen dorthin übernehmen.

## 7. Verhalten und Grenzen

Render Free hat kein persistentes Laufwerk. Deshalb stellt jeder Serverstart die
Dateien erneut aus dem Secret her. Nach 15 Minuten ohne Zugriffe schläft die App
ein; das Aufwachen kann ungefähr eine Minute dauern. Vor dem Vortrag rechtzeitig
öffnen und laden lassen. Das blosse Offenlassen eines Tabs erzeugt nicht
zwangsläufig laufend Zugriffe.

Die Raw-CSV-Dateien und das Secret werden nicht als Downloads ausgeliefert.
Statistiken und Ereignisse, die die Webseite über `/api/match` erhält, sind für
Besucher jedoch auslesbar. Dieses Setup enthält keinen Passwortschutz. Verwende
nur für diese Demo freigegebene Daten bzw. ergänze eine Zugriffsbeschränkung,
wenn der Teilnehmerkreis beschränkt bleiben muss.

Tipps, Punkte und Demo-Phase bleiben wie bisher im Browser gespeichert. Es gibt
keine gemeinsame Rangliste oder synchronisierte Spielsteuerung durch dieses
Deployment. Ein Redeploy setzt den Browser-Spielstand normalerweise nicht zurück.

## Dokumentation

- https://render.com/docs/deploy-nextjs-app
- https://render.com/docs/configure-environment-variables#secret-files
- https://render.com/docs/deploys
- https://render.com/docs/free
