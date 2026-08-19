"use client";

import { useEffect, useRef, useState } from "react";

type Props = { variante: string; configureMode: boolean; onConfigureModeChange: (value:boolean)=>void; selectedStation: number|null; onSelectStation: (station:number|null)=>void; loadout: Record<number,string|null> };
type Axis = "x" | "y" | "z";
type Vec3 = [number, number, number];
type Mat4 = Float32Array;

type GltfAccessor = {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  min?: number[];
  max?: number[];
};
type GltfBufferView = { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number; target?: number };
type GltfPrimitive = { attributes: Record<string, number>; indices?: number; material?: number; mode?: number };
type GltfMesh = { primitives: GltfPrimitive[] };
type GltfNode = { name?: string; mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] };
type GltfMaterial = {
  alphaMode?: string;
  doubleSided?: boolean;
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    baseColorTexture?: { index: number };
    metallicRoughnessTexture?: { index: number };
    metallicFactor?: number;
    roughnessFactor?: number;
  };
};
type Gltf = {
  scene?: number;
  scenes: { nodes?: number[] }[];
  buffers: { uri: string; byteLength: number }[];
  bufferViews: GltfBufferView[];
  accessors: GltfAccessor[];
  meshes: GltfMesh[];
  nodes: GltfNode[];
  materials?: GltfMaterial[];
  textures?: { source: number }[];
  images?: { uri: string }[];
};

type DrawItem = {
  primitive: GltfPrimitive;
  nodeWorld: Mat4;
  material: GltfMaterial | undefined;
  transparent: boolean;
};

type Runtime = {
  gltf: Gltf;
  binary: ArrayBuffer;
  viewBuffers: WebGLBuffer[];
  textures: (WebGLTexture | null)[];
  drawItems: DrawItem[];
  center: Vec3;
  fitScale: number;
};

const MODEL_ROOT = "/models/aircraft/f16c/";
// V3.1: todas las cargas se muestran en modo "presentación": paralelas al eje longitudinal
// del F-16 y con la ojiva/punta orientada hacia el morro. No representan todavía
// un montaje físico sobre pilones; la calibración de estación/pilón se hará después.
const WEAPON_MODELS: Record<string,{root:string;size:number;orientation:Mat4}> = {
  // Eje longitudinal local del F-16: -Z = dirección del morro/disparo.
  aim120:{root:"/models/weapons/aim120c/",size:.95,orientation:rotY(-Math.PI/2)}, // nariz nativa -X -> -Z
  aim7p:{root:"/models/weapons/aim7p/",size:1.0,orientation:rotX(-Math.PI/2)},   // nariz nativa +Y -> -Z
  agm65g:{root:"/models/weapons/agm65g/",size:.72,orientation:rotY(Math.PI)},   // nariz nativa +Z -> -Z
  agm88c:{root:"/models/weapons/agm88c/",size:1.12,orientation:rotY(Math.PI)},  // nariz nativa +Z -> -Z
  gbu10:{root:"/models/weapons/gbu10/",size:.92,orientation:rotY(Math.PI/2)},   // nariz nativa +X -> -Z
  gbu12:{root:"/models/weapons/gbu12/",size:.72,orientation:rotY(Math.PI)},     // nariz nativa +Z -> -Z
  gbu38:{root:"/models/weapons/gbu38/",size:.64,orientation:rotY(Math.PI/2)},  // V3.3: JDAM invertida en V3.2; corregida para apuntar hacia el morro
  mk82:{root:"/models/weapons/mk82/",size:.54,orientation:rotY(Math.PI)},       // nariz nativa +Z -> -Z
  mk83:{root:"/models/weapons/mk83/",size:.68,orientation:rotY(Math.PI/2)},     // nariz nativa +X -> -Z
  mk84:{root:"/models/weapons/mk84/",size:.82,orientation:rotY(Math.PI/2)},     // nariz nativa +X -> -Z
};

// Separación visual de las cargas respecto del avión.
// X = izquierda/derecha, Y = altura (negativo = debajo), Z = adelante/atrás.
// Se mantienen suficientemente alejadas para poder inspeccionarlas sin confundirlas con un montaje real.

