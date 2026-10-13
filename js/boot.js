/* ==========================================================
 * boot.js – lädt alle Skripte in fester Reihenfolge.
 * Existiert js/config.local.js bzw. js/data.local.js, haben diese
 * Dateien Vorrang vor js/config.js und js/data.js. Die *.local-Dateien
 * stehen in der .gitignore und gelangen nicht ins Repository.
 * ========================================================== */
(() => {
  const load = (src) => new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve(true);
    s.onerror = () => { s.remove(); resolve(false); };   // fehlende Datei ist kein Fehler
    document.head.appendChild(s);
  });

  (async () => {
    await load("js/util.js");
    if (!(await load("js/config.local.js"))) await load("js/config.js");
    if (!(await load("js/data.local.js"))) await load("js/data.js");
    for (const f of ["js/app.js", "js/protocol.js", "js/rework.js", "js/grafcet.js"]) await load(f);
  })();
})();
