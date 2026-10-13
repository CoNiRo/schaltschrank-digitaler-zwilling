/* ==========================================================
 * data.js – Inhalte der Seite (Bauteile + E/A-Liste)
 * Quelle: IHK AP Teil 2 Winter 2025/26, Mechatroniker/-in (W25 0942)
 * Hier kannst du Texte ändern oder Bauteile ergänzen, ohne den
 * restlichen Code anzufassen.
 * ========================================================== */

// PDF mit den Prüfungsunterlagen (leer lassen = keine E-Plan-Links)
const PDF_URL = "assets/pruefungsunterlagen.pdf";
// PDF-Seite = Heftseite + 2 (die 2-seitige Änderungsmitteilung steht davor)
const PDF_OFFSET = 2;
// E-Plan Blatt n steht im Heft auf Seite 28 + n
const BLATT_TO_SEITE = (blatt) => 28 + blatt;

const CATEGORIES = [
  "Einspeisung & Schutz",
  "Versorgung & Steuerung",
  "Schalten & Antrieb",
  "Klemmen & Anschluss",
  "Bedienung & Peripherie",
];

/* bmk   = Material-/Bauteilnamen im GLB (exakt wie in Inventor, mit "-")
 * blatt = E-Plan-Blätter (1–12)
 * Bauteile ohne Eintrag im 3D-Modell werden automatisch als
 * "nicht im Modell" markiert.                                       */
