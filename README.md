# Koreanisch-Karten

Ein kleiner Vokabeltrainer für Koreanisch im Stil von Anki – als Web-App, die auf dem iPhone wie eine normale App läuft, auch offline.

- **Spaced Repetition (SM-2):** Nach jeder Karte bewertest du *Nochmal / Schwer / Gut / Leicht*, die App plant die nächste Wiederholung.
- **Beide Richtungen:** Koreanisch → Deutsch und Deutsch → Koreanisch. Die zweite Richtung kommt erst, wenn du die Karte in der ersten schon einmal konntest.
- **Sprachausgabe** mit der koreanischen Systemstimme des iPhones.
- **Startset** mit rund 170 Karten: Hangul, Begrüßung, Zahlen, Essen, Familie, Alltag, Verben, Adjektive, Fragewörter.
- **Eigene Karten** direkt in der App anlegen oder per CSV importieren.
- **Backup** als JSON exportieren und wieder einspielen.

Alles bleibt lokal auf dem Gerät, es gibt keinen Server und kein Konto.

## Auf GitHub Pages veröffentlichen

1. Öffentliches Repository: [Qtree1990/Korean-Vocab](https://github.com/Qtree1990/Korean-Vocab).
2. Alle Dateien liegen im Branch `main`.
3. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, Branch **main**, Ordner **/ (root)** → Save.
4. Nach ein bis zwei Minuten ist die App unter **https://qtree1990.github.io/Korean-Vocab/** erreichbar.

## Auf dem iPhone installieren

1. Die Adresse in **Safari** öffnen.
2. Teilen-Symbol → **Zum Home-Bildschirm**.
3. Ab jetzt die App über das Icon starten – nicht über Safari, sonst landet der Fortschritt in einem anderen Speicher.

Keine Stimme zu hören? Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Koreanisch → Stimme laden.

## Vokabeln erweitern

Die eingebauten Karten stehen in `vocab.json`. Neue Stapel oder Wörter einfach dort ergänzen:

```json
{ "name": "Neuer Stapel", "cards": [ { "ko": "사랑", "rom": "sarang", "de": "Liebe" } ] }
```

Der Lernfortschritt hängt am Stapelnamen und am koreanischen Wort. Wer beides ändert, fängt bei dieser Karte von vorne an.

CSV-Import in der App: eine Karte pro Zeile, `Koreanisch;Lautschrift;Deutsch` oder `Koreanisch;Deutsch`.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Grundgerüst |
| `app.js` | gesamte Logik (Planung, Ansichten, Import/Export) |
| `style.css` | Gestaltung, hell und dunkel |
| `vocab.json` | eingebaute Vokabeln |
| `sw.js` | Service Worker für Offline-Betrieb |
| `manifest.webmanifest`, `icons/` | App-Name und Icon für den Home-Bildschirm |
