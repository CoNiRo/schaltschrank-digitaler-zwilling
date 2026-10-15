/* ==========================================================
 * glb-inspect.js – liest die Struktur einer GLB-Datei
 * Es wird nur der JSON-Teil am Dateianfang gelesen (per Range-Request,
 * falls der Server das kann), nicht das ganze Modell.
 * Namen mit Unterstrich am Anfang (z. B. "_Gehaeuse") gelten als bewusst
 * nicht anklickbar und werden nicht als "ohne BMK" gemeldet.
 * ========================================================== */
const GLBInspect = (() => {
  const BMK = /^-[A-Z]{1,5}\d*$/;                     // Betriebsmittelkennzeichen, z. B. -QA2, -XDPE

  async function load(url) {
    const r1 = await fetch(url, { headers: { Range: "bytes=0-19" } });
    if (!r1.ok) throw new Error(`Datei nicht lesbar (HTTP ${r1.status})`);
    let head, full = null;
    if (r1.status === 206) head = new DataView(await r1.arrayBuffer());
    else { full = await r1.arrayBuffer(); head = new DataView(full); }   // Server ohne Range: ganze Datei
    if (head.getUint32(0, true) !== 0x46546c67) throw new Error("Keine gültige GLB-Datei");
    const total = head.getUint32(8, true);
    const jsonLen = head.getUint32(12, true);
    let bytes;
    if (full) bytes = new Uint8Array(full, 20, jsonLen);
    else {
      const r2 = await fetch(url, { headers: { Range: `bytes=20-${19 + jsonLen}` } });
      bytes = new Uint8Array(await r2.arrayBuffer());
    }
    return { total, json: JSON.parse(new TextDecoder().decode(bytes)) };
  }

  function analyze({ total, json }) {
    const nodes = json.nodes || [], meshes = json.meshes || [], mats = json.materials || [], acc = json.accessors || [];
    const sceneRoots = (json.scenes && json.scenes[json.scene || 0] && json.scenes[json.scene || 0].nodes) || [];

    // Dreiecke und Punkte je Mesh
    const meshStats = meshes.map((m) => {
      let tris = 0, verts = 0;
      (m.primitives || []).forEach((p) => {
        const pos = acc[p.attributes && p.attributes.POSITION];
        const cnt = pos ? pos.count : 0;
        verts += cnt;
        const mode = p.mode === undefined ? 4 : p.mode;
        const n = p.indices !== undefined ? acc[p.indices].count : cnt;
        if (mode === 4) tris += Math.floor(n / 3);
      });
      return { tris, verts };
    });

    // Baum durchlaufen: Teile und Dreiecke je Unterbaum
    const sub = (i) => {
      const n = nodes[i];
      let parts = 0, tris = 0;
      if (n.mesh !== undefined) { parts++; tris += meshStats[n.mesh] ? meshStats[n.mesh].tris : 0; }
      (n.children || []).forEach((c) => { const r = sub(c); parts += r.parts; tris += r.tris; });
      return { parts, tris };
    };

    const bmkNodes = {};                                // BMK -> { nodes, parts, tris }
    const visit = (i) => {
      const n = nodes[i], name = (n.name || "").trim();
      if (BMK.test(name)) {
        const r = sub(i);
        const e = bmkNodes[name] || (bmkNodes[name] = { nodes: 0, parts: 0, tris: 0 });
        e.nodes++; e.parts += r.parts; e.tris += r.tris;
        return;                                          // Unterbaum gehört zu diesem BMK
      }
      (n.children || []).forEach(visit);
    };
    sceneRoots.forEach(visit);

    // oberste Knoten ohne BMK (und ohne BMK darunter) = Teile ohne Kennzeichnung
    const hasBmkBelow = (i) => {
      const n = nodes[i];
      if (BMK.test((n.name || "").trim())) return true;
      return (n.children || []).some(hasBmkBelow);
    };
    const unnamed = sceneRoots
      .filter((i) => { const nm = (nodes[i].name || "").trim(); return !BMK.test(nm) && !nm.startsWith("_") && !hasBmkBelow(i); })
      .map((i) => ({ name: nodes[i].name || `(Knoten ${i})`, ...sub(i) }))
      .filter((u) => u.parts > 0);

    const matNames = {};
    mats.forEach((m) => { const k = (m.name || "").trim(); matNames[k] = (matNames[k] || 0) + 1; });
    const bmkMaterials = Object.keys(matNames).filter((k) => BMK.test(k));

    let tris = 0, verts = 0, instances = 0;
    nodes.forEach((n) => { if (n.mesh !== undefined && meshStats[n.mesh]) { tris += meshStats[n.mesh].tris; verts += meshStats[n.mesh].verts; instances++; } });

    const ext = json.extensionsUsed || [];
    return {
      bytes: total, generator: (json.asset && json.asset.generator) || "", version: (json.asset && json.asset.version) || "",
      nodes: nodes.length, meshes: meshes.length, instances, materials: mats.length,
      uniqueMaterialNames: Object.keys(matNames).length, textures: (json.textures || []).length, images: (json.images || []).length,
      triangles: tris, vertices: verts, extensions: ext,
      compressed: ext.some((e) => /draco|meshopt|quantization/i.test(e)),
      bmkNodes, bmkMaterials, materialNames: matNames, unnamed,
    };
  }

  const inspect = async (url) => analyze(await load(url));
  return { inspect, BMK };
})();
