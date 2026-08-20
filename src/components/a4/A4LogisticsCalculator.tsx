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
  | "rio-cuarto"
  | "realico"
  | "san-rafael";

type Esfuerzo = "ERC" | "MESC" | "MEIC";
type Tab = "situacion" | "movimientos" | "armamento" | "tfp" | "deficits" | "historial";

type Periodo = {
  id: string;
  fase: string;
  momento: string;
  ventana: string;
  esfuerzo: Esfuerzo;
};

type BaseInicial = {
  id: BaseId;
  nombre: string;
  personalInicial: number | null;
  capacidadAlojamiento: number | null;
  infraestructura?: string[];
};

type MedioInicial = {
  id: string;
  sistema: string;
  base: BaseId;
  cantidad: number;
  detalle?: string;
};

type ArmamentoInicial = {
  id: string;
  nombre: string;
  familia: string;
  cantidad: number;
  ubicacion: "reserva-ton" | BaseId;
};

type MaterialInicial = {
  id: string;
  nombre: string;
  cantidad: number;
  ubicacion: BaseId | "reserva-ton";
  unidad: string;
};

type TfpPersonal = {
  sistema: string;
  meic4: number;
  mesc4: number;
  erc4: number;
};

type Movimiento = {
  id: string;
  periodoId: string;
  tipo: "medio" | "armamento" | "material" | "personal";
  itemId: string;
  descripcion: string;
  origen: BaseId | "reserva-ton";
  destino: BaseId | "reserva-ton";
  cantidad: number;
  personalTfpMovido: number;
  aplicado: boolean;
  fecha?: string;
  predefinido?: boolean;
};

type PlanGuardado = {
  nombre: string;
  periodoActivo: string;
  movimientos: Movimiento[];
};

const STORAGE_INDEX = "zeus-a4-v6-index";
const STORAGE_PREFIX = "zeus-a4-v6-plan:";

