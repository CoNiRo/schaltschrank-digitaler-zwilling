#!/usr/bin/env python3
"""Erzeugt die Zoom-Tabelle (Mittelpunkt + Radius je Bauteil) aus einer GLB-Datei.

Aufruf:  python3 tools/make_focus.py assets/demo-schaltschrank.glb js/focus.js
         python3 tools/make_focus.py assets/local/schaltschrank.glb js/focus.local.js

Schluessel ist der Materialname vor einem '|' (= Betriebsmittelkennzeichen).
Materialien, deren Name mit '_' beginnt (Leitungen), werden ignoriert.
Nur Python 3 + numpy noetig.
"""
import json, struct, sys
import numpy as np

def load(p):
    d = open(p, 'rb').read()
    jl, _ = struct.unpack('<II', d[12:20])
    return json.loads(d[20:20 + jl])

def local(n):
    if 'matrix' in n:
        return np.array(n['matrix']).reshape(4, 4).T
    T = np.eye(4); R = np.eye(4); S = np.eye(4)
    if 'translation' in n: T[:3, 3] = n['translation']
    if 'scale' in n: S = np.diag(list(n['scale']) + [1])
    if 'rotation' in n:
        x, y, z, w = n['rotation']
        R[:3, :3] = [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]
    return T @ R @ S

def main(src, dst):
    js = load(src); acc = js['accessors']; res = {}
    def walk(i, M):
        n = js['nodes'][i]; M = M @ local(n)
        if 'mesh' in n:
            for p in js['meshes'][n['mesh']]['primitives']:
                if 'material' not in p: continue
                name = js['materials'][p['material']].get('name', '')
                if not name or name.startswith('_'): continue
                key = name.split('|')[0]
                a = acc[p['attributes']['POSITION']]
                mn, mx = a['min'], a['max']
                c = np.array([[x, y, z, 1] for x in (mn[0], mx[0]) for y in (mn[1], mx[1]) for z in (mn[2], mx[2])])
                w = (M @ c.T).T[:, :3]
                lo, hi = res.get(key, (np.full(3, 1e18), np.full(3, -1e18)))
                res[key] = (np.minimum(lo, w.min(0)), np.maximum(hi, w.max(0)))
        for c in n.get('children', []): walk(c, M)
    for s in js['scenes'][0]['nodes']: walk(s, np.eye(4))
    allo = np.min([v[0] for v in res.values()], 0); allhi = np.max([v[1] for v in res.values()], 0)
    out = {k: [round(float(x), 4) for x in list((lo + hi) / 2) + [np.linalg.norm(hi - lo) / 2]]
           for k, (lo, hi) in sorted(res.items())}
    with open(dst, 'w', encoding='utf-8') as f:
        f.write('/* automatisch erzeugt von tools/make_focus.py – Mittelpunkt [x,y,z] (m) und Radius je Bauteil */\n')
        f.write('window.FOCUS = ' + json.dumps({"center": [round(float(x), 4) for x in (allo + allhi) / 2],
                                                  "size": round(float(np.linalg.norm(allhi - allo)), 4),
                                                  "parts": out}, ensure_ascii=False) + ';\n')
    print(len(out), 'Bauteile ->', dst)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
