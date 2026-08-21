"use client";

import { useMemo, useState } from "react";

type Seccion = "situacion" | "tfp" | "fase1" | "fase2" | "fase3" | "fase4";

type Comunicacion = { equipo: string; cantidad: number };
type Medio = { nombre: string; cantidad?: number; detalle?: string };

type PersonalFila = {
  elemento: string;
  oficiales: number;
  suboficiales: number;
  sv: number;
  civiles: number;
  total: number;
  division?: string;
};

type PersonalUnidad = {
  filas: PersonalFila[];
  total: { oficiales: number; suboficiales: number; sv: number; civiles: number; total: number };
};
type Unidad = {
  nombre: string;
  ubicacion: string;
  medios: Medio[];
  comunicaciones: Comunicacion[];
  personal?: PersonalUnidad;
  observaciones?: string[];
};

type Fase = { id: Seccion; titulo: string; subtitulo: string; momentos: { nombre: string; periodo: string; detalle: string }[] };


type OperacionLogistica = {
  id: string;
  fase: Seccion;
  momento: string;
  nombre: string;
  base: string;
  sistema: string;
  cantidad: number;
  armamento: string;
  armamentoPorAeronave: number;
  distanciaKm: number;
  destino: string;
  esfuerzo: "ERC" | "MESC" | "MEIC";
  transporte: "Camión 5 Tn" | "Camión 20 Tn";
  aceptada: boolean;
};

type InventarioArmamento = {
  id: string;
  nombre: string;
  cantidadInicial: number;
  pesoKg?: number;
};

const COMUNICACIONES: Record<string, Comunicacion[]> = {
  "1ba": [
    {equipo:"HARRIS FALCON III RF-7800H-MP",cantidad:2},{equipo:"HARRIS FALCON IV AN/PRC-158",cantidad:1},
    {equipo:"PANASONIC KX-NS500",cantidad:1},{equipo:"CRYPTO HC-8552 1G",cantidad:1},{equipo:"CAT DE50 GC",cantidad:1},
    {equipo:"APX 5000",cantidad:5},{equipo:"APX 5500",cantidad:3},{equipo:"FREQUENTIS CADAS-ATS",cantidad:1},
    {equipo:"BECKER TG 160",cantidad:2},{equipo:"BAE/Rockwell Collins MIDS LVT 2/11",cantidad:2},
  ],
  "2ba": [
    {equipo:"HARRIS FALCON III RF-7800H-MP",cantidad:1},{equipo:"HARRIS FALCON IV AN/PRC-158",cantidad:1},
    {equipo:"IDIRECT X3",cantidad:1},{equipo:"SKYWARE GLOBAL TYPE 180",cantidad:1},{equipo:"PANASONIC KX-NS500",cantidad:1},
    {equipo:"CRYPTO HC-8552 1G",cantidad:1},{equipo:"CAT DE50 GC",cantidad:1},{equipo:"APX 5000",cantidad:5},
    {equipo:"APX 5500",cantidad:3},{equipo:"FREQUENTIS CADAS-ATS",cantidad:1},{equipo:"BECKER TG 160",cantidad:2},
    {equipo:"ELBIT MLT 2920",cantidad:2},
  ],
  "3ba": [
    {equipo:"HARRIS FALCON III RF-7800H-MP",cantidad:1},{equipo:"HARRIS FALCON IV AN/PRC-158",cantidad:1},
    {equipo:"IDIRECT X3",cantidad:1},{equipo:"SKYWARE GLOBAL TYPE 180",cantidad:1},{equipo:"I DIRECT SERIES 15100 SATELLITE HUB",cantidad:1},
    {equipo:"PANASONIC KX-NS500",cantidad:1},{equipo:"CRYPTO HC-8552 1G",cantidad:1},{equipo:"CAT DE50 GC",cantidad:1},
    {equipo:"APX 5000",cantidad:5},{equipo:"APX 5500",cantidad:3},{equipo:"BECKER TG 160",cantidad:2},
    {equipo:"BAE/Rockwell Collins MIDS LVT 2/11",cantidad:1},
  ],
  "4ba": [
    {equipo:"HARRIS FALCON III RF-7800H-MP",cantidad:1},{equipo:"HARRIS FALCON IV AN/PRC-158",cantidad:1},
    {equipo:"IDIRECT X3",cantidad:1},{equipo:"GENERAL DYNAMICS SERIE 1251",cantidad:1},{equipo:"PANASONIC KX-NS500",cantidad:1},
    {equipo:"CRYPTO HC-8552 1G",cantidad:1},{equipo:"CAT DE50 GC",cantidad:1},{equipo:"APX 5000",cantidad:5},
    {equipo:"APX 5500",cantidad:3},{equipo:"FREQUENTIS VCS3020X",cantidad:1},{equipo:"BECKER TG 160",cantidad:3},
    {equipo:"ELBIT MLT 2920",cantidad:1},{equipo:"BAE/Rockwell Collins MIDS LVT 2/11",cantidad:1},
  ],
  "5ba": [
    {equipo:"HARRIS FALCON III RF-7800H-MP",cantidad:1},{equipo:"HARRIS FALCON IV AN/PRC-158",cantidad:1},
    {equipo:"SKYWARE GLOBAL TYPE 180",cantidad:1},{equipo:"GENERAL DYNAMICS SERIE 1251",cantidad:1},{equipo:"PANASONIC KX-NS500",cantidad:1},
    {equipo:"CRYPTO HC-8552 1G",cantidad:1},{equipo:"CAT DE50 GC",cantidad:1},{equipo:"APX 5000",cantidad:5},
    {equipo:"APX 5500",cantidad:4},{equipo:"FREQUENTIS VCS3020X",cantidad:1},{equipo:"ELBIT MLT 2920",cantidad:1},
    {equipo:"BAE/Rockwell Collins MIDS LVT 2/11",cantidad:1},
  ],
  "bam": [
    {equipo:"HARRIS FALCON III RF-7800H-MP",cantidad:2},{equipo:"HARRIS FALCON IV AN/PRC-158",cantidad:1},
    {equipo:"IDIRECT X3",cantidad:1},{equipo:"SKYWARE GLOBAL TYPE 180",cantidad:1},{equipo:"PANASONIC KX-NS500",cantidad:2},
    {equipo:"CRYPTO HC-8552 1G",cantidad:1},{equipo:"CAT DE50 GC",cantidad:1},{equipo:"APX 5000",cantidad:10},
    {equipo:"APX 5500",cantidad:5},{equipo:"FREQUENTIS CADAS-ATS",cantidad:1},{equipo:"BECKER TG 160",cantidad:4},
    {equipo:"HARRIS FALCON II AN/PRC 150",cantidad:3},{equipo:"HARRIS FALCON III AN/PRC 117G",cantidad:3},
    {equipo:"ELBIT MLT 2920",cantidad:2},{equipo:"BAE/Rockwell Collins MIDS LVT 2/11",cantidad:2},
  ],
  "g1": [
    {equipo:"HARRIS FALCON III RF-7800H-MP",cantidad:2},{equipo:"HARRIS FALCON IV AN/PRC-158",cantidad:1},
    {equipo:"IDIRECT X3",cantidad:1},{equipo:"SKYWARE GLOBAL TYPE 180",cantidad:2},{equipo:"PANASONIC KX-NS500",cantidad:1},
    {equipo:"CRYPTO HC-8552 1G",cantidad:1},{equipo:"CAT DE50 GC",cantidad:1},{equipo:"APX 5000",cantidad:5},
    {equipo:"APX 5500",cantidad:3},{equipo:"FREQUENTIS AIDA-NG",cantidad:1},{equipo:"FREQUENTIS CADAS-ATS",cantidad:1},
    {equipo:"BECKER TG 160",cantidad:2},{equipo:"HARRIS FALCON II AN/PRC 150",cantidad:1},
    {equipo:"HARRIS FALCON III AN/PRC 117G",cantidad:1},{equipo:"ELBIT MLT 2920",cantidad:1},
  ],
  "g2": [
    {equipo:"HARRIS FALCON III RF-7800H-MP",cantidad:1},{equipo:"HARRIS FALCON IV AN/PRC-158",cantidad:1},
    {equipo:"PANASONIC KX-NS500",cantidad:2},{equipo:"CRYPTO HC-8552 1G",cantidad:1},{equipo:"CAT DE50 GC",cantidad:1},
    {equipo:"APX 5000",cantidad:5},{equipo:"FREQUENTIS AIDA-NG",cantidad:1},{equipo:"FREQUENTIS CADAS-ATS",cantidad:1},
    {equipo:"FREQUENTIS VCS3020X",cantidad:1},{equipo:"HARRIS FALCON II AN/PRC 150",cantidad:1},
    {equipo:"HARRIS FALCON III AN/PRC 117G",cantidad:1},{equipo:"BAE/Rockwell Collins MIDS LVT 2/11",cantidad:4},
  ],
};


