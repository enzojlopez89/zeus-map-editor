"use client";

import { useEffect, useMemo, useState } from "react";

type BaseId =
  | "la-rioja"
  | "villa-mercedes"
  | "cordoba"
  | "mendoza"
  | "gral-acha"
  | "malargue"
  | "san-luis"
  | "realico"
  | "san-rafael"
  | "rio-cuarto";

type Esfuerzo = "ERC" | "MESC" | "MEIC";
type Tab =
  | "situacion"
  | "movimientos"
  | "personal"
  | "misiones"
  | "reabastecimiento"
  | "tfp"
  | "alertas";

type Periodo = {
  id: string;
  fase: string;
  momento: string;
  ventana: string;
  esfuerzo: Esfuerzo;
  detalle: string;
};

type BasePlan = {
  id: BaseId;
  nombre: string;
  capacidadAlojamiento: number | null;
  personalPermanente: number;
  cicloReabDias: number;
  cicloCombustibleDias: number;
};

type Medio = {
  id: string;
  sistema: string;
  baseInicial: BaseId;
  cantidadInicial: number;
};

type PersonalTFP = {
  jefe: number;
  encargado: number;
  estructuras: number;
  armamento: number;
  avionica: number;
  hidraulica: number;
  especiales: number;
};

type TfpSistema = {
  sistema: string;
  meic: PersonalTFP;
  mesc: PersonalTFP;
  erc: PersonalTFP;
  combustibleLitrosHora: number | null;
  hhMantPorHoraVuelo: number | null;
};

type EquipoApoyo = {
  id: string;
  nombre: string;
  personal24h: number | null;
  combustibleLitrosHora: number | null;
  pesoKg: number | null;
  capacidadTn: number | null;
};

type VehiculoTFP = {
  id: string;
  nombre: string;
  cantidad: number;
  choferesPorVehiculo: number;
  capacidadPax: number | null;
  capacidadTn: number;
  consumoL100km: number;
};

type MovimientoMedio = {
  id: string;
  periodoId: string;
  sistema: string;
  origen: BaseId;
  destino: BaseId;
  cantidad: number;
  equipos: Record<string, number>;
  fecha: string;
  predefinido?: boolean;
};

type MovimientoPersonal = {
  id: string;
  periodoId: string;
  origen: BaseId;
  destino: BaseId;
  oficiales: number;
  suboficiales: number;
  sv: number;
  civiles: number;
  predefinido?: boolean;
};

type MovimientoMaterial = {
  id: string;
  periodoId: string;
  origen: BaseId;
  destino: BaseId;
  material: string;
  cantidad: number;
  pesoKgUnidad: number;
  predefinido?: boolean;
};

type Mision = {
  id: string;
  periodoId: string;
  dia: string;
  operacion: string;
  aeronave: string;
  cantidad: number;
  armamento: string;
  armamentoPorAvion: number | null;
  base: BaseId;
  horasVuelo: number | null;
};

type MisionREV = {
  id: string;
  periodoId: string;
  nombre: string;
  cisterna: "KC-135" | "KC-130J";
  cantidadCisternas: number;
  receptores: number;
  litrosPorReceptor: number;
  capacidadTransferiblePorCisterna: number | null;
  ida: boolean;
  regreso: boolean;
};

type Reabastecimiento = {
  id: string;
  periodoId: string;
  base: BaseId;
  recurso: string;
  cantidad: number;
  unidad: string;
  diaSolicitud: number;
  demoraDias: number;
};

type EstadoPlan = {
  nombre: string;
  periodoActivo: string;
  bases: BasePlan[];
  medios: Medio[];
  movimientos: MovimientoMedio[];
  movimientosPersonal: MovimientoPersonal[];
  movimientosMaterial: MovimientoMaterial[];
  misiones: Mision[];
  misionesREV: MisionREV[];
  reabastecimientos: Reabastecimiento[];
};

const STORAGE_INDEX = "zeus-a4-v3-index";
const STORAGE_PREFIX = "zeus-a4-v3-plan:";

