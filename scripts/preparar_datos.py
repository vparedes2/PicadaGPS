"""
Prepara los datos que la app guarda en el celular (public/datos/).

  pozos.json          padrón de pozos de Neuquén (Capítulo IV, Secretaría de Energía de la Nación)
  instalaciones.json  baterías, plantas y compresoras (SIG Hidrocarburos de Neuquén)
  areas.geojson       límites de las áreas de concesión (SIG Hidrocarburos de Neuquén)
  rutas.geojson       rutas nacionales y provinciales (IGN; si no responde, OpenStreetMap)
  caminos.geojson     caminos de yacimiento y huellas principales (OpenStreetMap, cargados por voluntarios)
  meta.json           fechas de cada fuente

Cada fuente remota se guarda en data/fuente/ como respaldo: si una descarga falla,
se usa la última copia buena y la app sigue funcionando.

Uso:  python3 scripts/preparar_datos.py            (descarga y regenera)
      python3 scripts/preparar_datos.py --local    (solo usa data/fuente/)
"""
import csv, json, math, os, sys, urllib.parse, urllib.request
from datetime import datetime, timezone

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, "data", "fuente")
SALIDA = os.path.join(RAIZ, "public", "datos")
LOCAL = "--local" in sys.argv
# El monitor ambiental ya consulta el GeoServer provincial y expone sus capas limpias
MONITOR = os.environ.get("MONITOR_URL", "https://monitorambiental.victorparedes.ar")
BBOX = (-71.2, -41.2, -67.8, -36.0)  # oeste, sur, este, norte: Neuquén con margen
UA = {"User-Agent": "PicadaGPS (datos publicos)"}


