"""Baja de OpenStreetMap los caminos de yacimiento de los cuadros con pozos de otras provincias."""
import json, os, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preparar_datos as p

URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter"]


def pedir(q):
    for intento in range(3):
        for url in URLS:
            t = time.time()
            try:
                req = urllib.request.Request(url, urllib.parse.urlencode({"data": q}).encode(), {"User-Agent": "PicadaGPS/1.0"})
                with urllib.request.urlopen(req, timeout=150) as r:
                    d = json.loads(r.read())
                print(f"   {url.split('/')[2]}: {len(d.get('elements', []))} caminos en {time.time()-t:.0f} s")
                return d
            except Exception as e:
                print(f"   {url.split('/')[2]}: {e} ({time.time()-t:.0f} s)")
        time.sleep(15)
    return None


zonas = p.zonas_otras_provincias()
print(f"{len(zonas)} cuadros")
elementos, vistos = [], set()
for (w, s, e, n) in zonas:
    print(f"cuadro {w},{s}")
    q = f"""[out:json][timeout:120];
(
  way["highway"="unclassified"]({s},{w},{n},{e});
  way["highway"="track"]["tracktype"!~"grade4|grade5"]({s},{w},{n},{e});
  way["highway"="service"]["service"!~"driveway|parking_aisle|drive-through"]({s},{w},{n},{e});
);
out geom tags;"""
    d = pedir(q)
    for el in (d or {}).get("elements", []):
        if el.get("id") not in vistos:
            vistos.add(el["id"])
            elementos.append({"id": el["id"], "tags": el.get("tags", {}), "geometry": el.get("geometry", [])})
print(f"total {len(elementos)}")
if elementos:
    with open(os.path.join(p.FUENTE, "caminos-otras-provincias.json"), "w") as f:
        json.dump({"elements": elementos}, f, separators=(",", ":"))
