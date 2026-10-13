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

  root.append(
    h("div", { class: "page-head" },
      h("h2", null, "Umrüstung – Vorbereitungsauftrag"),
      h("p", { class: "note" },
        "In der Anlage werden verschiedene Würfel sortiert. Start in Grundposition 10 (-BG13) mit eingefahrenen Zylindern -MM20 und -MM30. Das Magazin wird mit je einem Würfel aus Kunststoff ohne Bohrung, Metall mit Bohrung und Metall ohne Bohrung bestückt.")),
    progress,
    h("h3", { class: "sub" }, "Sollverhalten nach der Umrüstung"), target,
    h("h3", { class: "sub" }, "Arbeitsschritte"),
    h("ol", { class: "rw-list" }, REWORK_STEPS.map(step)),
    h("h3", { class: "sub" }, "Hinweise"),
    h("ul", { class: "rw-hints" }, REWORK_HINTS.map((t) => h("li", null, t)),
      h("li", null, PDF_URL ? h("a", { href: `${PDF_URL}#page=1`, target: "_blank", rel: "noopener" }, "Änderungsmitteilung im PDF öffnen") : null)),
    h("div", { class: "page-tools noprint" },
      h("button", { type: "button", class: "btn", onClick: () => {
        if (confirm("Alle Häkchen zurücksetzen?")) { done = {}; store.remove(KEY); root.querySelectorAll(".rw-step").forEach((li) => { li.classList.remove("is-done"); li.querySelector("input").checked = false; }); refresh(); }
      } }, "Checkliste zurücksetzen")));
  refresh();
})();
