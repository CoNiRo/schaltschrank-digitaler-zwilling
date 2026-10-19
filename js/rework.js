/* ==========================================================
 * rework.js – Umrüstung (Auftragsbeschreibung / Vorbereitungsauftrag)
 * Abhakbare Checkliste mit Fortschritt und Sprung zu betroffenen
 * Bauteilen im 3D-Modell. Mit „Bearbeiten“ lassen sich Texte,
 * Schritte, Sollverhalten und Hinweise für eine neue Prüfung
 * anpassen (Teil des Prüfungsprofils, im Browser gespeichert).
 * ========================================================== */
(() => {
  "use strict";
  const root = document.getElementById("pane-rework");
  const KEY = "schaltschrank.umruestung.erledigt";
  let done = store.get(KEY, {});            // Schritt-ID -> true
  let edit = false;
  const rw = () => Profile.state.rework;
  const save = () => Profile.save();
  const lines = (t) => t.split("\n").map((x) => x.trim()).filter(Boolean);

  const progress = h("div", { class: "proto-summary", role: "status" });
  function refresh() {
    const steps = rw().steps;
    const n = steps.filter((s) => done[s.id]).length, total = steps.length;
    progress.className = "proto-summary" + (total && n === total ? " good" : "");
    progress.replaceChildren(
      h("div", { class: "bar" }, h("span", { style: `width:${total ? Math.round((n / total) * 100) : 0}%` })),
      h("p", null, h("strong", null, `${n} von ${total} Schritten erledigt`)));
  }

  /* ---------- Ansicht ---------- */
  function viewStep(s, i) {
    const box = h("input", { type: "checkbox", checked: !!done[s.id], "aria-label": `Schritt ${i + 1} erledigt`,
      onChange: (e) => { done[s.id] = e.target.checked; item.classList.toggle("is-done", e.target.checked); store.set(KEY, done); refresh(); } });
    const comps = (s.show || []).map((id) => COMPONENTS.find((c) => c.id === id)).filter(Boolean);
    const actions = h("div", { class: "rw-actions noprint" });
    if (comps.length) actions.append(h("button", { type: "button", class: "btn", onClick: () => Twin.reveal(comps) }, "Im 3D-Modell zeigen"));
    if (s.go) actions.append(h("button", { type: "button", class: "btn", onClick: () => Twin.go(s.go[0]) }, s.go[1]));
    const item = h("li", { class: "rw-step" + (done[s.id] ? " is-done" : "") },
      h("label", { class: "rw-check" }, box, h("span", { class: "rw-num" }, String(i + 1))),
      h("div", { class: "rw-body" },
        h("h3", null, s.title),
        s.text ? h("p", null, bmkText(s.text)) : null,
        s.bullets && s.bullets.length ? h("ul", null, s.bullets.map((b) => h("li", null, bmkText(b)))) : null,
        actions.childNodes.length ? actions : null));
    return item;
  }

  const pdfHint = () => (REWORK_META.pdf && PDF_URL
    ? h("li", null, h("a", { href: `${PDF_URL}#page=${REWORK_META.pdf.page}`, target: "_blank", rel: "noopener" }, REWORK_META.pdf.label))
    : null);

  function viewPage() {
    const d = rw();
    const hint = pdfHint();
    return [
      h("div", { class: "page-head" }, h("h2", null, d.title), h("p", { class: "note" }, d.intro)),
      progress,
      ...(d.target.length ? [h("h3", { class: "sub" }, d.targetTitle),
        h("table", { class: "rw-table" },
          h("thead", null, h("tr", null, h("th", null, "Teil"), h("th", null, "Ablage"), h("th", null, "Verhalten"))),
          h("tbody", null, d.target.map((r) => h("tr", null, r.map((c) => h("td", null, bmkText(c)))))))] : []),
      h("h3", { class: "sub" }, d.stepsTitle),
      h("ol", { class: "rw-list" }, d.steps.map(viewStep)),
      ...(d.hints.length || hint ? [h("h3", { class: "sub" }, d.hintsTitle),
        h("ul", { class: "rw-hints" }, d.hints.map((t) => h("li", null, t)), hint)] : []),
    ];
  }

  /* ---------- Bearbeiten ---------- */
  const bmkOfIds = (ids) => (ids || []).map((id) => COMPONENTS.find((c) => c.id === id)).filter(Boolean).map((c) => c.bmk[0]).join(", ");
  const idsOfBmk = (text) => [...new Set(text.split(/[\s,;]+/).filter(Boolean)
    .map((b) => window.Twin.componentByBmk(b)).filter(Boolean).map((c) => c.id))];

  function input(value, onInput, { area = false, label, rows } = {}) {
    const el = document.createElement(area ? "textarea" : "input");
    el.className = "field-input";
    if (area) el.rows = rows || 3; else el.type = "text";
    el.value = value;
    el.setAttribute("aria-label", label);
    el.addEventListener("input", () => { onInput(el.value); save(); });
    return el;
  }
  const field = (label, el) => h("label", { class: "f" }, label, el);

  function editStep(s, i) {
    const d = rw(), move = (to) => { const a = d.steps; if (to < 0 || to >= a.length) return; a.splice(to, 0, a.splice(i, 1)[0]); save(); render(); };
    return h("li", { class: "rw-step" },
      h("div", { class: "rw-check" }, h("span", { class: "rw-num" }, String(i + 1))),
      h("div", { class: "rw-body" },
        field("Titel", input(s.title, (v) => { s.title = v; }, { label: `Titel Schritt ${i + 1}` })),
        field("Beschreibung", input(s.text, (v) => { s.text = v; }, { area: true, label: `Beschreibung Schritt ${i + 1}` })),
        field("Einzelpunkte (eine Zeile pro Punkt)", input((s.bullets || []).join("\n"), (v) => { s.bullets = lines(v); }, { area: true, label: `Einzelpunkte Schritt ${i + 1}` })),
        field("Bauteile im 3D-Modell zeigen (BMK, mit Komma getrennt)", input(bmkOfIds(s.show), (v) => { s.show = idsOfBmk(v); }, { label: `Bauteile Schritt ${i + 1}` })),
        h("div", { class: "rw-tools" },
          h("button", { type: "button", class: "btn", onClick: () => move(i - 1), disabled: i === 0 }, "↑ nach oben"),
          h("button", { type: "button", class: "btn", onClick: () => move(i + 1), disabled: i === d.steps.length - 1 }, "↓ nach unten"),
          h("button", { type: "button", class: "btn", onClick: () => { d.steps.splice(i, 1); delete done[s.id]; store.set(KEY, done); save(); render(); } }, "✕ Schritt löschen"))));
  }

  function editPage() {
    const d = rw();
    const targetRows = d.target.map((r, i) => h("tr", null,
      r.map((c, j) => h("td", null, input(c, (v) => { r[j] = v; }, { label: `Sollverhalten Zeile ${i + 1} Spalte ${j + 1}` }))),
      h("td", null, h("button", { type: "button", class: "icon-btn", "aria-label": `Zeile ${i + 1} löschen`, onClick: () => { d.target.splice(i, 1); save(); render(); } }, "✕"))));
    return [
      h("div", { class: "page-head" },
        field("Überschrift", input(d.title, (v) => { d.title = v; }, { label: "Überschrift" })),
        field("Einleitung / Aufgabe", input(d.intro, (v) => { d.intro = v; }, { area: true, rows: 4, label: "Einleitung" }))),
      field("Überschrift Sollverhalten", input(d.targetTitle, (v) => { d.targetTitle = v; }, { label: "Überschrift Sollverhalten" })),
      h("table", { class: "rw-table" },
        h("thead", null, h("tr", null, h("th", null, "Teil"), h("th", null, "Ablage"), h("th", null, "Verhalten"), h("th", null, ""))),
        h("tbody", null, targetRows)),
      h("div", { class: "page-tools" }, h("button", { type: "button", class: "btn", onClick: () => { d.target.push(["", "", ""]); save(); render(); } }, "+ Zeile hinzufügen")),
      field("Überschrift Arbeitsschritte", input(d.stepsTitle, (v) => { d.stepsTitle = v; }, { label: "Überschrift Arbeitsschritte" })),
      h("ol", { class: "rw-list" }, d.steps.map(editStep)),
      h("div", { class: "page-tools" }, h("button", { type: "button", class: "btn", onClick: () => {
        d.steps.push({ id: Profile.uid(), title: "Neuer Schritt", text: "", bullets: [], show: [], go: null }); save(); render();
        setTimeout(() => root.querySelector(".rw-list li:last-child input")?.select(), 0);
      } }, "+ Schritt hinzufügen")),
      field("Überschrift Hinweise", input(d.hintsTitle, (v) => { d.hintsTitle = v; }, { label: "Überschrift Hinweise" })),
      field("Hinweise (eine Zeile pro Hinweis)", input(d.hints.join("\n"), (v) => { d.hints = lines(v); }, { area: true, rows: 4, label: "Hinweise" })),
    ];
  }

  /* ---------- Gesamtseite ---------- */
  function render() {
    const keepScroll = window.scrollY;
    root.classList.toggle("rw-edit", edit);
    root.replaceChildren(
      h("div", { class: "rw-edit-bar noprint" },
        h("button", { type: "button", class: "btn" + (edit ? " primary" : ""), "aria-pressed": String(edit), onClick: () => { edit = !edit; render(); window.scrollTo(0, 0); } },
          edit ? "✓ Fertig" : "✎ Bearbeiten"),
        edit ? h("p", { class: "note" }, "Alles wird sofort gespeichert und gehört zum Prüfungsprofil (Menü „Prüfung“ oben).") : null),
      ...(edit ? editPage() : viewPage()),
      h("div", { class: "page-tools noprint" },
        h("button", { type: "button", class: "btn", onClick: () => window.print() }, "⎙ Drucken / PDF"),
        edit
          ? h("button", { type: "button", class: "btn", onClick: () => {
              if (confirm("Den Umrüstungsplan auf die Standardwerte zurücksetzen? Eigene Änderungen gehen verloren.")) Profile.reset("rework");
            } }, "Plan auf Standard zurücksetzen")
          : h("button", { type: "button", class: "btn", onClick: () => {
              if (confirm("Alle Häkchen zurücksetzen?")) { done = {}; store.remove(KEY); render(); }
            } }, "Checkliste zurücksetzen")));
    refresh();
    if (keepScroll) window.scrollTo(0, keepScroll);
  }

  Profile.on((what) => { if (what === "rework" || what === "all") render(); });
  window.addEventListener("modelloaded", () => { if (!edit) render(); });    // BMK-Chips erst nach dem Laden verlinkbar
  render();
})();
