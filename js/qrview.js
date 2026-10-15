/* ==========================================================
 * qrview.js – QR-Etiketten für Bauteile (Modul Arbeit 4.0)
 * Jeder Code öffnet die Seite direkt beim passenden Bauteil.
 * Die Basisadresse muss vom Smartphone erreichbar sein.
 * ========================================================== */
(() => {
  "use strict";
  const root = document.getElementById("pane-qr");
  const KEY = "schaltschrank.qr.basis";
  const defaultBase = () => (location.protocol === "file:" ? "" : location.origin + location.pathname);
  let base = store.get(KEY, "") || defaultBase();

  const clean = (u) => u.trim().replace(/#.*$/, "");
  const reachable = (u) => !/^(https?:\/\/)?(localhost|127\.|\[::1\])/i.test(u);
  const urlFor = (c) => `${clean(base)}#/bauteil/${c.id}`;

  const card = (title, bmks, url) => {
    let code;
    try { code = h("div", { class: "qr-code", innerHTML: QR.svg(url, { border: 2 }) }); }
    catch (e) { code = h("p", { class: "note bad" }, e.message); }
    return h("figure", { class: "qr-card" }, code,
      h("figcaption", null, h("strong", null, title), h("span", { class: "qr-bmk" }, bmks.map((b) => h("span", { class: "bmk" }, b))), h("small", null, url)));
  };

  function render() {
    const warn = h("p", { class: "note bad noprint", hidden: !base || reachable(base) },
      "Diese Adresse ist nur auf diesem Rechner erreichbar (localhost). Tragen Sie die Adresse ein, unter der die Seite im Netzwerk erreichbar ist, zum Beispiel die IP-Adresse des Rechners oder den Namen des Webservers.");
    const empty = !base;
    const input = h("input", { type: "url", class: "search", value: base, placeholder: "https://… Adresse, unter der die Seite erreichbar ist",
      "aria-label": "Basisadresse der Seite",
      onChange: (e) => { base = clean(e.target.value); store.set(KEY, base); render(); } });

    const head = h("div", { class: "page-head" }, h("h2", null, "QR-Etiketten für Bauteile"),
      h("p", { class: "note noprint" }, "Jeder QR-Code öffnet die Seite direkt beim passenden Bauteil, mit Beschreibung und Markierung im 3D-Modell. Etiketten ausdrucken und am Schaltschrank oder am Bauteil anbringen."),
      h("label", { class: "pf noprint" }, h("span", null, "Basisadresse der Seite"), input), warn,
      h("div", { class: "page-tools noprint" }, h("button", { class: "btn primary", type: "button", disabled: empty, onClick: () => window.print() }, "⎙ Etiketten drucken / PDF")));

    if (empty) return root.replaceChildren(head, h("p", { class: "note" }, "Die Seite wurde direkt aus einer Datei geöffnet. Starten Sie sie über einen Webserver oder tragen Sie oben die Zieladresse ein."));

    const grid = h("div", { class: "qr-grid" },
      card("Startseite", [], clean(base)),
      ...Twin.components.map((c) => card(c.title, c.bmk, urlFor(c))));
    root.replaceChildren(head, grid);
  }

  window.addEventListener("viewchange", (e) => { if (e.detail === "qr") render(); });
  render();
})();
