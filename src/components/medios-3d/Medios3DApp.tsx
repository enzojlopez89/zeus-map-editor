"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import F16Viewer from "./F16Viewer";
import GenericModelViewer from "./GenericModelViewer";
import ProceduralZeusViewer from "./ProceduralZeusViewer";
import { f16Compatibilidad, f16General, medios, type Compatibilidad, type Medio3D } from "@/data/medios3d";

const nivelText = {
  "3d-exacto":"3D activo",
  "3d-adaptado":"3D adaptado",
  "3d-zeus":"3D ZEUS",
  "2d-provisional":"2D referencia",
  pendiente:"Pendiente"
} as const;

type BlockKey = "block40" | "block42" | "block50";
type Loadout = Record<number, string | null>;
type PresetKey = "LIMPIA" | "AA" | "SEAD" | "ATAQUE" | "INTERDICCION";

const stationLabels: Record<number,string> = {
  1:"Ext. ala izq.", 2:"Int. ala izq.", 3:"Int. ala izq.", 4:"Fuselaje izq.", 5:"Central",
  6:"Fuselaje der.", 7:"Int. ala der.", 8:"Int. ala der.", 9:"Ext. ala der."
};

const presetLoads: Record<PresetKey, Loadout> = {
  LIMPIA: {1:null,2:null,3:null,4:null,5:null,6:null,7:null,8:null,9:null},
  AA: {1:"aim9m",2:"aim120",3:"aim120",4:null,5:null,6:null,7:"aim120",8:"aim120",9:"aim9m"},
  SEAD: {1:"aim9m",2:"aim120",3:"agm88c",4:"asq213",5:"alq",6:null,7:"agm88c",8:"aim120",9:"aim9m"},
  ATAQUE: {1:"aim9m",2:"aim120",3:"gbu38",4:"lantirn",5:null,6:null,7:"gbu38",8:"aim120",9:"aim9m"},
  INTERDICCION: {1:"aim9m",2:"aim120",3:"agm65g",4:"lantirn",5:null,6:null,7:"agm65g",8:"aim120",9:"aim9m"},
};

const pesoPlanKg: Record<string, {kg:number; nota:string}> = {
  agm65g:{kg:302,nota:"Peso indicado por el Plan para AGM-65G."},
  penguin:{kg:385,nota:"Peso indicado por el Plan para AGM-119 Penguin."},
  gbu38:{kg:227,nota:"Se computa sólo el peso de la Mk-82 indicado por el Plan; no representa el conjunto JDAM completo."},
};

function getBlock(medio: Medio3D): BlockKey {
  return medio.id === "f16cj50" ? "block50" : medio.id === "f16d42" ? "block42" : "block40";
}

function CompatBadge({ value }: { value: Compatibilidad[BlockKey] }) {
  if(value==="si") return <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-200">Compatible</span>;
  if(value==="condicionado") return <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase text-amber-200">Condicionado</span>;
  return <span className="rounded-full border border-slate-500/40 bg-slate-500/10 px-2 py-1 text-[10px] font-black uppercase text-slate-300">Por verificar</span>;
}

