/**
 * Registro de cambios. «usuario»: lo que ven todos en Mi cuenta › Novedades.
 * «tecnico»: cada cambio subido (fecha y hora), visible solo en Administración › Cambios.
 * Al subir un cambio: agregarlo a «tecnico» del día y, si el usuario lo nota, a «usuario».
 */
export interface Version { version: string; fecha: string; titulo: string; usuario: string[] }
export const VERSIONES: Version[] = [
  {
    "version": "1.5",
    "fecha": "2026-11-15",
    "titulo": "Logo de la empresa",
    "usuario": [
      "Cada empresa puede subir su logo: se ve junto al nombre arriba de la app y en el inicio.",
      "El mensaje de bienvenida de la empresa aparece en el inicio.",
      "Simulador público en picadagps.ar/simulador: cada empresa calcula cuánto le cuestan los errores de ubicación y comparte su cálculo."
    ]
  },
  {
    "version": "1.4",
    "fecha": "2026-11-14",
    "titulo": "Plan Empresa: puntos propios y portal de empresas",
    "usuario": [
      "Portal para empresas en picadagps.ar/empresas: alta, usuarios con roles y marca propia.",
      "Puntos propios de cada empresa (tranqueras, pads, bases, picadas sin mapa) en el mapa, la búsqueda y sin señal.",
      "«Agregar punto acá» con el GPS del teléfono; sin señal queda guardado y se envía solo al volver la conexión.",
      "Importación de puntos desde KML de Google Earth, GPX, GeoJSON o planilla CSV.",
      "Los usuarios de una empresa activa entran con plan Empresa.",
      "En las ciudades la ficha ya no muestra salida de ruta ni caminos de yacimiento: Waze y Google Maps llegan directo.",
      "Al cargar un punto se aceptan coordenadas de Google Earth en grados, minutos y segundos (38°29'4.21\" S 68°31'34.97\" O).",
      "Los choferes ven la lista de puntos de su empresa en el inicio, y los más cercanos aparecen primero en «Cómo llegar»."
    ]
  },
  {
    "version": "1.3",
    "fecha": "2026-11-14",
    "titulo": "Pozos, áreas e instalaciones de Río Negro, Mendoza y La Pampa",
    "usuario": [
      "13.469 pozos nuevos: Mendoza, Río Negro y La Pampa (listado oficial de operadoras, 2025).",
      "Áreas de concesión de las tres provincias en el mapa y en la búsqueda.",
      "490 baterías, plantas y puntos de medición de las tres provincias.",
      "Caminos de yacimiento de Río Negro, Mendoza y La Pampa (OpenStreetMap).",
      "Búsqueda por yacimiento: «vacas muertas» o «lunlunta» encuentran sus pozos, y cada resultado muestra yacimiento y área."
    ]
  },
  {
    "version": "1.2",
    "fecha": "2026-11-13",
    "titulo": "Navegación, avisos y precios",
    "usuario": [
      "Waze: ir al pozo o ver el punto sin navegar, con opción de ir a la salida de la ruta.",
      "Aviso cuando faltan 2 días y el último día de tu plan o prueba.",
      "Precios en pesos.",
      "Ingreso con el botón oficial de Google.",
      "Direcciones directas picadagps.ar/cuenta."
    ]
  },
  {
    "version": "1.1",
    "fecha": "2026-11-11",
    "titulo": "Cuenta, prueba gratis y compartir",
    "usuario": [
      "Ingreso con Google y 7 días de prueba gratis.",
      "Planes trimestral y anual, con pago por transferencia.",
      "Hasta 2 teléfonos por cuenta y 15 días de uso sin señal.",
      "Compartir la ubicación de un pozo con foto satelital y enlace directo.",
      "Búsqueda por área: lleva el mapa al área completa.",
      "Con señal débil la app abre al instante con lo guardado."
    ]
  },
  {
    "version": "1.0",
    "fecha": "2026-11-10",
    "titulo": "Lanzamiento",
    "usuario": [
      "Mapa de pozos e instalaciones de Neuquén que funciona sin señal.",
      "Búsqueda por sigla, pad, área u operadora.",
      "Referencias con línea punteada hasta el pozo y caminos de yacimiento."
    ]
  }
];

export const VERSION_ACTUAL = VERSIONES[0].version;

