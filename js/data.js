/* ==========================================================
 * data.js – Inhalte der Seite (neutrales Beispiel)
 * Alle Texte sind eigene Beispieltexte. Ersetze sie durch deine
 * eigenen Inhalte oder lege eine js/data.local.js an (siehe README),
 * die diese Datei vollständig ersetzt.
 * ========================================================== */

// Optionales PDF mit Schaltplänen ("" = keine Links zu Schaltplanblättern)
const PDF_URL = "";
const PDF_OFFSET = 0;                       // PDF-Seite = Blattnummer + PDF_OFFSET
const BLATT_TO_SEITE = (blatt) => blatt;
const LAYOUT_PAGE = 0;                      // Seite der Aufbauzeichnung (0 = kein Link)

const VIEW_TITLES = {
  twin: "Bauteilverzeichnis Schaltschrank",
  io: "Zuordnungsliste der Ein- und Ausgänge",
  protocol: "Prüfprotokoll",
  rework: "Umbau – Checkliste",
  grafcet: "GRAFCET – Beispielablauf",
};

const CATEGORIES = [
  "Einspeisung & Schutz",
  "Versorgung & Steuerung",
  "Schalten & Antrieb",
  "Klemmen & Anschluss",
  "Bedienung & Peripherie",
];

/* bmk   = Material-Name im GLB (genau wie das Betriebsmittelkennzeichen)
 * blatt = Schaltplanblätter, nur mit PDF_URL als Link sichtbar
 * Bauteile ohne passendes Material im Modell werden automatisch als
 * "nicht im 3D-Modell" markiert.                                      */
const COMPONENTS = [
  {
    id: "qb1", bmk: ["-QB1"], category: CATEGORIES[0], blatt: [],
    title: "Hauptschalter",
    summary: "Trennt die gesamte Anlage vom Netz und lässt sich gegen Wiedereinschalten sichern.",
    details: [["Bauart", "Lasttrennschalter, 3-polig"], ["Beispielwert", "25 A"], ["Hinweis", "Erste Maßnahme beim Freischalten"]],
  },
  {
    id: "fc1", bmk: ["-FC1"], category: CATEGORIES[0], blatt: [],
    title: "Leitungsschutzschalter",
    summary: "Schützt eine Leitung vor Überlast und Kurzschluss.",
    details: [["Bauart", "Leitungsschutzschalter, 1-polig"], ["Beispielwert", "B 10 A"], ["Auswahl", "Nach Leitungsquerschnitt und Last"]],
  },
  {
    id: "fb1", bmk: ["-FB1"], category: CATEGORIES[0], blatt: [],
    title: "Fehlerstrom-Schutzschalter (RCD)",
    summary: "Schaltet bei Fehlerströmen gegen Erde ab und schützt Personen.",
    details: [["Bauart", "RCD, 2-polig"], ["Beispielwert", "30 mA, Typ A"], ["Prüfung", "Prüftaste regelmäßig betätigen"]],
  },
  {
    id: "tb1", bmk: ["-TB1"], category: CATEGORIES[1], blatt: [],
    title: "Netzteil 24 V DC",
    summary: "Erzeugt die Steuerspannung für SPS, Sensoren und Meldeleuchten.",
    details: [["Ausgang", "24 V DC"], ["Beispielwert", "4 A"]],
  },
  {
    id: "ke1", bmk: ["-KE1"], category: CATEGORIES[1], blatt: [],
    title: "SPS",
    summary: "Speicherprogrammierbare Steuerung: liest Eingänge ein und schaltet Ausgänge nach dem Programm.",
    details: [["Versorgung", "24 V DC"], ["Beispiel", "16 Eingänge, 16 Ausgänge"]],
  },
  {
    id: "ke2", bmk: ["-KE2"], category: CATEGORIES[0], blatt: [],
    title: "Sicherheitsrelais",
    summary: "Überwacht den NOT-AUS-Kreis und gibt die Antriebe nur im sicheren Zustand frei.",
    details: [["Kanäle", "zweikanalig"], ["Rückführkreis", "überwacht die Schütze"]],
  },
  {
    id: "qa", bmk: ["-QA1", "-QA2"], category: CATEGORIES[2], blatt: [],
    title: "Wendeschütze",
    summary: "Schalten einen Drehstrommotor in beide Drehrichtungen. Gegenseitige Verriegelung verhindert Kurzschluss.",
    details: [["-QA1", "Rechtslauf"], ["-QA2", "Linkslauf"], ["Verriegelung", "Öffner im Spulenkreis des anderen Schützes"]],
  },
  {
    id: "fc2", bmk: ["-FC2"], category: CATEGORIES[0], blatt: [],
    title: "Motorschutzschalter",
    summary: "Schützt den Motor vor Überlast. Der Hilfskontakt meldet den Zustand an die SPS.",
    details: [["Einstellung", "auf den Motornennstrom"], ["Hilfskontakt", "1 S + 1 Ö"]],
  },
  {
    id: "xd1", bmk: ["-XD1", "-XDPE"], category: CATEGORIES[3], blatt: [],
    title: "Reihenklemmen",
    summary: "Verteilen Potentiale und führen Signale zu den Steckverbindern. PE-Klemmen sind grün-gelb.",
    details: [["-XD1", "Klemmen für Steuerstromkreis"], ["-XDPE", "Schutzleiterklemmen"]],
  },
  {
    id: "uc1", bmk: ["-UC1"], category: CATEGORIES[4], blatt: [],
    title: "Bedieneinheit",
    summary: "Externes Gehäuse mit Tastern und Meldeleuchten. Beispiel für ein Bauteil, das nicht im 3D-Modell enthalten ist.",
    details: [["Inhalt", "NOT-AUS, Start, Stopp, Meldeleuchten"]],
  },
  {
    id: "ma1", bmk: ["-MA1"], category: CATEGORIES[2], blatt: [],
    title: "Antrieb",
    summary: "Drehstrom-Getriebemotor einer Achse. Ebenfalls nur als Beispielkarte angelegt.",
    details: [["Anschluss", "über Wendeschütze -QA1 und -QA2"]],
  },
];

