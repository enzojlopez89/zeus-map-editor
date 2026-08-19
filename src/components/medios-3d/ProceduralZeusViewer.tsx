"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Medio3D } from "@/data/medios3d";

type V3=[number,number,number];
type Part={verts:V3[];faces:number[][];color:string};
type P2={x:number;y:number;z:number};
type Axis="x"|"y"|"z";

const C={body:"#9aa6b5",dark:"#475569",glass:"#15243a",wing:"#7f8b99",accent:"#4dd8e8",black:"#101827",ground:"#46515e",green:"#4b5f45",sand:"#76715e",navy:"#667788"};

function box(cx:number,cy:number,cz:number,sx:number,sy:number,sz:number,color=C.body):Part{
 const x=sx/2,y=sy/2,z=sz/2;return{color,verts:[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]].map(v=>[v[0]+cx,v[1]+cy,v[2]+cz] as V3),faces:[[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]]}
}
function frustum(cx:number,cy:number,z0:number,z1:number,r0:number,r1:number,color=C.body,n=8):Part{
 const verts:V3[]=[];for(let i=0;i<n;i++){const a=i*Math.PI*2/n;verts.push([cx+Math.cos(a)*r0,cy+Math.sin(a)*r0,z0]);}for(let i=0;i<n;i++){const a=i*Math.PI*2/n;verts.push([cx+Math.cos(a)*r1,cy+Math.sin(a)*r1,z1]);}const faces:number[][]=[];faces.push(Array.from({length:n},(_,i)=>n-1-i));faces.push(Array.from({length:n},(_,i)=>n+i));for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,n+j,n+i]);}return{verts,faces,color};
}
function prism(poly:[number,number][],y:number,t:number,color=C.wing):Part{const verts:V3[]=[];for(const[x,z]of poly)verts.push([x,y-t/2,z]);for(const[x,z]of poly)verts.push([x,y+t/2,z]);const n=poly.length,faces:number[][]=[Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>n+i)];for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,n+j,n+i]);}return{verts,faces,color};}
function rotor(y:number,z:number,span:number,color="#c5ced9"){return [box(0,y,z,span,.035,.14,color),box(0,y,z,.14,.035,span,color)];}
function wheels(z:number,span:number,y=-.55){return [box(-span,y,z,.18,.38,.18,C.black),box(span,y,z,.18,.38,.18,C.black)];}


function verticalPrism(poly:[number,number][],x:number,t:number,color=C.dark):Part{
 const verts:V3[]=[];
 for(const[y,z]of poly)verts.push([x-t/2,y,z]);
 for(const[y,z]of poly)verts.push([x+t/2,y,z]);
 const n=poly.length,faces:number[][]=[Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>n+i)];
 for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,n+j,n+i]);}
 return{verts,faces,color};
}

function t6Model():Part[]{
 const p:Part[]=[];
 // Fuselaje estilizado sobre proporciones del T-6: morro largo, cabina tándem y cola estrecha.
 p.push(frustum(0,0,-3.55,-2.75,.10,.42,C.body,12));
 p.push(frustum(0,0,-2.75,1.95,.42,.48,C.body,12));
 p.push(frustum(0,0,1.95,3.25,.48,.12,C.body,12));
 // Ala baja, ligeramente trapezoidal y con puntas estrechas.
 p.push(prism([[-.20,-.35],[-3.05,.15],[-2.85,.78],[-.45,.55]],-.08,.10,C.wing));
 p.push(prism([[.20,-.35],[3.05,.15],[2.85,.78],[.45,.55]],-.08,.10,C.wing));
 // Estabilizador horizontal.
 p.push(prism([[-.10,2.15],[-1.25,2.62],[-1.05,2.92],[-.18,2.70]],.10,.07,C.wing));
 p.push(prism([[.10,2.15],[1.25,2.62],[1.05,2.92],[.18,2.70]],.10,.07,C.wing));
 // Deriva vertical real, no una placa horizontal.
 p.push(verticalPrism([[.28,2.05],[1.28,2.48],[1.18,3.08],[.22,2.78]],0,.09,C.dark));
 // Cabina tándem con dos volúmenes y arco central.
 p.push(frustum(0,.32,-1.45,-.62,.30,.38,C.glass,10));
 p.push(frustum(0,.35,-.62,.18,.38,.31,C.glass,10));
 p.push(box(0,.56,-.60,.48,.08,.08,C.dark));
 // Toma inferior y salida del turbohélice.
 p.push(box(0,-.40,-2.05,.55,.22,.62,C.dark));
 p.push(frustum(0,0,-3.72,-3.52,.05,.18,C.dark,10));
 // Hélice de cuatro palas y cono.
 p.push(box(0,0,-3.82,2.25,.08,.10,"#cbd5e1"));
 p.push(box(0,0,-3.82,.08,2.25,.10,"#cbd5e1"));
 p.push(frustum(0,0,-3.98,-3.80,.03,.16,"#d7dee8",10));
 // Tren simple para dar lectura tridimensional al perfil.
 p.push(box(-.72,-.62,.25,.12,.70,.12,C.dark),box(.72,-.62,.25,.12,.70,.12,C.dark));
 p.push(box(-.72,-.98,.25,.28,.22,.18,C.black),box(.72,-.98,.25,.28,.22,.18,C.black));
 p.push(box(0,-.54,-2.35,.10,.48,.10,C.dark),box(0,-.78,-2.35,.20,.18,.16,C.black));
 // Raíces y carenados para que deje de verse como bloques planos.
 p.push(frustum(-.58,-.10,-.05,.70,.18,.24,C.dark,8));
 p.push(frustum(.58,-.10,-.05,.70,.18,.24,C.dark,8));
 return p;
}