function VariantSelector({ medio, onSelect }: { medio: Medio3D; onSelect:(id:string)=>void }) {
  return <label className="block rounded-xl border border-cyan-300/15 bg-cyan-300/[.035] p-3 text-xs">
    <span className="font-black uppercase tracking-[.18em] text-cyan-300">Variante F-16</span>
    <select value={medio.id} onChange={e=>onSelect(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 font-bold text-slate-100 outline-none focus:border-cyan-300/50">
      <option value="f16c40">F-16C Block 40</option>
      <option value="f16d42">F-16D Block 42</option>
      <option value="f16cj50">F-16CJ Block 50</option>
    </select>
  </label>;
}

function F16TechnicalPanel({ medio, onSelectVariant, onConfigure }: { medio: Medio3D; onSelectVariant:(id:string)=>void; onConfigure:()=>void }) {
  const block=getBlock(medio);
  return <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl">
    <div className="border-b border-white/10 pb-4"><p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">Ficha técnica</p><h2 className="mt-2 text-3xl font-black text-white">{medio.nombre} <span className="text-cyan-200">{medio.variante}</span></h2><p className="mt-1 text-sm text-slate-400">{medio.funcion}</p></div>
    <div className="mt-4"><VariantSelector medio={medio} onSelect={onSelectVariant}/></div>
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
      {[['Longitud',f16General.longitud],['Envergadura',f16General.envergadura],['Altura',f16General.altura],['Peso s/ combustible',f16General.pesoSinCombustible],['MTOW',f16General.mtow],['Combustible interno',f16General.combustibleInterno],['Velocidad máx.',f16General.velocidad],['Alcance ferry',f16General.alcanceFerry],['Radio combate A/S',f16General.radioCombateAS],['Techo',f16General.techo],['Límite',f16General.limiteG]].map(([k,v])=><div key={k} className="rounded-lg border border-white/10 bg-white/[.03] p-3"><p className="uppercase tracking-wider text-slate-500">{k}</p><p className="mt-1 font-bold text-slate-100">{v}</p></div>)}
    </div>
    <div className="mt-5"><p className="text-xs font-black uppercase tracking-[.22em] text-amber-300">ZEUS · asignación</p><div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-3 text-sm text-slate-200"><b>{medio.cantidad}</b> aeronaves · {medio.ubicacion}</div></div>
    <button onClick={onConfigure} className="mt-4 rounded-xl border border-amber-300/35 bg-amber-300/[.06] px-4 py-3 text-sm font-black uppercase tracking-wider text-amber-100 hover:border-amber-300/60">Configurar carga</button>
    <div className="mt-5"><div className="flex items-end justify-between"><p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">Compatibilidad / inventario</p><p className="text-[10px] uppercase text-slate-500">No se infiere lo no verificado</p></div><div className="mt-2 max-h-[300px] space-y-2 overflow-y-auto pr-1">
      {f16Compatibilidad.map(w=><div key={w.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-100">{w.nombre}</p><p className="text-[11px] uppercase tracking-wider text-slate-500">{w.tipo} · Inventario ZEUS: {w.inventarioZeus ?? '—'}</p></div><CompatBadge value={w[block]}/></div>{w.datoPlan&&<p className="mt-2 text-xs text-cyan-100/80">Plan: {w.datoPlan}</p>}{w.requisito&&<p className="mt-2 text-xs leading-5 text-amber-100/75">⚠ {w.requisito}</p>}</div>)}
    </div></div>
    <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[.04] p-3 text-xs leading-5 text-slate-400">Dato técnico general: USAF F-16 Fact Sheet. Datos ZEUS: cantidades, asignación e inventario del Plan. La compatibilidad exacta por estación se mantiene pendiente hasta el cotejo técnico específico.</div>
  </div>;
}

function LoadoutPanel({ medio, selectedStation, setSelectedStation, loadout, setLoadout, onClose, onSelectVariant }:{
  medio:Medio3D; selectedStation:number|null; setSelectedStation:(n:number|null)=>void; loadout:Loadout; setLoadout:(v:Loadout)=>void; onClose:()=>void; onSelectVariant:(id:string)=>void;
}) {
  const block=getBlock(medio);
  const [name,setName]=useState("");
  const [saved,setSaved]=useState<string[]>([]);
  const selectedId=selectedStation ? loadout[selectedStation] : null;
  const selectedStore=selectedId ? f16Compatibilidad.find(x=>x.id===selectedId) : undefined;
  const selectable=f16Compatibilidad.filter(w=>w[block]!=="por-verificar");
  const knownLoads=Object.values(loadout).filter(Boolean).map(id=>pesoPlanKg[id!]).filter(Boolean);
  const pesoConocido=8936+3175+knownLoads.reduce((a,b)=>a+b.kg,0);
  const unknownCount=Object.values(loadout).filter(Boolean).filter(id=>!pesoPlanKg[id!]).length;

  const refreshSaved=()=>{try{const raw=localStorage.getItem("zeus-medios3d-loadouts");const obj=raw?JSON.parse(raw):{};setSaved(Object.keys(obj));}catch{setSaved([])}};
  useEffect(()=>refreshSaved(),[]);

  const applyPreset=(key:PresetKey)=>{setLoadout({...presetLoads[key]});setSelectedStation(null)};
  const save=()=>{const clean=name.trim();if(!clean)return;try{const raw=localStorage.getItem("zeus-medios3d-loadouts");const obj=raw?JSON.parse(raw):{};obj[clean]={variant:medio.id,loadout,date:new Date().toISOString()};localStorage.setItem("zeus-medios3d-loadouts",JSON.stringify(obj));setName("");refreshSaved();}catch{}}
  const loadSaved=(n:string)=>{try{const obj=JSON.parse(localStorage.getItem("zeus-medios3d-loadouts")||"{}");const item=obj[n];if(item?.loadout)setLoadout(item.loadout);if(item?.variant)onSelectVariant(item.variant);setSelectedStation(null);}catch{}}

  return <div className="flex h-full flex-col rounded-2xl border border-amber-300/20 bg-slate-950/88 p-5 shadow-2xl">
    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-xs font-black uppercase tracking-[.28em] text-amber-300">Configuración técnica</p><h2 className="mt-2 text-2xl font-black text-white">Carga del {medio.nombre} {medio.variante}</h2><p className="mt-1 text-xs leading-5 text-slate-400">Configuración de ejercicio por variante. La asignación exacta a cada estación no se declara técnicamente verificada hasta completar el cotejo específico.</p></div><button onClick={onClose} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200">Cerrar</button></div>
    <div className="mt-4"><VariantSelector medio={medio} onSelect={onSelectVariant}/></div>

    <div className="mt-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Presets automáticos · editables</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-2">{(["LIMPIA","AA","SEAD","ATAQUE","INTERDICCION"] as PresetKey[]).map(k=><button key={k} onClick={()=>applyPreset(k)} className="rounded-lg border border-white/10 bg-white/[.025] px-2 py-2 text-[10px] font-black text-slate-200 hover:border-cyan-300/35">{k}</button>)}</div><p className="mt-2 text-[10px] leading-4 text-amber-200/70">Los presets son configuraciones conceptuales del simulador; no sustituyen el cotejo de estación/pilón.</p></div>

    <div className="mt-4 grid grid-cols-3 gap-2">
      {Array.from({length:9},(_,i)=>i+1).map(n=>{const store=loadout[n]?f16Compatibilidad.find(x=>x.id===loadout[n]):undefined;return <button key={n} onClick={()=>setSelectedStation(n)} className={`rounded-xl border p-2 text-left transition ${selectedStation===n?'border-cyan-300/60 bg-cyan-300/[.08]':'border-white/10 bg-white/[.025] hover:border-cyan-300/30'}`}><div className="flex items-center justify-between"><span className="text-xs font-black text-cyan-200">E{n}</span><span className={`h-2 w-2 rounded-full ${store?'bg-amber-300':'bg-slate-600'}`}/></div><p className="mt-1 truncate text-[10px] text-slate-400">{stationLabels[n]}</p><p className="mt-1 truncate text-[11px] font-bold text-slate-100">{store?.nombre??'VACÍA'}</p></button>})}
    </div>

    {selectedStation&&<div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[.035] p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Estación {selectedStation}</p><p className="text-xs text-slate-400">{stationLabels[selectedStation]}</p></div><button onClick={()=>setLoadout({...loadout,[selectedStation]:null})} className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-bold text-slate-300">Vaciar</button></div>
      <div className="mt-3 max-h-[230px] space-y-2 overflow-y-auto pr-1">{selectable.map(w=><button key={w.id} onClick={()=>setLoadout({...loadout,[selectedStation]:w.id})} className={`w-full rounded-lg border p-2 text-left ${selectedId===w.id?'border-amber-300/55 bg-amber-300/[.08]':'border-white/10 bg-slate-950/45 hover:border-cyan-300/30'}`}><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold text-slate-100">{w.nombre}</p><p className="text-[10px] text-slate-500">{w.tipo}</p></div><CompatBadge value={w[block]}/></div></button>)}</div>
      {selectedStore&&<p className="mt-2 text-[10px] leading-4 text-amber-100/70">Asignación provisional de ejercicio. Verificación exacta de estación pendiente.</p>}
    </div>}

    <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[.025] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">Cálculo parcial ZEUS</p><span className="rounded-full border border-emerald-300/25 px-2 py-1 text-[10px] text-emerald-200">Calculado</span></div><p className="mt-2 text-xl font-black text-white">{pesoConocido.toLocaleString('es-AR')} kg <span className="text-xs font-medium text-slate-500">peso conocido parcial</span></p><p className="mt-1 text-[10px] leading-4 text-slate-400">Incluye 8.936 kg sin combustible + 3.175 kg de combustible interno + sólo cargas cuyo peso está explícito en el Plan. {unknownCount>0?`${unknownCount} carga(s) seleccionada(s) quedan fuera del total por no tener peso verificado en la fuente.`:'No hay cargas sin peso verificado en la selección.'}</p></div>

    <div className="mt-4 rounded-xl border border-white/10 p-3"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Guardar configuración local</p><div className="mt-2 flex gap-2"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej.: CAP D+1" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-cyan-300/50"/><button onClick={save} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100">Guardar</button></div>{saved.length>0&&<select defaultValue="" onChange={e=>{if(e.target.value)loadSaved(e.target.value);e.currentTarget.value=""}} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs text-slate-200"><option value="">Cargar configuración guardada…</option>{saved.map(n=><option key={n} value={n}>{n}</option>)}</select>}</div>
  </div>;
}

export default function Medios3DApp(){
  const [query,setQuery]=useState(""); const [domain,setDomain]=useState("Todos"); const [selected,setSelected]=useState("f16cj50"); const [fichaVisible,setFichaVisible]=useState(true);
  const [configureMode,setConfigureMode]=useState(false); const [selectedStation,setSelectedStation]=useState<number|null>(null); const [loadout,setLoadout]=useState<Loadout>({...presetLoads.LIMPIA});
  const filtered=useMemo(()=>medios.filter(m=>(domain==="Todos"||m.dominio===domain)&&(`${m.nombre} ${m.variante??''} ${m.categoria} ${m.funcion}`.toLowerCase().includes(query.toLowerCase()))),[query,domain]);
  const chosen=medios.find(m=>m.id===selected)??medios[0]; const domains=["Todos",...Array.from(new Set(medios.map(m=>m.dominio)))];
  const groups=Array.from(new Set(filtered.map(m=>`${m.dominio}||${m.categoria}`)));
  const isF16=chosen.id.startsWith("f16");
  const generic3d = chosen.id === "p3" ? {
    title:"P-3 ORION", subtitle:"Aviación naval · guerra antisubmarina", modelRoot:"/models/aircraft/p3orion/", background:"hangar" as const, useTextures:true
  } : chosen.id === "meko360" ? {
    title:"MEKO 360", subtitle:"Destructor · modelo 3D de referencia", modelRoot:"/models/naval/meko360/", background:"ocean" as const, useTextures:false
  } : null;
  const selectVariant=(id:string)=>{setSelected(id);setSelectedStation(null)};
  return <main className="min-h-screen bg-slate-950 text-white">
    <header className="sticky top-0 z-20 border-b border-cyan-300/15 bg-slate-950/90 backdrop-blur-xl"><div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-4 px-5 py-4 lg:px-8"><Link href="/" className="text-2xl font-black tracking-tight">ZEUS</Link><span className="hidden h-7 w-px bg-white/15 sm:block"/><div><p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">ZEUS II</p><p className="text-sm font-bold text-slate-300">Medios 3D · Hangar técnico-operacional</p></div><div className="ml-auto flex gap-2"><Link href="/" className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold uppercase text-slate-300 hover:border-cyan-300/40">Inicio</Link></div></div></header>
    <div className="mx-auto max-w-[1800px] px-5 py-6 lg:px-8">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/[.08] to-transparent p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.32em] text-amber-300">Desarrollo del Plan General</p><h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Hangar de medios</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Biblioteca visual escalable. Cada medio muestra una referencia 2D con nombre y tipo; cuando existe modelo 3D, la misma ficha abre el análisis tridimensional.</p></div><div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar medio..." className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-300/60"/><select value={domain} onChange={e=>setDomain(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-sm">{domains.map(d=><option key={d}>{d}</option>)}</select></div></div></section>

      <div className="mt-6 flex justify-end"><button onClick={()=>setFichaVisible(v=>!v)} className="rounded-lg border border-cyan-300/25 bg-cyan-300/[.04] px-3 py-2 text-xs font-bold text-cyan-100 hover:border-cyan-300/50">{fichaVisible?"Ocultar panel derecho":"Mostrar panel derecho"}</button></div>
      <section className={`mt-3 grid gap-5 ${fichaVisible?"xl:grid-cols-[minmax(0,8fr)_minmax(360px,3fr)]":"grid-cols-1"}`}>
        <div>{isF16?<F16Viewer variante={`${chosen.nombre} ${chosen.variante??''}`} configureMode={configureMode} onConfigureModeChange={v=>{setConfigureMode(v);setSelectedStation(null)}} selectedStation={selectedStation} onSelectStation={setSelectedStation} loadout={loadout}/>:generic3d?<GenericModelViewer title={generic3d.title} subtitle={generic3d.subtitle} modelRoot={generic3d.modelRoot} background={generic3d.background} useTextures={generic3d.useTextures}/>:<ProceduralZeusViewer medio={chosen}/>}</div>
        {fichaVisible&&<div>{isF16?(configureMode?<LoadoutPanel medio={chosen} selectedStation={selectedStation} setSelectedStation={setSelectedStation} loadout={loadout} setLoadout={setLoadout} onClose={()=>{setConfigureMode(false);setSelectedStation(null)}} onSelectVariant={selectVariant}/>:<F16TechnicalPanel medio={chosen} onSelectVariant={selectVariant} onConfigure={()=>setConfigureMode(true)}/>):<div className="h-full rounded-2xl border border-white/10 bg-slate-950/80 p-5"><p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">Ficha técnica</p><h2 className="mt-2 text-3xl font-black">{chosen.nombre}</h2><p className="mt-1 text-slate-400">{chosen.categoria}</p><div className="mt-5 space-y-3 text-sm"><div className="rounded-xl border border-white/10 p-4"><span className="text-slate-500">Función ZEUS</span><p className="mt-1 font-bold">{chosen.funcion}</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/10 p-4"><span className="text-slate-500">Cantidad ZEUS</span><p className="mt-1 font-bold">{chosen.cantidad??'No detallada'}</p></div>{chosen.ubicacion&&<div className="rounded-xl border border-white/10 p-4"><span className="text-slate-500">Ubicación</span><p className="mt-1 font-bold">{chosen.ubicacion}</p></div>}</div>{chosen.datosPlan&&chosen.datosPlan.length>0&&<div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[.22em] text-amber-300">Datos del Plan ZEUS</p><span className="text-[10px] uppercase text-amber-200/60">Plan de Campaña</span></div><div className="grid grid-cols-2 gap-2">{chosen.datosPlan.map(item=><div key={`plan-${item.etiqueta}`} className="rounded-lg border border-amber-300/15 bg-amber-300/[.025] p-3"><p className="text-[10px] uppercase tracking-wider text-amber-200/60">{item.etiqueta}</p><p className="mt-1 text-xs font-bold text-amber-50">{item.valor}</p></div>)}</div></div>}{chosen.especificaciones&&chosen.especificaciones.length>0&&<div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">Especificaciones técnicas</p><span className="text-[10px] uppercase text-slate-500">{chosen.fuenteTecnica??'Referencia técnica'}</span></div><div className="grid grid-cols-2 gap-2">{chosen.especificaciones.map(item=><div key={item.etiqueta} className="rounded-lg border border-white/10 bg-white/[.025] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{item.etiqueta}</p><p className="mt-1 text-xs font-bold text-slate-100">{item.valor}</p></div>)}</div></div>}{chosen.armamentoPlan&&chosen.armamentoPlan.length>0&&<div className="rounded-xl border border-amber-300/20 bg-amber-300/[.035] p-4"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-300">Armamento en Plan ZEUS</p><div className="mt-2 flex flex-wrap gap-2">{chosen.armamentoPlan.map(a=><span key={a} className="rounded-full border border-amber-300/20 bg-slate-900 px-2 py-1 text-[10px] font-bold text-amber-100">{a}</span>)}</div></div>}<div className={`rounded-xl border p-4 ${generic3d?'border-emerald-300/20 bg-emerald-300/[.04]':'border-cyan-300/15 bg-cyan-300/[.03]'}`}><span className={generic3d?'text-emerald-300':'text-cyan-300'}>{nivelText[chosen.nivelModelo]}</span><p className="mt-1 text-xs leading-5 text-slate-300">{generic3d?'Vista tridimensional disponible.':chosen.nivelModelo==='3d-zeus'?'Modelo 3D ZEUS generado para análisis visual y reemplazable por un modelo exacto cuando esté disponible.':'Referencia visual disponible.'}</p>{chosen.id==="meko360"&&<p className="mt-2 text-xs leading-5 text-amber-200/75">Render neutro, sin banderas, matrículas ni identificación nacional.</p>}</div>{chosen.notaTecnica&&<div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.03] p-4 text-xs leading-5 text-slate-400">{chosen.notaTecnica}</div>}</div></div>}</div>}
      </section>

      <section className="mt-8 space-y-8">{groups.map(g=>{const [dom,cat]=g.split('||');const items=filtered.filter(m=>m.dominio===dom&&m.categoria===cat);return <div key={g}><div className="mb-3 flex items-center gap-3"><h3 className="text-sm font-black uppercase tracking-[.22em] text-slate-200">{dom} · <span className="text-cyan-300">{cat}</span></h3><div className="h-px flex-1 bg-white/10"/></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(m=><button key={m.id} onClick={()=>{setSelected(m.id);setConfigureMode(false);setSelectedStation(null);window.scrollTo({top:160,behavior:'smooth'})}} className={`group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-1 ${selected===m.id?'border-cyan-300/70 bg-cyan-400/[.08] shadow-[0_0_0_1px_rgba(103,232,249,.08)]':'border-white/10 bg-slate-900/55 hover:border-cyan-300/35'}`}><div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-slate-950"><img src={m.imagen2d} alt={`${m.nombre} ${m.variante??m.categoria}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"/><div className="absolute left-3 top-3 rounded-full border border-cyan-300/30 bg-slate-950/80 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-cyan-100 backdrop-blur">FOTO REAL</div><div className="absolute right-3 top-3"><span className={`rounded-full border bg-slate-950/80 px-2 py-1 text-[9px] font-black uppercase backdrop-blur ${m.nivelModelo.startsWith('3d')?'border-emerald-400/40 text-emerald-200':m.nivelModelo==='2d-provisional'?'border-cyan-400/35 text-cyan-200':'border-slate-600 text-slate-400'}`}>{nivelText[m.nivelModelo]}</span></div></div><div className="p-4"><p className="text-xl font-black text-white">{m.nombre}</p><p className="mt-1 text-xs font-black uppercase tracking-[.16em] text-cyan-200">{m.variante??m.categoria}</p><p className="mt-3 min-h-10 text-sm leading-5 text-slate-400">{m.funcion}</p><div className="mt-4 flex items-end justify-between text-xs"><span className="text-slate-500">Cantidad: <b className="text-slate-200">{m.cantidad??'—'}</b></span><span className="font-bold text-cyan-300 opacity-0 transition group-hover:opacity-100">Analizar →</span></div></div></button>)}</div></div>})}</section>
    </div>
  </main>;
}