const IMAGE_LOADS: Record<string,{src:string;label:string}> = {
  aim9m:{src:"/images/medios3d/loadouts/aim9m.svg",label:"AIM-9M"},
  penguin:{src:"/images/medios3d/loadouts/penguin.svg",label:"AGM-119"},
  lantirn:{src:"/images/medios3d/loadouts/lantirn.svg",label:"LANTIRN"},
  asq213:{src:"/images/medios3d/loadouts/hts.svg",label:"HTS"},
  alq:{src:"/images/medios3d/loadouts/alq.svg",label:"ALQ-184/131"},
  lau61:{src:"/images/medios3d/loadouts/lau61.svg",label:"LAU-61/66"},
  tank300:{src:"/images/medios3d/loadouts/tank300.svg",label:"300 GAL"},
  tank370:{src:"/images/medios3d/loadouts/tank370.svg",label:"370 GAL"},
};

const STATION_POS: Record<number,Vec3> = {
  // V3.2: cargas de inspección aproximadamente a mitad de la separación usada en V3.1.
  // Siguen sin representar montaje real en pilones.
  1:[-.79,-.53,.05],
  2:[-.60,-.53,.05],
  3:[-.41,-.53,.05],
  4:[-.21,-.53,.05],
  5:[0,-.61,.05],
  6:[.21,-.53,.05],
  7:[.41,-.53,.05],
  8:[.60,-.53,.05],
  9:[.79,-.53,.05],
};

function identity(): Mat4 {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
function multiply(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c=0;c<4;c++) for (let r=0;r<4;r++) {
    o[c*4+r] = a[0*4+r]*b[c*4+0] + a[1*4+r]*b[c*4+1] + a[2*4+r]*b[c*4+2] + a[3*4+r]*b[c*4+3];
  }
  return o;
}
function translation(x:number,y:number,z:number): Mat4 { const m=identity();m[12]=x;m[13]=y;m[14]=z;return m; }
function scaleMat(x:number,y:number,z:number): Mat4 { const m=identity();m[0]=x;m[5]=y;m[10]=z;return m; }
function rotX(a:number): Mat4 { const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); }
function rotY(a:number): Mat4 { const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
function rotZ(a:number): Mat4 { const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); }
function perspective(fov:number, aspect:number, near:number, far:number): Mat4 {
  const f=1/Math.tan(fov/2), nf=1/(near-far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
}
function quaternionMat(q:number[]): Mat4 {
  const [x,y,z,w]=q, x2=x+x,y2=y+y,z2=z+z;
  const xx=x*x2,xy=x*y2,xz=x*z2, yy=y*y2,yz=y*z2,zz=z*z2, wx=w*x2,wy=w*y2,wz=w*z2;
  return new Float32Array([
    1-(yy+zz),xy+wz,xz-wy,0,
    xy-wz,1-(xx+zz),yz+wx,0,
    xz+wy,yz-wx,1-(xx+yy),0,
    0,0,0,1
  ]);
}
function nodeMatrix(n:GltfNode): Mat4 {
  if (n.matrix) return new Float32Array(n.matrix);
  let m=identity();
  if (n.translation) m=multiply(m,translation(n.translation[0],n.translation[1],n.translation[2]));
  if (n.rotation) m=multiply(m,quaternionMat(n.rotation));
  if (n.scale) m=multiply(m,scaleMat(n.scale[0],n.scale[1],n.scale[2]));
  return m;
}
function transformPoint(m:Mat4,p:Vec3):Vec3 {
  const [x,y,z]=p; const w=m[3]*x+m[7]*y+m[11]*z+m[15] || 1;
  return [(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w];
}

function compile(gl:WebGL2RenderingContext,type:number,src:string){
  const s=gl.createShader(type); if(!s) throw new Error("No se pudo crear shader"); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)||"Error compilando shader"); return s;
}
function program(gl:WebGL2RenderingContext,vs:string,fs:string){
  const p=gl.createProgram(); if(!p) throw new Error("No se pudo crear programa WebGL");
  gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vs)); gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fs)); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||"Error enlazando shader"); return p;
}
function numComponents(type:string){return type==="SCALAR"?1:type==="VEC2"?2:type==="VEC3"?3:type==="VEC4"?4:1;}
function componentBytes(t:number){return t===5120||t===5121?1:t===5122||t===5123?2:4;}
function glType(gl:WebGL2RenderingContext,t:number){return t===5120?gl.BYTE:t===5121?gl.UNSIGNED_BYTE:t===5122?gl.SHORT:t===5123?gl.UNSIGNED_SHORT:t===5125?gl.UNSIGNED_INT:gl.FLOAT;}

