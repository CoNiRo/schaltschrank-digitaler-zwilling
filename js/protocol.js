/* ==========================================================
 * protocol.js – Prüfprotokoll
 * Zwei getrennte Protokolle (Vorbereitung / Inbetriebnahme),
 * automatisch im Browser gespeichert, druckbar als PDF.
 * ========================================================== */
(() => {
  "use strict";
  const root = document.getElementById("pane-protocol");
  const KEYS = { prep: "schaltschrank.protokoll.vorbereitung", start: "schaltschrank.protokoll.inbetriebnahme" };
  const TITLES = { prep: PROTOCOL.modes.prep.long, start: PROTOCOL.modes.start.long };
  const ISO_ROWS = 4;

  // Richtwerte (DIN VDE 0100-600) – nur als Hinweis, die Bewertung trifft die prüfende Person
  const LIMIT_ISO = 1.0;     // MΩ bei 500 V DC (SELV/PELV: 250 V, 0,5 MΩ)
  const LIMIT_UB = 50;       // V Berührungsspannung
  const LIMIT_T = 300;       // ms Auslösezeit bei IΔn

  let mode = "prep";
  let data;
  const empty = () => ({
    f: {}, art: "", checks: {}, ort: "", datum: "",
    iso: Array.from({ length: ISO_ROWS }, () => ({ a: "", b: "", v: "" })),
    ub: "", t: "",
  });
  const load = () => { data = Object.assign(empty(), store.get(KEYS[mode], null) || {}); };
  const save = () => { store.set(KEYS[mode], data); refreshSummary(); };

  // alle bewertbaren Punkte (ID -> Titel)
  const CHECKS = [
    ...PROTOCOL.besichtigung.map((r, i) => ({ id: "b" + i })),
    { id: "pe" }, { id: "iso" }, { id: "rcdU" }, { id: "rcdT" }, { id: "dreh" },
    ...PROTOCOL.erprobung.map((r, i) => ({ id: "e" + i })),
  ];

  /* ---------- Bausteine ---------- */
  function field(label, key, opts = {}) {
    const inp = h("input", {
      type: opts.type || "text", class: "pf-input", value: data.f[key] || "",
      placeholder: opts.placeholder || "", autocomplete: "off",
      onInput: (e) => { data.f[key] = e.target.value; save(); },
    });
    return h("label", { class: "pf" + (opts.wide ? " wide" : "") }, h("span", null, label), inp);
  }

  function triState(id) {
    const wrap = h("div", { class: "tri", role: "group", "aria-label": "Ergebnis" });
    [["ok", "OK"], ["nok", "nicht OK"]].forEach(([val, label]) => {
      const b = h("button", {
        type: "button", class: `pill ${val}`, "aria-pressed": String(data.checks[id] === val),
        onClick: () => {
          data.checks[id] = data.checks[id] === val ? "" : val;   // erneuter Klick = zurücknehmen
          wrap.querySelectorAll(".pill").forEach((p) => p.setAttribute("aria-pressed", String(p.classList.contains(data.checks[id]))));
          save();
        },
      }, label);
      wrap.append(b);
    });
    return wrap;
  }

  const row = (id, title, sub, extra) =>
    h("div", { class: "chk" },
      h("div", { class: "chk-text" }, h("strong", null, title), sub ? h("small", null, sub) : null, extra || null),
      triState(id));

  const num = (v) => parseFloat(String(v).replace(",", "."));

  function measureInput(key, unit, limit, op) {
    const hint = h("span", { class: "mval-hint" });
    const upd = () => {
      const n = num(data[key]);
      if (!data[key] || isNaN(n)) { hint.textContent = `Richtwert ${op} ${limit} ${unit}`; hint.className = "mval-hint"; return; }
      const ok = op === "≤" ? n <= limit : n >= limit;
      hint.textContent = ok ? `innerhalb des Richtwerts (${op} ${limit} ${unit})` : `Richtwert ${op} ${limit} ${unit} nicht eingehalten – prüfen`;
      hint.className = "mval-hint " + (ok ? "good" : "bad");
    };
    const inp = h("input", { type: "text", inputMode: "decimal", class: "pf-input short", value: data[key] || "", "aria-label": `Messwert in ${unit}`,
      onInput: (e) => { data[key] = e.target.value; upd(); save(); } });
    upd();
    return h("div", { class: "mval" }, inp, h("span", { class: "unit" }, unit), hint);
  }

  function isoTable() {
    const body = h("tbody");
    data.iso.forEach((r, i) => {
      const hint = h("td", { class: "iso-hint" });
      const upd = () => {
        const n = num(r.v);
        if (!r.v || isNaN(n)) { hint.textContent = ""; hint.className = "iso-hint"; return; }
        const ok = n >= LIMIT_ISO;
        hint.textContent = ok ? "✓" : `unter ${LIMIT_ISO} MΩ – prüfen`;
        hint.className = "iso-hint " + (ok ? "good" : "bad");
      };
      const cell = (k, ph, cls) => h("td", null, h("input", {
        type: "text", class: "pf-input " + (cls || ""), value: r[k] || "", placeholder: ph, "aria-label": ph,
        inputMode: k === "v" ? "decimal" : "text",
        onInput: (e) => { r[k] = e.target.value; if (k === "v") upd(); save(); },
      }));
      upd();
      body.append(h("tr", null, cell("a", "Klemme 1"), cell("b", "Klemme 2 / PE"), cell("v", "MΩ", "short"), hint));
    });
    return h("table", { class: "iso" },
      h("thead", null, h("tr", null, h("th", null, "Messpunkt A"), h("th", null, "Messpunkt B"), h("th", null, "Messwert (MΩ)"), h("th", null, ""))),
      body);
  }

  /* ---------- Zusammenfassung ---------- */
  const summary = h("div", { class: "proto-summary", role: "status" });
  function refreshSummary() {
    const total = CHECKS.length;
    const ok = CHECKS.filter((c) => data.checks[c.id] === "ok").length;
    const nok = CHECKS.filter((c) => data.checks[c.id] === "nok").length;
    const open = total - ok - nok;
    let msg, cls;
    if (nok) { msg = `${nok} Punkt${nok > 1 ? "e" : ""} nicht OK – Mängel beseitigen und neu prüfen.`; cls = "bad"; }
    else if (open) { msg = `${open} von ${total} Punkten noch offen.`; cls = ""; }
    else { msg = "Alle Punkte sind mit OK bewertet. Die Anlage kann als mängelfrei bestätigt werden."; cls = "good"; }
    summary.className = "proto-summary " + cls;
    summary.replaceChildren(
      h("div", { class: "bar" }, h("span", { style: `width:${Math.round(((ok + nok) / total) * 100)}%` })),
      h("p", null, h("strong", null, `${ok} OK · ${nok} nicht OK · ${open} offen`), " – ", msg));
  }

  /* ---------- Aufbau der Seite ---------- */
  function render() {
    const modeSwitch = h("div", { class: "seg noprint", role: "group", "aria-label": "Protokollart" },
      ...Object.entries(TITLES).map(([k, label]) =>
        h("button", { type: "button", class: "seg-btn" + (k === mode ? " is-active" : ""),
          onClick: () => { mode = k; load(); render(); } }, PROTOCOL.modes[k].short)));

    const head = h("div", { class: "page-head" },
      h("h2", null, PROTOCOL.title),
      h("div", { class: "page-tools noprint" }, modeSwitch,
        h("button", { class: "btn", type: "button", onClick: () => window.print() }, "⎙ Drucken / als PDF speichern"),
        h("button", { class: "btn", type: "button", onClick: () => {
          if (confirm(`Protokoll „${TITLES[mode]}“ wirklich leeren?`)) { store.remove(KEYS[mode]); load(); render(); }
        } }, "Zurücksetzen")),
      h("p", { class: "note noprint" }, PROTOCOL.note),
      h("p", { class: "print-title" }, `Protokoll: ${TITLES[mode]}`));

    const header = h("fieldset", { class: "pf-grid" }, h("legend", null, "Kopfdaten"),
      field("Vor- und Familienname", "name"), field("Prüflingsnummer", "nr"),
      field("Datum", "pdatum", { type: "date" }), field("Kunden-Nr.", "kunde"),
      field("Prüfprotokoll-Nr.", "pnr"), field("Blattnummer", "blatt"),
      field("Auftraggeber", "ag", { wide: true }), field("Auftragnehmer", "an", { wide: true }),
      field("Anlage", "anlage", { wide: true, placeholder: "z. B. Schaltschrank Typ …" }),
      field("Prüfer", "pruefer"), field("Prüfung nach", "norm", { placeholder: "DIN VDE 0100-600" }));

    const art = h("fieldset", { class: "art" }, h("legend", null, "Art der Prüfung"),
      ...PROTOCOL.art.map((a) => h("label", { class: "radio" },
        h("input", { type: "radio", name: "art", checked: data.art === a, onChange: () => { data.art = a; save(); } }), h("span", null, a))));

    const besichtigung = h("fieldset", null, h("legend", null, "Besichtigung"),
      ...PROTOCOL.besichtigung.map(([t, s], i) => row("b" + i, t, s)));

    const messen = h("fieldset", null, h("legend", null, "Messen / Prüfen"),
      row("pe", "Durchgängigkeit des Schutzleiters"),
      row("iso", "Isolationsmessung", "Alle aktiven Leiter gegen PE (L1, L2, L3, N)",
        h("div", { class: "iso-wrap" }, isoTable(),
          h("small", { class: "limit" }, "Richtwert DIN VDE 0100-600: Prüfspannung 500 V DC, mindestens 1,0 MΩ (SELV/PELV: 250 V, mindestens 0,5 MΩ)."))),
      row("rcdU", "RCD", "Berührungsspannung", measureInput("ub", "V", LIMIT_UB, "≤")),
      row("rcdT", "Auslösezeit im Stromkreis mit RCD", "", measureInput("t", "ms", LIMIT_T, "≤")),
      row("dreh", "Drehfeldprüfung", "(Rechtsdrehfeld)"));

    const erprobung = h("fieldset", null, h("legend", null, "Erprobung"),
      ...PROTOCOL.erprobung.map(([t, s], i) => row("e" + i, t, s)));

    const final = h("div", { class: "final" },
      h("p", null, PROTOCOL.abschluss),
      h("p", { class: "norm" }, PROTOCOL.normhinweis));

    const sign = h("div", { class: "sign" },
      h("label", { class: "pf" }, h("span", null, "Ort"), h("input", { class: "pf-input", value: data.ort, onInput: (e) => { data.ort = e.target.value; save(); } })),
      h("label", { class: "pf" }, h("span", null, "Datum"), h("input", { type: "date", class: "pf-input", value: data.datum, onInput: (e) => { data.datum = e.target.value; save(); } })),
      h("div", { class: "sig-line" }, h("span", null, "Unterschrift")),
      h("div", { class: "sig-line" }, h("span", null, "Unterschrift Ausbildender")));

    root.replaceChildren(head, summary, h("form", { class: "proto", onSubmit: (e) => e.preventDefault() },
      header, art, besichtigung, messen, erprobung, final, sign));
    refreshSummary();
  }

  load();
  render();
})();
