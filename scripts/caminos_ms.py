"""Caminos detectados por satélite (Microsoft Road Detections, licencia ODbL) que NO están en OpenStreetMap.

Baja el archivo de Sudamérica, se queda con los caminos de Argentina que tocan las áreas de concesión
(datos/areas.geojson), les quita los tramos que ya están en datos/caminos.geojson o datos/rutas.geojson
(a menos de ~30 m) y guarda lo que queda en datos/caminos_ms.geojson.
Por ahora lo ve solo el administrador: son caminos sin confirmar (pueden ser huellas viejas o cortafuegos).

Uso: python3 scripts/caminos_ms.py  (necesita shapely; el archivo pesa ~1,2 GB, se corre en GitHub Actions)
"""
import io, json, os, sys, time, urllib.request, zipfile
from shapely.geometry import shape, mapping, LineString, MultiLineString
from shapely.strtree import STRtree
from shapely.ops import unary_union
from shapely.prepared import prep

URL = "https://usaminedroads.z19.web.core.windows.net/drops/2025.04.28/South_America.zip"
RAIZ = os.path.join(os.path.dirname(__file__), "..")
D = os.path.join(RAIZ, "datos")
ZIP = os.environ.get("MS_ZIP", "/tmp/South_America.zip")
CERCA = 0.0003        # ~30 m: un tramo a menos de esto de un camino de OSM ya está cargado
MIN_LARGO = 0.0015    # ~150 m: tramos sueltos más cortos no aportan
SIMPLIFICAR = 0.00012 # ~12 m

def lineas(fc):
    for f in fc["features"]:
        g = f.get("geometry")
        if not g: continue
        s = shape(g)
        for p in (s.geoms if hasattr(s, "geoms") else [s]):
            if p.geom_type == "LineString" and len(p.coords) > 1: yield p

def main():
    t0 = time.time()
    if not os.path.exists(ZIP):
        print("Bajando", URL, flush=True)
        urllib.request.urlretrieve(URL, ZIP)
    print(f"Zip: {os.path.getsize(ZIP)/1e6:.0f} MB", flush=True)

    areas = json.load(open(os.path.join(D, "areas.geojson")))
    zona = unary_union([shape(f["geometry"]).buffer(0) for f in areas["features"] if f.get("geometry")]).buffer(0.02)
    zprep = prep(zona)
    xmin, ymin, xmax, ymax = zona.bounds

    osm = list(lineas(json.load(open(os.path.join(D, "caminos.geojson"))))) + list(lineas(json.load(open(os.path.join(D, "rutas.geojson")))))
    arbol = STRtree(osm)
    print(f"Líneas OSM/rutas: {len(osm)}", flush=True)

    salida, leidos, arg, en_zona, km = [], 0, 0, 0, 0.0
    with zipfile.ZipFile(ZIP) as z:
        for nombre in z.namelist():
            print("Leyendo", nombre, flush=True)
            with z.open(nombre) as fh:
                for linea in io.TextIOWrapper(fh, encoding="utf-8"):
                    leidos += 1
                    if not linea.startswith("ARG"): continue
                    arg += 1
                    try: g = json.loads(linea.split("\t", 1)[1])
                    except Exception: continue
                    geom = g.get("geometry", g)
                    c = geom.get("coordinates") or []
                    if not c: continue
                    pts = c if geom["type"] == "LineString" else [p for parte in c for p in parte]
                    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                    if max(xs) < xmin or min(xs) > xmax or max(ys) < ymin or min(ys) > ymax: continue
                    s = shape(geom)
                    if not zprep.intersects(s): continue
                    en_zona += 1
                    cerca = [osm[i] for i in arbol.query(s.buffer(CERCA))]
                    resto = s.difference(unary_union([l.buffer(CERCA) for l in cerca])) if cerca else s
                    for p in (resto.geoms if hasattr(resto, "geoms") else [resto]):
                        if p.geom_type != "LineString" or p.length < MIN_LARGO: continue
                        p = p.simplify(SIMPLIFICAR)
                        coords = [[round(x, 5), round(y, 5)] for x, y in p.coords]
                        salida.append({"type": "Feature", "properties": {"tipo": "Detectado"}, "geometry": {"type": "LineString", "coordinates": coords}})
                        km += p.length * 100
                    if en_zona % 20000 == 0: print(f"  {en_zona} en zona, {len(salida)} tramos nuevos", flush=True)
    print(f"Filas: {leidos}, Argentina: {arg}, en zona: {en_zona}, tramos nuevos: {len(salida)} (~{km:.0f} km)", flush=True)
    with open(os.path.join(D, "caminos_ms.geojson"), "w") as f:
        json.dump({"type": "FeatureCollection", "fuente": "Microsoft Road Detections 2025-04-28 (ODbL)", "features": salida}, f, separators=(",", ":"))
    print(f"Listo en {time.time()-t0:.0f} s, {os.path.getsize(os.path.join(D, 'caminos_ms.geojson'))/1e6:.1f} MB")

if __name__ == "__main__":
    main()