const PERSONAL_ALFA: Record<string, PersonalUnidad> = {
  "Grupo 1 COM": {
    filas: [
      {elemento:"GRUPO 1 COM",oficiales:14,suboficiales:40,sv:22,civiles:9,total:85},
      {elemento:"ESC. DE ICIA. UIS",oficiales:13,suboficiales:21,sv:12,civiles:18,total:64},
    ],
    total:{oficiales:27,suboficiales:61,sv:34,civiles:27,total:149},
  },
  "1ª Brigada Aérea": {
    filas: [
      {division:"APOYO / UNIDAD",elemento:"ADMINIST./MANTENIM.",oficiales:28,suboficiales:78,sv:44,civiles:5,total:155},
      {division:"APOYO / UNIDAD",elemento:"SANIDAD",oficiales:12,suboficiales:30,sv:18,civiles:8,total:68},
      {division:"APOYO / UNIDAD",elemento:"SEGURIDAD",oficiales:8,suboficiales:18,sv:67,civiles:0,total:93},
      {division:"SISTEMAS AÉREOS",elemento:"KC-130 J",oficiales:48,suboficiales:148,sv:24,civiles:6,total:226},
      {division:"SISTEMAS AÉREOS",elemento:"C-130 J",oficiales:40,suboficiales:112,sv:50,civiles:13,total:215},
      {division:"SISTEMAS AÉREOS",elemento:"LEAR JET 60",oficiales:18,suboficiales:40,sv:14,civiles:4,total:76},
      {division:"SISTEMAS AÉREOS",elemento:"DHC6-400",oficiales:22,suboficiales:56,sv:18,civiles:3,total:99},
      {division:"SISTEMAS AÉREOS",elemento:"UH-1Y",oficiales:24,suboficiales:45,sv:18,civiles:0,total:87},
      {division:"SISTEMAS AÉREOS",elemento:"BELL-412",oficiales:24,suboficiales:48,sv:18,civiles:0,total:90},
      {division:"DEFENSA ANTIAÉREA",elemento:"NASAMS",oficiales:10,suboficiales:35,sv:28,civiles:0,total:73},
      {division:"DEFENSA ANTIAÉREA",elemento:"SKYGUARD OERLIKON",oficiales:8,suboficiales:35,sv:24,civiles:0,total:67},
      {division:"DEFENSA ANTIAÉREA",elemento:"RBS70",oficiales:8,suboficiales:28,sv:20,civiles:0,total:56},
    ],
    total:{oficiales:250,suboficiales:673,sv:343,civiles:39,total:1305},
  },
  "2ª Brigada Aérea": {
    filas: [
      {division:"APOYO / UNIDAD",elemento:"ADMINIST./MANTENIM.",oficiales:18,suboficiales:52,sv:28,civiles:15,total:113},
      {division:"APOYO / UNIDAD",elemento:"SANIDAD",oficiales:11,suboficiales:28,sv:20,civiles:5,total:64},
      {division:"APOYO / UNIDAD",elemento:"SEGURIDAD",oficiales:5,suboficiales:21,sv:120,civiles:0,total:146},
      {division:"SISTEMAS AÉREOS",elemento:"F-16C BLOCK 40",oficiales:48,suboficiales:75,sv:36,civiles:7,total:166},
      {division:"SISTEMAS AÉREOS",elemento:"AMX A-1M",oficiales:32,suboficiales:80,sv:20,civiles:2,total:134},
      {division:"SISTEMAS AÉREOS",elemento:"T-6 TEXAN II",oficiales:24,suboficiales:98,sv:18,civiles:3,total:143},
      {division:"SISTEMAS AÉREOS",elemento:"BELL-412",oficiales:18,suboficiales:24,sv:14,civiles:1,total:57},
      {division:"SISTEMAS AÉREOS",elemento:"UH-1Y",oficiales:20,suboficiales:28,sv:12,civiles:0,total:60},
      {division:"SISTEMAS AÉREOS",elemento:"DHC6-400",oficiales:16,suboficiales:29,sv:14,civiles:1,total:60},
      {division:"SISTEMAS AÉREOS",elemento:"ELBIT HERMES 450",oficiales:14,suboficiales:28,sv:28,civiles:2,total:72},
      {division:"DEFENSA ANTIAÉREA",elemento:"NASAMS",oficiales:8,suboficiales:25,sv:23,civiles:0,total:56},
      {division:"DEFENSA ANTIAÉREA",elemento:"SKYGUARD OERLIKON",oficiales:12,suboficiales:20,sv:86,civiles:0,total:118},
      {division:"DEFENSA ANTIAÉREA",elemento:"RBS69 (según ALFA)",oficiales:8,suboficiales:18,sv:15,civiles:0,total:41},
      {division:"DEFENSA ANTIAÉREA",elemento:"TPS-77",oficiales:12,suboficiales:28,sv:22,civiles:1,total:63},
    ],
    total:{oficiales:246,suboficiales:554,sv:456,civiles:37,total:1293},
  },
  "3ª Brigada Aérea": {
    filas: [
      {division:"COMANDO / APOYO",elemento:"CAOC",oficiales:35,suboficiales:50,sv:35,civiles:6,total:126},
      {division:"COMANDO / APOYO",elemento:"ADMINIST./MANTENIM.",oficiales:12,suboficiales:45,sv:20,civiles:5,total:82},
      {division:"COMANDO / APOYO",elemento:"SANIDAD",oficiales:11,suboficiales:18,sv:15,civiles:5,total:49},
      {division:"COMANDO / APOYO",elemento:"SEGURIDAD",oficiales:5,suboficiales:21,sv:80,civiles:0,total:106},
      {division:"SISTEMAS AÉREOS",elemento:"AMX A-1M",oficiales:32,suboficiales:48,sv:12,civiles:2,total:94},
      {division:"SISTEMAS AÉREOS",elemento:"T-6 TEXAN II",oficiales:24,suboficiales:40,sv:10,civiles:2,total:76},
      {division:"SISTEMAS AÉREOS",elemento:"BELL-412",oficiales:12,suboficiales:12,sv:12,civiles:1,total:37},
      {division:"SISTEMAS AÉREOS",elemento:"CH-47F",oficiales:32,suboficiales:60,sv:18,civiles:1,total:111},
      {division:"SISTEMAS AÉREOS",elemento:"UH-1Y",oficiales:18,suboficiales:20,sv:18,civiles:1,total:57},
      {division:"SISTEMAS AÉREOS",elemento:"E-99M",oficiales:12,suboficiales:68,sv:28,civiles:1,total:109},
      {division:"SISTEMAS AÉREOS",elemento:"KC-135",oficiales:18,suboficiales:84,sv:28,civiles:2,total:132},
      {division:"DEFENSA ANTIAÉREA",elemento:"PATRIOT",oficiales:10,suboficiales:28,sv:32,civiles:0,total:70},
      {division:"DEFENSA ANTIAÉREA",elemento:"SKYGUARD OERLIKON",oficiales:8,suboficiales:20,sv:25,civiles:0,total:53},
      {division:"DEFENSA ANTIAÉREA",elemento:"RBS70",oficiales:8,suboficiales:16,sv:25,civiles:0,total:49},
      {division:"DEFENSA ANTIAÉREA",elemento:"TPS-77",oficiales:12,suboficiales:18,sv:20,civiles:0,total:50},
    ],
    total:{oficiales:249,suboficiales:548,sv:378,civiles:26,total:1201},
  },
  "4ª Brigada Aérea": {
    filas: [
      {division:"APOYO / UNIDAD",elemento:"ADMINIST./MANTENIM.",oficiales:22,suboficiales:34,sv:17,civiles:2,total:75},
      {division:"APOYO / UNIDAD",elemento:"SANIDAD",oficiales:8,suboficiales:11,sv:10,civiles:3,total:32},
      {division:"APOYO / UNIDAD",elemento:"SEGURIDAD",oficiales:4,suboficiales:18,sv:45,civiles:0,total:67},
      {division:"SISTEMAS AÉREOS",elemento:"F-16C/D BLOCK 40/42",oficiales:38,suboficiales:98,sv:20,civiles:3,total:159},
      {division:"SISTEMAS AÉREOS",elemento:"KC-135",oficiales:12,suboficiales:58,sv:18,civiles:1,total:89},
      {division:"SISTEMAS AÉREOS",elemento:"DHC-6 400",oficiales:8,suboficiales:22,sv:8,civiles:1,total:39},
      {division:"SISTEMAS AÉREOS",elemento:"BELL-412",oficiales:6,suboficiales:12,sv:10,civiles:2,total:30},
      {division:"SISTEMAS AÉREOS",elemento:"UH-1Y",oficiales:12,suboficiales:18,sv:8,civiles:1,total:39},
      {division:"DEFENSA ANTIAÉREA",elemento:"PATRIOT",oficiales:12,suboficiales:26,sv:12,civiles:0,total:50},
      {division:"DEFENSA ANTIAÉREA",elemento:"SKYGUARD OERLIKON",oficiales:6,suboficiales:20,sv:10,civiles:0,total:36},
      {division:"DEFENSA ANTIAÉREA",elemento:"RBS70",oficiales:6,suboficiales:17,sv:13,civiles:0,total:36},
    ],
    total:{oficiales:134,suboficiales:334,sv:171,civiles:13,total:652},
  },
  "5ª Brigada Aérea": {
    filas: [
      {division:"APOYO / UNIDAD",elemento:"ADMINIST./MANTENIM.",oficiales:18,suboficiales:34,sv:17,civiles:2,total:71},
      {division:"APOYO / UNIDAD",elemento:"SANIDAD",oficiales:9,suboficiales:11,sv:18,civiles:3,total:41},
      {division:"APOYO / UNIDAD",elemento:"SEGURIDAD",oficiales:6,suboficiales:18,sv:39,civiles:0,total:63},
      {division:"SISTEMAS AÉREOS",elemento:"F-16CJ BLOCK 50",oficiales:20,suboficiales:48,sv:26,civiles:1,total:95},
      {division:"SISTEMAS AÉREOS",elemento:"IAI HARPY",oficiales:8,suboficiales:24,sv:25,civiles:0,total:57},
      {division:"SISTEMAS AÉREOS",elemento:"LJ-60",oficiales:10,suboficiales:27,sv:15,civiles:1,total:53},
      {division:"SISTEMAS AÉREOS",elemento:"HERMES 450",oficiales:8,suboficiales:18,sv:12,civiles:0,total:38},
      {division:"SISTEMAS AÉREOS",elemento:"EC-130H",oficiales:12,suboficiales:38,sv:18,civiles:8,total:76},
      {division:"SISTEMAS AÉREOS",elemento:"BELL-412",oficiales:12,suboficiales:10,sv:22,civiles:2,total:46},
      {division:"SISTEMAS AÉREOS",elemento:"CH-47F",oficiales:24,suboficiales:60,sv:18,civiles:1,total:103},
      {division:"DEFENSA ANTIAÉREA",elemento:"NASAMS",oficiales:12,suboficiales:26,sv:20,civiles:0,total:58},
      {division:"DEFENSA ANTIAÉREA",elemento:"SKYGUARD OERLIKON",oficiales:8,suboficiales:20,sv:20,civiles:0,total:48},
      {division:"DEFENSA ANTIAÉREA",elemento:"RBS70",oficiales:6,suboficiales:17,sv:18,civiles:0,total:41},
      {division:"DEFENSA ANTIAÉREA",elemento:"GM 400A",oficiales:6,suboficiales:20,sv:22,civiles:2,total:50},
    ],
    total:{oficiales:159,suboficiales:371,sv:290,civiles:20,total:840},
  },
  "Base Aérea Militar Malargüe": {
    filas: [
      {division:"COMANDO / APOYO",elemento:"ADMINIST./MANTENIM.",oficiales:10,suboficiales:42,sv:28,civiles:4,total:84},
      {division:"COMANDO / APOYO",elemento:"SANIDAD",oficiales:3,suboficiales:9,sv:18,civiles:2,total:32},
      {division:"COMANDO / APOYO",elemento:"CAOC ALTERNATIVO",oficiales:26,suboficiales:48,sv:18,civiles:1,total:93},
      {division:"COMANDO / APOYO",elemento:"GRUPO 2 COM",oficiales:12,suboficiales:50,sv:20,civiles:5,total:87},
      {division:"COMANDO / APOYO",elemento:"ESC ICIA MALARGÜE",oficiales:7,suboficiales:22,sv:12,civiles:11,total:52},
      {division:"COMANDO / APOYO",elemento:"SEGURIDAD",oficiales:6,suboficiales:28,sv:77,civiles:2,total:113},
      {division:"DEFENSA ANTIAÉREA",elemento:"NASAMS",oficiales:16,suboficiales:48,sv:28,civiles:0,total:92},
      {division:"DEFENSA ANTIAÉREA",elemento:"SKYGUARD OERLIKON",oficiales:8,suboficiales:32,sv:36,civiles:0,total:76},
      {division:"DEFENSA ANTIAÉREA",elemento:"RBS70",oficiales:6,suboficiales:28,sv:48,civiles:0,total:82},
    ],
    total:{oficiales:94,suboficiales:307,sv:285,civiles:25,total:711},
  },
};