const COMPONENTS = [
  {
    id: "qb1", bmk: ["-QB1"], category: CATEGORIES[0], blatt: [1],
    title: "Hauptschalter",
    summary: "3-poliger Lasttrennschalter zur Netztrennung der Drehstromeinspeisung 3/N/PE 400 V/50 Hz.",
    details: [["Bauart", "Lasttrennschalter, 3-polig, IP 40"], ["Bemessungsstrom", "ca. 25 A"],
              ["Zuleitung", "H07V-K 2,5 mm², orange"]],
  },
  {
    id: "cee", bmk: ["-XD0", "-XD13"], category: CATEGORIES[3], blatt: [1],
    title: "CEE-Anschlüsse",
    summary: "-XD0 ist der Netzanschluss, -XD13 die Steckdose für den Antriebsmotor.",
    details: [["-XD0", "CEE-Drehstromstecker, 5-polig, 400 V/16 A, 6 h"],
              ["-XD13", "CEE-Drehstromsteckdose, 4-polig, 400 V/16 A, 6 h (Motor -MA10)"],
              ["Netzanschluss", "über Verlängerungsleitung 3P/N/PE 230/400 V"]],
  },
  {
    id: "fc0", bmk: ["-FC0"], category: CATEGORIES[0], blatt: [1],
    title: "Schmelzsicherungen",
    summary: "Kurzschluss- und Überstromschutz für den Hauptstromkreis des Antriebs.",
    details: [["Sockel", "D01, 3-polig, mit Schraubkappen"], ["Einsätze", "Neozed D01, 10 A (inkl. Passhülsen)"]],
  },
  {
    id: "fc1", bmk: ["-FC1"], category: CATEGORIES[0], blatt: [1],
    title: "Leitungsschutzschalter B10",
    summary: "Schützt den 230-V-Kreis mit RCD und Steckdose.",
    details: [["Auslösecharakteristik", "B, 10 A, 1-polig"]],
  },
  {
    id: "fb1", bmk: ["-FB1"], category: CATEGORIES[0], blatt: [1],
    title: "FI-Schutzschalter (RCD)",
    summary: "Personenschutz durch Fehlerstromüberwachung im 230-V-Kreis.",
    details: [["Bemessung", "16 A / 10 mA, 2-polig, Typ A"], ["Prüfung", "Auslösezeit und Berührungsspannung nach VDE 0100-600"]],
  },
  {
    id: "xd11", bmk: ["-XD11"], category: CATEGORIES[3], blatt: [1],
    title: "Steckdose 230 V",
    summary: "Schutzkontaktsteckdose auf der Hutschiene, abgesichert über -FC1 und -FB1.",
    details: [["Bauart", "Hutschienenmontage, 230 V, 16 A"]],
  },
  {
    id: "fc34", bmk: ["-FC3", "-FC4"], category: CATEGORIES[1], blatt: [1],
    title: "Leitungsschutz Netzteil",
    summary: "-FC3 sichert die 230-V-Seite des Netzteils, -FC4 den 24-V-DC-Ausgang.",
    details: [["-FC3", "B 6 A, 1-polig"], ["-FC4", "C 4 A, 1-polig"]],
  },
  {
    id: "tb1", bmk: ["-TB1"], category: CATEGORIES[1], blatt: [1],
    title: "Netzteil 24 V DC",
    summary: "Versorgt Steuerstromkreis, SPS und Sensorik mit 24 V DC (PELV).",
    details: [["Ausgang", "24 V DC / 4 A"], ["Alternative", "integriertes Netzteil der SPS"]],
  },
  {
    id: "ke1", bmk: ["-KE1"], category: CATEGORIES[1], blatt: [2],
    title: "SPS",
    summary: "Steuerung der Anlage. Sie liest Taster und Sensoren ein und schaltet Ventile, Schütze und Meldeleuchten.",
    details: [["Versorgung", "24 V DC / 4 A"], ["Ein-/Ausgänge", "24 Eingänge / 24 Ausgänge"],
              ["Einbau", "im Schaltschrank (intern) oder extern über Steckverbinder"]],
  },
  {
    id: "ke2", bmk: ["-KE2"], category: CATEGORIES[0], blatt: [2],
    title: "NOT-AUS-Schaltgerät",
    summary: "Sicherheitsrelais mit zweikanaliger Überwachung des NOT-AUS-Kreises.",
    details: [["Eingangskreis", "zweikanalig, Erd-, Kurz- und Querschlusserkennung"],
              ["Start", "manuell, überwacht (Reset -SJ2)"],
              ["Rückführkreis", "überwacht die Schütze -QA2 und -QA3"],
              ["Meldung an SPS", "Eingang I0 „NOT-AUS o. k.“"]],
  },
  {
    id: "qa23", bmk: ["-QA2", "-QA3"], category: CATEGORIES[2], blatt: [1, 2],
    title: "Leistungsschütze Freigabe",
    summary: "Zwei redundante Schütze schalten den Hauptstromkreis des Antriebs frei, angesteuert vom NOT-AUS-Gerät.",
    details: [["Bauart", "Schütz mit Löschglied, 4 kW, 24 V DC, 3 S + 2 Ö + 2 S"], ["Zweck", "Ausfallsicherheit durch Redundanz"],
              ["Schutzbeschaltung", "an den Spulen vorgesehen"]],
  },
  {
    id: "qa56", bmk: ["-QA5", "-QA6"], category: CATEGORIES[2], blatt: [1, 8],
    title: "Wendeschütze Linkslauf / Rechtslauf",
    summary: "Schalten die Drehrichtung des X-Achsen-Motors um. Der Öffner des jeweils anderen Schützes sperrt den gleichzeitigen Betrieb.",
    details: [["-QA5", "Linksfahrt (Ausgang O6)"], ["-QA6", "Rechtsfahrt (Ausgang O7)"], ["Verriegelung", "gegenseitig über Öffner im Spulenkreis"]],
  },
  {
    id: "qa61", bmk: ["-QA61"], category: CATEGORIES[2], blatt: [9],
    title: "Schütz Magnet deaktivieren",
    summary: "Schaltet den Permanentelektromagneten -MB60 kurz stromlos-magnetisch aus.",
    details: [["Ausgang", "O10"], ["Magnet -MB60", "Permanentelektromagnet, 24 V DC, Haltekraft mind. 45 N"]],
  },
  {
    id: "fc7", bmk: ["-FC7"], category: CATEGORIES[0], blatt: [1, 7],
    title: "Motorschutzschalter",
    summary: "Überwacht den Laststrom des Motors. Der Hilfskontakt meldet „Motorschutz in Ordnung“ an die SPS.",
    details: [["Einstellbereich", "3 × 0,11 – 0,16 A"], ["Hilfskontakt", "1 Ö + 1 S (Eingang I23)"], ["Meldeleuchte", "-PF5 bei Auslösung (Ausgang O14)"]],
  },
  {
    id: "xd1", bmk: ["-XD1", "-XDPE"], category: CATEGORIES[3], blatt: [1],
    title: "Reihenklemmenleiste",
    summary: "Potentialverteilung für 24 V, 0 V und PE sowie Rangierung der SPS-Signale zu den Steckverbindern.",
    details: [["Klemmen", "2,5 mm², grau und blau"], ["PE-Klemmen -XDPE", "2,5 mm² und 6 mm²"], ["Besonderheit", "PELV-Trennklemme für den 24-V-Kreis"]],
  },
  {
    id: "xd23", bmk: ["-XD2", "-XD3"], category: CATEGORIES[3], blatt: [1],
    title: "Klemmleisten Einspeisung / Motor",
    summary: "-XD2 verteilt die Netzspannung nach dem Hauptschalter, -XD3 führt die Motorleitung zur CEE-Steckdose.",
    details: [["-XD2", "L1, L2, L3, N, PE"], ["-XD3", "Motorabgang L1, L2, L3 und PE"]],
  },
  {
    id: "uc2", bmk: ["-UC2"], category: CATEGORIES[4], blatt: [3, 4, 10, 11, 12],
    title: "Anzeige- und Bedieneinheit",
    summary: "Externes Gehäuse mit 18 Einbauplätzen für Taster, Schalter und Leuchtmelder, angeschlossen über -XD12.",
    details: [["NOT-AUS", "-SG1, 2-kanalig, 2 Öffner, rastend"], ["Schalter", "-SJ3 Steuerung AUS/EIN, -SJ4 Einricht-/Automatikbetrieb"],
              ["Anschluss", "flexible Steuerleitung ca. 3 m, 40-polig + PE"]],
  },
  {
    id: "ua3", bmk: ["-UA3"], category: CATEGORIES[4], blatt: [9, 12],
    title: "Signalsäule",
    summary: "Dreifach-Signalsäule, jede Leuchte über M12-Anschluss (Pin 4) angeschlossen.",
    details: [["-PF31", "rot: NOT-AUS"], ["-PF32", "grün: Magazin leer"], ["-PF33", "weiß: Magnet deaktiviert"]],
  },
  {
    id: "ma10", bmk: ["-MA10"], category: CATEGORIES[2], blatt: [1, 5],
    title: "Achsenmodell mit Getriebemotor",
    summary: "Spindelantrieb der X-Achse mit Endlagen- und Positionssensoren.",
    details: [["Motor", "400 V, 25 W, 50 Hz, 0,12 A, ca. 1300 min⁻¹, Getriebe 1:9"],
              ["Sensoren", "-BG11 Endlage links, -BG12 Position, -BG13 Endlage rechts"], ["Grundposition", "Endlage rechts (-BG13), Position 10"]],
  },
];

