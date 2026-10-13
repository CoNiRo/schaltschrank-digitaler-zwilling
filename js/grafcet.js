/* ==========================================================
 * grafcet.js – GRAFCET-Ablaufpläne der Bereitstellung (Seiten 43–47)
 * Ansicht 1: Simulation von G_Auto (Schritt für Schritt, je Ablaufvariante)
 * Weitere Ansichten: Pläne als Schritt-/Übergangsliste
 * Die Pläne stehen in js/data.js (GRAFCETS) und lassen sich dort ersetzen.
 * ========================================================== */
(() => {
  "use strict";
  const root = document.getElementById("pane-grafcet");
  const auto = GRAFCETS.find((g) => g.id === "auto");
  const stepById = (g, n) => g.steps.find((s) => s.n === n);
  const TABS = [["sim", "Simulation G_Auto"], ...GRAFCETS.map((g) => [g.id, g.title])];

  let tab = "sim";
  let kind = Object.keys(auto.paths)[0];
  let idx = 0;

  const body = h("div", { class: "gc-body" });
  const tabs = h("div", { class: "chips", role: "tablist", "aria-label": "GRAFCET-Pläne" });

  const compsIn = (acts) => {
    const set = new Map();
    acts.forEach((a) => (a.t.match(/-[A-Z]{2,3}\d+/g) || []).forEach((b) => {
      const c = Twin.componentByBmk(b); if (c) set.set(c.id, c);
    }));
    return [...set.values()];
  };

  const actionBox = (a) =>
    h("div", { class: "gc-act" }, a.c ? h("span", { class: "gc-cond" }, `[${a.c}] `) : null, bmkText(a.t));

  const node = (s, active) => h("div", { class: "gc-node" + (s.init ? " init" : "") + (active ? " active" : "") }, s.n);

  /* ----- statische Pläne ----- */
  function renderGraph(g) {
    const list = h("div", { class: "gc-list" });
    g.steps.forEach((s) => {
      list.append(
        h("div", { class: "gc-step" }, node(s), h("div", { class: "gc-acts" }, s.act.length ? s.act.map(actionBox) : h("span", { class: "gc-none" }, "keine Aktion"))),
        h("div", { class: "gc-trans" }, s.out.map((o) =>
          h("div", { class: "gc-edge" }, h("span", { class: "gc-bar" }), h("span", { class: "gc-cond" }, o.c), h("span", { class: "gc-to" }, `→ Schritt ${o.to}`)))));
    });
    const note = h("p", { class: "note" }, "Schreibweise: ¬ = Negation (Überstrich im Original), t / X = Verzögerung t nach Aktivierung des Signals X, ↑ = steigende Flanke, [ … ] = Bedingung einer Aktion.");
    return h("div", null, note, list);
  }

  /* ----- Simulation ----- */
  function renderSim() {
    const path = auto.paths[kind];
    const s = stepById(auto, path[idx]);
    const nextId = path[idx + 1];
    const edge = nextId ? s.out.find((o) => o.to === nextId) : null;

    const picker = h("div", { class: "seg", role: "group", "aria-label": "Würfelart" },
      ...Object.entries(auto.pathNames).map(([k, label]) =>
        h("button", { type: "button", class: "seg-btn" + (k === kind ? " is-active" : ""),
          onClick: () => { kind = k; idx = 0; draw(); } }, label)));

    const trail = h("ol", { class: "gc-trail" }, path.map((id, i) =>
      h("li", { class: i === idx ? "now" : i < idx ? "past" : "" }, h("button", { type: "button", onClick: () => { idx = i; draw(); } }, id))));

    const comps = compsIn(s.act);
    const card = h("div", { class: "gc-now" },
      h("div", { class: "gc-step" }, node(s, true),
        h("div", { class: "gc-acts" }, s.act.length ? s.act.map(actionBox) : h("span", { class: "gc-none" }, s.init ? "Anfangsschritt – wartet auf Start" : "keine Aktion"))),
      edge
        ? h("div", { class: "gc-edge big" }, h("span", { class: "gc-bar" }), h("span", null, h("small", null, "Weiter, sobald"), h("br"), h("span", { class: "gc-cond" }, edge.c)), h("span", { class: "gc-to" }, `→ Schritt ${edge.to}`))
        : h("p", { class: "note" }, GRAFCET_META.simEnd));

    const controls = h("div", { class: "page-tools" },
      h("button", { class: "btn", type: "button", disabled: idx === 0, onClick: () => { idx--; draw(); } }, "← Zurück"),
      h("button", { class: "btn primary", type: "button", disabled: idx >= path.length - 1, onClick: () => { idx++; draw(); } }, "Weiter →"),
      h("button", { class: "btn", type: "button", onClick: () => { idx = 0; draw(); } }, "↺ Neustart"),
      comps.length ? h("button", { class: "btn", type: "button", onClick: () => Twin.reveal(comps) }, `Im 3D-Modell zeigen (${comps.map((c) => c.bmk[0]).join(", ")})`) : null);

    return h("div", null,
      h("p", { class: "note" }, "Wähle eine Würfelart und gehe den Ablauf Schritt für Schritt durch. Der aktuelle Schritt zeigt die aktiven Aktionen und die Bedingung für den nächsten Übergang."),
      picker, trail, card, controls);
  }

  function draw() {
    tabs.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c.dataset.tab === tab));
    body.replaceChildren(tab === "sim" ? renderSim() : renderGraph(GRAFCETS.find((g) => g.id === tab)));
  }

  TABS.forEach(([id, label]) => tabs.append(h("button", { type: "button", class: "chip", role: "tab", "data-tab": id,
    onClick: () => { tab = id; draw(); } }, label)));

  root.append(h("div", { class: "page-head" },
      h("h2", null, GRAFCET_META.title),
      h("p", { class: "note" }, GRAFCET_META.note),
      tabs,
      h("div", { class: "page-tools noprint" }, h("button", { type: "button", class: "btn", onClick: () => window.print() }, "⎙ Aktuellen Plan drucken / PDF"))),
    body);
  draw();
})();