const PERSONAL_ALFA_ESTADO_MAYOR: PersonalUnidad = {
  filas: [{elemento:"ESTADO MAYOR",oficiales:52,suboficiales:180,sv:70,civiles:26,total:328}],
  total:{oficiales:52,suboficiales:180,sv:70,civiles:26,total:328},
};

const NUMERICA_CAEC_ALFA = {oficiales:1211,suboficiales:3028,sv:2027,civiles:213,total:6479};

const UNIDADES: Unidad[] = [
  {nombre:"Grupo 1 COM",ubicacion:"San Luis",medios:[],comunicaciones:COMUNICACIONES.g1,personal:PERSONAL_ALFA["Grupo 1 COM"]},
  {nombre:"1ª Brigada Aérea",ubicacion:"La Rioja",comunicaciones:COMUNICACIONES["1ba"],personal:PERSONAL_ALFA["1ª Brigada Aérea"],medios:[
    {nombre:"C-130J",cantidad:10,detalle:"Escuadrón 1 TA"},{nombre:"KC-130J",cantidad:4,detalle:"Escuadrón 2 TA"},
    {nombre:"LJ-60",cantidad:3,detalle:"Escuadrón 3 TA/VIP"},{nombre:"DHC-6",cantidad:4,detalle:"Escuadrón 4 TA"},
    {nombre:"B-412",cantidad:4,detalle:"1ra Sección H"},{nombre:"UH-1Y",cantidad:4,detalle:"1ra Sección H"},
    {nombre:"NASAMS",cantidad:1,detalle:"Escuadrón 1 DAa"},{nombre:"OERLIKON SKYGUARD",cantidad:1,detalle:"Escuadrón 1 DAa"},{nombre:"TPS-77",cantidad:1,detalle:"Escuadrón 4 VyCA"},
  ],observaciones:["ECCO: no cuenta con red alámbrica; las líneas pasan a 2 km de la unidad."]},
  {nombre:"2ª Brigada Aérea",ubicacion:"Villa Mercedes",comunicaciones:COMUNICACIONES["2ba"],personal:PERSONAL_ALFA["2ª Brigada Aérea"],medios:[
    {nombre:"F-16C Block 40",cantidad:20,detalle:"Escuadrón 1 C"},{nombre:"AMX A-1M",cantidad:12,detalle:"1ra Escuadrilla A"},
    {nombre:"T-6 Texan II",cantidad:12,detalle:"7ma Escuadrilla A"},{nombre:"Hermes 450",cantidad:3,detalle:"Escuadrón 1 SIGINT"},
    {nombre:"B-412",cantidad:4,detalle:"2da Sección H"},{nombre:"UH-1Y",cantidad:4,detalle:"2da Sección H"},{nombre:"DHC-6",cantidad:4,detalle:"Escuadrón 9 TA"},
    {nombre:"NASAMS",cantidad:2,detalle:"Escuadrón 2 DAa"},{nombre:"OERLIKON SKYGUARD",cantidad:1,detalle:"Escuadrón 2 DAa"},{nombre:"TPS-77",cantidad:1,detalle:"Escuadrón 2 VyCA"},
  ]},
  {nombre:"3ª Brigada Aérea",ubicacion:"Córdoba",comunicaciones:COMUNICACIONES["3ba"],personal:PERSONAL_ALFA["3ª Brigada Aérea"],medios:[
    {nombre:"AMX A-1M",cantidad:12,detalle:"5ta Escuadrilla A"},{nombre:"T-6 Texan II",cantidad:12,detalle:"8va Escuadrilla A"},
    {nombre:"E-99M ERIEYE",cantidad:3,detalle:"Escuadrón AWACS"},{nombre:"B-412",cantidad:2,detalle:"3ra Sección H"},
    {nombre:"UH-1Y",cantidad:4,detalle:"3ra Sección H"},{nombre:"KC-135",cantidad:3,detalle:"Escuadrón 5 TA"},{nombre:"CH-47F",cantidad:6,detalle:"Escuadrón 1 H"},
    {nombre:"PATRIOT",cantidad:1,detalle:"Escuadrón 3 DAa"},{nombre:"OERLIKON SKYGUARD",cantidad:1,detalle:"Escuadrón 3 DAa"},{nombre:"TPS-77",cantidad:1,detalle:"Escuadrón 1 VyCA"},
  ]},
  {nombre:"4ª Brigada Aérea",ubicacion:"Mendoza",comunicaciones:COMUNICACIONES["4ba"],personal:PERSONAL_ALFA["4ª Brigada Aérea"],medios:[
    {nombre:"F-16C Block 40",cantidad:14,detalle:"Escuadrón 3 C"},{nombre:"F-16D Block 42",cantidad:6,detalle:"Escuadrón 3 C"},
    {nombre:"DHC-6",cantidad:4,detalle:"Escuadrón 7 TA"},{nombre:"KC-135",cantidad:3,detalle:"Escuadrón 8 TA"},
    {nombre:"B-412",cantidad:2,detalle:"4ta Sección H"},{nombre:"UH-1Y",cantidad:4,detalle:"4ta Sección H"},
    {nombre:"PATRIOT",cantidad:1,detalle:"Escuadrón 4 DAa"},{nombre:"OERLIKON SKYGUARD",cantidad:1,detalle:"Escuadrón 4 DAa"},
  ]},
  {nombre:"5ª Brigada Aérea",ubicacion:"General Acha",comunicaciones:COMUNICACIONES["5ba"],personal:PERSONAL_ALFA["5ª Brigada Aérea"],medios:[
    {nombre:"F-16CJ Block 50",cantidad:10,detalle:"Escuadrón 2 C"},{nombre:"IAI HARPY",cantidad:36,detalle:"Escuadrón 1 UCAV"},
    {nombre:"LJ-60",cantidad:3,detalle:"Escuadrón 1 MEDEVAC"},{nombre:"HERMES 450",cantidad:3,detalle:"Escuadrón 2 EyR"},
    {nombre:"EC-130H COMPASS CALL",cantidad:2,detalle:"Escuadrón 1 GE"},{nombre:"B-412",cantidad:2,detalle:"5ta Sección H"},
    {nombre:"CH-47F",cantidad:6,detalle:"Escuadrón 2 H"},{nombre:"NASAMS",cantidad:1,detalle:"Escuadrón 5 DAa"},
    {nombre:"OERLIKON SKYGUARD",cantidad:1,detalle:"Escuadrón 5 DAa"},
    {nombre:"GM 400A",cantidad:1,detalle:"Escuadrón 3 VyCA"},
  ],observaciones:["ECCO: el sistema alámbrico presenta grandes deficiencias y cortes debido a la gran inundación de 2022."]},
  {nombre:"Base Aérea Militar Malargüe",ubicacion:"Malargüe",comunicaciones:COMUNICACIONES.bam,personal:PERSONAL_ALFA["Base Aérea Militar Malargüe"],medios:[
    {nombre:"COAe alternativo",cantidad:1},{nombre:"Grupo 2 COM",cantidad:1},{nombre:"NASAMS",cantidad:2,detalle:"Esc. 7 DAa"},
    {nombre:"OERLIKON SKYGUARD",cantidad:1,detalle:"Esc. 7 DAa"},
  ]},
  {nombre:"Grupo 2 COM",ubicacion:"Malargüe",medios:[],comunicaciones:COMUNICACIONES.g2},
];


const ARMAMENTO_REALICO: InventarioArmamento[] = [
  {id:"gbu10",nombre:"GBU-10 Paveway II",cantidadInicial:48,pesoKg:907},
  {id:"gbu12",nombre:"GBU-12 Paveway II",cantidadInicial:48,pesoKg:227},
  {id:"gbu38",nombre:"GBU-38 JDAM",cantidadInicial:78,pesoKg:227},
  {id:"aim9m",nombre:"AIM-9M Sidewinder",cantidadInicial:180},
  {id:"aim120c5",nombre:"AIM-120C-5 AMRAAM",cantidadInicial:240},
  {id:"aim7p",nombre:"AIM-7P Sparrow",cantidadInicial:220},
  {id:"agm65g",nombre:"AGM-65G Maverick",cantidadInicial:120,pesoKg:302},
  {id:"agm88c",nombre:"AGM-88C HARM",cantidadInicial:140},
  {id:"mar1",nombre:"MAR-1",cantidadInicial:96},
  {id:"mk84",nombre:"MARK 84",cantidadInicial:250,pesoKg:907},
  {id:"mk83",nombre:"MARK 83",cantidadInicial:250,pesoKg:454},
  {id:"mk82",nombre:"MARK 82",cantidadInicial:250,pesoKg:227},
];

const BASES_OPERACION = [
  "La Rioja","Villa Mercedes","Córdoba","Mendoza","General Acha","Malargüe"
] as const;

const DISTANCIA_REALICO_KM: Record<string,number> = {
  "La Rioja":806,
  "Villa Mercedes":238,
  "Córdoba":435,
  "Mendoza":609,
  "General Acha":294,
  "Malargüe":582,
};

const CAPACIDAD_TRANSPORTE_TN: Record<OperacionLogistica["transporte"],number> = {
  "Camión 5 Tn":5,
  "Camión 20 Tn":20,
};

const TFP_TOTAL_POR_4: Record<OperacionLogistica["esfuerzo"],Record<string,number>> = {
  MEIC:{
    "F-16C Block 40":56,"F-16D Block 42":56,"F-16CJ Block 50":56,
    "AMX A-1M":56,"T-6 Texan II":26,"IAI HARPY":10,"EC-130H COMPASS CALL":18,
    "E-99M ERIEYE":18,"HERMES 450":18,"C-130J":26,"KC-130J":26,"KC-135":26,
    "LJ-60":18,"DHC-6":14,"CH-47F":14,"UH-1Y":14,"B-412":14,
  },
  MESC:{
    "F-16C Block 40":46,"F-16D Block 42":46,"F-16CJ Block 50":46,
    "AMX A-1M":46,"T-6 Texan II":26,"IAI HARPY":10,"EC-130H COMPASS CALL":18,
    "E-99M ERIEYE":18,"HERMES 450":18,"C-130J":20,"KC-130J":20,"KC-135":20,
    "LJ-60":18,"DHC-6":10,"CH-47F":10,"UH-1Y":10,"B-412":10,
  },
  ERC:{
    "F-16C Block 40":24,"F-16D Block 42":24,"F-16CJ Block 50":24,
    "AMX A-1M":24,"T-6 Texan II":14,"IAI HARPY":6,"EC-130H COMPASS CALL":10,
    "E-99M ERIEYE":10,"HERMES 450":10,"C-130J":10,"KC-130J":10,"KC-135":10,
    "LJ-60":10,"DHC-6":10,"CH-47F":10,"UH-1Y":10,"B-412":10,
  },
};