/* Zuordnungslisten (Seiten 41 und 42 des Hefts) */
const IO_INPUTS = [
  ["I0", "-KE2", "Meldung NOT-AUS o. k."], ["I1", "-SJ3", "Steuerung AUS/EIN"],
  ["I2", "-SJ4", "Betriebsart Einricht-/Automatikbetrieb"], ["I3", "-SJ5", "Start Automatik"],
  ["I4", "-SJ6", "-MA10 Linksfahrt"], ["I5", "-SJ7", "-MA10 Rechtsfahrt"],
  ["I6", "-SJ8", "Zylinder -MM20 einfahren"], ["I7", "-SJ9", "Zylinder -MM20 ausfahren"],
  ["I8", "-SJ10", "Zylinder -MM30 ein-/ausfahren (Wippe)"], ["I9", "-SJ11", "Zylinder -MM40 ein-/ausfahren (Magnet)"],
  ["I10", "-SJ12", "Magnet deaktivieren"], ["I11", "-BP1", "Betriebsdruck vorhanden"],
  ["I12", "-BG11", "X-Achse, Endlage links (Position 0)"], ["I13", "-BG12", "X-Achse, Positionserfassung"],
  ["I14", "-BG13", "X-Achse, Endlage rechts (Position 10, Grundposition)"],
  ["I15", "-BG21", "Zylinder -MM20 eingefahren"], ["I16", "-BG22", "Zylinder -MM20 ausgefahren"],
  ["I17", "-BG31", "Zylinder -MM30 eingefahren"], ["I18", "-BG32", "Zylinder -MM30 ausgefahren"],
  ["I19", "-BG41", "Zylinder -MM40 eingefahren"], ["I20", "-BG42", "Zylinder -MM40 ausgefahren"],
  ["I21", "-BG52", "LWL Teile- bzw. Bohrungserkennung (Durchgangsbohrung Ø 6 mm)"],
  ["I22", "-BG51", "Materialerkennung, induktiv"], ["I23", "-FC7", "Motorschutz in Ordnung"],
  ["–", "-SG1", "NOT-AUS (nicht an der SPS)"], ["–", "-SJ2", "Reset NOT-AUS (nicht an der SPS)"],
];
const IO_OUTPUTS = [
  ["O0", "-MB21", "Zylinder -MM20 einfahren"], ["O1", "-MB22", "Zylinder -MM20 ausfahren"],
  ["O2", "-MB31", "Zylinder -MM30 einfahren"], ["O3", "-MB32", "Zylinder -MM30 ausfahren"],
  ["O4", "-MB41", "Zylinder -MM40 einfahren"], ["O5", "-MB42", "Zylinder -MM40 ausfahren"],
  ["O6", "-QA5", "X-Achse, Linksfahrt"], ["O7", "-QA6", "X-Achse, Rechtsfahrt"],
  ["O8", "-PF32", "Magazin leer"], ["O9", "-PF33", "Magnet deaktiviert"],
  ["O10", "-QA61", "Schütz für Magnet -MB60 deaktivieren"], ["O11", "-PF2", "Grundstellung"],
  ["O12", "-PF3", "Betriebsart Einricht-/Automatikbetrieb"], ["O13", "-PF4", "Betriebsdruck vorhanden"],
  ["O14", "-PF5", "Motorschutz -FC7 ausgelöst"], ["O15", "-PF6", "Linksfahrt blinkend"],
  ["O16", "-PF7", "Rechtsfahrt blinkend"], ["O17", "-PF8", "Position erreicht"],
  ["O18", "-PF10", "Zylinder -MM20 eingefahren"], ["O19", "-PF11", "Zylinder -MM20 ausgefahren"],
  ["O20", "-PF12", "Zylinder -MM30 eingefahren"], ["O21", "", "frei (Reserve)"],
  ["O22", "-PF14", "Zylinder -MM40 eingefahren"], ["O23", "", "frei (Reserve)"],
  ["–", "-PF31", "NOT-AUS (Signalsäule)"], ["–", "-MB9", "Hauptventil -QM9"],
];

