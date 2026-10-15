# Digitaler Schaltschrank

Interaktiver digitaler Zwilling eines Schaltschranks für die Ausbildung zum/zur Mechatroniker/-in. Bauteile lassen sich im 3D-Modell anklicken und werden auf der Webseite erklärt. Umgekehrt markiert ein Klick auf die Beschreibung das Bauteil im Modell.

Dieses Repository enthält eine **neutrale Beispielversion** mit eigenem Demo-Modell und eigenen Beispieltexten. Es enthält keine Firmenlogos, keine Prüfungsunterlagen und keine Firmen-CAD-Daten.

## Funktionen

| Ansicht | Inhalt |
|---|---|
| **Digitaler Zwilling** | 3D-Modell mit Bauteilverzeichnis, Suche und Kategorie-Filter. Klick im Modell öffnet die Beschreibung, Klick auf eine Karte hebt das Bauteil hervor. |
| **E/A-Zuordnung** | Zuordnungsliste der Ein- und Ausgänge mit Suche und Filter. Eigene Operanden lassen sich eintragen und als CSV exportieren. |
| **Prüfprotokoll** | Protokoll angelehnt an DIN VDE 0100-600 mit Bewertung OK / nicht OK, Messwerten und Fortschrittsanzeige. Zwei getrennte Protokolle (Vorprüfung, Inbetriebnahme). |
| **Umbau** | Abhakbare Checkliste für Umbauarbeiten mit Sprung zu betroffenen Bauteilen. |
| **GRAFCET** | Beispielablauf als Liste und Schritt-Simulation. |
| **Modell-Check** | Liest das GLB aus und zeigt Größe, Anzahl der Teile, Materialien und Dreiecke, prüft die Benennung nach BMK und ob jedes Bauteil aus dem Verzeichnis im Modell verknüpft ist. Erzeugt eine Stückliste (CSV), einen druckbaren Prüfbericht und eine Messreihe für Vorher-Nachher-Vergleiche. |
| **QR-Codes** | Erzeugt druckbare QR-Etiketten für jedes Bauteil. Der Code öffnet die Seite direkt beim passenden Bauteil. |

Weiteres:

- Direktlinks zu Bauteilen, zum Beispiel `index.html#/bauteil/ke1`, auch mit dem BMK (`#/bauteil/-KE1`). Auf jeder Karte gibt es einen Knopf „Link kopieren“.
- Mobile-First-Layout mit unterer Navigation auf dem Smartphone
- Eingaben bleiben im Browser (`localStorage`), es gibt keinen Server und kein Backend
- Druckansicht mit Dokumentenkopf, alle Dokumente lassen sich als PDF speichern
- Kein Build-Schritt, reines HTML, CSS und JavaScript

## Installation

Voraussetzungen: ein aktueller Browser und ein lokaler Webserver. Ein Doppelklick auf `index.html` genügt nicht, weil Browser das 3D-Modell über `file://` blockieren.

```bash
git clone <repository-url>
cd schaltschrank-viewer

# Python 3
python -m http.server 8000
# oder Node.js
npx serve .
```

Danach `http://localhost:8000` öffnen. Alternativ die VS-Code-Erweiterung *Live Server* nutzen.

## Projektstruktur

```
.
├── index.html            Seitengerüst
├── css/
│   ├── style.css         Grunddesign, Farben in :root
│   └── views.css         Protokoll, Umbau, GRAFCET, Druckansicht
├── js/
│   ├── boot.js           lädt die Skripte, bevorzugt *.local.js
│   ├── config.js         Name, Logo, Modellpfad, Hervorhebungsfarbe
│   ├── data.js           Bauteile, E/A-Listen, Protokoll, Checkliste, GRAFCET
│   ├── util.js           Hilfsfunktionen
│   ├── qr.js             eigener QR-Code-Generator (ohne Bibliothek)
│   ├── glb-inspect.js    liest die Struktur einer GLB-Datei
│   ├── model.js          Modell-Check, Stückliste, Messreihe
│   ├── qrview.js         QR-Etiketten
│   ├── app.js            3D-Verknüpfung, Karten, Filter, CSV, Ansichtswechsel
│   ├── protocol.js       Prüfprotokoll
│   ├── rework.js         Umbau-Checkliste
│   └── grafcet.js        GRAFCET-Pläne und Simulation
└── assets/
    ├── demo-schaltschrank.glb   eigenes, vereinfachtes Demo-Modell
    └── logo-placeholder.svg     Platzhalter-Logo
```

## Anpassen

**Name, Logo, Modell:** in `js/config.js`. Der Titel, das Logo und der Kopf der Ausdrucke kommen von dort.

**Inhalte:** alles Fachliche steht in `js/data.js`. Ein neues Bauteil ist ein Eintrag in `COMPONENTS`:

```js
{
  id: "qa3", bmk: ["-QA3"], category: CATEGORIES[2], blatt: [],
  title: "Neues Schütz",
  summary: "Kurzbeschreibung für die Karte.",
  details: [["Bauart", "…"], ["Spannung", "24 V DC"]],
}
```

**Farben:** Variablen oben in `css/style.css` (`--brand`, `--gradient`, `--orange`). Die Hervorhebung im Modell steht in `js/config.js` (`highlight`).

## Eigenes 3D-Modell verwenden

Die Verknüpfung funktioniert über Namen: Jedes Material im GLB muss genau so heißen wie das Betriebsmittelkennzeichen (BMK, z. B. `-QA2`).