/* Zuordnungslisten (Beispiel) */
const IO_INPUTS = [
  ["I0", "-KE2", "Meldung NOT-AUS in Ordnung"],
  ["I1", "-SJ1", "Taster Steuerung EIN"],
  ["I2", "-SJ2", "Taster Steuerung AUS"],
  ["I3", "-BG1", "Sensor Zylinder eingefahren"],
  ["I4", "-BG2", "Sensor Teil vorhanden"],
  ["I5", "-BG3", "Sensor Zylinder ausgefahren"],
  ["I6", "-FC2", "Motorschutz in Ordnung"],
];
const IO_OUTPUTS = [
  ["O0", "-QA1", "Motor Rechtslauf"],
  ["O1", "-QA2", "Motor Linkslauf"],
  ["O2", "-MB1", "Ventil Zylinder ausfahren"],
  ["O3", "-PF1", "Meldeleuchte Betrieb"],
  ["O4", "-PF2", "Meldeleuchte Störung"],
];

/* ==========================================================
 * Prüfprotokoll – angelehnt an DIN VDE 0100-600
 * Lernhilfe, ersetzt keine normgerechte Prüfdokumentation
 * ========================================================== */
const PROTOCOL = {
  title: "Prüfprotokoll (angelehnt an DIN VDE 0100-600)",
  note: "Eingaben werden automatisch in diesem Browser gespeichert. Es sind zwei getrennte Protokolle möglich: Vorprüfung und Inbetriebnahme.",
  modes: {
    prep: { short: "Vorprüfung", long: "Vorprüfung vor der Inbetriebnahme" },
    start: { short: "Inbetriebnahme", long: "Inbetriebnahme" },
  },
  art: ["Neuanlage", "Erweiterung", "Änderung", "Instandsetzung"],
  besichtigung: [
    ["Unterlagen vollständig", "Schaltplan und Aufbau stimmen überein"],
    ["Betriebsmittel", "Auswahl, Zustand, Kennzeichnung"],
    ["Leitungen und Anschlüsse", "Querschnitt, Farbe, Absetzen, Befestigung"],
    ["PE- und N-Leiter", "Anschluss und Kennzeichnung"],
    ["Schutz gegen direktes Berühren", "Abdeckungen, Fingersicherheit"],
    ["Überstromschutz", "Auswahl und Einstellung"],
    ["Keine erkennbaren Mängel zum Zeitpunkt der Prüfung", ""],
  ],
  erprobung: [
    ["Funktion der Anlage", "gemäß Schaltplan und Funktionsbeschreibung"],
    ["Funktion der RCD", "Prüftaste betätigen"],
  ],
  abschluss: "Die Anlage entspricht nach meiner Prüfung den anerkannten Regeln der Technik und ist mängelfrei.",
  normhinweis: "Hinweis: Dieses Formular ist eine Lernhilfe und ersetzt keine normgerechte Prüfdokumentation durch eine Elektrofachkraft.",
};

/* ==========================================================
 * Checkliste für Umbauarbeiten (allgemein)
 * show = IDs aus COMPONENTS, die im 3D-Modell markiert werden
 * go   = [Ansicht, Beschriftung] für einen Sprung in eine andere Ansicht
 * ========================================================== */
