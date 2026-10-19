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
  const state = { activeId: null, activeIds: [], category: "Alle", query: "" };
  const stats = { loadMs: null };             // gemessene Ladezeit des 3D-Modells
  // Optional: zweites GLB mit Leitungen (BRAND.modelWired). Der Schalter erscheint nur, wenn es konfiguriert ist.
  const WIRE_KEY = "schaltschrank.verdrahtung";
  let wired = false;
  try { wired = !!BRAND.modelWired && localStorage.getItem(WIRE_KEY) === "1"; } catch { /* blockiert */ }
  const currentModel = () => (wired && BRAND.modelWired ? BRAND.modelWired : BRAND.model);
  const isWire = (m) => String(m.name).startsWith("_Leitung_");
  const wireInfo = (m) => { const p = m.name.split("|"); return { nr: p[0].replace("_Leitung_", ""), net: p[1], spec: p[2], from: p[3], to: p[4] }; };
  let loadStart = performance.now();

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
    loadStart = performance.now();
    viewer.setAttribute("src", currentModel());
    $("#btnWire").hidden = !BRAND.modelWired;
    $("#btnWire").setAttribute("aria-pressed", String(wired));
    const layoutOk = typeof LAYOUT_PAGE !== "undefined" && LAYOUT_PAGE && PDF_URL;
    $("#layoutNote").hidden = !layoutOk;
    if (layoutOk) $("#linkLayout").textContent = `Seite ${LAYOUT_PAGE}`;
  }

  const setPrintDate = () => { $("#printDate").textContent = new Date().toLocaleDateString("de-DE"); };
  window.addEventListener("beforeprint", setPrintDate);
  setPrintDate();
  const VIEWS = { twin: "#pane-twin", io: "#pane-io", protocol: "#pane-protocol", rework: "#pane-rework", qr: "#pane-qr" };
  function go(target) {
    const view = ["io", "protocol", "rework", "qr"].includes(target) ? target : "twin";
    app.dataset.view = view;
    if (view === "twin") app.dataset.pane = target === "list" ? "list" : "3d";
    Object.entries(VIEWS).forEach(([k, sel]) => { $(sel).hidden = k !== view; });
    $("#printTitle").textContent = VIEW_TITLES[view] || VIEW_TITLES.twin;
    $$(".tab").forEach((b) => {
      const t = b.dataset.go === "3d" ? "twin" : b.dataset.go;
      b.classList.toggle("is-active", t === view);
    });
    $$(".bn").forEach((b) => b.classList.toggle("is-active", b.dataset.go === (view === "twin" ? app.dataset.pane : view)));
    window.dispatchEvent(new CustomEvent("viewchange", { detail: view }));
  }
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));

  /* ---------- Hervorhebung im 3D-Modell ---------- */
  let materialIndex = new Map();      // bmk (klein) -> [Material, …]
  const savedColors = new Map();      // Material -> Originalfarbe

  function indexMaterials() {
    materialIndex = new Map();
    (viewer.model?.materials ?? []).forEach((m) => {
      const key = norm(m.name.split("|")[0]);
      if (!materialIndex.has(key)) materialIndex.set(key, []);
      materialIndex.get(key).push(m);
    });
  }
  const materialsOf = (bmk) => (materialIndex.get(norm(bmk)) ?? []).filter(usable);

  /* ---------- Hauptschalter (Animation im GLB) und Spannungszustand der Leitungen ---------- */
  const SW_ANIM = "QB1_Schalten", SW_DUR = 0.6, SW_KEY = "schaltschrank.hauptschalter";
  let swOn = true, swCur = 0, swAnimId = 0;
  try { swOn = localStorage.getItem(SW_KEY) !== "0"; } catch { /* blockiert */ }
  // Stellung des Griffs im Modell (Zeitpunkt 0 der Animation): "ein" oder "aus", einstellbar in config.js (mainSwitchInModel)
  const swModelOn = () => (BRAND.mainSwitchInModel || "aus") === "ein";
  const swTime = (on) => (on === swModelOn() ? 0 : SW_DUR);
  const hasSwitch = () => (viewer.availableAnimations || []).includes(SW_ANIM);
  const baseColor = new WeakMap();
  const switchedSpec = /Hauptstromkreis|230 V|Steuerstromkreis|NOT-AUS/;
  const powerMsg = () => (wired && !swOn ? "Hauptschalter AUS: Leitungen hinter -QB1 sind spannungsfrei (grau)." : "");
  const GREY = [0.62, 0.62, 0.62];
  const origMode = new WeakMap();
  // Ungenutzte Materialien lädt der Viewer nicht; ein Zugriff darauf wirft einen Fehler -> überspringen
  const usable = (m) => {
    if (m.isLoaded === false) return false;
    try { return !!m.pbrMetallicRoughness; } catch { return false; }
  };
  function captureBase() {
    (viewer.model?.materials ?? []).filter(usable).forEach((m) => { if (!baseColor.has(m)) baseColor.set(m, [...m.pbrMetallicRoughness.baseColorFactor]); });
  }
  // Bauteile, die laut Profil nicht verbaut sind (BMK, klein geschrieben)
  const offBmk = () => new Set(COMPONENTS.filter((c) => Profile.isOff(c)).flatMap((c) => c.bmk.map(norm)));
  const wireEnds = (m) => { const w = wireInfo(m); return [w.from, w.to].map((e) => norm(String(e).split(":")[0])); };
  // Material ausgeblendet? (nur im Modus "ausblenden")
  const isHiddenMat = (m) => {
    if (Profile.state.mode !== "hide") return false;
    const off = offBmk();
    return isWire(m) ? wireEnds(m).some((e) => off.has(e)) : off.has(norm(m.name.split("|")[0]));
  };
  function setBlend(m, on) {
    if (typeof m.setAlphaMode !== "function") return;
    if (on) { if (!origMode.has(m)) origMode.set(m, m.getAlphaMode ? m.getAlphaMode() : "OPAQUE"); m.setAlphaMode("BLEND"); }
    else if (origMode.has(m)) { m.setAlphaMode(origMode.get(m)); origMode.delete(m); }
  }
  // Erscheinungsbild: Grundfarbe, nicht verbaute Bauteile (grau/ausgeblendet), Spannungszustand der Leitungen
  function applyPower() {
    const off = offBmk(), hide = Profile.state.mode === "hide";
    (viewer.model?.materials ?? []).filter(usable).forEach((m) => {
      const base = baseColor.get(m) || [...m.pbrMetallicRoughness.baseColorFactor];
      let col = base, gone = false;
      if (isWire(m)) {
        if (wireEnds(m).some((e) => off.has(e))) { col = [...GREY, 1]; gone = hide; }
        else if (!swOn && switchedSpec.test(wireInfo(m).spec)) col = [...GREY, 1];
      } else if (off.has(norm(m.name.split("|")[0]))) { col = [...GREY, base[3] ?? 1]; gone = hide; }
      m.pbrMetallicRoughness.setBaseColorFactor(gone ? [col[0], col[1], col[2], 0] : col);
      setBlend(m, gone);
    });
    showWirePanel(powerMsg());
  }
  function poseSwitch(t) { viewer.animationName = SW_ANIM; viewer.pause(); viewer.currentTime = t; swCur = t; }
  function updateSwitchButton() {
    const b = $("#btnSwitch");
    b.hidden = !hasSwitch();
    b.setAttribute("aria-pressed", String(swOn));
    b.textContent = `⏻ Hauptschalter: ${swOn ? "EIN" : "AUS"}`;
  }
  function setSwitch(on, { animate = true } = {}) {
    swOn = on;
    try { localStorage.setItem(SW_KEY, on ? "1" : "0"); } catch { /* blockiert */ }
    clearHighlight();
    const from = swCur, to = swTime(on), id = ++swAnimId;
    if (!animate || from === to) poseSwitch(to);
    else {
      const t0 = performance.now();
      const step = (now) => {
        if (id !== swAnimId) return;
        const k = Math.min(1, (now - t0) / 450), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        poseSwitch(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    updateSwitchButton();
    applyPower();
  }

  function clearHighlight() {
    savedColors.forEach((color, mat) => mat.pbrMetallicRoughness.setBaseColorFactor(color));
    savedColors.clear();
    showWirePanel(powerMsg());
  }
  // Infofeld im 3D-Fenster (Leitungsdaten, Legende)
  function showWirePanel(text) {
    const box = $("#wireInfo");
    box.textContent = text; box.hidden = !text;
  }
  $("#wireInfo").addEventListener("click", () => { $("#wireInfo").hidden = true; });   // Antippen blendet den Hinweis aus
  // Legende: ein-/ausklappbar, damit sie das 3D-Modell nicht verdeckt (mobil zunaechst eingeklappt)
  function setLegendOpen(open) {
    $("#wirePanel").classList.toggle("is-collapsed", !open);
    $("#wireToggle").setAttribute("aria-expanded", String(open));
  }
  $("#wireToggle").addEventListener("click", () => setLegendOpen($("#wireToggle").getAttribute("aria-expanded") !== "true"));
  function buildLegend() {
    const box = $("#wireLegend"); box.replaceChildren();
    const seen = new Map();
    (viewer.model?.materials ?? []).filter((m) => isWire(m) && usable(m)).forEach((m) => {
      const spec = wireInfo(m).spec; if (seen.has(spec)) return;
      seen.set(spec, baseColor.get(m) || m.pbrMetallicRoughness.baseColorFactor);
    });
    seen.forEach((c, spec) => {
      const bg = spec.includes("grün-gelb") ? "repeating-linear-gradient(90deg,#1a9933 0 5px,#fad600 5px 10px)" : `rgb(${c.slice(0, 3).map((v) => Math.round(v * 255)).join(",")})`;
      const li = h("span", { class: "wl" }, h("i", { style: `background:${bg}` }), spec);
      box.append(li);
    });
    box.hidden = seen.size === 0;
    $("#wireToggle").hidden = seen.size === 0;
    $("#wireToggleText").textContent = `Leitungsfarben (${seen.size})`;
    setLegendOpen(isDesktop());
  }
  function exportWires() {
    const rows = (viewer.model?.materials ?? []).filter((m) => isWire(m) && usable(m)).map(wireInfo).sort((a, b) => a.nr.localeCompare(b.nr));
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [q(BRAND.csvHeader), q(`Leitungsliste aus dem 3D-Modell – Stand ${new Date().toLocaleDateString("de-DE")}`), "",
      ["Nr", "Netz", "Von", "Nach", "Leitung"].map(q).join(";"), ...rows.map((r) => [r.nr, r.net, r.from, r.to, r.spec].map(q).join(";"))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "leitungsliste.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
  function paint(mat, color) {
    if (!savedColors.has(mat)) savedColors.set(mat, [...mat.pbrMetallicRoughness.baseColorFactor]);
    mat.pbrMetallicRoughness.setBaseColorFactor(color);
  }
  function highlightWires(comp) {
    if (!wired) return 0;
    const keys = comp.bmk.map(norm);
    let n = 0;
    (viewer.model?.materials ?? []).filter((m) => isWire(m) && usable(m)).forEach((m) => {
      const w = wireInfo(m);
      if ([w.from, w.to].some((e) => keys.includes(norm(e.split(":")[0])))) { paint(m, [1, 0.85, 0.1, 1]); n++; }
    });
    return n;
  }
  function highlight(comp) {
    const wn = highlightWires(comp);
    showWirePanel(wn ? `${wn} Leitungen an ${comp.bmk.join(", ")} gelb hervorgehoben.` : "");
    comp.bmk.forEach((bmk) =>
      materialsOf(bmk).forEach((mat) => {
        savedColors.set(mat, [...mat.pbrMetallicRoughness.baseColorFactor]);
        mat.pbrMetallicRoughness.setBaseColorFactor(HIGHLIGHT);
      })
    );
  }
  /* ---------- Kamera-Zoom auf ein Bauteil ---------- */
  // Mittelpunkt/Radius je Bauteil stammen aus js/focus(.local).js (erzeugt mit tools/make_focus.py)
  function focusOn(comp) {
    const parts = window.FOCUS?.parts;
    if (!parts || !viewer.model) return false;
    const hits = comp.bmk.map((b) => parts[b]).filter(Boolean);
    if (!hits.length) return false;
    const lo = [0, 1, 2].map((i) => Math.min(...hits.map((p) => p[i] - p[3])));
    const hi = [0, 1, 2].map((i) => Math.max(...hits.map((p) => p[i] + p[3])));
    const c = [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2);
    const r = Math.max(...[0, 1, 2].map((i) => hi[i] - lo[i])) / 2;
    const cur = viewer.getCameraOrbit();
    const portrait = viewer.clientHeight > viewer.clientWidth;
    const dist = Math.max(0.12, r * (portrait ? 3.6 : 2.8));
    viewer.cameraTarget = `${c[0]}m ${c[1]}m ${c[2]}m`;
    viewer.cameraOrbit = `${cur.theta}rad ${Math.min(cur.phi, 1.35)}rad ${dist}m`;
    return true;
  }
  // Mobil: Karte antippen -> 3D-Ansicht mit Zoom auf das Bauteil
  function showInModel(comp) {
    select(comp, { scroll: false });
    if (!isDesktop()) go("3d");
    // nach dem Umschalten hat das Viewer-Element erst seine Groesse
    requestAnimationFrame(() => requestAnimationFrame(() => focusOn(comp)));
  }
  const inModel = (comp) => comp.bmk.some((b) => materialsOf(b).length > 0);

  /* ---------- Auswahl ---------- */
  const deepLink = (comp) => `${location.origin}${location.pathname}${location.search}#/bauteil/${comp.id}`;
  function updateHash(comps) {
    try {
      const h = comps.length === 1 ? `#/bauteil/${comps[0].id}` : "";
      history.replaceState(null, "", location.pathname + location.search + h);
    } catch { /* z. B. file:// */ }
  }
  function selectMany(comps, { scroll = true } = {}) {
    const ids = comps.map((c) => c.id);
    state.activeIds = ids;
    state.activeId = ids.length === 1 ? ids[0] : null;
    $$(".card").forEach((el) => el.classList.toggle("is-active", ids.includes(el.dataset.id)));
    clearHighlight();
    if (!comps.length) hideTip();
    comps.forEach(highlight);
    updateHash(comps);
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
      head.addEventListener("click", () => {
        if (!isDesktop() && inModel(c)) return showInModel(c);        // Mobil: direkt zum Bauteil
        select(state.activeId === c.id ? null : c, { scroll: false });
      });

      // Schalter: Bauteil ist im Schaltschrank verbaut (abwählbar für andere Prüfungen)
      const verbaut = h("label", { class: "verbaut", title: "Abwählen, wenn das Bauteil in diesem Schaltschrank nicht gebraucht wird" },
        h("input", { type: "checkbox", checked: !Profile.isOff(c), onChange: (e) => setOff(c, !e.target.checked) }), " verbaut");

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
      links.append(h("button", { type: "button", class: "schema-link copy-link", title: "Direktlink zu diesem Bauteil kopieren",
        onClick: async (e) => {
          const btn = e.currentTarget, url = deepLink(c);
          try { await navigator.clipboard.writeText(url); btn.textContent = "Link kopiert ✓"; }
          catch { window.prompt("Direktlink:", url); }
          setTimeout(() => { btn.textContent = "🔗 Link kopieren"; }, 1800);
        } }, "🔗 Link kopieren"));
      links.prepend(h("button", { type: "button", class: "schema-link show-link", title: "Im 3D-Modell anzeigen und heranzoomen",
        onClick: () => showInModel(c) }, "🔍 Im 3D-Modell zeigen"));
      body.append(dl, links);

      card.append(head, verbaut, body);
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
  /* ---------- Kurzbeschreibung (Hover am PC, erster Tipp am Handy) ---------- */
  const tip = $("#tip");
  function showTip(comp, x, y, touch) {
    tip.replaceChildren(
      h("span", { class: "tip-bmk" }, comp.bmk.join(" · ")),
      h("span", { class: "tip-title" }, comp.title),
      ...(Profile.isOff(comp) ? [h("span", { class: "tip-hint" }, "nicht verbaut")] : []),
      ...(touch ? [h("span", { class: "tip-hint" }, "Nochmal tippen für Details")] : []));
    tip.hidden = false;
    const box = viewer.parentElement.getBoundingClientRect();
    const px = x - box.left, py = y - box.top;
    const w = tip.offsetWidth, hgt = tip.offsetHeight;
    let left = px + 14, top = py + 16;
    if (left + w > box.width - 6) left = px - w - 14;
    if (top + hgt > box.height - 6) top = py - hgt - 14;
    tip.style.left = `${Math.max(6, left)}px`; tip.style.top = `${Math.max(6, top)}px`;
  }
  const hideTip = () => { tip.hidden = true; };
  let hoverBusy = false;
  viewer.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || e.buttons || hoverBusy || !viewer.modelIsVisible) return;
    hoverBusy = true;
    const x = e.clientX, y = e.clientY;
    requestAnimationFrame(() => {
      hoverBusy = false;
      const mat = viewer.materialFromPoint(x, y);
      const comp = mat && !isWire(mat) && !isHiddenMat(mat) ? componentByBmk(mat.name.split("|")[0]) : null;
      viewer.style.cursor = comp ? "pointer" : "";
      if (comp) showTip(comp, x, y, false); else hideTip();
    });
  });
  viewer.addEventListener("pointerleave", hideTip);
  viewer.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") hideTip(); });

  viewer.addEventListener("click", (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    if (!viewer.modelIsVisible) return;
    // model-viewer rechnet intern selbst auf Elementkoordinaten um -> Client-Koordinaten übergeben
    const mat = viewer.materialFromPoint(e.clientX, e.clientY);
    if (!mat || isHiddenMat(mat)) return select(null);
    if (isWire(mat)) {                 // Leitung angeklickt: Daten zeigen, Leitung markieren
      select(null);
      const w = wireInfo(mat);
      paint(mat, [1, 0.85, 0.1, 1]);
      showWirePanel(`Leitung ${Number(w.nr)} · Netz ${w.net} · ${w.from} → ${w.to} · ${w.spec}`);
      return;
    }
    const comp = componentByBmk(mat.name.split("|")[0]);
    if (!comp) {                       // z. B. Schienen oder Gehäuse ohne BMK
      console.info("Kein Bauteil hinterlegt für:", mat.name);
      return select(null);
    }
    const again = state.activeId === comp.id && !tip.hidden;       // zweiter Tipp auf dasselbe Bauteil
    select(comp, { scroll: false });
    if (mat.name.endsWith("|Griff") && hasSwitch()) { setSwitch(!swOn); return; }   // Griff am Hauptschalter: umlegen
    if (!isDesktop()) {
      // Mobil: 1. Tipp = Kurzbeschreibung, 2. Tipp = Bauteilliste an der passenden Stelle
      if (again) { hideTip(); go("list"); select(comp, { scroll: true }); }
      else showTip(comp, e.clientX, e.clientY, true);
    } else select(comp);
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
  $("#btnWire").addEventListener("click", () => {
    if (!BRAND.modelWired) return;
    wired = !wired;
    try { localStorage.setItem(WIRE_KEY, wired ? "1" : "0"); } catch { /* blockiert */ }
    $("#btnWire").setAttribute("aria-pressed", String(wired));
    clearHighlight();
    // Kameraposition beim Wechsel des Modells beibehalten
    const o = viewer.getCameraOrbit(), t = viewer.getCameraTarget();
    viewer.addEventListener("load", () => {
      viewer.cameraOrbit = `${o.theta}rad ${o.phi}rad ${o.radius}m`;
      viewer.cameraTarget = `${t.x}m ${t.y}m ${t.z}m`;
    }, { once: true });
    loader.classList.remove("is-done");
    loadStart = performance.now();
    viewer.setAttribute("src", currentModel());
  });
  $("#btnWireCsv").addEventListener("click", exportWires);
  $("#btnSwitch").addEventListener("click", () => setSwitch(!swOn));
  viewer.addEventListener("load", () => {
    $("#btnWireCsv").hidden = !wired;
    $("#wireLegend").hidden = true;
    $("#wireToggle").hidden = true;
    loader.classList.add("is-done");               // Ladebalken zuerst beenden, auch wenn unten etwas schiefgeht
    try {
      captureBase();
      if (wired) buildLegend();
      swCur = 0;
      if (hasSwitch()) poseSwitch(swTime(swOn));
      updateSwitchButton();
      applyPower();
    } catch (err) { console.error("Erscheinungsbild konnte nicht gesetzt werden:", err); }
    indexMaterials();
    COMPONENTS.forEach((c) => $(`.card[data-id="${c.id}"]`).classList.toggle("is-missing", !inModel(c)));
    loader.classList.add("is-done");
    stats.loadMs = performance.now() - loadStart;
    const again = state.activeIds.map((id) => COMPONENTS.find((c) => c.id === id)).filter(Boolean);
    if (again.length) selectMany(again, { scroll: false });   // Auswahl aus Direktlink jetzt im Modell markieren
    window.dispatchEvent(new CustomEvent("modelloaded"));
  });
  viewer.addEventListener("error", () => {
    loader.classList.add("is-error");
    $("#loaderText").textContent =
      "Das Modell konnte nicht geladen werden. Bitte die Seite über einen lokalen Webserver öffnen (nicht per Doppelklick).";
  });

  /* ---------- Bauteile abwählen (nicht verbaut) ---------- */
  function setOff(comp, off) {
    const list = Profile.state.off, i = list.indexOf(comp.id);
    if (off && i < 0) list.push(comp.id);
    if (!off && i >= 0) list.splice(i, 1);
    Profile.changed("off");
  }
  function refreshOff() {
    $$(".card").forEach((el) => {
      const c = COMPONENTS.find((x) => x.id === el.dataset.id);
      const off = Profile.isOff(c);
      el.classList.toggle("is-off", off);
      el.querySelector(".verbaut input").checked = !off;
    });
    const n = COMPONENTS.length - Profile.state.off.length;
    $("#offCount").textContent = `${n} von ${COMPONENTS.length} Bauteilen verbaut`;
    $("#offMode").value = Profile.state.mode;
    if (viewer.model) {
      const keep = state.activeIds.map((id) => COMPONENTS.find((c) => c.id === id)).filter(Boolean);
      try { clearHighlight(); applyPower(); } catch (err) { console.error(err); }
      if (keep.length) selectMany(keep, { scroll: false });
    }
    renderIo();
  }
  $("#offAll").addEventListener("click", () => { Profile.state.off = []; Profile.changed("off"); });
  $("#offNone").addEventListener("click", () => { Profile.state.off = COMPONENTS.map((c) => c.id); Profile.changed("off"); });
  $("#offMode").addEventListener("change", (e) => { Profile.state.mode = e.target.value === "hide" ? "hide" : "grey"; Profile.changed("off"); });

  /* ---------- E/A-Liste (bearbeitbar, Teil des Prüfungsprofils) ---------- */
  const STORE_KEY = "schaltschrank.operanden";
  let operands = store.get(STORE_KEY, {});
  const saveOperands = () => store.set(STORE_KEY, operands);
  const io = () => Profile.state.io;
  const ioState = { filter: "all", query: "", edit: false, focus: null };
  const nextOp = (kind) => {
    const pre = kind === "in" ? "I" : "O", used = new Set(io().filter((r) => r.k === kind).map((r) => r.op));
    let n = 0; while (used.has(pre + n)) n++;
    return pre + n;
  };

  function operandInput(r) {
    const inp = h("input", { class: "op-input", type: "text", maxLength: 12, placeholder: r.k === "in" ? "E 0.0" : "A 0.0",
      "aria-label": `Eigener Operand für ${r.op}`, value: operands[r.op] || "" });
    inp.addEventListener("click", (e) => e.stopPropagation());
    inp.addEventListener("input", () => { if (inp.value.trim()) operands[r.op] = inp.value.trim(); else delete operands[r.op]; saveOperands(); });
    return inp;
  }
  function viewRow(r) {
    const comp = r.bmk && componentByBmk(r.bmk);
    const tr = h("tr", { class: (comp ? "is-link" : "") + (comp && Profile.isOff(comp) ? " is-off" : ""), title: comp ? `Im 3D-Modell zeigen: ${comp.title}` : null },
      h("td", { class: "op" }, r.op),
      h("td", null, r.op !== "–" && r.bmk ? operandInput(r) : null),
      h("td", { class: "op" }, r.bmk),
      h("td", null, r.fn));
    if (comp) tr.addEventListener("click", () => { go("3d"); select(comp); });
    return tr;
  }
  function editRow(r) {
    const field = (key, label, cls, list) => {
      const inp = h("input", { class: "cell-input " + cls, type: "text", value: r[key], "aria-label": `${label} (${r.op || "neu"})` });
      if (list) inp.setAttribute("list", list);
      inp.addEventListener("input", () => {
        if (key === "op") { const old = r.op; r.op = inp.value; if (operands[old]) { operands[r.op] = operands[old]; delete operands[old]; saveOperands(); } }
        else r[key] = inp.value;
        Profile.save();
      });
      return inp;
    };
    const opIn = field("op", "Operand", "w-op"), bmkIn = field("bmk", "BMK", "w-bmk", "bmkList"), fnIn = field("fn", "Funktion", "w-fn");
    if (ioState.focus === r) { ioState.focus = null; setTimeout(() => bmkIn.focus(), 0); }
    return h("tr", { class: "edit-row" },
      h("td", null, opIn), h("td", { class: "muted" }, "–"), h("td", null, bmkIn), h("td", null, fnIn),
      h("td", { class: "edit-only" }, h("button", { type: "button", class: "icon-btn", title: "Zeile löschen", "aria-label": `Zeile ${r.op} löschen`,
        onClick: () => { io().splice(io().indexOf(r), 1); Profile.changed("io"); } }, "✕")));
  }

  function renderIo() {
    const body = $("#ioBody");
    body.textContent = "";
    const edit = ioState.edit;
    $("#pane-io").classList.toggle("is-edit", edit);
    $("#btnIoEdit").textContent = edit ? "✓ Fertig" : "✎ Bearbeiten";
    $("#btnIoEdit").setAttribute("aria-pressed", String(edit));
    $("#ioEditTools").hidden = !edit;
    $("#ioViewNote").hidden = edit;
    $("#bmkList").replaceChildren(...COMPONENTS.flatMap((c) => c.bmk).map((b) => h("option", { value: b })));
    const q = norm(ioState.query);
    [["in", "Eingänge"], ["out", "Ausgänge"]].forEach(([kind, label]) => {
      if (ioState.filter !== "all" && ioState.filter !== kind) return;
      const rows = io().filter((r) => r.k === kind && (edit || !q || norm(`${r.op} ${r.bmk} ${r.fn}`).includes(q)));
      if (!rows.length && !edit) return;
      body.append(h("tr", { class: "group" }, h("td", { colspan: 5 }, label)));
      rows.forEach((r) => body.append(edit ? editRow(r) : viewRow(r)));
      if (edit) body.append(h("tr", { class: "add-row" }, h("td", { colspan: 5 },
        h("button", { type: "button", class: "btn", onClick: () => {
          const r = { k: kind, op: nextOp(kind), bmk: "", fn: "" }; io().push(r); ioState.focus = r; Profile.changed("io");
        } }, `+ ${kind === "in" ? "Eingang" : "Ausgang"} hinzufügen`))));
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
  $("#btnIoEdit").addEventListener("click", () => { ioState.edit = !ioState.edit; renderIo(); });
  $("#btnIoReset").addEventListener("click", () => {
    if (confirm("Die E/A-Liste auf die Standardwerte zurücksetzen? Eigene Änderungen gehen verloren.")) Profile.reset("io");
  });

  $("#btnCsv").addEventListener("click", () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      esc(BRAND.csvHeader),
      esc("Zuordnungsliste der Ein- und Ausgänge – Stand " + new Date().toLocaleDateString("de-DE")),
      "",
      ["Operand", "Eigener Operand", "BMK", "Funktion"].map(esc).join(";"),
    ];
    io().forEach((r) => lines.push([r.op, operands[r.op] || "", r.bmk, r.fn].map(esc).join(";")));
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "zuordnungsliste.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- Prüfungsprofil (Menü: Name, Export, Import, Zurücksetzen) ---------- */
  const dlg = $("#profileDlg");
  function openProfile() {
    $("#profName").value = Profile.state.name;
    $("#profMsg").textContent = "";
    dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
  }
  $("#btnProfile").addEventListener("click", openProfile);
  $("#profClose").addEventListener("click", () => (dlg.close ? dlg.close() : dlg.removeAttribute("open")));
  $("#profName").addEventListener("input", (e) => { Profile.state.name = e.target.value.slice(0, 120); Profile.save(); showProfileName(); });
  function showProfileName() { const n = Profile.state.name.trim(); $("#phMeta").textContent = [BRAND.docMeta, n].filter(Boolean).join(" · "); }
  $("#profExport").addEventListener("click", () => {
    const name = (Profile.state.name || "profil").replace(/[^\w\-äöüÄÖÜß]+/g, "_");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([Profile.exportData()], { type: "application/json" }));
    a.download = `pruefungsprofil-${name}.json`; a.click(); URL.revokeObjectURL(a.href);
    $("#profMsg").textContent = "Profil exportiert.";
  });
  $("#profImport").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try { Profile.importData(await f.text()); $("#profName").value = Profile.state.name; $("#profMsg").textContent = "Profil geladen."; }
    catch (err) { $("#profMsg").textContent = err.message; }
  });
  $("#profReset").addEventListener("click", () => {
    if (confirm("Alle Anpassungen (E/A-Liste, Umrüstung, Bauteilauswahl) auf die Standardwerte zurücksetzen?")) { Profile.reset(); $("#profName").value = ""; $("#profMsg").textContent = "Zurückgesetzt."; }
  });
  Profile.on((what) => {
    if (what === "io") renderIo();
    else if (what === "off" || what === "all") refreshOff();
    if (what === "all") { showProfileName(); }
  });

  /* ---------- Schnittstelle für protocol.js, rework.js, qrview.js ---------- */
  function applyHash() {
    const m = location.hash.match(/^#\/bauteil\/(.+)$/);
    if (!m) return;
    const key = decodeURIComponent(m[1]).toLowerCase();
    const comp = COMPONENTS.find((c) => c.id.toLowerCase() === key || c.bmk.some((b) => b.toLowerCase() === key));
    if (!comp) return;
    go(isDesktop() ? "3d" : "list");
    selectMany([comp]);
  }
  window.addEventListener("hashchange", applyHash);

  window.Twin = {
    stats, components: COMPONENTS, modelUrl: currentModel,
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
  refreshOff();
  showProfileName();
  go("3d");
  applyHash();
})();