1. In der CAD-Software jede Baugruppe mit dem BMK benennen.
2. Als GLB exportieren und in `assets/` ablegen, den Pfad in `js/config.js` (`model`) eintragen. Optional lässt sich unter `modelWired` ein zweites GLB mit Leitungen eintragen. Dann erscheint im 3D-Fenster der Schalter „Verdrahtung“; Enthält das GLB die Animation `QB1_Schalten`, erscheint zusätzlich der Knopf „Hauptschalter“ (Stellung des Griffs im Modell in `mainSwitchInModel`). Leitungen heißen im Modell `_Leitung_<Nr>|<Netz>|<Typ>|<von>|<nach>`.
3. Zoom auf Bauteile: `python3 tools/make_focus.py assets/dein-modell.glb js/focus.js` erzeugt die Tabelle (Mittelpunkt/Radius je Bauteil, Schlüssel = Materialname vor `|`). Auf dem Smartphone springt ein Tipp auf eine Bauteil-Karte damit direkt ins 3D-Modell und zoomt heran; auf allen Geräten gibt es in der Karte den Knopf „Im 3D-Modell zeigen“. Die Leitungs-Legende ist ein Dropdown (mobil zunächst eingeklappt).
3. Gleichfarbige Bauteile teilen sich beim Export oft ein Material. Dann färbt die Hervorhebung fremde Teile mit. Jede Baugruppe braucht ein eigenes Material, dessen Name dem BMK entspricht.
4. Das BMK in `js/data.js` unter `bmk: [...]` eintragen.

Bauteile ohne Material im Modell werden in der Liste automatisch mit „nicht im 3D-Modell“ markiert.

**Modell-Check nutzen:** Der Reiter „Modell-Check“ zeigt für jedes Bauteil, ob Baugruppe und Material zum BMK passen. Knoten und Materialien, die bewusst nicht anklickbar sein sollen (Gehäuse, Tragschienen), benennst du mit einem Unterstrich am Anfang, zum Beispiel `_Gehaeuse`. Sie werden dann nicht als „ohne BMK“ gemeldet.

## QR-Codes für den Schaltschrank

Im Reiter „QR-Codes“ trägst du die Adresse ein, unter der die Seite im Netzwerk erreichbar ist (nicht `localhost`, sondern z. B. die IP-Adresse oder der Servername). Danach druckst du die Etiketten. Ein Scan öffnet das Bauteil mit Beschreibung und Markierung im 3D-Modell. Der QR-Generator läuft komplett im Browser, es werden keine Daten an Dienste gesendet.

## Private Dateien lokal ergänzen

Wer mit Firmenlogo, Firmenmodell oder Unterlagen arbeitet, legt diese **nur lokal** ab. Dafür sind drei Dateien vorgesehen, die in der `.gitignore` stehen und nie ins Repository gelangen:

| Datei | Wirkung |
|---|---|
| `js/config.local.js` | ersetzt `js/config.js` (Name, Logo, Modell) |
| `js/data.local.js` | ersetzt `js/data.js` (eigene Inhalte, optional `PDF_URL`) |
| `css/theme.local.css` | überschreibt die Standardfarben |
| `assets/local/` | Ablageort für Logo, eigenes GLB und PDF |

Existiert eine `*.local.js`, hat sie Vorrang vor der Standarddatei (siehe `js/boot.js`). Zum Einrichten die Dateien in die gleichnamigen Ordner kopieren. Vor jedem Push mit `git status` prüfen, dass keine dieser Dateien aufgeführt wird.

## Technik

- [`<model-viewer>`](https://modelviewer.dev/) 3.4.0 von Google (Apache-2.0), geladen über CDN. Für den Offline-Betrieb die Datei lokal ablegen und im `<head>` verlinken.
- Vanilla JavaScript (ES2020), kein Framework, kein Build.
- Systemschrift, es werden keine Webfonts nachgeladen.

## Hinweise

Dieser Abschnitt ist keine Rechtsberatung.

- **Datenschutz:** Die Seite speichert Eingaben nur lokal im Browser. Das `model-viewer`-Skript wird von einem Google-CDN geladen, dabei wird die IP-Adresse der Besucher übertragen. Wer die Seite öffentlich betreibt, sollte das Skript selbst hosten und prüfen, ob ein Impressum und eine Datenschutzerklärung nötig sind.
- **Prüfprotokoll:** Das Protokoll ist eine Lernhilfe. Es ersetzt weder die aktuelle DIN VDE 0100-600 noch die Prüfung und Bewertung durch eine Elektrofachkraft. Die Richtwerte (1 MΩ, 50 V, 300 ms) sind Hinweise.
- **Sicherheit:** Arbeiten an elektrischen Anlagen nur durch Elektrofachkräfte bzw. unter Aufsicht, nach den fünf Sicherheitsregeln (DIN VDE 0105-100).
- **Marken:** Alle genannten Produkt- und Firmennamen gehören ihren Inhabern. Das Projekt ist ein privates Ausbildungsprojekt und steht in keiner Verbindung zu Herstellern oder Prüfungsstellen.

## Lizenz

[MIT-Lizenz](LICENSE), gilt für den Quelltext sowie das Demo-Modell und das Platzhalter-Logo dieses Repositories.

## Autor

[Name], [Ausbildungsjahr]


**Bedienung:** Am PC zeigt das Überfahren eines Bauteils eine Kurzbeschreibung (Kennzeichen und Name). Am Smartphone öffnet der erste Tipp die Kurzbeschreibung, der zweite springt zur Bauteilliste.
