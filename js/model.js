/* ==========================================================
 * model.js – Modell-Check (Modul CAx-gestützte Fertigung)
 * Prüft das GLB: Größe, Struktur, BMK-Benennung und ob die
 * Verknüpfung mit dem Bauteilverzeichnis funktioniert.
 * Messwerte lassen sich speichern (Vorher/Nachher-Vergleich).
 * ========================================================== */
(() => {
  "use strict";
  const root = document.getElementById("pane-model");
  const KEY = "schaltschrank.modellmessungen";
  let result = null, running = false, error = "";

  const fmtBytes = (b) => (b >= 1048576 ? (b / 1048576).toFixed(2).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
  const fmtNum = (n) => n.toLocaleString("de-DE");
  const fmtSec = (ms) => (ms == null ? "wird gemessen …" : (ms / 1000).toFixed(2).replace(".", ",") + " s");
  const fileName = () => Twin.modelUrl().split("/").pop();
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  // Alle BMK, die im Verzeichnis stehen (jedes einzeln) mit zugehörigem Bauteil
  const catalog = () => {
    const rows = [];
    Twin.components.forEach((c) => c.bmk.forEach((b) => rows.push({ bmk: b, comp: c })));
    return rows;
  };
  const statusOf = (bmk) => {
    const node = result.bmkNodes[bmk], mat = result.materialNames[bmk];
    if (node && mat) return { key: "ok", text: "verknüpft" };
    if (node && !mat) return { key: "warn", text: "Material fehlt – Hervorhebung funktioniert nicht" };
    if (!node && mat) return { key: "info", text: "nur Material vorhanden, Knoten nicht nach BMK benannt" };
    return { key: "muted", text: "nicht im Modell" };
  };

  /* ---------- Hinweise zur Optimierung ---------- */
  function hints() {
    const r = result, out = [];
    if (r.bytes > 5 * 1048576) out.push(`Die Datei ist mit ${fmtBytes(r.bytes)} recht groß. Kompression (Meshopt oder Draco) und Vereinfachen der Geometrie können die Ladezeit deutlich senken, zum Beispiel mit dem Werkzeug gltf-transform.`);
    if (r.materials > 150 || r.materials > Twin.components.length * 10) out.push(`Das Modell enthält ${fmtNum(r.materials)} Materialien. Teile mit gleichem Aussehen innerhalb einer Baugruppe lassen sich zusammenfassen, solange jede Baugruppe ein eigenes Material mit dem BMK als Namen behält.`);
    if (r.triangles > 500000) out.push(`Mit ${fmtNum(r.triangles)} Dreiecken ist das Modell für Smartphones schwer. Eine vereinfachte Version für die mobile Ansicht kann sinnvoll sein.`);
    if (!r.compressed && r.bytes > 2 * 1048576) out.push("Es ist keine Kompressions-Erweiterung eingetragen (Draco, Meshopt oder Quantisierung).");
    if (r.unnamed.length) out.push(`${r.unnamed.length} Teile oder Gruppen im Modell haben keinen BMK-Namen und reagieren nicht auf Klicks. Im CAD-Programm als Occurrence nach BMK benennen.`);
    const broken = catalog().filter((x) => statusOf(x.bmk).key === "warn");
    if (broken.length) out.push(`Bei ${broken.map((x) => x.bmk).join(", ")} gibt es zwar eine Baugruppe, aber kein Material mit dem BMK als Namen. Dort wird das Bauteil nicht hervorgehoben.`);
    if (!out.length) out.push("Keine Auffälligkeiten gefunden.");
    return out;
  }

  /* ---------- Messreihe ---------- */
  const history = () => store.get(KEY, []);
  function saveMeasurement() {
    const list = history();
    list.push({ t: new Date().toISOString(), file: fileName(), bytes: result.bytes, parts: result.instances,
      mats: result.materials, tris: result.triangles, loadMs: Twin.stats.loadMs });
    store.set(KEY, list);
    render();
  }

  /* ---------- Stückliste ---------- */
  function exportBom() {
    const names = new Set([...Object.keys(result.bmkNodes), ...catalog().map((x) => x.bmk)]);
    const lines = [esc(BRAND.csvHeader), esc(`Stückliste aus dem 3D-Modell – Stand ${new Date().toLocaleDateString("de-DE")}`), "",
      ["BMK", "Bezeichnung", "Kategorie", "Einzelteile im Modell", "Dreiecke", "Material vorhanden", "Im Bauteilverzeichnis"].map(esc).join(";")];
    [...names].sort((a, b) => a.localeCompare(b, "de", { numeric: true })).forEach((b) => {
      const comp = Twin.componentByBmk(b), n = result.bmkNodes[b];
      lines.push([b, comp ? comp.title : "", comp ? comp.category : "", n ? n.parts : 0, n ? n.tris : 0,
        result.materialNames[b] ? "ja" : "nein", comp ? "ja" : "nein"].map(esc).join(";"));
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "stueckliste.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  /* ---------- Darstellung ---------- */
  const kpi = (label, value, sub) => h("div", { class: "kpi" }, h("span", { class: "kpi-v" }, value), h("span", { class: "kpi-l" }, label), sub ? h("small", null, sub) : null);
  const badge = (s) => h("span", { class: `st st-${s.key}` }, s.text);

  function render() {
    const tools = h("div", { class: "page-tools noprint" },
      h("button", { class: "btn primary", type: "button", onClick: run }, "↻ Neu prüfen"),
      result ? h("button", { class: "btn", type: "button", onClick: saveMeasurement }, "＋ Messung speichern") : null,
      result ? h("button", { class: "btn", type: "button", onClick: exportBom }, "⇩ Stückliste (CSV)") : null,
      result ? h("button", { class: "btn", type: "button", onClick: () => window.print() }, "⎙ Bericht drucken / PDF") : null);

    const head = h("div", { class: "page-head" }, h("h2", null, "Modell-Check (CAx)"),
      h("p", { class: "note" }, `Prüft das 3D-Modell „${fileName()}“ auf Größe, Aufbau und Benennung nach Betriebsmittelkennzeichen. Die Ladezeit hängt vom Zwischenspeicher des Browsers ab: für Vergleichswerte mit Strg+Umschalt+R neu laden.`),
      tools);

    if (running) return root.replaceChildren(head, h("p", { class: "note" }, "Modell wird geprüft …"));
    if (error) return root.replaceChildren(head, h("p", { class: "note bad" }, error));
    if (!result) return root.replaceChildren(head);

    const r = result;
    const kpis = h("div", { class: "kpi-grid" },
      kpi("Dateigröße", fmtBytes(r.bytes), r.compressed ? "komprimiert" : "unkomprimiert"),
      kpi("Baugruppen mit BMK", fmtNum(Object.keys(r.bmkNodes).length), `${fmtNum(r.instances)} Einzelteile`),
      kpi("Materialien", fmtNum(r.materials), `${fmtNum(r.uniqueMaterialNames)} verschiedene Namen`),
      kpi("Dreiecke", fmtNum(r.triangles), `${fmtNum(r.nodes)} Knoten`),
      kpi("Ladezeit", fmtSec(Twin.stats.loadMs), "in dieser Sitzung gemessen"));

    const rows = catalog().map((x) => {
      const n = r.bmkNodes[x.bmk], st = statusOf(x.bmk);
      return h("tr", null, h("td", null, x.comp.title), h("td", { class: "op" }, x.bmk),
        h("td", null, n ? `${n.parts} Teile` : "–"), h("td", null, r.materialNames[x.bmk] ? "ja" : "nein"), h("td", null, badge(st)));
    });
    const link = h("div", { class: "table-wrap" }, h("table", { class: "data-table" },
      h("thead", null, h("tr", null, ["Bauteil", "BMK", "Baugruppe", "Material", "Ergebnis"].map((t) => h("th", null, t)))), h("tbody", null, rows)));

    const known = new Set(catalog().map((x) => x.bmk));
    const extra = Object.keys(r.bmkNodes).filter((b) => !known.has(b));
    const extraBox = extra.length
      ? h("p", { class: "note" }, "Im Modell vorhanden, aber nicht im Bauteilverzeichnis: ", extra.map((b) => h("span", { class: "bmk" }, b)))
      : h("p", { class: "note good" }, "✓ Alle Baugruppen mit BMK im Modell stehen im Bauteilverzeichnis.");

    const unnamed = r.unnamed.length
      ? h("div", null, h("p", { class: "note" }, `${r.unnamed.length} Gruppen ohne BMK-Namen (insgesamt ${fmtNum(r.unnamed.reduce((s, u) => s + u.parts, 0))} Einzelteile):`),
          h("ul", { class: "rw-hints" }, r.unnamed.slice(0, 12).map((u) => h("li", null, `${u.name} – ${u.parts} Teile`)),
            r.unnamed.length > 12 ? h("li", null, `… und ${r.unnamed.length - 12} weitere`) : null))
      : h("p", { class: "note good" }, "✓ Jedes Teil gehört zu einer Baugruppe mit BMK.");

    const hist = history();
    const histBox = hist.length
      ? h("div", { class: "table-wrap" }, h("table", { class: "data-table" },
          h("thead", null, h("tr", null, ["Datum", "Datei", "Größe", "Einzelteile", "Materialien", "Dreiecke", "Ladezeit"].map((t) => h("th", null, t)))),
          h("tbody", null, hist.map((m) => h("tr", null, h("td", null, new Date(m.t).toLocaleString("de-DE")), h("td", null, m.file),
            h("td", null, fmtBytes(m.bytes)), h("td", null, fmtNum(m.parts)), h("td", null, fmtNum(m.mats)), h("td", null, fmtNum(m.tris)), h("td", null, fmtSec(m.loadMs)))))),
        h("div", { class: "page-tools noprint" }, h("button", { class: "btn", type: "button", onClick: () => { if (confirm("Messreihe löschen?")) { store.remove(KEY); render(); } } }, "Messreihe löschen")))
      : h("p", { class: "note" }, "Noch keine Messung gespeichert. Mit „Messung speichern“ halten Sie Werte vor und nach der Optimierung fest.");

    root.replaceChildren(head, kpis,
      h("h3", { class: "sub" }, "Verknüpfung mit dem Bauteilverzeichnis"), link, extraBox,
      h("h3", { class: "sub" }, "Teile ohne Kennzeichnung"), unnamed,
      h("h3", { class: "sub" }, "Hinweise"), h("ul", { class: "rw-hints" }, hints().map((t) => h("li", null, t))),
      h("h3", { class: "sub" }, "Messreihe (Vorher/Nachher)"), histBox);
  }

  async function run() {
    running = true; error = ""; render();
    try { result = await GLBInspect.inspect(Twin.modelUrl()); }
    catch (e) { error = `Modell konnte nicht geprüft werden: ${e.message}`; result = null; }
    running = false; render();
  }

  window.addEventListener("viewchange", (e) => { if (e.detail === "model" && !result && !running) run(); });
  window.addEventListener("modelloaded", () => { if (result && !running) render(); });
  render();
})();
