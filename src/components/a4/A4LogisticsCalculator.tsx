"use client";

import { useEffect, useMemo, useState } from "react";

type BaseId =
  | "la-rioja"
  | "villa-mercedes"
  | "cordoba"
  | "mendoza"
  | "gral-acha"
  | "malargue"
  | "realico"
  | "san-rafael"
  | "rio-cuarto"
  | "deposito-ton";

type MedioTipo = "aeronave" | "helicoptero" | "ucav" | "radar" | "defensa";

type BasePlan = {
  id: BaseId;
  nombre: string;
  lat?: number;
  lon?: number;
  tipo: string;
  sostenimientoMinDias?: number;
  cicloReabastecimientoDias?: number;
  cicloIIIADias?: number;
};

type Asignacion = {
  id: string;
  sistema: string;
  variante?: string;
  tipo: MedioTipo;
  base: BaseId;
  cantidadPlan: number;
  cantidadActual: number;
  fuente: string;
};

type FactorTFP = {
  sistema: string;
  pilotosPorAeronave: number | null;
  combustibleKgHora: number | null;
  velocidadPlanKt: number | null;
  hhMantenimientoPorHV: number | null;
  horasPlanificadas72: number;
  fuente: string;
};

type Municion = {
  id: string;
  familia: string;
  tipo: string;
  cantidadPlan: number;
  disponible: number;
  comprometido: number;
  consumido: number;
  base: BaseId;
  fuente: string;
};

type Movimiento = {
  id: string;
  sistema: string;
  origen: BaseId;
  destino: BaseId;
  cantidad: number;
  velocidadKt: number;
  distanciaKm: number;
  distanciaNm: number;
  tiempoHoras: number;
  combustibleKg: number | null;
  fecha: string;
};

type EstadoA4 = {
  asignaciones: Asignacion[];
  tfp: FactorTFP[];
  municion: Municion[];
  movimientos: Movimiento[];
};

const STORAGE_KEY = "zeus-a4-logistica-v1";

const BASES: BasePlan[] = [
  { id: "la-rioja", nombre: "1ª Brigada Aérea / La Rioja", lat: -29.376201, lon: -66.793409, tipo: "Base aérea" },
  { id: "villa-mercedes", nombre: "2ª Brigada Aérea / Villa Mercedes", lat: -33.738415, lon: -65.370632, tipo: "Base aérea" },
  { id: "cordoba", nombre: "3ª Brigada Aérea / Córdoba", lat: -31.319799, lon: -64.207857, tipo: "Base aérea" },
  { id: "mendoza", nombre: "4ª Brigada Aérea / Mendoza", lat: -32.89, lon: -68.84, tipo: "Base aérea" },
  { id: "gral-acha", nombre: "5ª Brigada Aérea / Gral. Acha", lat: -37.425428, lon: -64.639206, tipo: "Base aérea" },
  { id: "malargue", nombre: "BAM Malargüe", lat: -35.47, lon: -69.58, tipo: "Base aérea / COAe alternativo" },
  { id: "realico", nombre: "Área de Material Realicó", lat: -35.035, lon: -64.245, tipo: "Apoyo logístico" },
  { id: "san-rafael", nombre: "Área de Material San Rafael", lat: -34.617, lon: -68.33, tipo: "Apoyo logístico" },
  { id: "rio-cuarto", nombre: "COAe / Río Cuarto", lat: -33.085, lon: -64.261, tipo: "Comando" },
  { id: "deposito-ton", nombre: "Depósito TON / sin distribuir", tipo: "Inventario central" },
].map((b) => ({
  ...b,
  sostenimientoMinDias: b.id === "deposito-ton" ? undefined : 5,
  cicloReabastecimientoDias: b.id === "deposito-ton" ? undefined : 3,
  cicloIIIADias: b.id === "deposito-ton" ? undefined : 3,
}));

