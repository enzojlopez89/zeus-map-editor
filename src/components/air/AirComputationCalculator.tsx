"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Side = "propio" | "enemigo";
type Metric = { id: string; label: string; unit: string; help: string; weight: number; direction?: "higher" | "lower"; propio: number; enemigo: number };
type CustomMetric = Metric & { category: string };
type Props = { workspaceCode: string; token: string };

const initialMetrics: Record<string, Metric[]> = {
  performance: [
    { id:"velocidad",label:"Velocidad de combate",unit:"km/h",help:"Velocidad sostenible en configuración de combate, no velocidad máxima limpia.",weight:12,propio:1915,enemigo:1500 },
    { id:"autonomia",label:"Autonomía",unit:"h",help:"Tiempo útil de misión en el perfil considerado, sin confundir con alcance de traslado.",weight:10,propio:2,enemigo:2 },
    { id:"peso",label:"Peso de combate",unit:"kg",help:"Peso representativo al inicio del combate. Se usa con el empuje para obtener la relación empuje/peso.",weight:5,direction:"lower",propio:37200,enemigo:32000 },
    { id:"radio",label:"Radio de combate",unit:"km",help:"Distancia de ida y regreso con reserva y carga militar representativa.",weight:10,propio:380,enemigo:380 },
    { id:"techo",label:"Techo de combate",unit:"ft",help:"Altitud operacional máxima utilizable en combate.",weight:5,propio:50000,enemigo:59000 },
    { id:"aceleracion",label:"Capacidad de aceleración",unit:"escala 0–4",help:"0 sin capacidad; 4 capacidad sobresaliente. Basar en datos técnicos o juicio experto documentado.",weight:15,propio:2,enemigo:3 },
    { id:"gmax",label:"Capacidad máxima G",unit:"G",help:"Límite estructural/operacional utilizable en configuración de combate.",weight:5,propio:9,enemigo:9 },
    { id:"reabastecimiento",label:"Reabastecimiento en vuelo",unit:"0–1",help:"1 disponible e integrado; 0,5 limitado; 0 no disponible.",weight:10,propio:1,enemigo:1 },
    { id:"empuje",label:"Empuje máximo",unit:"kgf",help:"Empuje total disponible. La relación empuje/peso se calcula internamente.",weight:13,propio:17750,enemigo:18342 },
    { id:"factor",label:"Factor de combate",unit:"índice",help:"Factor doctrinario/global del sistema. Use 1 como referencia; documente valores mayores o menores.",weight:30,propio:.95,enemigo:1.12 },
  ],
  avionica: [
    { id:"radar_alcance",label:"Alcance radar de control de tiro",unit:"km",help:"Alcance útil de detección/seguimiento contra el blanco considerado.",weight:40,propio:150,enemigo:90 },
    { id:"radar_angulo",label:"Cobertura angular radar",unit:"grados",help:"Sector efectivo de búsqueda y seguimiento.",weight:30,propio:120,enemigo:120 },
    { id:"tws",label:"Track While Scan",unit:"0–1",help:"1 disponible; 0,5 parcial; 0 ausente.",weight:20,propio:1,enemigo:1 },
    { id:"sar",label:"Modo SAR / mapeo",unit:"0–1",help:"Capacidad de generación de imagen radar para navegación/ataque.",weight:10,propio:1,enemigo:1 },
    { id:"nav",label:"Navegación y ataque integrada",unit:"0–1",help:"INS/GPS, HUD/HOTAS, computadora de misión y sensores integrados.",weight:35,propio:1,enemigo:.75 },
    { id:"situacional",label:"Conciencia situacional",unit:"0–1",help:"Data link, IFF, HSD y presentación táctica integrada.",weight:25,propio:1,enemigo:.5 },
    { id:"guerra_electronica",label:"Guerra electrónica defensiva",unit:"0–1",help:"RWR, jammer y dispensadores integrados.",weight:30,propio:1,enemigo:.7 },
    { id:"planeamiento",label:"Planeamiento de misión",unit:"0–1",help:"Sistema de planificación, carga de datos e inteligencia de imágenes.",weight:10,propio:1,enemigo:.5 },
  ],
  aireAire: [
    { id:"ir_alcance",label:"Misil IR — alcance efectivo",unit:"km",help:"Alcance efectivo, no alcance cinemático máximo.",weight:12,propio:10,enemigo:8 },
    { id:"ir_pk",label:"Misil IR — probabilidad de derribo",unit:"0–1",help:"Pk estimada bajo condiciones del escenario.",weight:12,propio:.8,enemigo:.6 },
    { id:"bvr_alcance",label:"Misil BVR — alcance efectivo",unit:"km",help:"Alcance útil contra el blanco y geometría seleccionados.",weight:50,propio:60,enemigo:32 },
    { id:"bvr_pk",label:"Misil BVR — probabilidad de derribo",unit:"0–1",help:"Pk estimada, incluyendo contramedidas y reglas de empleo.",weight:25,propio:.7,enemigo:.4 },
    { id:"canon",label:"Cañón — factor letal",unit:"índice",help:"Índice compuesto de calibre, cadencia, velocidad y masa de proyectil.",weight:3,propio:4.05,enemigo:4.05 },
  ],
  aireSuperficie: [
    { id:"bomba_pg",label:"Bomba propósito general",unit:"0–1",help:"Disponibilidad y aptitud contra el objetivo. 1 plena, 0,5 limitada, 0 ausente.",weight:7,propio:1,enemigo:1 },
    { id:"bomba_ir",label:"Bomba guiada IR",unit:"0–1",help:"Disponibilidad real y compatibilidad con el sistema de armas.",weight:23,propio:0,enemigo:0 },
    { id:"bomba_laser",label:"Bomba guiada láser",unit:"0–1",help:"Incluya disponibilidad de designación y restricciones meteorológicas.",weight:30,propio:1,enemigo:0 },
    { id:"bomba_gps",label:"Bomba INS/GPS",unit:"0–1",help:"Disponibilidad y aptitud todo tiempo.",weight:40,propio:1,enemigo:0 },
    { id:"misil_ir",label:"Misil A/S infrarrojo",unit:"0–1",help:"Disponibilidad y compatibilidad.",weight:25,propio:1,enemigo:1 },
    { id:"antirradiacion",label:"Misil antirradiación",unit:"0–1",help:"Disponibilidad, alcance y aptitud SEAD.",weight:50,propio:1,enemigo:0 },
    { id:"misil_laser",label:"Misil guiado láser",unit:"0–1",help:"Disponibilidad y capacidad de designación.",weight:25,propio:0,enemigo:0 },
  ],
};

