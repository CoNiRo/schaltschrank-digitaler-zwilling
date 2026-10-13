/* ==========================================================
 * config.js – Erscheinungsbild und Dateipfade (neutrale Standardwerte)
 * Eigene Werte (Firmenname, Logo, Modell) kommen in js/config.local.js,
 * eine Kopie dieser Datei, die nicht ins Repository gehört.
 * ========================================================== */
const BRAND = {
  pageTitle: "Digitaler Schaltschrank",
  name: "Digitaler Schaltschrank",       // Titel in der Kopfzeile
  subtitle: "Ausbildungsprojekt Mechatronik",
  badge: "Demo",                          // kleines Schild rechts oben ("" = ausblenden)
  logo: "assets/logo-placeholder.svg",    // "" = kein Logo
  logoAlt: "Platzhalter-Logo",

  // Kopf auf Ausdrucken / PDF
  docOrgTitle: "Ausbildungsprojekt",
  docOrgLine: "Mechatronik",
  docMeta: "Mechatroniker/-in · Digitaler Schaltschrank",
  csvHeader: "Ausbildungsprojekt – Digitaler Schaltschrank",

  model: "assets/demo-schaltschrank.glb", // 3D-Modell (GLB)
  highlight: [0.88, 0.48, 0.18, 1],       // Hervorhebung im Modell (RGBA, 0–1)
};