const AERONAVES_PLANIFICABLES = new Set([
  "F-16C Block 40","F-16D Block 42","F-16CJ Block 50",
  "AMX A-1M","T-6 Texan II","IAI HARPY",
  "EC-130H COMPASS CALL","E-99M ERIEYE","HERMES 450",
  "C-130J","KC-130J","KC-135","LJ-60","DHC-6",
  "CH-47F","UH-1Y","B-412",
]);

const AERONAVES_TRANSPORTE = new Set([
  "C-130J","KC-130J","KC-135","LJ-60","DHC-6","CH-47F","UH-1Y","B-412",
]);

const AERONAVES_SIN_ARMAMENTO_PLANIFICADO = new Set([
  "C-130J","KC-130J","KC-135","LJ-60","DHC-6","CH-47F","UH-1Y","B-412",
  "E-99M ERIEYE","EC-130H COMPASS CALL","HERMES 450",
]);

const COMBUSTIBLE_DOCUMENTADO: Record<string,{internoKg?:number;configKg?:number;nota:string}> = {
  "F-16C Block 40":{internoKg:3175,configKg:5443,nota:"Dato disponible: 3.175 kg interno; 5.443 kg totales con 2 tanques externos. No existe aún en la documentación cargada un factor de consumo por km/hora para calcular combustible de misión."},
  "F-16D Block 42":{internoKg:3175,configKg:5443,nota:"Dato disponible: 3.175 kg interno; 5.443 kg totales con 2 tanques externos. No existe aún en la documentación cargada un factor de consumo por km/hora para calcular combustible de misión."},
  "F-16CJ Block 50":{internoKg:3175,configKg:5443,nota:"Dato disponible: 3.175 kg interno; 5.443 kg totales con 2 tanques externos. No existe aún en la documentación cargada un factor de consumo por km/hora para calcular combustible de misión."},
};

function esfuerzoPorMomento(fase:Seccion,momento:string): OperacionLogistica["esfuerzo"] {
  if(fase==="fase2") return "MEIC";
  if(fase==="fase3") return "MESC";
  if(fase==="fase4") return "ERC";
  if(fase==="fase1" && momento.includes("Alerta")) return "MESC";
  return "ERC";
}

const FASES: Fase[] = [
  {id:"fase1",titulo:"FASE I",subtitulo:"PREPARACIÓN · recepción del Plan hasta D",momentos:[
    {nombre:"Antes de M · Momento 1 · Concepción",periodo:"Recepción del Plan → M",detalle:"Concepción y planeamiento. Los medios aún no están bajo control operacional del CAeTON."},
    {nombre:"M+1 a M+4 · Momento 2 · Despliegue",periodo:"M+1 → M+4",detalle:"Desplegar los medios a las PPRRFF correspondientes. ERC."},
    {nombre:"M+5 a M+7 · Momento 2 · Abastecimiento",periodo:"M+5 → M+7",detalle:"Abastecer el armamento necesario a las PPRRFF correspondientes. ERC."},
    {nombre:"M+8 a M+40 · Momento 2 · Adiestramiento",periodo:"M+8 → M+40",detalle:"Adiestrar los sistemas de armas en el área de operaciones. ERC."},
    {nombre:"M+41 a M+45 · Momento 2 · Comprobación",periodo:"M+41 → M+45",detalle:"Comprobar el sistema aéreo ofensivo. ERC."},
    {nombre:"A a D · Momento 3 · Alerta",periodo:"A → D",detalle:"Alerta estratégica y máximo esfuerzo sostenido de combate. MESC."},
  ]},
  {id:"fase2",titulo:"FASE II",subtitulo:"TOMAR LA INICIATIVA · D a D+1",momentos:[
    {nombre:"D a D+1 · Operaciones",periodo:"D → D+1",detalle:"Operaciones de Fase II. Máximo esfuerzo intensivo de combate (MEIC)."},
  ]},
  {id:"fase3",titulo:"FASE III",subtitulo:"DOMINAR · D+2 a D+9",momentos:[
    {nombre:"D+2 a D+9 · Operaciones",periodo:"D+2 → D+9",detalle:"Operaciones de Fase III. Máximo esfuerzo sostenido de combate (MESC)."},
  ]},
  {id:"fase4",titulo:"FASE IV",subtitulo:"ESTABILIZACIÓN · D+10 hasta finalizar repliegue",momentos:[
    {nombre:"D+10 en adelante · Repliegue",periodo:"Desde D+10",detalle:"Repliegue gradual a los asientos naturales. ERC."},
  ]},
];

const ABASTECIMIENTO = [
  {clase:"CLASE I",titulo:"Subsistencia",items:["Adquisición en la zona de emplazamiento de cada Unidad.","Dificultades: informar con al menos 72 h de antelación.","Mercaderías frescas: entrega en el día; víveres secos: entrega periódica."]},
  {clase:"CLASE II",titulo:"Vestuario, equipo y material general",items:["Vestuario apropiado disponible.","Depósitos Mayores: existencias para requerimientos normales por 12 meses.","Las Unidades carecen en general de elementos para vivaquear.","Vehículos: 75% en servicio; mayoría con 15 años de uso.","Herramientas de mano de mecánicos: suficientes para exigencias normales."]},
  {clase:"CLASE III",titulo:"Combustibles y lubricantes terrestres",items:["Unidades de asiento: nivel de rutina para hasta 15 días.","PRF: sostener operaciones al menos 5 días.","Ciclo de reabastecimiento en PRF: 3 días desde el requerimiento."]},
  {clase:"CLASE III A",titulo:"Combustible y lubricantes de aeronaves",items:["Ciclo en aeródromos de asiento: 4 días.","Ciclo en PRF fuera del asiento: 3 días."]},
  {clase:"CLASES II A y V A",titulo:"Repuestos y consumibles aeronáuticos",items:["Repuestos de mantenimiento menor: normales; depósitos para operación continua de 15 días.","Oxígeno: 10 días de operaciones.","Nitrógeno: 7 días de operaciones."]},
  {clase:"CLASES V y V A",titulo:"Munición y armamento",items:["Inventario detallado en Apéndice 1.","Las espoletas indicadas son compatibles con las bombas disponibles.","Para esta página, la totalidad del armamento se presenta concentrada inicialmente en Realicó, conforme al criterio de trabajo indicado para A4."]},
];

const ARMAMENTO = [
  {grupo:"F-16 C/D/CJ",filas:[
    ["MARK 84","250","A/T PG 907 kg"],["MARK 83","250","A/T PG 454 kg"],["MARK 82","250","A/T PG 227 kg"],
    ["GBU-10 Paveway II","48","Guiado láser; se usa con Mk 84"],["GBU-12 Paveway II","48","Guiado láser; se usa con Mk 82"],
    ["GBU-38 JDAM","78","Joint Direct Attack Munition (Mk 82)"],["LAU-61/66","450 / 450","Cohetes A/S"],
    ["AIM-9M Sidewinder","180","A/A IR 18 km all aspect"],["AIM-120C-5 AMRAAM","240","BVR A/A 105 km; NEZ 65 km"],
    ["AIM-7P Sparrow","220","BVR A/A 70 km"],["AGM-65G Maverick","120","A/T; 302 kg; 34 km; guía TV"],
    ["AN/AAQ-13/14 LANTIRN","34 / 34","NAV / Targeting / FLIR"],["AGM-88C HARM","140","Antirradar A/S 148 km"],
    ["AN/ASQ-213","10","HARM Targeting System"],["AGM-119 Penguin","80","Antibuque 385 kg / 55 km"],
    ["AN/ALQ-184/131","32 / 32","PODS ECM"],["Tanques de combustible","106 / 212","76 de 300 US gal / 152 de 370 US gal"],
    ["CHAFF / FLARE","16000 / 16000",""],["20 mm","68000","Cañón M61A1 Vulcan"],
  ]},
  {grupo:"AMX A-1M",filas:[
    ["MARK 84/83/82","300","A/T PG 454 / 227 / 118 kg"],["GBU-10/12/16","48 / 48 / 48","Paveway II"],
    ["MAR-1","96","Antirradar A/S 80 km"],["CHAFF / FLARE","6000 / 6000","AN/ALE-47"],
    ["AIM-9M Sidewinder","140","A/A IR 18 km all aspect"],["LAU-61/A","450","2.75 pulgadas"],["30 mm","24000","2 x DEFA 554"],
  ]},
  {grupo:"T-6 TEXAN II",filas:[
    ["MARK 81/82","180 / 180","A/T PG 227 / 118 kg"],["LAU-61/A","450","2.75 pulgadas"],
    ["GBU-12 Paveway II","48","Guiado láser; se usa con Mk 82"],["12.7 mm","64000","48 pods disponibles"],
  ]},
  {grupo:"Alas rotativas",filas:[
    ["CH-47F · M134 MINIGUN","12000","Pods y afuste"],["UH-1Y · 12.7 mm","14000","Pods y afuste"],
    ["UH-1Y · M134 MINIGUN","48000","Pods y afuste"],["UH-1Y · HYDRA 70 APKWS","520","Cohete guía láser"],
    ["B-412 · M134 MINIGUN","12000","Pods y afuste"],
  ]},
  {grupo:"Munición terrestre",filas:[
    ["9 mm","300000",""],["5,56 mm","380000",""],["7,62 mm","150000",""],[".38","1500",""],[".50","55000",""],
    ["Mina terrestre antipersonal","500",""],["Mina terrestre antitanque","1800",""],
  ]},
  {grupo:"Munición antiaérea",filas:[
    ["Misil PATRIOT","80",""],["Misil AIM-120B","130",""],["Misil RBS-70NG","250",""],["35 mm","320000",""],
  ]},
];