/** Cambios técnicos por día: [hora, descripción] */
export const TECNICO: Record<string, [string, string][]> = {
  "2026-11-10": [
    [
      "19:48",
      "PicadaGPS: ubicador de pozos de Neuquén sin señal"
    ],
    [
      "22:49",
      "Actualización automática de datos"
    ],
    [
      "21:07",
      "Mapa: nombres de áreas, instalaciones y pozos sin superponerse"
    ]
  ],
  "2026-11-11": [
    [
      "09:27",
      "Referencias con línea punteada hasta el pozo y caminos de yacimiento"
    ],
    [
      "12:29",
      "Actualización automática de datos"
    ],
    [
      "09:30",
      "Datos: Overpass con servidores alternativos y consulta de caminos en cuatro partes"
    ],
    [
      "12:48",
      "Actualización automática de datos"
    ],
    [
      "10:04",
      "Padrón de pozos: descarga mensual automática desde datos.energia.gob.ar y fecha real del padrón"
    ],
    [
      "13:13",
      "Actualización automática de datos"
    ],
    [
      "10:36",
      "Ingreso con Google, prueba de 7 días, planes con Mercado Pago, administración y datos protegidos"
    ],
    [
      "10:40",
      "Funciones: validación de sesión propia en picada-admin"
    ],
    [
      "10:46",
      "Cobro manual: pedido por WhatsApp para pedir el alias y confirmación desde Administración"
    ],
    [
      "10:48",
      "Plan anual: US$ 70"
    ],
    [
      "11:23",
      "Cuenta: «Cerrar sesión» con explicación de por qué se borran los datos guardados"
    ],
    [
      "11:36",
      "Ingreso con demo, prueba y precios; máximo 2 teléfonos por cuenta; 15 días sin señal"
    ],
    [
      "11:43",
      "Ingreso: satélite y punto GPS flotando con señal punteada"
    ],
    [
      "11:52",
      "Ingreso: los planes abren WhatsApp para consultar"
    ],
    [
      "12:29",
      "Búsqueda: resultados por área con encuadre en el mapa, números romanos y mejor orden"
    ],
    [
      "13:14",
      "Arranque sin esperas: con señal débil la app abre con lo guardado"
    ],
    [
      "13:21",
      "Ingreso: video compatible con Firefox y Safari (WebM + H.264 Main) y precios sin esperar"
    ],
    [
      "15:48",
      "Compartir por WhatsApp con enlace y vista previa (7 días gratis)"
    ],
    [
      "23:00",
      "Compartir ubicación con foto satelital, referencias y enlace directo a PicadaGPS.ar"
    ]
  ],
  "2026-11-13": [
    [
      "07:33",
      "Ingreso: mano animada y latido en «Entrar con Google», planes más separados, sin créditos"
    ],
    [
      "07:35",
      "Ingreso: planes y ventajas más abajo, separados del botón de Google"
    ],
    [
      "07:38",
      "Ingreso: ventajas arriba del botón de Google, planes al final; video un poco más chico"
    ],
    [
      "07:48",
      "Waze: permite caminos de tierra (avoid_trails=allow) y opción de ir a la salida de la ruta"
    ],
    [
      "07:53",
      "Waze: vuelve al formato básico (avoid_trails daba Unknown error) y agrega ver el punto sin navegar"
    ],
    [
      "11:51",
      "Direcciones picadagps.ar/cuenta y /admin; después de entrar con Google vuelve a la misma página"
    ],
    [
      "13:42",
      "Precios solo en pesos para el usuario (sin montos en dólares)"
    ],
    [
      "15:05",
      "Ingreso con el botón oficial de Google en la página (muestra picadagps.ar, no la dirección de Supabase)"
    ],
    [
      "15:46",
      "Quitar la sección Créditos (a pedido del dueño del sitio)"
    ],
    [
      "19:15",
      "Aviso de vencimiento a 2 días y último día; estadísticas en Administración"
    ],
    [
      "20:07",
      "Administración: simulador de costos por errores de ubicación en campo"
    ],
    [
      "22:14",
      "Simulador: datos del cliente e informe PDF de dos páginas para entregar"
    ]
  ],
  "2026-11-14": [
    [
      "13:05",
      "Suma pozos 2025 de Río Negro, Mendoza y La Pampa y aviso de novedad"
    ],
    [
      "13:08",
      "Caminos de OpenStreetMap también en Río Negro, Mendoza y La Pampa"
    ],
    [
      "13:44",
      "Áreas de concesión de Mendoza (mapa oficial 2024)"
    ],
    [
      "14:05",
      "Áreas de Río Negro y La Pampa (SHP Secretaría de Energía) y de Mendoza (mapa 2024)"
    ],
    [
      "14:06",
      "Caminos de OpenStreetMap: por ahora solo se suma Río Negro"
    ],
    [
      "17:41",
      "Actualización automática de datos"
    ],
    [
      "14:41",
      "Flujo aparte para bajar caminos de otras provincias"
    ],
    [
      "14:42",
      "Aviso: caminos de Río Negro"
    ],
    [
      "15:11",
      "Búsqueda por yacimiento y yacimiento visible en los resultados"
    ],
    [
      "15:12",
      "Caminos de OpenStreetMap también en Mendoza y La Pampa"
    ],
    [
      "15:26",
      "Instalaciones de Río Negro, Mendoza y La Pampa (Res. 319/93 y 318/2010)"
    ],
    [
      "15:40",
      "Novedades para el usuario en Mi cuenta y registro de cambios con fecha y hora en Administración"
    ],
    [
      "15:55",
      "Caminos de OpenStreetMap de Mendoza y La Pampa (21.783 tramos en total) y se restauran las instalaciones de otras provincias"
    ],
    [
      "17:45",
      "Plan Empresa: tablas y funciones en Supabase, portal /empresas y empresas.picadagps.ar, puntos propios en la app, pestaña Empresas en Administración. Piloto: Transporte Bardone"
    ],
    [
      "21:20",
      "Zonas urbanas (Neuquén, Cipolletti, Roca, Añelo, Mendoza, Santa Rosa y otras): sin referencias de campo ni línea a la ruta, y sin calles de OpenStreetMap dibujadas como picadas; los pozos y lo que tiene pozos a menos de 800 m siguen como campo"
    ],
    [
      "21:30",
      "Carga de puntos: acepta coordenadas en grados, minutos y segundos (Google Earth), grados y minutos, con o sin S/O, y muestra cómo se leyeron"
    ],
    [
      "21:40",
      "Nombre de la empresa en el encabezado sin cortarse; lista de puntos de la empresa en el inicio; puntos propios a menos de 30 km primero en «Cómo llegar»"
    ]
  ],
  "2026-11-15": [
    [
      "19:55",
      "Logo propio por empresa (se achica a 256 px en el teléfono y se guarda en Supabase), visible en el encabezado, el inicio y el portal; mensaje de bienvenida en el inicio"
    ],
    [
      "21:10",
      "Simulador público /simulador precargado con la empresa de ejemplo (10 camiones, 5 camionetas), valores editables y enlace para compartir el cálculo propio"
    ],
    [
      "21:45",
      "picadagps.ar queda para usuarios individuales y el administrador general (sin marca de empresa); las empresas entran por /empresa o /empresas; acceso al portal desde Mi cuenta"
    ]
  ],
  "2026-11-16": [
    [
      "11:50",
      "Portal de empresas: el administrador general ve todas las empresas, las da de alta directamente (con responsable y vigencia), las activa, extiende o suspende, y entra a gestionar cualquiera"
    ],
    [
      "12:10",
      "Presentación debajo del ingreso (problema, ventajas para chofer y empresa, cómo funciona, Plan Empresa con simulador, preguntas) y eslogan «El GPS de los yacimientos»"
    ],
    [
      "12:30",
      "Presentación con movimiento: secciones que aparecen al bajar, contadores animados, tarjetas que reaccionan, animación Waze vs. PicadaGPS y mini simulador con camiones y camionetas"
    ]
  ],
  "2026-11-21": [
    [
      "16:00",
      "Correos propios: contacto@picadagps.ar en la presentación, el pie y las preguntas frecuentes; empresas@picadagps.ar en Plan Empresa, el portal de empresas y el simulador"
    ]
  ],
  "2026-11-24": [
    [
      "22:30",
      "Camino sugerido (prueba): hasta 3 entradas por rutas distintas para elegir (botones con ruta y km, ⚠ si cruza otra operadora). Mapa: carteles con el número de ruta (RP 7, RN 22) sobre las rutas"
    ],
    [
      "20:50",
      "Camino sugerido (prueba): si el recorrido cruza un área de concesión de otra operadora distinta a la del destino, la ficha muestra una advertencia con el área y la operadora y recomienda tener autorización de paso"
    ],
    [
      "17:30",
      "Prueba solo para el administrador: camino sugerido en la ficha, calculado en el teléfono sobre los caminos de OpenStreetMap, desde la salida de ruta más corta por camino hasta el pozo, dibujado en verde en el mapa"
    ],
    [
      "17:10",
      "El camino sugerido también se habilita para un usuario de prueba (lista en recorrido.ts)"
    ],
    [
      "17:35",
      "Datos: se suman los accesos principales de OpenStreetMap sin número de ruta (por ejemplo, Acceso Dique Loma de la Lata) como «Camino principal»; antes quedaban afuera porque las rutas vienen del IGN"
    ]
  ]
};