/* ==========================================================
 * Prüfprotokoll nach DIN VDE 0100-600 (Auszug) – Seiten 58/59
 * ========================================================== */
const PROTOCOL = {
  art: ["Neuanlage", "Erweiterung", "Änderung", "Instandsetzung"],
  besichtigung: [
    ["Schaltungsunterlagen komplett", "Vervollständigung aller Unterlagen, Übereinstimmung"],
    ["Betriebsmittel", "Richtige Auswahl, keine Schäden, Betriebsmittelkennzeichnung"],
    ["Leitungsanschlüsse", "Isolierung, Absetzen, Befestigung"],
    ["Leitungswahl und Verlegung", "Leitungstyp, Querschnitt, Farbe, ordnungsgemäße Verlegung"],
    ["PE- und N-Leiter", "Auswahl, Anschluss, Verlegung, Vervollständigung, Kennzeichnung"],
    ["Schutzmaßnahmen gegen direktes Berühren", "Fingersicherheit, Abdeckungen"],
    ["Überstromschutzeinrichtungen", "Auswahl, Einstellungen"],
    ["Zum Zeitpunkt der Prüfung keine erkennbaren Mängel", ""],
  ],
  erprobung: [
    ["Funktion der Anlage", "Funktion gemäß Schaltplan"],
    ["Funktion der RCD", "Prüftaste aktivieren"],
  ],
  abschluss: "Die elektrische Anlage entspricht den anerkannten Regeln der Elektrotechnik und ist mängelfrei.",
  normhinweis: "Das Achsenmodell muss nach geltenden Normen aufgebaut sein. Auf eine Begrenzung der Klemm- und Scherkräfte ist zu achten. Beachten Sie auch die Richtlinie 2006/42/EG (Maschinenrichtlinie).",
};

