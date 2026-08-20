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
  | "rio-cuarto";

type Esfuerzo = "ERC" | "MESC" | "MEIC";
type Tab = "situacion" | "movimientos" | "misiones" | "reabastecimiento" | "tfp" | "alertas";

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

type FactorTFP = {
  sistema: string;
  personalPorMedio: number | null;
  tripulacionPorMedio: number | null;
  combustibleLitrosHora: number | null;
  hhMantPorHoraVuelo: number | null;
  salidasERC: number | null;
  salidasMESC: number | null;
  salidasMEIC: number | null;
};

type FactorApoyo = {
  id: string;
  nombre: string;
  personalPorUnidad: number | null;
  pesoKgUnidad: number | null;
};

type Movimiento = {
  id: string;
  periodoId: string;
  sistema: string;
  origen: BaseId;
  destino: BaseId;
  cantidad: number;
  apoyo: Record<string, number>;
  fecha: string;
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
  tfp: FactorTFP[];
  apoyo: FactorApoyo[];
  movimientos: Movimiento[];
  misionesREV: MisionREV[];
  reabastecimientos: Reabastecimiento[];
};

const STORAGE_INDEX = "zeus-a4-v2-index";
const STORAGE_PREFIX = "zeus-a4-v2-plan:";

const PERIODOS: Periodo[] = [
  { id:"f1m1", fase:"FASE I · PREPARACIÓN", momento:"Momento 1 · Concepción", ventana:"Antes de M", esfuerzo:"ERC", detalle:"Planeamiento y preparación inicial." },
  { id:"f1m2-despl", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Despliegue", ventana:"M+1 a M+4", esfuerzo:"ERC", detalle:"Despliegue de sistemas de armas hacia PPRRFF." },
  { id:"f1m2-arm", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Abastecimiento", ventana:"M+5 a M+7", esfuerzo:"ERC", detalle:"Alistamiento y abastecimiento de armamento en PPRRFF." },
  { id:"f1m2-adies", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Adiestramiento", ventana:"M+8 a M+40", esfuerzo:"ERC", detalle:"Adiestramiento operativo, principalmente nocturno." },
  { id:"f1m2-comp", fase:"FASE I · PREPARACIÓN", momento:"Momento 2 · Comprobación", ventana:"M+41 a M+45", esfuerzo:"ERC", detalle:"Comprobación del sistema aéreo ofensivo." },
  { id:"f1m3", fase:"FASE I · PREPARACIÓN", momento:"Momento 3 · Alerta", ventana:"A a D", esfuerzo:"MESC", detalle:"Exploración, reconocimiento y alistamiento sostenido." },
  { id:"f2", fase:"FASE II · TOMAR LA INICIATIVA", momento:"Operaciones", ventana:"D a D+1", esfuerzo:"MEIC", detalle:"Máximo esfuerzo intensivo de combate." },
  { id:"f3", fase:"FASE III · DOMINAR", momento:"Operaciones", ventana:"D+2 a D+9", esfuerzo:"MESC", detalle:"Máximo esfuerzo sostenido de combate." },
  { id:"f4", fase:"ESTABILIZACIÓN", momento:"Repliegue", ventana:"D+10 en adelante", esfuerzo:"ERC", detalle:"Repliegue y esfuerzo remanente de combate." },
];

const BASES_INICIALES: BasePlan[] = [
  { id:"la-rioja", nombre:"La Rioja", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"villa-mercedes", nombre:"Villa Mercedes", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"cordoba", nombre:"Córdoba", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"mendoza", nombre:"Mendoza", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"gral-acha", nombre:"Gral. Acha", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:4 },
  { id:"malargue", nombre:"Malargüe", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:3 },
  { id:"realico", nombre:"Realicó", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:3 },
  { id:"san-rafael", nombre:"San Rafael", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:3 },
  { id:"rio-cuarto", nombre:"Río Cuarto", capacidadAlojamiento:null, personalPermanente:0, cicloReabDias:3, cicloCombustibleDias:4 },
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
  { id:"hermes-vm", sistema:"Hermes 450 SIGINT", baseInicial:"villa-mercedes", cantidadInicial:3 },
  { id:"hermes-ga", sistema:"Hermes 450 EyR", baseInicial:"gral-acha", cantidadInicial:3 },
  { id:"ch47-cor", sistema:"CH-47F", baseInicial:"cordoba", cantidadInicial:6 },
  { id:"ch47-ga", sistema:"CH-47F", baseInicial:"gral-acha", cantidadInicial:6 },
];

const SISTEMAS = Array.from(new Set(MEDIOS_INICIALES.map((m)=>m.sistema)));

const TFP_INICIAL: FactorTFP[] = SISTEMAS.map((sistema)=>({
  sistema,
  personalPorMedio:null,
  tripulacionPorMedio:null,
  combustibleLitrosHora:null,
  hhMantPorHoraVuelo:null,
  salidasERC:null,
  salidasMESC:null,
  salidasMEIC:null,
}));

const APOYO_INICIAL: FactorApoyo[] = [
  { id:"elevador", nombre:"Elevador / MHE", personalPorUnidad:null, pesoKgUnidad:null },
  { id:"carro-bombas", nombre:"Carro de bombas", personalPorUnidad:null, pesoKgUnidad:null },
  { id:"equipo-tierra", nombre:"Equipo de apoyo en tierra", personalPorUnidad:null, pesoKgUnidad:null },
  { id:"armamento", nombre:"Armamento / lote", personalPorUnidad:null, pesoKgUnidad:null },
  { id:"repuestos", nombre:"Repuestos / lote", personalPorUnidad:null, pesoKgUnidad:null },
  { id:"oxigeno", nombre:"Oxígeno / lote", personalPorUnidad:null, pesoKgUnidad:null },
  { id:"nitrogeno", nombre:"Nitrógeno / lote", personalPorUnidad:null, pesoKgUnidad:null },
];

const PLAN_BASE: EstadoPlan = {
  nombre:"A4 · Base Plan de Campaña",
  periodoActivo:"f1m1",
  bases:BASES_INICIALES,
  medios:MEDIOS_INICIALES,
  tfp:TFP_INICIAL,
  apoyo:APOYO_INICIAL,
  movimientos:[],
  misionesREV:[
    { id:"rev-f2", periodoId:"f2", nombre:"REV Fase II", cisterna:"KC-135", cantidadCisternas:2, receptores:0, litrosPorReceptor:0, capacidadTransferiblePorCisterna:null, ida:true, regreso:true },
    { id:"rev-f3", periodoId:"f3", nombre:"REV Fase III", cisterna:"KC-135", cantidadCisternas:2, receptores:0, litrosPorReceptor:0, capacidadTransferiblePorCisterna:null, ida:true, regreso:true },
  ],
  reabastecimientos:[],
};

function clone<T>(v:T):T {
  return JSON.parse(JSON.stringify(v));
}

function baseNombre(id:BaseId, bases:BasePlan[]) {
  return bases.find((b)=>b.id===id)?.nombre ?? id;
}

function fmt(v:number, d=0) {
  return new Intl.NumberFormat("es-AR",{maximumFractionDigits:d}).format(v);
}

export default function A4LogisticsCalculator() {
  const [open,setOpen] = useState(false);
  const [tab,setTab] = useState<Tab>("situacion");
  const [plan,setPlan] = useState<EstadoPlan>(clone(PLAN_BASE));
  const [planes,setPlanes] = useState<string[]>([]);
  const [movSistema,setMovSistema] = useState("F-16CJ Block 50");
  const [movOrigen,setMovOrigen] = useState<BaseId>("gral-acha");
  const [movDestino,setMovDestino] = useState<BaseId>("cordoba");
  const [movCantidad,setMovCantidad] = useState(1);

  useEffect(()=>{
    try {
      const idx = JSON.parse(localStorage.getItem(STORAGE_INDEX) || "[]") as string[];
      setPlanes(idx);
      const ultimo = localStorage.getItem(`${STORAGE_PREFIX}__ultimo`);
      if (ultimo) {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${ultimo}`);
        if (raw) setPlan(JSON.parse(raw));
      }
    } catch {}
  },[]);

  const periodo = PERIODOS.find((p)=>p.id===plan.periodoActivo) ?? PERIODOS[0];

  const posiciones = useMemo(()=>{
    const map = new Map<string, Record<BaseId,number>>();
    for (const m of plan.medios) {
      if (!map.has(m.sistema)) map.set(m.sistema, {} as Record<BaseId,number>);
      const row = map.get(m.sistema)!;
      row[m.baseInicial] = (row[m.baseInicial] || 0) + m.cantidadInicial;
    }
    const periodOrder = PERIODOS.map((p)=>p.id);
    const limite = periodOrder.indexOf(plan.periodoActivo);
    const aplicables = plan.movimientos.filter((m)=>periodOrder.indexOf(m.periodoId) <= limite);
    for (const mv of aplicables) {
      const row = map.get(mv.sistema) || ({} as Record<BaseId,number>);
      row[mv.origen] = (row[mv.origen] || 0) - mv.cantidad;
      row[mv.destino] = (row[mv.destino] || 0) + mv.cantidad;
      map.set(mv.sistema,row);
    }
    return map;
  },[plan.medios,plan.movimientos,plan.periodoActivo]);

  const disponibilidadOrigen = posiciones.get(movSistema)?.[movOrigen] || 0;

  const personalDesplegadoPorBase = useMemo(()=>{
    const out:Record<BaseId,number> = {} as Record<BaseId,number>;
    for (const b of plan.bases) out[b.id]=0;
    for (const [sistema,dist] of posiciones.entries()) {
      const tfp=plan.tfp.find((t)=>t.sistema===sistema);
      if (!tfp?.personalPorMedio) continue;
      for (const [bid,cant] of Object.entries(dist)) {
        out[bid as BaseId]=(out[bid as BaseId]||0)+Math.max(0,cant)*tfp.personalPorMedio;
      }
    }
    for (const mv of plan.movimientos.filter((m)=>m.periodoId===plan.periodoActivo)) {
      for (const [aid,cant] of Object.entries(mv.apoyo)) {
        const factor=plan.apoyo.find((a)=>a.id===aid);
        if (factor?.personalPorUnidad) out[mv.destino]+=(cant||0)*factor.personalPorUnidad;
      }
    }
    return out;
  },[plan,posiciones]);

  const alertas = useMemo(()=>{
    const arr:string[]=[];
    for (const b of plan.bases) {
      const mov=personalDesplegadoPorBase[b.id]||0;
      const total=b.personalPermanente+mov;
      if (b.capacidadAlojamiento!=null && total>b.capacidadAlojamiento) {
        arr.push(`${b.nombre}: alojamiento insuficiente por ${fmt(total-b.capacidadAlojamiento)} plazas.`);
      }
    }
    for (const m of plan.misionesREV.filter((x)=>x.periodoId===plan.periodoActivo)) {
      const pases=(m.ida?1:0)+(m.regreso?1:0);
      const necesita=m.receptores*m.litrosPorReceptor*pases;
      if (m.capacidadTransferiblePorCisterna!=null) {
        const ofrece=m.cantidadCisternas*m.capacidadTransferiblePorCisterna;
        if (ofrece<necesita) arr.push(`${m.nombre}: déficit REV de ${fmt(necesita-ofrece)} L.`);
      } else {
        arr.push(`${m.nombre}: falta cargar capacidad transferible por ${m.cisterna} para validar la misión.`);
      }
    }
    for (const r of plan.reabastecimientos.filter((x)=>x.periodoId===plan.periodoActivo)) {
      if (r.demoraDias>0) arr.push(`${baseNombre(r.base,plan.bases)} · ${r.recurso}: ETA D+${r.diaSolicitud+r.demoraDias} desde la solicitud.`);
    }
    const tfpIncompletas=plan.tfp.filter((t)=>t.personalPorMedio==null || t.combustibleLitrosHora==null).length;
    if (tfpIncompletas) arr.push(`${tfpIncompletas} sistemas tienen TFP incompleta. Los cálculos asociados quedan pendientes hasta cargar esos factores.`);
    return arr;
  },[plan,personalDesplegadoPorBase]);

  function guardar(nombre?:string) {
    const n=(nombre ?? plan.nombre).trim();
    if (!n) return;
    const next={...plan,nombre:n};
    localStorage.setItem(`${STORAGE_PREFIX}${n}`,JSON.stringify(next));
    localStorage.setItem(`${STORAGE_PREFIX}__ultimo`,n);
    const idx=Array.from(new Set([...planes,n]));
    localStorage.setItem(STORAGE_INDEX,JSON.stringify(idx));
    setPlanes(idx);
    setPlan(next);
  }

  function nuevo() {
    const n=window.prompt("Nombre del nuevo plan A4","A4 · Nuevo escenario");
    if (!n) return;
    const next=clone(PLAN_BASE); next.nombre=n;
    setPlan(next); guardarPlanDirecto(next,n);
  }

  function guardarPlanDirecto(p:EstadoPlan,n:string) {
    localStorage.setItem(`${STORAGE_PREFIX}${n}`,JSON.stringify(p));
    localStorage.setItem(`${STORAGE_PREFIX}__ultimo`,n);
    const idx=Array.from(new Set([...planes,n]));
    localStorage.setItem(STORAGE_INDEX,JSON.stringify(idx));
    setPlanes(idx);
  }

  function guardarComo() {
    const n=window.prompt("Guardar como",plan.nombre+" copia");
    if (!n) return;
    guardar(n);
  }

  function abrirPlan(nombre:string) {
    const raw=localStorage.getItem(`${STORAGE_PREFIX}${nombre}`);
    if (!raw) return;
    setPlan(JSON.parse(raw));
    localStorage.setItem(`${STORAGE_PREFIX}__ultimo`,nombre);
  }

  function eliminarPlan(nombre:string) {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return;
    localStorage.removeItem(`${STORAGE_PREFIX}${nombre}`);
    const idx=planes.filter((x)=>x!==nombre);
    localStorage.setItem(STORAGE_INDEX,JSON.stringify(idx));
    setPlanes(idx);
  }

  function agregarMovimiento() {
    if (movOrigen===movDestino || movCantidad<=0 || movCantidad>disponibilidadOrigen) return;
    const apoyo:Record<string,number>={};
    for (const a of plan.apoyo) apoyo[a.id]=0;
    const mv:Movimiento={
      id:`mv-${Date.now()}`,periodoId:plan.periodoActivo,sistema:movSistema,
      origen:movOrigen,destino:movDestino,cantidad:movCantidad,apoyo,fecha:new Date().toISOString()
    };
    setPlan((p)=>({...p,movimientos:[...p.movimientos,mv]}));
  }

  function updateMovimientoApoyo(id:string,aid:string,val:number) {
    setPlan((p)=>({...p,movimientos:p.movimientos.map((m)=>m.id===id?{...m,apoyo:{...m.apoyo,[aid]:val}}:m)}));
  }

  function updateBase(id:BaseId,patch:Partial<BasePlan>) {
    setPlan((p)=>({...p,bases:p.bases.map((b)=>b.id===id?{...b,...patch}:b)}));
  }

  function updateTFP(sistema:string,patch:Partial<FactorTFP>) {
    setPlan((p)=>({...p,tfp:p.tfp.map((t)=>t.sistema===sistema?{...t,...patch}:t)}));
  }

  function updateApoyo(id:string,patch:Partial<FactorApoyo>) {
    setPlan((p)=>({...p,apoyo:p.apoyo.map((a)=>a.id===id?{...a,...patch}:a)}));
  }

  function updateREV(id:string,patch:Partial<MisionREV>) {
    setPlan((p)=>({...p,misionesREV:p.misionesREV.map((m)=>m.id===id?{...m,...patch}:m)}));
  }

  function addREV() {
    setPlan((p)=>({...p,misionesREV:[...p.misionesREV,{
      id:`rev-${Date.now()}`,periodoId:p.periodoActivo,nombre:"Nueva misión REV",
      cisterna:"KC-135",cantidadCisternas:1,receptores:0,litrosPorReceptor:0,
      capacidadTransferiblePorCisterna:null,ida:true,regreso:false
    }]}));
  }

  function addReab() {
    setPlan((p)=>({...p,reabastecimientos:[...p.reabastecimientos,{
      id:`rab-${Date.now()}`,periodoId:p.periodoActivo,base:"cordoba",recurso:"Combustible",
      cantidad:0,unidad:"L",diaSolicitud:0,demoraDias:3
    }]}));
  }

  function updateReab(id:string,patch:Partial<Reabastecimiento>) {
    setPlan((p)=>({...p,reabastecimientos:p.reabastecimientos.map((r)=>r.id===id?{...r,...patch}:r)}));
  }

  const tabs:[Tab,string][]=[
    ["situacion","Situación"],["movimientos","Movimientos"],["misiones","Misiones / REV"],
    ["reabastecimiento","Reabastecimiento"],["tfp","TFP"],["alertas","Alertas"]
  ];

  return (
    <>
      <section className="mb-5 rounded-lg border border-emerald-700 bg-emerald-950/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">A4 · ZEUS II</p>
            <h2 className="font-bold text-white">Calculadora logística por fases y momentos</h2>
            <p className="mt-1 text-xs text-slate-400">ERC · MESC · MEIC · movimientos · personal · alojamiento · TFP · REV · reabastecimiento</p>
          </div>
          <button type="button" onClick={()=>setOpen(true)} className="rounded bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-600">Abrir</button>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950 text-white">
          <header className="border-b border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">ZEUS II · CELDA A4</p>
                <h1 className="text-xl font-black">{plan.nombre}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={nuevo} className="rounded bg-slate-800 px-3 py-2 text-xs font-bold">Nuevo</button>
                <button onClick={()=>guardar()} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold">Guardar</button>
                <button onClick={guardarComo} className="rounded bg-slate-800 px-3 py-2 text-xs font-bold">Guardar como</button>
                <select value={plan.nombre} onChange={(e)=>abrirPlan(e.target.value)} className="rounded bg-slate-800 px-3 py-2 text-xs">
                  <option value={plan.nombre}>{plan.nombre}</option>
                  {planes.filter((x)=>x!==plan.nombre).map((x)=><option key={x}>{x}</option>)}
                </select>
                <button onClick={()=>eliminarPlan(plan.nombre)} className="rounded border border-red-800 px-3 py-2 text-xs text-red-300">Eliminar</button>
                <button onClick={()=>setOpen(false)} className="rounded bg-slate-800 px-3 py-2 text-xs font-bold">Cerrar</button>
              </div>
            </div>
          </header>

          <div className="border-b border-slate-800 bg-slate-900 px-3 py-2">
            <div className="flex gap-2 overflow-x-auto">
              {PERIODOS.map((p)=>(
                <button key={p.id} onClick={()=>setPlan((x)=>({...x,periodoActivo:p.id}))}
                  className={`min-w-[145px] rounded p-2 text-left text-[11px] ${plan.periodoActivo===p.id?"bg-emerald-700":"bg-slate-800"}`}>
                  <b>{p.ventana}</b><div>{p.momento}</div><div className="mt-1 font-black">{p.esfuerzo}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded bg-slate-800 px-2 py-1 font-black">{periodo.fase}</span>
              <span>{periodo.momento}</span>
              <span className="rounded bg-emerald-950 px-2 py-1 font-black text-emerald-300">{periodo.esfuerzo}</span>
              <span className="text-slate-400">{periodo.detalle}</span>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 px-4 py-2">
            {tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`rounded px-3 py-2 text-xs font-bold ${tab===id?"bg-emerald-700":"bg-slate-900 text-slate-300"}`}>{label}</button>)}
          </nav>

          <main className="min-h-0 flex-1 overflow-auto p-4">
            {tab==="situacion" && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Período</p><p className="font-black">{periodo.ventana}</p><p className="text-sm">{periodo.momento}</p></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Esfuerzo</p><p className="text-2xl font-black text-emerald-300">{periodo.esfuerzo}</p></div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-500">Alertas</p><p className="text-2xl font-black">{alertas.length}</p></div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {plan.bases.map((b)=>{
                    const despl=personalDesplegadoPorBase[b.id]||0;
                    const ocup=b.personalPermanente+despl;
                    const libres=b.capacidadAlojamiento==null?null:b.capacidadAlojamiento-ocup;
                    return <section key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <h2 className="font-black">{b.nombre}</h2>
                        <span className={`rounded px-2 py-1 text-[10px] ${libres!=null&&libres<0?"bg-red-950 text-red-300":"bg-slate-800"}`}>{libres==null?"Alojamiento pendiente":`${fmt(Math.max(0,libres))} plazas libres`}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <label>Capacidad alojamiento<input type="number" value={b.capacidadAlojamiento??""} onChange={(e)=>updateBase(b.id,{capacidadAlojamiento:e.target.value===""?null:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                        <label>Personal permanente<input type="number" value={b.personalPermanente} onChange={(e)=>updateBase(b.id,{personalPermanente:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                        <div><p className="text-slate-500">Asociado a medios</p><p className="mt-2 text-lg font-black">{fmt(despl)}</p></div>
                      </div>
                      <div className="mt-3 space-y-1">
                        {Array.from(posiciones.entries()).flatMap(([sis,dist])=>{
                          const cant=dist[b.id]||0;
                          return cant>0?[<div key={sis} className="flex justify-between rounded bg-slate-950 px-3 py-2 text-xs"><span>{sis}</span><b>{cant}</b></div>]:[];
                        })}
                      </div>
                    </section>
                  })}
                </div>
              </div>
            )}

            {tab==="movimientos" && (
              <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                <section className="rounded-xl border border-emerald-900 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black text-emerald-300">Mover medios en {periodo.ventana}</h2>
                  <label className="mb-3 block text-xs">Sistema<select value={movSistema} onChange={(e)=>setMovSistema(e.target.value)} className="mt-1 w-full rounded bg-slate-800 p-2">{SISTEMAS.map((s)=><option key={s}>{s}</option>)}</select></label>
                  <label className="mb-3 block text-xs">Origen<select value={movOrigen} onChange={(e)=>setMovOrigen(e.target.value as BaseId)} className="mt-1 w-full rounded bg-slate-800 p-2">{plan.bases.map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></label>
                  <label className="mb-3 block text-xs">Destino<select value={movDestino} onChange={(e)=>setMovDestino(e.target.value as BaseId)} className="mt-1 w-full rounded bg-slate-800 p-2">{plan.bases.map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></label>
                  <label className="mb-3 block text-xs">Cantidad<input type="number" min="1" value={movCantidad} onChange={(e)=>setMovCantidad(Number(e.target.value))} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                  <p className="mb-3 rounded bg-slate-950 p-2 text-xs">Disponible en origen al inicio de este período: <b>{disponibilidadOrigen}</b></p>
                  <button disabled={movOrigen===movDestino||movCantidad<=0||movCantidad>disponibilidadOrigen} onClick={agregarMovimiento} className="w-full rounded bg-emerald-700 p-2 font-black disabled:opacity-40">Aplicar movimiento</button>
                </section>

                <section className="space-y-3">
                  {plan.movimientos.filter((m)=>m.periodoId===plan.periodoActivo).map((m)=>{
                    const tfp=plan.tfp.find((t)=>t.sistema===m.sistema);
                    const pers=tfp?.personalPorMedio==null?null:m.cantidad*tfp.personalPorMedio;
                    const apoyoPers=Object.entries(m.apoyo).reduce((s,[aid,c])=>{
                      const f=plan.apoyo.find((a)=>a.id===aid);
                      return s+(f?.personalPorUnidad||0)*(c||0);
                    },0);
                    return <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex flex-wrap justify-between gap-2"><b>{m.cantidad} × {m.sistema}</b><span className="text-xs text-slate-400">{baseNombre(m.origen,plan.bases)} → {baseNombre(m.destino,plan.bases)}</span></div>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <div className="rounded bg-slate-950 p-2 text-xs"><span className="text-slate-500">Personal por TFP</span><div className="font-black">{pers==null?"Pendiente TFP":fmt(pers)}</div></div>
                        <div className="rounded bg-slate-950 p-2 text-xs"><span className="text-slate-500">Personal apoyo</span><div className="font-black">{fmt(apoyoPers)}</div></div>
                        <div className="rounded bg-slate-950 p-2 text-xs"><span className="text-slate-500">Total asociado</span><div className="font-black">{pers==null?"Pendiente TFP":fmt(pers+apoyoPers)}</div></div>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        {plan.apoyo.map((a)=><label key={a.id} className="text-xs">{a.nombre}<input type="number" min="0" value={m.apoyo[a.id]||0} onChange={(e)=>updateMovimientoApoyo(m.id,a.id,Number(e.target.value))} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>)}
                      </div>
                    </div>;
                  })}
                  {!plan.movimientos.some((m)=>m.periodoId===plan.periodoActivo)&&<p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">Sin movimientos cargados para este período.</p>}
                </section>
              </div>
            )}

            {tab==="misiones" && (
              <div className="space-y-4">
                <div className="flex justify-between"><div><h2 className="font-black">Misiones y reabastecimiento en vuelo</h2><p className="text-xs text-slate-500">La capacidad transferible se deja editable hasta contar con un valor respaldado para la configuración empleada.</p></div><button onClick={addREV} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold">+ Misión REV</button></div>
                {plan.misionesREV.filter((m)=>m.periodoId===plan.periodoActivo).map((m)=>{
                  const pases=(m.ida?1:0)+(m.regreso?1:0);
                  const demanda=m.receptores*m.litrosPorReceptor*pases;
                  const capacidad=m.capacidadTransferiblePorCisterna==null?null:m.capacidadTransferiblePorCisterna*m.cantidadCisternas;
                  const margen=capacidad==null?null:capacidad-demanda;
                  return <section key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <input value={m.nombre} onChange={(e)=>updateREV(m.id,{nombre:e.target.value})} className="mb-3 w-full rounded bg-slate-950 p-2 font-black"/>
                    <div className="grid gap-2 md:grid-cols-4">
                      <label className="text-xs">Cisterna<select value={m.cisterna} onChange={(e)=>updateREV(m.id,{cisterna:e.target.value as "KC-135"|"KC-130J"})} className="mt-1 w-full rounded bg-slate-800 p-2"><option>KC-135</option><option>KC-130J</option></select></label>
                      <label className="text-xs">Cantidad cisternas<input type="number" min="1" value={m.cantidadCisternas} onChange={(e)=>updateREV(m.id,{cantidadCisternas:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                      <label className="text-xs">Receptores<input type="number" min="0" value={m.receptores} onChange={(e)=>updateREV(m.id,{receptores:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                      <label className="text-xs">Litros por receptor / pase<input type="number" min="0" value={m.litrosPorReceptor} onChange={(e)=>updateREV(m.id,{litrosPorReceptor:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                      <label className="text-xs">Capacidad transferible por cisterna (L)<input type="number" min="0" value={m.capacidadTransferiblePorCisterna??""} onChange={(e)=>updateREV(m.id,{capacidadTransferiblePorCisterna:e.target.value===""?null:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-2"/></label>
                      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={m.ida} onChange={(e)=>updateREV(m.id,{ida:e.target.checked})}/> REV ida</label>
                      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={m.regreso} onChange={(e)=>updateREV(m.id,{regreso:e.target.checked})}/> REV regreso</label>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs">
                      <div className="rounded bg-slate-950 p-3">Demanda total<div className="text-lg font-black">{fmt(demanda)} L</div></div>
                      <div className="rounded bg-slate-950 p-3">Capacidad total<div className="text-lg font-black">{capacidad==null?"Pendiente":`${fmt(capacidad)} L`}</div></div>
                      <div className={`rounded p-3 ${margen!=null&&margen<0?"bg-red-950":"bg-slate-950"}`}>Margen<div className="text-lg font-black">{margen==null?"Pendiente":`${fmt(margen)} L`}</div></div>
                    </div>
                  </section>;
                })}
                {!plan.misionesREV.some((m)=>m.periodoId===plan.periodoActivo)&&<p className="rounded bg-slate-900 p-4 text-sm text-slate-500">No hay misión REV cargada en este período.</p>}
              </div>
            )}

            {tab==="reabastecimiento" && (
              <div className="space-y-4">
                <div className="flex justify-between"><div><h2 className="font-black">Reabastecimiento terrestre / logístico</h2><p className="text-xs text-slate-500">Calcula ETA desde la solicitud. Por defecto se usa ciclo de 3 días; Clase III A puede configurarse por base.</p></div><button onClick={addReab} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold">+ Requerimiento</button></div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <table className="w-full min-w-[1000px] text-left text-xs">
                    <thead className="text-slate-400"><tr><th className="p-2">Base</th><th>Recurso</th><th>Cantidad</th><th>Unidad</th><th>Día solicitud</th><th>Demora</th><th>ETA</th></tr></thead>
                    <tbody>{plan.reabastecimientos.filter((r)=>r.periodoId===plan.periodoActivo).map((r)=><tr key={r.id} className="border-t border-slate-800">
                      <td className="p-2"><select value={r.base} onChange={(e)=>updateReab(r.id,{base:e.target.value as BaseId})} className="rounded bg-slate-800 p-1">{plan.bases.map((b)=><option key={b.id} value={b.id}>{b.nombre}</option>)}</select></td>
                      <td><input value={r.recurso} onChange={(e)=>updateReab(r.id,{recurso:e.target.value})} className="rounded bg-slate-800 p-1"/></td>
                      <td><input type="number" value={r.cantidad} onChange={(e)=>updateReab(r.id,{cantidad:Number(e.target.value)})} className="w-24 rounded bg-slate-800 p-1"/></td>
                      <td><input value={r.unidad} onChange={(e)=>updateReab(r.id,{unidad:e.target.value})} className="w-20 rounded bg-slate-800 p-1"/></td>
                      <td><input type="number" value={r.diaSolicitud} onChange={(e)=>updateReab(r.id,{diaSolicitud:Number(e.target.value)})} className="w-20 rounded bg-slate-800 p-1"/></td>
                      <td><input type="number" value={r.demoraDias} onChange={(e)=>updateReab(r.id,{demoraDias:Number(e.target.value)})} className="w-20 rounded bg-slate-800 p-1"/></td>
                      <td className="font-black">D+{r.diaSolicitud+r.demoraDias}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {plan.bases.map((b)=><div key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs">
                    <b>{b.nombre}</b>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label>Ciclo general<input type="number" value={b.cicloReabDias} onChange={(e)=>updateBase(b.id,{cicloReabDias:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-1"/></label>
                      <label>Clase III A<input type="number" value={b.cicloCombustibleDias} onChange={(e)=>updateBase(b.id,{cicloCombustibleDias:Number(e.target.value)})} className="mt-1 w-full rounded bg-slate-800 p-1"/></label>
                    </div>
                  </div>)}
                </div>
              </div>
            )}

            {tab==="tfp" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-cyan-900 bg-cyan-950/20 p-4 text-sm"><b className="text-cyan-300">TFP maestra.</b> Los campos vacíos significan “pendiente”. No se inventan factores. La interfaz usa litros/hora para combustible porque es la unidad que aparece en la documentación doctrinaria de respaldo localizada.</div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black">Factores por sistema</h2>
                  <table className="w-full min-w-[1150px] text-left text-xs">
                    <thead className="text-slate-400"><tr><th className="p-2">Sistema</th><th>Personal/medio</th><th>Tripulación/medio</th><th>Combustible L/h</th><th>HH mant/HV</th><th>ERC salidas/día</th><th>MESC</th><th>MEIC</th></tr></thead>
                    <tbody>{plan.tfp.map((t)=><tr key={t.sistema} className="border-t border-slate-800">
                      <td className="p-2 font-bold">{t.sistema}</td>
                      {(["personalPorMedio","tripulacionPorMedio","combustibleLitrosHora","hhMantPorHoraVuelo","salidasERC","salidasMESC","salidasMEIC"] as const).map((k)=><td key={k}><input type="number" step="0.1" value={t[k]??""} onChange={(e)=>updateTFP(t.sistema,{[k]:e.target.value===""?null:Number(e.target.value)})} className="w-24 rounded bg-slate-800 p-1"/></td>)}
                    </tr>)}</tbody>
                  </table>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="mb-3 font-black">Factores de equipos y apoyo</h2>
                  <table className="w-full min-w-[700px] text-left text-xs"><thead className="text-slate-400"><tr><th className="p-2">Elemento</th><th>Personal/unidad</th><th>Peso kg/unidad</th></tr></thead>
                    <tbody>{plan.apoyo.map((a)=><tr key={a.id} className="border-t border-slate-800"><td className="p-2 font-bold">{a.nombre}</td><td><input type="number" step="0.1" value={a.personalPorUnidad??""} onChange={(e)=>updateApoyo(a.id,{personalPorUnidad:e.target.value===""?null:Number(e.target.value)})} className="w-28 rounded bg-slate-800 p-1"/></td><td><input type="number" value={a.pesoKgUnidad??""} onChange={(e)=>updateApoyo(a.id,{pesoKgUnidad:e.target.value===""?null:Number(e.target.value)})} className="w-32 rounded bg-slate-800 p-1"/></td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            {tab==="alertas" && (
              <div className="space-y-2">
                {alertas.map((a,i)=><div key={i} className="rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">⚠ {a}</div>)}
                {!alertas.length&&<div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-200">Sin alertas activas para este período.</div>}
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
}
