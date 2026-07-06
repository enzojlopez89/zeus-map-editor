"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import maplibregl from "maplibre-gl";
import { circle, lineString, length as turfLength } from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";

type Bando = "propio" | "enemigo";
type VistaFuerzas = "propias" | "enemigas" | "ambas";
type TipoElemento = "aeronave" | "radar" | "defensa";
type FuenteDistancia = "orden" | "externa" | "manual";
type EstadoInteligencia = "pendiente" | "estimado" | "probable" | "confirmado" | "descartado";
type NivelConfianza = "baja" | "media" | "alta";
type ClasificacionInteligencia = "uso_interno" | "compartible" | "restringido";

export type ElementoOperacional = {
  id: string;
  visible: boolean;
  iconoPersonalizado?: string;
  iconoTipo?: string;
  bando: Bando;
  tipo: TipoElemento;
  nombre: string;
  baseOrigen: string;
  longitude: number;
  latitude: number;
  radioCombateKm: number;
  alcanceKm: number;
  mostrarAnillo: boolean;
  color: string;
  cantidad?: number;
  descripcion?: string;
  terminoDistancia?: string;
  fuenteDistancia?: FuenteDistancia;
  referenciaDistancia?: string;
  permiteReabastecimiento?: boolean;
  conReabastecimiento?: boolean;
  intelligenceStatus?: EstadoInteligencia;
  confidenceLevel?: NivelConfianza;
  informationDate?: string;
  sourceDescription?: string;
  intelligenceNotes?: string;
  sharedWithCommander?: boolean;
  sharedWithJem?: boolean;
  sharedWithOtherCells?: boolean;
  classification?: ClasificacionInteligencia;
  originWorkspaceCode?: string;
  sharedExternal?: boolean;
  operationMission?: string;
  operationPhase?: string;
  operationTask?: string;
  operationPriority?: string;
  operationStart?: string;
  operationEnd?: string;
  callSign?: string;
  operationNotes?: string;
  personnelAssigned?: number;
  personnelAvailable?: number;
  personnelCasualties?: number;
  personnelReplacements?: number;
  medicalStatus?: string;
  evacuationRequired?: boolean;
  personnelNotes?: string;
  fuelPercent?: number;
  ammunitionPercent?: number;
  materialStatus?: string;
  transportAvailable?: number;
  resupplyPriority?: string;
  logisticsNotes?: string;
  communicationNodeType?: string;
  networkName?: string;
  frequency?: string;
  linkStatus?: string;
  coverageKm?: number;
  encryptionStatus?: string;
  redundancy?: string;
  communicationsNotes?: string;
};

type BaseMilitar = {
  nombre: string;
  longitude: number;
  latitude: number;
  bando: Bando;
  tipo: "Base aérea" | "Estación radar" | "Centro de comando" | "Comunicaciones" | "Apoyo logístico";
};

type MascaraRadar = {
  id: string;
  nombre: string;
  archivo: string;
  bando: Bando;
  base: string;
  color: string;
  categoria?: "radar" | "defensa_antiaerea";
};

type AeronaveCatalogo = {
  nombre: string;
  base: string;
  bando: Bando;
  cantidad?: number;
  descripcion?: string;
  radioAccionKm?: number;
  terminoDistancia?: string;
  fuenteDistancia?: FuenteDistancia;
  referenciaDistancia?: string;
  permiteReabastecimiento?: boolean;
};

type MedioCatalogo = {
  nombre: string;
  base: string;
  bando: Bando;
  alcanceKm: number;
  cantidad?: number;
  descripcion?: string;
  terminoDistancia?: string;
  fuenteDistancia?: FuenteDistancia;
  referenciaDistancia?: string;
};

type PropiedadesRepublica = {
  republica: string;
  color?: string;
};

type GeoJsonRepublicas = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  PropiedadesRepublica
>;

type IconoCatalogo = {
  archivo: string;
  nombre: string;
  afiliacion: "propio" | "enemigo" | "neutral" | "desconocido";
};

type PuntoMedicion = [number, number];

export type PanelId =
  | "fuerzas"
  | "referencia"
  | "capas"
  | "bases"
  | "mascaras"
  | "colores"
  | "cartografia"
  | "medicion"
  | "visibilidad"
  | "elementos"
  | "personalizado"
  | "desplegados"
  | "inteligencia"
  | "operaciones"
  | "personal"
  | "logistica"
  | "comunicaciones"
  | "compartir";

const ORDEN_PANELES_INICIAL: PanelId[] = [
  "fuerzas",
  "referencia",
  "capas",
  "bases",
  "mascaras",
  "colores",
  "cartografia",
  "medicion",
  "visibilidad",
  "elementos",
  "personalizado",
  "desplegados",
  "inteligencia",
  "operaciones",
  "personal",
  "logistica",
  "comunicaciones",
  "compartir",
];

export type ZeusMapWorkspaceState = {
  mapCenter?: { longitude: number; latitude: number };
  zoom?: number;
  bearing?: number;
  pitch?: number;
  visibleLayers?: Record<string, boolean>;
  panelOrder?: PanelId[];
  settings?: Record<string, unknown>;
};

export type ZeusMapSnapshot = {
  mapState: ZeusMapWorkspaceState & { scenarioName: string };
  elements: ElementoOperacional[];
};

type MapEditorProps = {
  initialState?: ZeusMapWorkspaceState | null;
  initialElements?: ElementoOperacional[];
  followedElements?: ElementoOperacional[];
  readOnly?: boolean;
  onSave?: (snapshot: ZeusMapSnapshot) => Promise<void>;
  allowedPanels?: PanelId[];
  workspaceLabel?: string;
  workspaceDescription?: string;
  workspaceCode?: string;
};

const TON_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        nombre: "Teatro de Operaciones Norte",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-70, -24],
            [-65, -24],
            [-65, -30],
            [-70, -30],
            [-70, -24],
          ],
        ],
      },
    },
  ],
};

const COLORES_REPUBLICAS: Record<string, string> = {
  "República de VESPA": "#facc15",
  "República de TERRA": "#3b82f6",
  "Federación de AQUILA": "#22c55e",
  "República de TAURIA": "#e5e7eb",
  "República Plurinacional de NORTE": "#22d3ee",
  "República Popular de DRACONIA": "#fb7185",
  "República de SUR": "#d1d5db",
};

const NOMBRES_CORTOS: Record<string, string> = {
  "República de VESPA": "VESPA",
  "República de TERRA": "TERRA",
  "Federación de AQUILA": "AQUILA",
  "República de TAURIA": "TAURIA",
  "República Plurinacional de NORTE": "NORTE",
  "República Popular de DRACONIA": "DRACONIA",
  "República de SUR": "SUR",
};

const POSICIONES_ETIQUETAS: Record<string, [number, number]> = {
  "República de VESPA": [-60.5, -36.5],
  "República de TERRA": [-66.0, -33.5],
  "Federación de AQUILA": [-58.5, -28.0],
  "República de TAURIA": [-59.0, -32.0],
  "República Plurinacional de NORTE": [-64.0, -24.8],
  "República Popular de DRACONIA": [-68.0, -42.0],
  "República de SUR": [-69.0, -50.5],
};

const BASES_PROPIAS: BaseMilitar[] = [
  {
    nombre: "1º Brigada Aérea / La Rioja",
    longitude: -66.793409,
    latitude: -29.376201,
    bando: "propio",
    tipo: "Base aérea",
  },
  {
    nombre: "2º Brigada Aérea / Villa Mercedes",
    longitude: -65.370632,
    latitude: -33.738415,
    bando: "propio",
    tipo: "Base aérea",
  },
  {
    nombre: "3º Brigada Aérea / Córdoba",
    longitude: -64.207857,
    latitude: -31.319799,
    bando: "propio",
    tipo: "Base aérea",
  },
  {
    nombre: "4º Brigada Aérea / Mendoza",
    longitude: -68.84,
    latitude: -32.89,
    bando: "propio",
    tipo: "Base aérea",
  },
  {
    nombre: "5º Brigada Aérea / Gral. Acha",
    longitude: -64.639206,
    latitude: -37.425428,
    bando: "propio",
    tipo: "Base aérea",
  },
  {
    nombre: "Base Aérea Militar Malargüe",
    longitude: -69.58,
    latitude: -35.47,
    bando: "propio",
    tipo: "Base aérea",
  },
  {
    nombre: "Área de Material Realicó (AMR)",
    longitude: -64.245,
    latitude: -35.035,
    bando: "propio",
    tipo: "Apoyo logístico",
  },
  {
    nombre: "Área de Material San Rafael (AMSR)",
    longitude: -68.33,
    latitude: -34.617,
    bando: "propio",
    tipo: "Apoyo logístico",
  },
];

const COAE_RIO_CUARTO: BaseMilitar = {
  nombre: "COAe / Río Cuarto",
  longitude: -64.261,
  latitude: -33.085,
  bando: "propio",
  tipo: "Centro de comando",
};

const GRUPOS_COMUNICACIONES: BaseMilitar[] = [
  {
    nombre: "Grupo 1 COM / San Luis",
    longitude: -66.356,
    latitude: -33.274,
    bando: "propio",
    tipo: "Comunicaciones",
  },
  {
    nombre: "Grupo 2 COM / Malargüe",
    longitude: -69.58,
    latitude: -35.47,
    bando: "propio",
    tipo: "Comunicaciones",
  },
];

const LABORATORIO_TRITIO = {
  nombre: "Laboratorio de procesamiento de tritio",
  longitude: -66.80665833333333,
  latitude: -25.0827,
  coordenadasDms: `25° 4'57.72"S 66° 48'23.97"O`,
  descripcion:
    "Instalación estratégica enemiga establecida por el Plan de Campaña para el procesamiento de tritio.",
  fuente: "Plan de Campaña TON ZEUS I 2026",
};

const BASES_ENEMIGAS: BaseMilitar[] = [
  {
    nombre: "Cuartel General / Salta",
    longitude: -65.41,
    latitude: -24.79,
    bando: "enemigo",
    tipo: "Centro de comando",
  },
  {
    nombre: "Ala Aérea n.º 1 / Resistencia",
    longitude: -58.99,
    latitude: -27.45,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 2 / Sáenz Peña",
    longitude: -60.44,
    latitude: -26.79,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 3 / Salta",
    longitude: -65.49,
    latitude: -24.86,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 4 / Catamarca",
    longitude: -65.75,
    latitude: -28.6,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 5 / Tucumán",
    longitude: -65.1,
    latitude: -26.84,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 6 / Formosa",
    longitude: -58.23,
    latitude: -26.21,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 7 / Belén",
    longitude: -67.03,
    latitude: -27.65,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 8 / Tartagal",
    longitude: -63.82,
    latitude: -22.52,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 9 / Las Lomitas",
    longitude: -60.551518,
    latitude: -24.730022,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Escuadrón Aéreo 31 / Santa Rosa (Catamarca)",
    longitude: -65.34,
    latitude: -28.26,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Estación radar / Las Lomitas",
    longitude: -60.551518,
    latitude: -24.730022,
    bando: "enemigo",
    tipo: "Estación radar",
  },
  {
    nombre: "Estación radar / Cafayate",
    longitude: -65.925964,
    latitude: -26.062598,
    bando: "enemigo",
    tipo: "Estación radar",
  },
  {
    nombre: "Estación radar / Orán",
    longitude: -64.375962,
    latitude: -23.15641,
    bando: "enemigo",
    tipo: "Estación radar",
  },
];

const AERONAVES_PROPIAS_POR_BASE: Record<string, string[]> = {
  "1º Brigada Aérea / La Rioja": [
    "C-130J",
    "KC-130J",
    "LJ-60",
    "DHC-6",
    "B-412",
    "UH-1Y",
  ],
  "2º Brigada Aérea / Villa Mercedes": [
    "F-16C Block 40",
    "AMX A-1M",
    "T-6 Texan II",
    "Hermes 450",
    "B-412",
    "UH-1Y",
    "DHC-6",
  ],
  "3º Brigada Aérea / Córdoba": [
    "AMX A-1M",
    "T-6 Texan II",
    "E-99M Erieye",
    "KC-135",
    "CH-47F",
    "B-412",
    "UH-1Y",
  ],
  "4º Brigada Aérea / Mendoza": [
    "F-16C Block 40",
    "F-16D Block 42",
    "KC-135",
    "DHC-6",
    "B-412",
    "UH-1Y",
  ],
  "5º Brigada Aérea / Gral. Acha": [
    "F-16CJ Block 50",
    "IAI Harpy",
    "LJ-60 MEDEVAC",
    "Hermes 450",
    "EC-130H Compass Call",
    "B-412",
    "CH-47F",
  ],
};

const AERONAVES_ENEMIGAS_POR_BASE: Record<
  string,
  Array<{ nombre: string; cantidad?: number; descripcion?: string }>
> = {
  "Ala Aérea n.º 1 / Resistencia": [
    {
      nombre: "KAI KT-1",
      descripcion:
        "Escuadrones Aéreos Escuela 1 y 2; cantidad no indicada en la orden",
    },
    { nombre: "C-98A", cantidad: 2, descripcion: "Enlace" },
    { nombre: "UH-1N", cantidad: 2, descripcion: "Búsqueda y salvamento" },
  ],
  "Ala Aérea n.º 3 / Salta": [
    {
      nombre: "Mirage 2000-5 Mk2",
      cantidad: 12,
      descripcion: "Caza multirrol",
    },
    {
      nombre: "AS-725 Cougar",
      cantidad: 4,
      descripcion: "Asalto aéreo/BYRCOM",
    },
    { nombre: "E-2C AEW&C", cantidad: 1, descripcion: "AEW&C/C2" },
    { nombre: "Falcon DA-20", cantidad: 1, descripcion: "Guerra electrónica" },
    { nombre: "CASA C-295 IVR", cantidad: 2, descripcion: "SIGINT/ELINT/C2" },
    { nombre: "C-130H", cantidad: 4, descripcion: "Transporte táctico" },
    { nombre: "ERJ-145", cantidad: 2, descripcion: "VIP/MEDEVAC" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
  ],
  "Ala Aérea n.º 4 / Catamarca": [
    {
      nombre: "Harrier T/AV-8B",
      cantidad: 14,
      descripcion: "Ataque y AA limitada",
    },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "UH-1N", cantidad: 4, descripcion: "Asalto aéreo" },
    { nombre: "Mi-28D", cantidad: 4, descripcion: "Ataque/BYRCOM" },
  ],
  "Ala Aérea n.º 5 / Tucumán": [
    { nombre: "Mirage 2000-5 Mk2", cantidad: 8, descripcion: "Caza multirrol" },
    { nombre: "CASA C-295 IVR", cantidad: 1, descripcion: "SIGINT/ELINT/C2" },
    { nombre: "C-130H", cantidad: 6, descripcion: "Asalto aéreo/transporte" },
    {
      nombre: "AS-725 Cougar",
      cantidad: 4,
      descripcion: "Asalto aéreo/BYRCOM",
    },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    {
      nombre: "KC-130H",
      cantidad: 3,
      descripcion: "Reabastecimiento en vuelo",
    },
  ],
  "Ala Aérea n.º 6 / Formosa": [
    { nombre: "Su-22M4", cantidad: 8, descripcion: "Ataque/GE/AA limitada" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "UH-1N", cantidad: 4, descripcion: "Asalto aéreo" },
    { nombre: "Mi-28D", cantidad: 4, descripcion: "Ataque/BYRCOM" },
    {
      nombre: "KC-130H",
      cantidad: 3,
      descripcion: "Reabastecimiento en vuelo",
    },
  ],
  "Ala Aérea n.º 7 / Belén": [
    { nombre: "Su-22M4", cantidad: 6, descripcion: "Ataque/GE/AA limitada" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "UH-1N", cantidad: 4, descripcion: "Asalto aéreo" },
  ],
  "Ala Aérea n.º 8 / Tartagal": [
    {
      nombre: "Geran-2",
      cantidad: 48,
      descripcion: "Ataque/SEAD; alcance 2.500 km",
    },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    {
      nombre: "AS-725 Cougar",
      cantidad: 4,
      descripcion: "Asalto aéreo/BYRCOM",
    },
  ],
  "Ala Aérea n.º 9 / Las Lomitas": [
    { nombre: "Mi-28D", cantidad: 6, descripcion: "Ataque/BYRCOM" },
    { nombre: "UH-1N", cantidad: 4, descripcion: "Asalto aéreo" },
    {
      nombre: "AS-725 Cougar",
      cantidad: 4,
      descripcion: "Asalto aéreo/BYRCOM",
    },
  ],
  "Escuadrón Aéreo 31 / Santa Rosa (Catamarca)": [
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "ERJ-145", cantidad: 2, descripcion: "VIP/MEDEVAC" },
  ],
};

const CANTIDADES_AERONAVES_PROPIAS: Record<string, number> = {
  "1º Brigada Aérea / La Rioja|C-130J": 10,
  "1º Brigada Aérea / La Rioja|KC-130J": 4,
  "1º Brigada Aérea / La Rioja|LJ-60": 3,
  "1º Brigada Aérea / La Rioja|DHC-6": 4,
  "1º Brigada Aérea / La Rioja|B-412": 4,
  "1º Brigada Aérea / La Rioja|UH-1Y": 4,
  "2º Brigada Aérea / Villa Mercedes|F-16C Block 40": 20,
  "2º Brigada Aérea / Villa Mercedes|AMX A-1M": 12,
  "2º Brigada Aérea / Villa Mercedes|T-6 Texan II": 12,
  "2º Brigada Aérea / Villa Mercedes|Hermes 450": 3,
  "2º Brigada Aérea / Villa Mercedes|B-412": 4,
  "2º Brigada Aérea / Villa Mercedes|UH-1Y": 4,
  "2º Brigada Aérea / Villa Mercedes|DHC-6": 4,
  "3º Brigada Aérea / Córdoba|AMX A-1M": 12,
  "3º Brigada Aérea / Córdoba|T-6 Texan II": 12,
  "3º Brigada Aérea / Córdoba|E-99M Erieye": 3,
  "3º Brigada Aérea / Córdoba|KC-135": 3,
  "3º Brigada Aérea / Córdoba|CH-47F": 6,
  "3º Brigada Aérea / Córdoba|B-412": 2,
  "3º Brigada Aérea / Córdoba|UH-1Y": 4,
  "4º Brigada Aérea / Mendoza|F-16C Block 40": 14,
  "4º Brigada Aérea / Mendoza|F-16D Block 42": 6,
  "4º Brigada Aérea / Mendoza|KC-135": 3,
  "4º Brigada Aérea / Mendoza|DHC-6": 4,
  "4º Brigada Aérea / Mendoza|B-412": 2,
  "4º Brigada Aérea / Mendoza|UH-1Y": 4,
  "5º Brigada Aérea / Gral. Acha|F-16CJ Block 50": 10,
  "5º Brigada Aérea / Gral. Acha|IAI Harpy": 36,
  "5º Brigada Aérea / Gral. Acha|LJ-60 MEDEVAC": 3,
  "5º Brigada Aérea / Gral. Acha|Hermes 450": 3,
  "5º Brigada Aérea / Gral. Acha|EC-130H Compass Call": 2,
  "5º Brigada Aérea / Gral. Acha|B-412": 2,
  "5º Brigada Aérea / Gral. Acha|CH-47F": 6,
};