/* ==========================================================
 * Umrüstung – Auftragsbeschreibung Vorbereitungsauftrag (Seiten 52–54)
 * show = IDs aus COMPONENTS, die im 3D-Modell markiert werden können
 * ========================================================== */
const REWORK_STEPS = [
  { title: "Zylinder -MM40 und Zubehör demontieren",
    text: "Zylinder -MM40 mit Verschlauchung, Sensoren und Magnet demontieren. Taster -SJ11 und -SJ12, Meldeleuchten -PF14 und -PF33 sowie Schütz -QA61 (für Magnet -MB60) herausverdrahten.",
    show: ["qa61"] },
  { title: "Hilfskontakt von -FC7 und Meldeleuchte -PF5 entfernen",
    text: "Verdrahtung des Hilfskontakts von -FC7 zur SPS und die Meldeleuchte -PF5 entfernen.",
    show: ["fc7"] },
  { title: "Zusätzliche Gewinde in die Tischplatte",
    text: "Gewinde nach Zeichnung der mechanischen Änderungen fertigen (Seite 53)." },
  { title: "Führungsleisten für Position 2",
    text: "Führungsleisten nach Zeichnung fertigen und zentrisch über der Frästasche an Position 2 montieren: Abstand 31 mm zueinander, bündig an der Tischkante zum Schlitten. Die Schräge erleichtert das Einführen der Würfel. Befestigung laut Gesamtmontage mit je 2 Zylinderschrauben M4 × 12 (ISO 4762)." },
  { title: "Prüfdorn anfertigen",
    text: "Prüfdorn nach Zeichnung fertigen (Seite 53)." },
  { title: "Eingang I10 einbinden",
    text: "Neuer Eingang: I10 = -SJ12 „Teil entnommen“. Zuordnungsliste und Dokumentation ergänzen." },
  { title: "Programm und GRAFCET anpassen",
    bullets: [
      "Zylinder -MM40 ausprogrammieren, inklusive Sensoren und Ventilspulen.",
      "Metallwürfel ohne Durchgangsbohrung (Ø 6 mm) werden jetzt auf Position 3 abgelegt.",
      "Kunststoffwürfel fallen weiterhin an Position 1 durch die Tischplatte und werden abgekippt.",
      "Nach Ablage eines Metallwürfels mit Durchgangsbohrung auf Position 2 stoppt die Anlage. Nach manueller Entnahme und Betätigung des Freigabetasters -SJ12 läuft der Automatikbetrieb weiter.",
    ],
    go: ["grafcet", "GRAFCET ansehen"] },
  { title: "Anlage in Betrieb nehmen",
    text: "Anlage in Betrieb nehmen, prüfen und das Programm gegebenenfalls sichern. Im Einrichtbetrieb können die Aktoren betätigt werden." },
  { title: "Sicherheit und Teilfunktion prüfen",
    text: "Die umgerüstete Anlage ist auf Sicherheit und Teilfunktion zu überprüfen.",
    go: ["protocol", "Zum Prüfprotokoll"] },
  { title: "Änderungen und Messwerte dokumentieren",
    text: "Alle notwendigen Änderungen und Messwerte dokumentieren." },
];

const REWORK_TARGET = [
  ["Kunststoffwürfel ohne Bohrung", "Position 1", "fällt durch die Tischplatte auf die Wippe, Entsorgung durch Zylinder -MM30"],
  ["Metallwürfel mit Durchgangsbohrung (Ø 6 mm)", "Position 2", "Anlage stoppt, Entnahme von Hand, Weiter mit -SJ12"],
  ["Metallwürfel ohne Durchgangsbohrung", "Position 3", "wird abgelegt"],
];

