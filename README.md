# Digitaler Schaltschrank (IHK AP2 Winter 2025/26)

Start: Ordner über einen lokalen Webserver öffnen, z. B.
    python -m http.server 8000     (dann http://localhost:8000)
oder die VS-Code-Erweiterung "Live Server". Ein Doppelklick auf index.html
reicht nicht, weil der Browser das 3D-Modell per file:// blockiert.

Struktur
  index.html          Seitengerüst
  css/style.css       Design (Farben oben in :root)
  js/data.js          Bauteil-Texte, E/A-Liste, PDF-Einstellungen
  js/app.js           Logik (3D-Klick <-> Karten, Filter, CSV)
  assets/             schaltschrank.glb, pruefungsunterlagen.pdf

Neues Bauteil verknüpfen
  1. In Inventor den Occurrence-Namen auf das BMK setzen (z. B. "-QA7"), GLB exportieren.
  2. Eintrag in js/data.js unter COMPONENTS ergänzen, bmk: ["-QA7"].
  3. Beim GLB-Export müssen gleichfarbige Bauteile getrennte Materialien bekommen
     (Material-Name = BMK), sonst färbt die Hervorhebung andere Teile mit.

Annahmen bei der Zuordnung im mitgelieferten GLB (Teile ohne BMK-Namen in Inventor):
  3LD21030TK51 -> -QB1 (Hauptschalter), male_CEE -> -XD0, Female_CEE -> -XD13,
  6ES73221BF010AA0 (SPS-Ausgangsmodul) -> -KE1.
Nicht im 3D-Modell vorhanden: -UC2, -UA3, -MA10 (Karten sind trotzdem angelegt).