const PERIODOS: Periodo[] = [
  { id:"f1m1", fase:"FASE I · PREPARACIÓN", momento:"Momento 1 · Concepción", ventana:"Antes de M", esfuerzo:"ERC" },
  { id:"f1m2-despl", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Despliegue", ventana:"M+1 a M+4", esfuerzo:"ERC" },
  { id:"f1m2-arm", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Abastecimiento", ventana:"M+5 a M+7", esfuerzo:"ERC" },
  { id:"f1m2-adies", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Adiestramiento", ventana:"M+8 a M+40", esfuerzo:"ERC" },
  { id:"f1m2-comp", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Comprobación", ventana:"M+41 a M+45", esfuerzo:"ERC" },
  { id:"f1m3", fase:"FASE I · PREPARACIÓN", momento:"Momento 3 · Alerta", ventana:"A a D", esfuerzo:"MESC" },
  { id:"f2", fase:"FASE II · TOMAR LA INICIATIVA", momento:"Operaciones", ventana:"D a D+1", esfuerzo:"MEIC" },
  { id:"f3", fase:"FASE III · DOMINAR", momento:"Operaciones", ventana:"D+2 a D+9", esfuerzo:"MESC" },
  { id:"f4", fase:"ESTABILIZACIÓN", momento:"Repliegue", ventana:"D+10 en adelante", esfuerzo:"ERC" },
];

const BASES: BaseInicial[] = [
  { id:"la-rioja", nombre:"1ª B.A. · La Rioja", personalInicial:1305, capacidadAlojamiento:1500 },
  { id:"villa-mercedes", nombre:"2ª B.A. · Villa Mercedes", personalInicial:1293, capacidadAlojamiento:1500 },
  { id:"cordoba", nombre:"3ª B.A. · Córdoba", personalInicial:1201, capacidadAlojamiento:1500 },
  { id:"mendoza", nombre:"4ª B.A. · Mendoza", personalInicial:652, capacidadAlojamiento:1000 },
  { id:"gral-acha", nombre:"5ª B.A. · Gral. Acha", personalInicial:840, capacidadAlojamiento:1000 },
  { id:"malargue", nombre:"B.A.M. · Malargüe", personalInicial:711, capacidadAlojamiento:1000 },
  { id:"san-luis", nombre:"Grupo 1 COM · San Luis", personalInicial:149, capacidadAlojamiento:500 },
  { id:"rio-cuarto", nombre:"COAe · Río Cuarto", personalInicial:null, capacidadAlojamiento:null },
  { id:"realico", nombre:"A.M. · Realicó", personalInicial:null, capacidadAlojamiento:null },
  { id:"san-rafael", nombre:"A.M. · San Rafael", personalInicial:null, capacidadAlojamiento:null },
];

const MEDIOS: MedioInicial[] = [
  { id:"lr-c130j", sistema:"C-130J", base:"la-rioja", cantidad:10 },
  { id:"lr-kc130j", sistema:"KC-130J", base:"la-rioja", cantidad:4 },
  { id:"lr-lj60", sistema:"Learjet 60", base:"la-rioja", cantidad:3 },
  { id:"lr-dhc6", sistema:"DHC6-400", base:"la-rioja", cantidad:4 },
  { id:"lr-b412", sistema:"B-412", base:"la-rioja", cantidad:4 },
  { id:"lr-uh1y", sistema:"UH-1Y", base:"la-rioja", cantidad:4 },
  { id:"lr-nasams", sistema:"NASAMS", base:"la-rioja", cantidad:1 },
  { id:"lr-skyguard", sistema:"Oerlikon Skyguard", base:"la-rioja", cantidad:1 },
  { id:"lr-rbs70", sistema:"RBS-70", base:"la-rioja", cantidad:1, detalle:"Cantidad de sistema no individualizada en CHARLIE; se registra presencia." },
  { id:"lr-tps77", sistema:"TPS-77", base:"la-rioja", cantidad:1 },

  { id:"vm-f16c", sistema:"F-16C Block 40", base:"villa-mercedes", cantidad:20 },
  { id:"vm-amx", sistema:"AMX A-1M", base:"villa-mercedes", cantidad:12 },
  { id:"vm-t6", sistema:"T-6 Texan II", base:"villa-mercedes", cantidad:12 },
  { id:"vm-hermes", sistema:"Hermes 450", base:"villa-mercedes", cantidad:3 },
  { id:"vm-b412", sistema:"B-412", base:"villa-mercedes", cantidad:4 },
  { id:"vm-uh1y", sistema:"UH-1Y", base:"villa-mercedes", cantidad:4 },
  { id:"vm-dhc6", sistema:"DHC6-400", base:"villa-mercedes", cantidad:4 },
  { id:"vm-nasams", sistema:"NASAMS", base:"villa-mercedes", cantidad:2 },
  { id:"vm-skyguard", sistema:"Oerlikon Skyguard", base:"villa-mercedes", cantidad:1 },
  { id:"vm-rbs70", sistema:"RBS-70", base:"villa-mercedes", cantidad:1, detalle:"Cantidad de sistema no individualizada en CHARLIE; se registra presencia." },
  { id:"vm-tps77", sistema:"TPS-77", base:"villa-mercedes", cantidad:1 },

  { id:"cba-amx", sistema:"AMX A-1M", base:"cordoba", cantidad:12 },
  { id:"cba-t6", sistema:"T-6 Texan II", base:"cordoba", cantidad:12 },
  { id:"cba-e99", sistema:"E-99M", base:"cordoba", cantidad:3 },
  { id:"cba-b412", sistema:"B-412", base:"cordoba", cantidad:2 },
  { id:"cba-uh1y", sistema:"UH-1Y", base:"cordoba", cantidad:4 },
  { id:"cba-kc135", sistema:"KC-135", base:"cordoba", cantidad:3 },
  { id:"cba-ch47", sistema:"CH-47F", base:"cordoba", cantidad:6 },
  { id:"cba-patriot", sistema:"Patriot", base:"cordoba", cantidad:1 },
  { id:"cba-skyguard", sistema:"Oerlikon Skyguard", base:"cordoba", cantidad:1 },
  { id:"cba-rbs70", sistema:"RBS-70", base:"cordoba", cantidad:1, detalle:"Cantidad de sistema no individualizada en CHARLIE; se registra presencia." },
  { id:"cba-tps77", sistema:"TPS-77", base:"cordoba", cantidad:1 },

  { id:"mdz-f16c", sistema:"F-16C Block 40", base:"mendoza", cantidad:14 },
  { id:"mdz-f16d", sistema:"F-16D Block 42", base:"mendoza", cantidad:6 },
  { id:"mdz-dhc6", sistema:"DHC6-400", base:"mendoza", cantidad:4 },
  { id:"mdz-kc135", sistema:"KC-135", base:"mendoza", cantidad:3 },
  { id:"mdz-b412", sistema:"B-412", base:"mendoza", cantidad:2 },
  { id:"mdz-uh1y", sistema:"UH-1Y", base:"mendoza", cantidad:4 },
  { id:"mdz-patriot", sistema:"Patriot", base:"mendoza", cantidad:1 },
  { id:"mdz-skyguard", sistema:"Oerlikon Skyguard", base:"mendoza", cantidad:1 },
  { id:"mdz-rbs70", sistema:"RBS-70", base:"mendoza", cantidad:1, detalle:"Cantidad de sistema no individualizada en CHARLIE; se registra presencia." },

  { id:"ga-f16cj", sistema:"F-16CJ Block 50", base:"gral-acha", cantidad:10 },
  { id:"ga-harpy", sistema:"IAI Harpy", base:"gral-acha", cantidad:36 },
  { id:"ga-lj60", sistema:"Learjet 60", base:"gral-acha", cantidad:3 },
  { id:"ga-hermes", sistema:"Hermes 450", base:"gral-acha", cantidad:3 },
  { id:"ga-ec130", sistema:"EC-130H", base:"gral-acha", cantidad:2 },
  { id:"ga-b412", sistema:"B-412", base:"gral-acha", cantidad:2 },
  { id:"ga-ch47", sistema:"CH-47F", base:"gral-acha", cantidad:6 },
  { id:"ga-nasams", sistema:"NASAMS", base:"gral-acha", cantidad:1 },
  { id:"ga-skyguard", sistema:"Oerlikon Skyguard", base:"gral-acha", cantidad:1 },
  { id:"ga-rbs70", sistema:"RBS-70", base:"gral-acha", cantidad:1, detalle:"Cantidad de sistema no individualizada en CHARLIE; se registra presencia." },
  { id:"ga-gm400", sistema:"GM400A", base:"gral-acha", cantidad:1 },

  { id:"mal-nasams", sistema:"NASAMS", base:"malargue", cantidad:2 },
  { id:"mal-skyguard", sistema:"Oerlikon Skyguard", base:"malargue", cantidad:1 },
  { id:"mal-rbs70", sistema:"RBS-70", base:"malargue", cantidad:1, detalle:"Cantidad de sistema no individualizada en CHARLIE; se registra presencia." },
  { id:"mal-coae", sistema:"COAe alternativo", base:"malargue", cantidad:1 },
  { id:"mal-com", sistema:"Grupo 2 COM", base:"malargue", cantidad:1 },
];

const ARMAMENTO: ArmamentoInicial[] = [
  { id:"f16-gbu10", nombre:"GBU-10 Paveway II", familia:"F-16", cantidad:48, ubicacion:"reserva-ton" },
  { id:"f16-gbu12", nombre:"GBU-12 Paveway II", familia:"F-16", cantidad:48, ubicacion:"reserva-ton" },
  { id:"f16-gbu38", nombre:"GBU-38 JDAM", familia:"F-16", cantidad:78, ubicacion:"reserva-ton" },
  { id:"f16-aim9", nombre:"AIM-9M Sidewinder", familia:"F-16", cantidad:180, ubicacion:"reserva-ton" },
  { id:"f16-aim120", nombre:"AIM-120C-5 AMRAAM", familia:"F-16", cantidad:240, ubicacion:"reserva-ton" },
  { id:"f16-aim7", nombre:"AIM-7P Sparrow", familia:"F-16", cantidad:220, ubicacion:"reserva-ton" },
  { id:"f16-agm65", nombre:"AGM-65G Maverick", familia:"F-16", cantidad:120, ubicacion:"reserva-ton" },
  { id:"f16-agm88", nombre:"AGM-88C HARM", familia:"F-16", cantidad:140, ubicacion:"reserva-ton" },
  { id:"amx-gbu10", nombre:"GBU-10 Paveway II", familia:"AMX", cantidad:48, ubicacion:"reserva-ton" },
  { id:"amx-gbu12", nombre:"GBU-12 Paveway II", familia:"AMX", cantidad:48, ubicacion:"reserva-ton" },
  { id:"amx-gbu16", nombre:"GBU-16 Paveway II", familia:"AMX", cantidad:48, ubicacion:"reserva-ton" },
  { id:"amx-mar1", nombre:"MAR-1", familia:"AMX", cantidad:96, ubicacion:"reserva-ton" },
  { id:"amx-aim9", nombre:"AIM-9M Sidewinder", familia:"AMX", cantidad:140, ubicacion:"reserva-ton" },
  { id:"t6-mk81", nombre:"Mk 81", familia:"T-6", cantidad:180, ubicacion:"reserva-ton" },
  { id:"t6-mk82", nombre:"Mk 82", familia:"T-6", cantidad:180, ubicacion:"reserva-ton" },
  { id:"t6-gbu12", nombre:"GBU-12 Paveway II", familia:"T-6", cantidad:48, ubicacion:"reserva-ton" },
  { id:"harpy", nombre:"IAI Harpy", familia:"UCAV", cantidad:36, ubicacion:"gral-acha" },
];

const MATERIAL: MaterialInicial[] = [
  { id:"carros-bomba", nombre:"Carros de bombas", cantidad:50, ubicacion:"realico", unidad:"unidades" },
];

const TFP_PERSONAL: TfpPersonal[] = [
  { sistema:"F-16C Block 40", meic4:56, mesc4:46, erc4:24 },
  { sistema:"F-16D Block 42", meic4:56, mesc4:46, erc4:24 },
  { sistema:"F-16CJ Block 50", meic4:56, mesc4:46, erc4:24 },
  { sistema:"AMX A-1M", meic4:56, mesc4:46, erc4:24 },
  { sistema:"T-6 Texan II", meic4:26, mesc4:26, erc4:14 },
  { sistema:"IAI Harpy", meic4:10, mesc4:10, erc4:6 },
  { sistema:"EC-130H", meic4:18, mesc4:18, erc4:10 },
  { sistema:"E-99M", meic4:18, mesc4:18, erc4:10 },
  { sistema:"Hermes 450", meic4:18, mesc4:18, erc4:10 },
  { sistema:"C-130J", meic4:26, mesc4:20, erc4:10 },
  { sistema:"KC-130J", meic4:26, mesc4:20, erc4:10 },
  { sistema:"KC-135", meic4:26, mesc4:20, erc4:10 },
  { sistema:"Learjet 60", meic4:18, mesc4:18, erc4:10 },
  { sistema:"DHC6-400", meic4:14, mesc4:10, erc4:10 },
  { sistema:"CH-47F", meic4:14, mesc4:10, erc4:10 },
  { sistema:"UH-1Y", meic4:14, mesc4:10, erc4:10 },
  { sistema:"B-412", meic4:14, mesc4:10, erc4:10 },
];

const MOVIMIENTOS_PREVISTOS: Movimiento[] = [
  { id:"prev-f16cj", periodoId:"f1m2-despl", tipo:"medio", itemId:"F-16CJ Block 50", descripcion:"10 F-16CJ · Gral. Acha → Córdoba", origen:"gral-acha", destino:"cordoba", cantidad:10, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-e99", periodoId:"f1m2-despl", tipo:"medio", itemId:"E-99M", descripcion:"3 E-99M · Córdoba → Villa Mercedes", origen:"cordoba", destino:"villa-mercedes", cantidad:3, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-kc130", periodoId:"f1m2-despl", tipo:"medio", itemId:"KC-130J", descripcion:"4 KC-130J · La Rioja → Villa Mercedes", origen:"la-rioja", destino:"villa-mercedes", cantidad:4, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-c130-mdz", periodoId:"f1m2-despl", tipo:"medio", itemId:"C-130J", descripcion:"3 C-130J · La Rioja → Mendoza", origen:"la-rioja", destino:"mendoza", cantidad:3, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-c130-ga", periodoId:"f1m2-despl", tipo:"medio", itemId:"C-130J", descripcion:"4 C-130J · La Rioja → Gral. Acha", origen:"la-rioja", destino:"gral-acha", cantidad:4, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-c130-cba", periodoId:"f1m2-despl", tipo:"medio", itemId:"C-130J", descripcion:"3 C-130J · La Rioja → Córdoba", origen:"la-rioja", destino:"cordoba", cantidad:3, personalTfpMovido:0, aplicado:false, predefinido:true },

  { id:"prev-harm", periodoId:"f1m2-arm", tipo:"armamento", itemId:"f16-agm88", descripcion:"4 AGM-88C HARM · Reserva TON → Córdoba", origen:"reserva-ton", destino:"cordoba", cantidad:4, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-mar1", periodoId:"f1m2-arm", tipo:"armamento", itemId:"amx-mar1", descripcion:"6 MAR-1 · Reserva TON → Córdoba", origen:"reserva-ton", destino:"cordoba", cantidad:6, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-gbu10-cba", periodoId:"f1m2-arm", tipo:"armamento", itemId:"f16-gbu10", descripcion:"34 GBU-10 F-16 · Reserva TON → Córdoba", origen:"reserva-ton", destino:"cordoba", cantidad:34, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-amraam", periodoId:"f1m2-arm", tipo:"armamento", itemId:"f16-aim120", descripcion:"24 AIM-120C-5 · Reserva TON → Villa Mercedes", origen:"reserva-ton", destino:"villa-mercedes", cantidad:24, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-gbu10-mdz", periodoId:"f1m2-arm", tipo:"armamento", itemId:"f16-gbu10", descripcion:"16 GBU-10 F-16 · Reserva TON → Mendoza", origen:"reserva-ton", destino:"mendoza", cantidad:16, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-gbu12-mdz", periodoId:"f1m2-arm", tipo:"armamento", itemId:"f16-gbu12", descripcion:"6 GBU-12 F-16 · Reserva TON → Mendoza", origen:"reserva-ton", destino:"mendoza", cantidad:6, personalTfpMovido:0, aplicado:false, predefinido:true },
  { id:"prev-carros", periodoId:"f1m2-arm", tipo:"material", itemId:"carros-bomba", descripcion:"50 carros de bombas · Realicó → Villa Mercedes", origen:"realico", destino:"villa-mercedes", cantidad:50, personalTfpMovido:0, aplicado:false, predefinido:true },
];

const PLAN_BASE: PlanGuardado = {
  nombre:"A4 · Situación inicial del Plan",
  periodoActivo:"f1m1",
  movimientos:MOVIMIENTOS_PREVISTOS,
};

function clone<T>(v:T):T {
  return JSON.parse(JSON.stringify(v));
}

function fmt(v:number) {
  return new Intl.NumberFormat("es-AR",{maximumFractionDigits:0}).format(v);
}

function nombreLugar(id:BaseId|"reserva-ton") {
  if(id==="reserva-ton") return "Reserva TON";
  return BASES.find((b)=>b.id===id)?.nombre ?? id;
}

function tfpPorEsfuerzo(sistema:string, esfuerzo:Esfuerzo) {
  const t=TFP_PERSONAL.find((x)=>x.sistema===sistema);
  if(!t) return null;
  return esfuerzo==="MEIC"?t.meic4:esfuerzo==="MESC"?t.mesc4:t.erc4;
}

function personalTfpRequerido(sistema:string,cantidad:number,esfuerzo:Esfuerzo) {
  const factor=tfpPorEsfuerzo(sistema,esfuerzo);
  if(factor==null) return null;
  return Math.ceil((factor*cantidad)/4);
}

export default function A4LogisticsCalculator() {
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState<Tab>("situacion");
  const [plan,setPlan]=useState<PlanGuardado>(clone(PLAN_BASE));
  const [planes,setPlanes]=useState<string[]>([]);
  const [moverPersonalTfp,setMoverPersonalTfp]=useState(true);

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

  const periodo=PERIODOS.find((p)=>p.id===plan.periodoActivo)??PERIODOS[0];
  const aplicados=plan.movimientos.filter((m)=>m.aplicado);

  const mediosActuales=useMemo(()=>{
    const result=new Map<string,Record<BaseId,number>>();
    for(const m of MEDIOS){
      if(!result.has(m.sistema))result.set(m.sistema,{} as Record<BaseId,number>);
      const row=result.get(m.sistema)!;
      row[m.base]=(row[m.base]||0)+m.cantidad;
    }
    for(const mv of aplicados.filter((m)=>m.tipo==="medio")){
      const row=result.get(mv.itemId)||({} as Record<BaseId,number>);
      if(mv.origen!=="reserva-ton")row[mv.origen]=(row[mv.origen]||0)-mv.cantidad;
      if(mv.destino!=="reserva-ton")row[mv.destino]=(row[mv.destino]||0)+mv.cantidad;
      result.set(mv.itemId,row);
    }
    return result;
  },[aplicados]);

  const personalActual=useMemo(()=>{
    const result:Record<BaseId,number|null>={} as Record<BaseId,number|null>;
    for(const b of BASES)result[b.id]=b.personalInicial;
    for(const mv of aplicados){
      if(mv.personalTfpMovido<=0)continue;
      if(mv.origen!=="reserva-ton" && result[mv.origen]!=null)result[mv.origen]=(result[mv.origen] as number)-mv.personalTfpMovido;
      if(mv.destino!=="reserva-ton" && result[mv.destino]!=null)result[mv.destino]=(result[mv.destino] as number)+mv.personalTfpMovido;
    }
    return result;
  },[aplicados]);

  const armamentoActual=useMemo(()=>{
    const out=new Map<string,Record<string,number>>();
    for(const a of ARMAMENTO){
      out.set(a.id,{[a.ubicacion]:a.cantidad});
    }
    for(const mv of aplicados.filter((m)=>m.tipo==="armamento")){
      const row=out.get(mv.itemId)||{};
      row[mv.origen]=(row[mv.origen]||0)-mv.cantidad;
      row[mv.destino]=(row[mv.destino]||0)+mv.cantidad;
      out.set(mv.itemId,row);
    }
    return out;
  },[aplicados]);

  const materialActual=useMemo(()=>{
    const out=new Map<string,Record<string,number>>();
    for(const m of MATERIAL)out.set(m.id,{[m.ubicacion]:m.cantidad});
    for(const mv of aplicados.filter((m)=>m.tipo==="material")){
      const row=out.get(mv.itemId)||{};
      row[mv.origen]=(row[mv.origen]||0)-mv.cantidad;
      row[mv.destino]=(row[mv.destino]||0)+mv.cantidad;
      out.set(mv.itemId,row);
    }
    return out;
  },[aplicados]);

  const deficits=useMemo(()=>{
    const a:string[]=[];

    for(const b of BASES){
      const pers=personalActual[b.id];
      if(pers!=null && b.capacidadAlojamiento!=null && pers>b.capacidadAlojamiento){
        a.push(`${b.nombre}: faltan ${fmt(pers-b.capacidadAlojamiento)} plazas de alojamiento.`);
      }
    }

    const gbu10=armamentoActual.get("f16-gbu10")?.["reserva-ton"]??0;
    const gbu10Aplicado=aplicados.filter((m)=>m.tipo==="armamento"&&m.itemId==="f16-gbu10").reduce((s,m)=>s+m.cantidad,0);
    const gbu10Pendiente=plan.movimientos.filter((m)=>!m.aplicado&&m.tipo==="armamento"&&m.itemId==="f16-gbu10").reduce((s,m)=>s+m.cantidad,0);
    if(gbu10Aplicado+gbu10Pendiente>48){
      a.push(`GBU-10 para F-16: el MMA Nº2 prevé 50 y el inventario inicial confirmado es 48. Déficit previsto: 2 unidades.`);
    }

    for(const mv of plan.movimientos.filter((m)=>!m.aplicado)){
      if(mv.tipo==="medio" && mv.origen!=="reserva-ton"){
        const disponible=mediosActuales.get(mv.itemId)?.[mv.origen]||0;
        if(disponible<mv.cantidad)a.push(`${mv.descripcion}: no hay cantidad suficiente en el origen.`);
      }
      if(mv.tipo==="armamento"){
        const disponible=armamentoActual.get(mv.itemId)?.[mv.origen]||0;
        if(disponible<mv.cantidad)a.push(`${mv.descripcion}: faltan ${fmt(mv.cantidad-disponible)} unidades en el origen.`);
      }
      if(mv.tipo==="material"){
        const disponible=materialActual.get(mv.itemId)?.[mv.origen]||0;
        if(disponible<mv.cantidad)a.push(`${mv.descripcion}: faltan ${fmt(mv.cantidad-disponible)} unidades en el origen.`);
      }
    }
    return Array.from(new Set(a));
  },[plan.movimientos,aplicados,mediosActuales,armamentoActual,materialActual,personalActual]);

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
    const n=window.prompt("Nombre del nuevo planeamiento","A4 · Nuevo planeamiento");
    if(!n)return;
    const next=clone(PLAN_BASE);
    next.nombre=n;
    setPlan(next);
    localStorage.setItem(`${STORAGE_PREFIX}${n}`,JSON.stringify(next));
    localStorage.setItem(`${STORAGE_PREFIX}__ultimo`,n);
    const idx=Array.from(new Set([...planes,n]));
    localStorage.setItem(STORAGE_INDEX,JSON.stringify(idx));
    setPlanes(idx);
  }

  function abrir(nombre:string){
    const raw=localStorage.getItem(`${STORAGE_PREFIX}${nombre}`);
    if(raw){
      setPlan(JSON.parse(raw));
      localStorage.setItem(`${STORAGE_PREFIX}__ultimo`,nombre);
    }
  }

  function guardarComo(){
    const n=window.prompt("Guardar como",`${plan.nombre} copia`);
    if(n)guardar(n);
  }

  function restablecer(){
    if(!window.confirm("¿Volver a la situación inicial y dejar todos los movimientos como pendientes?"))return;
    setPlan((p)=>({...clone(PLAN_BASE),nombre:p.nombre}));
  }

  function aplicarMovimiento(id:string){
    setPlan((p)=>({
      ...p,
      movimientos:p.movimientos.map((m)=>{
        if(m.id!==id||m.aplicado)return m;
        let personal=0;
        if(m.tipo==="medio"&&moverPersonalTfp){
          personal=personalTfpRequerido(m.itemId,m.cantidad,periodo.esfuerzo)??0;
        }
        return {...m,aplicado:true,personalTfpMovido:personal,fecha:new Date().toISOString()};
      })
    }));
  }

  function deshacerMovimiento(id:string){
    setPlan((p)=>({
      ...p,
      movimientos:p.movimientos.map((m)=>m.id===id?{...m,aplicado:false,personalTfpMovido:0,fecha:undefined}:m)
    }));
  }

  function mediosEnBase(base:BaseId){
    return Array.from(mediosActuales.entries())
      .map(([s,dist])=>({s,c:dist[base]||0}))
      .filter((x)=>x.c>0)
      .sort((a,b)=>a.s.localeCompare(b.s));
  }

  function armamentoEnLugar(lugar:BaseId|"reserva-ton"){
    return ARMAMENTO.map((a)=>({a,c:armamentoActual.get(a.id)?.[lugar]||0})).filter((x)=>x.c>0);
  }

  function materialEnLugar(lugar:BaseId|"reserva-ton"){
    return MATERIAL.map((m)=>({m,c:materialActual.get(m.id)?.[lugar]||0})).filter((x)=>x.c>0);
  }

  const tabs:[Tab,string][]=[
    ["situacion","Situación"],["movimientos","Movimientos"],["armamento","Armamento / Material"],
    ["tfp","TFP simplificada"],["deficits","Déficits"],["historial","Historial"]
  ];

  return (
    <>
      <section className="mb-5 rounded-lg border border-emerald-700 bg-emerald-950/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">A4 · ZEUS II</p>
            <h2 className="font-bold text-white">Situación logística viva</h2>
            <p className="mt-1 text-xs text-slate-400">Parte del dispositivo inicial documentado y descuenta/suma automáticamente cada movimiento aplicado.</p>
          </div>
          <button onClick={()=>setOpen(true)} className="rounded bg-emerald-700 px-4 py-2 text-sm font-black text-white">Abrir</button>
        </div>
      </section>

      {open&&(
        <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950 text-white">
          <header className="border-b border-slate-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[.2em] text-emerald-300">ZEUS II · A4</p>
                <h1 className="text-xl font-black">{plan.nombre}</h1>
                <p className="text-xs text-slate-400">Situación inicial → movimientos → situación resultante</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={nuevo} className="rounded bg-slate-800 px-3 py-2 text-xs">Nuevo</button>
                <button onClick={()=>guardar()} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold">Guardar</button>
                <button onClick={guardarComo} className="rounded bg-slate-800 px-3 py-2 text-xs">Guardar como</button>
                <select value={plan.nombre} onChange={(e)=>abrir(e.target.value)} className="max-w-[230px] rounded bg-slate-800 px-3 py-2 text-xs">
                  <option>{plan.nombre}</option>
                  {planes.filter((x)=>x!==plan.nombre).map((x)=><option key={x}>{x}</option>)}
                </select>
                <button onClick={restablecer} className="rounded border border-amber-700 px-3 py-2 text-xs text-amber-200">Volver al inicio</button>
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
          </div>

          <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 px-4 py-2">
            {tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`rounded px-3 py-2 text-xs font-bold ${tab===id?"bg-emerald-700":"bg-slate-900 text-slate-300"}`}>{label}</button>)}
          </nav>

          <main className="min-h-0 flex-1 overflow-auto p-4">
            {tab==="situacion"&&(
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-900 bg-cyan-950/20 p-4 text-sm">
                  <b className="text-cyan-300">Cómo leer esta pantalla:</b> los valores grandes son la situación actual. Al inicio coinciden con los documentos. Cuando aplicás un movimiento, el origen disminuye y el destino aumenta. La situación inicial nunca se borra y puede recuperarse con “Volver al inicio”.
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {BASES.map((b)=>{
                    const pers=personalActual[b.id];
                    const libres=pers!=null&&b.capacidadAlojamiento!=null?b.capacidadAlojamiento-pers:null;
                    const meds=mediosEnBase(b.id);
                    const arms=armamentoEnLugar(b.id);
                    const mats=materialEnLugar(b.id);
                    return <section key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><h2 className="font-black">{b.nombre}</h2><p className="text-[11px] text-slate-500">Situación actual derivada de la situación inicial</p></div>
                        {libres!=null&&<span className={`rounded px-2 py-1 text-[10px] font-bold ${libres<0?"bg-red-950 text-red-300":"bg-emerald-950 text-emerald-300"}`}>{libres<0?`Déficit alojamiento: ${fmt(Math.abs(libres))}`:`Plazas disponibles: ${fmt(libres)}`}</span>}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
                        {pers!=null&&<div className="rounded bg-slate-950 p-2"><span className="text-slate-500">Personal actual</span><b className="block text-lg">{fmt(pers)}</b><span className="text-[10px] text-slate-600">Inicial: {fmt(b.personalInicial as number)}</span></div>}
                        {b.capacidadAlojamiento!=null&&<div className="rounded bg-slate-950 p-2"><span className="text-slate-500">Alojamiento</span><b className="block text-lg">{fmt(b.capacidadAlojamiento)}</b></div>}
                        <div className="rounded bg-slate-950 p-2"><span className="text-slate-500">Medios registrados</span><b className="block text-lg">{meds.reduce((s,x)=>s+x.c,0)}</b></div>
                      </div>

                      {meds.length>0&&<div className="mt-3"><h3 className="mb-1 text-xs font-black text-emerald-300">Medios</h3><div className="grid gap-1 sm:grid-cols-2">{meds.map((x)=><div key={x.s} className="flex justify-between rounded bg-slate-950 px-3 py-2 text-xs"><span>{x.s}</span><b>{x.c}</b></div>)}</div></div>}
                      {arms.length>0&&<div className="mt-3"><h3 className="mb-1 text-xs font-black text-amber-300">Armamento presente</h3>{arms.map(({a,c})=><div key={a.id} className="flex justify-between rounded bg-slate-950 px-3 py-2 text-xs"><span>{a.nombre} · {a.familia}</span><b>{c}</b></div>)}</div>}
                      {mats.length>0&&<div className="mt-3"><h3 className="mb-1 text-xs font-black text-cyan-300">Material</h3>{mats.map(({m,c})=><div key={m.id} className="flex justify-between rounded bg-slate-950 px-3 py-2 text-xs"><span>{m.nombre}</span><b>{c} {m.unidad}</b></div>)}</div>}
                    </section>;
                  })}
                </div>
              </div>
            )}

            {tab==="movimientos"&&(
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h2 className="font-black">Movimientos previstos para {periodo.ventana}</h2><p className="text-xs text-slate-500">Están cargados como pendientes. No modifican nada hasta que presiones “Aplicar”.</p></div>
                    <label className="flex items-center gap-2 rounded bg-slate-950 px-3 py-2 text-xs"><input type="checkbox" checked={moverPersonalTfp} onChange={(e)=>setMoverPersonalTfp(e.target.checked)}/> Mover también el personal técnico recomendado por TFP</label>
                  </div>
                </div>

                {plan.movimientos.filter((m)=>m.periodoId===plan.periodoActivo).map((m)=>{
                  const sugerido=m.tipo==="medio"?personalTfpRequerido(m.itemId,m.cantidad,periodo.esfuerzo):null;
                  return <section key={m.id} className={`rounded-xl border p-4 ${m.aplicado?"border-emerald-800 bg-emerald-950/10":"border-slate-800 bg-slate-900"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><b>{m.descripcion}</b><p className="mt-1 text-xs text-slate-500">{m.aplicado?"APLICADO · ya modifica la situación actual":"PENDIENTE · todavía no modifica la situación"}</p></div>
                      {m.aplicado?<button onClick={()=>deshacerMovimiento(m.id)} className="rounded border border-amber-700 px-3 py-2 text-xs text-amber-200">Deshacer</button>:<button onClick={()=>aplicarMovimiento(m.id)} className="rounded bg-emerald-700 px-3 py-2 text-xs font-black">Aplicar</button>}
                    </div>
                    {sugerido!=null&&<div className="mt-3 rounded bg-slate-950 p-3 text-xs">
                      <span className="text-slate-500">Personal técnico recomendado por TFP para {m.cantidad} {m.itemId} en esfuerzo {periodo.esfuerzo}:</span>
                      <b className="ml-2 text-lg text-cyan-300">{sugerido}</b>
                      <p className="mt-1 text-[10px] text-slate-600">Se calcula proporcionalmente desde el valor TFP definido para 4 aeronaves y se redondea hacia arriba. No se muestran “grupos TFP”.</p>
                    </div>}
                    {m.aplicado&&m.personalTfpMovido>0&&<p className="mt-2 text-xs text-emerald-300">También se trasladaron {m.personalTfpMovido} personas técnicas del origen al destino.</p>}
                  </section>;
                })}

                {!plan.movimientos.some((m)=>m.periodoId===plan.periodoActivo)&&<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">No hay movimientos previstos cargados para este momento.</div>}
              </div>
            )}

            {tab==="armamento"&&(
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black">Reserva TON · armamento no distribuido</h2>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {armamentoEnLugar("reserva-ton").map(({a,c})=><div key={a.id} className="rounded bg-slate-950 p-3 text-xs"><span>{a.nombre}</span><span className="ml-2 text-slate-500">{a.familia}</span><b className="block text-xl">{c}</b><span className="text-[10px] text-slate-600">Inicial: {a.cantidad}</span></div>)}
                  </div>
                </section>
                <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black">Material con ubicación inicial conocida</h2>
                  {MATERIAL.map((m)=>{
                    const lugares=materialActual.get(m.id)||{};
                    return <div key={m.id} className="mb-2 rounded bg-slate-950 p-3 text-xs"><b>{m.nombre}</b><p className="text-slate-500">Inicial: {m.cantidad} {m.unidad} en {nombreLugar(m.ubicacion)}</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(lugares).filter(([,q])=>q>0).map(([l,q])=><span key={l} className="rounded bg-slate-800 px-2 py-1">{nombreLugar(l as BaseId|"reserva-ton")}: {q}</span>)}</div></div>;
                  })}
                </section>
              </div>
            )}

            {tab==="tfp"&&(
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-900 bg-cyan-950/20 p-4 text-sm">
                  <b className="text-cyan-300">TFP simplificada:</b> no necesitás pensar en “grupos”. La tabla sólo dice cuántas personas técnicas hacen falta para 4 aeronaves. ZEUS toma ese valor, lo adapta a la cantidad que movés y redondea hacia arriba.
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <table className="w-full min-w-[850px] text-left text-xs">
                    <thead className="text-slate-400"><tr><th className="p-2">Sistema</th><th>MEIC · personal para 4</th><th>MESC · personal para 4</th><th>ERC · personal para 4</th><th>Ejemplo para 10 medios</th></tr></thead>
                    <tbody>{TFP_PERSONAL.map((t)=><tr key={t.sistema} className="border-t border-slate-800"><td className="p-2 font-bold">{t.sistema}</td><td>{t.meic4}</td><td>{t.mesc4}</td><td>{t.erc4}</td><td className="text-cyan-300">MEIC {personalTfpRequerido(t.sistema,10,"MEIC")} · MESC {personalTfpRequerido(t.sistema,10,"MESC")} · ERC {personalTfpRequerido(t.sistema,10,"ERC")}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
                  <b>Ejemplo F-16CJ:</b> TFP MEIC = 56 personas para 4 aeronaves. Para 10 F-16: 56 × 10 ÷ 4 = 140. ZEUS muestra directamente <b className="text-cyan-300">140 personas</b>.
                </div>
              </div>
            )}

            {tab==="deficits"&&(
              <div className="space-y-2">
                {deficits.length?deficits.map((d,i)=><div key={i} className="rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">⚠ {d}</div>):<div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-200">No hay déficits calculables con los datos actualmente cargados.</div>}
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-400">
                  Si un dato no está documentado (por ejemplo cantidad total de MHU-83 disponible o capacidad de alojamiento de una instalación no incluida en TFP), no se inventa y tampoco se declara déficit.
                </div>
              </div>
            )}

            {tab==="historial"&&(
              <div className="space-y-2">
                {aplicados.slice().reverse().map((m)=><div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm"><b>{m.descripcion}</b><p className="text-xs text-slate-500">{m.fecha?new Date(m.fecha).toLocaleString("es-AR"):""} · {PERIODOS.find((p)=>p.id===m.periodoId)?.ventana}</p>{m.personalTfpMovido>0&&<p className="mt-1 text-xs text-cyan-300">Personal técnico trasladado: {m.personalTfpMovido}</p>}</div>)}
                {!aplicados.length&&<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">Todavía no aplicaste movimientos. La situación actual es exactamente la situación inicial.</div>}
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
}