const ASIGNACIONES_PLAN: Asignacion[] = [
  { id:"c130j-1ba", sistema:"C-130J", tipo:"aeronave", base:"la-rioja", cantidadPlan:10, cantidadActual:10, fuente:"Anexo CHARLIE" },
  { id:"kc130j-1ba", sistema:"KC-130J", tipo:"aeronave", base:"la-rioja", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"lj60-1ba", sistema:"Learjet 60", tipo:"aeronave", base:"la-rioja", cantidadPlan:3, cantidadActual:3, fuente:"Anexo CHARLIE" },
  { id:"dhc6-1ba", sistema:"DHC-6-400", tipo:"aeronave", base:"la-rioja", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"b412-1ba", sistema:"B-412", tipo:"helicoptero", base:"la-rioja", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"uh1y-1ba", sistema:"UH-1Y", tipo:"helicoptero", base:"la-rioja", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"nasams-1ba", sistema:"NASAMS", tipo:"defensa", base:"la-rioja", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
  { id:"skyguard-1ba", sistema:"Oerlikon Skyguard", tipo:"defensa", base:"la-rioja", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
  { id:"tps77-1ba", sistema:"TPS-77", tipo:"radar", base:"la-rioja", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },

  { id:"f16c40-2ba", sistema:"F-16C Block 40", tipo:"aeronave", base:"villa-mercedes", cantidadPlan:20, cantidadActual:20, fuente:"Anexo CHARLIE" },
  { id:"amx-2ba", sistema:"AMX A-1M", tipo:"aeronave", base:"villa-mercedes", cantidadPlan:12, cantidadActual:12, fuente:"Anexo CHARLIE" },
  { id:"t6-2ba", sistema:"T-6 Texan II", tipo:"aeronave", base:"villa-mercedes", cantidadPlan:12, cantidadActual:12, fuente:"Anexo CHARLIE" },
  { id:"hermes-2ba", sistema:"Hermes 450 SIGINT", tipo:"ucav", base:"villa-mercedes", cantidadPlan:3, cantidadActual:3, fuente:"Anexo CHARLIE" },
  { id:"b412-2ba", sistema:"B-412", tipo:"helicoptero", base:"villa-mercedes", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"uh1y-2ba", sistema:"UH-1Y", tipo:"helicoptero", base:"villa-mercedes", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"dhc6-2ba", sistema:"DHC-6-400", tipo:"aeronave", base:"villa-mercedes", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"nasams-2ba", sistema:"NASAMS", tipo:"defensa", base:"villa-mercedes", cantidadPlan:2, cantidadActual:2, fuente:"Anexo CHARLIE" },
  { id:"skyguard-2ba", sistema:"Oerlikon Skyguard", tipo:"defensa", base:"villa-mercedes", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
  { id:"tps77-2ba", sistema:"TPS-77", tipo:"radar", base:"villa-mercedes", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },

  { id:"amx-3ba", sistema:"AMX A-1M", tipo:"aeronave", base:"cordoba", cantidadPlan:12, cantidadActual:12, fuente:"Anexo CHARLIE" },
  { id:"t6-3ba", sistema:"T-6 Texan II", tipo:"aeronave", base:"cordoba", cantidadPlan:12, cantidadActual:12, fuente:"Anexo CHARLIE" },
  { id:"e99m-3ba", sistema:"E-99M Erieye", tipo:"aeronave", base:"cordoba", cantidadPlan:3, cantidadActual:3, fuente:"Anexo CHARLIE" },
  { id:"b412-3ba", sistema:"B-412", tipo:"helicoptero", base:"cordoba", cantidadPlan:2, cantidadActual:2, fuente:"Anexo CHARLIE" },
  { id:"uh1y-3ba", sistema:"UH-1Y", tipo:"helicoptero", base:"cordoba", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"kc135-3ba", sistema:"KC-135", tipo:"aeronave", base:"cordoba", cantidadPlan:3, cantidadActual:3, fuente:"Anexo CHARLIE" },
  { id:"ch47-3ba", sistema:"CH-47F", tipo:"helicoptero", base:"cordoba", cantidadPlan:6, cantidadActual:6, fuente:"Anexo CHARLIE" },
  { id:"patriot-3ba", sistema:"Patriot", tipo:"defensa", base:"cordoba", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
  { id:"skyguard-3ba", sistema:"Oerlikon Skyguard", tipo:"defensa", base:"cordoba", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
  { id:"tps77-3ba", sistema:"TPS-77", tipo:"radar", base:"cordoba", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },

  { id:"f16c40-4ba", sistema:"F-16C Block 40", tipo:"aeronave", base:"mendoza", cantidadPlan:14, cantidadActual:14, fuente:"Anexo CHARLIE" },
  { id:"f16d42-4ba", sistema:"F-16D Block 42", tipo:"aeronave", base:"mendoza", cantidadPlan:6, cantidadActual:6, fuente:"Anexo CHARLIE" },
  { id:"dhc6-4ba", sistema:"DHC-6-400", tipo:"aeronave", base:"mendoza", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"kc135-4ba", sistema:"KC-135", tipo:"aeronave", base:"mendoza", cantidadPlan:3, cantidadActual:3, fuente:"Anexo CHARLIE" },
  { id:"b412-4ba", sistema:"B-412", tipo:"helicoptero", base:"mendoza", cantidadPlan:2, cantidadActual:2, fuente:"Anexo CHARLIE" },
  { id:"uh1y-4ba", sistema:"UH-1Y", tipo:"helicoptero", base:"mendoza", cantidadPlan:4, cantidadActual:4, fuente:"Anexo CHARLIE" },
  { id:"patriot-4ba", sistema:"Patriot", tipo:"defensa", base:"mendoza", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
  { id:"skyguard-4ba", sistema:"Oerlikon Skyguard", tipo:"defensa", base:"mendoza", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },

  { id:"f16cj50-5ba", sistema:"F-16CJ Block 50", tipo:"aeronave", base:"gral-acha", cantidadPlan:10, cantidadActual:10, fuente:"Anexo CHARLIE" },
  { id:"harpy-5ba", sistema:"IAI Harpy", tipo:"ucav", base:"gral-acha", cantidadPlan:36, cantidadActual:36, fuente:"Anexo CHARLIE / DELTA" },
  { id:"lj60-5ba", sistema:"Learjet 60", tipo:"aeronave", base:"gral-acha", cantidadPlan:3, cantidadActual:3, fuente:"Anexo CHARLIE" },
  { id:"hermes-5ba", sistema:"Hermes 450 EyR", tipo:"ucav", base:"gral-acha", cantidadPlan:3, cantidadActual:3, fuente:"Anexo CHARLIE" },
  { id:"ec130h-5ba", sistema:"EC-130H Compass Call", tipo:"aeronave", base:"gral-acha", cantidadPlan:2, cantidadActual:2, fuente:"Anexo CHARLIE" },
  { id:"b412-5ba", sistema:"B-412", tipo:"helicoptero", base:"gral-acha", cantidadPlan:2, cantidadActual:2, fuente:"Anexo CHARLIE" },
  { id:"ch47-5ba", sistema:"CH-47F", tipo:"helicoptero", base:"gral-acha", cantidadPlan:6, cantidadActual:6, fuente:"Anexo CHARLIE" },
  { id:"nasams-5ba", sistema:"NASAMS", tipo:"defensa", base:"gral-acha", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
  { id:"skyguard-5ba", sistema:"Oerlikon Skyguard", tipo:"defensa", base:"gral-acha", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
  { id:"gm400-5ba", sistema:"GM400 Alpha", tipo:"radar", base:"gral-acha", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },

  { id:"nasams-mal", sistema:"NASAMS", tipo:"defensa", base:"malargue", cantidadPlan:2, cantidadActual:2, fuente:"Anexo CHARLIE" },
  { id:"skyguard-mal", sistema:"Oerlikon Skyguard", tipo:"defensa", base:"malargue", cantidadPlan:1, cantidadActual:1, fuente:"Anexo CHARLIE" },
];

const SISTEMAS_TFP = [
  "F-16C Block 40","F-16D Block 42","F-16CJ Block 50","AMX A-1M","T-6 Texan II",
  "E-99M Erieye","EC-130H Compass Call","C-130J","KC-130J","KC-135","Learjet 60",
  "DHC-6-400","CH-47F","UH-1Y","B-412","Hermes 450 SIGINT","Hermes 450 EyR","IAI Harpy"
];

const TFP_INICIAL: FactorTFP[] = SISTEMAS_TFP.map((sistema) => ({
  sistema,
  pilotosPorAeronave: ["F-16C Block 40","F-16D Block 42","F-16CJ Block 50","AMX A-1M","T-6 Texan II"].includes(sistema) ? 3.5 : null,
  combustibleKgHora: null,
  velocidadPlanKt: null,
  hhMantenimientoPorHV: null,
  horasPlanificadas72: 0,
  fuente: ["F-16C Block 40","F-16D Block 42","F-16CJ Block 50","AMX A-1M","T-6 Texan II"].includes(sistema)
    ? "PPC párr. 413: 3,5 pilotos/avión en empleo intensivo. Resto pendiente TFP (1)."
    : "Pendiente de cargar desde TFP (1).",
}));

const MUNICION_PLAN: Municion[] = [
  { id:"gbu10-f16", familia:"F-16", tipo:"GBU-10 Paveway II", cantidadPlan:48, disponible:48, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"gbu12-f16", familia:"F-16", tipo:"GBU-12 Paveway II", cantidadPlan:48, disponible:48, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"gbu38-f16", familia:"F-16", tipo:"GBU-38 JDAM", cantidadPlan:78, disponible:78, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"aim9-f16", familia:"F-16", tipo:"AIM-9M Sidewinder", cantidadPlan:180, disponible:180, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"aim120-f16", familia:"F-16", tipo:"AIM-120C-5 AMRAAM", cantidadPlan:240, disponible:240, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"aim7-f16", familia:"F-16", tipo:"AIM-7P Sparrow", cantidadPlan:220, disponible:220, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"agm65-f16", familia:"F-16", tipo:"AGM-65G Maverick", cantidadPlan:120, disponible:120, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"agm88-f16", familia:"F-16", tipo:"AGM-88C HARM", cantidadPlan:140, disponible:140, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"agm119-f16", familia:"F-16", tipo:"AGM-119 Penguin", cantidadPlan:80, disponible:80, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"gbu10-amx", familia:"AMX", tipo:"GBU-10 Paveway II", cantidadPlan:48, disponible:48, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"gbu12-amx", familia:"AMX", tipo:"GBU-12 Paveway II", cantidadPlan:48, disponible:48, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"gbu16-amx", familia:"AMX", tipo:"GBU-16 Paveway II", cantidadPlan:48, disponible:48, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"mar1-amx", familia:"AMX", tipo:"MAR-1", cantidadPlan:96, disponible:96, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"aim9-amx", familia:"AMX", tipo:"AIM-9M Sidewinder", cantidadPlan:140, disponible:140, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"mk81-t6", familia:"T-6", tipo:"Mk 81", cantidadPlan:180, disponible:180, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"mk82-t6", familia:"T-6", tipo:"Mk 82", cantidadPlan:180, disponible:180, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"gbu12-t6", familia:"T-6", tipo:"GBU-12 Paveway II", cantidadPlan:48, disponible:48, comprometido:0, consumido:0, base:"deposito-ton", fuente:"Anexo DELTA" },
  { id:"harpy", familia:"IAI Harpy", tipo:"Munición merodeadora SEAD", cantidadPlan:36, disponible:36, comprometido:0, consumido:0, base:"gral-acha", fuente:"Anexo DELTA / CHARLIE" },
];

const ESTADO_INICIAL: EstadoA4 = {
  asignaciones: ASIGNACIONES_PLAN,
  tfp: TFP_INICIAL,
  municion: MUNICION_PLAN,
  movimientos: [],
};

function haversineKm(a: BasePlan, b: BasePlan) {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return 0;
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat/2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon/2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

function n(v: number, digits=0) {
  return new Intl.NumberFormat("es-AR",{maximumFractionDigits:digits}).format(v);
}

function baseNombre(id: BaseId) {
  return BASES.find((b)=>b.id===id)?.nombre ?? id;
}

export default function A4LogisticsCalculator() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"resumen"|"prf"|"movimientos"|"combustible"|"armamento"|"tfp"|"alertas">("resumen");
  const [estado, setEstado] = useState<EstadoA4>(ESTADO_INICIAL);
  const [sistema, setSistema] = useState("F-16CJ Block 50");
  const [origen, setOrigen] = useState<BaseId>("gral-acha");
  const [destino, setDestino] = useState<BaseId>("cordoba");
  const [cantidad, setCantidad] = useState(10);
  const [velocidad, setVelocidad] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setEstado(JSON.parse(raw) as EstadoA4);
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado)); } catch {}
  }, [estado]);

  const sistemas = useMemo(
    () => Array.from(new Set(estado.asignaciones.map((a)=>a.sistema))).sort(),
    [estado.asignaciones]
  );

  const disponiblesOrigen = useMemo(
    () => estado.asignaciones
      .filter((a)=>a.sistema===sistema && a.base===origen)
      .reduce((s,a)=>s+a.cantidadActual,0),
    [estado.asignaciones,sistema,origen]
  );

  const baseO = BASES.find((b)=>b.id===origen)!;
  const baseD = BASES.find((b)=>b.id===destino)!;
  const distanciaKm = haversineKm(baseO,baseD);
  const distanciaNm = distanciaKm / 1.852;
  const factor = estado.tfp.find((f)=>f.sistema===sistema);
  const velocidadEfectiva = velocidad || factor?.velocidadPlanKt || 0;
  const tiempoHoras = velocidadEfectiva > 0 ? distanciaNm / velocidadEfectiva : 0;
  const combustibleTraslado = factor?.combustibleKgHora != null && tiempoHoras > 0
    ? factor.combustibleKgHora * tiempoHoras * cantidad
    : null;

  const totalAeronaves = estado.asignaciones.filter((a)=>["aeronave","helicoptero","ucav"].includes(a.tipo)).reduce((s,a)=>s+a.cantidadActual,0);
  const totalPlan = estado.asignaciones.filter((a)=>["aeronave","helicoptero","ucav"].includes(a.tipo)).reduce((s,a)=>s+a.cantidadPlan,0);
  const municionDisponible = estado.municion.reduce((s,m)=>s+Math.max(0,m.disponible-m.comprometido-m.consumido),0);
  const tfpPendientes = estado.tfp.filter((f)=>f.combustibleKgHora==null || f.velocidadPlanKt==null).length;

  const consumo72PorBase = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of estado.asignaciones) {
      const f = estado.tfp.find((x)=>x.sistema===a.sistema);
      if (!f || f.combustibleKgHora==null || f.horasPlanificadas72<=0) continue;
      out[a.base] = (out[a.base] ?? 0) + a.cantidadActual * f.horasPlanificadas72 * f.combustibleKgHora;
    }
    return out;
  }, [estado]);

  const alertas = useMemo(() => {
    const a: string[] = [];
    if (tfpPendientes) a.push(`${tfpPendientes} sistemas todavía no tienen TFP de combustible/velocidad cargada desde TFP (1).`);
    const gbu10F16 = estado.municion.find((m)=>m.id==="gbu10-f16");
    if (gbu10F16 && gbu10F16.disponible < 50) a.push(`GBU-10 F-16: el inventario del Plan es ${gbu10F16.disponible}; cualquier demanda superior debe elevarse como requerimiento.`);
    for (const b of BASES.filter((x)=>x.id!=="deposito-ton")) {
      const consumo = consumo72PorBase[b.id] ?? 0;
      if (consumo>0) a.push(`${b.nombre}: demanda calculada próximas 72 h = ${n(consumo,0)} kg de combustible aeronáutico.`);
    }
    return a;
  }, [estado,tfpPendientes,consumo72PorBase]);

  function aplicarMovimiento() {
    if (origen===destino || cantidad<=0 || cantidad>disponiblesOrigen) return;

    setEstado((prev)=>{
      const next = structuredClone(prev) as EstadoA4;
      let restante = cantidad;
      for (const a of next.asignaciones) {
        if (a.sistema===sistema && a.base===origen && restante>0) {
          const mover = Math.min(restante,a.cantidadActual);
          a.cantidadActual -= mover;
          restante -= mover;
        }
      }
      const destinoRow = next.asignaciones.find((a)=>a.sistema===sistema && a.base===destino);
      if (destinoRow) destinoRow.cantidadActual += cantidad;
      else {
        const muestra = prev.asignaciones.find((a)=>a.sistema===sistema)!;
        next.asignaciones.push({
          ...muestra,
          id:`mov-${Date.now()}`,
          base:destino,
          cantidadPlan:0,
          cantidadActual:cantidad,
          fuente:"Movimiento A4 sobre dispositivo inicial del Plan",
        });
      }
      next.movimientos.unshift({
        id:`mov-${Date.now()}`,
        sistema, origen, destino, cantidad,
        velocidadKt:velocidadEfectiva,
        distanciaKm, distanciaNm, tiempoHoras,
        combustibleKg:combustibleTraslado,
        fecha:new Date().toISOString(),
      });
      return next;
    });
  }

  function resetPlan() {
    if (!window.confirm("¿Restablecer la Calculadora A4 al dispositivo inicial del Plan de Campaña?")) return;
    setEstado(structuredClone(ESTADO_INICIAL));
  }

  function updateTfp(index:number, patch:Partial<FactorTFP>) {
    setEstado((prev)=>({
      ...prev,
      tfp: prev.tfp.map((f,i)=>i===index?{...f,...patch}:f)
    }));
  }

  function updateMunicion(index:number, patch:Partial<Municion>) {
    setEstado((prev)=>({
      ...prev,
      municion: prev.municion.map((m,i)=>i===index?{...m,...patch}:m)
    }));
  }

  const tabs = [
    ["resumen","Resumen"],["prf","PRF / Medios"],["movimientos","Movimientos"],
    ["combustible","Combustible"],["armamento","Armamento"],["tfp","TFP"],["alertas","Alertas"]
  ] as const;

  return (
    <>
      <section className="mb-5 rounded-lg border border-emerald-700 bg-emerald-950/20 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">A4 · ZEUS II</p>
            <h2 className="font-bold text-white">Calculadora logística</h2>
          </div>
          <span className="rounded bg-emerald-950 px-2 py-1 text-[10px] font-bold text-emerald-200">MMA Nº 2</span>
        </div>
        <p className="mb-3 text-xs text-slate-400">Estado inicial: Plan de Campaña + Anexos CHARLIE/DELTA. Los movimientos posteriores modifican “situación actual”, nunca la asignación original.</p>
        <button type="button" onClick={()=>setOpen(true)} className="w-full rounded bg-emerald-700 px-3 py-2 text-sm font-black text-white hover:bg-emerald-600">
          Abrir Calculadora A4
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[10000] flex bg-slate-950/95 text-white">
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900 bg-slate-950 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-300">ZEUS II · CELDA A4</p>
                <h1 className="text-xl font-black">Control Logístico · MMA Retenido Nº 2</h1>
                <p className="text-xs text-slate-400">Original del Plan vs situación actual · PRF · movimientos · TFP · combustible · armamento</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={resetPlan} className="rounded border border-amber-700 px-3 py-2 text-xs font-bold text-amber-200">Restablecer Plan</button>
                <button type="button" onClick={()=>setOpen(false)} className="rounded bg-slate-800 px-4 py-2 text-sm font-bold">Cerrar</button>
              </div>
            </header>

            <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 px-4 py-2">
              {tabs.map(([id,label])=>(
                <button key={id} type="button" onClick={()=>setTab(id)} className={`whitespace-nowrap rounded px-3 py-2 text-xs font-bold ${tab===id?"bg-emerald-700 text-white":"bg-slate-900 text-slate-300"}`}>
                  {label}
                </button>
              ))}
            </nav>

            <main className="min-h-0 flex-1 overflow-auto p-5">
              {tab==="resumen" && (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      ["Medios aéreos actuales",n(totalAeronaves)],
                      ["Medios aéreos del Plan",n(totalPlan)],
                      ["Munición remanente",n(municionDisponible)],
                      ["Movimientos aplicados",n(estado.movimientos.length)],
                      ["TFP incompletas",n(tfpPendientes)],
                    ].map(([k,v])=>(
                      <div key={k} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500">{k}</p>
                        <p className="mt-2 text-2xl font-black">{v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-emerald-900 bg-slate-900 p-4">
                    <h2 className="mb-3 font-black text-emerald-300">Reglas logísticas incorporadas</h2>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded bg-slate-950 p-3"><p className="text-xs text-slate-500">Sostenimiento PRF</p><p className="font-black">≥ 5 días</p><p className="text-[11px] text-slate-500">Anexo DELTA · Clase III</p></div>
                      <div className="rounded bg-slate-950 p-3"><p className="text-xs text-slate-500">Ciclo reabastecimiento PRF</p><p className="font-black">3 días</p><p className="text-[11px] text-slate-500">Anexo DELTA</p></div>
                      <div className="rounded bg-slate-950 p-3"><p className="text-xs text-slate-500">Ciclo Clase III A en PRF</p><p className="font-black">3 días</p><p className="text-[11px] text-slate-500">Combustibles/lubricantes aeronáuticos</p></div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <h2 className="mb-3 font-black">Estado por PRF / asiento</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[850px] text-left text-xs">
                        <thead className="text-slate-400"><tr><th className="p-2">PRF / Base</th><th>Medios aéreos</th><th>Plan</th><th>Demanda 72h combustible</th><th>Ciclo III A</th></tr></thead>
                        <tbody>
                          {BASES.filter((b)=>b.id!=="deposito-ton").map((b)=>{
                            const current = estado.asignaciones.filter((a)=>a.base===b.id && ["aeronave","helicoptero","ucav"].includes(a.tipo)).reduce((s,a)=>s+a.cantidadActual,0);
                            const plan = estado.asignaciones.filter((a)=>a.base===b.id && ["aeronave","helicoptero","ucav"].includes(a.tipo)).reduce((s,a)=>s+a.cantidadPlan,0);
                            return <tr key={b.id} className="border-t border-slate-800"><td className="p-2 font-bold">{b.nombre}</td><td>{current}</td><td>{plan}</td><td>{consumo72PorBase[b.id]?`${n(consumo72PorBase[b.id],0)} kg`:"Pendiente TFP/horas"}</td><td>{b.cicloIIIADias} días</td></tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {tab==="prf" && (
                <div className="grid gap-4 xl:grid-cols-2">
                  {BASES.filter((b)=>b.id!=="deposito-ton").map((b)=>(
                    <div key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div><h2 className="font-black">{b.nombre}</h2><p className="text-xs text-slate-500">{b.tipo}</p></div>
                        <span className="rounded bg-slate-800 px-2 py-1 text-[10px]">III A: {b.cicloIIIADias} d</span>
                      </div>
                      <div className="space-y-1">
                        {estado.asignaciones.filter((a)=>a.base===b.id && a.cantidadActual>0).map((a)=>(
                          <div key={a.id} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded bg-slate-950 px-3 py-2 text-xs">
                            <span>{a.sistema}</span>
                            <span className="text-slate-400">Plan {a.cantidadPlan}</span>
                            <span className={`font-black ${a.cantidadActual===a.cantidadPlan?"text-emerald-300":"text-amber-300"}`}>Actual {a.cantidadActual}</span>
                          </div>
                        ))}
                        {!estado.asignaciones.some((a)=>a.base===b.id && a.cantidadActual>0) && <p className="text-xs text-slate-500">Sin medios cargados.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab==="movimientos" && (
                <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
                  <section className="rounded-xl border border-emerald-900 bg-slate-900 p-4">
                    <h2 className="mb-4 font-black text-emerald-300">Nuevo movimiento</h2>
                    <label className="mb-3 block text-xs">Sistema<select value={sistema} onChange={(e)=>setSistema(e.target.value)} className="mt-1 w-full rounded bg-slate-800 p-2">{sistemas.map((s)=><option key={s}>{s}</option>)}</select></label>
                    <label className="mb-3 block text-xs">Origen<select value={origen} onChange={(e)=>setOrigen(e.target.value as BaseId)} className="mt-1 w-full rounded bg-slate-800 p-2">{BASES.filter((b)=>b.id!=="deposito-ton").map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></label>
                    <label className="mb-3 block text-xs">Destino<select value={destino} onChange={(e)=>setDestino(e.target.value as BaseId)} className="mt-1 w-full rounded bg-slate-800 p-2">{BASES.filter((b)=>b.id!=="deposito-ton").map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></label>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <label className="block text-xs">Cantidad<input type="number" min="1" value={cantidad} onChange={(e)=>setCantidad(Number(e.target.value))} className="mt-1 w-full rounded bg-slate-800 p-2" /></label>
                      <label className="block text-xs">Velocidad plan (kt)<input type="number" min="0" value={velocidad} onChange={(e)=>setVelocidad(Number(e.target.value))} placeholder={factor?.velocidadPlanKt?.toString()??"TFP"} className="mt-1 w-full rounded bg-slate-800 p-2" /></label>
                    </div>
                    <div className="mb-4 rounded bg-slate-950 p-3 text-xs">
                      <p>Disponible en origen: <b>{disponiblesOrigen}</b></p>
                      <p>Distancia: <b>{n(distanciaKm,1)} km / {n(distanciaNm,1)} NM</b></p>
                      <p>Tiempo: <b>{tiempoHoras>0?`${n(tiempoHoras,2)} h`:"Cargar velocidad TFP"}</b></p>
                      <p>Combustible traslado: <b>{combustibleTraslado!=null?`${n(combustibleTraslado,0)} kg`:"Pendiente TFP combustible"}</b></p>
                    </div>
                    <button type="button" disabled={origen===destino || cantidad<=0 || cantidad>disponiblesOrigen} onClick={aplicarMovimiento} className="w-full rounded bg-emerald-700 px-3 py-2 font-black disabled:opacity-40">Aplicar movimiento</button>
                    <p className="mt-2 text-[10px] text-slate-500">El movimiento modifica la situación actual. La columna “Plan” queda inalterada.</p>
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <h2 className="mb-3 font-black">Historial</h2>
                    <div className="space-y-2">
                      {estado.movimientos.map((m)=>(
                        <div key={m.id} className="rounded bg-slate-950 p-3 text-xs">
                          <div className="flex justify-between gap-3"><b>{m.cantidad} × {m.sistema}</b><span className="text-slate-500">{new Date(m.fecha).toLocaleString("es-AR")}</span></div>
                          <p>{baseNombre(m.origen)} → {baseNombre(m.destino)}</p>
                          <p className="text-slate-400">{n(m.distanciaNm,1)} NM · {m.velocidadKt?`${n(m.tiempoHoras,2)} h @ ${m.velocidadKt} kt`:"tiempo pendiente"} · {m.combustibleKg!=null?`${n(m.combustibleKg)} kg combustible`:"combustible pendiente TFP"}</p>
                        </div>
                      ))}
                      {!estado.movimientos.length && <p className="text-xs text-slate-500">Todavía no se aplicaron movimientos. El dispositivo actual coincide con el Plan.</p>}
                    </div>
                  </section>
                </div>
              )}

              {tab==="combustible" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm">
                    <b className="text-amber-300">Criterio:</b> no se inventan consumos. La demanda se calcula únicamente cuando el factor combustible del sistema está cargado en TFP y existen horas planificadas para las próximas 72 h.
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <table className="w-full min-w-[900px] text-left text-xs">
                      <thead className="text-slate-400"><tr><th className="p-2">Base</th><th>Demanda 72 h</th><th>Sost. mín.</th><th>Ciclo reab.</th><th>Clase III A</th><th>Estado</th></tr></thead>
                      <tbody>{BASES.filter((b)=>b.id!=="deposito-ton").map((b)=>{
                        const val=consumo72PorBase[b.id]??0;
                        return <tr key={b.id} className="border-t border-slate-800"><td className="p-2 font-bold">{b.nombre}</td><td>{val?`${n(val)} kg`:"Pendiente"}</td><td>{b.sostenimientoMinDias} días</td><td>{b.cicloReabastecimientoDias} días</td><td>{b.cicloIIIADias} días</td><td className={val?"text-emerald-300":"text-amber-300"}>{val?"Calculado":"Faltan TFP/horas"}</td></tr>
                      })}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab==="armamento" && (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <table className="w-full min-w-[1100px] text-left text-xs">
                    <thead className="text-slate-400"><tr><th className="p-2">Familia</th><th>Munición</th><th>Plan</th><th>Disponible</th><th>Comprometido</th><th>Consumido</th><th>Remanente</th><th>Ubicación</th><th>Fuente</th></tr></thead>
                    <tbody>{estado.municion.map((m,i)=>{
                      const rem=m.disponible-m.comprometido-m.consumido;
                      return <tr key={m.id} className="border-t border-slate-800">
                        <td className="p-2">{m.familia}</td><td className="font-bold">{m.tipo}</td><td>{m.cantidadPlan}</td>
                        <td><input type="number" min="0" value={m.disponible} onChange={(e)=>updateMunicion(i,{disponible:Number(e.target.value)})} className="w-20 rounded bg-slate-800 p-1" /></td>
                        <td><input type="number" min="0" value={m.comprometido} onChange={(e)=>updateMunicion(i,{comprometido:Number(e.target.value)})} className="w-20 rounded bg-slate-800 p-1" /></td>
                        <td><input type="number" min="0" value={m.consumido} onChange={(e)=>updateMunicion(i,{consumido:Number(e.target.value)})} className="w-20 rounded bg-slate-800 p-1" /></td>
                        <td className={rem<0?"font-black text-red-300":"font-black text-emerald-300"}>{rem}</td>
                        <td><select value={m.base} onChange={(e)=>updateMunicion(i,{base:e.target.value as BaseId})} className="max-w-[180px] rounded bg-slate-800 p-1">{BASES.map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></td>
                        <td className="text-slate-500">{m.fuente}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              )}

              {tab==="tfp" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-cyan-900 bg-cyan-950/20 p-4 text-sm">
                    <b className="text-cyan-300">Base TFP editable.</b> TFP (1) es la fuente maestra. El único valor precargado fuera de ese documento es 3,5 pilotos/avión para sistemas tripulados de combate, identificado como referencia doctrinaria PPC. Los consumos y velocidades quedan vacíos hasta incorporar TFP (1) o una fuente complementaria identificada.
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <table className="w-full min-w-[1200px] text-left text-xs">
                      <thead className="text-slate-400"><tr><th className="p-2">Sistema</th><th>Pilotos/aeronave</th><th>Combustible kg/h</th><th>Velocidad plan kt</th><th>HH mant./HV</th><th>Horas próx. 72h</th><th>Fuente</th></tr></thead>
                      <tbody>{estado.tfp.map((f,i)=><tr key={f.sistema} className="border-t border-slate-800">
                        <td className="p-2 font-bold">{f.sistema}</td>
                        <td><input type="number" step="0.1" value={f.pilotosPorAeronave??""} onChange={(e)=>updateTfp(i,{pilotosPorAeronave:e.target.value===""?null:Number(e.target.value)})} className="w-24 rounded bg-slate-800 p-1" /></td>
                        <td><input type="number" value={f.combustibleKgHora??""} onChange={(e)=>updateTfp(i,{combustibleKgHora:e.target.value===""?null:Number(e.target.value)})} className="w-28 rounded bg-slate-800 p-1" /></td>
                        <td><input type="number" value={f.velocidadPlanKt??""} onChange={(e)=>updateTfp(i,{velocidadPlanKt:e.target.value===""?null:Number(e.target.value)})} className="w-24 rounded bg-slate-800 p-1" /></td>
                        <td><input type="number" step="0.1" value={f.hhMantenimientoPorHV??""} onChange={(e)=>updateTfp(i,{hhMantenimientoPorHV:e.target.value===""?null:Number(e.target.value)})} className="w-24 rounded bg-slate-800 p-1" /></td>
                        <td><input type="number" step="0.1" min="0" value={f.horasPlanificadas72} onChange={(e)=>updateTfp(i,{horasPlanificadas72:Number(e.target.value)})} className="w-24 rounded bg-slate-800 p-1" /></td>
                        <td><input value={f.fuente} onChange={(e)=>updateTfp(i,{fuente:e.target.value})} className="min-w-[340px] rounded bg-slate-800 p-1" /></td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab==="alertas" && (
                <div className="space-y-2">
                  {alertas.map((a,i)=><div key={i} className="rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">⚠ {a}</div>)}
                  {!alertas.length && <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-200">Sin alertas logísticas activas.</div>}
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