const MATERIAL_DELTA = {
  transporte:[
    ["Citroën C4","5"],["Toyota Land Cruiser","35"],["Mercedes Benz Sprinter","12"],["Volkswagen Amarok","22"],
    ["UNIMOG","30"],["Ómnibus 40 pasajeros","10"],["Grúas hasta 15.000 kg","8"],["Camiones 20 Tn","7"],["Camiones 5 Tn","10"],
  ],
  aeronavesApoyo:[
    ["EC-130H Compass Call","2","GE / AE / ERA / C2"],["E-99M Erieye","3","VyCA aerotransportado / C2"],["Elbit Hermes 450","6","ELINT / COMINT"],
    ["C-130J","10","TPT carga / tropas / asalto aéreo"],["KC-130J","4","REV / TPT carga"],["KC-135 Stratotanker","6","REV"],
    ["Learjet 60","6","VIP / MEDEVAC"],["DHC6-400","12","TPT carga / tropas / asalto aéreo"],
    ["CH-47F","12","TPT carga / asalto aéreo / BYRCOM"],["UH-1Y","16","TPT carga / asalto aéreo / BYRCOM"],["B-412","14","CASEVAC / BYS / TPT tropas / carga / asalto aéreo"],
  ],
  defensa:[
    ["RADAR TPS-77 MRR","3 unidades","Max rango 250–300 NM (360°)"],["RADAR GM 400 ALPHA","1 unidad","Max rango 270–320 NM (360°)"],
    ["MIM-104B Patriot PAC 1","2 baterías","Max rango 160 km; max altitud 24.240 m"],
    ["NASAMS 1","6 baterías","MR 35 km / 16.000 m; SR 15 km / 9.000 m"],
    ["Skyguard III / Oerlikon GDF007","8 baterías","1 unidad control tiro + 2 piezas gemelas 35 mm; 4.000 m"],
    ["RBS-70 NG","80 unidades de lanzamiento","Max rango 9 km; max altitud 5.000 m"],
  ],
  abastecedoras:[
    ["1ª BA","20.000 L","3"],["2ª BA","10.000 L","4"],["3ª BA","10.000 L","5"],["4ª BA","10.000 L","4"],["5ª BA","20.000 L","2"],["BAM Malargüe","10.000 L","3"],
  ],
  mantenimiento:[
    "Armamento aéreo: sin novedades significativas; mantenimiento desde unidades de asiento natural.",
    "Artillería antiaérea: promedio 90% de piezas en servicio.",
    "Vehículos de remolque para artillería antiaérea: cantidad suficiente según TFP.",
    "Comunicaciones: mantenimiento en las Unidades; los talleres de electrónica pueden limitar despliegue o tiempos en PRF.",
  ],
  servicios:[
    "Construcciones no directamente operativas: suspendidas por razones presupuestarias.",
    "Deficiencia de búnkeres para aeronaves en 2ª, 3ª y 4ª Brigadas Aéreas.",
    "Grupo II Construcciones (Río Cuarto): 2 equipos de reparación y mantenimiento de pistas; capacidad hasta 3 búnkeres diarios, dependiendo del lugar.",
    "Servicio contra incendio: el de cada Unidad; extras vía C4 del TON.",
    "Todas las Unidades: balizamiento eléctrico, balizado de emergencia y generadores eléctricos.",
    "Torres móviles completas: 1ª, 2ª y 5ª Brigadas Aéreas; transportables por vía aérea.",
  ],
};