type DatosDistanciaAerea = {
  km: number;
  termino: string;
  fuente: FuenteDistancia;
  referencia: string;
  permiteReabastecimiento?: boolean;
};

const COLOR_ORDEN = "#16a34a";
const COLOR_EXTERNO = "#dc2626";

const DATOS_DISTANCIA_AEREA: Record<string, DatosDistanciaAerea> = {
  "F-16C Block 40": { km: 1370, termino: "Radio de acción", fuente: "orden", referencia: "Orden: 740 MN (valor superior del intervalo 500–740 MN)", permiteReabastecimiento: true },
  "F-16D Block 42": { km: 1370, termino: "Radio de acción", fuente: "orden", referencia: "Orden: 740 MN (valor superior del intervalo 500–740 MN)", permiteReabastecimiento: true },
  "F-16CJ Block 50": { km: 1370, termino: "Radio de acción", fuente: "orden", referencia: "Orden: 740 MN (valor superior del intervalo 500–740 MN)", permiteReabastecimiento: true },
  "AMX A-1M": { km: 889, termino: "Radio de acción", fuente: "orden", referencia: "Orden: 480 MN", permiteReabastecimiento: true },
  "Hermes 450": { km: 278, termino: "Radio de acción", fuente: "orden", referencia: "Orden: 150 MN" },
  "IAI Harpy": { km: 500, termino: "Alcance operativo de empleo único", fuente: "orden", referencia: "Orden: 500 km / 270 MN" },

  "C-130J": { km: 2000, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado con carga" },
  "KC-130J": { km: 1833, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "LJ-60": { km: 2220, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance máximo publicado" },
  "LJ-60 MEDEVAC": { km: 2220, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance máximo publicado" },
  "DHC-6": { km: 740, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "B-412": { km: 370, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "UH-1Y": { km: 220, termino: "Radio de combate", fuente: "externa", referencia: "Fabricante: 119 MN de radio de combate" },
  "T-6 Texan II": { km: 830, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "E-99M Erieye": { km: 1529, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado sobre plataforma ERJ-145; la orden solo informa autonomía" },
  "KC-135": { km: 2778, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Valor público de referencia para misión de reabastecimiento" },
  "CH-47F": { km: 370, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Valor público de referencia" },
  "EC-130H Compass Call": { km: 2130, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado de la plataforma" },

  "KAI KT-1": { km: 650, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "C-98A": { km: 990, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado a partir de aeronave utilitaria equivalente" },
  "UH-1N": { km: 230, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Valor público aproximado" },
  "Mirage 2000-5 Mk2": { km: 740, termino: "Radio de combate de referencia", fuente: "externa", referencia: "Valor público aproximado", permiteReabastecimiento: true },
  "AS-725 Cougar": { km: 430, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "E-2C AEW&C": { km: 1300, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance de traslado publicado" },
  "Falcon DA-20": { km: 1700, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "CASA C-295 IVR": { km: 1075, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "C-130H": { km: 1900, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "ERJ-145": { km: 1529, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "Harrier T/AV-8B": { km: 556, termino: "Radio de combate de referencia", fuente: "externa", referencia: "Valor público aproximado", permiteReabastecimiento: true },
  "Mi-28D": { km: 225, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Valor público aproximado" },
  "KC-130H": { km: 1800, termino: "Radio de acción de referencia", fuente: "externa", referencia: "Estimado como 50% del alcance publicado" },
  "Su-22M4": { km: 575, termino: "Radio de combate de referencia", fuente: "externa", referencia: "Valor público aproximado" },
  "Geran-2": { km: 2500, termino: "Alcance operativo de empleo único", fuente: "externa", referencia: "Estimación externa; no figura en la orden" },
};

function datosDistanciaAerea(nombre: string): DatosDistanciaAerea {
  return DATOS_DISTANCIA_AEREA[nombre] ?? {
    km: 0,
    termino: "Radio de acción",
    fuente: "manual",
    referencia: "Sin valor precargado",
  };
}

function radioAereoRepresentado(elemento: ElementoOperacional) {
  if (elemento.tipo !== "aeronave") return elemento.alcanceKm;
  const multiplicador = elemento.conReabastecimiento ? 2 : 1;
  return elemento.radioCombateKm * multiplicador;
}

const CATALOGO_AERONAVES_PROPIAS: AeronaveCatalogo[] = Object.entries(
  AERONAVES_PROPIAS_POR_BASE,
).flatMap(([base, aeronaves]) =>
  aeronaves.map((nombre) => ({
    nombre,
    base,
    bando: "propio" as const,
    cantidad: CANTIDADES_AERONAVES_PROPIAS[`${base}|${nombre}`],
    radioAccionKm: datosDistanciaAerea(nombre).km,
    terminoDistancia: datosDistanciaAerea(nombre).termino,
    fuenteDistancia: datosDistanciaAerea(nombre).fuente,
    referenciaDistancia: datosDistanciaAerea(nombre).referencia,
    permiteReabastecimiento: datosDistanciaAerea(nombre).permiteReabastecimiento,
  })),
);

const CATALOGO_AERONAVES_ENEMIGAS: AeronaveCatalogo[] = Object.entries(
  AERONAVES_ENEMIGAS_POR_BASE,
).flatMap(([base, aeronaves]) =>
  aeronaves.map((medio) => ({
    nombre: medio.nombre,
    base,
    bando: "enemigo" as const,
    cantidad: medio.cantidad,
    descripcion: medio.descripcion,
    radioAccionKm: datosDistanciaAerea(medio.nombre).km,
    terminoDistancia: datosDistanciaAerea(medio.nombre).termino,
    fuenteDistancia: datosDistanciaAerea(medio.nombre).fuente,
    referenciaDistancia: datosDistanciaAerea(medio.nombre).referencia,
    permiteReabastecimiento: datosDistanciaAerea(medio.nombre).permiteReabastecimiento,
  })),
);

const CATALOGO_RADARES_PROPIOS: MedioCatalogo[] = [
  {
    nombre: "TPS-77",
    base: "1º Brigada Aérea / La Rioja",
    bando: "propio",
    alcanceKm: 555,
  },
  {
    nombre: "TPS-77",
    base: "2º Brigada Aérea / Villa Mercedes",
    bando: "propio",
    alcanceKm: 555,
  },
  {
    nombre: "TPS-77",
    base: "3º Brigada Aérea / Córdoba",
    bando: "propio",
    alcanceKm: 555,
  },
  {
    nombre: "GM-400A",
    base: "5º Brigada Aérea / Gral. Acha",
    bando: "propio",
    alcanceKm: 593,
  },
];

const CATALOGO_RADARES_ENEMIGOS: MedioCatalogo[] = [
  {
    nombre: "AN/TPS-70",
    base: "Estación radar / Las Lomitas",
    bando: "enemigo",
    alcanceKm: 400,
    cantidad: 1,
    descripcion: "Radar de vigilancia de largo alcance",
  },
  {
    nombre: "AN/TPS-70",
    base: "Estación radar / Cafayate",
    bando: "enemigo",
    alcanceKm: 400,
    cantidad: 1,
    descripcion: "Radar de vigilancia de largo alcance",
  },
  {
    nombre: "AN/TPS-70",
    base: "Estación radar / Orán",
    bando: "enemigo",
    alcanceKm: 400,
    cantidad: 1,
    descripcion: "Radar de vigilancia de largo alcance",
  },
];

const CATALOGO_DEFENSA_PROPIA: MedioCatalogo[] = [
  {
    nombre: "Patriot PAC-1",
    base: "3º Brigada Aérea / Córdoba",
    bando: "propio",
    alcanceKm: 160,
  },
  {
    nombre: "Patriot PAC-1",
    base: "4º Brigada Aérea / Mendoza",
    bando: "propio",
    alcanceKm: 160,
  },
  {
    nombre: "NASAMS",
    base: "1º Brigada Aérea / La Rioja",
    bando: "propio",
    alcanceKm: 35,
  },
  {
    nombre: "NASAMS",
    base: "2º Brigada Aérea / Villa Mercedes",
    bando: "propio",
    alcanceKm: 35,
  },
  {
    nombre: "NASAMS",
    base: "5º Brigada Aérea / Gral. Acha",
    bando: "propio",
    alcanceKm: 35,
  },
  {
    nombre: "NASAMS",
    base: "Base Aérea Militar Malargüe",
    bando: "propio",
    alcanceKm: 35,
  },
  ...BASES_PROPIAS.flatMap((base) => [
    {
      nombre: "RBS-70",
      base: base.nombre,
      bando: "propio" as const,
      alcanceKm: 9,
    },
    {
      nombre: "Skyguard/Oerlikon",
      base: base.nombre,
      bando: "propio" as const,
      alcanceKm: 4,
    },
  ]),
];

const CATALOGO_DEFENSA_ENEMIGA: MedioCatalogo[] = [
  ...[
    ["Ala Aérea n.º 2 / Sáenz Peña", "SA-29", 6.5, undefined, "Sistema SA-29; cantidad no indicada en la orden"],
    ["Ala Aérea n.º 2 / Sáenz Peña", "ZSU-23-2", 2.5, undefined, "Sistema ZSU-23-2; no se aplica el alcance del ZSU-23-4 Shilka por tratarse de otro modelo"],
    ["Ala Aérea n.º 2 / Sáenz Peña", "SA-8 Osa-AK", 30, 5, "Radar asociado: Land Roll"],

    ["Ala Aérea n.º 3 / Salta", "S-300 PMU-1", 150, undefined, 'Radar asociado: 30N6E "Flap Lid"'],
    ["Ala Aérea n.º 3 / Salta", "Improved HAWK", 70, 2, "Radares asociados: AN/MPQ-46 / AN/MPQ-61"],
    ["Ala Aérea n.º 3 / Salta", "Pantsir-S1", 28, 4, "Radar asociado: 1RS2-1E"],
    ["Ala Aérea n.º 3 / Salta", "ZSU-23-2", 2.5, undefined, "Modelo indicado por la orden; distinto del ZSU-23-4 Shilka"],
    ["Ala Aérea n.º 3 / Salta", "SA-29", 6.5, undefined, "Cantidad no indicada en la orden"],

    ["Ala Aérea n.º 4 / Catamarca", "S-300 PMU-1", 150, undefined, 'Radar asociado: 30N6E "Flap Lid"'],
    ["Ala Aérea n.º 4 / Catamarca", "Pantsir-S1", 28, 2, "Radar asociado: 1RS2-1E"],
    ["Ala Aérea n.º 4 / Catamarca", "SA-8 Osa-AK", 30, 4, "Radar asociado: Land Roll"],
    ["Ala Aérea n.º 4 / Catamarca", "ZSU-23", 2.5, undefined, "La orden no confirma que sea ZSU-23-4 Shilka"],
    ["Ala Aérea n.º 4 / Catamarca", "SA-29", 6.5, undefined, "Cantidad no indicada en la orden"],

    ["Ala Aérea n.º 5 / Tucumán", "Improved HAWK", 70, undefined, "Radares asociados: AN/MPQ-46 / AN/MPQ-61"],
    ["Ala Aérea n.º 5 / Tucumán", "ZSU-23", 2.5, undefined, "La orden no confirma que sea ZSU-23-4 Shilka"],
    ["Ala Aérea n.º 5 / Tucumán", "SA-29", 6.5, undefined, "Cantidad no indicada en la orden"],

    ["Ala Aérea n.º 6 / Formosa", "Improved HAWK", 70, undefined, "Radares asociados: AN/MPQ-46 / AN/MPQ-61"],
    ["Ala Aérea n.º 6 / Formosa", "Pantsir-S1", 28, 4, "Radar asociado: 1RS2-1E"],
    ["Ala Aérea n.º 6 / Formosa", "SA-29", 6.5, undefined, "Cantidad no indicada en la orden"],
    ["Ala Aérea n.º 6 / Formosa", "ZSU-23", 2.5, undefined, "La orden no confirma que sea ZSU-23-4 Shilka"],

    ["Ala Aérea n.º 7 / Belén", "S-300 PMU-1", 150, undefined, 'Radar asociado: 30N6E "Flap Lid"'],
    ["Ala Aérea n.º 7 / Belén", "SA-8 Osa-AK", 30, 5, "Radar asociado: Land Roll"],
    ["Ala Aérea n.º 7 / Belén", "SA-29", 6.5, undefined, "Cantidad no indicada en la orden"],
    ["Ala Aérea n.º 7 / Belén", "ZSU-23", 2.5, undefined, "La orden no confirma que sea ZSU-23-4 Shilka"],

    ["Ala Aérea n.º 8 / Tartagal", "Improved HAWK", 70, undefined, "Radares asociados: AN/MPQ-46 / AN/MPQ-61"],
    ["Ala Aérea n.º 8 / Tartagal", "SA-29", 6.5, undefined, "Cantidad no indicada en la orden"],
    ["Ala Aérea n.º 8 / Tartagal", "ZSU-23", 2.5, undefined, "La orden no confirma que sea ZSU-23-4 Shilka"],

    ["Ala Aérea n.º 9 / Las Lomitas", "S-300 PMU-1", 150, undefined, 'Radar asociado: 30N6E "Flap Lid"'],
    ["Ala Aérea n.º 9 / Las Lomitas", "Pantsir-S1", 28, 4, "Radar asociado: 1RS2-1E"],
    ["Ala Aérea n.º 9 / Las Lomitas", "ZSU-23-2", 2.5, undefined, "Modelo indicado por la orden; distinto del ZSU-23-4 Shilka"],
    ["Ala Aérea n.º 9 / Las Lomitas", "SA-29", 6.5, undefined, "Cantidad no indicada en la orden"],
  ].map(([base, nombre, alcanceKm, cantidad, descripcion]) => {
    const referencias: Record<string, string> = {
      "S-300 PMU-1": 'Dato aportado para el ejercicio: 30N6E "Flap Lid", 150 km / 81 MN',
      "Improved HAWK": "Dato aportado para el ejercicio: AN/MPQ-46 / AN/MPQ-61, 70 km / 38 MN",
      "Pantsir-S1": "Dato aportado para el ejercicio: 1RS2-1E, 28 km / 15 MN",
      "SA-8 Osa-AK": "Dato aportado para el ejercicio: Land Roll, 30 km / 16 MN",
      "ZSU-23-4 Shilka": 'Dato aportado para el ejercicio: RPK-2 "Gun Dish", 20 km / 11 MN',
    };

    return {
      nombre: nombre as string,
      base: base as string,
      bando: "enemigo" as const,
      alcanceKm: alcanceKm as number,
      cantidad: cantidad as number | undefined,
      descripcion: descripcion as string,
      terminoDistancia: referencias[nombre as string]
        ? "Alcance máximo del radar asociado"
        : "Alcance del sistema",
      fuenteDistancia: "externa" as const,
      referenciaDistancia:
        referencias[nombre as string] ??
        "Valor externo de referencia; no especificado en la orden de instrucción",
    };
  }),
];

const MASCARAS_RADAR: MascaraRadar[] = [
  {
    id: "mascara-la-rioja",
    nombre: "La Rioja",
    archivo: "/data/radar/la_rioja.geojson",
    bando: "propio",
    base: "1º Brigada Aérea / La Rioja",
    color: "#2563eb",
  },
  {
    id: "mascara-villa-mercedes",
    nombre: "Villa Mercedes",
    archivo: "/data/radar/villa_mercedes.geojson",
    bando: "propio",
    base: "2º Brigada Aérea / Villa Mercedes",
    color: "#0ea5e9",
  },
  {
    id: "mascara-cordoba",
    nombre: "Córdoba",
    archivo: "/data/radar/cordoba.geojson",
    bando: "propio",
    base: "3º Brigada Aérea / Córdoba",
    color: "#7c3aed",
  },
  {
    id: "mascara-general-acha",
    nombre: "General Acha",
    archivo: "/data/radar/general_acha.geojson",
    bando: "propio",
    base: "5º Brigada Aérea / Gral. Acha",
    color: "#06b6d4",
  },
  {
    id: "mascara-cafayate",
    nombre: "Cafayate",
    archivo: "/data/radar/cafayate.geojson",
    bando: "enemigo",
    base: "Estación radar / Cafayate",
    color: "#f97316",
  },
  {
    id: "mascara-las-lomitas",
    nombre: "Las Lomitas",
    archivo: "/data/radar/las_lomitas.geojson",
    bando: "enemigo",
    base: "Estación radar / Las Lomitas",
    color: "#ef4444",
  },
  {
    id: "mascara-oran",
    nombre: "Orán",
    archivo: "/data/radar/oran.geojson",
    bando: "enemigo",
    base: "Estación radar / Orán",
    color: "#dc2626",
  },
  {
    id: "mascara-s300-alfa",
    categoria: "defensa_antiaerea",
    nombre: "S-300 PMU-1 ALFA – Ala Aérea n.º 7 / Belén",
    archivo: "/data/defensa-s300/s300_alfa.geojson",
    bando: "enemigo",
    base: "Ala Aérea n.º 7 / Belén",
    color: "#b91c1c",
  },
  {
    id: "mascara-s300-bravo",
    categoria: "defensa_antiaerea",
    nombre: "S-300 PMU-1 BRAVO – Ala Aérea n.º 4 / Catamarca",
    archivo: "/data/defensa-s300/s300_bravo.geojson",
    bando: "enemigo",
    base: "Ala Aérea n.º 4 / Catamarca",
    color: "#991b1b",
  },
  {
    id: "mascara-s300-charly",
    categoria: "defensa_antiaerea",
    nombre: "S-300 PMU-1 CHARLY – Ala Aérea n.º 3 / Salta",
    archivo: "/data/defensa-s300/s300_charly.geojson",
    bando: "enemigo",
    base: "Ala Aérea n.º 3 / Salta",
    color: "#ef4444",
  },
  {
    id: "mascara-s300-delta",
    categoria: "defensa_antiaerea",
    nombre: "S-300 PMU-1 DELTA – Ala Aérea n.º 9 / Las Lomitas",
    archivo: "/data/defensa-s300/s300_delta.geojson",
    bando: "enemigo",
    base: "Ala Aérea n.º 9 / Las Lomitas",
    color: "#dc2626",
  },
];

function obtenerColorRepublica(nombre: string) {
  return COLORES_REPUBLICAS[nombre] ?? "#94a3b8";
}

function obtenerBase(nombre: string) {
  return [...BASES_PROPIAS, ...BASES_ENEMIGAS].find(
    (base) => base.nombre === nombre,
  );
}

function crearId() {
  return crypto.randomUUID();
}

function bandoVisible(bando: Bando, vista: VistaFuerzas) {
  return (
    vista === "ambas" ||
    (vista === "propias" && bando === "propio") ||
    (vista === "enemigas" && bando === "enemigo")
  );
}

function kmAMillasNauticas(km: number) {
  return km / 1.852;
}

function formatearDistancia(km: number) {
  return `${km.toLocaleString("es-AR", {
    maximumFractionDigits: 1,
  })} km / ${kmAMillasNauticas(km).toLocaleString("es-AR", {
    maximumFractionDigits: 1,
  })} MN`;
}

type CategoriaAeronave =
  | "caza"
  | "ataque"
  | "transporte"
  | "reabastecimiento"
  | "helicoptero"
  | "uav"
  | "alerta"
  | "guerra-electronica"
  | "medevac"
  | "entrenamiento"
  | "enlace"
  | "otra";

function obtenerCategoriaAeronave(
  nombre: string,
  descripcion?: string,
): CategoriaAeronave {
  const texto = `${nombre} ${descripcion ?? ""}`.toLowerCase();

  if (texto.includes("medevac") || texto.includes("evacuación")) {
    return "medevac";
  }

  if (
    texto.includes("hermes") ||
    texto.includes("harpy") ||
    texto.includes("geran") ||
    texto.includes("uav") ||
    texto.includes("no tripulado") ||
    texto.includes("merodeadora")
  ) {
    return "uav";
  }

  if (
    texto.includes("uh-1") ||
    texto.includes("b-412") ||
    texto.includes("ch-47") ||
    texto.includes("cougar") ||
    texto.includes("mi-28") ||
    texto.includes("helicóptero") ||
    texto.includes("helicoptero")
  ) {
    return "helicoptero";
  }

  if (
    texto.includes("e-99") ||
    texto.includes("e-2c") ||
    texto.includes("hawkeye") ||
    texto.includes("alerta temprana") ||
    texto.includes("aew")
  ) {
    return "alerta";
  }

  if (
    texto.includes("ec-130") ||
    texto.includes("falcon da-20") ||
    texto.includes("c-295 ivr") ||
    texto.includes("guerra electrónica") ||
    texto.includes("guerra electronica") ||
    texto.includes("sigint") ||
    texto.includes("elint")
  ) {
    return "guerra-electronica";
  }

  if (texto.includes("kc-") || texto.includes("reabastecimiento")) {
    return "reabastecimiento";
  }

  if (
    texto.includes("f-16") ||
    texto.includes("mirage") ||
    texto.includes("caza")
  ) {
    return "caza";
  }

  if (
    texto.includes("amx") ||
    texto.includes("harrier") ||
    texto.includes("su-22") ||
    texto.includes("ataque")
  ) {
    return "ataque";
  }

  if (
    texto.includes("t-6") ||
    texto.includes("kt-1") ||
    texto.includes("entrenamiento")
  ) {
    return "entrenamiento";
  }

  if (
    texto.includes("c-130") ||
    texto.includes("dhc-6") ||
    texto.includes("c-98") ||
    texto.includes("erj-145") ||
    texto.includes("transporte")
  ) {
    return "transporte";
  }

  if (texto.includes("lj-60") || texto.includes("enlace")) {
    return "enlace";
  }

  return "otra";
}

function datosIconoAeronave(nombre: string, descripcion?: string) {
  const categoria = obtenerCategoriaAeronave(nombre, descripcion);

  const iconos: Record<
    CategoriaAeronave,
    { simbolo: string; etiqueta: string }
  > = {
    caza: { simbolo: "▲", etiqueta: "Caza" },
    ataque: { simbolo: "◆", etiqueta: "Ataque" },
    transporte: { simbolo: "✈", etiqueta: "Transporte" },
    reabastecimiento: { simbolo: "⛽", etiqueta: "Reabastecimiento" },
    helicoptero: { simbolo: "🚁", etiqueta: "Helicóptero" },
    uav: { simbolo: "⬡", etiqueta: "UAV / sistema no tripulado" },
    alerta: { simbolo: "◉", etiqueta: "Alerta temprana y control" },
    "guerra-electronica": { simbolo: "⚡", etiqueta: "Guerra electrónica" },
    medevac: { simbolo: "✚", etiqueta: "MEDEVAC" },
    entrenamiento: { simbolo: "◇", etiqueta: "Entrenamiento" },
    enlace: { simbolo: "●", etiqueta: "Enlace" },
    otra: { simbolo: "✈", etiqueta: "Aeronave" },
  };

  return iconos[categoria];
}

function obtenerImagenMedio(nombre: string): string | null {
  const texto = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const imagenes: Array<[string[], string]> = [
    [["f-16cj", "block 50"], "/data/medios/f16_cj_block50.jpg"],
    [["f-16c", "block 40"], "/data/medios/f16_cd_block4042.jpg"],
    [["f-16d", "block 42"], "/data/medios/f16_cd_block4042.jpg"],
    [["amx", "a-1m"], "/data/medios/amx_a1m.jpg"],
    [["t-6", "texan"], "/data/medios/t6_texan_ii.jpg"],
    [["iai harpy"], "/data/medios/iai_harpy.jpg"],
    [["hermes 450"], "/data/medios/hermes_450.jpg"],
    [["compass call"], "/data/medios/ec130h_compass_call.jpg"],
    [["e-99", "erieye"], "/data/medios/e99_erieye.jpg"],
    [["tps-77"], "/data/medios/tps77.jpg"],
    [["gm-400", "gm 400"], "/data/medios/gm400_alpha.jpg"],
    [["patriot"], "/data/medios/patriot.jpg"],
    [["nasams"], "/data/medios/nasams.jpg"],
    [["rbs-70", "rbs 70"], "/data/medios/rbs70.jpg"],
    [
      ["skyguard", "syguard", "oerlikon", "oerlinkon"],
      "/data/medios/skyguard_oerlikon.jpg",
    ],
    [["kc-130j", "kc-130 j"], "/data/medios/kc130j.jpg"],
    [["kc-135"], "/data/medios/kc135.jpg"],
    [["c-130j", "c-130 j"], "/data/medios/c130j.jpg"],
    [["dhc-6", "twin otter"], "/data/medios/dhc6.jpg"],
    [["lj-60", "lear jet 60", "learjet 60"], "/data/medios/learjet60.jpg"],
    [["ch-47f", "ch 47f"], "/data/medios/ch47f.jpg"],
    [["b-412", "bell 412"], "/data/medios/bell412.jpg"],
    [["uh-1y", "uh 1y"], "/data/medios/uh1y.jpg"],
  ];

  for (const [coincidencias, archivo] of imagenes) {
    if (coincidencias.some((coincidencia) => texto.includes(coincidencia))) {
      return archivo;
    }
  }

  return null;
}

const ICONO_BASE = "aeropuerto_o_base_aerea";

function afiliacionIcono(bando: Bando) {
  return bando === "propio" ? "propio" : "enemigo";
}

function familiaIconoMedio(elemento: ElementoOperacional) {
  const texto =
    `${elemento.nombre} ${elemento.descripcion ?? ""}`.toLowerCase();

  if (elemento.iconoTipo?.endsWith(".png")) {
    return elemento.iconoTipo;
  }

  if (elemento.tipo === "radar") {
    return `radar__${afiliacionIcono(elemento.bando)}.png`;
  }

  if (elemento.tipo === "defensa") {
    if (
      texto.includes("patriot") ||
      texto.includes("s-300") ||
      texto.includes("misil")
    ) {
      return `misil_de_defensa_antiaerea__${afiliacionIcono(elemento.bando)}.png`;
    }

    return `defensa_antiaerea__${afiliacionIcono(elemento.bando)}.png`;
  }

  if (
    texto.includes("hermes") ||
    texto.includes("harpy") ||
    texto.includes("geran") ||
    texto.includes("uav") ||
    texto.includes("drone")
  ) {
    return `vehiculo_aereo_no_tripulado_de_ala_fija__${afiliacionIcono(
      elemento.bando,
    )}.png`;
  }

  if (texto.includes("mi-28") || texto.includes("havoc")) {
    return `ala_rotativa_de_ataque__${afiliacionIcono(elemento.bando)}.png`;
  }

  if (
    texto.includes("uh-1") ||
    texto.includes("bell 412") ||
    texto.includes("b-412") ||
    texto.includes("cougar") ||
    texto.includes("as-725")
  ) {
    return `ala_rotativa_utilitaria_mediana__${afiliacionIcono(
      elemento.bando,
    )}.png`;
  }

  if (texto.includes("ch-47")) {
    return `ala_rotativa_utilitaria_pesada__${afiliacionIcono(
      elemento.bando,
    )}.png`;
  }

  if (
    texto.includes("f-16") ||
    texto.includes("mirage") ||
    texto.includes("harrier") ||
    texto.includes("su-22") ||
    texto.includes("amx") ||
    texto.includes("t-6")
  ) {
    return `ala_fija_de_ataque__${afiliacionIcono(elemento.bando)}.png`;
  }

  if (
    texto.includes("erieye") ||
    texto.includes("hawkeye") ||
    texto.includes("compass call") ||
    texto.includes("falcon da-20") ||
    texto.includes("sigint") ||
    texto.includes("elint") ||
    texto.includes("reconocimiento")
  ) {
    return `ala_fija_de_reconocimiento__${afiliacionIcono(elemento.bando)}.png`;
  }

  if (
    texto.includes("c-130") ||
    texto.includes("kc-130") ||
    texto.includes("kc-135") ||
    texto.includes("dhc-6") ||
    texto.includes("lear") ||
    texto.includes("erj-145") ||
    texto.includes("c-98")
  ) {
    return `ala_fija_utilitaria__${afiliacionIcono(elemento.bando)}.png`;
  }

  return `ala_fija__${afiliacionIcono(elemento.bando)}.png`;
}

function rutaIconoMedio(elemento: ElementoOperacional) {
  return `/data/iconos/simbologia/${familiaIconoMedio(elemento)}`;
}

function generarGrilla(intervalo: number): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (let longitud = -82; longitud <= -47; longitud += intervalo) {
    features.push({
      type: "Feature",
      properties: {
        etiqueta: `${Math.abs(longitud)}° O`,
        tipo: "meridiano",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [longitud, -60],
          [longitud, -18],
        ],
      },
    });
  }

  for (let latitud = -60; latitud <= -18; latitud += intervalo) {
    features.push({
      type: "Feature",
      properties: {
        etiqueta: `${Math.abs(latitud)}° S`,
        tipo: "paralelo",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-82, latitud],
          [-47, latitud],
        ],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

function distanciaLado(inicio: [number, number], fin: [number, number]) {
  const km = turfLength(lineString([inicio, fin]), {
    units: "kilometers",
  });
  return {
    km,
    mn: km / 1.852,
  };
}

function obtenerMaximoSlider(elemento: ElementoOperacional) {
  const valorActual =
    elemento.tipo === "aeronave" ? elemento.radioCombateKm : elemento.alcanceKm;

  const base =
    elemento.tipo === "aeronave"
      ? 5000
      : elemento.tipo === "radar"
        ? 1200
        : 400;

  return Math.max(base, Math.ceil(valorActual * 1.5));
}

const EMPTY_ELEMENTS: ElementoOperacional[] = [];

export default function MapEditor({
  initialState = null,
  initialElements = EMPTY_ELEMENTS,
  followedElements = EMPTY_ELEMENTS,
  readOnly = false,
  onSave,
  allowedPanels = ORDEN_PANELES_INICIAL,
  workspaceLabel,
  workspaceDescription,
  workspaceCode,
}: MapEditorProps) {
  const capasIniciales = initialState?.visibleLayers ?? {};
  const ajustesIniciales = initialState?.settings ?? {};
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const elementosMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const etiquetasRef = useRef<Record<string, maplibregl.Marker>>({});
  const oceanosRef = useRef<Record<string, maplibregl.Marker>>({});
  const basesRef = useRef<Record<string, maplibregl.Marker>>({});
  const coaeRef = useRef<maplibregl.Marker | null>(null);
  const comunicacionesRef = useRef<Record<string, maplibregl.Marker>>({});
  const laboratorioTritioRef = useRef<maplibregl.Marker | null>(null);
  const dimensionesTonRef = useRef<Record<string, maplibregl.Marker>>({});
  const medicionMarkersRef = useRef<maplibregl.Marker[]>([]);
  const modoMedicionRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [elementos, setElementos] = useState<ElementoOperacional[]>(initialElements);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  useEffect(() => {
    setElementos((actuales) => {
      const propios = actuales.filter((elemento) => !elemento.sharedExternal);
      const externosBase =
        followedElements.length > 0
          ? followedElements
          : initialElements.filter((elemento) => elemento.sharedExternal);

      const unicos = new Map<string, ElementoOperacional>();
      [...propios, ...externosBase].forEach((elemento) => {
        unicos.set(elemento.id, elemento);
      });

      const siguientes = Array.from(unicos.values());

      const sinCambios =
        siguientes.length === actuales.length &&
        siguientes.every((elemento, indice) => elemento === actuales[indice]);

      return sinCambios ? actuales : siguientes;
    });
  }, [followedElements, initialElements]);

  const [vistaFuerzas, setVistaFuerzas] = useState<VistaFuerzas>((ajustesIniciales.vistaFuerzas as VistaFuerzas | undefined) ?? "ambas");

  const [mostrarRepublicas, setMostrarRepublicas] = useState(capasIniciales.republicas ?? true);
  const [mostrarEntornoGeografico, setMostrarEntornoGeografico] =
    useState(capasIniciales.entornoGeografico ?? true);
  const [mostrarTon, setMostrarTon] = useState(capasIniciales.ton ?? true);
  const [mostrarBases, setMostrarBases] = useState(capasIniciales.bases ?? true);
  const [mostrarComunicaciones, setMostrarComunicaciones] = useState(capasIniciales.comunicaciones ?? false);
  const [mostrarAeronaves, setMostrarAeronaves] = useState(capasIniciales.aeronaves ?? true);
  const [mostrarRadares, setMostrarRadares] = useState(capasIniciales.radares ?? true);
  const [mostrarDefensa, setMostrarDefensa] = useState(capasIniciales.defensa ?? true);
  const [mostrarRelieve, setMostrarRelieve] = useState(capasIniciales.relieve ?? false);
  const [mostrarRios, setMostrarRios] = useState(capasIniciales.rios ?? false);
  const [mostrarGrilla, setMostrarGrilla] = useState(capasIniciales.grilla ?? false);
  const [intervaloGrilla, setIntervaloGrilla] = useState(Number(ajustesIniciales.intervaloGrilla ?? 2));
  const [mostrarDimensionesTon, setMostrarDimensionesTon] = useState(capasIniciales.dimensionesTon ?? false);
  const [modoMedicion, setModoMedicion] = useState(false);
  const [ordenPaneles, setOrdenPaneles] = useState<PanelId[]>(initialState?.panelOrder?.length ? initialState.panelOrder : ORDEN_PANELES_INICIAL);
  const panelArrastradoRef = useRef<PanelId | null>(null);
  const [puntosMedicion, setPuntosMedicion] = useState<PuntoMedicion[]>([]);
  const [distanciaMedicionKm, setDistanciaMedicionKm] = useState(0);
  const [coordenadasCursor, setCoordenadasCursor] = useState({
    latitud: -35.5,
    longitud: -64.5,
  });
  const [catalogoIconos, setCatalogoIconos] = useState<IconoCatalogo[]>([]);
  const [busquedaIcono, setBusquedaIcono] = useState("");
  const [mostrarSelectorIconos, setMostrarSelectorIconos] = useState(false);

  const [mascarasVisibles, setMascarasVisibles] = useState<
    Record<string, boolean>
  >(() =>
    (ajustesIniciales.mascarasVisibles as Record<string, boolean> | undefined) ??
      Object.fromEntries(
        MASCARAS_RADAR.map((mascara) => [
          mascara.id,
          mascara.categoria === "defensa_antiaerea",
        ]),
      ),
  );

  const [coloresMascaras, setColoresMascaras] = useState<
    Record<string, string>
  >(() =>
    (ajustesIniciales.coloresMascaras as Record<string, string> | undefined) ??
      Object.fromEntries(
        MASCARAS_RADAR.map((mascara) => [mascara.id, mascara.color]),
      ),
  );

  const [coloresRepublicas, setColoresRepublicas] = useState<
    Record<string, string>
  >((ajustesIniciales.coloresRepublicas as Record<string, string> | undefined) ?? {
    ...COLORES_REPUBLICAS,
  });

  const [basesVisibles, setBasesVisibles] = useState<Record<string, boolean>>(
    () =>
      (ajustesIniciales.basesVisibles as Record<string, boolean> | undefined) ??
      Object.fromEntries(
        [...BASES_PROPIAS, ...BASES_ENEMIGAS].map((base) => [
          base.nombre,
          true,
        ]),
      ),
  );

  const [nombrePersonalizado, setNombrePersonalizado] = useState("");
  const [tipoPersonalizado, setTipoPersonalizado] =
    useState<TipoElemento>("aeronave");
  const [bandoPersonalizado, setBandoPersonalizado] = useState<Bando>("propio");
  const [basePersonalizada, setBasePersonalizada] = useState(
    BASES_PROPIAS[0]?.nombre ?? "",
  );
  const [alcancePersonalizado, setAlcancePersonalizado] = useState(0);
  const [colorPersonalizado, setColorPersonalizado] = useState("#22c55e");
  const [iconoTipoPersonalizado, setIconoTipoPersonalizado] =
    useState("personalizado");
  const [iconoPersonalizado, setIconoPersonalizado] = useState<
    string | undefined
  >();

  const [aeronavePropiaSeleccionada, setAeronavePropiaSeleccionada] =
    useState("");
  const [aeronaveEnemigaSeleccionada, setAeronaveEnemigaSeleccionada] =
    useState("");
  const [radarPropioSeleccionado, setRadarPropioSeleccionado] = useState("");
  const [radarEnemigoSeleccionado, setRadarEnemigoSeleccionado] = useState("");
  const [defensaPropiaSeleccionada, setDefensaPropiaSeleccionada] =
    useState("");
  const [defensaEnemigaSeleccionada, setDefensaEnemigaSeleccionada] =
    useState("");

  const [errorGeoJson, setErrorGeoJson] = useState<string | null>(null);
  const [guardandoMapa, setGuardandoMapa] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(
    readOnly ? "Vista de solo lectura" : "Sin cambios pendientes",
  );
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const seguimientoCambiosRef = useRef(false);

  const seleccionado = useMemo(
    () => elementos.find((elemento) => elemento.id === seleccionadoId) ?? null,
    [elementos, seleccionadoId],
  );

  const mostrarControlesPropios =
    vistaFuerzas === "propias" || vistaFuerzas === "ambas";

  const mostrarControlesEnemigos =
    vistaFuerzas === "enemigas" || vistaFuerzas === "ambas";

  useEffect(() => {
    fetch("/data/iconos/simbologia/indice_iconos.json")
      .then((respuesta) => {
        if (!respuesta.ok) {
          throw new Error("No se pudo cargar el catálogo de iconos.");
        }
        return respuesta.json();
      })
      .then((datos: IconoCatalogo[]) => setCatalogoIconos(datos))
      .catch((error) => console.error(error));
  }, []);

  const iconosFiltrados = useMemo(() => {
    const termino = busquedaIcono.trim().toLowerCase();

    return catalogoIconos
      .filter((icono) => {
        const coincideBando =
          icono.afiliacion === afiliacionIcono(bandoPersonalizado) ||
          icono.afiliacion === "neutral" ||
          icono.afiliacion === "desconocido";

        const coincideTexto =
          termino.length === 0 ||
          icono.nombre.toLowerCase().includes(termino) ||
          icono.archivo.toLowerCase().includes(termino);

        return coincideBando && coincideTexto;
      })
      .slice(0, 120);
  }, [catalogoIconos, busquedaIcono, bandoPersonalizado]);

  function crearAnillo(elemento: ElementoOperacional) {
    const radio = radioAereoRepresentado(elemento);

    return circle([elemento.longitude, elemento.latitude], radio, {
      steps: 128,
      units: "kilometers",
      properties: {
        id: elemento.id,
        nombre: elemento.nombre,
        tipo: elemento.tipo,
        bando: elemento.bando,
        color: elemento.color,
      },
    });
  }

  function debeMostrarAnillo(elemento: ElementoOperacional) {
    // Para los S-300, la cobertura proveniente del KMZ reemplaza visualmente
    // al círculo nominal cuando está activa. Así no se confunden ambas capas.
    if (
      elemento.tipo === "defensa" &&
      elemento.nombre.toUpperCase().includes("S-300")
    ) {
      const mascaraAsociada = MASCARAS_RADAR.find(
        (mascara) =>
          mascara.categoria === "defensa_antiaerea" &&
          mascara.base === elemento.baseOrigen,
      );

      if (mascaraAsociada && mascarasVisibles[mascaraAsociada.id]) {
        return false;
      }
    }

    if (!elemento.mostrarAnillo) return false;
    if (!bandoVisible(elemento.bando, vistaFuerzas)) return false;
    if (elemento.tipo === "aeronave" && elemento.radioCombateKm <= 0) {
      return false;
    }
    if (elemento.tipo !== "aeronave" && elemento.alcanceKm <= 0) {
      return false;
    }
    if (elemento.tipo === "aeronave" && !mostrarAeronaves) return false;
    if (elemento.tipo === "radar" && !mostrarRadares) return false;
    if (elemento.tipo === "defensa" && !mostrarDefensa) return false;
    return true;
  }

  function actualizarFuenteAnillos(lista: ElementoOperacional[]) {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("anillos-operacionales") as
      maplibregl.GeoJSONSource | undefined;

    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: lista.filter(debeMostrarAnillo).map(crearAnillo),
    });
  }

  function actualizarVisibilidadCapa(
    mapa: maplibregl.Map,
    capa: string,
    visible: boolean,
  ) {
    if (!mapa.getLayer(capa)) return;

    mapa.setLayoutProperty(capa, "visibility", visible ? "visible" : "none");
  }

  function agregarAeronave(
    catalogo: AeronaveCatalogo[],
    indiceTexto: string,
    limpiar: () => void,
  ) {
    const indice = Number(indiceTexto);
    if (indiceTexto === "" || Number.isNaN(indice)) return;

    const medio = catalogo[indice];
    if (!medio) return;

    const existente = elementos.find(
      (elemento) =>
        elemento.tipo === "aeronave" &&
        elemento.bando === medio.bando &&
        elemento.nombre === medio.nombre &&
        elemento.baseOrigen === medio.base,
    );

    if (existente) {
      setSeleccionadoId(existente.id);
      limpiar();
      return;
    }

    const base = obtenerBase(medio.base);
    if (!base) return;

    const nuevaAeronave: ElementoOperacional = {
      id: crearId(),
      visible: true,
      bando: medio.bando,
      tipo: "aeronave",
      nombre: medio.nombre,
      baseOrigen: medio.base,
      longitude: base.longitude,
      latitude: base.latitude,
      radioCombateKm: medio.radioAccionKm ?? 0,
      alcanceKm: 0,
      mostrarAnillo: (medio.radioAccionKm ?? 0) > 0,
      color: medio.fuenteDistancia === "orden" ? COLOR_ORDEN : COLOR_EXTERNO,
      cantidad: medio.cantidad,
      descripcion: medio.descripcion,
      terminoDistancia: medio.terminoDistancia,
      fuenteDistancia: medio.fuenteDistancia,
      referenciaDistancia: medio.referenciaDistancia,
      permiteReabastecimiento: medio.permiteReabastecimiento,
      conReabastecimiento: false,
    };

    setElementos((anteriores) => [...anteriores, nuevaAeronave]);
    setSeleccionadoId(nuevaAeronave.id);
    limpiar();
  }

  function agregarMedio(
    tipo: "radar" | "defensa",
    catalogo: MedioCatalogo[],
    indiceTexto: string,
    limpiar: () => void,
  ) {
    const indice = Number(indiceTexto);
    if (indiceTexto === "" || Number.isNaN(indice)) return;

    const medio = catalogo[indice];
    if (!medio) return;

    const base = obtenerBase(medio.base);
    if (!base) return;

    const nuevoElemento: ElementoOperacional = {
      id: crearId(),
      visible: true,
      bando: medio.bando,
      tipo,
      nombre: medio.nombre,
      baseOrigen: medio.base,
      longitude: base.longitude,
      latitude: base.latitude,
      radioCombateKm: 0,
      alcanceKm: medio.alcanceKm,
      mostrarAnillo: !(
        tipo === "defensa" && medio.nombre.toUpperCase().includes("S-300")
      ),
      color:
        medio.fuenteDistancia === "orden"
          ? COLOR_ORDEN
          : medio.fuenteDistancia === "externa"
            ? COLOR_EXTERNO
            : medio.bando === "propio"
              ? tipo === "radar"
                ? "#7c3aed"
                : "#dc2626"
              : tipo === "radar"
                ? "#f59e0b"
                : "#991b1b",
      cantidad: medio.cantidad,
      descripcion: medio.descripcion,
      terminoDistancia:
        medio.terminoDistancia ?? "Alcance máximo del sistema",
      fuenteDistancia: medio.fuenteDistancia,
      referenciaDistancia: medio.referenciaDistancia,
    };

    setElementos((anteriores) => [...anteriores, nuevoElemento]);

    if (tipo === "defensa" && medio.nombre.toUpperCase().includes("S-300")) {
      const mascaraAsociada = MASCARAS_RADAR.find(
        (mascara) =>
          mascara.categoria === "defensa_antiaerea" &&
          mascara.base === medio.base,
      );

      if (mascaraAsociada) {
        setMascarasVisibles((anteriores) => ({
          ...anteriores,
          [mascaraAsociada.id]: true,
        }));
      }
    }

    setSeleccionadoId(nuevoElemento.id);
    limpiar();
  }

  function agregarMedioPersonalizado() {
    const nombre = nombrePersonalizado.trim();
    if (!nombre) return;

    const base = obtenerBase(basePersonalizada);
    const centro = mapRef.current?.getCenter();

    const nuevo: ElementoOperacional = {
      id: crearId(),
      visible: true,
      bando: bandoPersonalizado,
      tipo: tipoPersonalizado,
      nombre,
      baseOrigen: base?.nombre ?? "Ubicación personalizada",
      longitude: base?.longitude ?? centro?.lng ?? -64.5,
      latitude: base?.latitude ?? centro?.lat ?? -35.5,
      radioCombateKm:
        tipoPersonalizado === "aeronave" ? alcancePersonalizado : 0,
      alcanceKm: tipoPersonalizado === "aeronave" ? 0 : alcancePersonalizado,
      mostrarAnillo: alcancePersonalizado > 0,
      color: colorPersonalizado,
      iconoPersonalizado,
      iconoTipo: iconoTipoPersonalizado,
      descripcion: "Medio personalizado",
    };

    setElementos((anteriores) => [...anteriores, nuevo]);
    setSeleccionadoId(nuevo.id);
    setNombrePersonalizado("");
    setAlcancePersonalizado(0);
    setIconoPersonalizado(undefined);
    setIconoTipoPersonalizado("personalizado");
    setBusquedaIcono("");
  }

  function actualizarElemento(
    id: string,
    cambios: Partial<ElementoOperacional>,
  ) {
    setElementos((anteriores) =>
      anteriores.map((elemento) =>
        elemento.id === id ? { ...elemento, ...cambios } : elemento,
      ),
    );
  }

  function eliminarElemento(id: string) {
    elementosMarkersRef.current[id]?.remove();
    delete elementosMarkersRef.current[id];

    setElementos((anteriores) =>
      anteriores.filter((elemento) => elemento.id !== id),
    );
    setSeleccionadoId(null);
  }

  function crearIconoElemento(elemento: ElementoOperacional) {
    const contenedor = document.createElement("div");
    contenedor.style.width = "42px";
    contenedor.style.height = "42px";
    contenedor.style.display = "flex";
    contenedor.style.alignItems = "center";
    contenedor.style.justifyContent = "center";
    contenedor.style.cursor = "grab";
    contenedor.style.userSelect = "none";
    contenedor.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.55))";

    const imagen = document.createElement("img");
    imagen.src = rutaIconoMedio(elemento);
    imagen.alt = elemento.nombre;
    imagen.title = elemento.nombre;
    imagen.style.width = "42px";
    imagen.style.height = "42px";
    imagen.style.objectFit = "contain";
    imagen.style.pointerEvents = "none";

    imagen.onerror = () => {
      imagen.src = `/data/iconos/simbologia/ala_fija__${afiliacionIcono(
        elemento.bando,
      )}.png`;
    };

    contenedor.appendChild(imagen);
    return contenedor;
  }

  function crearIconoBase(base: BaseMilitar) {
    const elemento = document.createElement("div");
    elemento.style.width = "40px";
    elemento.style.height = "40px";
    elemento.style.display = "flex";
    elemento.style.alignItems = "center";
    elemento.style.justifyContent = "center";
    elemento.style.cursor = "pointer";
    elemento.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.55))";

    const imagen = document.createElement("img");
    const familia =
      base.tipo === "Estación radar"
        ? "radar"
        : base.tipo === "Centro de comando"
          ? "puesto_de_mando"
          : base.tipo === "Apoyo logístico"
            ? "instalacion"
            : ICONO_BASE;

    imagen.src = `/data/iconos/simbologia/${familia}__${afiliacionIcono(
      base.bando,
    )}.png`;
    imagen.alt = base.nombre;
    imagen.title = base.nombre;
    imagen.style.width = "40px";
    imagen.style.height = "40px";
    imagen.style.objectFit = "contain";
    imagen.style.pointerEvents = "none";
    imagen.onerror = () => {
      imagen.src = `/data/iconos/simbologia/${ICONO_BASE}__${afiliacionIcono(
        base.bando,
      )}.png`;
    };

    elemento.appendChild(imagen);
    return elemento;
  }

  function mediosDeBase(base: BaseMilitar) {
    const aeronaves =
      base.bando === "propio"
        ? CATALOGO_AERONAVES_PROPIAS.filter(
            (medio) => medio.base === base.nombre,
          )
        : CATALOGO_AERONAVES_ENEMIGAS.filter(
            (medio) => medio.base === base.nombre,
          );

    const radares =
      base.bando === "propio"
        ? CATALOGO_RADARES_PROPIOS.filter((medio) => medio.base === base.nombre)
        : CATALOGO_RADARES_ENEMIGOS.filter(
            (medio) => medio.base === base.nombre,
          );

    const defensa =
      base.bando === "propio"
        ? CATALOGO_DEFENSA_PROPIA.filter((medio) => medio.base === base.nombre)
        : CATALOGO_DEFENSA_ENEMIGA.filter(
            (medio) => medio.base === base.nombre,
          );

    const listar = (items: Array<{ nombre: string; cantidad?: number }>) =>
      items.length
        ? items
            .map(
              (item) =>
                `${item.nombre}${item.cantidad ? ` x ${item.cantidad}` : ""}`,
            )
            .join("<br />")
        : "Sin medios registrados";

    return `
      <div style="font-family:Arial;color:#f8fafc;background:#0f172a;min-width:280px;padding:12px;border-radius:8px;line-height:1.45">
        <strong>${base.nombre}</strong><br />
        <em>${base.tipo} — ${
          base.bando === "propio" ? "PROPIO" : "ENEMIGO"
        }</em>
        <hr style="margin:8px 0;border:0;border-top:1px solid #475569" />
        <strong>Aeronaves:</strong><br />${listar(aeronaves)}
        <br /><br />
        <strong>Radares:</strong><br />${listar(radares)}
        <br /><br />
        <strong>Defensa antiaérea:</strong><br />${listar(defensa)}
      </div>
    `;
  }

  useEffect(() => {
    if (initialState?.panelOrder?.length) return;
    try {
      const guardado = window.localStorage.getItem("zeus-orden-paneles");
      if (!guardado) return;
      const orden = JSON.parse(guardado) as PanelId[];
      if (
        Array.isArray(orden) &&
        ORDEN_PANELES_INICIAL.every((id) => orden.includes(id))
      ) {
        setOrdenPaneles(orden);
      }
    } catch {
      // Se conserva el orden inicial si el navegador no permite almacenamiento local.
    }
  }, []);

  useEffect(() => {
    if (readOnly) return;
    try {
      window.localStorage.setItem(
        "zeus-orden-paneles",
        JSON.stringify(ordenPaneles),
      );
    } catch {
      // El orden sigue funcionando durante la sesión actual.
    }
  }, [ordenPaneles]);

  function soltarPanel(destino: PanelId) {
    if (readOnly) return;
    const origen = panelArrastradoRef.current;
    panelArrastradoRef.current = null;
    if (!origen || origen === destino) return;

    setOrdenPaneles((ordenActual) => {
      const siguiente = ordenActual.filter((id) => id !== origen);
      const indiceDestino = siguiente.indexOf(destino);
      siguiente.splice(indiceDestino, 0, origen);
      return siguiente;
    });
  }

  function propiedadesPanel(id: PanelId) {
    const panelPermitido = allowedPanels.includes(id);

    return {
      draggable: !readOnly && panelPermitido,

      style: {
        order: ordenPaneles.indexOf(id),
        cursor: panelPermitido ? "grab" : "default",
        userSelect: "none" as const,
        display: panelPermitido ? undefined : "none",
      },

      onDragStart: (event: DragEvent<HTMLElement>) => {
        if (readOnly) { event.preventDefault(); return; }
        panelArrastradoRef.current = id;

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);

        event.currentTarget.style.opacity = "0.55";
        event.currentTarget.style.cursor = "grabbing";
      },

      onDragEnter: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
      },

      onDragOver: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },

      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        soltarPanel(id);
      },

      onDragEnd: (event: DragEvent<HTMLElement>) => {
        event.currentTarget.style.opacity = "1";
        event.currentTarget.style.cursor = "grab";
        panelArrastradoRef.current = null;
      },

      title: "Arrastrar este recuadro para cambiar su posición",
    };
  }

  function verTodoTerritorio() {
    mapRef.current?.fitBounds(
      [
        [-78, -57],
        [-48, -19],
      ],
      { padding: 35, duration: 900 },
    );
  }

  useEffect(() => {
    modoMedicionRef.current = modoMedicion;
    const map = mapRef.current;
    if (map) {
      map.getCanvas().style.cursor = modoMedicion ? "crosshair" : "";
    }
  }, [modoMedicion]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "fondo-operacional",
            type: "background",
            paint: {
              "background-color": "#dbeafe",
            },
          },
        ],
      },
      center: [
        initialState?.mapCenter?.longitude ?? -63.5,
        initialState?.mapCenter?.latitude ?? -38,
      ],
      zoom: initialState?.zoom ?? 3,
      bearing: initialState?.bearing ?? 0,
      pitch: initialState?.pitch ?? 0,
      minZoom: 1.75,
      maxZoom: 14,
      maxBounds: [
        [-95, -70],
        [-30, -5],
      ],
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.on("load", async () => {
      map.addSource("relieve-topografico", {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Esri, USGS, NOAA",
      });

      map.addLayer({
        id: "relieve-topografico",
        type: "raster",
        source: "relieve-topografico",
        layout: { visibility: "none" },
        paint: {
          "raster-opacity": 0.82,
          "raster-saturation": 0.05,
          "raster-contrast": 0.08,
        },
      });

      map.addSource("rios", {
        type: "geojson",
        data: "/data/base/rios.geojson",
      });

      map.addLayer({
        id: "rios",
        type: "line",
        source: "rios",
        layout: { visibility: "none" },
        paint: {
          "line-color": "#1387c9",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 7, 1.8],
          "line-opacity": 0.9,
        },
      });

      try {
        const respuesta = await fetch("/data/republicas_argentum.geojson");

        if (!respuesta.ok) {
          throw new Error(
            `No se pudo cargar el GeoJSON. Código: ${respuesta.status}`,
          );
        }

        const republicas = (await respuesta.json()) as GeoJsonRepublicas;

        const republicasConColor: GeoJsonRepublicas = {
          ...republicas,
          features: republicas.features.map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              color: obtenerColorRepublica(feature.properties.republica),
            },
          })),
        };

        map.addSource("paises-aledanos", {
          type: "geojson",
          data: "/data/base/paises_aledanos.geojson",
        });

        map.addLayer({
          id: "paises-aledanos-relleno",
          type: "fill",
          source: "paises-aledanos",
          paint: {
            "fill-color": "#dbeafe",
            "fill-opacity": 1,
            "fill-antialias": false,
          },
        });

        // Borde del mismo color y levemente ancho para cubrir rendijas de antialiasing
        // entre la máscara exterior y las repúblicas cuando se activa el relieve.
        map.addLayer({
          id: "paises-aledanos-borde",
          type: "line",
          source: "paises-aledanos",
          paint: {
            "line-color": "#dbeafe",
            "line-width": 3,
            "line-opacity": 1,
          },
        });

        map.addSource("republicas", {
          type: "geojson",
          data: republicasConColor,
        });

        map.addLayer({
          id: "republicas-relleno",
          type: "fill",
          source: "republicas",
          paint: {
            "fill-color": ["coalesce", ["get", "color"], "#94a3b8"],
            "fill-opacity": 0.5,
          },
        });

        map.addLayer({
          id: "republicas-borde",
          type: "line",
          source: "republicas",
          paint: {
            "line-color": "#334155",
            "line-width": 2.5,
          },
        });

        Object.entries(POSICIONES_ETIQUETAS).forEach(
          ([nombre, coordenadas]) => {
            const etiqueta = document.createElement("div");
            etiqueta.textContent = NOMBRES_CORTOS[nombre] ?? nombre;
            const nombreCorto = NOMBRES_CORTOS[nombre] ?? nombre;
            etiqueta.style.fontWeight = "900";
            etiqueta.style.fontSize = nombreCorto.length > 8 ? "12px" : "14px";
            etiqueta.style.lineHeight = "1.05";
            etiqueta.style.letterSpacing =
              nombreCorto.length > 8 ? "0.08em" : "0.12em";
            etiqueta.style.color = "rgba(15,23,42,0.68)";
            etiqueta.style.background = "transparent";
            etiqueta.style.border = "none";
            etiqueta.style.padding = "2px 4px";
            etiqueta.style.pointerEvents = "none";
            etiqueta.style.whiteSpace = "normal";
            etiqueta.style.textAlign = "center";
            etiqueta.style.width = nombreCorto.length > 8 ? "86px" : "74px";
            etiqueta.style.textShadow =
              "0 1px 0 rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.82)";
            etiqueta.style.transform = "translate(-50%, -50%)";

            const marker = new maplibregl.Marker({
              element: etiqueta,
              anchor: "center",
            })
              .setLngLat(coordenadas)
              .addTo(map);

            etiquetasRef.current[nombre] = marker;
          },
        );

        const etiquetasOceanos: Array<{
          nombre: string;
          coordenadas: [number, number];
        }> = [
          { nombre: "OCÉANO PACÍFICO", coordenadas: [-76.0, -39.0] },
          { nombre: "OCÉANO ATLÁNTICO", coordenadas: [-50.5, -40.0] },
        ];

        etiquetasOceanos.forEach(({ nombre, coordenadas }) => {
          const etiquetaOceano = document.createElement("div");
          etiquetaOceano.textContent = nombre;
          etiquetaOceano.style.fontWeight = "700";
          etiquetaOceano.style.fontSize = "15px";
          etiquetaOceano.style.letterSpacing = "0.22em";
          etiquetaOceano.style.color = "rgba(30,64,175,0.58)";
          etiquetaOceano.style.fontStyle = "italic";
          etiquetaOceano.style.pointerEvents = "none";
          etiquetaOceano.style.whiteSpace = "nowrap";
          etiquetaOceano.style.textShadow = "0 1px 0 rgba(255,255,255,0.8)";

          const markerOceano = new maplibregl.Marker({
            element: etiquetaOceano,
            anchor: "center",
          })
            .setLngLat(coordenadas)
            .addTo(map);

          oceanosRef.current[nombre] = markerOceano;
        });

        setErrorGeoJson(null);
      } catch (error) {
        setErrorGeoJson(
          error instanceof Error
            ? error.message
            : "Error al cargar el GeoJSON.",
        );
      }

      const crearMarcadorEspecial = (
        elemento: BaseMilitar,
        texto: string,
        colorFondo: string,
      ) => {
        const contenedor = document.createElement("div");
        contenedor.style.width = "44px";
        contenedor.style.height = "44px";
        contenedor.style.display = "flex";
        contenedor.style.alignItems = "center";
        contenedor.style.justifyContent = "center";
        contenedor.style.background = colorFondo;
        contenedor.style.border = "3px solid #0f172a";
        contenedor.style.borderRadius = "4px";
        contenedor.style.color = "#0f172a";
        contenedor.style.fontSize = "10px";
        contenedor.style.fontWeight = "900";
        contenedor.style.textAlign = "center";
        contenedor.style.lineHeight = "1";
        contenedor.style.boxShadow = "0 2px 6px rgba(0,0,0,0.45)";
        contenedor.textContent = texto;
        contenedor.title = elemento.nombre;
        return contenedor;
      };

      const marcadorCOAe = new maplibregl.Marker({
        element: crearMarcadorEspecial(COAE_RIO_CUARTO, "COAe", "#67e8f9"),
        anchor: "center",
      })
        .setLngLat([COAE_RIO_CUARTO.longitude, COAE_RIO_CUARTO.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25, maxWidth: "380px", className: "zeus-popup" }).setHTML(`
            <div style="background:#0f172a;color:white;padding:14px">
              <strong>COAe / Río Cuarto</strong><br />
              Comando de Operaciones Aeroespaciales<br />
              <em>Punto fijo propio</em>
            </div>
          `),
        )
        .addTo(map);
      coaeRef.current = marcadorCOAe;

      GRUPOS_COMUNICACIONES.forEach((grupo) => {
        const marcador = new maplibregl.Marker({
          element: crearMarcadorEspecial(grupo, "COM", "#67e8f9"),
          anchor: "center",
        })
          .setLngLat([grupo.longitude, grupo.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: "380px", className: "zeus-popup" }).setHTML(`
              <div style="background:#0f172a;color:white;padding:14px">
                <strong>${grupo.nombre}</strong><br />
                Grupo de Comunicaciones<br />
                <em>Bando propio</em>
              </div>
            `),
          )
          .addTo(map);
        marcador.getElement().style.display = "none";
        comunicacionesRef.current[grupo.nombre] = marcador;
      });



      const iconoLaboratorioTritio = document.createElement("div");
      iconoLaboratorioTritio.style.width = "44px";
      iconoLaboratorioTritio.style.height = "44px";
      iconoLaboratorioTritio.style.display = "flex";
      iconoLaboratorioTritio.style.alignItems = "center";
      iconoLaboratorioTritio.style.justifyContent = "center";
      iconoLaboratorioTritio.style.background = "#7f1d1d";
      iconoLaboratorioTritio.style.border = "3px solid #ff1744";
      iconoLaboratorioTritio.style.borderRadius = "999px";
      iconoLaboratorioTritio.style.color = "#fecaca";
      iconoLaboratorioTritio.style.fontSize = "24px";
      iconoLaboratorioTritio.style.fontWeight = "900";
      iconoLaboratorioTritio.style.boxShadow =
        "0 0 0 3px rgba(127,29,29,0.35), 0 2px 8px rgba(0,0,0,0.55)";
      iconoLaboratorioTritio.style.cursor = "pointer";
      iconoLaboratorioTritio.textContent = "☢";
      iconoLaboratorioTritio.title = LABORATORIO_TRITIO.nombre;

      laboratorioTritioRef.current = new maplibregl.Marker({
        element: iconoLaboratorioTritio,
        anchor: "center",
      })
        .setLngLat([
          LABORATORIO_TRITIO.longitude,
          LABORATORIO_TRITIO.latitude,
        ])
        .setPopup(
          new maplibregl.Popup({
            offset: 25,
            maxWidth: "420px",
            className: "zeus-popup",
          }).setHTML(`
            <div style="background:#0f172a;color:white;padding:14px">
              <strong style="color:#fecaca">${LABORATORIO_TRITIO.nombre}</strong><br />
              <span>${LABORATORIO_TRITIO.descripcion}</span><br />
              <br />
              <strong>Bando:</strong> enemigo<br />
              <strong>Categoría:</strong> objetivo estratégico<br />
              <strong>Coordenadas:</strong> ${LABORATORIO_TRITIO.coordenadasDms}<br />
              <strong>Fuente:</strong> ${LABORATORIO_TRITIO.fuente}
            </div>
          `),
        )
        .addTo(map);

            [...BASES_PROPIAS, ...BASES_ENEMIGAS].forEach((base) => {
        const marker = new maplibregl.Marker({
          element: crearIconoBase(base),
          anchor: "center",
        })
          .setLngLat([base.longitude, base.latitude])
          .setPopup(
            new maplibregl.Popup({
              offset: 25,
              maxWidth: "430px",
              className: "zeus-popup",
            }).setHTML(mediosDeBase(base)),
          )
          .addTo(map);

        basesRef.current[base.nombre] = marker;
      });

      for (const mascara of MASCARAS_RADAR) {
        try {
          const respuestaMascara = await fetch(mascara.archivo);

          if (!respuestaMascara.ok) {
            throw new Error(
              `No se pudo cargar ${mascara.nombre}: ${respuestaMascara.status}`,
            );
          }

          const datosMascara =
            (await respuestaMascara.json()) as GeoJSON.FeatureCollection;

          map.addSource(mascara.id, {
            type: "geojson",
            data: datosMascara,
          });

          map.addLayer({
            id: `${mascara.id}-relleno`,
            type: "fill",
            source: mascara.id,
            filter: ["==", ["geometry-type"], "Polygon"],
            layout: { visibility: "none" },
            paint: {
              "fill-color": coloresMascaras[mascara.id] ?? mascara.color,
              "fill-opacity":
                mascara.categoria === "defensa_antiaerea" ? 0.3 : 0.2,
            },
          });

          map.addLayer({
            id: `${mascara.id}-borde`,
            type: "line",
            source: mascara.id,
            filter: ["==", ["geometry-type"], "Polygon"],
            layout: { visibility: "none" },
            paint: {
              "line-color": coloresMascaras[mascara.id] ?? mascara.color,
              "line-width":
                mascara.categoria === "defensa_antiaerea" ? 2.8 : 1.8,
              "line-opacity": 0.95,
            },
          });
        } catch (error) {
          console.error(`Error en máscara ${mascara.nombre}:`, error);
        }
      }

      map.addSource("grilla-coordenadas", {
        type: "geojson",
        data: generarGrilla(intervaloGrilla),
      });

      map.addLayer({
        id: "grilla-coordenadas-lineas",
        type: "line",
        source: "grilla-coordenadas",
        layout: { visibility: "none" },
        paint: {
          "line-color": "#475569",
          "line-width": 1,
          "line-opacity": 0.48,
          "line-dasharray": [3, 3],
        },
      });

      map.addLayer({
        id: "grilla-coordenadas-etiquetas",
        type: "symbol",
        source: "grilla-coordenadas",
        layout: {
          visibility: "none",
          "symbol-placement": "line-center",
          "text-field": ["get", "etiqueta"],
          "text-size": 11,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      map.addSource("ton", {
        type: "geojson",
        data: TON_GEOJSON,
      });

      map.addLayer({
        id: "ton-relleno",
        type: "fill",
        source: "ton",
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": 0.06,
        },
      });

      map.addLayer({
        id: "ton-borde",
        type: "line",
        source: "ton",
        paint: {
          "line-color": "#dc2626",
          "line-width": 4,
          "line-dasharray": [2, 1],
        },
      });

      const ladosTon = [
        {
          id: "norte",
          inicio: [-70, -24] as [number, number],
          fin: [-65, -24] as [number, number],
          posicion: [-67.5, -23.72] as [number, number],
          nombre: "NORTE",
        },
        {
          id: "sur",
          inicio: [-70, -30] as [number, number],
          fin: [-65, -30] as [number, number],
          posicion: [-67.5, -30.28] as [number, number],
          nombre: "SUR",
        },
        {
          id: "oeste",
          inicio: [-70, -24] as [number, number],
          fin: [-70, -30] as [number, number],
          posicion: [-70.35, -27] as [number, number],
          nombre: "OESTE",
        },
        {
          id: "este",
          inicio: [-65, -24] as [number, number],
          fin: [-65, -30] as [number, number],
          posicion: [-64.65, -27] as [number, number],
          nombre: "ESTE",
        },
      ];

      ladosTon.forEach((lado) => {
        const distancia = distanciaLado(lado.inicio, lado.fin);
        const etiqueta = document.createElement("div");
        etiqueta.textContent = `${lado.nombre}: ${distancia.km.toFixed(
          0,
        )} km / ${distancia.mn.toFixed(0)} MN`;
        etiqueta.style.padding = "3px 7px";
        etiqueta.style.borderRadius = "6px";
        etiqueta.style.background = "rgba(127,29,29,0.88)";
        etiqueta.style.color = "#ffffff";
        etiqueta.style.fontSize = "11px";
        etiqueta.style.fontWeight = "800";
        etiqueta.style.whiteSpace = "nowrap";
        etiqueta.style.pointerEvents = "none";
        etiqueta.style.boxShadow = "0 2px 5px rgba(0,0,0,0.35)";

        const marker = new maplibregl.Marker({
          element: etiqueta,
          anchor: "center",
        })
          .setLngLat(lado.posicion)
          .addTo(map);

        dimensionesTonRef.current[lado.id] = marker;
      });

      map.addSource("medicion", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "medicion-linea",
        type: "line",
        source: "medicion",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#111827",
          "line-width": 4,
          "line-dasharray": [2, 1],
        },
      });

      map.addLayer({
        id: "medicion-puntos",
        type: "circle",
        source: "medicion",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#facc15",
          "circle-stroke-color": "#111827",
          "circle-stroke-width": 2,
        },
      });

      map.on("mousemove", (evento) => {
        setCoordenadasCursor({
          latitud: evento.lngLat.lat,
          longitud: evento.lngLat.lng,
        });
      });

      map.on("click", (evento) => {
        if (!modoMedicionRef.current) return;

        const nuevoPunto: PuntoMedicion = [
          evento.lngLat.lng,
          evento.lngLat.lat,
        ];

        setPuntosMedicion((anteriores) => {
          const nuevos = [...anteriores, nuevoPunto];
          const source = map.getSource("medicion") as
            maplibregl.GeoJSONSource | undefined;

          const features: GeoJSON.Feature[] = nuevos.map((coordenada) => ({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: coordenada,
            },
          }));

          let distancia = 0;

          if (nuevos.length >= 2) {
            const linea = lineString(nuevos);
            distancia = turfLength(linea, {
              units: "kilometers",
            });
            features.push(linea);
          }

          source?.setData({
            type: "FeatureCollection",
            features,
          });

          setDistanciaMedicionKm(distancia);
          return nuevos;
        });
      });

      map.addSource("anillos-operacionales", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "anillos-relleno",
        type: "fill",
        source: "anillos-operacionales",
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#7c3aed"],
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: "anillos-borde",
        type: "line",
        source: "anillos-operacionales",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#7c3aed"],
          "line-width": 2.5,
        },
      });

      // Fuerza una nueva sincronización de los datos persistidos una vez
      // que el estilo, las fuentes y las capas del mapa ya existen.
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      Object.values(elementosMarkersRef.current).forEach((marker) =>
        marker.remove(),
      );
      Object.values(etiquetasRef.current).forEach((marker) => marker.remove());
      Object.values(oceanosRef.current).forEach((marker) => marker.remove());
      Object.values(basesRef.current).forEach((marker) => marker.remove());
      coaeRef.current?.remove();
      Object.values(comunicacionesRef.current).forEach((marker) => marker.remove());
      laboratorioTritioRef.current?.remove();
      Object.values(dimensionesTonRef.current).forEach((marker) =>
        marker.remove(),
      );
      medicionMarkersRef.current.forEach((marker) => marker.remove());

      elementosMarkersRef.current = {};
      etiquetasRef.current = {};
      oceanosRef.current = {};
      basesRef.current = {};
      coaeRef.current = null;
      comunicacionesRef.current = {};
      laboratorioTritioRef.current = null;
      dimensionesTonRef.current = {};
      medicionMarkersRef.current = [];

      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    actualizarFuenteAnillos(elementos);

    elementos.forEach((elemento) => {
      const visibleTipo =
        elemento.tipo === "aeronave"
          ? mostrarAeronaves
          : elemento.tipo === "radar"
            ? mostrarRadares
            : mostrarDefensa;

      const visible =
        elemento.visible &&
        visibleTipo &&
        bandoVisible(elemento.bando, vistaFuerzas);

      const markerExistente = elementosMarkersRef.current[elemento.id];

      const distanciaKm = radioAereoRepresentado(elemento);

      const categoriaAeronave =
        elemento.tipo === "aeronave"
          ? datosIconoAeronave(elemento.nombre, elemento.descripcion).etiqueta
          : null;

      const imagenMedio =
        elemento.bando === "propio"
          ? obtenerImagenMedio(elemento.nombre)
          : null;

      const bloqueImagen = imagenMedio
        ? `
          <div style="width:100%;height:180px;background:#020617;border-bottom:1px solid #475569;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img
              src="${imagenMedio}"
              alt="${elemento.nombre}"
              style="display:block;width:100%;height:100%;object-fit:contain;background:#020617"
            />
          </div>
        `
        : "";

      const popupHtml = `
        <div style="font-family:Arial;color:#f8fafc;background:#0f172a;border-radius:8px;line-height:1.5;min-width:300px;overflow:hidden">
          ${bloqueImagen}
          <div style="padding:13px">
          <div style="font-size:16px;font-weight:800;color:${
            elemento.bando === "propio" ? "#93c5fd" : "#fdba74"
          }">${elemento.nombre}</div>
          <div style="margin-top:5px"><strong>Bando:</strong> ${
            elemento.bando === "propio" ? "PROPIO" : "ENEMIGO"
          }</div>
          <div><strong>Tipo:</strong> ${elemento.tipo}</div>
          ${
            categoriaAeronave
              ? `<div><strong>Categoría:</strong> ${categoriaAeronave}</div>`
              : ""
          }
          <div><strong>Base de origen:</strong> ${elemento.baseOrigen}</div>
          ${
            elemento.cantidad
              ? `<div><strong>Cantidad informada:</strong> ${elemento.cantidad}</div>`
              : ""
          }
          ${
            elemento.descripcion
              ? `<div><strong>Capacidad:</strong> ${elemento.descripcion}</div>`
              : ""
          }
          <div style="margin-top:7px;padding-top:7px;border-top:1px solid #475569">
            <strong>${
              elemento.tipo === "aeronave" ? (elemento.terminoDistancia ?? "Radio de acción") : "Alcance"
            }:</strong>
            ${distanciaKm > 0 ? formatearDistancia(distanciaKm) : "Sin definir"}
          </div>
          ${elemento.tipo === "aeronave" ? `
            <div style="margin-top:5px;color:${elemento.fuenteDistancia === "orden" ? "#86efac" : "#fca5a5"}">
              <strong>Origen:</strong> ${elemento.fuenteDistancia === "orden" ? "Orden de instrucción" : elemento.fuenteDistancia === "externa" ? "Referencia externa / estimación" : "Manual"}
            </div>
            <div style="font-size:11px;color:#cbd5e1">${elemento.referenciaDistancia ?? ""}</div>
            ${elemento.conReabastecimiento ? `<div style="margin-top:5px;color:#67e8f9"><strong>REV:</strong> activado; radio duplicado como hipótesis simplificada.</div>` : ""}
          ` : ""}
          ${
            elemento.bando === "propio" && !imagenMedio
              ? `<div style="margin-top:8px;font-size:11px;color:#94a3b8">Sin fotografía asociada en la presentación A3.</div>`
              : ""
          }
          </div>
        </div>
      `;

      if (markerExistente) {
        markerExistente.setLngLat([elemento.longitude, elemento.latitude]);
        markerExistente.getElement().style.display = visible ? "flex" : "none";
        markerExistente.setPopup(
          new maplibregl.Popup({
            offset: 25,
            maxWidth: "440px",
            className: "zeus-popup",
          }).setHTML(popupHtml),
        );
        return;
      }

      const marker = new maplibregl.Marker({
        element: crearIconoElemento(elemento),
        anchor: "center",
        draggable: !readOnly && !elemento.sharedExternal,
      })
        .setLngLat([elemento.longitude, elemento.latitude])
        .setPopup(
          new maplibregl.Popup({
            offset: 25,
            maxWidth: "440px",
            className: "zeus-popup",
          }).setHTML(popupHtml),
        )
        .addTo(map);

      marker.getElement().addEventListener("click", () => {
        setSeleccionadoId(elemento.id);
      });

      marker.on("drag", () => {
        if (readOnly || elemento.sharedExternal) return;
        const posicion = marker.getLngLat();

        setElementos((anteriores) =>
          anteriores.map((actual) =>
            actual.id === elemento.id
              ? {
                  ...actual,
                  longitude: posicion.lng,
                  latitude: posicion.lat,
                }
              : actual,
          ),
        );
      });

      marker.getElement().style.display = visible ? "flex" : "none";

      elementosMarkersRef.current[elemento.id] = marker;
    });

    Object.keys(elementosMarkersRef.current).forEach((id) => {
      const existe = elementos.some((elemento) => elemento.id === id);

      if (!existe) {
        elementosMarkersRef.current[id].remove();
        delete elementosMarkersRef.current[id];
      }
    });
  }, [
    elementos,
    vistaFuerzas,
    mostrarAeronaves,
    mostrarRadares,
    mostrarDefensa,
    mapReady,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    actualizarVisibilidadCapa(map, "republicas-relleno", mostrarRepublicas);
    actualizarVisibilidadCapa(map, "republicas-borde", mostrarRepublicas);

    Object.values(etiquetasRef.current).forEach((marker) => {
      marker.getElement().style.display = mostrarRepublicas ? "block" : "none";
    });
  }, [mostrarRepublicas, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    actualizarVisibilidadCapa(
      map,
      "paises-aledanos-relleno",
      mostrarEntornoGeografico,
    );
    actualizarVisibilidadCapa(
      map,
      "paises-aledanos-borde",
      mostrarEntornoGeografico,
    );

    Object.values(oceanosRef.current).forEach((marker) => {
      marker.getElement().style.display = mostrarEntornoGeografico
        ? "block"
        : "none";
    });
  }, [mostrarEntornoGeografico, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    actualizarVisibilidadCapa(map, "ton-relleno", mostrarTon);
    actualizarVisibilidadCapa(map, "ton-borde", mostrarTon);
  }, [mostrarTon, mapReady]);

  useEffect(() => {
    [...BASES_PROPIAS, ...BASES_ENEMIGAS].forEach((base) => {
      const marker = basesRef.current[base.nombre];
      if (!marker) return;

      const visible =
        mostrarBases &&
        Boolean(basesVisibles[base.nombre]) &&
        bandoVisible(base.bando, vistaFuerzas);

      marker.getElement().style.display = visible ? "flex" : "none";
    });
  }, [mostrarBases, vistaFuerzas, basesVisibles, mapReady]);

  useEffect(() => {
    Object.values(comunicacionesRef.current).forEach((marcador) => {
      marcador.getElement().style.display = mostrarComunicaciones ? "flex" : "none";
    });
  }, [mostrarComunicaciones, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    MASCARAS_RADAR.forEach((mascara) => {
      const visible =
        Boolean(mascarasVisibles[mascara.id]) &&
        bandoVisible(mascara.bando, vistaFuerzas);

      const capaRelleno = `${mascara.id}-relleno`;
      const capaBorde = `${mascara.id}-borde`;

      actualizarVisibilidadCapa(map, capaRelleno, visible);
      actualizarVisibilidadCapa(map, capaBorde, visible);

      // Las coberturas S-300 deben quedar por encima de los círculos nominales
      // y del relieve; de otro modo el anillo circular las tapa visualmente.
      if (visible && mascara.categoria === "defensa_antiaerea") {
        if (map.getLayer(capaRelleno)) map.moveLayer(capaRelleno);
        if (map.getLayer(capaBorde)) map.moveLayer(capaBorde);
      }
    });
  }, [mascarasVisibles, vistaFuerzas, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    MASCARAS_RADAR.forEach((mascara) => {
      const color = coloresMascaras[mascara.id] ?? mascara.color;
      if (map.getLayer(`${mascara.id}-relleno`)) {
        map.setPaintProperty(`${mascara.id}-relleno`, "fill-color", color);
      }
      if (map.getLayer(`${mascara.id}-borde`)) {
        map.setPaintProperty(`${mascara.id}-borde`, "line-color", color);
      }
    });
  }, [coloresMascaras, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("republicas-relleno"))
      return;

    const expresion: any[] = ["match", ["get", "republica"]];
    Object.entries(coloresRepublicas).forEach(([nombre, color]) => {
      expresion.push(nombre, color);
    });
    expresion.push("#94a3b8");
    map.setPaintProperty("republicas-relleno", "fill-color", expresion as any);
  }, [coloresRepublicas, mapReady]);

  function cambiarMascara(id: string, visible: boolean) {
    setMascarasVisibles((anteriores) => ({
      ...anteriores,
      [id]: visible,
    }));
  }

  function cambiarMascarasPorBando(bando: Bando, visible: boolean) {
    setMascarasVisibles((anteriores) => {
      const siguientes = { ...anteriores };

      MASCARAS_RADAR.filter((mascara) => mascara.bando === bando).forEach(
        (mascara) => {
          siguientes[mascara.id] = visible;
        },
      );

      return siguientes;
    });
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    actualizarVisibilidadCapa(map, "relieve-topografico", mostrarRelieve);
  }, [mostrarRelieve, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    actualizarVisibilidadCapa(map, "rios", mostrarRios);
  }, [mostrarRios, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("grilla-coordenadas") as
      maplibregl.GeoJSONSource | undefined;

    source?.setData(generarGrilla(intervaloGrilla));

    actualizarVisibilidadCapa(map, "grilla-coordenadas-lineas", mostrarGrilla);
    actualizarVisibilidadCapa(
      map,
      "grilla-coordenadas-etiquetas",
      mostrarGrilla,
    );
  }, [mostrarGrilla, intervaloGrilla, mapReady]);

  useEffect(() => {
    Object.values(dimensionesTonRef.current).forEach((marker) => {
      marker.getElement().style.display =
        mostrarTon && mostrarDimensionesTon ? "block" : "none";
    });
  }, [mostrarTon, mostrarDimensionesTon, mapReady]);

  function crearSnapshot(): ZeusMapSnapshot {
    const mapa = mapRef.current;
    const centro = mapa?.getCenter();

    return {
      mapState: {
        scenarioName: "Escenario principal",
        mapCenter: {
          longitude: centro?.lng ?? initialState?.mapCenter?.longitude ?? -63.5,
          latitude: centro?.lat ?? initialState?.mapCenter?.latitude ?? -38,
        },
        zoom: mapa?.getZoom() ?? initialState?.zoom ?? 3,
        bearing: mapa?.getBearing() ?? initialState?.bearing ?? 0,
        pitch: mapa?.getPitch() ?? initialState?.pitch ?? 0,
        visibleLayers: {
          republicas: mostrarRepublicas,
          entornoGeografico: mostrarEntornoGeografico,
          ton: mostrarTon,
          bases: mostrarBases,
          comunicaciones: mostrarComunicaciones,
          aeronaves: mostrarAeronaves,
          radares: mostrarRadares,
          defensa: mostrarDefensa,
          relieve: mostrarRelieve,
          rios: mostrarRios,
          grilla: mostrarGrilla,
          dimensionesTon: mostrarDimensionesTon,
        },
        panelOrder: ordenPaneles,
        settings: {
          vistaFuerzas,
          intervaloGrilla,
          mascarasVisibles,
          coloresMascaras,
          coloresRepublicas,
          basesVisibles,
        },
      },
      elements: elementos,
    };
  }

  async function guardarMapaCompleto() {
    if (readOnly || !onSave || guardandoMapa) return;

    setGuardandoMapa(true);
    setMensajeGuardado("Guardando cambios...");

    try {
      await onSave(crearSnapshot());
      setCambiosPendientes(false);
      setMensajeGuardado(
        `Cambios guardados a las ${new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      );
    } catch (error) {
      console.error("Error guardando el mapa:", error);
      setMensajeGuardado("No se pudieron guardar los cambios");
      throw error;
    } finally {
      setGuardandoMapa(false);
    }
  }

  const firmaElementosPropios = useMemo(
    () =>
      JSON.stringify(
        elementos.filter((elemento) => !elemento.sharedExternal),
      ),
    [elementos],
  );

  useEffect(() => {
    if (!seguimientoCambiosRef.current) {
      seguimientoCambiosRef.current = true;
      return;
    }

    if (!readOnly) {
      setCambiosPendientes(true);
      setMensajeGuardado("Cambios sin guardar");
    }
  }, [
    firmaElementosPropios,
    vistaFuerzas,
    mostrarRepublicas,
    mostrarEntornoGeografico,
    mostrarTon,
    mostrarBases,
    mostrarComunicaciones,
    mostrarAeronaves,
    mostrarRadares,
    mostrarDefensa,
    mostrarRelieve,
    mostrarRios,
    mostrarGrilla,
    intervaloGrilla,
    mostrarDimensionesTon,
    ordenPaneles,
    mascarasVisibles,
    coloresMascaras,
    coloresRepublicas,
    basesVisibles,
    readOnly,
  ]);

  useEffect(() => {
    const mapa = mapRef.current;
    if (!mapa || readOnly) return;

    const marcarCambio = () => {
      setCambiosPendientes(true);
      setMensajeGuardado("Cambios sin guardar");
    };

    mapa.on("moveend", marcarCambio);
    return () => {
      mapa.off("moveend", marcarCambio);
    };
  }, [readOnly]);

  function borrarMedicion() {
    setPuntosMedicion([]);
    setDistanciaMedicionKm(0);

    const map = mapRef.current;
    const source = map?.getSource("medicion") as
      maplibregl.GeoJSONSource | undefined;

    source?.setData({
      type: "FeatureCollection",
      features: [],
    });
  }

  return (
    <div className="flex h-screen w-screen">
      <aside className={`flex w-[420px] flex-col overflow-y-auto bg-slate-950 p-5 text-white ${readOnly ? "workspace-readonly" : ""}`}>
        <h1 className="mb-1 text-xl font-bold" style={{ order: -3 }}>
          EJERCICIO ZEUS (TO NORTE)
        </h1>
        {workspaceLabel && (
          <h2 className="mb-1 text-sm font-semibold text-cyan-300" style={{ order: -2 }}>
            {workspaceLabel}
          </h2>
        )}
        <p className="mb-1 text-xs text-slate-400" style={{ order: -1 }}>
          {workspaceDescription ??
            (readOnly
              ? "Podés consultar el mapa y navegar, pero no modificarlo."
              : "Arrastrá cualquier recuadro para ordenar el panel a tu gusto.")}
        </p>
        <p className="mb-3 text-[11px] text-slate-500" style={{ order: -1 }}>
          {readOnly
            ? "Acceso de consulta."
            : "Los paneles visibles corresponden al perfil de este espacio."}
        </p>

        <div className="sticky top-0 z-20 mb-4 rounded-lg border border-slate-700 bg-slate-950/95 p-3 shadow-lg" style={{ order: -1 }}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold ${cambiosPendientes ? "text-amber-300" : "text-emerald-300"}`}>
              {mensajeGuardado}
            </span>
            {!readOnly && onSave && (
              <button
                type="button"
                onClick={() => void guardarMapaCompleto()}
                disabled={guardandoMapa}
                className="rounded bg-cyan-700 px-3 py-2 text-xs font-bold hover:bg-cyan-600 disabled:opacity-50"
              >
                {guardandoMapa ? "Guardando..." : "Guardar cambios"}
              </button>
            )}
          </div>
        </div>

        <section {...propiedadesPanel("fuerzas")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">↕ Fuerzas visibles</h2>

          <select
            value={vistaFuerzas}
            onChange={(event) =>
              setVistaFuerzas(event.target.value as VistaFuerzas)
            }
            className="w-full rounded bg-slate-800 p-2"
          >
            <option value="propias">Fuerzas propias</option>
            <option value="enemigas">Fuerzas enemigas</option>
            <option value="ambas">Fuerzas propias y enemigas</option>
          </select>
        </section>

        <section {...propiedadesPanel("referencia")} className="mb-5 cursor-move rounded bg-slate-900 p-4 text-sm">
          <h2 className="mb-2 font-semibold">↕ Referencia de radios</h2>
          <div className="mb-2 flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-600" />Valor tomado de la orden de instrucción</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-600" />Referencia externa o estimación</div>
        </section>

        <section {...propiedadesPanel("capas")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">↕ Capas territoriales</h2>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarRepublicas}
              onChange={(event) => setMostrarRepublicas(event.target.checked)}
            />
            Repúblicas
          </label>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarEntornoGeografico}
              onChange={(event) =>
                setMostrarEntornoGeografico(event.target.checked)
              }
            />
            Países aledaños y océanos
          </label>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarTon}
              onChange={(event) => setMostrarTon(event.target.checked)}
            />
            Teatro de Operaciones Norte
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarBases}
              onChange={(event) => setMostrarBases(event.target.checked)}
            />
            Bases y estaciones
          </label>

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarComunicaciones}
              onChange={(event) =>
                setMostrarComunicaciones(event.target.checked)
              }
            />
            Grupos de Comunicaciones
          </label>

          <p className="mt-2 text-xs text-slate-400">
            El COAe de Río Cuarto permanece visible como punto fijo.
          </p>
        </section>

        <section {...propiedadesPanel("bases")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">↕ Bases y estaciones visibles</h2>

          {mostrarControlesPropios && (
            <div className="mb-4 rounded border border-blue-700 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-sm text-blue-300">Propias</strong>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => setBasesVisibles((a) => ({...a, ...Object.fromEntries(BASES_PROPIAS.map((b) => [b.nombre, true]))}))} className="rounded bg-blue-700 px-2 py-1">Todas</button>
                  <button type="button" onClick={() => setBasesVisibles((a) => ({...a, ...Object.fromEntries(BASES_PROPIAS.map((b) => [b.nombre, false]))}))} className="rounded bg-slate-700 px-2 py-1">Ninguna</button>
                </div>
              </div>
              {BASES_PROPIAS.map((base) => (
                <label key={base.nombre} className="mb-2 flex items-start gap-2 text-sm last:mb-0">
                  <input type="checkbox" checked={Boolean(basesVisibles[base.nombre])} onChange={(event) => setBasesVisibles((a) => ({ ...a, [base.nombre]: event.target.checked }))} />
                  <span>{base.nombre}</span>
                </label>
              ))}
            </div>
          )}

          {mostrarControlesEnemigos && (
            <div className="rounded border border-orange-700 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-sm text-orange-300">Enemigas</strong>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => setBasesVisibles((a) => ({...a, ...Object.fromEntries(BASES_ENEMIGAS.map((b) => [b.nombre, true]))}))} className="rounded bg-orange-700 px-2 py-1">Todas</button>
                  <button type="button" onClick={() => setBasesVisibles((a) => ({...a, ...Object.fromEntries(BASES_ENEMIGAS.map((b) => [b.nombre, false]))}))} className="rounded bg-slate-700 px-2 py-1">Ninguna</button>
                </div>
              </div>
              {BASES_ENEMIGAS.map((base) => (
                <label key={base.nombre} className="mb-2 flex items-start gap-2 text-sm last:mb-0">
                  <input type="checkbox" checked={Boolean(basesVisibles[base.nombre])} onChange={(event) => setBasesVisibles((a) => ({ ...a, [base.nombre]: event.target.checked }))} />
                  <span>{base.nombre}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section {...propiedadesPanel("mascaras")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">↕ Coberturas y máscaras</h2>

          {mostrarControlesPropios && (
            <div className="mb-4 rounded border border-blue-700 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-sm text-blue-300">Propias</strong>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => cambiarMascarasPorBando("propio", true)}
                    className="rounded bg-blue-700 px-2 py-1"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarMascarasPorBando("propio", false)}
                    className="rounded bg-slate-700 px-2 py-1"
                  >
                    Ninguna
                  </button>
                </div>
              </div>

              {MASCARAS_RADAR.filter(
                (mascara) => mascara.bando === "propio",
              ).map((mascara) => (
                <label
                  key={mascara.id}
                  className="mb-2 flex items-center gap-2 last:mb-0"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(mascarasVisibles[mascara.id])}
                    onChange={(event) =>
                      cambiarMascara(mascara.id, event.target.checked)
                    }
                  />
                  <span className="flex-1">{mascara.nombre}</span>
                  <input
                    type="color"
                    value={coloresMascaras[mascara.id] ?? mascara.color}
                    onChange={(event) =>
                      setColoresMascaras((anteriores) => ({
                        ...anteriores,
                        [mascara.id]: event.target.value,
                      }))
                    }
                    className="h-7 w-9 rounded border-0 bg-transparent"
                    title="Color de la máscara"
                  />
                </label>
              ))}
            </div>
          )}

          {mostrarControlesEnemigos && (
            <div className="rounded border border-orange-700 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-sm text-orange-300">Radar enemigas</strong>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => cambiarMascarasPorBando("enemigo", true)}
                    className="rounded bg-orange-700 px-2 py-1"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarMascarasPorBando("enemigo", false)}
                    className="rounded bg-slate-700 px-2 py-1"
                  >
                    Ninguna
                  </button>
                </div>
              </div>

              {MASCARAS_RADAR.filter(
                (mascara) =>
                  mascara.bando === "enemigo" &&
                  mascara.categoria !== "defensa_antiaerea",
              ).map((mascara) => (
                <label
                  key={mascara.id}
                  className="mb-2 flex items-center gap-2 last:mb-0"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(mascarasVisibles[mascara.id])}
                    onChange={(event) =>
                      cambiarMascara(mascara.id, event.target.checked)
                    }
                  />
                  <span className="flex-1">{mascara.nombre}</span>
                  <input
                    type="color"
                    value={coloresMascaras[mascara.id] ?? mascara.color}
                    onChange={(event) =>
                      setColoresMascaras((anteriores) => ({
                        ...anteriores,
                        [mascara.id]: event.target.value,
                      }))
                    }
                    className="h-7 w-9 rounded border-0 bg-transparent"
                    title="Color de la máscara"
                  />
                </label>
              ))}
            </div>
          )}

          {mostrarControlesEnemigos && (
            <div className="mt-4 rounded border border-red-700 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-sm text-red-300">Sistemas de defensa antiaérea enemigos</strong>
                  <p className="mt-1 text-xs text-slate-400">Coberturas reales importadas de los KMZ. Al activarlas se oculta el círculo nominal del S-300 para mostrar claramente la geometría irregular condicionada por el terreno.</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      MASCARAS_RADAR.filter((mascara) => mascara.categoria === "defensa_antiaerea").forEach((mascara) =>
                        cambiarMascara(mascara.id, true),
                      )
                    }
                    className="rounded bg-red-700 px-2 py-1"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      MASCARAS_RADAR.filter((mascara) => mascara.categoria === "defensa_antiaerea").forEach((mascara) =>
                        cambiarMascara(mascara.id, false),
                      )
                    }
                    className="rounded bg-slate-700 px-2 py-1"
                  >
                    Ninguna
                  </button>
                </div>
              </div>

              {MASCARAS_RADAR.filter(
                (mascara) => mascara.categoria === "defensa_antiaerea",
              ).map((mascara) => (
                <label
                  key={mascara.id}
                  className="mb-2 flex items-center gap-2 last:mb-0"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(mascarasVisibles[mascara.id])}
                    onChange={(event) =>
                      cambiarMascara(mascara.id, event.target.checked)
                    }
                  />
                  <span className="flex-1">{mascara.nombre}</span>
                  <input
                    type="color"
                    value={coloresMascaras[mascara.id] ?? mascara.color}
                    onChange={(event) =>
                      setColoresMascaras((anteriores) => ({
                        ...anteriores,
                        [mascara.id]: event.target.value,
                      }))
                    }
                    className="h-7 w-9 rounded border-0 bg-transparent"
                    title="Color de la cobertura"
                  />
                </label>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Las máscaras radar conservan sus archivos originales. La cobertura ALFA del S-300 fue corregida y trasladada al emplazamiento de Belén.
          </p>
        </section>

        <section {...propiedadesPanel("colores")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">↕ Colores de las repúblicas</h2>
          {Object.keys(COLORES_REPUBLICAS).map((nombre) => (
            <label
              key={nombre}
              className="mb-2 flex items-center gap-2 text-sm last:mb-0"
            >
              <input
                type="color"
                value={coloresRepublicas[nombre]}
                onChange={(event) =>
                  setColoresRepublicas((anteriores) => ({
                    ...anteriores,
                    [nombre]: event.target.value,
                  }))
                }
                className="h-7 w-9 rounded border-0 bg-transparent"
              />
              <span>{NOMBRES_CORTOS[nombre] ?? nombre}</span>
            </label>
          ))}
        </section>

        <section {...propiedadesPanel("cartografia")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">↕ Cartografía y coordenadas</h2>

          <button
            type="button"
            onClick={verTodoTerritorio}
            className="mb-4 w-full rounded bg-sky-700 px-3 py-2 text-sm font-semibold hover:bg-sky-600"
          >
            Ver todo el territorio
          </button>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarRelieve}
              onChange={(event) => setMostrarRelieve(event.target.checked)}
            />
            Relieve físico sin nombres
          </label>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarRios}
              onChange={(event) => setMostrarRios(event.target.checked)}
            />
            Ríos y cursos de agua
          </label>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarGrilla}
              onChange={(event) => setMostrarGrilla(event.target.checked)}
            />
            Cuadrícula de latitud y longitud
          </label>

          {mostrarGrilla && (
            <div className="mb-3">
              <label className="mb-1 block text-xs text-slate-300">
                Intervalo de la cuadrícula
              </label>
              <select
                value={intervaloGrilla}
                onChange={(event) =>
                  setIntervaloGrilla(Number(event.target.value))
                }
                className="w-full rounded bg-slate-800 p-2"
              >
                <option value={1}>1 grado</option>
                <option value={2}>2 grados</option>
                <option value={5}>5 grados</option>
              </select>
            </div>
          )}

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarDimensionesTon}
              onChange={(event) =>
                setMostrarDimensionesTon(event.target.checked)
              }
            />
            Mostrar medidas de los lados del TON
          </label>

          <div className="rounded bg-slate-800 p-3 text-xs">
            <div>
              Latitud: {Math.abs(coordenadasCursor.latitud).toFixed(4)}°{" "}
              {coordenadasCursor.latitud < 0 ? "S" : "N"}
            </div>
            <div>
              Longitud: {Math.abs(coordenadasCursor.longitud).toFixed(4)}°{" "}
              {coordenadasCursor.longitud < 0 ? "O" : "E"}
            </div>
          </div>
        </section>

        <section {...propiedadesPanel("medicion")} className="mb-5 cursor-move rounded border border-yellow-600 bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold text-yellow-300">
            ↕ Medición de distancias
          </h2>

          <button
            type="button"
            onClick={() => setModoMedicion((actual) => !actual)}
            className={`mb-2 w-full rounded px-3 py-2 font-semibold ${
              modoMedicion
                ? "bg-yellow-500 text-slate-950"
                : "bg-slate-700 text-white"
            }`}
          >
            {modoMedicion ? "Finalizar medición" : "Iniciar medición"}
          </button>

          <button
            type="button"
            onClick={borrarMedicion}
            className="mb-3 w-full rounded bg-slate-700 px-3 py-2 font-semibold"
          >
            Borrar medición
          </button>

          <div className="rounded bg-slate-800 p-3 text-sm">
            <div>
              Puntos: <strong>{puntosMedicion.length}</strong>
            </div>
            <div>
              Distancia:{" "}
              <strong>
                {distanciaMedicionKm.toFixed(2)} km /{" "}
                {(distanciaMedicionKm / 1.852).toFixed(2)} MN
              </strong>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Activá la herramienta y hacé clic sobre el mapa para trazar la
            distancia acumulada.
          </p>
        </section>

        <section {...propiedadesPanel("visibilidad")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">↕ Visibilidad de medios</h2>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarAeronaves}
              onChange={(event) => setMostrarAeronaves(event.target.checked)}
            />
            Aeronaves
          </label>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarRadares}
              onChange={(event) => setMostrarRadares(event.target.checked)}
            />
            Radares
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarDefensa}
              onChange={(event) => setMostrarDefensa(event.target.checked)}
            />
            Defensa antiaérea
          </label>
        </section>

        {mostrarControlesPropios && (
          <>
            <section className="mb-5 rounded border border-blue-700 bg-slate-900 p-4">
              <h2 className="mb-3 font-semibold text-blue-300">
                Aeronaves propias
              </h2>

              <select
                value={aeronavePropiaSeleccionada}
                onChange={(event) =>
                  setAeronavePropiaSeleccionada(event.target.value)
                }
                className="mb-2 w-full rounded bg-slate-800 p-2"
              >
                <option value="">Seleccionar aeronave propia</option>

                {Object.entries(AERONAVES_PROPIAS_POR_BASE).map(
                  ([base, aeronaves]) => (
                    <optgroup key={base} label={base}>
                      {aeronaves.map((aeronave) => {
                        const indice = CATALOGO_AERONAVES_PROPIAS.findIndex(
                          (item) =>
                            item.nombre === aeronave && item.base === base,
                        );

                        return (
                          <option key={`${base}-${aeronave}`} value={indice}>
                            {aeronave}
                            {CANTIDADES_AERONAVES_PROPIAS[`${base}|${aeronave}`]
                              ? ` — ${CANTIDADES_AERONAVES_PROPIAS[`${base}|${aeronave}`]} uds.`
                              : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                  ),
                )}
              </select>

              <button
                onClick={() =>
                  agregarAeronave(
                    CATALOGO_AERONAVES_PROPIAS,
                    aeronavePropiaSeleccionada,
                    () => setAeronavePropiaSeleccionada(""),
                  )
                }
                disabled={aeronavePropiaSeleccionada === ""}
                className="w-full rounded bg-blue-600 px-3 py-2 font-semibold disabled:bg-slate-700"
              >
                Agregar aeronave propia
              </button>
            </section>

            <section className="mb-5 rounded border border-violet-700 bg-slate-900 p-4">
              <h2 className="mb-3 font-semibold text-violet-300">
                Radares propios
              </h2>

              <select
                value={radarPropioSeleccionado}
                onChange={(event) =>
                  setRadarPropioSeleccionado(event.target.value)
                }
                className="mb-2 w-full rounded bg-slate-800 p-2"
              >
                <option value="">Seleccionar radar propio</option>

                {CATALOGO_RADARES_PROPIOS.map((medio, indice) => (
                  <option key={`${medio.nombre}-${medio.base}`} value={indice}>
                    {medio.nombre} — {medio.base}
                  </option>
                ))}
              </select>

              <button
                onClick={() =>
                  agregarMedio(
                    "radar",
                    CATALOGO_RADARES_PROPIOS,
                    radarPropioSeleccionado,
                    () => setRadarPropioSeleccionado(""),
                  )
                }
                disabled={radarPropioSeleccionado === ""}
                className="w-full rounded bg-violet-600 px-3 py-2 font-semibold disabled:bg-slate-700"
              >
                Agregar radar propio
              </button>
            </section>

            <section className="mb-5 rounded border border-red-700 bg-slate-900 p-4">
              <h2 className="mb-3 font-semibold text-red-300">
                Defensa antiaérea propia
              </h2>

              <select
                value={defensaPropiaSeleccionada}
                onChange={(event) =>
                  setDefensaPropiaSeleccionada(event.target.value)
                }
                className="mb-2 w-full rounded bg-slate-800 p-2"
              >
                <option value="">Seleccionar defensa propia</option>

                {CATALOGO_DEFENSA_PROPIA.map((medio, indice) => (
                  <option
                    key={`${medio.nombre}-${medio.base}-${indice}`}
                    value={indice}
                  >
                    {medio.nombre} — {medio.base}
                  </option>
                ))}
              </select>

              <button
                onClick={() =>
                  agregarMedio(
                    "defensa",
                    CATALOGO_DEFENSA_PROPIA,
                    defensaPropiaSeleccionada,
                    () => setDefensaPropiaSeleccionada(""),
                  )
                }
                disabled={defensaPropiaSeleccionada === ""}
                className="w-full rounded bg-red-700 px-3 py-2 font-semibold disabled:bg-slate-700"
              >
                Agregar defensa propia
              </button>
            </section>
          </>
        )}

        {mostrarControlesEnemigos && (
          <>
            <section className="mb-5 rounded border border-orange-600 bg-slate-900 p-4">
              <h2 className="mb-3 font-semibold text-orange-300">
                Aeronaves enemigas
              </h2>

              <select
                value={aeronaveEnemigaSeleccionada}
                onChange={(event) =>
                  setAeronaveEnemigaSeleccionada(event.target.value)
                }
                className="mb-2 w-full rounded bg-slate-800 p-2"
              >
                <option value="">Seleccionar aeronave enemiga</option>

                {Object.entries(AERONAVES_ENEMIGAS_POR_BASE).map(
                  ([base, aeronaves]) => (
                    <optgroup key={base} label={base}>
                      {aeronaves.map((aeronave) => {
                        const indice = CATALOGO_AERONAVES_ENEMIGAS.findIndex(
                          (item) =>
                            item.nombre === aeronave.nombre &&
                            item.base === base,
                        );

                        return (
                          <option
                            key={`${base}-${aeronave.nombre}`}
                            value={indice}
                          >
                            {aeronave.nombre}
                            {aeronave.cantidad
                              ? ` — ${aeronave.cantidad} uds.`
                              : " — cantidad no indicada"}
                          </option>
                        );
                      })}
                    </optgroup>
                  ),
                )}
              </select>

              <button
                onClick={() =>
                  agregarAeronave(
                    CATALOGO_AERONAVES_ENEMIGAS,
                    aeronaveEnemigaSeleccionada,
                    () => setAeronaveEnemigaSeleccionada(""),
                  )
                }
                disabled={aeronaveEnemigaSeleccionada === ""}
                className="w-full rounded bg-orange-600 px-3 py-2 font-semibold disabled:bg-slate-700"
              >
                Agregar aeronave enemiga
              </button>
            </section>

            <section className="mb-5 rounded border border-amber-600 bg-slate-900 p-4">
              <h2 className="mb-3 font-semibold text-amber-300">
                Radares enemigos
              </h2>

              <select
                value={radarEnemigoSeleccionado}
                onChange={(event) =>
                  setRadarEnemigoSeleccionado(event.target.value)
                }
                className="mb-2 w-full rounded bg-slate-800 p-2"
              >
                <option value="">Seleccionar radar enemigo</option>

                {CATALOGO_RADARES_ENEMIGOS.map((medio, indice) => (
                  <option key={`${medio.nombre}-${medio.base}`} value={indice}>
                    {medio.nombre} — {medio.base}
                  </option>
                ))}
              </select>

              <button
                onClick={() =>
                  agregarMedio(
                    "radar",
                    CATALOGO_RADARES_ENEMIGOS,
                    radarEnemigoSeleccionado,
                    () => setRadarEnemigoSeleccionado(""),
                  )
                }
                disabled={radarEnemigoSeleccionado === ""}
                className="w-full rounded bg-amber-600 px-3 py-2 font-semibold disabled:bg-slate-700"
              >
                Agregar radar enemigo
              </button>
            </section>

            <section className="mb-5 rounded border border-red-900 bg-slate-900 p-4">
              <h2 className="mb-3 font-semibold text-red-400">
                Defensa antiaérea enemiga
              </h2>

              <select
                value={defensaEnemigaSeleccionada}
                onChange={(event) =>
                  setDefensaEnemigaSeleccionada(event.target.value)
                }
                className="mb-2 w-full rounded bg-slate-800 p-2"
              >
                <option value="">Seleccionar defensa enemiga</option>

                {CATALOGO_DEFENSA_ENEMIGA.map((medio, indice) => (
                  <option
                    key={`${medio.nombre}-${medio.base}-${indice}`}
                    value={indice}
                  >
                    {medio.nombre} — {medio.base}
                  </option>
                ))}
              </select>

              <button
                onClick={() =>
                  agregarMedio(
                    "defensa",
                    CATALOGO_DEFENSA_ENEMIGA,
                    defensaEnemigaSeleccionada,
                    () => setDefensaEnemigaSeleccionada(""),
                  )
                }
                disabled={defensaEnemigaSeleccionada === ""}
                className="w-full rounded bg-red-900 px-3 py-2 font-semibold disabled:bg-slate-700"
              >
                Agregar defensa enemiga
              </button>
            </section>
          </>
        )}

        {errorGeoJson && (
          <div className="mb-5 rounded border border-red-500 bg-red-950 p-3 text-sm">
            <strong>Error del GeoJSON:</strong>
            <br />
            {errorGeoJson}
          </div>
        )}

        <section {...propiedadesPanel("elementos")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">↕ Elementos visibles</h2>
          {elementos.length === 0 ? (
            <p className="text-xs text-slate-400">
              Todavía no agregaste medios.
            </p>
          ) : (
            elementos
              .filter((elemento) => bandoVisible(elemento.bando, vistaFuerzas))
              .map((elemento) => (
                <label
                  key={elemento.id}
                  className="mb-2 flex items-start gap-2 text-sm last:mb-0"
                >
                  <input
                    type="checkbox"
                    checked={elemento.visible}
                    onChange={(event) =>
                      actualizarElemento(elemento.id, {
                        visible: event.target.checked,
                      })
                    }
                  />
                  <span>
                    {elemento.nombre} — {elemento.baseOrigen}
                  </span>
                </label>
              ))
          )}
        </section>

        <section {...propiedadesPanel("personalizado")} className="mb-5 cursor-move rounded border border-emerald-700 bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold text-emerald-300">
            ↕ Agregar medio personalizado
          </h2>

          <label className="mb-1 block text-xs font-semibold text-slate-300">
            Nombre del medio
          </label>
          <input
            value={nombrePersonalizado}
            onChange={(event) => setNombrePersonalizado(event.target.value)}
            placeholder="Escribí el nombre del medio"
            className="mb-3 w-full rounded bg-slate-800 p-2"
          />

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Tipo de medio
              </label>
              <select
                value={tipoPersonalizado}
                onChange={(event) =>
                  setTipoPersonalizado(event.target.value as TipoElemento)
                }
                className="w-full rounded bg-slate-800 p-2"
              >
                <option value="aeronave">Aeronave / medio aéreo</option>
                <option value="radar">Radar / sensor</option>
                <option value="defensa">Defensa antiaérea</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Bando
              </label>
              <select
                value={bandoPersonalizado}
                onChange={(event) => {
                  const bando = event.target.value as Bando;
                  setBandoPersonalizado(bando);
                  const bases =
                    bando === "propio" ? BASES_PROPIAS : BASES_ENEMIGAS;
                  setBasePersonalizada(bases[0]?.nombre ?? "");
                }}
                className="w-full rounded bg-slate-800 p-2"
              >
                <option value="propio">Propio</option>
                <option value="enemigo">Enemigo</option>
              </select>
            </div>
          </div>

          <label className="mb-1 block text-xs font-semibold text-slate-300">
            Base o ubicación inicial
          </label>
          <select
            value={basePersonalizada}
            onChange={(event) => setBasePersonalizada(event.target.value)}
            className="mb-3 w-full rounded bg-slate-800 p-2"
          >
            {(bandoPersonalizado === "propio"
              ? BASES_PROPIAS
              : BASES_ENEMIGAS
            ).map((base) => (
              <option key={base.nombre} value={base.nombre}>
                {base.nombre}
              </option>
            ))}
          </select>

          <div className="mb-3 grid grid-cols-[1fr_76px] gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Radio o alcance
              </label>
              <input
                type="number"
                min={0}
                value={alcancePersonalizado}
                onChange={(event) =>
                  setAlcancePersonalizado(
                    Math.max(0, Number(event.target.value)),
                  )
                }
                placeholder="Kilómetros"
                className="w-full rounded bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Color
              </label>
              <input
                type="color"
                value={colorPersonalizado}
                onChange={(event) => setColorPersonalizado(event.target.value)}
                className="h-10 w-full rounded"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMostrarSelectorIconos((actual) => !actual)}
            className="mb-2 w-full rounded bg-slate-700 px-3 py-2 text-sm font-semibold"
          >
            {mostrarSelectorIconos
              ? "Ocultar catálogo de iconos"
              : "Elegir icono del catálogo"}
          </button>

          {mostrarSelectorIconos && (
            <div className="mb-3 rounded bg-slate-800 p-3">
              <input
                value={busquedaIcono}
                onChange={(event) => setBusquedaIcono(event.target.value)}
                placeholder="Buscar icono por nombre"
                className="mb-2 w-full rounded bg-slate-700 p-2 text-sm"
              />

              <select
                value={iconoTipoPersonalizado}
                onChange={(event) =>
                  setIconoTipoPersonalizado(event.target.value)
                }
                size={8}
                className="mb-2 w-full rounded bg-slate-700 p-2 text-sm"
              >
                <option value="personalizado">
                  Selección automática según el tipo
                </option>
                {iconosFiltrados.map((icono) => (
                  <option key={icono.archivo} value={icono.archivo}>
                    {icono.nombre} — {icono.afiliacion}
                  </option>
                ))}
              </select>

              {iconoTipoPersonalizado.endsWith(".png") && (
                <div className="flex items-center gap-3 rounded bg-slate-900 p-2">
                  <img
                    src={`/data/iconos/simbologia/${iconoTipoPersonalizado}`}
                    alt="Vista previa del icono"
                    className="h-14 w-14 object-contain"
                  />
                  <span className="break-all text-xs text-slate-300">
                    {iconoTipoPersonalizado}
                  </span>
                </div>
              )}
            </div>
          )}

          <label className="mb-2 block text-xs text-slate-300">
            Imagen opcional para el cuadro de información
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const archivo = event.target.files?.[0];
              if (!archivo) return;
              const lector = new FileReader();
              lector.onload = () =>
                setIconoPersonalizado(
                  typeof lector.result === "string" ? lector.result : undefined,
                );
              lector.readAsDataURL(archivo);
            }}
            className="mb-3 w-full text-xs"
          />

          <button
            type="button"
            onClick={agregarMedioPersonalizado}
            disabled={!nombrePersonalizado.trim()}
            className="w-full rounded bg-emerald-700 px-3 py-2 font-semibold disabled:bg-slate-700"
          >
            Agregar medio personalizado
          </button>
        </section>

        <section {...propiedadesPanel("desplegados")} className="mb-5 cursor-move rounded bg-slate-900 p-4">
          <label className="mb-2 block text-sm font-semibold">
            ↕ Elementos desplegados
          </label>

          <select
            value={seleccionadoId ?? ""}
            onChange={(event) => setSeleccionadoId(event.target.value || null)}
            className="w-full rounded bg-slate-800 p-2"
          >
            <option value="">Seleccionar elemento</option>

            {elementos
              .filter((elemento) => bandoVisible(elemento.bando, vistaFuerzas))
              .map((elemento) => (
                <option key={elemento.id} value={elemento.id}>
                  {elemento.bando === "propio" ? "PROPIO" : "ENEMIGO"} —{" "}
                  {elemento.tipo.toUpperCase()} — {elemento.nombre}
                </option>
              ))}
          </select>
        </section>

        {seleccionado?.sharedExternal && (
          <section className="mb-5 rounded border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-200">
            <p className="font-semibold">Elemento compartido por {seleccionado.originWorkspaceCode?.toUpperCase() ?? "otra célula"}</p>
            <p className="mt-1 text-xs">Se muestra en la vista consolidada. No se guarda ni modifica desde este espacio.</p>
          </section>
        )}

        {workspaceCode === "a3" && seleccionado && !seleccionado.sharedExternal && (
          <section {...propiedadesPanel("operaciones")} className="mb-5 space-y-4 rounded border border-cyan-900 bg-slate-900 p-4">
            <h2 className="font-semibold text-cyan-300">Ficha de operaciones</h2>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Misión / efecto</span><input value={seleccionado.operationMission ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { operationMission: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm"><span className="mb-1 block text-slate-300">Fase</span><input value={seleccionado.operationPhase ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { operationPhase: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
              <label className="block text-sm"><span className="mb-1 block text-slate-300">Prioridad</span><select value={seleccionado.operationPriority ?? "normal"} onChange={(e) => actualizarElemento(seleccionado.id, { operationPriority: e.target.value })} className="w-full rounded bg-slate-800 p-2"><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
            </div>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Tarea</span><input value={seleccionado.operationTask ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { operationTask: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm"><span className="mb-1 block text-slate-300">Inicio</span><input type="datetime-local" value={seleccionado.operationStart ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { operationStart: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label><label className="block text-sm"><span className="mb-1 block text-slate-300">Fin</span><input type="datetime-local" value={seleccionado.operationEnd ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { operationEnd: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label></div>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Indicativo</span><input value={seleccionado.callSign ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { callSign: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Observaciones</span><textarea rows={3} value={seleccionado.operationNotes ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { operationNotes: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
          </section>
        )}

        {workspaceCode === "a1" && seleccionado && !seleccionado.sharedExternal && (
          <section {...propiedadesPanel("personal")} className="mb-5 space-y-4 rounded border border-pink-900 bg-slate-900 p-4">
            <h2 className="font-semibold text-pink-300">Situación de personal</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm"><span className="mb-1 block text-slate-300">Asignados</span><input type="number" min="0" value={seleccionado.personnelAssigned ?? 0} onChange={(e) => actualizarElemento(seleccionado.id, { personnelAssigned: Number(e.target.value) })} className="w-full rounded bg-slate-800 p-2" /></label>
              <label className="block text-sm"><span className="mb-1 block text-slate-300">Disponibles</span><input type="number" min="0" value={seleccionado.personnelAvailable ?? 0} onChange={(e) => actualizarElemento(seleccionado.id, { personnelAvailable: Number(e.target.value) })} className="w-full rounded bg-slate-800 p-2" /></label>
              <label className="block text-sm"><span className="mb-1 block text-slate-300">Bajas</span><input type="number" min="0" value={seleccionado.personnelCasualties ?? 0} onChange={(e) => actualizarElemento(seleccionado.id, { personnelCasualties: Number(e.target.value) })} className="w-full rounded bg-slate-800 p-2" /></label>
              <label className="block text-sm"><span className="mb-1 block text-slate-300">Reemplazos</span><input type="number" min="0" value={seleccionado.personnelReplacements ?? 0} onChange={(e) => actualizarElemento(seleccionado.id, { personnelReplacements: Number(e.target.value) })} className="w-full rounded bg-slate-800 p-2" /></label>
            </div>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Estado sanitario</span><select value={seleccionado.medicalStatus ?? "normal"} onChange={(e) => actualizarElemento(seleccionado.id, { medicalStatus: e.target.value })} className="w-full rounded bg-slate-800 p-2"><option value="normal">Normal</option><option value="degradado">Degradado</option><option value="critico">Crítico</option></select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seleccionado.evacuationRequired ?? false} onChange={(e) => actualizarElemento(seleccionado.id, { evacuationRequired: e.target.checked })} /> Requiere evacuación sanitaria</label>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Novedades</span><textarea rows={3} value={seleccionado.personnelNotes ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { personnelNotes: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
          </section>
        )}

        {workspaceCode === "a4" && seleccionado && !seleccionado.sharedExternal && (
          <section {...propiedadesPanel("logistica")} className="mb-5 space-y-4 rounded border border-emerald-900 bg-slate-900 p-4">
            <h2 className="font-semibold text-emerald-300">Situación logística</h2>
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm"><span className="mb-1 block text-slate-300">Combustible %</span><input type="number" min="0" max="100" value={seleccionado.fuelPercent ?? 0} onChange={(e) => actualizarElemento(seleccionado.id, { fuelPercent: Number(e.target.value) })} className="w-full rounded bg-slate-800 p-2" /></label><label className="block text-sm"><span className="mb-1 block text-slate-300">Armamento %</span><input type="number" min="0" max="100" value={seleccionado.ammunitionPercent ?? 0} onChange={(e) => actualizarElemento(seleccionado.id, { ammunitionPercent: Number(e.target.value) })} className="w-full rounded bg-slate-800 p-2" /></label></div>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Estado del material</span><select value={seleccionado.materialStatus ?? "operativo"} onChange={(e) => actualizarElemento(seleccionado.id, { materialStatus: e.target.value })} className="w-full rounded bg-slate-800 p-2"><option value="operativo">Operativo</option><option value="degradado">Degradado</option><option value="no_operativo">No operativo</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Transportes disponibles</span><input type="number" min="0" value={seleccionado.transportAvailable ?? 0} onChange={(e) => actualizarElemento(seleccionado.id, { transportAvailable: Number(e.target.value) })} className="w-full rounded bg-slate-800 p-2" /></label>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Prioridad de reabastecimiento</span><select value={seleccionado.resupplyPriority ?? "normal"} onChange={(e) => actualizarElemento(seleccionado.id, { resupplyPriority: e.target.value })} className="w-full rounded bg-slate-800 p-2"><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Observaciones logísticas</span><textarea rows={3} value={seleccionado.logisticsNotes ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { logisticsNotes: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
          </section>
        )}

        {workspaceCode === "a5" && seleccionado && !seleccionado.sharedExternal && (
          <section {...propiedadesPanel("comunicaciones")} className="mb-5 space-y-4 rounded border border-sky-900 bg-slate-900 p-4">
            <h2 className="font-semibold text-sky-300">Situación de comunicaciones</h2>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Tipo de nodo</span><input value={seleccionado.communicationNodeType ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { communicationNodeType: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm"><span className="mb-1 block text-slate-300">Red</span><input value={seleccionado.networkName ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { networkName: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label><label className="block text-sm"><span className="mb-1 block text-slate-300">Frecuencia / canal</span><input value={seleccionado.frequency ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { frequency: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label></div>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Estado del enlace</span><select value={seleccionado.linkStatus ?? "operativo"} onChange={(e) => actualizarElemento(seleccionado.id, { linkStatus: e.target.value })} className="w-full rounded bg-slate-800 p-2"><option value="operativo">Operativo</option><option value="degradado">Degradado</option><option value="interrumpido">Interrumpido</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Cobertura (km)</span><input type="number" min="0" value={seleccionado.coverageKm ?? 0} onChange={(e) => actualizarElemento(seleccionado.id, { coverageKm: Number(e.target.value) })} className="w-full rounded bg-slate-800 p-2" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm"><span className="mb-1 block text-slate-300">Cifrado</span><input value={seleccionado.encryptionStatus ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { encryptionStatus: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label><label className="block text-sm"><span className="mb-1 block text-slate-300">Redundancia</span><input value={seleccionado.redundancy ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { redundancy: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label></div>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Observaciones</span><textarea rows={3} value={seleccionado.communicationsNotes ?? ""} onChange={(e) => actualizarElemento(seleccionado.id, { communicationsNotes: e.target.value })} className="w-full rounded bg-slate-800 p-2" /></label>
          </section>
        )}

        {workspaceCode === "a2" && seleccionado && seleccionado.bando === "enemigo" && (
          <section {...propiedadesPanel("inteligencia")} className="mb-5 space-y-4 rounded border border-red-900 bg-slate-900 p-4">
            <h2 className="font-semibold text-red-300">Información de inteligencia</h2>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Estado del dato</span>
              <select
                value={seleccionado.intelligenceStatus ?? "pendiente"}
                onChange={(event) => actualizarElemento(seleccionado.id, { intelligenceStatus: event.target.value as EstadoInteligencia })}
                className="w-full rounded bg-slate-800 p-2"
              >
                <option value="pendiente">Pendiente</option>
                <option value="estimado">Estimado</option>
                <option value="probable">Probable</option>
                <option value="confirmado">Confirmado</option>
                <option value="descartado">Descartado</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Nivel de confianza</span>
              <select
                value={seleccionado.confidenceLevel ?? "media"}
                onChange={(event) => actualizarElemento(seleccionado.id, { confidenceLevel: event.target.value as NivelConfianza })}
                className="w-full rounded bg-slate-800 p-2"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Fecha y hora de la información</span>
              <input
                type="datetime-local"
                value={seleccionado.informationDate ? seleccionado.informationDate.slice(0, 16) : ""}
                onChange={(event) => actualizarElemento(seleccionado.id, { informationDate: event.target.value ? new Date(event.target.value).toISOString() : undefined })}
                className="w-full rounded bg-slate-800 p-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Fuente</span>
              <input
                type="text"
                value={seleccionado.sourceDescription ?? ""}
                onChange={(event) => actualizarElemento(seleccionado.id, { sourceDescription: event.target.value })}
                placeholder="Descripción general de la fuente"
                className="w-full rounded bg-slate-800 p-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Observaciones de inteligencia</span>
              <textarea
                value={seleccionado.intelligenceNotes ?? ""}
                onChange={(event) => actualizarElemento(seleccionado.id, { intelligenceNotes: event.target.value })}
                rows={4}
                className="w-full rounded bg-slate-800 p-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Clasificación</span>
              <select
                value={seleccionado.classification ?? "uso_interno"}
                onChange={(event) => actualizarElemento(seleccionado.id, { classification: event.target.value as ClasificacionInteligencia })}
                className="w-full rounded bg-slate-800 p-2"
              >
                <option value="uso_interno">Uso interno</option>
                <option value="compartible">Compartible</option>
                <option value="restringido">Restringido</option>
              </select>
            </label>

            <div className="space-y-2 rounded bg-slate-800 p-3 text-sm">
              <p className="font-semibold">Compartir con</p>
              <label className="flex items-center gap-2"><input type="checkbox" checked={seleccionado.sharedWithCommander ?? false} onChange={(event) => actualizarElemento(seleccionado.id, { sharedWithCommander: event.target.checked })} /> Comandante</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={seleccionado.sharedWithJem ?? false} onChange={(event) => actualizarElemento(seleccionado.id, { sharedWithJem: event.target.checked })} /> JEM</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={seleccionado.sharedWithOtherCells ?? false} onChange={(event) => actualizarElemento(seleccionado.id, { sharedWithOtherCells: event.target.checked })} /> Otras células</label>
              {seleccionado.classification === "restringido" && (
                <p className="text-xs text-amber-300">Los elementos restringidos no serán compartidos aunque las casillas estén marcadas.</p>
              )}
            </div>
          </section>
        )}

        {seleccionado && ["a1", "a2", "a3", "a4", "a5"].includes(workspaceCode ?? "") && !seleccionado.sharedExternal && (
          <section {...propiedadesPanel("compartir")} className="mb-5 space-y-3 rounded border border-violet-900 bg-slate-900 p-4">
            <h2 className="font-semibold text-violet-300">Compartición del elemento</h2>
            <label className="block text-sm"><span className="mb-1 block text-slate-300">Clasificación</span><select value={seleccionado.classification ?? "uso_interno"} onChange={(e) => actualizarElemento(seleccionado.id, { classification: e.target.value as ClasificacionInteligencia })} className="w-full rounded bg-slate-800 p-2"><option value="uso_interno">Uso interno</option><option value="compartible">Compartible</option><option value="restringido">Restringido</option></select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seleccionado.sharedWithCommander ?? false} onChange={(e) => actualizarElemento(seleccionado.id, { sharedWithCommander: e.target.checked })} /> Compartir con Comandante</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seleccionado.sharedWithJem ?? false} onChange={(e) => actualizarElemento(seleccionado.id, { sharedWithJem: e.target.checked })} /> Compartir con JEM</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seleccionado.sharedWithOtherCells ?? false} onChange={(e) => actualizarElemento(seleccionado.id, { sharedWithOtherCells: e.target.checked })} /> Compartir con otras células</label>
            {seleccionado.classification === "restringido" && <p className="text-xs text-amber-300">La clasificación restringida anula toda compartición al guardar.</p>}
          </section>
        )}

        {seleccionado && (
          <section className="space-y-4 rounded bg-slate-900 p-4">
            <h2 className="font-semibold">Propiedades</h2>

            <div className="rounded bg-slate-800 p-3 text-sm">
              <p>
                <strong>Bando:</strong>{" "}
                {seleccionado.bando === "propio" ? "PROPIO" : "ENEMIGO"}
              </p>
              <p>
                <strong>Medio:</strong> {seleccionado.nombre}
              </p>
              <p>
                <strong>Tipo:</strong> {seleccionado.tipo}
              </p>
              <p>
                <strong>Base de origen:</strong> {seleccionado.baseOrigen}
              </p>
              {seleccionado.cantidad && (
                <p>
                  <strong>Cantidad informada:</strong> {seleccionado.cantidad}
                </p>
              )}
              {seleccionado.descripcion && (
                <p>
                  <strong>Capacidad:</strong> {seleccionado.descripcion}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={seleccionado.visible}
                onChange={(event) =>
                  actualizarElemento(seleccionado.id, {
                    visible: event.target.checked,
                  })
                }
              />
              Mostrar este elemento
            </label>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                {seleccionado.tipo === "aeronave"
                  ? (seleccionado.terminoDistancia ?? "Radio de acción")
                  : "Alcance"}
              </label>

              <div className="mb-3 rounded border border-slate-600 bg-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-200">
                    Distancia representada
                  </span>
                  <span className="rounded bg-slate-950 px-2 py-1 font-mono text-cyan-300">
                    {formatearDistancia(
                      seleccionado.tipo === "aeronave"
                        ? radioAereoRepresentado(seleccionado)
                        : seleccionado.alcanceKm,
                    )}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={obtenerMaximoSlider(seleccionado)}
                  step={seleccionado.tipo === "defensa" ? 0.5 : 5}
                  value={
                    seleccionado.tipo === "aeronave"
                      ? seleccionado.radioCombateKm
                      : seleccionado.alcanceKm
                  }
                  onChange={(event) => {
                    const valor = Math.max(0, Number(event.target.value));

                    actualizarElemento(
                      seleccionado.id,
                      seleccionado.tipo === "aeronave"
                        ? { radioCombateKm: valor }
                        : { alcanceKm: valor },
                    );
                  }}
                  className="w-full cursor-pointer accent-cyan-500"
                />

                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>0 km</span>
                  <span>
                    {formatearDistancia(obtenerMaximoSlider(seleccionado))}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={seleccionado.tipo === "defensa" ? 0.5 : 1}
                  value={
                    seleccionado.tipo === "aeronave"
                      ? seleccionado.radioCombateKm
                      : seleccionado.alcanceKm
                  }
                  onChange={(event) => {
                    const valor = Math.max(0, Number(event.target.value));

                    actualizarElemento(
                      seleccionado.id,
                      seleccionado.tipo === "aeronave"
                        ? { radioCombateKm: valor }
                        : { alcanceKm: valor },
                    );
                  }}
                  className="w-full rounded bg-slate-800 p-2"
                />
                <span className="whitespace-nowrap text-sm">km / MN</span>
              </div>
            </div>

            {seleccionado.tipo === "aeronave" && (
              <div className={`rounded border p-3 text-sm ${seleccionado.fuenteDistancia === "orden" ? "border-green-600 bg-green-950/40" : "border-red-600 bg-red-950/40"}`}>
                <p className={seleccionado.fuenteDistancia === "orden" ? "text-green-300" : "text-red-300"}>
                  <strong>Origen del valor:</strong>{" "}
                  {seleccionado.fuenteDistancia === "orden" ? "Orden de instrucción" : seleccionado.fuenteDistancia === "externa" ? "Referencia externa / estimación" : "Carga manual"}
                </p>
                <p className="mt-1 text-xs text-slate-300">{seleccionado.referenciaDistancia}</p>
                {seleccionado.permiteReabastecimiento && (
                  <label className="mt-3 flex items-center gap-2 text-cyan-200">
                    <input
                      type="checkbox"
                      checked={Boolean(seleccionado.conReabastecimiento)}
                      onChange={(event) => actualizarElemento(seleccionado.id, { conReabastecimiento: event.target.checked })}
                    />
                    Con reabastecimiento en vuelo: duplicar radio de acción
                  </label>
                )}
                {seleccionado.conReabastecimiento && (
                  <p className="mt-2 text-xs text-cyan-300">Radio representado con REV: {formatearDistancia(radioAereoRepresentado(seleccionado))}. Es una hipótesis simplificada de planeamiento.</p>
                )}
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={seleccionado.mostrarAnillo}
                disabled={
                  seleccionado.tipo === "aeronave" &&
                  seleccionado.radioCombateKm <= 0
                }
                onChange={(event) =>
                  actualizarElemento(seleccionado.id, {
                    mostrarAnillo: event.target.checked,
                  })
                }
              />

              {seleccionado.tipo === "aeronave"
                ? `Mostrar alcance nominal circular (${seleccionado.terminoDistancia ?? "radio de acción"})`
                : "Mostrar anillo de alcance"}
            </label>

            <div>
              <label className="mb-1 block text-sm">Color del anillo</label>

              <input
                type="color"
                value={seleccionado.color}
                onChange={(event) =>
                  actualizarElemento(seleccionado.id, {
                    color: event.target.value,
                  })
                }
                className="h-10 w-full rounded"
              />
            </div>

            <div className="rounded bg-slate-800 p-3 text-sm">
              <p>
                <strong>Latitud:</strong> {seleccionado.latitude.toFixed(5)}
              </p>
              <p>
                <strong>Longitud:</strong> {seleccionado.longitude.toFixed(5)}
              </p>
            </div>

            <button
              onClick={() => eliminarElemento(seleccionado.id)}
              className="w-full rounded bg-red-800 px-3 py-2 font-semibold hover:bg-red-700"
            >
              Eliminar elemento
            </button>
          </section>
        )}
      </aside>

      <div ref={mapContainer} className="h-full flex-1" />

      <style jsx global>{`
        .zeus-popup .maplibregl-popup-content {
          background: #0f172a !important;
          color: #f8fafc !important;
          border: 1px solid #475569;
          border-radius: 10px;
          padding: 0 !important;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
        }

        .zeus-popup .maplibregl-popup-tip {
          border-top-color: #0f172a !important;
          border-bottom-color: #0f172a !important;
        }

        .zeus-popup .maplibregl-popup-close-button {
          color: #f8fafc;
          font-size: 20px;
          padding: 4px 8px;
          z-index: 2;
        }

        .zeus-popup .maplibregl-popup-close-button:hover {
          background: #334155;
          border-radius: 6px;
        }

        .workspace-readonly input,
        .workspace-readonly select,
        .workspace-readonly button,
        .workspace-readonly [draggable="true"] {
          pointer-events: none !important;
          opacity: 0.72;
        }
      `}</style>
    </div>
  );
}