const PERIODOS: Periodo[] = [
  { id:"f1m1", fase:"FASE I · PREPARACIÓN", momento:"Momento 1 · Concepción", ventana:"Antes de M", esfuerzo:"ERC", detalle:"Planeamiento y preparación inicial." },
  { id:"f1m2-despl", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Despliegue", ventana:"M+1 a M+4", esfuerzo:"ERC", detalle:"Despliegue de sistemas de armas y personal hacia PPRRFF." },
  { id:"f1m2-arm", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Abastecimiento", ventana:"M+5 a M+7", esfuerzo:"ERC", detalle:"Abastecimiento de armamento, equipos y material de apoyo." },
  { id:"f1m2-adies", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Adiestramiento", ventana:"M+8 a M+40", esfuerzo:"ERC", detalle:"Adiestramiento operativo." },
  { id:"f1m2-comp", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Comprobación", ventana:"M+41 a M+45", esfuerzo:"ERC", detalle:"Comprobación del sistema aéreo ofensivo." },
  { id:"f1m3", fase:"FASE I · PREPARACIÓN", momento:"Momento 3 · Alerta", ventana:"A a D", esfuerzo:"MESC", detalle:"Exploración, reconocimiento y alistamiento sostenido." },
  { id:"f2", fase:"FASE II · TOMAR LA INICIATIVA", momento:"Operaciones", ventana:"D a D+1", esfuerzo:"MEIC", detalle:"Máximo esfuerzo intensivo de combate." },
  { id:"f3", fase:"FASE III · DOMINAR", momento:"Operaciones", ventana:"D+2 a D+9", esfuerzo:"MESC", detalle:"Máximo esfuerzo sostenido de combate." },
  { id:"f4", fase:"ESTABILIZACIÓN", momento:"Repliegue", ventana:"D+10 en adelante", esfuerzo:"ERC", detalle:"Repliegue y esfuerzo remanente de combate." },
];

const BASES_INICIALES: BasePlan[] = [
  { id:"la-rioja", nombre:"1ª B.A. · La Rioja", capacidadAlojamiento:1500, personalPermanente:1305, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"villa-mercedes", nombre:"2ª B.A. · Villa Mercedes", capacidadAlojamiento:1500, personalPermanente:1293, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"cordoba", nombre:"3ª B.A. · Córdoba", capacidadAlojamiento:1500, personalPermanente:1201, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"mendoza", nombre:"4ª B.A. · Mendoza", capacidadAlojamiento:1000, personalPermanente:652, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"gral-acha", nombre:"5ª B.A. · Gral. Acha", capacidadAlojamiento:1000, personalPermanente:840, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"malargue", nombre:"B.A.M. · Malargüe", capacidadAlojamiento:1000, personalPermanente:711, cicloReabDias:3, cicloCombustibleDias:3 },
  { id:"san-luis", nombre:"Grupo 1 COM · San Luis", capacidadAlojamiento:500, personalPermanente:149, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"realico", nombre:"A.M. Realicó", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:3 },
  { id:"san-rafael", nombre:"A.M. San Rafael", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:3 },
  { id:"rio-cuarto", nombre:"COAe · Río Cuarto", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:4 },
];

const MEDIOS_INICIALES: Medio[] = [
  { id:"f16cj", sistema:"F-16CJ Block 50", baseInicial:"gral-acha", cantidadInicial:10 },
  { id:"f16c-vm", sistema:"F-16C Block 40", baseInicial:"villa-mercedes", cantidadInicial:20 },
  { id:"f16c-men", sistema:"F-16C Block 40", baseInicial:"mendoza", cantidadInicial:14 },
  { id:"f16d", sistema:"F-16D Block 42", baseInicial:"mendoza", cantidadInicial:6 },
  { id:"amx-vm", sistema:"AMX A-1M", baseInicial:"villa-mercedes", cantidadInicial:12 },
  { id:"amx-cor", sistema:"AMX A-1M", baseInicial:"cordoba", cantidadInicial:12 },
  { id:"e99m", sistema:"E-99M", baseInicial:"cordoba", cantidadInicial:3 },
  { id:"ec130h", sistema:"EC-130H", baseInicial:"gral-acha", cantidadInicial:2 },
  { id:"c130j", sistema:"C-130J", baseInicial:"la-rioja", cantidadInicial:10 },
  { id:"kc130j", sistema:"KC-130J", baseInicial:"la-rioja", cantidadInicial:4 },
  { id:"kc135-cor", sistema:"KC-135", baseInicial:"cordoba", cantidadInicial:3 },
  { id:"kc135-men", sistema:"KC-135", baseInicial:"mendoza", cantidadInicial:3 },
  { id:"harpy", sistema:"IAI Harpy", baseInicial:"gral-acha", cantidadInicial:36 },
  { id:"hermes-vm", sistema:"Hermes 450", baseInicial:"villa-mercedes", cantidadInicial:3 },
  { id:"hermes-ga", sistema:"Hermes 450", baseInicial:"gral-acha", cantidadInicial:3 },
  { id:"ch47-cor", sistema:"CH-47F", baseInicial:"cordoba", cantidadInicial:6 },
  { id:"ch47-ga", sistema:"CH-47F", baseInicial:"gral-acha", cantidadInicial:6 },
  { id:"uh1y-lr", sistema:"UH-1Y", baseInicial:"la-rioja", cantidadInicial:4 },
  { id:"uh1y-vm", sistema:"UH-1Y", baseInicial:"villa-mercedes", cantidadInicial:4 },
  { id:"uh1y-cor", sistema:"UH-1Y", baseInicial:"cordoba", cantidadInicial:4 },
  { id:"uh1y-men", sistema:"UH-1Y", baseInicial:"mendoza", cantidadInicial:4 },
  { id:"b412-lr", sistema:"B-412", baseInicial:"la-rioja", cantidadInicial:4 },
  { id:"b412-vm", sistema:"B-412", baseInicial:"villa-mercedes", cantidadInicial:4 },
  { id:"b412-cor", sistema:"B-412", baseInicial:"cordoba", cantidadInicial:2 },
  { id:"b412-men", sistema:"B-412", baseInicial:"mendoza", cantidadInicial:2 },
  { id:"b412-ga", sistema:"B-412", baseInicial:"gral-acha", cantidadInicial:2 },
  { id:"lj60-lr", sistema:"Learjet 60", baseInicial:"la-rioja", cantidadInicial:3 },
  { id:"lj60-ga", sistema:"Learjet 60", baseInicial:"gral-acha", cantidadInicial:3 },
  { id:"dhc6-lr", sistema:"DHC6-400", baseInicial:"la-rioja", cantidadInicial:4 },
  { id:"dhc6-vm", sistema:"DHC6-400", baseInicial:"villa-mercedes", cantidadInicial:4 },
  { id:"dhc6-men", sistema:"DHC6-400", baseInicial:"mendoza", cantidadInicial:4 },
];

const p = (j:number,e:number,es:number,a:number,av:number,h:number,esp:number):PersonalTFP => ({
  jefe:j, encargado:e, estructuras:es, armamento:a, avionica:av, hidraulica:h, especiales:esp
});

const TFP_SISTEMAS: TfpSistema[] = [
  { sistema:"F-16C Block 40", meic:p(1,1,8,16,14,8,8), mesc:p(1,1,8,12,8,8,8), erc:p(1,1,4,6,4,4,4), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"F-16D Block 42", meic:p(1,1,8,16,14,8,8), mesc:p(1,1,8,12,8,8,8), erc:p(1,1,4,6,4,4,4), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"F-16CJ Block 50", meic:p(1,1,8,16,14,8,8), mesc:p(1,1,8,12,8,8,8), erc:p(1,1,4,6,4,4,4), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"AMX A-1M", meic:p(1,1,8,16,14,8,8), mesc:p(1,1,8,12,8,8,8), erc:p(1,1,4,6,4,4,4), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"T-6 Texan II", meic:p(1,1,4,8,4,4,4), mesc:p(1,1,4,8,4,4,4), erc:p(1,1,2,4,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"IAI Harpy", meic:p(1,1,2,2,2,0,2), mesc:p(1,1,2,2,2,0,2), erc:p(1,1,1,1,1,0,1), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"EC-130H", meic:p(1,1,4,0,4,4,4), mesc:p(1,1,4,0,4,4,4), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"E-99M", meic:p(1,1,4,0,4,4,4), mesc:p(1,1,4,0,4,4,4), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"Hermes 450", meic:p(1,1,4,0,4,4,4), mesc:p(1,1,4,0,4,4,4), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"C-130J", meic:p(1,1,6,0,6,6,6), mesc:p(1,1,4,0,4,4,6), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"KC-130J", meic:p(1,1,6,0,6,6,6), mesc:p(1,1,4,0,4,4,6), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"KC-135", meic:p(1,1,6,0,6,6,6), mesc:p(1,1,4,0,4,4,6), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"Learjet 60", meic:p(1,1,4,0,4,4,4), mesc:p(1,1,4,0,4,4,4), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"DHC6-400", meic:p(1,1,2,0,4,4,2), mesc:p(1,1,2,0,2,2,2), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"CH-47F", meic:p(1,1,2,0,4,4,2), mesc:p(1,1,2,0,2,2,2), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"UH-1Y", meic:p(1,1,2,0,4,4,2), mesc:p(1,1,2,0,2,2,2), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
  { sistema:"B-412", meic:p(1,1,2,0,4,4,2), mesc:p(1,1,2,0,2,2,2), erc:p(1,1,2,0,2,2,2), combustibleLitrosHora:null, hhMantPorHoraVuelo:null },
];

const EQUIPOS_APOYO: EquipoApoyo[] = [
  { id:"hobart", nombre:"Planta de arranque Hobart", personal24h:2, combustibleLitrosHora:34, pesoKg:2360, capacidadTn:null },
  { id:"harlan", nombre:"Tractor de arrastre Harlan", personal24h:3, combustibleLitrosHora:8, pesoKg:2950, capacidadTn:22 },
  { id:"mhu83", nombre:"Elevador de bombas MHU-83", personal24h:6, combustibleLitrosHora:6, pesoKg:3950, capacidadTn:1.36 },
  { id:"telex", nombre:"TeLex / carretilla elevadora", personal24h:2, combustibleLitrosHora:6, pesoKg:4500, capacidadTn:7 },
  { id:"abastecedora", nombre:"Abastecedora", personal24h:3, combustibleLitrosHora:null, pesoKg:null, capacidadTn:null },
  { id:"carro-bombas", nombre:"Carro de bombas", personal24h:null, combustibleLitrosHora:null, pesoKg:1800, capacidadTn:1.8 },
];

const VEHICULOS_TFP: VehiculoTFP[] = [
  { id:"c4", nombre:"Citroën C4", cantidad:5, choferesPorVehiculo:1, capacidadPax:5, capacidadTn:0.4, consumoL100km:7.5 },
  { id:"landcruiser", nombre:"Toyota Land Cruiser", cantidad:35, choferesPorVehiculo:1, capacidadPax:7, capacidadTn:0.8, consumoL100km:11.5 },
  { id:"sprinter", nombre:"MB Sprinter", cantidad:12, choferesPorVehiculo:2, capacidadPax:19, capacidadTn:1.5, consumoL100km:10 },
  { id:"amarok", nombre:"VW Amarok", cantidad:22, choferesPorVehiculo:1, capacidadPax:5, capacidadTn:1, consumoL100km:9.5 },
  { id:"unimog", nombre:"UNIMOG", cantidad:30, choferesPorVehiculo:2, capacidadPax:14, capacidadTn:2.5, consumoL100km:24 },
  { id:"omnibus", nombre:"Ómnibus", cantidad:10, choferesPorVehiculo:2, capacidadPax:40, capacidadTn:3, consumoL100km:28 },
  { id:"grua15", nombre:"Grúa 15 Tn", cantidad:8, choferesPorVehiculo:2, capacidadPax:null, capacidadTn:15, consumoL100km:45 },
  { id:"camion5", nombre:"Camión 5 Tn", cantidad:10, choferesPorVehiculo:2, capacidadPax:null, capacidadTn:5, consumoL100km:22 },
  { id:"camion20", nombre:"Camión 20 Tn", cantidad:7, choferesPorVehiculo:2, capacidadPax:null, capacidadTn:20, consumoL100km:36 },
];

const DIST_TERRESTRE: Partial<Record<BaseId,Partial<Record<BaseId,number>>>> = {
  "la-rioja":{"villa-mercedes":520,"cordoba":435,"mendoza":600,"gral-acha":1000,"malargue":930,"san-luis":460,"rio-cuarto":610,"realico":806},
  "villa-mercedes":{"la-rioja":520,"cordoba":290,"mendoza":360,"gral-acha":480,"malargue":580,"san-luis":95,"rio-cuarto":125,"realico":238},
  "cordoba":{"la-rioja":435,"villa-mercedes":290,"mendoza":610,"gral-acha":720,"malargue":840,"san-luis":410,"rio-cuarto":215,"realico":435},
  "mendoza":{"la-rioja":600,"villa-mercedes":360,"cordoba":610,"gral-acha":760,"malargue":330,"san-luis":260,"rio-cuarto":480,"realico":609},
  "gral-acha":{"la-rioja":1000,"villa-mercedes":480,"cordoba":720,"mendoza":760,"malargue":580,"san-luis":440,"rio-cuarto":505,"realico":294},
  "malargue":{"la-rioja":930,"villa-mercedes":580,"cordoba":840,"mendoza":330,"gral-acha":580,"san-luis":480,"rio-cuarto":620,"realico":582},
  "san-luis":{"la-rioja":460,"villa-mercedes":95,"cordoba":410,"mendoza":260,"gral-acha":440,"malargue":480,"rio-cuarto":220,"realico":331},
  "rio-cuarto":{"la-rioja":610,"villa-mercedes":125,"cordoba":215,"mendoza":480,"gral-acha":505,"malargue":620,"san-luis":220,"realico":223},
  "realico":{"la-rioja":806,"villa-mercedes":238,"cordoba":435,"mendoza":609,"gral-acha":294,"malargue":582,"san-luis":331,"rio-cuarto":223},
};

const DIST_AEREA: Partial<Record<BaseId,Partial<Record<BaseId,number>>>> = {
  "la-rioja":{"villa-mercedes":445,"cordoba":365,"mendoza":450,"gral-acha":875,"malargue":750,"san-luis":430,"rio-cuarto":465,"realico":655},
  "villa-mercedes":{"la-rioja":445,"cordoba":260,"mendoza":320,"gral-acha":420,"malargue":460,"san-luis":95,"rio-cuarto":120,"realico":195},
  "cordoba":{"la-rioja":365,"villa-mercedes":260,"mendoza":470,"gral-acha":640,"malargue":690,"san-luis":290,"rio-cuarto":200,"realico":405},
  "mendoza":{"la-rioja":450,"villa-mercedes":320,"cordoba":470,"gral-acha":740,"malargue":295,"san-luis":235,"rio-cuarto":400,"realico":475},
  "gral-acha":{"la-rioja":875,"villa-mercedes":420,"cordoba":640,"mendoza":740,"malargue":510,"san-luis":430,"rio-cuarto":480,"realico":265},
  "malargue":{"la-rioja":750,"villa-mercedes":460,"cordoba":690,"mendoza":295,"gral-acha":510,"san-luis":410,"rio-cuarto":540,"realico":485},
  "san-luis":{"la-rioja":430,"villa-mercedes":95,"cordoba":290,"mendoza":235,"gral-acha":430,"malargue":410,"rio-cuarto":195,"realico":275},
  "rio-cuarto":{"la-rioja":465,"villa-mercedes":120,"cordoba":200,"mendoza":400,"gral-acha":480,"malargue":540,"san-luis":195,"realico":215},
  "realico":{"la-rioja":655,"villa-mercedes":195,"cordoba":405,"mendoza":475,"gral-acha":265,"malargue":485,"san-luis":275,"rio-cuarto":215},
};

const MOVIMIENTOS_PREDEFINIDOS: MovimientoMedio[] = [
  { id:"pre-f16cj", periodoId:"f1m2-despl", sistema:"F-16CJ Block 50", origen:"gral-acha", destino:"cordoba", cantidad:10, equipos:{}, fecha:"", predefinido:true },
  { id:"pre-hermes", periodoId:"f1m2-despl", sistema:"Hermes 450", origen:"gral-acha", destino:"la-rioja", cantidad:3, equipos:{}, fecha:"", predefinido:true },
  { id:"pre-kc130", periodoId:"f1m2-despl", sistema:"KC-130J", origen:"la-rioja", destino:"villa-mercedes", cantidad:4, equipos:{}, fecha:"", predefinido:true },
  { id:"pre-c130-cor", periodoId:"f1m2-despl", sistema:"C-130J", origen:"la-rioja", destino:"cordoba", cantidad:5, equipos:{}, fecha:"", predefinido:true },
  { id:"pre-c130-vm", periodoId:"f1m2-despl", sistema:"C-130J", origen:"la-rioja", destino:"villa-mercedes", cantidad:5, equipos:{}, fecha:"", predefinido:true },
  { id:"pre-e99", periodoId:"f1m2-despl", sistema:"E-99M", origen:"cordoba", destino:"villa-mercedes", cantidad:3, equipos:{}, fecha:"", predefinido:true },
];

const PERSONAL_PREDEFINIDO: MovimientoPersonal[] = [
  { id:"p1",periodoId:"f1m2-despl",origen:"cordoba",destino:"villa-mercedes",oficiales:12,suboficiales:68,sv:28,civiles:1,predefinido:true },
  { id:"p2",periodoId:"f1m2-despl",origen:"la-rioja",destino:"villa-mercedes",oficiales:24,suboficiales:52,sv:12,civiles:3,predefinido:true },
  { id:"p3",periodoId:"f1m2-despl",origen:"gral-acha",destino:"cordoba",oficiales:20,suboficiales:48,sv:26,civiles:1,predefinido:true },
  { id:"p4",periodoId:"f1m2-despl",origen:"villa-mercedes",destino:"cordoba",oficiales:0,suboficiales:30,sv:0,civiles:0,predefinido:true },
  { id:"p5",periodoId:"f1m2-despl",origen:"mendoza",destino:"cordoba",oficiales:0,suboficiales:62,sv:0,civiles:0,predefinido:true },
  { id:"p6",periodoId:"f1m2-despl",origen:"la-rioja",destino:"realico",oficiales:12,suboficiales:34,sv:15,civiles:4,predefinido:true },
  { id:"p7",periodoId:"f1m2-despl",origen:"la-rioja",destino:"mendoza",oficiales:12,suboficiales:34,sv:15,civiles:4,predefinido:true },
  { id:"p8",periodoId:"f1m2-despl",origen:"la-rioja",destino:"gral-acha",oficiales:16,suboficiales:44,sv:20,civiles:5,predefinido:true },
  { id:"p9",periodoId:"f1m2-despl",origen:"san-luis",destino:"la-rioja",oficiales:2,suboficiales:10,sv:4,civiles:4,predefinido:true },
  { id:"p10",periodoId:"f1m2-despl",origen:"san-luis",destino:"rio-cuarto",oficiales:2,suboficiales:16,sv:4,civiles:3,predefinido:true },
];

const MATERIAL_PREDEFINIDO: MovimientoMaterial[] = [
  { id:"mat-carros",periodoId:"f1m2-arm",origen:"realico",destino:"villa-mercedes",material:"Carros de bombas",cantidad:50,pesoKgUnidad:1800,predefinido:true },
];

const MISIONES: Mision[] = [
  {id:"m-ec130",periodoId:"f1m3",dia:"M a D+9",operacion:"EYRA",aeronave:"EC-130H",cantidad:1,armamento:"—",armamentoPorAvion:null,base:"gral-acha",horasVuelo:5},
  {id:"m-awacs",periodoId:"f2",dia:"D a D+9",operacion:"AWACS",aeronave:"E-99M",cantidad:1,armamento:"—",armamentoPorAvion:null,base:"villa-mercedes",horasVuelo:8},
  {id:"m-d1",periodoId:"f2",dia:"D",operacion:"SEAD Catamarca",aeronave:"F-16CJ Block 50",cantidad:2,armamento:"AGM-88C HARM",armamentoPorAvion:2,base:"cordoba",horasVuelo:2},
  {id:"m-d2",periodoId:"f2",dia:"D",operacion:"SEAD Catamarca",aeronave:"AMX A-1M",cantidad:2,armamento:"MAR-1",armamentoPorAvion:4,base:"cordoba",horasVuelo:2},
  {id:"m-d3",periodoId:"f2",dia:"D",operacion:"OCA Catamarca",aeronave:"AMX A-1M",cantidad:4,armamento:"GBU-10",armamentoPorAvion:2,base:"cordoba",horasVuelo:2},
  {id:"m-d4",periodoId:"f2",dia:"D",operacion:"Defensa contra-aérea",aeronave:"F-16",cantidad:2,armamento:"AIM-120",armamentoPorAvion:4,base:"villa-mercedes",horasVuelo:4},
  {id:"m-d5",periodoId:"f2",dia:"D",operacion:"SEAD Belén",aeronave:"F-16CJ Block 50",cantidad:2,armamento:"AGM-88C HARM",armamentoPorAvion:2,base:"cordoba",horasVuelo:2},
  {id:"m-d6",periodoId:"f2",dia:"D",operacion:"SEAD Belén",aeronave:"AMX A-1M",cantidad:2,armamento:"MAR-1",armamentoPorAvion:4,base:"villa-mercedes",horasVuelo:3},
  {id:"m-d7",periodoId:"f2",dia:"D",operacion:"OCA Belén",aeronave:"AMX A-1M",cantidad:4,armamento:"GBU-10",armamentoPorAvion:2,base:"villa-mercedes",horasVuelo:3},
  {id:"m-d8",periodoId:"f2",dia:"D tarde",operacion:"OCA Tucumán",aeronave:"AMX A-1M",cantidad:4,armamento:"GBU-10",armamentoPorAvion:2,base:"cordoba",horasVuelo:4},
  {id:"m-d9",periodoId:"f2",dia:"D tarde",operacion:"STRIKE Tucumán",aeronave:"F-16C Block 40",cantidad:4,armamento:"GBU-38 JDAM",armamentoPorAvion:4,base:"villa-mercedes",horasVuelo:3},
  {id:"m-d10",periodoId:"f2",dia:"D tarde",operacion:"SEAD Cafayate",aeronave:"AMX A-1M",cantidad:2,armamento:"MAR-1",armamentoPorAvion:2,base:"cordoba",horasVuelo:4},
  {id:"m-d11",periodoId:"f2",dia:"D tarde",operacion:"SEAD Cafayate",aeronave:"F-16CJ Block 50",cantidad:2,armamento:"AGM-88C HARM",armamentoPorAvion:2,base:"cordoba",horasVuelo:3},
  {id:"m-d12",periodoId:"f2",dia:"D+1",operacion:"SEAD Salta",aeronave:"F-16CJ Block 50",cantidad:2,armamento:"AGM-88C HARM",armamentoPorAvion:4,base:"cordoba",horasVuelo:3},
  {id:"m-d13",periodoId:"f2",dia:"D+1",operacion:"SEAD Salta",aeronave:"AMX A-1M",cantidad:2,armamento:"MAR-1",armamentoPorAvion:6,base:"cordoba",horasVuelo:3},
  {id:"m-f3-1",periodoId:"f3",dia:"D+2",operacion:"STRIKE Tritio",aeronave:"F-16C/D Block 40/42",cantidad:8,armamento:"GBU-10 Paveway II",armamentoPorAvion:2,base:"mendoza",horasVuelo:3},
  {id:"m-f3-2",periodoId:"f3",dia:"D+2",operacion:"Transformador eléctrico",aeronave:"F-16C/D Block 40/42",cantidad:2,armamento:"GBU-12 Paveway II",armamentoPorAvion:2,base:"mendoza",horasVuelo:3},
  {id:"m-f3-3",periodoId:"f3",dia:"D a D+9",operacion:"BDA",aeronave:"Hermes 450",cantidad:2,armamento:"—",armamentoPorAvion:null,base:"la-rioja",horasVuelo:null},
  {id:"m-f3-4",periodoId:"f3",dia:"D+3 a D+9",operacion:"Apoyo",aeronave:"F-16C/D Block 40/42",cantidad:4,armamento:"MK-82",armamentoPorAvion:2,base:"mendoza",horasVuelo:4},
  {id:"m-f3-5",periodoId:"f3",dia:"D+3 a D+9",operacion:"Apoyo",aeronave:"F-16C/D Block 40/42",cantidad:4,armamento:"MK-82",armamentoPorAvion:2,base:"villa-mercedes",horasVuelo:4},
  {id:"m-f3-6",periodoId:"f3",dia:"D+3 a D+9",operacion:"Apoyo",aeronave:"AMX A-1M",cantidad:4,armamento:"MK-82",armamentoPorAvion:2,base:"cordoba",horasVuelo:4},
  {id:"m-f3-7",periodoId:"f3",dia:"D+3 a D+9",operacion:"Apoyo",aeronave:"AMX A-1M",cantidad:4,armamento:"MK-82",armamentoPorAvion:2,base:"villa-mercedes",horasVuelo:4},
];

const REV_INICIAL: MisionREV[] = [
  { id:"rev-f2-kc135",periodoId:"f2",nombre:"REV Fase II · KC-135",cisterna:"KC-135",cantidadCisternas:2,receptores:0,litrosPorReceptor:0,capacidadTransferiblePorCisterna:null,ida:true,regreso:true },
  { id:"rev-f2-kc130",periodoId:"f2",nombre:"REV Fase II · KC-130J",cisterna:"KC-130J",cantidadCisternas:4,receptores:0,litrosPorReceptor:0,capacidadTransferiblePorCisterna:null,ida:true,regreso:true },
  { id:"rev-f3-kc135",periodoId:"f3",nombre:"REV Fase III · KC-135",cisterna:"KC-135",cantidadCisternas:2,receptores:0,litrosPorReceptor:0,capacidadTransferiblePorCisterna:null,ida:true,regreso:true },
  { id:"rev-f3-kc130",periodoId:"f3",nombre:"REV Fase III · KC-130J",cisterna:"KC-130J",cantidadCisternas:2,receptores:0,litrosPorReceptor:0,capacidadTransferiblePorCisterna:null,ida:true,regreso:true },
];

const PLAN_BASE: EstadoPlan = {
  nombre:"A4 · Base MMA Nº 2",
  periodoActivo:"f1m2-despl",
  bases:BASES_INICIALES,
  medios:MEDIOS_INICIALES,
  movimientos:MOVIMIENTOS_PREDEFINIDOS,
  movimientosPersonal:PERSONAL_PREDEFINIDO,
  movimientosMaterial:MATERIAL_PREDEFINIDO,
  misiones:MISIONES,
  misionesREV:REV_INICIAL,
  reabastecimientos:[],
};

function clone<T>(v:T):T {
  return JSON.parse(JSON.stringify(v));
}

function fmt(v:number,d=0) {
  return new Intl.NumberFormat("es-AR",{maximumFractionDigits:d}).format(v);
}

function baseNombre(id:BaseId,bases:BasePlan[]) {
  return bases.find((b)=>b.id===id)?.nombre ?? id;
}

function detalleTfp(sistema:string, esfuerzo:Esfuerzo): PersonalTFP | null {
  const t=TFP_SISTEMAS.find((x)=>x.sistema===sistema);
  if (!t) return null;
  return esfuerzo==="MEIC"?t.meic:esfuerzo==="MESC"?t.mesc:t.erc;
}

function totalPersonalTFP(sistema:string,cantidad:number,esfuerzo:Esfuerzo) {
  const d=detalleTfp(sistema,esfuerzo);
  if (!d) return null;
  const bloques=Math.ceil(Math.max(0,cantidad)/4);
  const total=Object.values(d).reduce((a,b)=>a+b,0);
  return { bloques, detalle:d, total:total*bloques };
}

function distanciaTerrestre(a:BaseId,b:BaseId) {
  if (a===b) return 0;
  return DIST_TERRESTRE[a]?.[b] ?? DIST_TERRESTRE[b]?.[a] ?? null;
}

function distanciaAerea(a:BaseId,b:BaseId) {
  if (a===b) return 0;
  return DIST_AEREA[a]?.[b] ?? DIST_AEREA[b]?.[a] ?? null;
}

function totalPersonalMovimiento(m:MovimientoPersonal) {
  return m.oficiales+m.suboficiales+m.sv+m.civiles;
}

export default function A4LogisticsCalculator() {
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState<Tab>("situacion");
  const [plan,setPlan]=useState<EstadoPlan>(clone(PLAN_BASE));
  const [planes,setPlanes]=useState<string[]>([]);
  const [movSistema,setMovSistema]=useState("F-16CJ Block 50");
  const [movOrigen,setMovOrigen]=useState<BaseId>("gral-acha");
  const [movDestino,setMovDestino]=useState<BaseId>("cordoba");
  const [movCantidad,setMovCantidad]=useState(1);

  useEffect(()=>{
    try{
      const idx=JSON.parse(localStorage.getItem(STORAGE_INDEX)||"[]") as string[];
      setPlanes(idx);
      const ultimo=localStorage.getItem(`${STORAGE_PREFIX}__ultimo`);
      if(ultimo){
        const raw=localStorage.getItem(`${STORAGE_PREFIX}${ultimo}`);
        if(raw)setPlan(JSON.parse(raw));
      }
    }catch{}
  },[]);

  const periodo=PERIODOS.find((x)=>x.id===plan.periodoActivo)??PERIODOS[0];
  const sistemas=Array.from(new Set(plan.medios.map((m)=>m.sistema))).sort();

  const posiciones=useMemo(()=>{
    const map=new Map<string,Record<BaseId,number>>();
    for(const m of plan.medios){
      if(!map.has(m.sistema))map.set(m.sistema,{} as Record<BaseId,number>);
      const row=map.get(m.sistema)!;
      row[m.baseInicial]=(row[m.baseInicial]||0)+m.cantidadInicial;
    }
    const order=PERIODOS.map((x)=>x.id);
    const limite=order.indexOf(plan.periodoActivo);
    for(const mv of plan.movimientos.filter((m)=>order.indexOf(m.periodoId)<=limite)){
      const row=map.get(mv.sistema)||({} as Record<BaseId,number>);
      row[mv.origen]=(row[mv.origen]||0)-mv.cantidad;
      row[mv.destino]=(row[mv.destino]||0)+mv.cantidad;
      map.set(mv.sistema,row);
    }
    return map;
  },[plan.medios,plan.movimientos,plan.periodoActivo]);

  const disponibleOrigen=posiciones.get(movSistema)?.[movOrigen]||0;

  const personalTfpPorBase=useMemo(()=>{
    const out:Record<BaseId,number>={} as Record<BaseId,number>;
    for(const b of plan.bases)out[b.id]=0;
    for(const [sistema,dist] of posiciones.entries()){
      for(const [bid,cant] of Object.entries(dist)){
        if(cant<=0)continue;
        const p=totalPersonalTFP(sistema,cant,periodo.esfuerzo);
        if(p)out[bid as BaseId]+=(p.total||0);
      }
    }
    return out;
  },[posiciones,periodo.esfuerzo,plan.bases]);

  const personalOrganicoPorBase=useMemo(()=>{
    const out:Record<BaseId,number>={} as Record<BaseId,number>;
    for(const b of plan.bases)out[b.id]=0;
    const order=PERIODOS.map((x)=>x.id);
    const limite=order.indexOf(plan.periodoActivo);
    for(const m of plan.movimientosPersonal.filter((x)=>order.indexOf(x.periodoId)<=limite)){
      out[m.destino]+=totalPersonalMovimiento(m);
      out[m.origen]-=totalPersonalMovimiento(m);
    }
    return out;
  },[plan.movimientosPersonal,plan.periodoActivo,plan.bases]);

  const alertas=useMemo(()=>{
    const a:string[]=[];
    for(const b of plan.bases){
      const tfp=personalTfpPorBase[b.id]||0;
      const org=personalOrganicoPorBase[b.id]||0;
      const ocup=b.personalPermanente+tfp+org;
      if(b.capacidadAlojamiento!=null && ocup>b.capacidadAlojamiento){
        a.push(`${b.nombre}: déficit estimado de alojamiento ${fmt(ocup-b.capacidadAlojamiento)} plazas.`);
      }
    }
    for(const r of plan.reabastecimientos.filter((x)=>x.periodoId===plan.periodoActivo)){
      a.push(`${baseNombre(r.base,plan.bases)} · ${r.recurso}: ETA día ${r.diaSolicitud+r.demoraDias} desde la referencia del período.`);
    }
    for(const rev of plan.misionesREV.filter((x)=>x.periodoId===plan.periodoActivo)){
      const pases=(rev.ida?1:0)+(rev.regreso?1:0);
      const demanda=rev.receptores*rev.litrosPorReceptor*pases;
      if(rev.capacidadTransferiblePorCisterna==null){
        a.push(`${rev.nombre}: capacidad transferible aún pendiente; no se valida el margen REV.`);
      }else{
        const cap=rev.capacidadTransferiblePorCisterna*rev.cantidadCisternas;
        if(cap<demanda)a.push(`${rev.nombre}: déficit REV ${fmt(demanda-cap)} L.`);
      }
    }
    return a;
  },[plan,personalTfpPorBase,personalOrganicoPorBase]);

  function guardar(nombre?:string){
    const n=(nombre??plan.nombre).trim();
    if(!n)return;
    const next={...plan,nombre:n};
    localStorage.setItem(`${STORAGE_PREFIX}${n}`,JSON.stringify(next));
    localStorage.setItem(`${STORAGE_PREFIX}__ultimo`,n);
    const idx=Array.from(new Set([...planes,n]));
    localStorage.setItem(STORAGE_INDEX,JSON.stringify(idx));
    setPlanes(idx);setPlan(next);
  }

  function nuevo(){
    const n=window.prompt("Nombre del nuevo plan","A4 · Nuevo escenario");
    if(!n)return;
    const next=clone(PLAN_BASE);next.nombre=n;
    setPlan(next);
    localStorage.setItem(`${STORAGE_PREFIX}${n}`,JSON.stringify(next));
    localStorage.setItem(`${STORAGE_PREFIX}__ultimo`,n);
    const idx=Array.from(new Set([...planes,n]));
    localStorage.setItem(STORAGE_INDEX,JSON.stringify(idx));setPlanes(idx);
  }

  function guardarComo(){
    const n=window.prompt("Guardar como",`${plan.nombre} copia`);
    if(n)guardar(n);
  }

  function abrirPlan(nombre:string){
    const raw=localStorage.getItem(`${STORAGE_PREFIX}${nombre}`);
    if(raw){setPlan(JSON.parse(raw));localStorage.setItem(`${STORAGE_PREFIX}__ultimo`,nombre);}
  }

  function agregarMovimiento(){
    if(movOrigen===movDestino||movCantidad<=0||movCantidad>disponibleOrigen)return;
    const equipos:Record<string,number>={};
    for(const e of EQUIPOS_APOYO)equipos[e.id]=0;
    const mv:MovimientoMedio={
      id:`mv-${Date.now()}`,periodoId:plan.periodoActivo,sistema:movSistema,
      origen:movOrigen,destino:movDestino,cantidad:movCantidad,equipos,fecha:new Date().toISOString()
    };
    setPlan((x)=>({...x,movimientos:[...x.movimientos,mv]}));
  }

  function updateEquipoMovimiento(id:string,eid:string,val:number){
    setPlan((x)=>({...x,movimientos:x.movimientos.map((m)=>m.id===id?{...m,equipos:{...m.equipos,[eid]:val}}:m)}));
  }

  function addReab(){
    setPlan((x)=>({...x,reabastecimientos:[...x.reabastecimientos,{
      id:`r-${Date.now()}`,periodoId:x.periodoActivo,base:"cordoba",recurso:"Combustible",
      cantidad:0,unidad:"L",diaSolicitud:0,demoraDias:3
    }]}));
  }

  function updateReab(id:string,patch:Partial<Reabastecimiento>){
    setPlan((x)=>({...x,reabastecimientos:x.reabastecimientos.map((r)=>r.id===id?{...r,...patch}:r)}));
  }

  function updateREV(id:string,patch:Partial<MisionREV>){
    setPlan((x)=>({...x,misionesREV:x.misionesREV.map((r)=>r.id===id?{...r,...patch}:r)}));
  }

  const tabs:[Tab,string][]=[
    ["situacion","Situación"],["movimientos","Movimientos"],["personal","Personal / Alojamiento"],
    ["misiones","Misiones / REV"],["reabastecimiento","Reabastecimiento"],["tfp","TFP"],["alertas","Alertas"]
  ];

  return (
    <>
      <section className="mb-5 rounded-lg border border-emerald-700 bg-emerald-950/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">A4 · ZEUS II</p>
            <h2 className="font-bold text-white">Calculadora logística · TFP cargada</h2>
            <p className="mt-1 text-xs text-slate-400">Fases · ERC/MESC/MEIC · personal técnico · alojamiento · equipos · transporte · REV</p>
          </div>
          <button onClick={()=>setOpen(true)} className="rounded bg-emerald-700 px-4 py-2 text-sm font-black text-white">Abrir</button>
        </div>
      </section>

      {open&&(
        <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950 text-white">
          <header className="border-b border-slate-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-black tracking-[.2em] text-emerald-300">ZEUS II · A4</p><h1 className="text-xl font-black">{plan.nombre}</h1></div>
              <div className="flex flex-wrap gap-2">
                <button onClick={nuevo} className="rounded bg-slate-800 px-3 py-2 text-xs">Nuevo</button>
                <button onClick={()=>guardar()} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold">Guardar</button>
                <button onClick={guardarComo} className="rounded bg-slate-800 px-3 py-2 text-xs">Guardar como</button>
                <select value={plan.nombre} onChange={(e)=>abrirPlan(e.target.value)} className="rounded bg-slate-800 px-3 py-2 text-xs"><option>{plan.nombre}</option>{planes.filter((x)=>x!==plan.nombre).map((x)=><option key={x}>{x}</option>)}</select>
                <button onClick={()=>setOpen(false)} className="rounded bg-slate-800 px-3 py-2 text-xs">Cerrar</button>
              </div>
            </div>
          </header>

          <div className="border-b border-slate-800 bg-slate-900 px-3 py-2">
            <div className="flex gap-2 overflow-x-auto">
              {PERIODOS.map((p)=>(
                <button key={p.id} onClick={()=>setPlan((x)=>({...x,periodoActivo:p.id}))}
                  className={`min-w-[150px] rounded p-2 text-left text-[11px] ${plan.periodoActivo===p.id?"bg-emerald-700":"bg-slate-800"}`}>
                  <b>{p.ventana}</b><div>{p.momento}</div><div className="mt-1 font-black">{p.esfuerzo}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-800 px-4 py-3 text-xs">
            <b>{periodo.fase}</b> · {periodo.momento} · <span className="font-black text-emerald-300">{periodo.esfuerzo}</span>
            <span className="ml-3 text-slate-400">{periodo.detalle}</span>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 px-4 py-2">
            {tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`rounded px-3 py-2 text-xs font-bold ${tab===id?"bg-emerald-700":"bg-slate-900 text-slate-300"}`}>{label}</button>)}
          </nav>

          <main className="min-h-0 flex-1 overflow-auto p-4">
            {tab==="situacion"&&(
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Período</p><p className="font-black">{periodo.ventana}</p></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Esfuerzo</p><p className="text-2xl font-black text-emerald-300">{periodo.esfuerzo}</p></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Mov. medios</p><p className="text-2xl font-black">{plan.movimientos.filter((m)=>m.periodoId===plan.periodoActivo).length}</p></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Alertas</p><p className="text-2xl font-black">{alertas.length}</p></div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {plan.bases.map((b)=>{
                    const tec=personalTfpPorBase[b.id]||0;
                    const org=personalOrganicoPorBase[b.id]||0;
                    const ocup=b.personalPermanente+tec+org;
                    const libres=b.capacidadAlojamiento==null?null:b.capacidadAlojamiento-ocup;
                    return <section key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex justify-between gap-3"><h2 className="font-black">{b.nombre}</h2><span className={`rounded px-2 py-1 text-[10px] ${libres!=null&&libres<0?"bg-red-950 text-red-300":"bg-slate-800"}`}>{libres==null?"Capacidad pendiente":`${fmt(libres)} plazas`}</span></div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded bg-slate-950 p-2">Permanente<b className="block text-lg">{fmt(b.personalPermanente)}</b></div>
                        <div className="rounded bg-slate-950 p-2">TFP medios<b className="block text-lg">{fmt(tec)}</b></div>
                        <div className="rounded bg-slate-950 p-2">Mov. orgánico<b className="block text-lg">{fmt(org)}</b></div>
                      </div>
                      <div className="mt-3 space-y-1">
                        {Array.from(posiciones.entries()).flatMap(([s,d])=>{const q=d[b.id]||0;return q>0?[<div key={s} className="flex justify-between rounded bg-slate-950 px-3 py-2 text-xs"><span>{s}</span><b>{q}</b></div>]:[];})}
                      </div>
                    </section>
                  })}
                </div>
              </div>
            )}

            {tab==="movimientos"&&(
              <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                <section className="rounded-xl border border-emerald-900 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black text-emerald-300">Mover medio · {periodo.ventana}</h2>
                  <label className="mb-2 block text-xs">Sistema<select value={movSistema} onChange={(e)=>setMovSistema(e.target.value)} className="mt-1 w-full rounded bg-slate-800 p-2">{sistemas.map((s)=><option key={s}>{s}</option>)}</select></label>
                  <label className="mb-2 block text-xs">Origen<select value={movOrigen} onChange={(e)=>setMovOrigen(e.target.value as BaseId)} className="mt-1 w-full rounded bg-slate-800 p-2">{plan.bases.map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></label>
                  <label className="mb-2 block text-xs">Destino<select value={movDestino} onChange={(e)=>setMovDestino(e.target.value as BaseId)} className="mt-1 w-full rounded bg-slate-800 p-2">{plan.bases.map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></label>
                  <label className="mb-2 block text-xs">Cantidad<input type="number" min="1" value={movCantidad} onChange={(e)=>setMovCantidad(Number(e.target.value))} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                  <div className="mb-3 rounded bg-slate-950 p-3 text-xs">
                    <p>Disponible origen: <b>{disponibleOrigen}</b></p>
                    <p>Distancia aérea TFP: <b>{distanciaAerea(movOrigen,movDestino)??"—"} km</b></p>
                    <p>Distancia terrestre TFP: <b>{distanciaTerrestre(movOrigen,movDestino)??"—"} km</b></p>
                    <p>Personal técnico asociado: <b>{totalPersonalTFP(movSistema,movCantidad,periodo.esfuerzo)?.total??"Sin TFP"}</b></p>
                  </div>
                  <button disabled={movOrigen===movDestino||movCantidad<=0||movCantidad>disponibleOrigen} onClick={agregarMovimiento} className="w-full rounded bg-emerald-700 p-2 font-black disabled:opacity-40">Agregar movimiento</button>
                </section>
                <section className="space-y-3">
                  {plan.movimientos.filter((m)=>m.periodoId===plan.periodoActivo).map((m)=>{
                    const tp=totalPersonalTFP(m.sistema,m.cantidad,periodo.esfuerzo);
                    return <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex flex-wrap justify-between gap-2"><b>{m.cantidad} × {m.sistema}</b><span className="text-xs text-slate-400">{baseNombre(m.origen,plan.bases)} → {baseNombre(m.destino,plan.bases)}</span></div>
                      <div className="mt-2 grid gap-2 md:grid-cols-4 text-xs">
                        <div className="rounded bg-slate-950 p-2">Bloques TFP de 4<b className="block text-lg">{tp?.bloques??"—"}</b></div>
                        <div className="rounded bg-slate-950 p-2">Personal técnico<b className="block text-lg">{tp?.total??"—"}</b></div>
                        <div className="rounded bg-slate-950 p-2">Aérea<b className="block text-lg">{distanciaAerea(m.origen,m.destino)??"—"} km</b></div>
                        <div className="rounded bg-slate-950 p-2">Terrestre<b className="block text-lg">{distanciaTerrestre(m.origen,m.destino)??"—"} km</b></div>
                      </div>
                      {tp&&<div className="mt-2 text-[11px] text-slate-400">Por bloque: J {tp.detalle.jefe} · Enc {tp.detalle.encargado} · Est {tp.detalle.estructuras} · Arm {tp.detalle.armamento} · Aviónica {tp.detalle.avionica} · Hid {tp.detalle.hidraulica} · Esp {tp.detalle.especiales}</div>}
                      <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-emerald-300">Equipos que acompañan al movimiento</summary>
                        <div className="mt-2 grid gap-2 md:grid-cols-3">
                          {EQUIPOS_APOYO.map((e)=><label key={e.id} className="text-xs">{e.nombre}<input type="number" min="0" value={m.equipos[e.id]||0} onChange={(ev)=>updateEquipoMovimiento(m.id,e.id,Number(ev.target.value))} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>)}
                        </div>
                      </details>
                    </div>;
                  })}
                  {plan.movimientosMaterial.filter((m)=>m.periodoId===plan.periodoActivo).map((m)=>{
                    const tn=(m.cantidad*m.pesoKgUnidad)/1000;
                    return <div key={m.id} className="rounded-xl border border-amber-900 bg-amber-950/10 p-4">
                      <b>{m.material}: {m.cantidad} unidades</b>
                      <p className="text-xs">{baseNombre(m.origen,plan.bases)} → {baseNombre(m.destino,plan.bases)} · {fmt(tn,1)} Tn · {distanciaTerrestre(m.origen,m.destino)??"—"} km terrestre</p>
                    </div>;
                  })}
                </section>
              </div>
            )}

            {tab==="personal"&&(
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black">Movimientos de personal cargados para MMA Nº 2</h2>
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="text-slate-400"><tr><th className="p-2">Origen</th><th>Destino</th><th>OF</th><th>SUB</th><th>S/V</th><th>CIV</th><th>Total</th><th>Dist. terrestre</th></tr></thead>
                    <tbody>{plan.movimientosPersonal.filter((m)=>m.periodoId===plan.periodoActivo).map((m)=><tr key={m.id} className="border-t border-slate-800"><td className="p-2">{baseNombre(m.origen,plan.bases)}</td><td>{baseNombre(m.destino,plan.bases)}</td><td>{m.oficiales}</td><td>{m.suboficiales}</td><td>{m.sv}</td><td>{m.civiles}</td><td className="font-black">{totalPersonalMovimiento(m)}</td><td>{distanciaTerrestre(m.origen,m.destino)??"—"} km</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {plan.bases.map((b)=>{
                    const tec=personalTfpPorBase[b.id]||0;
                    const org=personalOrganicoPorBase[b.id]||0;
                    const ocup=b.personalPermanente+tec+org;
                    const carpas=Math.max(0,Math.ceil(ocup/500));
                    const raciones=ocup*2;
                    const cocinas=Math.max(0,Math.ceil(ocup/500));
                    return <section key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex justify-between"><b>{b.nombre}</b><span className="text-xs text-slate-400">Cap. {b.capacidadAlojamiento??"pendiente"}</span></div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div className="rounded bg-slate-950 p-2">Ocupación<b className="block text-lg">{fmt(ocup)}</b></div><div className="rounded bg-slate-950 p-2">Carpas 500 pers<b className="block text-lg">{carpas}</b></div><div className="rounded bg-slate-950 p-2">Raciones/día<b className="block text-lg">{fmt(raciones)}</b></div></div>
                      <p className="mt-2 text-xs text-slate-400">Cocinas de campaña estimadas por regla de la TFP: {cocinas}.</p>
                    </section>;
                  })}
                </div>
              </div>
            )}

            {tab==="misiones"&&(
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black">Paquete de aeronaves</h2>
                  <table className="w-full min-w-[1000px] text-left text-xs"><thead className="text-slate-400"><tr><th className="p-2">Día</th><th>Operación</th><th>Aeronave</th><th>Cant.</th><th>Armamento</th><th>Por avión</th><th>Base</th><th>Hs vuelo</th></tr></thead>
                    <tbody>{plan.misiones.filter((m)=>m.periodoId===plan.periodoActivo).map((m)=><tr key={m.id} className="border-t border-slate-800"><td className="p-2">{m.dia}</td><td className="font-bold">{m.operacion}</td><td>{m.aeronave}</td><td>{m.cantidad}</td><td>{m.armamento}</td><td>{m.armamentoPorAvion??"—"}</td><td>{baseNombre(m.base,plan.bases)}</td><td>{m.horasVuelo??"—"}</td></tr>)}</tbody>
                  </table>
                </div>
                {plan.misionesREV.filter((r)=>r.periodoId===plan.periodoActivo).map((r)=>{
                  const pases=(r.ida?1:0)+(r.regreso?1:0);
                  const demanda=r.receptores*r.litrosPorReceptor*pases;
                  const cap=r.capacidadTransferiblePorCisterna==null?null:r.capacidadTransferiblePorCisterna*r.cantidadCisternas;
                  return <section key={r.id} className="rounded-xl border border-cyan-900 bg-slate-900 p-4">
                    <h3 className="font-black text-cyan-300">{r.nombre}</h3>
                    <div className="mt-3 grid gap-2 md:grid-cols-5">
                      <label className="text-xs">Cisternas<input type="number" value={r.cantidadCisternas} onChange={(e)=>updateREV(r.id,{cantidadCisternas:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                      <label className="text-xs">Receptores<input type="number" value={r.receptores} onChange={(e)=>updateREV(r.id,{receptores:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                      <label className="text-xs">L/receptor/pase<input type="number" value={r.litrosPorReceptor} onChange={(e)=>updateREV(r.id,{litrosPorReceptor:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                      <label className="text-xs">L transferibles/cisterna<input type="number" value={r.capacidadTransferiblePorCisterna??""} onChange={(e)=>updateREV(r.id,{capacidadTransferiblePorCisterna:e.target.value===""?null:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                      <div className="rounded bg-slate-950 p-2 text-xs">Margen<b className="block text-lg">{cap==null?"Pendiente":`${fmt(cap-demanda)} L`}</b></div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs"><label><input type="checkbox" checked={r.ida} onChange={(e)=>updateREV(r.id,{ida:e.target.checked})}/> Ida</label><label><input type="checkbox" checked={r.regreso} onChange={(e)=>updateREV(r.id,{regreso:e.target.checked})}/> Regreso</label></div>
                  </section>;
                })}
              </div>
            )}

            {tab==="reabastecimiento"&&(
              <div className="space-y-4">
                <div className="flex justify-between"><div><h2 className="font-black">Tiempos de reabastecimiento</h2><p className="text-xs text-slate-500">Ciclo general 3 días. Clase III A: 4 días en asiento y 3 días en PRF/apoyo, editable por requerimiento.</p></div><button onClick={addReab} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold">+ Requerimiento</button></div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <table className="w-full min-w-[900px] text-left text-xs"><thead className="text-slate-400"><tr><th className="p-2">Base</th><th>Recurso</th><th>Cantidad</th><th>Unidad</th><th>Día solicitud</th><th>Demora</th><th>ETA</th></tr></thead>
                    <tbody>{plan.reabastecimientos.filter((r)=>r.periodoId===plan.periodoActivo).map((r)=><tr key={r.id} className="border-t border-slate-800"><td className="p-2"><select value={r.base} onChange={(e)=>updateReab(r.id,{base:e.target.value as BaseId})} className="rounded bg-slate-800 p-1">{plan.bases.map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></td><td><input value={r.recurso} onChange={(e)=>updateReab(r.id,{recurso:e.target.value})} className="rounded bg-slate-800 p-1"/></td><td><input type="number" value={r.cantidad} onChange={(e)=>updateReab(r.id,{cantidad:Number(e.target.value)})} className="w-24 rounded bg-slate-800 p-1"/></td><td>{r.unidad}</td><td><input type="number" value={r.diaSolicitud} onChange={(e)=>updateReab(r.id,{diaSolicitud:Number(e.target.value)})} className="w-20 rounded bg-slate-800 p-1"/></td><td><input type="number" value={r.demoraDias} onChange={(e)=>updateReab(r.id,{demoraDias:Number(e.target.value)})} className="w-20 rounded bg-slate-800 p-1"/></td><td className="font-black">{r.diaSolicitud+r.demoraDias}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black">Capacidad de transporte terrestre TFP</h2>
                  <table className="w-full min-w-[950px] text-left text-xs"><thead className="text-slate-400"><tr><th className="p-2">Vehículo</th><th>Cant.</th><th>Pax</th><th>Tn</th><th>Choferes/veh.</th><th>Choferes 3 turnos</th><th>L/100 km</th></tr></thead>
                    <tbody>{VEHICULOS_TFP.map((v)=><tr key={v.id} className="border-t border-slate-800"><td className="p-2 font-bold">{v.nombre}</td><td>{v.cantidad}</td><td>{v.capacidadPax??"—"}</td><td>{v.capacidadTn}</td><td>{v.choferesPorVehiculo}</td><td>{v.cantidad*v.choferesPorVehiculo*3}</td><td>{v.consumoL100km}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            {tab==="tfp"&&(
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm"><b className="text-emerald-300">TFP (1) cargada.</b> El personal aeronáutico se calcula por bloques de hasta 4 aeronaves y cambia automáticamente según ERC, MESC o MEIC.</div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <table className="w-full min-w-[1100px] text-left text-xs"><thead className="text-slate-400"><tr><th className="p-2">Sistema</th><th>MEIC / 4</th><th>MESC / 4</th><th>ERC / 4</th><th>Combustible L/h</th><th>HH mant/HV</th></tr></thead>
                    <tbody>{TFP_SISTEMAS.map((t)=>{
                      const tm=Object.values(t.meic).reduce((a,b)=>a+b,0), ts=Object.values(t.mesc).reduce((a,b)=>a+b,0), te=Object.values(t.erc).reduce((a,b)=>a+b,0);
                      return <tr key={t.sistema} className="border-t border-slate-800"><td className="p-2 font-bold">{t.sistema}</td><td>{tm}</td><td>{ts}</td><td>{te}</td><td>{t.combustibleLitrosHora??"Pendiente"}</td><td>{t.hhMantPorHoraVuelo??"Pendiente"}</td></tr>;
                    })}</tbody>
                  </table>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black">Equipos de apoyo · operación 24 h</h2>
                  <table className="w-full min-w-[900px] text-left text-xs"><thead className="text-slate-400"><tr><th className="p-2">Equipo</th><th>Personal</th><th>L/h</th><th>Peso kg</th><th>Capacidad Tn</th></tr></thead>
                    <tbody>{EQUIPOS_APOYO.map((e)=><tr key={e.id} className="border-t border-slate-800"><td className="p-2 font-bold">{e.nombre}</td><td>{e.personal24h??"—"}</td><td>{e.combustibleLitrosHora??"—"}</td><td>{e.pesoKg??"—"}</td><td>{e.capacidadTn??"—"}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            {tab==="alertas"&&(
              <div className="space-y-2">{alertas.length?alertas.map((x,i)=><div key={i} className="rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">⚠ {x}</div>):<div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-200">Sin alertas activas.</div>}</div>
            )}
          </main>
        </div>
      )}
    </>
  );
}