const TFP_AVIONES = {
  meic:{titulo:"3 DÍAS · MEIC · 4 AERONAVES",filas:[
    ["Jefe",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],["Encargado",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ["Estructuras",8,8,4,2,4,4,4,6,6,6,4,2,2,2,2],["Armamento",16,16,8,2,"—","—","—","—","—","—","—","—","—","—","—"],
    ["Aviónica",14,14,4,2,4,4,4,6,6,6,4,4,4,4,4],["Hidráulica",8,8,4,"—",4,4,4,6,6,6,4,4,4,4,4],
    ["Equipos especiales",8,8,4,2,4,4,4,6,6,6,4,2,2,2,2],["TOTALES",56,56,26,10,18,18,18,26,26,26,18,14,14,14,14],
  ]},
  mesc:{titulo:"5 DÍAS · MESC · 4 AERONAVES",filas:[
    ["Jefe",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],["Encargado",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ["Estructuras",8,8,4,2,4,4,4,4,4,4,4,2,2,2,2],["Armamento",12,12,8,2,"—","—","—","—","—","—","—","—","—","—","—"],
    ["Aviónica",8,8,4,2,4,4,4,4,4,4,4,2,2,2,2],["Hidráulica",8,8,4,"—",4,4,4,4,4,4,4,2,2,2,2],
    ["Equipos especiales",8,8,4,2,4,4,4,6,6,6,4,2,2,2,2],["TOTALES",46,46,26,10,18,18,18,20,20,20,18,10,10,10,10],
  ]},
  erc:{titulo:"5 DÍAS · ERC · 4 AERONAVES",filas:[
    ["Jefe",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],["Encargado",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ["Estructuras",4,4,2,1,2,2,2,2,2,2,2,2,2,2,2],["Armamento",6,6,4,1,"—","—","—","—","—","—","—","—","—","—","—"],
    ["Aviónica",4,4,2,1,2,2,2,2,2,2,2,2,2,2,2],["Hidráulica",4,4,2,"—",2,2,2,2,2,2,2,2,2,2,2],
    ["Equipos especiales",4,4,2,1,2,2,2,2,2,2,2,2,2,2,2],["TOTALES",24,24,14,6,10,10,10,10,10,10,10,10,10,10,10],
  ]},
};

const AVIONES_TFP=["F-16C Block 40 / F-16D Block 42","AMX A-1M","T-6 Texan II","IAI Harpy (UCAV)","EC-130H Compass Call","E-99M Erieye","Elbit Hermes 450","C-130J","KC-130J","KC-135 Stratotanker","Learjet 60","DHC6-400","CH-47F","UH-1Y","B-412"];

const VEHICULOS_TFP = [
  ["Citroën C4",5,1,5,15,7.5,5,0.4,37.5],["Toyota Land Cruiser",35,1,35,105,11.5,7,0.8,57.5],
  ["VW Amarok",22,1,22,66,9.5,5,1,47.5],["MB Sprinter",12,2,24,72,10,19,1.5,50],
  ["UNIMOG",30,2,60,180,24,14,2.5,120],["Ómnibus",10,2,20,60,28,40,3,140],
  ["Grúas 15 Tn",8,2,16,48,45,"—",15,225],["Camiones 5 Tn",10,2,20,60,22,"—",5,110],
  ["Camiones 20 Tn",7,2,14,42,36,"—",20,180],
];

const RACIONAMIENTO = [
  ["Estado Mayor",328,656,1,1,1],["Grupo 1 COM Esc. INCIA UIS",149,298,1,1,1],["1ª Brigada Aérea",1305,2610,3,1,3],
  ["2ª Brigada Aérea",1293,2586,3,1,3],["3ª Brigada Aérea",1201,2402,3,1,3],["4ª Brigada Aérea",652,1304,2,1,2],
  ["5ª Brigada Aérea",840,1680,2,1,2],["Base Aérea Militar",711,1422,2,1,2],["TOTAL",6479,12958,17,8,17],
];

const EQUIPO_APOYO = [
  ["Planta de arranque Hobart (CUMMIS 140-180 KVA)",2,0,0,0,2,34,2360,"—","—"],
  ["Tractor de arrastre Harlan (COMMIS HT-30, HT-50)",2,0,1,0,3,8,2950,"—",22],
  ["Elevador de bombas (MJ-JAMMER, MHU-83)",2,2,1,1,6,6,3950,1.36,"—"],
  ["Abastecedoras",2,0,1,0,3,"—","—","—","—"],
  ["TeLex (Cap. 5 a 7 Tons.)",1,1,0,0,2,6,4500,7,"—"],
];

const DISTANCIAS = [
  ["La Rioja","—","520","435","600","1000","930","460","610","806","—","445","365","450","875","750","430","465","655"],
  ["Villa Mercedes","520","—","290","360","480","580","95","125","238","445","—","260","320","420","460","95","120","195"],
  ["Córdoba","435","290","—","610","720","840","410","215","435","365","260","—","470","640","690","290","200","405"],
  ["Mendoza","600","360","610","—","760","330","260","480","609","450","320","470","—","740","295","235","400","475"],
  ["General Acha","1000","480","720","760","—","580","440","505","294","875","420","640","740","—","510","430","480","265"],
  ["Malargüe","930","580","840","330","580","—","480","620","582","750","460","690","295","510","—","410","540","485"],
  ["San Luis","460","95","410","260","440","480","—","220","331","430","95","290","235","430","410","—","195","275"],
  ["Río Cuarto","610","125","215","480","505","620","220","—","223","465","120","200","400","480","540","195","—","215"],
  ["Realicó","806","238","435","609","294","582","331","223","—","655","195","405","475","265","485","275","215","—"],
];
const LUGARES_DIST=["La Rioja","Villa Mercedes","Córdoba","Mendoza","General Acha","Malargüe","San Luis","Río Cuarto","Realicó"];


function resumenPersonalPorDivision(personal: PersonalUnidad){
  const acumulado: Record<string,{oficiales:number;suboficiales:number;sv:number;civiles:number;total:number}> = {};
  for(const fila of personal.filas){
    const division = fila.division ?? "UNIDAD";
    if(!acumulado[division]){
      acumulado[division]={oficiales:0,suboficiales:0,sv:0,civiles:0,total:0};
    }
    acumulado[division].oficiales += fila.oficiales;
    acumulado[division].suboficiales += fila.suboficiales;
    acumulado[division].sv += fila.sv;
    acumulado[division].civiles += fila.civiles;
    acumulado[division].total += fila.total;
  }
  return Object.entries(acumulado).map(([division,valores])=>({division,...valores}));
}

function Tabla({headers,rows}:{headers:string[];rows:(string|number)[][]}){
  return <div className="overflow-x-auto rounded-lg border border-slate-800"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-950 text-slate-400"><tr>{headers.map(h=><th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-slate-800">{r.map((v,j)=><td key={j} className={`px-3 py-2 ${j===0?"font-semibold text-slate-200":"text-slate-300"}`}>{v}</td>)}</tr>)}</tbody></table></div>;
}


function inventarioAeronavesPorBase(){
  const salida: Record<string,Record<string,number>> = {};
  for(const unidad of UNIDADES){
    salida[unidad.ubicacion] ??= {};
    for(const medio of unidad.medios){
      if(typeof medio.cantidad!=="number") continue;
      if(!AERONAVES_PLANIFICABLES.has(medio.nombre)) continue;
      salida[unidad.ubicacion][medio.nombre]=(salida[unidad.ubicacion][medio.nombre]??0)+medio.cantidad;
    }
  }
  return salida;
}

function personalTecnicoTFP(sistema:string,cantidad:number,esfuerzo:OperacionLogistica["esfuerzo"]){
  const factor=TFP_TOTAL_POR_4[esfuerzo][sistema];
  if(!factor || cantidad<=0) return null;
  return Math.ceil((factor*cantidad)/4);
}

function ControlLogisticoTON(){
  const [open,setOpen]=useState(false);
  const [seccion,setSeccion]=useState<Seccion>("situacion");
  const [fasesAbiertas,setFasesAbiertas]=useState<Record<string,boolean>>({});
  const [unidadAbierta,setUnidadAbierta]=useState<string|null>("5ª Brigada Aérea");
  const [tfpBloque,setTfpBloque]=useState<string>("aviones");

  const [operaciones,setOperaciones]=useState<OperacionLogistica[]>([]);
  const [momentoPlan,setMomentoPlan]=useState<string>("");
  const [nombreOperacion,setNombreOperacion]=useState("");
  const [baseOperacion,setBaseOperacion]=useState<string>("Villa Mercedes");
  const [sistemaOperacion,setSistemaOperacion]=useState<string>("F-16C Block 40");
  const [cantidadOperacion,setCantidadOperacion]=useState(1);
  const [armamentoOperacion,setArmamentoOperacion]=useState("GBU-10 Paveway II");
  const [armamentoPorAeronave,setArmamentoPorAeronave]=useState(2);
  const [distanciaOperacion,setDistanciaOperacion]=useState(0);
  const [destinoOperacion,setDestinoOperacion]=useState("");
  const [transporteOperacion,setTransporteOperacion]=useState<OperacionLogistica["transporte"]>("Camión 20 Tn");
  const [tipoEmpleo,setTipoEmpleo]=useState<"operacion"|"movilizacion"|"abastecimiento"|"repliegue">("operacion");

  const faseActiva=FASES.find(f=>f.id===seccion);

  const inventarioAeronaves=useMemo(()=>inventarioAeronavesPorBase(),[]);
  const momentosFase=faseActiva?.momentos??[];
  const momentoSeleccionado=momentoPlan || momentosFase[0]?.nombre || "";
  const esfuerzoSeleccionado=esfuerzoPorMomento(seccion,momentoSeleccionado);

  const operacionesAceptadasMomento=operaciones.filter(o=>o.aceptada&&o.fase===seccion&&o.momento===momentoSeleccionado);

  const comprometidosSistemaBase=(base:string,sistema:string)=>
    operacionesAceptadasMomento
      .filter(o=>o.base===base&&o.sistema===sistema)
      .reduce((s,o)=>s+o.cantidad,0);

  const remanenteAeronaves=(base:string,sistema:string)=>{
    const inicial=inventarioAeronaves[base]?.[sistema]??0;
    return inicial-comprometidosSistemaBase(base,sistema);
  };

  const armamentoConsumido=(nombre:string)=>
    operaciones.filter(o=>o.aceptada&&o.armamento===nombre)
      .reduce((s,o)=>s+(o.cantidad*o.armamentoPorAeronave),0);

  const armamentoItem=ARMAMENTO_REALICO.find(a=>a.nombre===armamentoOperacion);
  const sistemaSinArmamento=AERONAVES_SIN_ARMAMENTO_PLANIFICADO.has(sistemaOperacion);
  const armamentoRequerido=sistemaSinArmamento?0:Math.max(0,cantidadOperacion)*Math.max(0,armamentoPorAeronave);
  const armamentoRemanenteRealico=(armamentoItem?.cantidadInicial??0)-armamentoConsumido(armamentoOperacion);
  const pesoArmamentoKg=(armamentoItem?.pesoKg??0)*armamentoRequerido;
  const viajesArmamento=armamentoItem?.pesoKg
    ? Math.ceil((pesoArmamentoKg/1000)/CAPACIDAD_TRANSPORTE_TN[transporteOperacion])
    : null;

  const personalTFP=personalTecnicoTFP(sistemaOperacion,cantidadOperacion,esfuerzoSeleccionado);
  const combustibleInfo=COMBUSTIBLE_DOCUMENTADO[sistemaOperacion];
  const nav=[
    ["situacion","SITUACIÓN INICIAL"],["tfp","TFP"],["fase1","FASE I"],["fase2","FASE II"],["fase3","FASE III"],["fase4","FASE IV"]
  ] as [Seccion,string][];

  const totalCom=useMemo(()=>Object.values(COMUNICACIONES).flat().reduce((s,x)=>s+x.cantidad,0),[]);

  return <>
    <button type="button" onClick={()=>setOpen(true)} className="mb-5 w-full rounded-lg border border-emerald-700 bg-emerald-950/30 px-4 py-3 text-left hover:bg-emerald-900/40">
      <span className="block text-xs font-black uppercase tracking-[.18em] text-emerald-300">A4 · LOGÍSTICA</span>
      <span className="mt-1 block text-base font-black text-white">Control Logístico TON</span>
      <span className="mt-1 block text-xs text-slate-400">Situación inicial · TFP · fases y momentos</span>
    </button>

    {open&&<div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950 px-5 py-4">
        <div className="relative flex items-center justify-center">
          <div className="text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">CONTROL LOGÍSTICO TON</p><h1 className="mt-1 text-2xl font-black">MOVIMIENTOS LOGÍSTICOS TON</h1></div>
          <button onClick={()=>setOpen(false)} className="absolute right-0 rounded bg-slate-800 px-3 py-2 text-xs font-bold">Cerrar</button>
        </div>
      </header>

      <div className="border-b border-slate-800 bg-slate-900 p-3">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 md:grid-cols-6">
          {nav.map(([id,label])=>{
            const faseNav=FASES.find((f)=>f.id===id);
            const abierta=faseNav ? !!fasesAbiertas[id] : false;

            return <div key={id} className="relative">
              <button
                onClick={()=>{
                  setSeccion(id);
                  if(faseNav){
                    setFasesAbiertas((x)=>({...x,[id]:!x[id]}));
                  }
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-black ${seccion===id?"border-emerald-500 bg-emerald-700 text-white":"border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"}`}
              >
                <span>{label}</span>
                {faseNav&&<span className="text-[10px]">{abierta?"▲":"▼"}</span>}
              </button>

              {faseNav&&abierta&&(
                <div className="absolute left-0 right-0 top-full z-50 mt-1 min-w-[230px] rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-2xl">
                  <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    Momentos
                  </p>
                  <div className="space-y-1">
                    {faseNav.momentos.map((m,i)=>(
                      <button
                        key={`${id}-${i}`}
                        type="button"
                        onClick={()=>{
                          setSeccion(id);
                          setFasesAbiertas((x)=>({...x,[id]:false}));
                        }}
                        className="block w-full rounded px-2 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                      >
                        {m.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>;
          })}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6"><div className="mx-auto max-w-7xl">
        {seccion==="situacion"&&<div className="space-y-6">
          <section><h2 className="text-xl font-black text-emerald-300">SITUACIÓN INICIAL</h2><p className="mt-1 text-sm text-slate-400">Dispositivo inicial del CAeC y material logístico antes de aplicar movimientos de campaña.</p><p className="mt-2 rounded border border-cyan-900/50 bg-cyan-950/10 p-3 text-xs text-cyan-100">Esta pantalla muestra únicamente información de situación inicial respaldada por los anexos del Plan de Campaña y el criterio operativo indicado para Realicó. No se incorporan aquí valores provenientes de TFP.</p></section>

          <section className="space-y-3">
            <div>
              <h3 className="font-black text-white">PERSONAL ASIGNADO · ANEXO ALFA</h3>
              <p className="text-xs text-slate-500">Apéndice 1: efectivos asignados al Componente Aeroespacial Conjunto. Los valores corresponden al Anexo ALFA, no a TFP.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Estado Mayor</p>
                <p className="mt-1 text-2xl font-black text-white">{PERSONAL_ALFA_ESTADO_MAYOR.total.total}</p>
                <p className="mt-1 text-[11px] text-slate-500">52 Oficiales · 180 Suboficiales · 70 S/V · 26 Civiles</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 md:col-span-1 xl:col-span-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Numérica CAeC</p>
                <div className="mt-2 grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="rounded bg-slate-950 p-2"><span className="block text-slate-500">Oficiales</span><b>{NUMERICA_CAEC_ALFA.oficiales}</b></div>
                  <div className="rounded bg-slate-950 p-2"><span className="block text-slate-500">Suboficiales</span><b>{NUMERICA_CAEC_ALFA.suboficiales}</b></div>
                  <div className="rounded bg-slate-950 p-2"><span className="block text-slate-500">S/V</span><b>{NUMERICA_CAEC_ALFA.sv}</b></div>
                  <div className="rounded bg-slate-950 p-2"><span className="block text-slate-500">Civiles</span><b>{NUMERICA_CAEC_ALFA.civiles}</b></div>
                  <div className="rounded bg-emerald-950/40 p-2"><span className="block text-emerald-400">TOTAL</span><b className="text-emerald-200">{NUMERICA_CAEC_ALFA.total}</b></div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3"><div><h3 className="font-black text-white">UNIDADES Y MEDIOS · ANEXO CHARLIE</h3><p className="text-xs text-slate-500">Cada unidad incorpora además su dotación de comunicaciones del Apéndice 1 de ECCO cuando existe discriminación por unidad.</p></div>
            {UNIDADES.map(u=>{const abierta=unidadAbierta===u.nombre;return <article key={`${u.nombre}-${u.ubicacion}`} className="rounded-xl border border-slate-800 bg-slate-900">
              <button onClick={()=>setUnidadAbierta(abierta?null:u.nombre)} className="flex w-full items-center justify-between gap-3 p-4 text-left"><div><b>{u.nombre}</b><p className="text-xs text-slate-500">{u.ubicacion}</p></div><span className="text-slate-400">{abierta?"−":"+"}</span></button>
              {abierta&&<div className="border-t border-slate-800 p-4 space-y-5">

                {u.medios.length>0&&<section>
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">Medios asignados · Anexo CHARLIE</h4>
                      <p className="text-[10px] text-slate-500">Medio, cantidad y observación según la organización de fuerzas.</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {u.medios.map((m,i)=><div key={i} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded bg-slate-950 px-3 py-2 text-xs">
                      <div>
                        <b className="text-slate-100">{m.nombre}</b>
                        {m.detalle&&<p className="mt-0.5 text-[10px] text-slate-500">{m.detalle}</p>}
                      </div>
                      {typeof m.cantidad==="number"&&<div className="min-w-[72px] text-right">
                        <span className="block text-[10px] uppercase text-slate-600">Cantidad</span>
                        <b className="text-base text-cyan-300">{m.cantidad}</b>
                      </div>}
                    </div>)}
                  </div>
                </section>}

                {u.personal&&<section className="rounded-xl border border-violet-900/40 bg-violet-950/10 p-4">
                  <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-violet-300">Personal asignado · Anexo ALFA</h4>

                  <div className="mb-3 grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="rounded bg-slate-950 p-2"><span className="block text-slate-500">Oficiales</span><b>{u.personal.total.oficiales}</b></div>
                    <div className="rounded bg-slate-950 p-2"><span className="block text-slate-500">Suboficiales</span><b>{u.personal.total.suboficiales}</b></div>
                    <div className="rounded bg-slate-950 p-2"><span className="block text-slate-500">S/V</span><b>{u.personal.total.sv}</b></div>
                    <div className="rounded bg-slate-950 p-2"><span className="block text-slate-500">Civiles</span><b>{u.personal.total.civiles}</b></div>
                    <div className="rounded bg-violet-950/50 p-2"><span className="block text-violet-400">TOTAL</span><b className="text-violet-200">{u.personal.total.total}</b></div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[650px] text-xs">
                      <thead className="bg-slate-950 text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">División</th>
                          <th className="px-3 py-2 text-center">Of.</th>
                          <th className="px-3 py-2 text-center">Subof.</th>
                          <th className="px-3 py-2 text-center">S/V</th>
                          <th className="px-3 py-2 text-center">Civ.</th>
                          <th className="px-3 py-2 text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenPersonalPorDivision(u.personal).map((f,i)=><tr key={i} className="border-t border-slate-800">
                          <td className="px-3 py-2 font-semibold text-violet-200">{f.division}</td>
                          <td className="px-3 py-2 text-center text-slate-300">{f.oficiales}</td>
                          <td className="px-3 py-2 text-center text-slate-300">{f.suboficiales}</td>
                          <td className="px-3 py-2 text-center text-slate-300">{f.sv}</td>
                          <td className="px-3 py-2 text-center text-slate-300">{f.civiles}</td>
                          <td className="px-3 py-2 text-center font-black text-violet-200">{f.total}</td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">El personal se resume por división para no mezclar en esta vista los sistemas de armas con los efectivos.</p>
                </section>}

                <section>
                  <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-sky-300">Comunicaciones · Anexo ECCO</h4>
                  {u.comunicaciones.length?<div className="grid gap-1 sm:grid-cols-2">{u.comunicaciones.map((c,i)=><div key={i} className="flex justify-between gap-2 rounded bg-slate-950 px-3 py-2 text-xs"><span>{c.equipo}</span><b className="text-sky-300">{c.cantidad}</b></div>)}</div>:null}
                  {u.observaciones?.map((o,i)=><p key={i} className="mt-2 rounded border border-amber-900/50 bg-amber-950/10 p-2 text-[11px] text-amber-200">{o}</p>)}
                </section>

              </div>}
            </article>})}
          </section>

          <section className="space-y-4"><div><h3 className="font-black text-white">MATERIAL Y ABASTECIMIENTO · ANEXO DELTA</h3><p className="text-xs text-slate-500">La estructura separa políticas de sostenimiento, inventarios y servicios. El armamento se presenta inicialmente concentrado en Realicó para el trabajo A4.</p></div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{ABASTECIMIENTO.map((a,i)=><div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="text-[10px] font-black text-emerald-300">{a.clase}</span><h4 className="mt-1 font-bold">{a.titulo}</h4><ul className="mt-2 space-y-1 text-xs text-slate-300">{a.items.map((x,j)=><li key={j}>• {x}</li>)}</ul></div>)}</div>

            <details className="rounded-xl border border-slate-800 bg-slate-900" open><summary className="cursor-pointer p-4 font-black text-amber-300">ARMAMENTO · DEPÓSITO INICIAL REALICÓ</summary><div className="space-y-4 border-t border-slate-800 p-4">{ARMAMENTO.map((g,i)=><div key={i}><h4 className="mb-2 text-xs font-black uppercase tracking-wider">{g.grupo}</h4><Tabla headers={["Material","Cantidad","Características"]} rows={g.filas}/></div>)}</div></details>

            <details className="rounded-xl border border-slate-800 bg-slate-900"><summary className="cursor-pointer p-4 font-black">AERONAVES DE APOYO / TRANSPORTE</summary><div className="border-t border-slate-800 p-4"><Tabla headers={["Sistema","Cantidad","Capacidad / función"]} rows={MATERIAL_DELTA.aeronavesApoyo}/></div></details>
            <details className="rounded-xl border border-slate-800 bg-slate-900"><summary className="cursor-pointer p-4 font-black">VYCA Y DEFENSA ANTIAÉREA</summary><div className="border-t border-slate-800 p-4"><Tabla headers={["Sistema","Cantidad","Características"]} rows={MATERIAL_DELTA.defensa}/></div></details>
            <details className="rounded-xl border border-slate-800 bg-slate-900"><summary className="cursor-pointer p-4 font-black">TRANSPORTE TERRESTRE</summary><div className="border-t border-slate-800 p-4"><Tabla headers={["Vehículo","Cantidad"]} rows={MATERIAL_DELTA.transporte}/></div></details>
            <details className="rounded-xl border border-slate-800 bg-slate-900"><summary className="cursor-pointer p-4 font-black">ABASTECEDORAS DE COMBUSTIBLE AERONÁUTICO</summary><div className="border-t border-slate-800 p-4"><Tabla headers={["Ubicación","Capacidad por unidad","Cantidad"]} rows={MATERIAL_DELTA.abastecedoras}/></div></details>
            <div className="grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><h4 className="font-black">Mantenimiento</h4><ul className="mt-2 space-y-1 text-xs text-slate-300">{MATERIAL_DELTA.mantenimiento.map((x,i)=><li key={i}>• {x}</li>)}</ul></div><div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><h4 className="font-black">Servicios e infraestructura logística</h4><ul className="mt-2 space-y-1 text-xs text-slate-300">{MATERIAL_DELTA.servicios.map((x,i)=><li key={i}>• {x}</li>)}</ul></div></div>
          </section>
          <p className="text-right text-[10px] text-slate-600">Equipos de comunicaciones discriminados: {totalCom} unidades en la tabla ECCO.</p>
        </div>}

        {seccion==="tfp"&&<div className="space-y-5"><div><h2 className="text-xl font-black text-emerald-300">TFP</h2><p className="mt-1 text-sm text-slate-400">Transcripción organizada de las cinco hojas de TFP (1). En esta etapa sólo se exhiben los factores; todavía no se aplican cálculos a las fases.</p></div>
          <div className="flex flex-wrap gap-2">{[["aviones","Aeronaves"],["vehiculos","Vehículos terrestres"],["racion","Racionamiento y alojamiento"],["apoyo","Equipo de apoyo"],["distancias","Distancias"]].map(([id,l])=><button key={id} onClick={()=>setTfpBloque(id)} className={`rounded px-3 py-2 text-xs font-bold ${tfpBloque===id?"bg-emerald-700":"bg-slate-800 text-slate-300"}`}>{l}</button>)}</div>

          {tfpBloque==="aviones"&&<div className="space-y-5">{Object.values(TFP_AVIONES).map((b,i)=><div key={i}><h3 className="mb-2 font-black text-cyan-300">{b.titulo}</h3><div className="overflow-x-auto rounded-lg border border-slate-800"><table className="min-w-[1800px] w-full text-xs"><thead className="bg-slate-950 text-slate-400"><tr><th className="sticky left-0 bg-slate-950 px-3 py-2 text-left">Especialidad</th>{AVIONES_TFP.map(x=><th key={x} className="px-3 py-2 text-center">{x}</th>)}</tr></thead><tbody>{b.filas.map((r,ri)=><tr key={ri} className="border-t border-slate-800"><td className="sticky left-0 bg-slate-900 px-3 py-2 font-bold">{r[0]}</td>{r.slice(1).map((v,j)=><td key={j} className="px-3 py-2 text-center text-slate-300">{v}</td>)}</tr>)}</tbody></table></div></div>)}</div>}
          {tfpBloque==="vehiculos"&&<><Tabla headers={["Vehículo","Cantidad","Choferes/veh.","Choferes/turno","Choferes 3 turnos","L/100 km","Pax","Tn","L/500 km"]} rows={VEHICULOS_TFP}/><div className="rounded bg-slate-900 p-3 text-xs text-slate-400">Totales de la hoja: 139 vehículos; 216 choferes por turno; 648 choferes para 3 turnos. Capacidad total consignada: 49,2 Tn.</div></>}
          {tfpBloque==="racion"&&<><Tabla headers={["Unidad","Personal","Racionamiento","Cocinas","Carpas racionamiento 500 pers.","Carpas alojamiento 500 pers."]} rows={RACIONAMIENTO}/><p className="rounded bg-slate-900 p-3 text-xs text-slate-400">Nota de la hoja: se consideran 2 raciones por día, una cocina de campaña cada 500 raciones y una carpa de alojamiento cada 500 personas.</p></>}
          {tfpBloque==="apoyo"&&<Tabla headers={["Equipo","Operador","Ayudante carga","Auxiliar","Supervisor","Total pers. 24h","Diesel L/h","Peso vacío kg","Elevación Tn","Arrastre Tn"]} rows={EQUIPO_APOYO}/>} 
          {tfpBloque==="distancias"&&<div className="space-y-4"><div className="overflow-x-auto rounded-lg border border-slate-800"><table className="min-w-[1800px] w-full text-xs"><thead className="bg-slate-950 text-slate-400"><tr><th rowSpan={2} className="px-3 py-2 text-left">Origen</th><th colSpan={9} className="px-3 py-2 text-center">VÍA TERRESTRE · km</th><th colSpan={9} className="px-3 py-2 text-center">VÍA AÉREA · km</th></tr><tr>{LUGARES_DIST.map(x=><th key={`t-${x}`} className="px-2 py-2">{x}</th>)}{LUGARES_DIST.map(x=><th key={`a-${x}`} className="px-2 py-2">{x}</th>)}</tr></thead><tbody>{DISTANCIAS.map((r,i)=><tr key={i} className="border-t border-slate-800"><td className="px-3 py-2 font-bold">{r[0]}</td>{r.slice(1).map((v,j)=><td key={j} className="px-2 py-2 text-center text-slate-300">{v}</td>)}</tr>)}</tbody></table></div></div>}
        </div>}

        {faseActiva&&<div className="space-y-5">
          <div><h2 className="text-xl font-black text-emerald-300">{faseActiva.titulo}</h2><p className="text-sm text-slate-400">{faseActiva.subtitulo}</p></div>

          <div className="rounded-xl border border-slate-800 bg-slate-900">
            <button onClick={()=>setFasesAbiertas(x=>({...x,[faseActiva.id]:!x[faseActiva.id]}))} className="flex w-full items-center justify-between p-4 text-left">
              <div><b>Momentos / denominación</b><p className="text-xs text-slate-500">Seleccione el momento sobre el que desea planificar.</p></div>
              <span>{fasesAbiertas[faseActiva.id]?"−":"+"}</span>
            </button>
            {fasesAbiertas[faseActiva.id]&&<div className="space-y-2 border-t border-slate-800 p-4">
              {faseActiva.momentos.map((m,i)=><button key={i} onClick={()=>setMomentoPlan(m.nombre)} className={`block w-full rounded-lg p-4 text-left ${momentoSeleccionado===m.nombre?"border border-cyan-600 bg-cyan-950/20":"bg-slate-950"}`}>
                <b className="text-cyan-300">{m.nombre}</b>
              </button>)}
            </div>}
          </div>

          <section className="rounded-xl border border-emerald-800/60 bg-slate-900 p-4">
            <div className="mb-4">
              <h3 className="font-black text-emerald-300">PLANIFICADOR LOGÍSTICO DEL MOMENTO</h3>
              <p className="text-xs text-slate-500">{momentoSeleccionado} · esfuerzo sugerido: <b className="text-slate-300">{esfuerzoSeleccionado}</b></p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs"><span className="mb-1 block text-slate-400">Tipo de empleo</span><select value={tipoEmpleo} onChange={e=>setTipoEmpleo(e.target.value as typeof tipoEmpleo)} className="w-full rounded bg-slate-950 p-2"><option value="operacion">Operación aérea</option><option value="movilizacion">Movilización / despliegue</option><option value="abastecimiento">Abastecimiento</option><option value="repliegue">Repliegue</option></select></label>
              <label className="text-xs"><span className="mb-1 block text-slate-400">Operación</span><input value={nombreOperacion} onChange={e=>setNombreOperacion(e.target.value)} placeholder="Ej. Salida 1" className="w-full rounded bg-slate-950 p-2"/></label>
              <label className="text-xs"><span className="mb-1 block text-slate-400">Base de salida</span><select value={baseOperacion} onChange={e=>setBaseOperacion(e.target.value)} className="w-full rounded bg-slate-950 p-2">{BASES_OPERACION.map(b=><option key={b}>{b}</option>)}</select></label>
              <label className="text-xs"><span className="mb-1 block text-slate-400">Aeronave</span><select value={sistemaOperacion} onChange={e=>setSistemaOperacion(e.target.value)} className="w-full rounded bg-slate-950 p-2">{Object.keys(inventarioAeronaves[baseOperacion]??{}).map(s=><option key={s} value={s}>{s}{AERONAVES_TRANSPORTE.has(s)?" · Transporte/Apoyo":""}</option>)}</select></label>
              <label className="text-xs"><span className="mb-1 block text-slate-400">Cantidad</span><input type="number" min={1} value={cantidadOperacion} onChange={e=>setCantidadOperacion(Math.max(1,Number(e.target.value)))} className="w-full rounded bg-slate-950 p-2"/></label>

              {!sistemaSinArmamento&&<label className="text-xs"><span className="mb-1 block text-slate-400">Armamento</span><select value={armamentoOperacion} onChange={e=>setArmamentoOperacion(e.target.value)} className="w-full rounded bg-slate-950 p-2">{ARMAMENTO_REALICO.map(a=><option key={a.id}>{a.nombre}</option>)}</select></label>}
              {!sistemaSinArmamento&&<label className="text-xs"><span className="mb-1 block text-slate-400">Armamento por aeronave</span><input type="number" min={0} value={armamentoPorAeronave} onChange={e=>setArmamentoPorAeronave(Math.max(0,Number(e.target.value)))} className="w-full rounded bg-slate-950 p-2"/></label>}
              {sistemaSinArmamento&&<div className="rounded bg-slate-950 p-2 text-xs"><span className="text-slate-500">Configuración</span><b className="block text-sky-200">Sin armamento de ataque en este empleo</b><span className="text-[10px] text-slate-600">Puede utilizarse para transporte, REV, C2, ISR/GE o apoyo según el sistema.</span></div>}
              <label className="text-xs"><span className="mb-1 block text-slate-400">Destino / objetivo</span><input value={destinoOperacion} onChange={e=>setDestinoOperacion(e.target.value)} placeholder="Destino" className="w-full rounded bg-slate-950 p-2"/></label>
              <label className="text-xs"><span className="mb-1 block text-slate-400">Distancia ida (km)</span><input type="number" min={0} value={distanciaOperacion} onChange={e=>setDistanciaOperacion(Math.max(0,Number(e.target.value)))} className="w-full rounded bg-slate-950 p-2"/></label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded bg-slate-950 p-3 text-xs">
                <span className="text-slate-500">Disponibles en la base</span>
                <b className="mt-1 block text-xl text-white">{remanenteAeronaves(baseOperacion,sistemaOperacion)}</b>
                <span className="text-[10px] text-slate-600">antes de aceptar esta operación en el momento seleccionado</span>
              </div>
              <div className="rounded bg-slate-950 p-3 text-xs">
                <span className="text-slate-500">Armamento requerido</span>
                <b className="mt-1 block text-xl text-white">{sistemaSinArmamento?"N/A":armamentoRequerido}</b>
                <span className="text-[10px] text-slate-600">{sistemaSinArmamento?"Empleo sin armamento":armamentoOperacion}</span>
              </div>
              <div className="rounded bg-slate-950 p-3 text-xs">
                <span className="text-slate-500">Stock actual en Realicó</span>
                <b className={`mt-1 block text-xl ${sistemaSinArmamento||armamentoRemanenteRealico>=armamentoRequerido?"text-emerald-300":"text-red-300"}`}>{sistemaSinArmamento?"N/A":armamentoRemanenteRealico}</b>
              </div>
              <div className="rounded bg-slate-950 p-3 text-xs">
                <span className="text-slate-500">Personal técnico TFP</span>
                <b className="mt-1 block text-xl text-violet-300">{personalTFP??"s/d"}</b>
                <span className="text-[10px] text-slate-600">{esfuerzoSeleccionado}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-amber-900/50 bg-amber-950/10 p-4">
                <h4 className="text-xs font-black text-amber-300">COMBUSTIBLE / REV</h4>
                {combustibleInfo?<div className="mt-2 text-xs text-slate-300">
                  <p>{combustibleInfo.nota}</p>
                  <p className="mt-2 rounded bg-slate-950 p-2 text-amber-200"><b>REV:</b> pendiente de cálculo hasta cargar un factor documental de consumo/radio de misión. No se estima automáticamente.</p>
                  <p className="mt-2 text-[10px] text-slate-500">Distancia cargada: {distanciaOperacion} km de ida / {distanciaOperacion*2} km ida y regreso.</p>
                </div>:<p className="mt-2 text-xs text-slate-500">No hay parámetros documentales de combustible cargados para este sistema.</p>}
              </div>

              {!sistemaSinArmamento&&<div className="rounded-lg border border-sky-900/50 bg-sky-950/10 p-4">
                <h4 className="text-xs font-black text-sky-300">ABASTECIMIENTO DE ARMAMENTO DESDE REALICÓ</h4>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs"><span className="mb-1 block text-slate-400">Medio de transporte</span><select value={transporteOperacion} onChange={e=>setTransporteOperacion(e.target.value as OperacionLogistica["transporte"])} className="w-full rounded bg-slate-950 p-2"><option>Camión 5 Tn</option><option>Camión 20 Tn</option></select></label>
                  <div className="rounded bg-slate-950 p-2 text-xs"><span className="text-slate-500">Realicó ↔ base</span><b className="block text-white">{DISTANCIA_REALICO_KM[baseOperacion]??"s/d"} km</b></div>
                  <div className="rounded bg-slate-950 p-2 text-xs"><span className="text-slate-500">Peso del lote</span><b className="block text-white">{armamentoItem?.pesoKg?`${(pesoArmamentoKg/1000).toFixed(2)} Tn`:"s/d"}</b></div>
                  <div className="rounded bg-slate-950 p-2 text-xs"><span className="text-slate-500">Empleos / viajes mínimos</span><b className="block text-sky-200">{viajesArmamento??"s/d"}</b></div>
                </div>
                {!armamentoItem?.pesoKg&&<p className="mt-2 text-[10px] text-amber-300">No se calcula cantidad de viajes cuando DELTA no aporta peso para ese armamento.</p>}
              </div>}
              {sistemaSinArmamento&&<div className="rounded-lg border border-sky-900/50 bg-sky-950/10 p-4">
                <h4 className="text-xs font-black text-sky-300">MOVILIZACIÓN / APOYO</h4>
                <p className="mt-2 text-xs text-slate-300">Esta aeronave puede incorporarse a los movimientos de despliegue, transporte, apoyo, reabastecimiento o repliegue. El origen, destino, cantidad y distancia quedan vinculados al momento seleccionado.</p>
              </div>}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" disabled={cantidadOperacion>remanenteAeronaves(baseOperacion,sistemaOperacion)||(!sistemaSinArmamento&&armamentoRequerido>armamentoRemanenteRealico)}
                onClick={()=>{
                  const op:OperacionLogistica={
                    id:`op-${Date.now()}`,fase:seccion,momento:momentoSeleccionado,nombre:nombreOperacion||"Operación",
                    base:baseOperacion,sistema:sistemaOperacion,cantidad:cantidadOperacion,armamento:armamentoOperacion,
                    armamentoPorAeronave,distanciaKm:distanciaOperacion,destino:destinoOperacion,esfuerzo:esfuerzoSeleccionado,
                    transporte:transporteOperacion,aceptada:true
                  };
                  setOperaciones(x=>[...x,op]);
                }}
                className="rounded bg-emerald-700 px-4 py-2 text-xs font-black disabled:bg-slate-700 disabled:text-slate-500">
                ACEPTAR EMPLEO
              </button>
              {cantidadOperacion>remanenteAeronaves(baseOperacion,sistemaOperacion)&&<span className="text-xs text-red-300">No hay suficientes aeronaves disponibles en esta base para este momento.</span>}
              {!sistemaSinArmamento&&armamentoRequerido>armamentoRemanenteRealico&&<span className="text-xs text-red-300">No hay suficiente armamento remanente en Realicó.</span>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="mb-3 text-sm font-black text-white">EMPLEOS ACEPTADOS · {momentoSeleccionado}</h3>
            {operacionesAceptadasMomento.length===0?<p className="text-xs text-slate-500">Todavía no hay empleos aceptados en este momento.</p>:<div className="space-y-2">
              {operacionesAceptadasMomento.map(o=><div key={o.id} className="rounded bg-slate-950 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><b className="text-cyan-300">{o.nombre}</b><p className="text-slate-400">{o.cantidad} × {o.sistema} · {o.base} → {o.destino||"destino sin nombre"}</p></div>
                  <button onClick={()=>setOperaciones(x=>x.filter(v=>v.id!==o.id))} className="rounded bg-red-950 px-2 py-1 text-red-300">Deshacer</button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <span>Armamento: <b>{AERONAVES_SIN_ARMAMENTO_PLANIFICADO.has(o.sistema)?"N/A":`${o.cantidad*o.armamentoPorAeronave} × ${o.armamento}`}</b></span>
                  <span>Distancia: <b>{o.distanciaKm} km ida</b></span>
                  <span>Remanente base: <b>{remanenteAeronaves(o.base,o.sistema)}</b></span>
                </div>
              </div>)}
            </div>}
          </section>
        </div>}
      </div></main>
    </div>}
  </>;
}

export default ControlLogisticoTON;
