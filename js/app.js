/* ==========================================================
 * app.js – Logik: 3D-Verknüpfung, Bauteilkarten, E/A-Liste
 *
 * Funktionsprinzip der Verknüpfung:
 *  - Im GLB heißt jedes Material wie das Betriebsmittelkennzeichen
 *    (z. B. "-QA2"). materialFromPoint() liefert beim Klick dieses
 *    Material, daraus wird die passende Karte bestimmt.
 *  - Umgekehrt färbt die Karte alle Materialien ihrer BMK orange.
 * ========================================================== */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const HIGHLIGHT = BRAND.highlight;

  const app = $("#app");
  const viewer = $("#cabinet");
  const state = { activeId: null, category: "Alle", query: "" };

  /* ---------- Hilfsfunktionen ---------- */
  const norm = (s) => String(s).trim().toLowerCase();
  const pdfLink = (seite) => `${PDF_URL}#page=${seite + PDF_OFFSET}`;
  const componentByBmk = (bmk) => COMPONENTS.find((c) => c.bmk.some((b) => norm(b) === norm(bmk)));
  const isDesktop = () => window.matchMedia("(min-width: 900px)").matches;

  /* ---------- Navigation (Tabs Desktop / Bottom-Nav Mobil) ---------- */
  /* ---------- Erscheinungsbild aus config.js ---------- */
  function applyBranding() {
    document.title = BRAND.pageTitle;
    $("#brandName").textContent = BRAND.name;
    $("#brandSub").textContent = BRAND.subtitle || "";
    const badge = $("#brandBadge");
    badge.textContent = BRAND.badge || "";
    badge.hidden = !BRAND.badge;
    $("#phOrgTitle").textContent = BRAND.docOrgTitle;
    $("#phOrgLine").textContent = BRAND.docOrgLine;
    $("#phMeta").textContent = BRAND.docMeta;
    $$(".js-logo").forEach((img) => {
      if (BRAND.logo) { img.src = BRAND.logo; img.alt = BRAND.logoAlt || ""; } else img.hidden = true;
    });
    if (BRAND.logo) $("#favicon").href = BRAND.logo;
    viewer.setAttribute("src", BRAND.model);
    const layoutOk = typeof LAYOUT_PAGE !== "undefined" && LAYOUT_PAGE && PDF_URL;
    $("#layoutNote").hidden = !layoutOk;
    if (layoutOk) $("#linkLayout").textContent = `Seite ${LAYOUT_PAGE}`;
  }

  const setPrintDate = () => { $("#printDate").textContent = new Date().toLocaleDateString("de-DE"); };
  window.addEventListener("beforeprint", setPrintDate);
  setPrintDate();
  const VIEWS = { twin: "#pane-twin", io: "#pane-io", protocol: "#pane-protocol", rework: "#pane-rework", grafcet: "#pane-grafcet" };
  function go(target) {
    const view = ["io", "protocol", "rework", "grafcet"].includes(target) ? target : "twin";
    app.dataset.view = view;
    if (view === "twin") app.dataset.pane = target === "list" ? "list" : "3d";
    Object.entries(VIEWS).forEach(([k, sel]) => { $(sel).hidden = k !== view; });
    $("#printTitle").textContent = VIEW_TITLES[view];
    $$(".tab").forEach((b) => {
      const t = b.dataset.go === "3d" ? "twin" : b.dataset.go;
      b.classList.toggle("is-active", t === view);
    });
    $$(".bn").forEach((b) => b.classList.toggle("is-active", b.dataset.go === (view === "twin" ? app.dataset.pane : view)));
  }
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));

  /* ---------- Hervorhebung im 3D-Modell ---------- */
  let materialIndex = new Map();      // bmk (klein) -> [Material, …]
  const savedColors = new Map();      // Material -> Originalfarbe

  function indexMaterials() {
    materialIndex = new Map();
    (viewer.model?.materials ?? []).forEach((m) => {
      const key = norm(m.name);
      if (!materialIndex.has(key)) materialIndex.set(key, []);
      materialIndex.get(key).push(m);
    });
  }
  const materialsOf = (bmk) => materialIndex.get(norm(bmk)) ?? [];

  function clearHighlight() {
    savedColors.forEach((color, mat) => mat.pbrMetallicRoughness.setBaseColorFactor(color));
    savedColors.clear();
  }
  function highlight(comp) {
    comp.bmk.forEach((bmk) =>
      materialsOf(bmk).forEach((mat) => {
        savedColors.set(mat, [...mat.pbrMetallicRoughness.baseColorFactor]);
        mat.pbrMetallicRoughness.setBaseColorFactor(HIGHLIGHT);
      })
    );
  }
  const inModel = (comp) => comp.bmk.some((b) => materialsOf(b).length > 0);

  /* ---------- Auswahl ---------- */
  function selectMany(comps, { scroll = true } = {}) {
    const ids = comps.map((c) => c.id);
    state.activeId = ids.length === 1 ? ids[0] : null;
    $$(".card").forEach((el) => el.classList.toggle("is-active", ids.includes(el.dataset.id)));
    clearHighlight();
    comps.forEach(highlight);
    const el = ids.length && $(`.card[data-id="${ids[0]}"]`);
    if (el && scroll) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  const select = (comp, opts) => selectMany(comp ? [comp] : [], opts);

  /* ---------- Karten rendern ---------- */
  function renderChips() {
    const wrap = $("#chips");
    ["Alle", ...CATEGORIES].forEach((cat) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (cat === state.category ? " is-active" : "");
      b.textContent = cat;
      b.addEventListener("click", () => {
        state.category = cat;
        $$(".chip", wrap).forEach((c) => c.classList.toggle("is-active", c === b));
        applyFilter();
      });
      wrap.appendChild(b);
    });
  }

  function renderCards() {
    const list = $("#componentList");
    COMPONENTS.forEach((c) => {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.id = c.id;

      // Kopf (Button, damit per Tastatur bedienbar)
      const head = document.createElement("button");
      head.type = "button";
      head.className = "card-head";
      head.innerHTML = `
        <span class="card-title"><span></span><span class="badges"></span></span>
        <span class="card-sum"></span>`;
      head.querySelector(".card-title > span").textContent = c.title;
      c.bmk.forEach((b) => {
        const s = document.createElement("span");
        s.className = "bmk"; s.textContent = b;
        head.querySelector(".badges").appendChild(s);
      });
      head.querySelector(".card-sum").textContent = c.summary;
      head.addEventListener("click", () => select(state.activeId === c.id ? null : c, { scroll: false }));

      // Detailbereich
      const body = document.createElement("div");
      body.className = "card-body";
      const dl = document.createElement("dl");
      dl.className = "dl";
      c.details.forEach(([k, v]) => {
        const dt = document.createElement("dt"); dt.textContent = k;
        const dd = document.createElement("dd"); dd.textContent = v;
        dl.append(dt, dd);
      });
      const links = document.createElement("div");
      links.className = "links";
      (PDF_URL ? c.blatt : []).forEach((n) => {
        const a = document.createElement("a");
        a.className = "schema-link";
        a.textContent = `E-Plan Blatt ${n}`;
        a.target = "_blank"; a.rel = "noopener";
        a.href = pdfLink(BLATT_TO_SEITE(n));
        links.appendChild(a);
      });
      body.append(dl, links);

      card.append(head, body);
      list.appendChild(card);
    });
  }

  function applyFilter() {
    const q = norm(state.query);
    let shown = 0;
    COMPONENTS.forEach((c) => {
      const hay = norm([c.title, c.summary, c.category, c.bmk.join(" ")].join(" "));
      const ok = (state.category === "Alle" || c.category === state.category) && (!q || hay.includes(q));
      $(`.card[data-id="${c.id}"]`).hidden = !ok;
      if (ok) shown++;
    });
    $("#emptyMsg").hidden = shown > 0;
  }
  $("#searchInput").addEventListener("input", (e) => { state.query = e.target.value; applyFilter(); });

  /* ---------- Klick im 3D-Modell ---------- */
  // Nur echte Klicks zählen, kein Drehen der Kamera
  let down = null;
  viewer.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
  viewer.addEventListener("click", (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    if (!viewer.modelIsVisible) return;
    // model-viewer rechnet intern selbst auf Elementkoordinaten um -> Client-Koordinaten übergeben
    const mat = viewer.materialFromPoint(e.clientX, e.clientY);
    if (!mat) return select(null);
    const comp = componentByBmk(mat.name);
    if (!comp) {                       // z. B. Schienen oder Gehäuse ohne BMK
      console.info("Kein Bauteil hinterlegt für:", mat.name);
      return select(null);
    }
    select(comp);
    if (!isDesktop()) go("list");      // Mobil: Beschreibung direkt zeigen
  });

  /* ---------- Toolbar ---------- */
  $("#btnReset").addEventListener("click", () => {
    viewer.cameraOrbit = "auto auto auto";
    viewer.cameraTarget = "auto auto auto";
    viewer.fieldOfView = "auto";
    select(null);
  });
  $("#btnClear").addEventListener("click", () => select(null));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") select(null); });

  $("#linkLayout").addEventListener("click", (e) => {
    e.preventDefault();
    if (PDF_URL && LAYOUT_PAGE) window.open(pdfLink(LAYOUT_PAGE), "_blank", "noopener");
  });

  /* ---------- Ladezustand des Modells ---------- */
  const loader = $("#loader");
  viewer.addEventListener("progress", (e) => {
    const p = Math.round((e.detail.totalProgress || 0) * 100);
    $("#loaderFill").style.width = p + "%";
    $("#loaderText").textContent = `3D-Modell wird geladen … ${p} %`;
  });
  viewer.addEventListener("load", () => {
    indexMaterials();
    COMPONENTS.forEach((c) => $(`.card[data-id="${c.id}"]`).classList.toggle("is-missing", !inModel(c)));
    loader.classList.add("is-done");
  });
  viewer.addEventListener("error", () => {
    loader.classList.add("is-error");
    $("#loaderText").textContent =
      "Das Modell konnte nicht geladen werden. Bitte die Seite über einen lokalen Webserver öffnen (nicht per Doppelklick).";
  });

  /* ---------- E/A-Liste ---------- */
  const STORE_KEY = "schaltschrank.operanden";
  let operands = {};
  try { operands = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { operands = {}; }
  const saveOperands = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(operands)); } catch { /* privat/blockiert */ } };

  const ioRows = [
    ...IO_INPUTS.map((r) => ({ kind: "in", op: r[0], bmk: r[1], fn: r[2] })),
    ...IO_OUTPUTS.map((r) => ({ kind: "out", op: r[0], bmk: r[1], fn: r[2] })),
  ];
  const ioState = { filter: "all", query: "" };

  function renderIo() {
    const body = $("#ioBody");
    body.textContent = "";
    const q = norm(ioState.query);
    const groups = [["in", "Eingänge"], ["out", "Ausgänge"]];
    groups.forEach(([kind, label]) => {
      if (ioState.filter !== "all" && ioState.filter !== kind) return;
      const rows = ioRows.filter((r) => r.kind === kind && (!q || norm(`${r.op} ${r.bmk} ${r.fn}`).includes(q)));
      if (!rows.length) return;
      const g = document.createElement("tr");
      g.className = "group";
      g.innerHTML = `<td colspan="4"></td>`;
      g.firstChild.textContent = label;
      body.appendChild(g);

      rows.forEach((r) => {
        const tr = document.createElement("tr");
        const comp = r.bmk && componentByBmk(r.bmk);
        if (comp) { tr.className = "is-link"; tr.title = `Im 3D-Modell zeigen: ${comp.title}`; }

        const tdOp = document.createElement("td"); tdOp.className = "op"; tdOp.textContent = r.op;
        const tdIn = document.createElement("td");
        if (r.op !== "–" && r.bmk) {
          const inp = document.createElement("input");
          inp.className = "op-input"; inp.type = "text"; inp.maxLength = 12;
          inp.placeholder = kind === "in" ? "E 0.0" : "A 0.0";
          inp.setAttribute("aria-label", `Eigener Operand für ${r.op}`);
          inp.value = operands[r.op] || "";
          inp.addEventListener("click", (e) => e.stopPropagation());
          inp.addEventListener("input", () => {
            if (inp.value.trim()) operands[r.op] = inp.value.trim(); else delete operands[r.op];
            saveOperands();
          });
          tdIn.appendChild(inp);
        }
        const tdB = document.createElement("td"); tdB.className = "op"; tdB.textContent = r.bmk;
        const tdF = document.createElement("td"); tdF.textContent = r.fn;
        tr.append(tdOp, tdIn, tdB, tdF);

        if (comp) tr.addEventListener("click", () => { go("3d"); select(comp); });
        body.appendChild(tr);
      });
    });
  }
  $("#ioSearch").addEventListener("input", (e) => { ioState.query = e.target.value; renderIo(); });
  $$("#ioFilter .seg-btn").forEach((b) =>
    b.addEventListener("click", () => {
      ioState.filter = b.dataset.f;
      $$("#ioFilter .seg-btn").forEach((x) => x.classList.toggle("is-active", x === b));
      renderIo();
    })
  );

  $("#btnCsv").addEventListener("click", () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      esc(BRAND.csvHeader),
      esc("Zuordnungsliste der Ein- und Ausgänge – Stand " + new Date().toLocaleDateString("de-DE")),
      "",
      ["Operand", "Eigener Operand", "BMK", "Funktion"].map(esc).join(";"),
    ];
    ioRows.forEach((r) => lines.push([r.op, operands[r.op] || "", r.bmk, r.fn].map(esc).join(";")));
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "zuordnungsliste.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- Schnittstelle für protocol.js, rework.js, grafcet.js ---------- */
  window.Twin = {
    go, select, selectMany, componentByBmk, isDesktop,
    // aus anderen Ansichten ins 3D-Modell springen und Bauteile markieren
    reveal(comps) { go("3d"); selectMany(comps.filter(Boolean)); },
  };

  $("#btnIoPrint").addEventListener("click", () => window.print());
  $("#brandLink").addEventListener("click", (e) => { e.preventDefault(); go("3d"); });

  /* ---------- Start ---------- */
  applyBranding();
  renderChips();
  renderCards();
  renderIo();
  go("3d");
})();