const REWORK_META = {
  title: "Umbau – Checkliste",
  intro: "Allgemeine Checkliste für Umbau- und Erweiterungsarbeiten an einem Schaltschrank. Passe die Schritte in js/data.js an deinen Auftrag an.",
  targetTitle: "Beispiel: Sollverhalten nach dem Umbau",
  stepsTitle: "Arbeitsschritte",
  hintsTitle: "Hinweise",
  pdf: null,
};

const REWORK_STEPS = [
  { title: "Auftrag und Unterlagen prüfen",
    text: "Auftrag, Schaltplan und Zuordnungsliste lesen und offene Fragen klären." },
  { title: "Anlage freischalten",
    text: "Die fünf Sicherheitsregeln nach DIN VDE 0105-100 anwenden: freischalten, gegen Wiedereinschalten sichern, Spannungsfreiheit feststellen, erden und kurzschließen, benachbarte Teile abdecken.",
    show: ["qb1"] },
  { title: "Bauteile demontieren",
    text: "Nicht mehr benötigte Bauteile ausbauen und Leitungen vorher kennzeichnen.",
    show: ["qa"] },
  { title: "Neue Bauteile montieren und verdrahten",
    text: "Bauteile nach Aufbauzeichnung montieren, Leitungen anschließen und beschriften." },
  { title: "Zuordnungsliste und Schaltplan anpassen",
    text: "Änderungen in Schaltplan und Zuordnungsliste eintragen.",
    go: ["io", "E/A-Liste öffnen"] },
  { title: "Programm und GRAFCET anpassen",
    bullets: ["Neue Ein- und Ausgänge im Programm anlegen.", "Ablauf im GRAFCET ergänzen und testen."],
    go: ["grafcet", "GRAFCET ansehen"] },
  { title: "Prüfung nach dem Umbau",
    text: "Sichtprüfung, Messungen und Funktionsprüfung durchführen und dokumentieren.",
    go: ["protocol", "Zum Prüfprotokoll"] },
  { title: "Dokumentation abschließen",
    text: "Alle Änderungen und Messwerte festhalten und die Unterlagen übergeben." },
];

const REWORK_TARGET = [
  ["Werkstück A", "Ablage 1", "wird ausgeschoben und abgelegt"],
  ["Werkstück B", "Ablage 2", "wird von Hand entnommen, danach Quittierung mit -SJ1"],
];

const REWORK_HINTS = [
  "Änderungen immer im Schaltplan vermerken.",
  "Vor dem Wiedereinschalten Schutzleiterdurchgängigkeit und Isolationswiderstand messen.",
];

/* ==========================================================
 * GRAFCET – Beispielablauf
 * Aktionen: { t: Text, c: Bedingung (optional) }
 * out = Übergänge { c: Bedingung, to: Folgeschritt }, ¬ = Negation
 * ========================================================== */
const GRAFCET_META = {
  title: "GRAFCET – Beispielablauf",
  note: "Beispiel für die Darstellung. Ersetze die Pläne in js/data.js (GRAFCETS) durch deine eigenen.",
  simEnd: "Zyklus beendet. Weiter mit Schritt 500.",
};

const GRAFCETS = [
  { id: "haupt", title: "Hauptgrafcet",
    steps: [
      { n: "1", init: true, act: [], out: [{ c: "-KE2 * -SJ1", to: "2" }] },
      { n: "2", act: [{ t: "G_Auto { INIT }" }, { t: "-PF1" }], out: [{ c: "-SJ2 + ¬-KE2", to: "1" }] },
    ] },
  { id: "auto", title: "G_Auto",
    steps: [
      { n: "500", init: true, act: [], out: [{ c: "-SJ1 * -BG1 * -BG2", to: "501" }] },
      { n: "501", act: [{ t: "Werkstück prüfen" }], out: [{ c: "[Teil = A]", to: "502" }, { c: "[Teil = B]", to: "503" }] },
      { n: "502", act: [{ t: "-MB1" }], out: [{ c: "2 s / -BG3", to: "504" }] },
      { n: "503", act: [{ t: "-QA1" }], out: [{ c: "3 s / -BG3", to: "504" }] },
      { n: "504", act: [{ t: "-PF1", c: "Takt" }], out: [{ c: "-BG1", to: "505" }] },
      { n: "505", act: [], out: [{ c: "¬-BG2", to: "500" }] },
    ],
    paths: {
      a: ["500", "501", "502", "504", "505"],
      b: ["500", "501", "503", "504", "505"],
    },
    pathNames: { a: "Werkstück A", b: "Werkstück B" },
  },
  { id: "einricht", title: "G_Einricht",
    steps: [
      { n: "300", init: true, act: [], out: [{ c: "¬-SJ1", to: "301" }] },
      { n: "301", act: [{ t: "-QA1", c: "-SJ1 * ¬-BG3" }, { t: "-QA2", c: "-SJ2 * ¬-BG1" }], out: [{ c: "-SJ1", to: "300" }] },
    ] },
];