const REWORK_HINTS = [
  "Änderungsmitteilung vom 26.11.2025: Die Anschlüsse A1 und A2 von -MB21, -MB22, -MB31, -MB32, -MB41 und -MB42 (Blatt 8, Seite 36) sind wie dort dargestellt aufzulegen.",
  "Gleiches gilt für -MB60, -PF31, -PF32 und -PF33 (Blatt 9, Seite 37).",
];

/* ==========================================================
 * GRAFCET – Bereitstellung (Seiten 43–47)
 * Aktionen: { t: Text, c: Bedingung (optional) }
 * out = Übergänge { c: Bedingung, to: Folgeschritt }
 * ¬ = Negation (Überstrich im Original)
 * ========================================================== */
const GRAFCETS = [
  { id: "haupt", title: "Hauptgrafcet",
    steps: [
      { n: "1", init: true, act: [{ t: "G_Einricht { }" }, { t: "G_Auto { }" }],
        out: [{ c: "-KE2 * -SJ3 * -BP1 * ¬-SJ4 * -FC7", to: "2" }] },
      { n: "2", act: [{ t: "G_Einricht { INIT }" }], out: [{ c: "G_Einricht.X300", to: "3" }] },
      { n: "3", act: [{ t: "-PF3" }],
        out: [{ c: "-SJ4", to: "4" }, { c: "¬-KE2 + ¬-BP1 + ¬-SJ3 + ¬-FC7", to: "1" }] },
      { n: "4", act: [{ t: "G_Auto { INIT }" }, { t: "G_Einricht { }" }], out: [{ c: "G_Auto.X500", to: "5" }] },
      { n: "5", act: [{ t: "-PF3", c: "Takt" }], out: [{ c: "¬-KE2 + ¬-BP1 + ¬-SJ3 + ¬-SJ4 + ¬-FC7", to: "1" }] },
    ] },
  { id: "auto", title: "G_Auto",
    steps: [
      { n: "500", init: true, act: [], out: [{ c: "-SJ5 * -BG13 * -BG21 * -BG31 * -BG41 * (-BG51 + ¬-BG52)", to: "501" }] },
      { n: "501", act: [{ t: "C1 := 0" }],
        out: [{ c: "-BG51 * -BG52", to: "502" }, { c: "¬-BG51 * ¬-BG52", to: "502a" }, { c: "-BG51 * ¬-BG52", to: "502b" }] },
      { n: "502", act: [{ t: "C2 := Pos. 2" }], out: [{ c: "X502 + X502a + X502b", to: "503" }] },
      { n: "502a", act: [{ t: "C2 := Pos. 1" }, { t: "Teil_Kunststoff := 1" }], out: [{ c: "X502 + X502a + X502b", to: "503" }] },
      { n: "502b", act: [{ t: "C2 := Pos. 1" }, { t: "Teil_Metall := 1" }], out: [{ c: "X502 + X502a + X502b", to: "503" }] },
      { n: "503", act: [{ t: "C1 := C1 + 1", c: "↑ -BG12" }, { t: "-QA5 Linksfahrt" }], out: [{ c: "[C1 = C2]", to: "504" }] },
      { n: "504", act: [{ t: "-MB22", c: "1 s / X504" }], out: [{ c: "1 s / -BG22", to: "505" }] },
      { n: "505", act: [{ t: "-MB21" }], out: [{ c: "5 s / -BG21", to: "506" }] },
      { n: "506", act: [],
        out: [{ c: "[C2 = Pos. 2]", to: "509" }, { c: "[Teil_Kunststoff = 1]", to: "507" }, { c: "[Teil_Metall = 1]", to: "507a" }] },
      { n: "507", act: [{ t: "-MB32" }], out: [{ c: "2 s / -BG32", to: "508" }] },
      { n: "507a", act: [{ t: "-MB42" }], out: [{ c: "2 s / -BG42", to: "507b" }] },
      { n: "507b", act: [{ t: "-MB41" }], out: [{ c: "2 s / -BG41", to: "507c" }] },
      { n: "507c", act: [{ t: "-QA61" }, { t: "-MB32" }], out: [{ c: "2 s / -BG32", to: "508" }] },
      { n: "508", act: [{ t: "-MB31" }], out: [{ c: "1 s / -BG31", to: "509" }] },
      { n: "509", act: [{ t: "-QA6 Rechtsfahrt" }], out: [{ c: "-BG13", to: "510" }] },
      { n: "510", act: [],
        out: [{ c: "-BG21 * ¬-BG51 * -BG52 (Magazin leer)", to: "500" }, { c: "-BG21 * (-BG51 + ¬-BG52)", to: "501" }] },
    ],
    // Wege durch den Ablauf je nach Würfel (für die Simulation)
    paths: {
      kunststoff: ["500", "501", "502a", "503", "504", "505", "506", "507", "508", "509", "510"],
      metall: ["500", "501", "502b", "503", "504", "505", "506", "507a", "507b", "507c", "508", "509", "510"],
      bohrung: ["500", "501", "502", "503", "504", "505", "506", "509", "510"],
    },
    pathNames: { kunststoff: "Kunststoffwürfel", metall: "Metall ohne Bohrung", bohrung: "Metall mit Bohrung" },
  },
  { id: "einricht", title: "G_Einricht",
    steps: [
      { n: "300", init: true, act: [], out: [{ c: "¬-SJ4", to: "301" }] },
      { n: "301", act: [
          { t: "-QA5", c: "-SJ6 * ¬-SJ7 * ¬-BG11 * ¬-QA6" }, { t: "-QA6", c: "-SJ7 * ¬-SJ6 * ¬-BG13 * ¬-QA5" },
          { t: "-MB21", c: "-SJ8 * ¬-SJ9 * ¬-BG21" }, { t: "-MB22", c: "-SJ9 * ¬-SJ8 * ¬-BG22" },
          { t: "-MB31", c: "¬-SJ10 * ¬-BG31" }, { t: "-MB32", c: "-SJ10 * ¬-BG32" },
          { t: "-MB41", c: "¬-SJ11 * ¬-BG41" }, { t: "-MB42", c: "-SJ11 * ¬-BG42" },
          { t: "-QA61", c: "5 s / -SJ12" },
        ], out: [{ c: "-SJ4", to: "300" }] },
    ] },
  { id: "anzeige", title: "G_Anzeige",
    steps: [
      { n: "200", init: true, act: [], out: [{ c: "-SJ3", to: "201" }] },
      { n: "201", act: [
          { t: "-PF2 Grundstellung", c: "-BG13 * -BG21 * -BG31 * -BG41 * ¬-QA61" },
          { t: "-PF4 Druck vorhanden", c: "-BP1" }, { t: "-PF5 Motorschutz ausgelöst", c: "¬-FC7" },
          { t: "-PF6 Linksfahrt", c: "-QA5 * Takt" }, { t: "-PF7 Rechtsfahrt", c: "-QA6 * Takt" },
          { t: "-PF8 Position erreicht", c: "[C1 = Pos. 1] + [C1 = Pos. 2] + [C1 = Pos. 3] + [C1 = Pos. 4]" },
          { t: "-PF10 -MM20 eingefahren", c: "-BG21" }, { t: "-PF11 -MM20 ausgefahren", c: "-BG22" },
          { t: "-PF12 -MM30 eingefahren", c: "-BG31" }, { t: "-PF14 -MM40 eingefahren", c: "-BG41" },
          { t: "-PF32 Magazin leer", c: "¬-BG51 * -BG52" }, { t: "-PF33 Magnet deaktiviert", c: "-QA61" },
        ], out: [{ c: "¬-SJ3", to: "200" }] },
    ] },
  { id: "takt", title: "G_Takt",
    steps: [
      { n: "100", init: true, act: [], out: [{ c: "0,5 s / G_Takt.X100", to: "101" }] },
      { n: "101", act: [{ t: "Takt" }], out: [{ c: "0,5 s / G_Takt.X101", to: "100" }] },
    ] },
];