async function loadTexture(gl:WebGL2RenderingContext,url:string):Promise<WebGLTexture|null>{
  const img=new Image(); img.crossOrigin="anonymous"; img.src=url; await img.decode();
  const tex=gl.createTexture(); if(!tex)return null; gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
  gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT); return tex;
}

async function loadRuntime(gl:WebGL2RenderingContext, root:string, targetSize:number):Promise<Runtime>{
  const modelUrl=`${root}scene.gltf`;
  const gltf = await fetch(modelUrl).then(r=>{if(!r.ok)throw new Error(`No se pudo abrir ${modelUrl}`);return r.json()}) as Gltf;
  const binary = await fetch(`${root}${gltf.buffers[0].uri}`).then(r=>{if(!r.ok)throw new Error("No se pudo cargar scene.bin");return r.arrayBuffer()});
  const viewBuffers = gltf.bufferViews.map((bv)=>{
    const b=gl.createBuffer(); if(!b)throw new Error("No se pudo crear buffer WebGL");
    const target=bv.target===34963?gl.ELEMENT_ARRAY_BUFFER:gl.ARRAY_BUFFER; gl.bindBuffer(target,b);
    const start=bv.byteOffset||0; gl.bufferData(target,new Uint8Array(binary,start,bv.byteLength),gl.STATIC_DRAW); return b;
  });
  const textures: (WebGLTexture|null)[] = [];
  for(const image of gltf.images||[]) textures.push(await loadTexture(gl,`${root}${image.uri}`));

  const drawItems:DrawItem[]=[]; const world:Mat4[]=gltf.nodes.map(()=>identity());
  const roots=gltf.scenes[gltf.scene||0]?.nodes||[];
  const walk=(idx:number,parent:Mat4)=>{
    const n=gltf.nodes[idx], w=multiply(parent,nodeMatrix(n)); world[idx]=w;
    if(n.mesh!==undefined){ for(const primitive of gltf.meshes[n.mesh].primitives){ const material=gltf.materials?.[primitive.material??-1]; drawItems.push({primitive,nodeWorld:w,material,transparent:material?.alphaMode==="BLEND"}); } }
    for(const c of n.children||[])walk(c,w);
  };
  roots.forEach(r=>walk(r,identity()));

  const min:Vec3=[Infinity,Infinity,Infinity],max:Vec3=[-Infinity,-Infinity,-Infinity];
  gltf.nodes.forEach((n,idx)=>{ if(n.mesh===undefined)return; for(const prim of gltf.meshes[n.mesh].primitives){ const ai=prim.attributes.POSITION; if(ai===undefined)return; const a=gltf.accessors[ai]; if(!a.min||!a.max)return; const corners:Vec3[]=[]; for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]])corners.push([x,y,z]); for(const c of corners){const p=transformPoint(world[idx],c);for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}} } });
  const center:Vec3=[(min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2]; const maxDim=Math.max(max[0]-min[0],max[1]-min[1],max[2]-min[2]);
  return {gltf,binary,viewBuffers,textures,drawItems,center,fitScale:targetSize/Math.max(maxDim,0.001)};
}