const weatherInitial: Metric[] = [
  { id:"todo_tiempo",label:"Capacidad todo tiempo",unit:"0–1",help:"1: día/noche e IMC con adquisición y ataque; 0,5: capacidad parcial; 0: requiere VMC.",weight:35,propio:1,enemigo:.6 },
  { id:"visibilidad",label:"Visibilidad mínima requerida",unit:"km",help:"Menor es mejor. Use el mínimo que permite cumplir la misión, no solo volar.",weight:20,direction:"lower",propio:1,enemigo:5 },
  { id:"techo_nubes",label:"Techo de nubes mínimo requerido",unit:"ft",help:"Base nubosa mínima compatible con adquisición, ataque y recuperación.",weight:15,direction:"lower",propio:500,enemigo:2000 },
  { id:"viento",label:"Viento cruzado máximo",unit:"kt",help:"Componente máximo admisible para operar desde la base prevista.",weight:10,propio:25,enemigo:20 },
  { id:"precipitacion",label:"Tolerancia a precipitación intensa",unit:"0–1",help:"1 sin limitación significativa; 0,5 limitada; 0 no apta.",weight:10,propio:.8,enemigo:.5 },
  { id:"engelamiento",label:"Protección contra engelamiento",unit:"0–1",help:"1 completa; 0,5 parcial; 0 ausente.",weight:10,propio:1,enemigo:.5 },
];

