/**
 * Registro de cambios. «usuario»: lo que ven todos en Mi cuenta › Novedades.
 * «tecnico»: cada cambio subido (fecha y hora), visible solo en Administración › Cambios.
 * Al subir un cambio: agregarlo a «tecnico» del día y, si el usuario lo nota, a «usuario».
 */
export interface Version { version: string; fecha: string; titulo: string; usuario: string[] }
export const VERSIONES: Version[] = [
  {
    "version": "1.3",
    "fecha": "2026-11-14",
    "titulo": "Pozos, áreas e instalaciones de Río Negro, Mendoza y La Pampa",
    "usuario": [
      "13.469 pozos nuevos: Mendoza, Río Negro y La Pampa (listado oficial de operadoras, 2025).",
      "Áreas de concesión de las tres provincias en el mapa y en la búsqueda.",
      "490 baterías, plantas y puntos de medición de las tres provincias.",
      "Caminos de yacimiento de Río Negro (OpenStreetMap).",
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
    ]
  ]
};