const vertexShader=`#version 300 es
precision highp float;
in vec3 aPosition; in vec3 aNormal; in vec2 aUv;
uniform mat4 uMvp; uniform mat4 uModel;
out vec3 vNormal; out vec2 vUv; out vec3 vWorld;
void main(){vec4 w=uModel*vec4(aPosition,1.0);vWorld=w.xyz;vNormal=normalize(mat3(uModel)*aNormal);vUv=aUv;gl_Position=uMvp*vec4(aPosition,1.0);}`;
const fragmentShader=`#version 300 es
precision highp float;
in vec3 vNormal; in vec2 vUv; in vec3 vWorld; out vec4 outColor;
uniform sampler2D uBaseTex; uniform bool uHasTex; uniform vec4 uBaseColor; uniform float uMetallic; uniform float uRoughness;
void main(){vec4 base=uBaseColor;if(uHasTex)base*=texture(uBaseTex,vUv);if(base.a<0.03)discard;vec3 n=normalize(vNormal);vec3 l=normalize(vec3(-0.45,0.72,0.58));vec3 v=normalize(vec3(0.0,0.0,4.5)-vWorld);vec3 h=normalize(l+v);float diff=max(dot(n,l),0.0);float spec=pow(max(dot(n,h),0.0),mix(68.0,10.0,uRoughness))*mix(0.16,0.55,uMetallic);float rim=pow(1.0-max(dot(n,v),0.0),2.0);vec3 col=base.rgb*(0.52+0.88*diff)+vec3(spec)+base.rgb*rim*0.12;outColor=vec4(col,base.a);}`;

