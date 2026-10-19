/* ==========================================================
 * profile.js – Prüfungsprofil
 *
 * Alles, was sich von Prüfung zu Prüfung ändert, liegt in einem
 * Profil und wird im Browser gespeichert:
 *   - E/A-Zuordnungsliste (Operand, BMK, Funktion)
 *   - Umrüstungsplan (Texte, Schritte, Sollverhalten, Hinweise)
 *   - welche Bauteile im Schaltschrank verbaut sind
 *
 * Die Startwerte kommen aus data.js (bzw. data.local.js). Änderungen
 * lassen sich als Datei (JSON) exportieren und wieder importieren.
 * ========================================================== */
const Profile = (() => {
  "use strict";
  const KEY = "schaltschrank.profil";
  const FORMAT = "schaltschrank-profil";
  const listeners = new Set();
  let seq = 0;
  const uid = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;
  const str = (v, max = 4000) => String(v ?? "").slice(0, max);
  const strList = (a, max = 200) => (Array.isArray(a) ? a.map((x) => str(x)).slice(0, max) : []);

  const defaults = () => ({
    format: FORMAT, version: 1, name: "",
    io: [
      ...IO_INPUTS.map((r) => ({ k: "in", op: r[0], bmk: r[1], fn: r[2] })),
      ...IO_OUTPUTS.map((r) => ({ k: "out", op: r[0], bmk: r[1], fn: r[2] })),
    ],
    off: [],            // IDs der Bauteile, die nicht verbaut sind
    mode: "grey",       // "grey" = grau, "hide" = ausblenden
    rework: {
      title: REWORK_META.title, intro: REWORK_META.intro,
      targetTitle: REWORK_META.targetTitle, stepsTitle: REWORK_META.stepsTitle, hintsTitle: REWORK_META.hintsTitle,
      steps: REWORK_STEPS.map((s) => ({
        id: uid(), title: s.title || "", text: s.text || "", bullets: [...(s.bullets || [])],
        show: [...(s.show || [])], go: s.go && ["io", "protocol", "qr"].includes(s.go[0]) ? [...s.go] : null,
      })),
      target: REWORK_TARGET.map((r) => [...r]),
      hints: [...REWORK_HINTS],
    },
  });

  // Fremde oder beschädigte Daten in ein gültiges Profil umwandeln
  function sanitize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== "object") return d;
    const out = { format: FORMAT, version: 1, name: str(raw.name, 120) };
    out.io = Array.isArray(raw.io)
      ? raw.io.slice(0, 500).map((r) => ({ k: r && r.k === "out" ? "out" : "in", op: str(r && r.op, 20), bmk: str(r && r.bmk, 40), fn: str(r && r.fn, 300) }))
      : d.io;
    const ids = new Set(COMPONENTS.map((c) => c.id));
    out.off = Array.isArray(raw.off) ? raw.off.filter((id) => ids.has(id)) : [];
    out.mode = raw.mode === "hide" ? "hide" : "grey";
    const rw = raw.rework && typeof raw.rework === "object" ? raw.rework : null;
    if (!rw) out.rework = d.rework;
    else {
      out.rework = {
        title: str(rw.title, 200), intro: str(rw.intro), targetTitle: str(rw.targetTitle, 200),
        stepsTitle: str(rw.stepsTitle, 200), hintsTitle: str(rw.hintsTitle, 200),
        steps: (Array.isArray(rw.steps) ? rw.steps : []).slice(0, 200).map((s) => ({
          id: typeof s.id === "string" && s.id ? str(s.id, 40) : uid(),
          title: str(s.title, 300), text: str(s.text), bullets: strList(s.bullets),
          show: strList(s.show).filter((id) => ids.has(id)),
          go: Array.isArray(s.go) && ["io", "protocol", "qr"].includes(s.go[0]) ? [str(s.go[0], 20), str(s.go[1], 80)] : null,
        })),
        target: (Array.isArray(rw.target) ? rw.target : []).slice(0, 200).map((r) => [0, 1, 2].map((i) => str(Array.isArray(r) ? r[i] : "", 400))),
        hints: strList(rw.hints),
      };
    }
    return out;
  }

  let state;
  try { state = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { state = defaults(); }

  const emit = (what) => listeners.forEach((fn) => { try { fn(what); } catch (e) { console.error(e); } });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* blockiert */ } }

  return {
    get state() { return state; },
    defaults, uid,
    save,
    changed(what) { save(); emit(what); },                     // nach Änderung an state aufrufen
    on(fn) { listeners.add(fn); },
    reset(section) {                                           // "io" | "rework" | "off" | undefined = alles
      const d = defaults();
      if (!section) state = d;
      else if (section === "off") { state.off = []; state.mode = "grey"; }
      else state[section] = d[section];
      save(); emit(section || "all");
    },
    exportData() { return JSON.stringify(Object.assign({}, state, { exportiert: new Date().toISOString() }), null, 2); },
    importData(text) {                                         // wirft bei ungültiger Datei
      let raw;
      try { raw = JSON.parse(text); } catch { throw new Error("Die Datei ist keine gültige JSON-Datei."); }
      if (!raw || raw.format !== FORMAT) throw new Error("Das ist keine Profildatei dieser Seite.");
      state = sanitize(raw); save(); emit("all");
    },
    isOff: (comp) => !!comp && state.off.includes(comp.id),
  };
})();
