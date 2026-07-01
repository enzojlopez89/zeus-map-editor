"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { circle } from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";

type Bando = "propio" | "enemigo";
type VistaFuerzas = "propias" | "enemigas" | "ambas";
type TipoElemento = "aeronave" | "radar" | "defensa";

type ElementoOperacional = {
  id: string;
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
};

type BaseMilitar = {
  nombre: string;
  longitude: number;
  latitude: number;
  bando: Bando;
  tipo: "Base aérea" | "Estación radar" | "Centro de comando";
};

type MascaraRadar = {
  id: string;
  nombre: string;
  archivo: string;
  bando: Bando;
  base: string;
  color: string;
};

type AeronaveCatalogo = {
  nombre: string;
  base: string;
  bando: Bando;
  cantidad?: number;
  descripcion?: string;
};

type MedioCatalogo = {
  nombre: string;
  base: string;
  bando: Bando;
  alcanceKm: number;
  cantidad?: number;
  descripcion?: string;
};

type PropiedadesRepublica = {
  republica: string;
  color?: string;
};

type GeoJsonRepublicas = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  PropiedadesRepublica
>;

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
];

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
    latitude: -28.60,
    bando: "enemigo",
    tipo: "Base aérea",
  },
  {
    nombre: "Ala Aérea n.º 5 / Tucumán",
    longitude: -65.10,
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
    latitude: -23.156410,
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
    { nombre: "KAI KT-1", descripcion: "Escuadrones Aéreos Escuela 1 y 2; cantidad no indicada en la orden" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Enlace" },
    { nombre: "UH-1N", cantidad: 2, descripcion: "Búsqueda y salvamento" },
  ],
  "Ala Aérea n.º 3 / Salta": [
    { nombre: "Mirage 2000-5 Mk2", cantidad: 12, descripcion: "Caza multirrol" },
    { nombre: "AS-725 Cougar", cantidad: 4, descripcion: "Asalto aéreo/BYRCOM" },
    { nombre: "E-2C AEW&C", cantidad: 1, descripcion: "AEW&C/C2" },
    { nombre: "Falcon DA-20", cantidad: 1, descripcion: "Guerra electrónica" },
    { nombre: "CASA C-295 IVR", cantidad: 2, descripcion: "SIGINT/ELINT/C2" },
    { nombre: "C-130H", cantidad: 4, descripcion: "Transporte táctico" },
    { nombre: "ERJ-145", cantidad: 2, descripcion: "VIP/MEDEVAC" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
  ],
  "Ala Aérea n.º 4 / Catamarca": [
    { nombre: "Harrier T/AV-8B", cantidad: 14, descripcion: "Ataque y AA limitada" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "UH-1N", cantidad: 4, descripcion: "Asalto aéreo" },
    { nombre: "Mi-28D", cantidad: 4, descripcion: "Ataque/BYRCOM" },
  ],
  "Ala Aérea n.º 5 / Tucumán": [
    { nombre: "Mirage 2000-5 Mk2", cantidad: 8, descripcion: "Caza multirrol" },
    { nombre: "CASA C-295 IVR", cantidad: 1, descripcion: "SIGINT/ELINT/C2" },
    { nombre: "C-130H", cantidad: 6, descripcion: "Asalto aéreo/transporte" },
    { nombre: "AS-725 Cougar", cantidad: 4, descripcion: "Asalto aéreo/BYRCOM" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "KC-130H", cantidad: 3, descripcion: "Reabastecimiento en vuelo" },
  ],
  "Ala Aérea n.º 6 / Formosa": [
    { nombre: "Su-22M4", cantidad: 8, descripcion: "Ataque/GE/AA limitada" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "UH-1N", cantidad: 4, descripcion: "Asalto aéreo" },
    { nombre: "Mi-28D", cantidad: 4, descripcion: "Ataque/BYRCOM" },
    { nombre: "KC-130H", cantidad: 3, descripcion: "Reabastecimiento en vuelo" },
  ],
  "Ala Aérea n.º 7 / Belén": [
    { nombre: "Su-22M4", cantidad: 6, descripcion: "Ataque/GE/AA limitada" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "UH-1N", cantidad: 4, descripcion: "Asalto aéreo" },
  ],
  "Ala Aérea n.º 8 / Tartagal": [
    { nombre: "Geran-2", cantidad: 48, descripcion: "Ataque/SEAD; alcance 2.500 km" },
    { nombre: "C-98A", cantidad: 2, descripcion: "Transporte/enlace" },
    { nombre: "AS-725 Cougar", cantidad: 4, descripcion: "Asalto aéreo/BYRCOM" },
  ],
  "Ala Aérea n.º 9 / Las Lomitas": [
    { nombre: "Mi-28D", cantidad: 6, descripcion: "Ataque/BYRCOM" },
    { nombre: "UH-1N", cantidad: 4, descripcion: "Asalto aéreo" },
    { nombre: "AS-725 Cougar", cantidad: 4, descripcion: "Asalto aéreo/BYRCOM" },
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

const CATALOGO_AERONAVES_PROPIAS: AeronaveCatalogo[] = Object.entries(
  AERONAVES_PROPIAS_POR_BASE
).flatMap(([base, aeronaves]) =>
  aeronaves.map((nombre) => ({
    nombre,
    base,
    bando: "propio" as const,
    cantidad: CANTIDADES_AERONAVES_PROPIAS[`${base}|${nombre}`],
  }))
);

const CATALOGO_AERONAVES_ENEMIGAS: AeronaveCatalogo[] = Object.entries(
  AERONAVES_ENEMIGAS_POR_BASE
).flatMap(([base, aeronaves]) =>
  aeronaves.map((medio) => ({
    nombre: medio.nombre,
    base,
    bando: "enemigo" as const,
    cantidad: medio.cantidad,
    descripcion: medio.descripcion,
  }))
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
  {
    nombre: "SA-29",
    base: "Ala Aérea n.º 2 / Sáenz Peña",
    bando: "enemigo",
    alcanceKm: 6.5,
    descripcion: "Escuela de Defensa Aérea; cantidad no indicada",
  },
  {
    nombre: "ZSU-23-2",
    base: "Ala Aérea n.º 2 / Sáenz Peña",
    bando: "enemigo",
    alcanceKm: 2.5,
    descripcion: "Escuela de Defensa Aérea; cantidad no indicada",
  },
  {
    nombre: "SA-8",
    base: "Ala Aérea n.º 2 / Sáenz Peña",
    bando: "enemigo",
    alcanceKm: 10,
    cantidad: 5,
    descripcion: "Escuela de Defensa Aérea",
  },
  {
    nombre: "S-300",
    base: "Ala Aérea n.º 3 / Salta",
    bando: "enemigo",
    alcanceKm: 150,
    descripcion: "Cantidad no indicada en la orden",
  },
  {
    nombre: "I-HAWK",
    base: "Ala Aérea n.º 3 / Salta",
    bando: "enemigo",
    alcanceKm: 40,
    cantidad: 2,
  },
  {
    nombre: "Pantsir-S1",
    base: "Ala Aérea n.º 3 / Salta",
    bando: "enemigo",
    alcanceKm: 12,
    cantidad: 4,
  },
  {
    nombre: "ZSU-23-2",
    base: "Ala Aérea n.º 3 / Salta",
    bando: "enemigo",
    alcanceKm: 2.5,
    descripcion: "Cantidad no indicada en la orden",
  },
  {
    nombre: "SA-29",
    base: "Ala Aérea n.º 3 / Salta",
    bando: "enemigo",
    alcanceKm: 6.5,
    descripcion: "Cantidad no indicada en la orden",
  },
  {
    nombre: "S-300",
    base: "Ala Aérea n.º 4 / Catamarca",
    bando: "enemigo",
    alcanceKm: 150,
    descripcion: "Cantidad no indicada en la orden",
  },
  {
    nombre: "Pantsir SA-22",
    base: "Ala Aérea n.º 4 / Catamarca",
    bando: "enemigo",
    alcanceKm: 12,
    cantidad: 2,
  },
  {
    nombre: "SA-8",
    base: "Ala Aérea n.º 4 / Catamarca",
    bando: "enemigo",
    alcanceKm: 10,
    cantidad: 4,
  },
  {
    nombre: "ZSU-23",
    base: "Ala Aérea n.º 4 / Catamarca",
    bando: "enemigo",
    alcanceKm: 2.5,
    descripcion: "Cantidad no indicada en la orden",
  },
  {
    nombre: "SA-29",
    base: "Ala Aérea n.º 4 / Catamarca",
    bando: "enemigo",
    alcanceKm: 6.5,
    descripcion: "Cantidad no indicada en la orden",
  },
  ...[
    ["Ala Aérea n.º 5 / Tucumán", "I-HAWK", 40, undefined],
    ["Ala Aérea n.º 5 / Tucumán", "ZSU-23", 2.5, undefined],
    ["Ala Aérea n.º 5 / Tucumán", "SA-29", 6.5, undefined],
    ["Ala Aérea n.º 6 / Formosa", "I-HAWK", 40, undefined],
    ["Ala Aérea n.º 6 / Formosa", "Pantsir SA-22", 12, 4],
    ["Ala Aérea n.º 6 / Formosa", "SA-29", 6.5, undefined],
    ["Ala Aérea n.º 6 / Formosa", "ZSU-23", 2.5, undefined],
    ["Ala Aérea n.º 7 / Belén", "S-300", 150, undefined],
    ["Ala Aérea n.º 7 / Belén", "SA-8", 10, 5],
    ["Ala Aérea n.º 7 / Belén", "SA-29", 6.5, undefined],
    ["Ala Aérea n.º 7 / Belén", "ZSU-23", 2.5, undefined],
    ["Ala Aérea n.º 8 / Tartagal", "I-HAWK", 40, undefined],
    ["Ala Aérea n.º 8 / Tartagal", "SA-29", 6.5, undefined],
    ["Ala Aérea n.º 8 / Tartagal", "ZSU-23", 2.5, undefined],
    ["Ala Aérea n.º 9 / Las Lomitas", "S-300", 150, undefined],
    ["Ala Aérea n.º 9 / Las Lomitas", "Pantsir SA-22", 12, 4],
    ["Ala Aérea n.º 9 / Las Lomitas", "ZSU-23-2", 2.5, undefined],
    ["Ala Aérea n.º 9 / Las Lomitas", "SA-29", 6.5, undefined],
  ].map(([base, nombre, alcanceKm, cantidad]) => ({
    nombre: nombre as string,
    base: base as string,
    bando: "enemigo" as const,
    alcanceKm: alcanceKm as number,
    cantidad: cantidad as number | undefined,
    descripcion:
      cantidad === undefined ? "Cantidad no indicada en la orden" : undefined,
  })),
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
];

function obtenerColorRepublica(nombre: string) {
  return COLORES_REPUBLICAS[nombre] ?? "#94a3b8";
}

function obtenerBase(nombre: string) {
  return [...BASES_PROPIAS, ...BASES_ENEMIGAS].find(
    (base) => base.nombre === nombre
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
  descripcion?: string
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

  if (texto.includes("t-6") || texto.includes("kt-1") || texto.includes("entrenamiento")) {
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

function datosIconoAeronave(
  nombre: string,
  descripcion?: string
) {
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

function obtenerMaximoSlider(elemento: ElementoOperacional) {
  const valorActual =
    elemento.tipo === "aeronave"
      ? elemento.radioCombateKm
      : elemento.alcanceKm;

  const base =
    elemento.tipo === "aeronave"
      ? 5000
      : elemento.tipo === "radar"
        ? 1200
        : 400;

  return Math.max(base, Math.ceil(valorActual * 1.5));
}

export default function MapEditor() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const elementosMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const etiquetasRef = useRef<Record<string, maplibregl.Marker>>({});
  const oceanosRef = useRef<Record<string, maplibregl.Marker>>({});
  const basesRef = useRef<Record<string, maplibregl.Marker>>({});

  const [elementos, setElementos] = useState<ElementoOperacional[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  const [vistaFuerzas, setVistaFuerzas] =
    useState<VistaFuerzas>("ambas");

  const [mostrarRepublicas, setMostrarRepublicas] = useState(true);
  const [mostrarEntornoGeografico, setMostrarEntornoGeografico] = useState(true);
  const [mostrarTon, setMostrarTon] = useState(true);
  const [mostrarBases, setMostrarBases] = useState(true);
  const [mostrarAeronaves, setMostrarAeronaves] = useState(true);
  const [mostrarRadares, setMostrarRadares] = useState(true);
  const [mostrarDefensa, setMostrarDefensa] = useState(true);

  const [mascarasVisibles, setMascarasVisibles] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      MASCARAS_RADAR.map((mascara) => [mascara.id, false])
    )
  );

  const [aeronavePropiaSeleccionada, setAeronavePropiaSeleccionada] =
    useState("");
  const [aeronaveEnemigaSeleccionada, setAeronaveEnemigaSeleccionada] =
    useState("");
  const [radarPropioSeleccionado, setRadarPropioSeleccionado] =
    useState("");
  const [radarEnemigoSeleccionado, setRadarEnemigoSeleccionado] =
    useState("");
  const [defensaPropiaSeleccionada, setDefensaPropiaSeleccionada] =
    useState("");
  const [defensaEnemigaSeleccionada, setDefensaEnemigaSeleccionada] =
    useState("");

  const [errorGeoJson, setErrorGeoJson] = useState<string | null>(null);

  const seleccionado = useMemo(
    () =>
      elementos.find((elemento) => elemento.id === seleccionadoId) ?? null,
    [elementos, seleccionadoId]
  );

  const mostrarControlesPropios =
    vistaFuerzas === "propias" || vistaFuerzas === "ambas";

  const mostrarControlesEnemigos =
    vistaFuerzas === "enemigas" || vistaFuerzas === "ambas";

  function crearAnillo(elemento: ElementoOperacional) {
    const radio =
      elemento.tipo === "aeronave"
        ? elemento.radioCombateKm
        : elemento.alcanceKm;

    return circle(
      [elemento.longitude, elemento.latitude],
      radio,
      {
        steps: 128,
        units: "kilometers",
        properties: {
          id: elemento.id,
          nombre: elemento.nombre,
          tipo: elemento.tipo,
          bando: elemento.bando,
          color: elemento.color,
        },
      }
    );
  }

  function debeMostrarAnillo(elemento: ElementoOperacional) {
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

    const source = map.getSource(
      "anillos-operacionales"
    ) as maplibregl.GeoJSONSource | undefined;

    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: lista.filter(debeMostrarAnillo).map(crearAnillo),
    });
  }

  function actualizarVisibilidadCapa(
    mapa: maplibregl.Map,
    capa: string,
    visible: boolean
  ) {
    if (!mapa.getLayer(capa)) return;

    mapa.setLayoutProperty(
      capa,
      "visibility",
      visible ? "visible" : "none"
    );
  }

  function agregarAeronave(
    catalogo: AeronaveCatalogo[],
    indiceTexto: string,
    limpiar: () => void
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
        elemento.baseOrigen === medio.base
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
      bando: medio.bando,
      tipo: "aeronave",
      nombre: medio.nombre,
      baseOrigen: medio.base,
      longitude: base.longitude,
      latitude: base.latitude,
      radioCombateKm: 0,
      alcanceKm: 0,
      mostrarAnillo: false,
      color: medio.bando === "propio" ? "#2563eb" : "#f97316",
      cantidad: medio.cantidad,
      descripcion: medio.descripcion,
    };

    setElementos((anteriores) => [...anteriores, nuevaAeronave]);
    setSeleccionadoId(nuevaAeronave.id);
    limpiar();
  }

  function agregarMedio(
    tipo: "radar" | "defensa",
    catalogo: MedioCatalogo[],
    indiceTexto: string,
    limpiar: () => void
  ) {
    const indice = Number(indiceTexto);
    if (indiceTexto === "" || Number.isNaN(indice)) return;

    const medio = catalogo[indice];
    if (!medio) return;

    const base = obtenerBase(medio.base);
    if (!base) return;

    const nuevoElemento: ElementoOperacional = {
      id: crearId(),
      bando: medio.bando,
      tipo,
      nombre: medio.nombre,
      baseOrigen: medio.base,
      longitude: base.longitude,
      latitude: base.latitude,
      radioCombateKm: 0,
      alcanceKm: medio.alcanceKm,
      mostrarAnillo: true,
      color:
        medio.bando === "propio"
          ? tipo === "radar"
            ? "#7c3aed"
            : "#dc2626"
          : tipo === "radar"
            ? "#f59e0b"
            : "#991b1b",
      cantidad: medio.cantidad,
      descripcion: medio.descripcion,
    };

    setElementos((anteriores) => [...anteriores, nuevoElemento]);
    setSeleccionadoId(nuevoElemento.id);
    limpiar();
  }

  function actualizarElemento(
    id: string,
    cambios: Partial<ElementoOperacional>
  ) {
    setElementos((anteriores) =>
      anteriores.map((elemento) =>
        elemento.id === id ? { ...elemento, ...cambios } : elemento
      )
    );
  }

  function eliminarElemento(id: string) {
    elementosMarkersRef.current[id]?.remove();
    delete elementosMarkersRef.current[id];

    setElementos((anteriores) =>
      anteriores.filter((elemento) => elemento.id !== id)
    );
    setSeleccionadoId(null);
  }

  function crearIconoElemento(elemento: ElementoOperacional) {
    const contenedor = document.createElement("div");

    contenedor.style.width = "38px";
    contenedor.style.height = "38px";
    contenedor.style.borderRadius =
      elemento.tipo === "aeronave" ? "10px" : "50%";
    contenedor.style.border =
      elemento.bando === "propio"
        ? "3px solid #dbeafe"
        : "3px solid #111827";
    contenedor.style.boxShadow = "0 2px 8px rgba(0,0,0,0.6)";
    contenedor.style.display = "flex";
    contenedor.style.alignItems = "center";
    contenedor.style.justifyContent = "center";
    contenedor.style.cursor = "grab";
    contenedor.style.fontSize = "19px";
    contenedor.style.fontWeight = "900";
    contenedor.style.userSelect = "none";
    contenedor.style.color = "white";

    if (elemento.tipo === "aeronave") {
      const datos = datosIconoAeronave(
        elemento.nombre,
        elemento.descripcion
      );

      contenedor.style.backgroundColor =
        elemento.bando === "propio" ? "#1d4ed8" : "#ea580c";
      contenedor.textContent = datos.simbolo;
      contenedor.title = `${datos.etiqueta}: ${elemento.nombre}`;
    }

    if (elemento.tipo === "radar") {
      contenedor.style.backgroundColor =
        elemento.bando === "propio" ? "#6d28d9" : "#d97706";
      contenedor.textContent = "📡";
      contenedor.title = `Radar: ${elemento.nombre}`;
    }

    if (elemento.tipo === "defensa") {
      contenedor.style.backgroundColor =
        elemento.bando === "propio" ? "#dc2626" : "#7f1d1d";
      contenedor.textContent = "🛡";
      contenedor.title = `Defensa antiaérea: ${elemento.nombre}`;
    }

    return contenedor;
  }

  function crearIconoBase(base: BaseMilitar) {
    const elemento = document.createElement("div");

    elemento.style.width = "31px";
    elemento.style.height = "31px";
    elemento.style.borderRadius = base.tipo === "Estación radar" ? "5px" : "50%";
    elemento.style.backgroundColor =
      base.bando === "propio" ? "#0f172a" : "#7f1d1d";
    elemento.style.border =
      base.bando === "propio"
        ? "3px solid white"
        : "3px solid #111827";
    elemento.style.boxShadow = "0 2px 6px rgba(0,0,0,0.45)";
    elemento.style.display = "flex";
    elemento.style.alignItems = "center";
    elemento.style.justifyContent = "center";
    elemento.style.color = "white";
    elemento.style.fontSize = "16px";
    elemento.style.cursor = "pointer";
    elemento.textContent =
      base.tipo === "Estación radar"
        ? "📡"
        : base.tipo === "Centro de comando"
          ? "◆"
          : "★";

    return elemento;
  }

  function mediosDeBase(base: BaseMilitar) {
    const aeronaves =
      base.bando === "propio"
        ? CATALOGO_AERONAVES_PROPIAS.filter(
            (medio) => medio.base === base.nombre
          )
        : CATALOGO_AERONAVES_ENEMIGAS.filter(
            (medio) => medio.base === base.nombre
          );

    const radares =
      base.bando === "propio"
        ? CATALOGO_RADARES_PROPIOS.filter(
            (medio) => medio.base === base.nombre
          )
        : CATALOGO_RADARES_ENEMIGOS.filter(
            (medio) => medio.base === base.nombre
          );

    const defensa =
      base.bando === "propio"
        ? CATALOGO_DEFENSA_PROPIA.filter(
            (medio) => medio.base === base.nombre
          )
        : CATALOGO_DEFENSA_ENEMIGA.filter(
            (medio) => medio.base === base.nombre
          );

    const listar = (
      items: Array<{ nombre: string; cantidad?: number }>
    ) =>
      items.length
        ? items
            .map(
              (item) =>
                `${item.nombre}${
                  item.cantidad ? ` x ${item.cantidad}` : ""
                }`
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
      center: [-64.5, -35.5],
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
      maxBounds: [
        [-82, -60],
        [-47, -18],
      ],
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.on("load", async () => {
      try {
        const respuesta = await fetch(
          "/data/republicas_argentum.geojson"
        );

        if (!respuesta.ok) {
          throw new Error(
            `No se pudo cargar el GeoJSON. Código: ${respuesta.status}`
          );
        }

        const republicas =
          (await respuesta.json()) as GeoJsonRepublicas;

        const republicasConColor: GeoJsonRepublicas = {
          ...republicas,
          features: republicas.features.map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              color: obtenerColorRepublica(
                feature.properties.republica
              ),
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
            "fill-color": "#ffffff",
            "fill-opacity": 1,
          },
        });

        map.addLayer({
          id: "paises-aledanos-borde",
          type: "line",
          source: "paises-aledanos",
          paint: {
            "line-color": "#94a3b8",
            "line-width": 1.2,
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
            "fill-color": [
              "coalesce",
              ["get", "color"],
              "#94a3b8",
            ],
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
            etiqueta.style.fontWeight = "900";
            etiqueta.style.fontSize = "18px";
            etiqueta.style.letterSpacing = "0.16em";
            etiqueta.style.color = "rgba(15,23,42,0.72)";
            etiqueta.style.background = "transparent";
            etiqueta.style.border = "none";
            etiqueta.style.padding = "2px 6px";
            etiqueta.style.pointerEvents = "none";
            etiqueta.style.whiteSpace = "nowrap";
            etiqueta.style.textShadow =
              "0 1px 0 rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.85)";
            etiqueta.style.transform = "translate(-50%, -50%)";

            const marker = new maplibregl.Marker({
              element: etiqueta,
              anchor: "center",
            })
              .setLngLat(coordenadas)
              .addTo(map);

            etiquetasRef.current[nombre] = marker;
          }
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
            : "Error al cargar el GeoJSON."
        );
      }

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
            }).setHTML(mediosDeBase(base))
          )
          .addTo(map);

        basesRef.current[base.nombre] = marker;
      });

      for (const mascara of MASCARAS_RADAR) {
        try {
          const respuestaMascara = await fetch(mascara.archivo);

          if (!respuestaMascara.ok) {
            throw new Error(
              `No se pudo cargar ${mascara.nombre}: ${respuestaMascara.status}`
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
              "fill-color": mascara.color,
              "fill-opacity": 0.20,
            },
          });

          map.addLayer({
            id: `${mascara.id}-borde`,
            type: "line",
            source: mascara.id,
            filter: ["==", ["geometry-type"], "Polygon"],
            layout: { visibility: "none" },
            paint: {
              "line-color": mascara.color,
              "line-width": 1.8,
              "line-opacity": 0.9,
            },
          });
        } catch (error) {
          console.error(`Error en máscara ${mascara.nombre}:`, error);
        }
      }

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
          "fill-color": [
            "coalesce",
            ["get", "color"],
            "#7c3aed",
          ],
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: "anillos-borde",
        type: "line",
        source: "anillos-operacionales",
        paint: {
          "line-color": [
            "coalesce",
            ["get", "color"],
            "#7c3aed",
          ],
          "line-width": 2.5,
        },
      });
    });

    mapRef.current = map;

    return () => {
      Object.values(elementosMarkersRef.current).forEach((marker) =>
        marker.remove()
      );
      Object.values(etiquetasRef.current).forEach((marker) =>
        marker.remove()
      );
      Object.values(oceanosRef.current).forEach((marker) =>
        marker.remove()
      );
      Object.values(basesRef.current).forEach((marker) =>
        marker.remove()
      );

      elementosMarkersRef.current = {};
      etiquetasRef.current = {};
      oceanosRef.current = {};
      basesRef.current = {};

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
        visibleTipo && bandoVisible(elemento.bando, vistaFuerzas);

      const markerExistente =
        elementosMarkersRef.current[elemento.id];

      const distanciaKm =
        elemento.tipo === "aeronave"
          ? elemento.radioCombateKm
          : elemento.alcanceKm;

      const categoriaAeronave =
        elemento.tipo === "aeronave"
          ? datosIconoAeronave(
              elemento.nombre,
              elemento.descripcion
            ).etiqueta
          : null;

      const popupHtml = `
        <div style="font-family:Arial;color:#f8fafc;background:#0f172a;padding:13px;border-radius:8px;line-height:1.5;min-width:275px">
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
              elemento.tipo === "aeronave"
                ? "Radio de combate"
                : "Alcance"
            }:</strong>
            ${
              distanciaKm > 0
                ? formatearDistancia(distanciaKm)
                : "Sin definir"
            }
          </div>
        </div>
      `;

      if (markerExistente) {
        markerExistente.setLngLat([
          elemento.longitude,
          elemento.latitude,
        ]);
        markerExistente.getElement().style.display =
          visible ? "flex" : "none";
        markerExistente.setPopup(
          new maplibregl.Popup({
            offset: 25,
            maxWidth: "390px",
            className: "zeus-popup",
          }).setHTML(popupHtml)
        );
        return;
      }

      const marker = new maplibregl.Marker({
        element: crearIconoElemento(elemento),
        anchor: "center",
        draggable: true,
      })
        .setLngLat([
          elemento.longitude,
          elemento.latitude,
        ])
        .setPopup(
          new maplibregl.Popup({
            offset: 25,
            maxWidth: "390px",
            className: "zeus-popup",
          }).setHTML(popupHtml)
        )
        .addTo(map);

      marker.getElement().addEventListener("click", () => {
        setSeleccionadoId(elemento.id);
      });

      marker.on("drag", () => {
        const posicion = marker.getLngLat();

        setElementos((anteriores) =>
          anteriores.map((actual) =>
            actual.id === elemento.id
              ? {
                  ...actual,
                  longitude: posicion.lng,
                  latitude: posicion.lat,
                }
              : actual
          )
        );
      });

      marker.getElement().style.display =
        visible ? "flex" : "none";

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
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    actualizarVisibilidadCapa(
      map,
      "republicas-relleno",
      mostrarRepublicas
    );
    actualizarVisibilidadCapa(
      map,
      "republicas-borde",
      mostrarRepublicas
    );

    Object.values(etiquetasRef.current).forEach((marker) => {
      marker.getElement().style.display =
        mostrarRepublicas ? "block" : "none";
    });
  }, [mostrarRepublicas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    actualizarVisibilidadCapa(
      map,
      "paises-aledanos-relleno",
      mostrarEntornoGeografico
    );
    actualizarVisibilidadCapa(
      map,
      "paises-aledanos-borde",
      mostrarEntornoGeografico
    );

    Object.values(oceanosRef.current).forEach((marker) => {
      marker.getElement().style.display =
        mostrarEntornoGeografico ? "block" : "none";
    });
  }, [mostrarEntornoGeografico]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    actualizarVisibilidadCapa(map, "ton-relleno", mostrarTon);
    actualizarVisibilidadCapa(map, "ton-borde", mostrarTon);
  }, [mostrarTon]);

  useEffect(() => {
    [...BASES_PROPIAS, ...BASES_ENEMIGAS].forEach((base) => {
      const marker = basesRef.current[base.nombre];
      if (!marker) return;

      const visible =
        mostrarBases && bandoVisible(base.bando, vistaFuerzas);

      marker.getElement().style.display = visible ? "flex" : "none";
    });
  }, [mostrarBases, vistaFuerzas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    MASCARAS_RADAR.forEach((mascara) => {
      const visible =
        Boolean(mascarasVisibles[mascara.id]) &&
        bandoVisible(mascara.bando, vistaFuerzas);

      actualizarVisibilidadCapa(
        map,
        `${mascara.id}-relleno`,
        visible
      );
      actualizarVisibilidadCapa(
        map,
        `${mascara.id}-borde`,
        visible
      );
    });
  }, [mascarasVisibles, vistaFuerzas]);

  function cambiarMascara(id: string, visible: boolean) {
    setMascarasVisibles((anteriores) => ({
      ...anteriores,
      [id]: visible,
    }));
  }

  function cambiarMascarasPorBando(bando: Bando, visible: boolean) {
    setMascarasVisibles((anteriores) => {
      const siguientes = { ...anteriores };

      MASCARAS_RADAR.filter(
        (mascara) => mascara.bando === bando
      ).forEach((mascara) => {
        siguientes[mascara.id] = visible;
      });

      return siguientes;
    });
  }

  return (
    <div className="flex h-screen w-screen">
      <aside className="w-[420px] overflow-y-auto bg-slate-950 p-5 text-white">
        <h1 className="mb-5 text-xl font-bold">
          Editor cartográfico ZEUS
        </h1>

        <section className="mb-5 rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">Fuerzas visibles</h2>

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

        <section className="mb-5 rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">Capas territoriales</h2>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarRepublicas}
              onChange={(event) =>
                setMostrarRepublicas(event.target.checked)
              }
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
              onChange={(event) =>
                setMostrarTon(event.target.checked)
              }
            />
            Teatro de Operaciones Norte
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarBases}
              onChange={(event) =>
                setMostrarBases(event.target.checked)
              }
            />
            Bases y estaciones
          </label>
        </section>

        <section className="mb-5 rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">Máscaras radar</h2>

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
                (mascara) => mascara.bando === "propio"
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
                  {mascara.nombre}
                </label>
              ))}
            </div>
          )}

          {mostrarControlesEnemigos && (
            <div className="rounded border border-orange-700 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-sm text-orange-300">Enemigas</strong>
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
                (mascara) => mascara.bando === "enemigo"
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
                  {mascara.nombre}
                </label>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Las máscaras conservan la geometría y las coordenadas originales
            de los archivos KMZ.
          </p>
        </section>

        <section className="mb-5 rounded bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">Visibilidad de medios</h2>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarAeronaves}
              onChange={(event) =>
                setMostrarAeronaves(event.target.checked)
              }
            />
            Aeronaves
          </label>

          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarRadares}
              onChange={(event) =>
                setMostrarRadares(event.target.checked)
              }
            />
            Radares
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarDefensa}
              onChange={(event) =>
                setMostrarDefensa(event.target.checked)
              }
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
                        const indice =
                          CATALOGO_AERONAVES_PROPIAS.findIndex(
                            (item) =>
                              item.nombre === aeronave &&
                              item.base === base
                          );

                        return (
                          <option
                            key={`${base}-${aeronave}`}
                            value={indice}
                          >
                            {aeronave}
                            {CANTIDADES_AERONAVES_PROPIAS[`${base}|${aeronave}`]
                              ? ` — ${CANTIDADES_AERONAVES_PROPIAS[`${base}|${aeronave}`]} uds.`
                              : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                  )
                )}
              </select>

              <button
                onClick={() =>
                  agregarAeronave(
                    CATALOGO_AERONAVES_PROPIAS,
                    aeronavePropiaSeleccionada,
                    () => setAeronavePropiaSeleccionada("")
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
                  <option
                    key={`${medio.nombre}-${medio.base}`}
                    value={indice}
                  >
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
                    () => setRadarPropioSeleccionado("")
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
                    () => setDefensaPropiaSeleccionada("")
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
                        const indice =
                          CATALOGO_AERONAVES_ENEMIGAS.findIndex(
                            (item) =>
                              item.nombre === aeronave.nombre &&
                              item.base === base
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
                  )
                )}
              </select>

              <button
                onClick={() =>
                  agregarAeronave(
                    CATALOGO_AERONAVES_ENEMIGAS,
                    aeronaveEnemigaSeleccionada,
                    () => setAeronaveEnemigaSeleccionada("")
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
                  <option
                    key={`${medio.nombre}-${medio.base}`}
                    value={indice}
                  >
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
                    () => setRadarEnemigoSeleccionado("")
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
                    () => setDefensaEnemigaSeleccionada("")
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

        <section className="mb-5">
          <label className="mb-2 block text-sm font-semibold">
            Elementos desplegados
          </label>

          <select
            value={seleccionadoId ?? ""}
            onChange={(event) =>
              setSeleccionadoId(event.target.value || null)
            }
            className="w-full rounded bg-slate-800 p-2"
          >
            <option value="">Seleccionar elemento</option>

            {elementos
              .filter((elemento) =>
                bandoVisible(elemento.bando, vistaFuerzas)
              )
              .map((elemento) => (
                <option key={elemento.id} value={elemento.id}>
                  {elemento.bando === "propio" ? "PROPIO" : "ENEMIGO"} —{" "}
                  {elemento.tipo.toUpperCase()} — {elemento.nombre}
                </option>
              ))}
          </select>
        </section>

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
                <strong>Base de origen:</strong>{" "}
                {seleccionado.baseOrigen}
              </p>
              {seleccionado.cantidad && (
                <p>
                  <strong>Cantidad informada:</strong>{" "}
                  {seleccionado.cantidad}
                </p>
              )}
              {seleccionado.descripcion && (
                <p>
                  <strong>Capacidad:</strong>{" "}
                  {seleccionado.descripcion}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                {seleccionado.tipo === "aeronave"
                  ? "Radio de combate"
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
                        ? seleccionado.radioCombateKm
                        : seleccionado.alcanceKm
                    )}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={obtenerMaximoSlider(seleccionado)}
                  step={
                    seleccionado.tipo === "defensa"
                      ? 0.5
                      : 5
                  }
                  value={
                    seleccionado.tipo === "aeronave"
                      ? seleccionado.radioCombateKm
                      : seleccionado.alcanceKm
                  }
                  onChange={(event) => {
                    const valor = Math.max(
                      0,
                      Number(event.target.value)
                    );

                    actualizarElemento(
                      seleccionado.id,
                      seleccionado.tipo === "aeronave"
                        ? { radioCombateKm: valor }
                        : { alcanceKm: valor }
                    );
                  }}
                  className="w-full cursor-pointer accent-cyan-500"
                />

                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>0 km</span>
                  <span>
                    {formatearDistancia(
                      obtenerMaximoSlider(seleccionado)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={
                    seleccionado.tipo === "defensa"
                      ? 0.5
                      : 1
                  }
                  value={
                    seleccionado.tipo === "aeronave"
                      ? seleccionado.radioCombateKm
                      : seleccionado.alcanceKm
                  }
                  onChange={(event) => {
                    const valor = Math.max(
                      0,
                      Number(event.target.value)
                    );

                    actualizarElemento(
                      seleccionado.id,
                      seleccionado.tipo === "aeronave"
                        ? { radioCombateKm: valor }
                        : { alcanceKm: valor }
                    );
                  }}
                  className="w-full rounded bg-slate-800 p-2"
                />
                <span className="whitespace-nowrap text-sm">
                  km / MN
                </span>
              </div>
            </div>

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
                ? "Mostrar radio de combate"
                : "Mostrar anillo de alcance"}
            </label>

            <div>
              <label className="mb-1 block text-sm">
                Color del anillo
              </label>

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
                <strong>Latitud:</strong>{" "}
                {seleccionado.latitude.toFixed(5)}
              </p>
              <p>
                <strong>Longitud:</strong>{" "}
                {seleccionado.longitude.toFixed(5)}
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
      `}</style>
    </div>
  );
}