function jetModel(id:string):Part[]{
 const p:Part[]=[frustum(0,0,-3.3,2.6,.22,.62,C.body),frustum(0,0,2.6,3.35,.62,.08,C.body),prism([[-.18,-.8],[-2.5,.65],[-2.25,1.15],[-.35,.55]],-.04,.08,C.wing),prism([[.18,-.8],[2.5,.65],[2.25,1.15],[.35,.55]],-.04,.08,C.wing),prism([[-.08,1.8],[-.95,2.75],[-.8,3.05],[-.12,2.55]],.15,.07,C.wing),prism([[.08,1.8],[.95,2.75],[.8,3.05],[.12,2.55]],.15,.07,C.wing),prism([[-.06,1.6],[-.15,2.65],[-.1,2.95],[.1,2.4]],.65,.08,C.dark),box(0,.42,-1.05,.62,.3,1.05,C.glass)];
 if(id==="amx"){p.push(box(-.45,-.22,1.75,.3,.3,1.4,C.dark),box(.45,-.22,1.75,.3,.3,1.4,C.dark));}
 if(id==="t6"){p.splice(0,p.length);p.push(...t6Model());}
 return p;
}
function propPlane(id:string):Part[]{
 const long=id==="s2t"?3.6:id==="dhc6"?3.7:3.1; const p:Part[]=[frustum(0,0,-long,long*.72,.18,.55,C.body),frustum(0,0,long*.72,long,.55,.08,C.body),prism([[-.2,-.2],[-2.65,.55],[-2.5,1.0],[-.35,.55]],0,.09,C.wing),prism([[.2,-.2],[2.65,.55],[2.5,1.0],[.35,.55]],0,.09,C.wing),prism([[-.12,1.6],[-1.0,2.45],[-.82,2.7],[-.18,2.3]],.12,.07,C.wing),prism([[.12,1.6],[1.0,2.45],[.82,2.7],[.18,2.3]],.12,.07,C.wing),prism([[-.07,1.55],[-.16,2.6],[.14,2.4],[.1,1.7]],.65,.08,C.dark),box(0,.38,-1.0,.55,.28,.9,C.glass)];
 const engines=id==="dhc6"||id==="s2t"?[-1.25,1.25]:[0];for(const x of engines){p.push(frustum(x,-.02,-.15,.65,.23,.28,C.dark),...rotor(-.02,-.25,.95));}
 return p;
}
function transportModel(id:string):Part[]{
 const four=id.includes("130"); const jet=id==="kc135"||id==="e99m"||id==="lj60"; const p:Part[]=[];
 p.push(frustum(0,0,-4.5,3.8,.35,.72,C.body),frustum(0,0,3.8,4.55,.72,.1,C.body));
 p.push(prism([[-.25,-.25],[-3.8,.5],[-3.5,1.2],[-.35,.65]],0,.12,C.wing),prism([[.25,-.25],[3.8,.5],[3.5,1.2],[.35,.65]],0,.12,C.wing));
 p.push(prism([[-.15,2.7],[-1.35,3.65],[-1.1,3.95],[-.2,3.55]],.15,.08,C.wing),prism([[.15,2.7],[1.35,3.65],[1.1,3.95],[.2,3.55]],.15,.08,C.wing),prism([[-.08,2.5],[-.14,3.85],[.16,3.65],[.1,2.65]],.9,.1,C.dark),box(0,.42,-2.9,.7,.28,1.0,C.glass));
 const ex=four?[-2.15,-1.15,1.15,2.15]:jet?[-2.2,-1.2,1.2,2.2]:[-1.5,1.5];for(const x of ex){p.push(frustum(x,-.28,.25,1.1,.22,.28,C.dark));if(four)p.push(...rotor(-.28,.05,.75));}
 if(id==="e99m")p.push(box(0,1.05,.2,3.2,.18,.5,C.dark));
 if(id==="ec130h")p.push(box(-.85,.5,2.7,.25,.28,1.1,C.dark),box(.85,.5,2.7,.25,.28,1.1,C.dark));
 if(id==="kc130j")p.push(box(-2.65,-.35,.55,.32,.28,1.4,C.dark),box(2.65,-.35,.55,.32,.28,1.4,C.dark));
 if(id==="kc135")p.push(box(0,-.42,2.6,.08,.08,2.4,C.dark));
 return p;
}
function uavModel(id:string):Part[]{const span=id==="harpy"?2.9:3.7;const p=[frustum(0,0,-2.1,1.6,.12,.35,C.body),frustum(0,0,1.6,2.0,.35,.08,C.body),prism([[-.12,-.2],[-span,.65],[-span*.85,1.15],[-.3,.55]],0,.06,C.wing),prism([[.12,-.2],[span,.65],[span*.85,1.15],[.3,.55]],0,.06,C.wing),prism([[-.06,1.0],[-.7,1.7],[-.55,1.9],[-.1,1.55]],.08,.05,C.wing),prism([[.06,1.0],[.7,1.7],[.55,1.9],[.1,1.55]],.08,.05,C.wing)];if(id==="hermes450")p.push(box(0,-.34,-1.4,.35,.35,.4,C.dark));return p;}
function heliModel(id:string):Part[]{
 const tandem=id==="ch47"; const p:Part[]=[];if(tandem){p.push(box(0,0,0,1.15,1.0,4.7,C.body),frustum(0,0,-2.8,-2.1,.1,.58,C.body),frustum(0,.15,2.3,2.85,.58,.15,C.body),box(0,.72,1.6,.35,1.25,.75,C.dark),...rotor(.95,-1.75,3.4),...rotor(1.3,1.75,3.4));}else{p.push(frustum(0,0,-2.5,1.8,.18,.6,C.body),frustum(0,0,1.8,2.75,.6,.08,C.body),box(0,.4,-1.4,.72,.36,.9,C.glass),...rotor(.85,0,3.5),box(.15,.1,2.2,.1,.1,1.6,C.dark),box(.15,.1,3.0,1.0,.08,.08,C.dark));}p.push(...wheels(.5,.5,-.65));return p;
}
function vehicleModel(id:string):Part[]{const truck=id==="unimog"||id.startsWith("camion")||id==="sprinter";const p=[box(0,0,0,truck?2.0:1.9,.75,truck?3.8:3.2,id==="amarok"?"#6f7d72":C.ground),box(0,.62,-.65,truck?1.8:1.75,.65,1.3,C.body),box(0,.76,-1.18,1.55,.3,.55,C.glass),...wheels(-.9,.78,-.55),...wheels(1.05,.78,-.55)];return p;}
function radarModel(id:string):Part[]{const p=vehicleModel("unimog");p.push(box(0,1.15,.7,.45,1.1,.45,C.dark));if(id==="tps77"||id==="gm400")p.push(box(0,2.0,.7,2.6,1.15,.18,C.navy));return p;}
function samModel(id:string):Part[]{const p=vehicleModel("unimog");if(id==="patriot")for(let i=0;i<4;i++)p.push(box(-.65+i*.43,1.05,.65,.34,.34,2.4,C.green));else if(id==="nasams")for(let i=0;i<3;i++)p.push(box(-.5+i*.5,1.0,.65,.42,.38,2.1,C.green));else if(id==="rbs70")p.push(box(0,1.15,.25,.25,.25,1.6,C.green),box(0,1.65,-.2,.8,.15,.8,C.dark));else p.push(box(-.55,.8,.45,.25,.25,2.1,C.dark),box(.55,.8,.45,.25,.25,2.1,C.dark),box(0,1.4,.4,1.4,.12,1.0,C.navy));return p;}
function shipModel(id:string):Part[]{const len=id==="bouchard"?5.3:id==="sigma"?6.2:5.8;const p=[prism([[-1.0,-len/2],[-.65,len/2],[.65,len/2],[1.0,-len/2]],-.2,.65,C.navy),box(0,.45,.2,1.1,.8,2.3,C.body),box(0,1.0,-.35,.72,.6,.75,C.body),box(0,1.55,-.15,.08,1.6,.08,C.dark),box(0,.75,-2.1,.15,.15,1.1,C.dark)];if(id==="meko140"||id==="drummond"||id==="sigma")p.push(box(-.45,.7,1.4,.35,.35,1.0,C.dark),box(.45,.7,1.4,.35,.35,1.0,C.dark));return p;}
function submarineModel():Part[]{return[frustum(0,0,-3.4,3.4,.1,.7,C.navy),frustum(0,0,3.4,4.0,.7,.05,C.navy),box(0,.72,.2,.65,.75,1.0,C.dark),prism([[-.08,2.2],[-1.3,2.7],[-1.1,3.0],[-.1,2.6]],0,.07,C.wing),prism([[.08,2.2],[1.3,2.7],[1.1,3.0],[.1,2.6]],0,.07,C.wing)];}
function buildModel(m:Medio3D):Part[]{
 if(["amx"].includes(m.id))return jetModel(m.id);if(m.id==="t6")return t6Model();if(["dhc6","s2t"].includes(m.id))return propPlane(m.id);if(["e99m","ec130h","c130j","kc130j","kc135","lj60"].includes(m.id))return transportModel(m.id);if(["harpy","hermes450"].includes(m.id))return uavModel(m.id);if(["ch47","uh1y","b412"].includes(m.id))return heliModel(m.id);if(["tps77","gm400"].includes(m.id))return radarModel(m.id);if(["patriot","nasams","skyguard","rbs70"].includes(m.id))return samModel(m.id);if(["landcruiser","sprinter","amarok","unimog","camion20","camion5"].includes(m.id))return vehicleModel(m.id);if(["meko140","drummond","sigma","bouchard"].includes(m.id))return shipModel(m.id);if(["tipo209","tr1700"].includes(m.id))return submarineModel();return jetModel(m.id);
}

