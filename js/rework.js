/* ==========================================================
 * rework.js – Umrüstung (Auftragsbeschreibung Vorbereitungsauftrag)
 * Abhakbare Checkliste mit Fortschritt (im Browser gespeichert)
 * und Sprung zu betroffenen Bauteilen im 3D-Modell.
 * ========================================================== */
(() => {
  "use strict";
  const root = document.getElementById("pane-rework");
  const KEY = "schaltschrank.umruestung";
  let done = store.get(KEY, {});

  const progress = h("div", { class: "proto-summary", role: "status" });
  function refresh() {
    const n = REWORK_STEPS.filter((_, i) => done[i]).length;
    const total = REWORK_STEPS.length;
    progress.className = "proto-summary" + (n === total ? " good" : "");
    progress.replaceChildren(
      h("div", { class: "bar" }, h("span", { style: `width:${Math.round((n / total) * 100)}%` })),
      h("p", null, h("strong", null, `${n} von ${total} Schritten erledigt`)));
  }

  function step(s, i) {
    const box = h("input", { type: "checkbox", checked: !!done[i], "aria-label": `Schritt ${i + 1} erledigt`,
      onChange: (e) => { done[i] = e.target.checked; item.classList.toggle("is-done", e.target.checked); store.set(KEY, done); refresh(); } });

    const comps = (s.show || []).map((id) => COMPONENTS.find((c) => c.id === id)).filter(Boolean);
    const actions = h("div", { class: "rw-actions noprint" });
    if (comps.length) actions.append(h("button", { type: "button", class: "btn", onClick: () => Twin.reveal(comps) }, "Im 3D-Modell zeigen"));
    if (s.go) actions.append(h("button", { type: "button", class: "btn", onClick: () => Twin.go(s.go[0]) }, s.go[1]));

    const item = h("li", { class: "rw-step" + (done[i] ? " is-done" : "") },
      h("label", { class: "rw-check" }, box, h("span", { class: "rw-num" }, String(i + 1))),
      h("div", { class: "rw-body" },
        h("h3", null, s.title),
        s.text ? h("p", null, bmkText(s.text)) : null,
        s.bullets ? h("ul", null, s.bullets.map((b) => h("li", null, bmkText(b)))) : null,
        actions.childNodes.length ? actions : null));
    return item;
  }

  const target = h("table", { class: "rw-table" },
    h("thead", null, h("tr", null, h("th", null, "Teil"), h("th", null, "Ablage"), h("th", null, "Verhalten"))),
    h("tbody", null, REWORK_TARGET.map((r) => h("tr", null, r.map((c) => h("td", null, bmkText(c)))))));

  const pdfHint = REWORK_META.pdf && PDF_URL
    ? h("li", null, h("a", { href: `${PDF_URL}#page=${REWORK_META.pdf.page}`, target: "_blank", rel: "noopener" }, REWORK_META.pdf.label))
    : null;

  root.append(
    h("div", { class: "page-head" },
      h("h2", null, REWORK_META.title),
      h("p", { class: "note" }, REWORK_META.intro)),
    progress,
    ...(REWORK_TARGET.length ? [h("h3", { class: "sub" }, REWORK_META.targetTitle), target] : []),
    h("h3", { class: "sub" }, REWORK_META.stepsTitle),
    h("ol", { class: "rw-list" }, REWORK_STEPS.map(step)),
    ...(REWORK_HINTS.length || pdfHint ? [h("h3", { class: "sub" }, REWORK_META.hintsTitle),
      h("ul", { class: "rw-hints" }, REWORK_HINTS.map((t) => h("li", null, t)), pdfHint)] : []),
    h("div", { class: "page-tools noprint" },
      h("button", { type: "button", class: "btn", onClick: () => window.print() }, "⎙ Drucken / PDF"),
      h("button", { type: "button", class: "btn", onClick: () => {
        if (confirm("Alle Häkchen zurücksetzen?")) { done = {}; store.remove(KEY); root.querySelectorAll(".rw-step").forEach((li) => { li.classList.remove("is-done"); li.querySelector("input").checked = false; }); refresh(); }
      } }, "Checkliste zurücksetzen")));
  refresh();
})();
