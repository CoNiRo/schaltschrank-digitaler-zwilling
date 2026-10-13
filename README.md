# Digitaler Schaltschrank (IHK AP2 Winter 2025/26)

Start: Ordner über einen lokalen Webserver öffnen, z. B.
    python -m http.server 8000     (dann http://localhost:8000)
oder die VS-Code-Erweiterung "Live Server". Ein Doppelklick auf index.html
reicht nicht, weil der Browser das 3D-Modell per file:// blockiert.

Struktur
  index.html          Seitengerüst
  css/style.css       Design (Farben oben in :root)
  css/views.css       Design der Ansichten Protokoll / Umrüstung / GRAFCET, Druck
  js/util.js          Hilfsfunktionen (DOM, Speicher)
  js/data.js          Bauteil-Texte, E/A-Liste, Protokoll, Umrüstung, GRAFCET
  js/app.js           Logik (3D-Klick <-> Karten, Filter, CSV, Ansichtswechsel)
  js/protocol.js      Prüfprotokoll VDE 0100-600 (Vorbereitung + Inbetriebnahme), druckbar
  js/rework.js        Umrüstung: Checkliste zum Vorbereitungsauftrag
  js/grafcet.js       GRAFCET-Pläne und Schritt-Simulation von G_Auto
  assets/             schaltschrank.glb, pruefungsunterlagen.pdf, logo-saint-gobain.png

Neues Bauteil verknüpfen
  1. In Inventor den Occurrence-Namen auf das BMK setzen (z. B. "-QA7"), GLB exportieren.
  2. Eintrag in js/data.js unter COMPONENTS ergänzen, bmk: ["-QA7"].
  3. Beim GLB-Export müssen gleichfarbige Bauteile getrennte Materialien bekommen
     (Material-Name = BMK), sonst färbt die Hervorhebung andere Teile mit.

Annahmen bei der Zuordnung im mitgelieferten GLB (Teile ohne BMK-Namen in Inventor):
  3LD21030TK51 -> -QB1 (Hauptschalter), male_CEE -> -XD0, Female_CEE -> -XD13,
  6ES73221BF010AA0 (SPS-Ausgangsmodul) -> -KE1.
Nicht im 3D-Modell vorhanden: -UC2, -UA3, -MA10 (Karten sind trotzdem angelegt).

Saint-Gobain-Design
  Farben stehen oben in css/style.css (:root): --brand #254A9A (Schriftzug), dazu der
  Farbverlauf aus dem Logo (--gradient). Das 3D-Highlight nutzt das Logo-Orange (#F25C19)
  in js/app.js (HIGHLIGHT).
  Logo tauschen: assets/logo-saint-gobain.png ersetzen (transparenter Hintergrund, ca. 640 px breit).
  Beim Drucken / "Als PDF speichern" erscheint auf jedem Dokument der Kopf mit Logo
  (Block .print-header in index.html). Die CSV-Datei enthält nur Textkopfzeilen, kein Logo.