def descargar(url, timeout=180, datos=None):
    req = urllib.request.Request(url, data=datos, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def con_respaldo(nombre, obtener):
    """Intenta descargar; si falla usa la copia de data/fuente/nombre. Devuelve (datos, fecha, origen)."""
    ruta = os.path.join(FUENTE, nombre)
    if not LOCAL:
        try:
            d = obtener()
            with open(ruta, "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False)
            return d, datetime.now(timezone.utc).date().isoformat(), "descargado"
        except Exception as e:
            print(f"  ! {nombre}: no se pudo descargar ({e}); uso la copia guardada")
    if not os.path.exists(ruta):
        return None, None, "sin datos"
    fecha = datetime.fromtimestamp(os.path.getmtime(ruta), timezone.utc).date().isoformat()
    with open(ruta, encoding="utf-8") as f:
        return json.load(f), fecha, "copia guardada"


# ---------------------------------------------------------------- geometría
def simplificar(pts, tol_m=25.0):
    """Douglas-Peucker en metros aproximados (suficiente para escala provincial)."""
    if len(pts) < 3:
        return pts
    if pts[0][0] == pts[-1][0] and pts[0][1] == pts[-1][1] and len(pts) > 4:
        # Anillo cerrado: se parte en el punto más lejano al inicio y se simplifica cada mitad
        lejos = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
        return simplificar(pts[: lejos + 1], tol_m)[:-1] + simplificar(pts[lejos:], tol_m)
    lat0 = math.radians(pts[0][1])
    kx, ky = 111320 * math.cos(lat0), 110540
    xy = [(p[0] * kx, p[1] * ky) for p in pts]
    marca = [False] * len(pts)
    marca[0] = marca[-1] = True
    pila = [(0, len(pts) - 1)]
    while pila:
        a, b = pila.pop()
        ax, ay = xy[a]; bx, by = xy[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-9
        peor, im = 0.0, -1
        for i in range(a + 1, b):
            d = abs(dy * (xy[i][0] - ax) - dx * (xy[i][1] - ay)) / L
            if d > peor:
                peor, im = d, i
        if peor > tol_m:
            marca[im] = True
            pila += [(a, im), (im, b)]
    return [[round(p[0], 5), round(p[1], 5)] for p, m in zip(pts, marca) if m]


def lineas(geom):
    if not geom:
        return []
    if geom["type"] == "LineString":
        return [geom["coordinates"]]
    if geom["type"] == "MultiLineString":
        return geom["coordinates"]
    return []


# ---------------------------------------------------------------- pozos
def preparar_pozos():
    ruta = os.path.join(FUENTE, "pozos-capitulo-iv.csv")
    dic = {k: [] for k in ("area", "empresa", "yacimiento", "tipo", "estado", "recurso", "extraccion")}
    pos = {k: {} for k in dic}

    def cod(k, v):
        v = (v or "").strip() or "Sin dato"
        if v not in pos[k]:
            pos[k][v] = len(dic[k]); dic[k].append(v)
        return pos[k][v]

    filas = []
    with open(ruta, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try:
                lon, lat = json.loads(r["geojson"])["coordinates"][:2]
            except Exception:
                continue
            if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
                continue
            filas.append([
                r["sigla"].strip(), cod("area", r["area"]), cod("empresa", r["empresa"]), cod("yacimiento", r["yacimiento"]),
                cod("tipo", r["tipopozo"]), cod("estado", r["tipoestado"]), cod("recurso", r["tipo_recurso"]),
                cod("extraccion", r["tipoextraccion"]), round(lat, 6), round(lon, 6),
                int(r["idpozo"]) if r["idpozo"].isdigit() else None, (r["adjiv_fecha_inicio_perf"] or "")[:10] or None,
            ])
    fecha = datetime.fromtimestamp(os.path.getmtime(ruta), timezone.utc).date().isoformat()
    return {"campos": ["sigla", "area", "empresa", "yacimiento", "tipo", "estado", "recurso", "extraccion", "lat", "lon", "idpozo", "inicio_perf"],
            "dic": dic, "filas": filas}, fecha


# ---------------------------------------------------------------- capas provinciales
def capa_monitor(nombre):
    return lambda: json.loads(descargar(f"{MONITOR}/api/neuquen/capa/{nombre}"))


def preparar_instalaciones(fc):
    out = []
    for f in (fc or {}).get("features", []):
        g, p = f.get("geometry"), f["properties"]
        if not g or g["type"] != "Point":
            continue
        lon, lat = g["coordinates"][:2]
        out.append([p.get("nombre") or p.get("sigla") or "Instalación", p.get("tipo") or "", p.get("area") or "",
                    p.get("operador") or "", round(lat, 6), round(lon, 6)])
    return {"campos": ["nombre", "tipo", "area", "operador", "lat", "lon"], "filas": out}


def preparar_areas(fc):
    feats = []
    for f in (fc or {}).get("features", []):
        g = f.get("geometry")
        if not g:
            continue
        p = f["properties"]
        nombre = p.get("nombre") or p.get("area") or p.get("AREA") or ""
        operador = p.get("operador") or p.get("OPERADOR") or ""
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"] if g["type"] == "MultiPolygon" else []
        nuevos = [[simplificar(anillo, 40) for anillo in pol] for pol in polys]
        nuevos = [[a for a in pol if len(a) >= 4] for pol in nuevos]
        nuevos = [pol for pol in nuevos if pol]
        if nuevos:
            feats.append({"type": "Feature", "properties": {"nombre": nombre, "operador": operador},
                          "geometry": {"type": "MultiPolygon", "coordinates": nuevos}})
    return {"type": "FeatureCollection", "features": feats}


# ---------------------------------------------------------------- rutas
IGN = "https://wms.ign.gob.ar/geoserver/ows"


def rutas_ign():
    cap = descargar(f"{IGN}?service=WFS&version=1.1.0&request=GetCapabilities", 90).decode("utf-8", "ignore")
    import re
    nombres = sorted(set(re.findall(r"<Name>(ign:[^<]*vial[^<]*)</Name>", cap)))
    elegidas = [n for n in nombres if re.search(r"nacional|provincial", n)] or nombres
    if not elegidas:
        raise RuntimeError("el IGN no publica capas viales con ese nombre")
    feats = []
    for capa in elegidas:
        q = urllib.parse.urlencode({"service": "WFS", "version": "1.1.0", "request": "GetFeature", "typeName": capa,
                                    "outputFormat": "application/json", "srsName": "EPSG:4326",
                                    "bbox": f"{BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]},EPSG:4326"})
        fc = json.loads(descargar(f"{IGN}?{q}", 240))
        jur = "Nacional" if "nacional" in capa else "Provincial" if "provincial" in capa else ""
        for f in fc.get("features", []):
            p = {k.lower(): v for k, v in (f.get("properties") or {}).items()}
            nombre = p.get("fna") or p.get("nam") or p.get("gna") or p.get("nombre") or ""
            num = p.get("rtn") or p.get("rta") or p.get("ruta") or ""
            if not nombre and num:
                nombre = f"Ruta {jur} {num}".replace("  ", " ")
            for l in lineas(f.get("geometry")):
                feats.append({"type": "Feature", "properties": {"nombre": str(nombre).strip() or "Ruta sin nombre", "fuente": "IGN"},
                              "geometry": {"type": "LineString", "coordinates": l}})
    if len(feats) < 20:
        raise RuntimeError(f"el IGN devolvió pocas rutas ({len(feats)})")
    return {"type": "FeatureCollection", "features": feats, "fuente": "IGN, " + ", ".join(elegidas)}


def rutas_osm():
    q = f"""[out:json][timeout:240];
way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"]({BBOX[1]},{BBOX[0]},{BBOX[3]},{BBOX[2]});
out geom tags;"""
    d = json.loads(descargar("https://overpass-api.de/api/interpreter", 300, urllib.parse.urlencode({"data": q}).encode()))
    feats = []
    for w in d.get("elements", []):
        t = w.get("tags", {})
        ref, nombre = t.get("ref", ""), t.get("name", "")
        etiqueta = ref.replace("RN", "Ruta Nacional").replace("RP", "Ruta Provincial") if ref else nombre
        if not etiqueta:
            continue
        coords = [[g["lon"], g["lat"]] for g in w.get("geometry", [])]
        if len(coords) >= 2:
            feats.append({"type": "Feature", "properties": {"nombre": etiqueta, "fuente": "OpenStreetMap"},
                          "geometry": {"type": "LineString", "coordinates": coords}})
    if len(feats) < 20:
        raise RuntimeError("OpenStreetMap devolvió pocas rutas")
    return {"type": "FeatureCollection", "features": feats, "fuente": "OpenStreetMap (Overpass)"}


# Zona petrolera de Neuquén (de El Trapial y Rincón de los Sauces hasta el sur de Añelo)
ZONA_CAMINOS = (-70.4, -39.3, -67.8, -36.9)


def caminos_osm():
    """Caminos de yacimiento: en OpenStreetMap figuran como 'unclassified', 'track' o 'service'.
    Se dejan afuera las huellas de peor categoría (grade4/grade5), estacionamientos y accesos a casas."""
    w, s_, e, n = ZONA_CAMINOS
    q = f"""[out:json][timeout:300];
(
  way["highway"="unclassified"]({s_},{w},{n},{e});
  way["highway"="track"]["tracktype"!~"grade4|grade5"]({s_},{w},{n},{e});
  way["highway"="service"]["service"!~"driveway|parking_aisle|drive-through"]({s_},{w},{n},{e});
);
out geom tags;"""
    d = json.loads(descargar("https://overpass-api.de/api/interpreter", 360, urllib.parse.urlencode({"data": q}).encode()))
    feats = []
    for w_ in d.get("elements", []):
        t = w_.get("tags", {})
        coords = [[g["lon"], g["lat"]] for g in w_.get("geometry", [])]
        if len(coords) < 2:
            continue
        nombre = t.get("name") or t.get("ref") or ""
        tipo = {"unclassified": "Camino", "track": "Huella", "service": "Camino de servicio"}.get(t.get("highway"), "Camino")
        feats.append({"type": "Feature", "properties": {"nombre": nombre, "tipo": tipo, "superficie": t.get("surface", "")},
                      "geometry": {"type": "LineString", "coordinates": coords}})
    if len(feats) < 50:
        raise RuntimeError("OpenStreetMap devolvió pocos caminos")
    return {"type": "FeatureCollection", "features": feats, "fuente": "OpenStreetMap (Overpass)"}


def preparar_caminos(fc):
    feats = []
    for f in (fc or {}).get("features", []):
        for l in lineas(f.get("geometry")):
            s2 = simplificar(l, 15)
            # Tramos muy cortos (menos de ~150 m) no sirven como referencia
            if len(s2) >= 2 and sum(math.hypot((a[0] - b[0]) * 87000, (a[1] - b[1]) * 111000) for a, b in zip(s2, s2[1:])) > 150:
                p = f["properties"]
                feats.append({"type": "Feature", "properties": {"nombre": p.get("nombre", ""), "tipo": p.get("tipo", "")},
                              "geometry": {"type": "LineString", "coordinates": s2}})
    return {"type": "FeatureCollection", "features": feats}


def explorar_capas():
    """Solo informa en el registro qué capas viales publican el IGN y la provincia, por si aparece una de caminos de yacimiento."""
    import re
    for nombre, url in [("IGN", f"{IGN}?service=WFS&version=1.1.0&request=GetCapabilities"),
                        ("Neuquén", "https://hidrocarburos.energianeuquen.gob.ar/geoserver/ows?service=WFS&version=1.1.0&request=GetCapabilities")]:
        try:
            cap = descargar(url, 60).decode("utf-8", "ignore")
            capas = sorted(set(re.findall(r"<Name>([^<]*(?:vial|camin|ruta|picad|acceso)[^<]*)</Name>", cap, re.I)))
            print(f"  capas viales en {nombre}: {capas or 'ninguna'}")
        except Exception as e:
            print(f"  no se pudo leer el catálogo de {nombre}: {e}")


def obtener_rutas():
    try:
        return rutas_ign()
    except Exception as e:
        print(f"  ! IGN: {e}; pruebo OpenStreetMap")
        return rutas_osm()


def preparar_rutas(fc):
    feats = []
    for f in (fc or {}).get("features", []):
        for l in lineas(f.get("geometry")):
            s = simplificar(l, 25)
            if len(s) >= 2:
                feats.append({"type": "Feature", "properties": {"nombre": f["properties"].get("nombre", "")},
                              "geometry": {"type": "LineString", "coordinates": s}})
    return {"type": "FeatureCollection", "features": feats}


# ---------------------------------------------------------------- main
def guardar(nombre, d):
    with open(os.path.join(SALIDA, nombre), "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  {nombre}: {os.path.getsize(os.path.join(SALIDA, nombre)) / 1e6:.2f} MB")


def main():
    os.makedirs(SALIDA, exist_ok=True)
    meta = {"generado": datetime.now(timezone.utc).isoformat(timespec="minutes"), "fuentes": {}}

    pozos, f_pozos = preparar_pozos()
    guardar("pozos.json", pozos)
    meta["fuentes"]["pozos"] = {"fecha": f_pozos, "cantidad": len(pozos["filas"]),
                                "fuente": "Secretaría de Energía de la Nación, padrón de pozos Capítulo IV"}

    inst, f_inst, o_inst = con_respaldo("instalaciones.json", capa_monitor("instalaciones"))
    inst = preparar_instalaciones(inst)
    guardar("instalaciones.json", inst)
    meta["fuentes"]["instalaciones"] = {"fecha": f_inst, "cantidad": len(inst["filas"]), "origen": o_inst,
                                        "fuente": "SIG Hidrocarburos, Subsecretaría de Energía de Neuquén"}

    areas, f_areas, o_areas = con_respaldo("areas.json", capa_monitor("areas"))
    if areas:
        areas = preparar_areas(areas)
        guardar("areas.geojson", areas)
        meta["fuentes"]["areas"] = {"fecha": f_areas, "cantidad": len(areas["features"]), "origen": o_areas,
                                    "fuente": "SIG Hidrocarburos, Subsecretaría de Energía de Neuquén"}

    rutas, f_rutas, o_rutas = con_respaldo("rutas.json", obtener_rutas)
    if rutas:
        fuente_rutas = rutas.get("fuente", "")
        rutas = preparar_rutas(rutas)
        guardar("rutas.geojson", rutas)
        meta["fuentes"]["rutas"] = {"fecha": f_rutas, "cantidad": len(rutas["features"]), "origen": o_rutas, "fuente": fuente_rutas}

    caminos, f_cam, o_cam = con_respaldo("caminos.json", caminos_osm)
    if caminos:
        fuente_cam = caminos.get("fuente", "")
        caminos = preparar_caminos(caminos)
        guardar("caminos.geojson", caminos)
        meta["fuentes"]["caminos"] = {"fecha": f_cam, "cantidad": len(caminos["features"]), "origen": o_cam, "fuente": fuente_cam}

    if not LOCAL:
        explorar_capas()
    guardar("meta.json", meta)
    print(json.dumps(meta, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