export default function F16Viewer({ variante, configureMode, onConfigureModeChange, selectedStation, onSelectStation, loadout }: Props) {
  const canvasRef=useRef<HTMLCanvasElement|null>(null); const boxRef=useRef<HTMLDivElement|null>(null);
  const runtimeRef=useRef<Runtime|null>(null); const weaponRuntimeRef=useRef<Record<string,Runtime>>({}); const loadoutRef=useRef(loadout); const rotation=useRef({x:-0.12,y:0.58,z:0}); const zoom=useRef(1); const pan=useRef({x:0,y:0});
  const drag=useRef<{x:number;y:number;button:number}|null>(null); const [auto,setAuto]=useState(true); const [speed,setSpeed]=useState(0.32); const [axis,setAxis]=useState<Axis>("y");
  const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null); const [fullscreen,setFullscreen]=useState(false); const [moveMode,setMoveMode]=useState(false);

  useEffect(()=>{loadoutRef.current=loadout},[loadout]);

  useEffect(()=>{ const listener=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener("fullscreenchange",listener);return()=>document.removeEventListener("fullscreenchange",listener)},[]);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return; const gl=canvas.getContext("webgl2",{antialias:true,alpha:true}); if(!gl){setError("Este navegador no ofrece WebGL2.");setLoading(false);return;}
    let cancelled=false,raf=0,last=performance.now();
    const p=program(gl,vertexShader,fragmentShader); const loc={pos:gl.getAttribLocation(p,"aPosition"),normal:gl.getAttribLocation(p,"aNormal"),uv:gl.getAttribLocation(p,"aUv"),mvp:gl.getUniformLocation(p,"uMvp"),model:gl.getUniformLocation(p,"uModel"),hasTex:gl.getUniformLocation(p,"uHasTex"),baseTex:gl.getUniformLocation(p,"uBaseTex"),baseColor:gl.getUniformLocation(p,"uBaseColor"),metallic:gl.getUniformLocation(p,"uMetallic"),roughness:gl.getUniformLocation(p,"uRoughness")};
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
    loadRuntime(gl,MODEL_ROOT,4.15).then(async rt=>{if(cancelled)return;runtimeRef.current=rt;
      const entries=Object.entries(WEAPON_MODELS);
      const loaded=await Promise.all(entries.map(async ([id,cfg])=>{try{return [id,await loadRuntime(gl,cfg.root,cfg.size)] as const}catch{return [id,null] as const}}));
      if(!cancelled){for(const [id,wr] of loaded)if(wr)weaponRuntimeRef.current[id]=wr;setLoading(false)}
    }).catch(e=>{if(cancelled)return;setError(e instanceof Error?e.message:String(e));setLoading(false)});

    const bindAttr=(rt:Runtime,accessorIndex:number,location:number)=>{if(location<0)return;const a=rt.gltf.accessors[accessorIndex];if(a.bufferView===undefined)return;const bv=rt.gltf.bufferViews[a.bufferView];gl.bindBuffer(gl.ARRAY_BUFFER,rt.viewBuffers[a.bufferView]);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,numComponents(a.type),glType(gl,a.componentType),false,bv.byteStride||0,a.byteOffset||0);};
    const draw=(now:number)=>{
      const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);const w=Math.max(2,Math.floor(rect.width*dpr)),h=Math.max(2,Math.floor(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;} gl.viewport(0,0,w,h);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const rt=runtimeRef.current; if(rt){ const dt=Math.min((now-last)/1000,.05);last=now;if(auto)rotation.current[axis]+=dt*speed;
        const proj=perspective(Math.PI/4,w/h,.05,50); const view=translation(pan.current.x,pan.current.y-0.08,-4.05/zoom.current);
        const baseRotation=multiply(rotZ(rotation.current.z),multiply(rotX(rotation.current.x),rotY(rotation.current.y)));
        let global=multiply(baseRotation,scaleMat(rt.fitScale,rt.fitScale,rt.fitScale));global=multiply(global,translation(-rt.center[0],-rt.center[1],-rt.center[2]));
        gl.useProgram(p);gl.uniform1i(loc.baseTex,0);
        const renderRuntime=(runtime:Runtime,globalMatrix:Mat4,transparent:boolean)=>{if(transparent){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}else{gl.disable(gl.BLEND);gl.depthMask(true);} for(const item of runtime.drawItems){if(item.transparent!==transparent)continue;const prim=item.primitive;const model=multiply(globalMatrix,item.nodeWorld);const mvp=multiply(proj,multiply(view,model));gl.uniformMatrix4fv(loc.model,false,model);gl.uniformMatrix4fv(loc.mvp,false,mvp);bindAttr(runtime,prim.attributes.POSITION,loc.pos); if(prim.attributes.NORMAL!==undefined)bindAttr(runtime,prim.attributes.NORMAL,loc.normal);if(prim.attributes.TEXCOORD_0!==undefined)bindAttr(runtime,prim.attributes.TEXCOORD_0,loc.uv);
          const mat=item.material?.pbrMetallicRoughness;const color=mat?.baseColorFactor||[1,1,1,1];gl.uniform4f(loc.baseColor,color[0]??1,color[1]??1,color[2]??1,color[3]??1);gl.uniform1f(loc.metallic,mat?.metallicFactor??0.38);gl.uniform1f(loc.roughness,mat?.roughnessFactor??0.5);
          const texIndex=mat?.baseColorTexture?.index;const source=texIndex!==undefined?runtime.gltf.textures?.[texIndex]?.source:undefined;const tex=source!==undefined?runtime.textures[source]:null;gl.uniform1i(loc.hasTex,Boolean(tex)?1:0);if(tex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);} if(item.material?.doubleSided)gl.disable(gl.CULL_FACE);else gl.enable(gl.CULL_FACE);
          if(prim.indices!==undefined){const ia=runtime.gltf.accessors[prim.indices],bv=runtime.gltf.bufferViews[ia.bufferView!];gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,runtime.viewBuffers[ia.bufferView!]);gl.drawElements(prim.mode??gl.TRIANGLES,ia.count,glType(gl,ia.componentType),ia.byteOffset||0);}else{const pa=runtime.gltf.accessors[prim.attributes.POSITION];gl.drawArrays(prim.mode??gl.TRIANGLES,0,pa.count);} }
        };
        renderRuntime(rt,global,false);renderRuntime(rt,global,true);
        for(const [station,weaponId] of Object.entries(loadoutRef.current)){
          if(!weaponId)continue;const cfg=WEAPON_MODELS[weaponId];const wr=weaponRuntimeRef.current[weaponId];if(!cfg||!wr)continue;
          const pos=STATION_POS[Number(station)]||[0,0,-.4];
          let wg=multiply(baseRotation,translation(pos[0],pos[1],pos[2]));
          wg=multiply(wg,cfg.orientation);wg=multiply(wg,scaleMat(wr.fitScale,wr.fitScale,wr.fitScale));wg=multiply(wg,translation(-wr.center[0],-wr.center[1],-wr.center[2]));
          renderRuntime(wr,wg,false);renderRuntime(wr,wg,true);
        }
        gl.depthMask(true);
      }
      raf=requestAnimationFrame(draw);
    };raf=requestAnimationFrame(draw);return()=>{cancelled=true;cancelAnimationFrame(raf);gl.deleteProgram(p)};
  },[auto,speed,axis]);

  // V3.2: capturamos la rueda con un listener nativo no pasivo.
  // Así, cuando el puntero está sobre el visor 3D, la rueda controla sólo el zoom
  // y no desplaza la página hacia arriba/abajo.
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const handleWheel=(event:WheelEvent)=>{
      event.preventDefault();
      event.stopPropagation();
      zoom.current=Math.max(.55,Math.min(2.7,zoom.current*(event.deltaY>0?.92:1.08)));
    };
    canvas.addEventListener("wheel",handleWheel,{passive:false});
    return()=>canvas.removeEventListener("wheel",handleWheel);
  },[]);

  const reset=()=>{rotation.current={x:-.12,y:.58,z:0};zoom.current=1;pan.current={x:0,y:0};setMoveMode(false)};
  const setView=(x:number,y:number,z:number)=>{rotation.current={x,y,z}};
  const full=async()=>{if(!boxRef.current)return;if(!document.fullscreenElement)await boxRef.current.requestFullscreen();else await document.exitFullscreen()};
  const hp=Array.from({length:9},(_,i)=>i+1);
  const imageLoadouts=Object.entries(loadout).filter(([,weaponId])=>weaponId&&IMAGE_LOADS[weaponId]&&!WEAPON_MODELS[weaponId]);

  return <div ref={boxRef} className={`relative flex min-h-[820px] flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950 shadow-2xl ${fullscreen?"h-screen rounded-none border-0":""}`}>
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950/95 p-3 text-xs">
      <button onClick={()=>setAuto(v=>!v)} className={`rounded-lg border px-3 py-2 font-bold uppercase tracking-wider ${auto?"border-emerald-400/60 bg-emerald-400/10 text-emerald-200":"border-white/15 text-slate-300"}`}>{auto?"Auto rotación":"Rotación manual"}</button>
      <select value={axis} onChange={e=>setAxis(e.target.value as Axis)} className="rounded-lg border border-white/15 bg-slate-900 px-2 py-2 text-slate-200"><option value="x">Eje X</option><option value="y">Eje Y</option><option value="z">Eje Z</option></select>
      <label className="flex items-center gap-2 text-slate-300">Velocidad <input aria-label="Velocidad de rotación" type="range" min="0.03" max="1.8" step="0.03" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/><span className="w-11 text-cyan-200">{speed.toFixed(2)}x</span></label>
      <button onClick={()=>{onConfigureModeChange(!configureMode);onSelectStation(null)}} className={`rounded-lg border px-3 py-2 font-bold ${configureMode?"border-amber-300/60 bg-amber-300/10 text-amber-100":"border-amber-300/30 text-amber-200"}`}>{configureMode?"Cerrar configuración":"Configurar carga"}</button>
      <button onClick={()=>setMoveMode(v=>!v)} className={`rounded-lg border px-3 py-2 font-bold ${moveMode?"border-cyan-300/60 bg-cyan-300/10 text-cyan-100":"border-white/15 text-slate-200"}`}>{moveMode?"Moviendo aeronave":"Mover / centrar"}</button>
      <button onClick={()=>{pan.current={x:0,y:0};setMoveMode(false)}} className="rounded-lg border border-white/15 px-3 py-2 font-bold text-slate-200">Centrar</button>
      <button onClick={reset} className="rounded-lg border border-white/15 px-3 py-2 font-bold text-slate-200">Reset cámara</button>
      <button onClick={full} className="ml-auto rounded-lg border border-cyan-300/30 px-3 py-2 font-bold text-cyan-100">{fullscreen?"Salir pantalla completa":"Pantalla completa"}</button>
    </div>
    <div className="flex flex-wrap gap-2 border-b border-white/10 bg-slate-950/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
      <button onClick={()=>setView(-.2,.62,.06)} className="rounded px-2 py-1 text-cyan-200 hover:bg-white/10">Perspectiva</button><button onClick={()=>setView(0,0,0)} className="rounded px-2 py-1 hover:bg-white/10">Lateral</button><button onClick={()=>setView(0,Math.PI/2,0)} className="rounded px-2 py-1 hover:bg-white/10">Frontal</button><button onClick={()=>setView(-Math.PI/2,0,0)} className="rounded px-2 py-1 hover:bg-white/10">Superior</button><button onClick={()=>setView(Math.PI/2,0,0)} className="rounded px-2 py-1 hover:bg-white/10">Inferior</button>
      <span className="ml-auto hidden text-[10px] font-medium normal-case tracking-normal text-slate-400 lg:inline">Arrastrar: rotar X/Y · “Mover / centrar”: desplazar · Shift+arrastrar: eje Z · rueda: zoom</span>
    </div>
    <div className="relative min-h-[720px] flex-1 overflow-hidden bg-cover bg-center" style={{backgroundImage:"linear-gradient(rgba(2,6,23,.06),rgba(2,6,23,.18)),url('/images/medios3d/hangar-ficticio-v23.jpg')",backgroundRepeat:"no-repeat",backgroundSize:"cover",backgroundPosition:"center center"}}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(226,232,240,.22),transparent_46%),linear-gradient(to_top,rgba(2,6,23,.18),transparent_42%)]"/>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,button:e.button};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={...drag.current,x:e.clientX,y:e.clientY};if(moveMode){pan.current.x=Math.max(-1.6,Math.min(1.6,pan.current.x+dx*.0045));pan.current.y=Math.max(-1.15,Math.min(1.15,pan.current.y-dy*.0045));}else if(e.shiftKey)rotation.current.z+=dx*.008;else{rotation.current.y+=dx*.008;rotation.current.x+=dy*.008}}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} />
      {imageLoadouts.length>0&&<div className="pointer-events-none absolute bottom-[12%] left-1/2 z-10 grid w-[72%] -translate-x-1/2 grid-cols-9 items-end gap-2">{Array.from({length:9},(_,i)=>i+1).map(station=>{const weaponId=loadout[station];const sprite=weaponId?IMAGE_LOADS[weaponId]:undefined;if(!sprite||WEAPON_MODELS[weaponId!])return <div key={station}/>;return <div key={station} className="flex flex-col items-center justify-end"><img src={sprite.src} alt="" className="h-11 w-full max-w-[92px] object-contain opacity-95 drop-shadow-[0_6px_6px_rgba(0,0,0,.65)]"/><span className="mt-1 rounded border border-amber-300/30 bg-slate-950/70 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-100">{sprite.label} · 2D</span></div>})}</div>}
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-cyan-300/20 bg-slate-950/72 px-3 py-2 shadow-xl backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">{variante}</p><p className="mt-1 text-[10px] text-slate-300">Modelo 3D de referencia · Familia F-16</p></div>
      {configureMode&&<div className="pointer-events-none absolute right-4 top-4 rounded-lg border border-amber-300/25 bg-slate-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-amber-200 backdrop-blur">Configuración activa · cargas separadas para inspección</div>}
            {!configureMode&&<div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/65 px-4 py-2 text-[10px] text-slate-300 backdrop-blur">{moveMode?"ARRASTRAR: mover aeronave · botón CENTRAR: volver al centro":"Arrastrar para rotar · rueda para zoom · cargas 3D en presentación paralela al avión."}</div>}
      {loading&&<div className="absolute inset-0 flex items-center justify-center bg-slate-950/55"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300"/><p className="mt-3 text-xs font-black uppercase tracking-[.2em] text-cyan-200">Cargando F-16 detallado</p></div></div>}
      {error&&<div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-8"><div className="max-w-lg rounded-xl border border-red-400/30 bg-red-400/5 p-5 text-center"><p className="font-black text-red-200">No se pudo cargar el modelo 3D</p><p className="mt-2 text-sm text-red-100/70">{error}</p></div></div>}
    </div>
  </div>;
}