function rotate([x,y,z]:V3,rx:number,ry:number,rz:number):V3{let c=Math.cos(rx),s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(rz);s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];return[x,y,z];}
function hexShade(hex:string,k:number){const h=hex.replace('#','');if(h.length!==6)return hex;const n=parseInt(h,16),r=Math.max(0,Math.min(255,((n>>16)&255)*k)),g=Math.max(0,Math.min(255,((n>>8)&255)*k)),b=Math.max(0,Math.min(255,(n&255)*k));return`rgb(${r|0},${g|0},${b|0})`;}

export default function ProceduralZeusViewer({medio}:{medio:Medio3D}){
 const canvasRef=useRef<HTMLCanvasElement|null>(null),boxRef=useRef<HTMLDivElement|null>(null);const rot=useRef({x:-.18,y:.65,z:0}),zoom=useRef(1),pan=useRef({x:0,y:0}),drag=useRef<{x:number;y:number}|null>(null);const[auto,setAuto]=useState(true),[axis,setAxis]=useState<Axis>("y"),[speed,setSpeed]=useState(.22),[move,setMove]=useState(false),[fullscreen,setFullscreen]=useState(false);const parts=useMemo(()=>buildModel(medio),[medio]);
 useEffect(()=>{rot.current={x:-.18,y:.65,z:0};zoom.current=1;pan.current={x:0,y:0}},[medio.id]);
 useEffect(()=>{const f=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener("fullscreenchange",f);return()=>document.removeEventListener("fullscreenchange",f)},[]);
 useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const wheel=(e:WheelEvent)=>{e.preventDefault();zoom.current=Math.max(.45,Math.min(2.7,zoom.current*(e.deltaY>0?.92:1.08)));};canvas.addEventListener("wheel",wheel,{passive:false});return()=>canvas.removeEventListener("wheel",wheel)},[]);
 useEffect(()=>{let raf=0,last=performance.now();const draw=(now:number)=>{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(auto){const dt=(now-last)/1000;rot.current[axis]+=dt*speed;}last=now;
 const faceDraw:{pts:P2[];depth:number;color:string}[]=[];const scale=Math.min(w,h)*.105*zoom.current;const cx=w/2+pan.current.x,cy=h/2+pan.current.y;for(const part of parts){const tr=part.verts.map(v=>rotate(v,rot.current.x,rot.current.y,rot.current.z));for(const face of part.faces){const vv=face.map(i=>tr[i]);const a=vv[0],b=vv[1],c=vv[2],ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1,light=.48+.52*Math.max(0,(nx*.25+ny*.75+nz*-.25)/l);const pts=vv.map(([x,y,z])=>{const persp=8/(8+z*.13);return{x:cx+x*scale*persp,y:cy-y*scale*persp,z}});faceDraw.push({pts,depth:vv.reduce((s,v)=>s+v[2],0)/vv.length,color:hexShade(part.color,light)});}}
 faceDraw.sort((a,b)=>b.depth-a.depth);for(const f of faceDraw){ctx.beginPath();ctx.moveTo(f.pts[0].x,f.pts[0].y);for(let i=1;i<f.pts.length;i++)ctx.lineTo(f.pts[i].x,f.pts[i].y);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle="rgba(4,12,24,.28)";ctx.lineWidth=.7;ctx.stroke();}raf=requestAnimationFrame(draw)};raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf)},[parts,auto,axis,speed]);
 const bg=medio.dominio==="Naval"?"linear-gradient(rgba(2,12,24,.1),rgba(2,12,24,.48)),linear-gradient(#526d82 0 49%,#234b65 50%,#071726 100%)":medio.dominio==="Defensa aeroespacial"||medio.dominio==="Logística"?"linear-gradient(rgba(2,10,18,.35),rgba(2,10,18,.55)),url('/images/medios3d/hangar-ficticio-v23.jpg') center/cover":"linear-gradient(rgba(2,10,18,.18),rgba(2,10,18,.35)),url('/images/medios3d/hangar-ficticio-v23.jpg') center/cover";
 return <div ref={boxRef} className="overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950 shadow-2xl"><div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950/95 p-3 text-xs"><button onClick={()=>setAuto(v=>!v)} className={`rounded-lg border px-3 py-2 font-black ${auto?'border-emerald-400/50 bg-emerald-400/10 text-emerald-200':'border-white/15 text-slate-300'}`}>AUTO ROTACIÓN</button><select value={axis} onChange={e=>setAxis(e.target.value as Axis)} className="rounded-lg border border-white/15 bg-slate-900 px-2 py-2"><option value="x">Eje X</option><option value="y">Eje Y</option><option value="z">Eje Z</option></select><span className="text-slate-500">Velocidad</span><input type="range" min=".05" max="1.3" step=".05" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/><button onClick={()=>setMove(v=>!v)} className={`rounded-lg border px-3 py-2 font-bold ${move?'border-cyan-300/60 text-cyan-100':'border-white/15 text-slate-300'}`}>Mover / centrar</button><button onClick={()=>{rot.current={x:-.18,y:.65,z:0};zoom.current=1;pan.current={x:0,y:0}}} className="rounded-lg border border-white/15 px-3 py-2 font-bold text-slate-300">Reset</button><button onClick={()=>boxRef.current?.requestFullscreen()} className="ml-auto rounded-lg border border-cyan-300/30 px-3 py-2 font-bold text-cyan-100">Pantalla completa</button></div><div className="relative min-h-[650px]" style={{background:bg}}><canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY};(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};if(move){pan.current.x+=dx;pan.current.y+=dy}else if(e.shiftKey){rot.current.z+=dx*.008}else{rot.current.y+=dx*.008;rot.current.x+=dy*.008}}} onPointerUp={()=>drag.current=null}/><div className="absolute left-4 top-4 rounded-xl border border-cyan-300/25 bg-slate-950/75 px-4 py-3 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-300">3D ZEUS · MODELO GENERADO</p><p className="mt-1 text-xl font-black text-white">{medio.nombre}</p><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-300">{medio.variante??medio.categoria}</p></div><div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/75 px-4 py-2 text-[10px] text-slate-300 backdrop-blur">Arrastrar: rotar · Shift+arrastrar: eje Z · rueda: zoom · Mover/centrar: desplazar</div></div></div>;
}