function ratio(value:number, reference:number, direction:"higher"|"lower"="higher") { if (value<=0 || reference<=0) return 0; return direction==="lower" ? reference/value : value/reference; }
function sectionScore(metrics:Metric[], side:Side) { const other:Side=side==="propio"?"enemigo":"propio"; const total=metrics.reduce((s,m)=>s+m.weight,0)||1; return metrics.reduce((s,m)=>s+Math.min(2,Math.max(0,ratio(m[side],m[other],m.direction)))*m.weight,0)/total*100; }

export default function AirComputationCalculator({workspaceCode,token}:Props){
 const [metrics,setMetrics]=useState(initialMetrics); const [weather,setWeather]=useState(weatherInitial); const [custom,setCustom]=useState<CustomMetric[]>([]);
 const [aircraft,setAircraft]=useState({propio:"F-16C Block 40",enemigo:"MiG-29"});
 const [comparisonName,setComparisonName]=useState("Confrontación principal");
 const [sorties,setSorties]=useState({propio:120,enemigo:80}); const [survival,setSurvival]=useState({propio:.8897,enemigo:.7922}); const [status,setStatus]=useState("Sin guardar");
 const results=useMemo(()=>{ const p=sectionScore(metrics.performance,"propio"),a=sectionScore(metrics.avionica,"propio"),aa=sectionScore(metrics.aireAire,"propio"),as=sectionScore(metrics.aireSuperficie,"propio"); const ep=sectionScore(metrics.performance,"enemigo"),ea=sectionScore(metrics.avionica,"enemigo"),eaa=sectionScore(metrics.aireAire,"enemigo"),eas=sectionScore(metrics.aireSuperficie,"enemigo"); const wp=sectionScore(weather,"propio")/100,we=sectionScore(weather,"enemigo")/100; const cp=custom.length?sectionScore(custom,"propio")/100:1,ce=custom.length?sectionScore(custom,"enemigo")/100:1; const propio=(p*.15+a*.30+aa*.30+as*.25)*(sorties.propio/Math.max(sorties.enemigo,1))*survival.propio*wp*cp; const enemigo=(ep*.15+ea*.30+eaa*.30+eas*.25)*(sorties.enemigo/Math.max(sorties.propio,1))*survival.enemigo*we*ce; return {p,a,aa,as,ep,ea,eaa,eas,propio,enemigo,ratio:propio/Math.max(enemigo,.01)}},[metrics,weather,custom,sorties,survival]);
 function update(section:string,id:string,side:Side,value:number){setMetrics(old=>({...old,[section]:old[section].map(m=>m.id===id?{...m,[side]:value}:m)}))}
 async function save(){setStatus("Guardando..."); const content={version:"air-computation-v2",title:"Cómputo Aéreo ZEUS I",status:"borrador",comparisonName,aircraft,metrics,weather,custom,sorties,survival}; const r=await fetch(`/api/workspaces/${workspaceCode}/pcr/save`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,analysisKey:"computo-aereo-principal",content,result:results})}); const j=await r.json(); setStatus(r.ok&&j.ok?`Guardado · versión ${j.version}`:(j.error||"Error al guardar"));}
 useEffect(()=>{(async()=>{try{const r=await fetch(`/api/workspaces/${workspaceCode}/pcr/load`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,analysisKey:"computo-aereo-principal"})}); const j=await r.json(); const c=j.analysis?.content; if(c?.version==="air-computation-v1"||c?.version==="air-computation-v2"){if(c.aircraft)setAircraft(c.aircraft);if(c.comparisonName)setComparisonName(c.comparisonName);setMetrics(c.metrics);setWeather(c.weather);setCustom(c.custom||[]);setSorties(c.sorties);setSurvival(c.survival);setStatus(`Cargado · versión ${j.analysis.version}`)}}catch{}})()},[workspaceCode,token]);
 const sections=[{key:"performance",title:"Performance"},{key:"avionica",title:"Aviónica"},{key:"aireAire",title:"Armamento aire-aire"},{key:"aireSuperficie",title:"Armamento aire-superficie"}];
 return <main className="min-h-screen bg-slate-950 p-4 text-white"><div className="mx-auto max-w-7xl">
  <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">A3 · EJERCICIO ZEUS</p><h1 className="text-2xl font-bold">Cómputo Aéreo</h1><p className="text-sm text-slate-300">Formulario independiente del PCR. Los cálculos intermedios del Excel están integrados y no se muestran como filas.</p></div><div className="flex gap-2"><Link href={`/espacio/${workspaceCode}/${token}`} className="rounded bg-slate-700 px-3 py-2">Mapa</Link><Link href={`/espacio/${workspaceCode}/${token}/ppc/pcr`} className="rounded bg-violet-700 px-3 py-2">Cálculo PCR</Link><button onClick={save} className="rounded bg-emerald-700 px-4 py-2 font-bold">Guardar</button></div></header>
  <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-emerald-300">{status}</div>
  <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
   <h2 className="mb-4 text-center text-xl font-bold">Aeronaves a confrontar</h2>
   <label className="mb-4 block text-left text-sm font-bold">Nombre de la comparación
    <input value={comparisonName} onChange={e=>setComparisonName(e.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-3 text-center" placeholder="Ej.: F-16C contra MiG-29"/>
   </label>
   <div className="grid gap-4 md:grid-cols-2">
    <label className="text-center font-bold text-blue-300">Aeronave propia
     <input list="aeronaves-propias" value={aircraft.propio} onChange={e=>setAircraft(v=>({...v,propio:e.target.value}))} className="mt-2 w-full rounded border border-blue-700 bg-slate-950 p-3 text-center text-white" placeholder="Escriba o seleccione una aeronave"/>
    </label>
    <label className="text-center font-bold text-red-300">Aeronave enemiga
     <input list="aeronaves-enemigas" value={aircraft.enemigo} onChange={e=>setAircraft(v=>({...v,enemigo:e.target.value}))} className="mt-2 w-full rounded border border-red-700 bg-slate-950 p-3 text-center text-white" placeholder="Escriba o seleccione una aeronave"/>
    </label>
   </div>
   <datalist id="aeronaves-propias"><option value="F-16C Block 40"/><option value="F-16D Block 42"/><option value="F-16CJ Block 50"/><option value="AMX A-1M"/><option value="T-6 Texan II"/><option value="IAI Harpy"/></datalist>
   <datalist id="aeronaves-enemigas"><option value="MiG-29"/><option value="Su-30"/><option value="Su-25"/><option value="JF-17"/><option value="Mirage 2000"/></datalist>
   <p className="mt-3 text-left text-xs text-slate-400">Los nombres pueden escribirse libremente. Se guardan junto con todos los valores, variables y resultados de esta confrontación.</p>
  </section>
  <section className="mb-5 grid gap-3 md:grid-cols-3"><Result label={`Índice propio · ${aircraft.propio||"Sin definir"}`} value={results.propio}/><Result label={`Índice enemigo · ${aircraft.enemigo||"Sin definir"}`} value={results.enemigo}/><Result label="Relación propia/enemiga" value={results.ratio}/></section>
  {sections.map(s=><Section key={s.key} title={s.title} metrics={metrics[s.key]} onChange={(id,side,v)=>update(s.key,id,side,v)}/>) }
  <Section title="Meteorología operacional" metrics={weather} onChange={(id,side,v)=>setWeather(old=>old.map(m=>m.id===id?{...m,[side]:v}:m))}/>
  <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4"><h2 className="mb-3 text-center text-xl font-bold">Generación de salidas y supervivencia</h2><div className="grid gap-3 md:grid-cols-2"><Pair label="Salidas posibles en el período" unit="salidas" values={sorties} set={setSorties}/><Pair label="Probabilidad de supervivencia" unit="0–1" values={survival} set={setSurvival}/></div></section>
  <section className="rounded-xl border border-slate-700 bg-slate-900 p-4"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Variables adicionales</h2><button onClick={()=>setCustom(c=>[...c,{id:crypto.randomUUID(),category:"Adicional",label:"Nueva variable",unit:"índice",help:"Defina el criterio y documente la fuente.",weight:10,propio:1,enemigo:1}])} className="rounded bg-cyan-700 px-3 py-2">+ Agregar variable</button></div>{custom.map((m,i)=><div key={m.id} className="mt-3 grid gap-2 rounded border border-slate-700 p-3 md:grid-cols-6"><input className="rounded bg-slate-800 p-2 md:col-span-2" value={m.label} onChange={e=>setCustom(c=>c.map(x=>x.id===m.id?{...x,label:e.target.value}:x))}/><input type="number" className="rounded bg-slate-800 p-2 text-center" value={m.propio} onChange={e=>setCustom(c=>c.map(x=>x.id===m.id?{...x,propio:Number(e.target.value)}:x))}/><input type="number" className="rounded bg-slate-800 p-2 text-center" value={m.enemigo} onChange={e=>setCustom(c=>c.map(x=>x.id===m.id?{...x,enemigo:Number(e.target.value)}:x))}/><input type="number" className="rounded bg-slate-800 p-2 text-center" value={m.weight} onChange={e=>setCustom(c=>c.map(x=>x.id===m.id?{...x,weight:Number(e.target.value)}:x))}/><button onClick={()=>setCustom(c=>c.filter(x=>x.id!==m.id))} className="rounded bg-red-800">Eliminar</button></div>)}</section>
 </div></main>
}
function Result({label,value}:{label:string,value:number}){return <div className="rounded-xl border border-cyan-800 bg-cyan-950/30 p-4 text-center"><p className="text-sm text-cyan-200">{label}</p><p className="text-3xl font-bold">{Number.isFinite(value)?value.toFixed(2):"0.00"}</p></div>}
function Section({title,metrics,onChange}:{title:string,metrics:Metric[],onChange:(id:string,side:Side,v:number)=>void}){return <details open className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4"><summary className="cursor-pointer text-center text-xl font-bold">{title}</summary><div className="mt-4 grid gap-3 lg:grid-cols-2">{metrics.map(m=><div key={m.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3"><h3 className="text-left font-bold">{m.label}</h3><p className="mb-3 text-left text-xs text-slate-400">{m.help}</p><div className="grid grid-cols-2 gap-3"><label className="text-center text-sm">Propio<input type="number" step="any" value={m.propio} onChange={e=>onChange(m.id,"propio",Number(e.target.value))} className="mt-1 w-full rounded border border-blue-700 bg-slate-900 p-2 text-center"/><span className="text-xs text-slate-400">{m.unit}</span></label><label className="text-center text-sm">Enemigo<input type="number" step="any" value={m.enemigo} onChange={e=>onChange(m.id,"enemigo",Number(e.target.value))} className="mt-1 w-full rounded border border-red-700 bg-slate-900 p-2 text-center"/><span className="text-xs text-slate-400">{m.unit}</span></label></div></div>)}</div></details>}
function Pair({label,unit,values,set}:{label:string,unit:string,values:{propio:number,enemigo:number},set:React.Dispatch<React.SetStateAction<{propio:number,enemigo:number}>>}){return <div className="rounded border border-slate-700 p-3"><h3 className="mb-2 text-left font-bold">{label}</h3><div className="grid grid-cols-2 gap-3">{(["propio","enemigo"] as Side[]).map(s=><label key={s} className="text-center capitalize">{s}<input type="number" step="any" value={values[s]} onChange={e=>set(v=>({...v,[s]:Number(e.target.value)}))} className="mt-1 w-full rounded bg-slate-800 p-2 text-center"/><span className="text-xs text-slate-400">{unit}</span></label>)}</div></div>}
