/* util.js – kleine Hilfsfunktionen für alle Ansichten */

// DOM-Elemente bauen: h("div", {class: "x", onClick: fn}, "Text", kind, …)
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  kids.flat().forEach((c) => {
    if (c == null || c === false) return;
    el.append(c.nodeType ? c : document.createTextNode(c));
  });
  return el;
}

// localStorage mit Absicherung (Privatmodus / blockierter Speicher)
const store = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignorieren */ }
  },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignorieren */ } },
};

// BMK im Text (z. B. "-QA5") als klickbaren Chip darstellen, wenn es ein Bauteil im Modell gibt
function bmkText(text) {
  const frag = document.createDocumentFragment();
  String(text).split(/(-[A-Z]{2,3}\d+)/).forEach((part) => {
    if (/^-[A-Z]{2,3}\d+$/.test(part)) {
      const comp = window.Twin && window.Twin.componentByBmk(part);
      frag.append(comp
        ? h("button", { type: "button", class: "bmk bmk-link", title: `Im 3D-Modell zeigen: ${comp.title}`,
                        onClick: () => window.Twin.reveal([comp]) }, part)
        : h("span", { class: "bmk" }, part));
    } else if (part) frag.append(part);
  });
  return frag;
}
