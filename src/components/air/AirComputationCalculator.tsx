"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Side = "propio" | "enemigo";
type Metric = {
  id: string;
  label: string;
  unit: string;
  help: string;
  weight: number;
  direction?: "higher" | "lower";
  propio: number;
  enemigo: number;
};
type Group = { id: string; title: string; weight: number; metrics: Metric[] };
type Props = { workspaceCode: string; token: string };

type PerformanceData = {
  velocidad: number;
  autonomia: number;
  pesoCombate: number;
  superficieAlar: number;
  techo: number;
  aceleracion: number;
  gmax: number;
  empujeMaxTotal: number;
  aar: number;
  factorCombate: number;
};

type GenerationData = {
  todoTiempo: number;
  aviones: number;
  salidasAvion: number;
  pilotos: number;
  salidasPiloto: number;
  mro: number;
  mroPiloto: number;
  mroLogDia: number;
  mroLogDiaNoche: number;
};

type SurvivalData = {
  ata: number;
  cobertura80: number;
  cobertura50a80: number;
  coberturaBajo50: number;
  rwrChaffFlare: number;
  podCme: number;
  mroCazaDefensa: number;
  autonomiaCazaDefensa: number;
  pkMejorArmaAA: number;
  pkSam: number;
  operatividadSam: number;
  misilesSam: number;
  areaVulnerable: number;
  errorDispersion: number;
  cadenciaAAA: number;
  tiempoExposicion: number;
  operatividadAAA: number;
};

const pPropio: PerformanceData = {
  velocidad: 1915,
  autonomia: 2,
  pesoCombate: 37200,
  superficieAlar: 380,
  techo: 50000,
  aceleracion: 4,
  gmax: 9,
  empujeMaxTotal: 35500,
  aar: 1,
  factorCombate: 17,
};
const pEnemigo: PerformanceData = {
  velocidad: 1500,
  autonomia: 2,
  pesoCombate: 32000,
  superficieAlar: 380,
  techo: 59000,
  aceleracion: 4,
  gmax: 9,
  empujeMaxTotal: 36684,
  aar: 1,
  factorCombate: 17,
};

const avionicsInitial: Group[] = [
  {
    id: "fcr",
    title: "FCR — Radar de control de tiro",
    weight: 40,
    metrics: [
      { id: "alcance", label: "Alcance", unit: "NM", help: "Alcance útil de detección/seguimiento contra el blanco considerado, no el máximo publicitario. Ingrese millas náuticas.", weight: 30, propio: 81, enemigo: 49 },
      { id: "angulo", label: "Ángulo de cobertura", unit: "°", help: "Sector angular total de búsqueda y seguimiento del radar.", weight: 20, propio: 120, enemigo: 120 },
      { id: "tws", label: "TWS", unit: "0–1", help: "Track While Scan: 1 disponible; 0,5 parcial; 0 ausente.", weight: 20, propio: 1, enemigo: 1 },
      { id: "sar", label: "SAR", unit: "0–1", help: "Radar de apertura sintética/mapeo de alta resolución: 1 sí; 0,5 limitado; 0 no.", weight: 10, propio: 1, enemigo: 1 },
      { id: "gm", label: "GM", unit: "0–1", help: "Modo Ground Mapping: 1 disponible; 0,5 limitado; 0 ausente.", weight: 5, propio: 1, enemigo: 1 },
      { id: "ldsd", label: "LD/SD", unit: "0–1", help: "Look-Down/Shoot-Down: capacidad de detectar y atacar blancos bajos sobre clutter terrestre.", weight: 15, propio: 1, enemigo: 1 },
    ],
  },
  {
    id: "wdns",
    title: "WDNS — Navegación y ataque",
    weight: 35,
    metrics: [
      { id: "ins", label: "INS", unit: "0–1", help: "Sistema de navegación inercial integrado.", weight: 20, propio: 1, enemigo: 1 },
      { id: "gps", label: "GPS", unit: "0–1", help: "Navegación satelital integrada al sistema de misión.", weight: 20, propio: 1, enemigo: 1 },
      { id: "tf", label: "TF", unit: "0–1", help: "Terrain Following: seguimiento automático o asistido del terreno.", weight: 5, propio: 1, enemigo: 0 },
      { id: "navAttack", label: "NAV ATTACK", unit: "0–1", help: "Sistema integrado de navegación y ataque/computadora de misión.", weight: 15, propio: 1, enemigo: 1 },
      { id: "flir", label: "FLIR", unit: "0–1", help: "Sensor infrarrojo de visión frontal para navegación/adquisición.", weight: 10, propio: 1, enemigo: 0 },
      { id: "tgp", label: "TGP", unit: "0–1", help: "Pod de designación/adquisición de blancos integrado.", weight: 10, propio: 1, enemigo: 0 },
      { id: "hud", label: "HUD", unit: "0–1", help: "Presentación de vuelo y ataque en visor frontal.", weight: 5, propio: 1, enemigo: 1 },
      { id: "hotas", label: "HOTAS", unit: "0–1", help: "Controles de misión y armamento en palanca y acelerador.", weight: 5, propio: 1, enemigo: 1 },
      { id: "irst", label: "IRST", unit: "0–1", help: "Búsqueda y seguimiento infrarrojo pasivo.", weight: 5, propio: 1, enemigo: 1 },
      { id: "jhmcs", label: "JHMCS", unit: "0–1", help: "Mira/casco con designación de blancos.", weight: 5, propio: 1, enemigo: 1 },
    ],
  },
  {
    id: "sa",
    title: "SA — Conciencia situacional",
    weight: 8,
    metrics: [
      { id: "dl", label: "DL", unit: "0–1", help: "Data Link táctico interoperable.", weight: 20, propio: 1, enemigo: 0 },
      { id: "aiff", label: "AIFF", unit: "0–1", help: "IFF avanzado integrado a la presentación táctica.", weight: 35, propio: 1, enemigo: 1 },
      { id: "tacan", label: "TACAN", unit: "0–1", help: "Navegación táctica TACAN disponible.", weight: 15, propio: 1, enemigo: 1 },
      { id: "hsd", label: "HSD", unit: "0–1", help: "Horizontal Situation Display/pantalla de situación horizontal.", weight: 30, propio: 1, enemigo: 0 },
    ],
  },
  {
    id: "ew",
    title: "EW — Guerra electrónica",
    weight: 12,
    metrics: [
      { id: "comm", label: "COMM", unit: "0–1", help: "Comunicaciones seguras y aptas para la misión.", weight: 25, propio: 1, enemigo: 1 },
      { id: "cf", label: "C/F", unit: "0–1", help: "Dispensadores de chaff y flare integrados.", weight: 20, propio: 1, enemigo: 1 },
      { id: "rwr", label: "RWR", unit: "0–1", help: "Receptor de alerta radar con cobertura y biblioteca apropiadas.", weight: 25, propio: 1, enemigo: 0 },
      { id: "jmr", label: "JMR / Jammer", unit: "0–1", help: "Perturbador electrónico interno o en pod.", weight: 30, propio: 1, enemigo: 1 },
    ],
  },
  {
    id: "plan",
    title: "PLAN — Planeamiento de misión",
    weight: 5,
    metrics: [
      { id: "mps", label: "MPS", unit: "0–1", help: "Mission Planning System: sistema digital de planeamiento de misión.", weight: 50, propio: 1, enemigo: 1 },
      { id: "imint", label: "IMINT", unit: "0–1", help: "Integración de inteligencia de imágenes al planeamiento.", weight: 20, propio: 1, enemigo: 1 },
      { id: "dtc", label: "DTC", unit: "0–1", help: "Data Transfer Cartridge/dispositivo de transferencia de datos de misión.", weight: 30, propio: 1, enemigo: 0 },
    ],
  },
];

const aaInitial: Group[] = [
  {
    id: "ir",
    title: "Tipo IR — misil infrarrojo",
    weight: 12,
    metrics: [
      { id: "alcance", label: "Alcance efectivo", unit: "NM", help: "Distancia útil de empleo bajo la geometría del escenario. No use el alcance cinemático máximo.", weight: 50, propio: 10, enemigo: 8 },
      { id: "pk", label: "Pk", unit: "0–1", help: "Probabilidad estimada de derribo por lanzamiento, considerando aspecto, contramedidas y calidad del blanco.", weight: 25, propio: 0.8, enemigo: 0.6 },
      { id: "aspecto", label: "Ángulo de aspecto", unit: "°", help: "Sector desde el cual puede adquirir/atacar: 180° equivale a capacidad todo aspecto; valores menores indican mayor restricción.", weight: 25, propio: 180, enemigo: 180 },
    ],
  },
  {
    id: "sa",
    title: "Tipo SA — misil de corto alcance",
    weight: 35,
    metrics: [
      { id: "alcance", label: "Alcance efectivo", unit: "NM", help: "Alcance efectivo del misil de corto alcance en la condición de empleo seleccionada.", weight: 30, propio: 20, enemigo: 20 },
      { id: "pk", label: "Pk", unit: "0–1", help: "Probabilidad de derribo por lanzamiento en condiciones comparables.", weight: 35, propio: 0.5, enemigo: 0.5 },
      { id: "aspecto", label: "Ángulo de aspecto", unit: "°", help: "Cobertura angular de adquisición/enganche del buscador.", weight: 35, propio: 180, enemigo: 180 },
    ],
  },
  {
    id: "a",
    title: "Tipo A — misil de alcance ampliado/BVR",
    weight: 50,
    metrics: [
      { id: "alcance", label: "Alcance efectivo", unit: "NM", help: "Alcance útil BVR contra el blanco, altura, velocidad y geometría consideradas.", weight: 40, propio: 60, enemigo: 32 },
      { id: "pk", label: "Pk", unit: "0–1", help: "Probabilidad de derribo estimada por lanzamiento, incluida la capacidad de guía y resistencia a contramedidas.", weight: 30, propio: 0.7, enemigo: 0.4 },
      { id: "aspecto", label: "Ángulo de aspecto", unit: "°", help: "Sector angular de empleo efectivo del misil.", weight: 30, propio: 180, enemigo: 180 },
    ],
  },
  {
    id: "guns",
    title: "Guns — cañón",
    weight: 3,
    metrics: [
      { id: "wp", label: "Wp — masa del proyectil", unit: "g", help: "Masa de un proyectil. Use la misma unidad para ambas aeronaves.", weight: 0, propio: 25, enemigo: 25 },
      { id: "ct", label: "CT — cadencia de tiro", unit: "disparos/min", help: "Cadencia práctica o nominal del cañón.", weight: 0, propio: 500, enemigo: 500 },
      { id: "vm", label: "Vm — velocidad de salida", unit: "m/s", help: "Velocidad inicial del proyectil en la boca del cañón.", weight: 0, propio: 180, enemigo: 180 },
    ],
  },
];

const asInitial: Group[] = [
  ...[
    ["bomb_gp", "Bombas — propósito general", 35 * 0.07],
    ["bomb_ir", "Bombas — guía IR", 35 * 0.23],
    ["bomb_laser", "Bombas — guía láser", 35 * 0.3],
    ["bomb_gps", "Bombas — INS/GPS", 35 * 0.4],
    ["missile_ir", "Misiles — guía IR", 65 * 0.25],
    ["missile_ar", "Misiles — antirradiación", 65 * 0.5],
    ["missile_laser", "Misiles — guía láser", 65 * 0.25],
  ].map(([id, title, weight]) => ({
    id: String(id),
    title: String(title),
    weight: Number(weight),
    metrics: [
      { id: "cep", label: "CEP", unit: "m", help: "Error circular probable. Menor valor representa mayor precisión.", weight: 55, direction: "lower" as const, propio: 10, enemigo: 15 },
      { id: "alcance", label: "Alcance", unit: "NM", help: "Alcance efectivo de lanzamiento, expresado en millas náuticas.", weight: 45, propio: 20, enemigo: 15 },
    ],
  })),
];

const generationOwn: GenerationData = { todoTiempo: 1, aviones: 20, salidasAvion: 120, pilotos: 30, salidasPiloto: 150, mro: 120, mroPiloto: 5, mroLogDia: 5, mroLogDiaNoche: 6 };
const generationEnemy: GenerationData = { todoTiempo: 1, aviones: 20, salidasAvion: 80, pilotos: 30, salidasPiloto: 120, mro: 80, mroPiloto: 4, mroLogDia: 4, mroLogDiaNoche: 4 };
const survivalOwn: SurvivalData = { ata: 1, cobertura80: 0, cobertura50a80: 0, coberturaBajo50: 1, rwrChaffFlare: 1, podCme: 1, mroCazaDefensa: 24, autonomiaCazaDefensa: 0.9, pkMejorArmaAA: 0.8, pkSam: 0.2, operatividadSam: 0.85, misilesSam: 4, areaVulnerable: 45, errorDispersion: 50, cadenciaAAA: 400, tiempoExposicion: 0.1, operatividadAAA: 0.8 };
const survivalEnemy: SurvivalData = { ...survivalOwn, rwrChaffFlare: 0.6, podCme: 0.8, pkMejorArmaAA: 0.559, pkSam: 0.1, operatividadSam: 0.7, misilesSam: 2 };

const perfWeights: Record<keyof Pick<PerformanceData, "velocidad" | "autonomia" | "techo" | "aceleracion" | "gmax" | "aar" | "factorCombate"> | "relacionEmpujePeso", number> = {
  velocidad: 12,
  autonomia: 10,
  techo: 5,
  aceleracion: 15,
  gmax: 5,
  aar: 10,
  relacionEmpujePeso: 13,
  factorCombate: 30,
};

function safeRatio(value: number, reference: number, direction: "higher" | "lower" = "higher") {
  if (!Number.isFinite(value) || !Number.isFinite(reference) || value <= 0 || reference <= 0) return 0;
  return direction === "lower" ? reference / value : value / reference;
}
function relativeScore(value: number, reference: number, direction: "higher" | "lower" = "higher") {
  return Math.min(2, Math.max(0, safeRatio(value, reference, direction))) * 100;
}
function metricGroupScore(group: Group, side: Side) {
  const other: Side = side === "propio" ? "enemigo" : "propio";
  if (group.id === "guns") {
    const get = (id: string, s: Side) => group.metrics.find((m) => m.id === id)?.[s] || 0;
    const fl = get("wp", side) * get("ct", side) * get("vm", side) ** 2;
    const flOther = get("wp", other) * get("ct", other) * get("vm", other) ** 2;
    return relativeScore(fl, flOther);
  }
  const total = group.metrics.reduce((sum, metric) => sum + metric.weight, 0) || 1;
  return group.metrics.reduce((sum, metric) => sum + relativeScore(metric[side], metric[other], metric.direction) * metric.weight, 0) / total;
}
function sectionGroupScore(groups: Group[], side: Side) {
  const total = groups.reduce((sum, group) => sum + group.weight, 0) || 1;
  return groups.reduce((sum, group) => sum + metricGroupScore(group, side) * group.weight, 0) / total;
}
function performanceDerived(data: PerformanceData) {
  return {
    relacionEmpujePeso: data.pesoCombate > 0 ? data.empujeMaxTotal / data.pesoCombate : 0,
    cargaAlar: data.superficieAlar > 0 ? data.pesoCombate / data.superficieAlar : 0,
  };
}
function performanceScore(sideData: PerformanceData, other: PerformanceData) {
  const d = performanceDerived(sideData);
  const od = performanceDerived(other);
  const entries: Array<[number, number, number]> = [
    [sideData.velocidad, other.velocidad, perfWeights.velocidad],
    [sideData.autonomia, other.autonomia, perfWeights.autonomia],
    [sideData.techo, other.techo, perfWeights.techo],
    [sideData.aceleracion, other.aceleracion, perfWeights.aceleracion],
    [sideData.gmax, other.gmax, perfWeights.gmax],
    [sideData.aar, other.aar, perfWeights.aar],
    [d.relacionEmpujePeso, od.relacionEmpujePeso, perfWeights.relacionEmpujePeso],
    [sideData.factorCombate, other.factorCombate, perfWeights.factorCombate],
  ];
  return entries.reduce((sum, [v, r, w]) => sum + relativeScore(v, r) * w, 0) / 100;
}
function finiteNumber(value: unknown, fallback = 0) {
  const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}
function generationScore(data: GenerationData) {
  const todoTiempo = Math.max(0, finiteNumber(data.todoTiempo, 1));
  const byAircraft = Math.max(0, finiteNumber(data.aviones)) * Math.max(0, finiteNumber(data.salidasAvion));
  const byPilots = Math.max(0, finiteNumber(data.pilotos)) * Math.max(0, finiteNumber(data.salidasPiloto));
  const mro = Math.max(0, finiteNumber(data.mro));

  // El Excel toma como capacidad de generar salidas el menor valor entre
  // la capacidad por aeronaves, la capacidad por pilotos y el MRO.
  // MRO Piloto y MRO Logístico se muestran como referencias de apoyo,
  // pero no se multiplican por el resultado porque eso sobredimensionaría
  // artificialmente la generación de salidas.
  const limits = [byAircraft, byPilots, mro].filter((value) => value > 0);
  if (limits.length === 0 || todoTiempo === 0) return 0;
  return Math.min(...limits) * todoTiempo;
}
function survivalScore(data: SurvivalData) {
  const detectionChoice = data.ata * 1 + data.cobertura80 * 0.8 + data.cobertura50a80 * 0.65 + data.coberturaBajo50 * 0.45;
  const counter = Math.min(1, Math.max(0, (data.rwrChaffFlare + data.podCme) / 2));
  const fighterThreat = 1 - Math.min(0.95, Math.max(0, data.pkMejorArmaAA) * Math.min(1, data.autonomiaCazaDefensa) * Math.min(1, data.mroCazaDefensa / 24) * 0.25);
  const samThreat = Math.pow(1 - Math.min(0.99, Math.max(0, data.pkSam) * Math.min(1, data.operatividadSam)), Math.max(0, data.misilesSam));
  const aaaRaw = (Math.max(0, data.areaVulnerable) / Math.max(1, data.errorDispersion)) * (Math.max(0, data.cadenciaAAA) / 1000) * Math.max(0, data.tiempoExposicion) * Math.min(1, data.operatividadAAA);
  const aaaThreat = Math.exp(-Math.max(0, aaaRaw));
  const detectionSurvival = 1 - Math.min(0.9, detectionChoice * (1 - counter) * 0.35);
  return Math.min(1, Math.max(0, detectionSurvival * fighterThreat * samThreat * aaaThreat));
}

type SavedAirComparison = {
  analysis_key: string;
  title: string;
  status: string;
  version: number;
  updated_at: string;
  result?: Record<string, unknown>;
};

function comparisonKey(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45) || "comparacion";
  return `computo-aereo-${slug}-${Date.now()}`;
}

function ratioText(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2).replace(".", ",")} a 1`;
}

export default function AirComputationCalculator({ workspaceCode, token }: Props) {
  const [performance, setPerformance] = useState({ propio: pPropio, enemigo: pEnemigo });
  const [avionics, setAvionics] = useState(avionicsInitial);
  const [airAir, setAirAir] = useState(aaInitial);
  const [airSurface, setAirSurface] = useState(asInitial);
  const [generation, setGeneration] = useState({ propio: generationOwn, enemigo: generationEnemy });
  const [survival, setSurvival] = useState({ propio: survivalOwn, enemigo: survivalEnemy });
  const [aircraft, setAircraft] = useState({ propio: "F-16C Block 40", enemigo: "MiG-29" });
  const [comparisonName, setComparisonName] = useState("Confrontación principal");
  const [status, setStatus] = useState("Sin guardar");
  const [savedComparisons, setSavedComparisons] = useState<SavedAirComparison[]>([]);
  const [selectedKey, setSelectedKey] = useState("");

  const results = useMemo(() => {
    const p = performanceScore(performance.propio, performance.enemigo);
    const ep = performanceScore(performance.enemigo, performance.propio);
    const a = sectionGroupScore(avionics, "propio");
    const ea = sectionGroupScore(avionics, "enemigo");
    const aa = sectionGroupScore(airAir, "propio");
    const eaa = sectionGroupScore(airAir, "enemigo");
    const as = sectionGroupScore(airSurface, "propio");
    const eas = sectionGroupScore(airSurface, "enemigo");
    const iecaP = p * 0.15 + a * 0.3 + aa * 0.3 + as * 0.25;
    const iecaE = ep * 0.15 + ea * 0.3 + eaa * 0.3 + eas * 0.25;
    const genP = generationScore(generation.propio);
    const genE = generationScore(generation.enemigo);
    const survP = survivalScore(survival.propio);
    const survE = survivalScore(survival.enemigo);
    const ceacmP = iecaP * 0.4 + genP * 0.3 + survP * 0.3;
    const ceacmE = iecaE * 0.4 + genE * 0.3 + survE * 0.3;
    const ratioIeca = iecaE > 0 ? iecaP / iecaE : null;
    const ratio = ceacmE > 0 ? ceacmP / ceacmE : null;
    return { p, ep, a, ea, aa, eaa, as, eas, iecaP, iecaE, genP, genE, survP, survE, ceacmP, ceacmE, ratioIeca, ratio };
  }, [performance, avionics, airAir, airSurface, generation, survival]);

  function updateGroup(setter: React.Dispatch<React.SetStateAction<Group[]>>, groupId: string, metricId: string, side: Side, value: number) {
    setter((old) => old.map((group) => group.id === groupId ? { ...group, metrics: group.metrics.map((metric) => metric.id === metricId ? { ...metric, [side]: value } : metric) } : group));
  }

  function applyContent(content: any, version?: number) {
    if (!content) return;
    if (content.aircraft) setAircraft(content.aircraft);
    if (content.comparisonName) setComparisonName(content.comparisonName);
    if (content.performance) setPerformance(content.performance);
    if (content.avionics) setAvionics(content.avionics);
    if (content.airAir) setAirAir(content.airAir);
    if (content.airSurface) setAirSurface(content.airSurface);
    if (content.generation) setGeneration(content.generation);
    if (content.survival) setSurvival(content.survival);
    if (version) setStatus(`Comparación cargada · versión ${version}`);
  }

  async function refreshComparisons(preferredKey?: string) {
    const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, analysisKey: preferredKey || "computo-aereo-principal" }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error || "No se pudieron cargar las comparaciones.");
    const comparisons = (json.analyses || []).filter((item: SavedAirComparison) => item.analysis_key === "computo-aereo-principal" || item.analysis_key.startsWith("computo-aereo-"));
    setSavedComparisons(comparisons);
    return json;
  }

  async function loadComparison(key: string) {
    if (!key) return;
    setStatus("Cargando comparación...");
    try {
      const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, analysisKey: key }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok || !json.analysis) throw new Error(json.error || "No se encontró la comparación.");
      applyContent(json.analysis.content, json.analysis.version);
      setSelectedKey(key);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error al cargar");
    }
  }

  async function save(asNew = false) {
    if (!comparisonName.trim()) {
      setStatus("Escriba un nombre para la comparación antes de guardarla.");
      return;
    }
    setStatus("Guardando...");
    const key = asNew || !selectedKey ? comparisonKey(comparisonName) : selectedKey;
    const content = { version: "air-computation-v5", title: comparisonName.trim(), status: "borrador", comparisonName: comparisonName.trim(), aircraft, performance, avionics, airAir, airSurface, generation, survival };
    try {
      const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, analysisKey: key, content, result: results }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Error al guardar");
      setSelectedKey(key);
      await refreshComparisons(key);
      setStatus(`Guardado: ${comparisonName.trim()} · versión ${json.version}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error al guardar");
    }
  }

  function duplicateKeeping(side: Side) {
    setSelectedKey("");
    setComparisonName(`${aircraft[side]} vs nueva aeronave`);
    if (side === "propio") {
      setAircraft((old) => ({ propio: old.propio, enemigo: "" }));
      setPerformance((old) => ({ propio: old.propio, enemigo: structuredClone(pEnemigo) }));
      setAvionics((old) => old.map((group, index) => ({ ...group, metrics: group.metrics.map((metric, metricIndex) => ({ ...metric, enemigo: avionicsInitial[index].metrics[metricIndex].enemigo })) })));
      setAirAir((old) => old.map((group, index) => ({ ...group, metrics: group.metrics.map((metric, metricIndex) => ({ ...metric, enemigo: aaInitial[index].metrics[metricIndex].enemigo })) })));
      setAirSurface((old) => old.map((group, index) => ({ ...group, metrics: group.metrics.map((metric, metricIndex) => ({ ...metric, enemigo: asInitial[index].metrics[metricIndex].enemigo })) })));
      setGeneration((old) => ({ propio: old.propio, enemigo: structuredClone(generationEnemy) }));
      setSurvival((old) => ({ propio: old.propio, enemigo: structuredClone(survivalEnemy) }));
    } else {
      setAircraft((old) => ({ propio: "", enemigo: old.enemigo }));
      setPerformance((old) => ({ propio: structuredClone(pPropio), enemigo: old.enemigo }));
      setAvionics((old) => old.map((group, index) => ({ ...group, metrics: group.metrics.map((metric, metricIndex) => ({ ...metric, propio: avionicsInitial[index].metrics[metricIndex].propio })) })));
      setAirAir((old) => old.map((group, index) => ({ ...group, metrics: group.metrics.map((metric, metricIndex) => ({ ...metric, propio: aaInitial[index].metrics[metricIndex].propio })) })));
      setAirSurface((old) => old.map((group, index) => ({ ...group, metrics: group.metrics.map((metric, metricIndex) => ({ ...metric, propio: asInitial[index].metrics[metricIndex].propio })) })));
      setGeneration((old) => ({ propio: structuredClone(generationOwn), enemigo: old.enemigo }));
      setSurvival((old) => ({ propio: structuredClone(survivalOwn), enemigo: old.enemigo }));
    }
    setStatus(`Nueva comparación creada conservando los valores ${side === "propio" ? "propios" : "enemigos"}. Modifique la otra aeronave y guarde con un nombre nuevo.`);
  }

  useEffect(() => {
    (async () => {
      try {
        const json = await refreshComparisons();
        const initial = json.analysis;
        if (initial?.content && ["air-computation-v3", "air-computation-v4", "air-computation-v5"].includes(initial.content.version)) {
          applyContent(initial.content, initial.version);
          setSelectedKey(initial.analysis_key);
        }
      } catch {}
    })();
  }, [workspaceCode, token]);

  return <main className="min-h-screen bg-slate-950 p-4 text-white"><div className="mx-auto max-w-7xl">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">A3 · EJERCICIO ZEUS</p><h1 className="text-2xl font-bold">Cómputo Aéreo</h1><p className="text-sm text-slate-300">Comparaciones independientes, identificadas por nombre y recuperables desde el historial.</p></div>
      <div className="flex flex-wrap gap-2"><Link href={`/espacio/${workspaceCode}/${token}`} className="rounded bg-slate-700 px-3 py-2">Mapa</Link><Link href={`/espacio/${workspaceCode}/${token}/ppc/pcr`} className="rounded bg-violet-700 px-3 py-2">Cálculo PCR</Link><button onClick={() => save(false)} className="rounded bg-emerald-700 px-4 py-2 font-bold">Actualizar seleccionada</button><button onClick={() => save(true)} className="rounded bg-cyan-700 px-4 py-2 font-bold">Guardar como nueva</button></div>
    </header>
    <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-emerald-300">{status}</div>

    <section className="mb-5 rounded-xl border border-cyan-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-center text-xl font-bold">Comparaciones guardadas</h2>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <select value={selectedKey} onChange={(event) => loadComparison(event.target.value)} className="w-full rounded border border-slate-600 bg-slate-950 p-3 text-center">
          <option value="">Nueva comparación sin guardar</option>
          {savedComparisons.map((item) => <option key={item.analysis_key} value={item.analysis_key}>{item.title} · v{item.version} · {new Date(item.updated_at).toLocaleString("es-AR")}</option>)}
        </select>
        <button disabled={!selectedKey} onClick={() => loadComparison(selectedKey)} className="rounded bg-slate-700 px-4 py-2 font-bold disabled:opacity-40">Ver seleccionada</button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">“Guardar como nueva” conserva la comparación anterior. “Actualizar seleccionada” incrementa su versión.</p>
    </section>

    <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-4 text-center text-xl font-bold">Aeronaves a confrontar</h2>
      <label className="mb-4 block text-left text-sm font-bold">Nombre de la comparación<input value={comparisonName} onChange={(e) => setComparisonName(e.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-3 text-center" /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <AircraftInput label="Aeronave propia" value={aircraft.propio} side="propio" onChange={(value) => setAircraft((old) => ({ ...old, propio: value }))} />
        <AircraftInput label="Aeronave enemiga" value={aircraft.enemigo} side="enemigo" onChange={(value) => setAircraft((old) => ({ ...old, enemigo: value }))} />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button onClick={() => duplicateKeeping("propio")} className="rounded border border-blue-600 bg-blue-950 px-4 py-2 font-bold text-blue-200">Nueva conservando aeronave y valores propios</button>
        <button onClick={() => duplicateKeeping("enemigo")} className="rounded border border-red-600 bg-red-950 px-4 py-2 font-bold text-red-200">Nueva conservando aeronave y valores enemigos</button>
      </div>
    </section>

    <section className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Result label="IECA propio" value={results.iecaP}/>
      <Result label="IECA enemigo" value={results.iecaE}/>
      <RatioResult label={`Relación IECA ${aircraft.propio || "propio"}/${aircraft.enemigo || "enemigo"}`} value={results.ratioIeca}/>
      <Result label="CEACM propio" value={results.ceacmP}/>
      <Result label="CEACM enemigo" value={results.ceacmE}/>
      <RatioResult label={`Relación CEACM ${aircraft.propio || "propio"}/${aircraft.enemigo || "enemigo"}`} value={results.ratio}/>
    </section>
    <CalculationDiagnostic
      ieca={{ propio: results.iecaP, enemigo: results.iecaE }}
      generation={{ propio: results.genP, enemigo: results.genE }}
      survival={{ propio: results.survP, enemigo: results.survE }}
      ceacm={{ propio: results.ceacmP, enemigo: results.ceacmE }}
    />

    <PerformanceSection data={performance} setData={setPerformance} scores={{ propio: results.p, enemigo: results.ep }} />
    <GroupedSection title="Aviónica" groups={avionics} scores={{ propio: results.a, enemigo: results.ea }} onChange={(g, m, s, v) => updateGroup(setAvionics, g, m, s, v)} />
    <GroupedSection title="Armamento aire-aire" groups={airAir} scores={{ propio: results.aa, enemigo: results.eaa }} onChange={(g, m, s, v) => updateGroup(setAirAir, g, m, s, v)} showGunFactor />
    <GroupedSection title="Armamento aire-superficie" groups={airSurface} scores={{ propio: results.as, enemigo: results.eas }} onChange={(g, m, s, v) => updateGroup(setAirSurface, g, m, s, v)} />
    <GenerationSection data={generation} setData={setGeneration} scores={{ propio: results.genP, enemigo: results.genE }} />
    <SurvivalSection data={survival} setData={setSurvival} scores={{ propio: results.survP, enemigo: results.survE }} />
  </div></main>;
}

function AircraftInput({ label, value, side, onChange }: { label: string; value: string; side: Side; onChange: (value: string) => void }) {
  return <label className={`text-center font-bold ${side === "propio" ? "text-blue-300" : "text-red-300"}`}>{label}<input value={value} onChange={(e) => onChange(e.target.value)} className={`mt-2 w-full rounded border bg-slate-950 p-3 text-center text-white ${side === "propio" ? "border-blue-700" : "border-red-700"}`} placeholder="Escriba la aeronave" /></label>;
}
function Result({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-xl border border-cyan-800 bg-cyan-950/30 p-4 text-center"><p className="text-sm text-cyan-200">{label}</p><p className="text-3xl font-bold">{value !== null && Number.isFinite(value) ? value.toFixed(2) : "—"}</p></div>;
}
function RatioResult({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-center"><p className="text-sm text-amber-200">{label}</p><p className="text-3xl font-bold">{ratioText(value)}</p></div>;
}
function CalculationDiagnostic({ ieca, generation, survival, ceacm }: {
  ieca: { propio: number; enemigo: number };
  generation: { propio: number; enemigo: number };
  survival: { propio: number; enemigo: number };
  ceacm: { propio: number; enemigo: number };
}) {
  const invalid: string[] = [];
  if (generation.propio <= 0) invalid.push("La generación de salidas propia es 0. Revise aeronaves, salidas por aeronave, pilotos, salidas por piloto y MRO propios.");
  if (generation.enemigo <= 0) invalid.push("La generación de salidas enemiga es 0. Revise aeronaves, salidas por aeronave, pilotos, salidas por piloto y MRO enemigos.");
  if (survival.propio <= 0) invalid.push("La supervivencia propia es 0. Revise los datos de detección, cazas, SAM y AAA.");
  if (survival.enemigo <= 0) invalid.push("La supervivencia enemiga es 0. Revise los datos de detección, cazas, SAM y AAA.");
  return <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
    <h2 className="mb-3 text-center text-lg font-bold">Comprobación del cálculo</h2>
    <p className="text-center text-sm text-slate-300">CEACM = IECA × 0,40 + Generación de salidas × 0,30 + Supervivencia × 0,30</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <p className="rounded bg-slate-950 p-3 text-center text-sm">Propio: {ieca.propio.toFixed(2)} × 0,40 + {generation.propio.toFixed(2)} × 0,30 + {survival.propio.toFixed(4)} × 0,30 = <strong>{ceacm.propio.toFixed(2)}</strong></p>
      <p className="rounded bg-slate-950 p-3 text-center text-sm">Enemigo: {ieca.enemigo.toFixed(2)} × 0,40 + {generation.enemigo.toFixed(2)} × 0,30 + {survival.enemigo.toFixed(4)} × 0,30 = <strong>{ceacm.enemigo.toFixed(2)}</strong></p>
    </div>
    {invalid.length > 0 && <div className="mt-3 rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">{invalid.map((message) => <p key={message}>• {message}</p>)}</div>}
  </section>;
}
function NumberPair({ label, unit, help, values, onChange }: { label: string; unit: string; help: string; values: { propio: number; enemigo: number }; onChange: (side: Side, value: number) => void }) {
  return <div className="rounded-lg border border-slate-700 bg-slate-950 p-3"><h3 className="text-left font-bold">{label}</h3><p className="mb-3 text-left text-xs text-slate-400">{help}</p><div className="grid grid-cols-2 gap-3">{(["propio", "enemigo"] as Side[]).map((side) => <label key={side} className="text-center text-sm capitalize">{side}<input type="number" step="any" value={values[side]} onChange={(e) => onChange(side, Number(e.target.value))} className={`mt-1 w-full rounded border bg-slate-900 p-2 text-center ${side === "propio" ? "border-blue-700" : "border-red-700"}`} /><span className="text-xs text-slate-400">{unit}</span></label>)}</div></div>;
}
function PerformanceSection({ data, setData, scores }: { data: { propio: PerformanceData; enemigo: PerformanceData }; setData: React.Dispatch<React.SetStateAction<{ propio: PerformanceData; enemigo: PerformanceData }>>; scores: { propio: number; enemigo: number } }) {
  const fields: Array<{ key: keyof PerformanceData; label: string; unit: string; help: string }> = [
    { key: "velocidad", label: "Velocidad de combate", unit: "km/h", help: "Velocidad sostenible con configuración de combate." },
    { key: "autonomia", label: "Autonomía", unit: "h", help: "Tiempo útil de misión en el perfil considerado." },
    { key: "pesoCombate", label: "Peso de combate (W)", unit: "lb", help: "Peso total de la aeronave en configuración de combate. Se usa para relación empuje/peso y carga alar." },
    { key: "superficieAlar", label: "Superficie alar (Sa)", unit: "ft²", help: "Superficie total de las alas en pies cuadrados. Se muestra además la carga alar W/S." },
    { key: "techo", label: "Techo de combate", unit: "ft", help: "Altitud operacional máxima utilizable en combate." },
    { key: "aceleracion", label: "Capacidad de aceleración", unit: "escala 0–4", help: "Valor del Excel: 0 nula, 1 baja, 2 media, 3 alta, 4 sobresaliente. Documentar el criterio." },
    { key: "gmax", label: "Máxima capacidad G", unit: "G", help: "Límite operacional/estructural en configuración de combate." },
    { key: "empujeMaxTotal", label: "Empuje máximo total (T)", unit: "lbf", help: "Suma del empuje máximo de todos los motores. No ingrese el empuje de un solo motor." },
    { key: "aar", label: "AAR", unit: "0–1", help: "Reabastecimiento en vuelo: 1 plenamente disponible; 0,5 limitado; 0 ausente." },
    { key: "factorCombate", label: "Factor de combate (CF)", unit: "índice", help: "Índice doctrinario del Excel. Mantenga la misma escala para ambas aeronaves." },
  ];
  const dP = performanceDerived(data.propio), dE = performanceDerived(data.enemigo);
  return <details open className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4"><summary className="cursor-pointer text-center text-xl font-bold">Performance</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Result label="Performance propia" value={scores.propio}/><Result label="Performance enemiga" value={scores.enemigo}/></div><p className="mt-3 rounded bg-slate-800 p-3 text-sm text-slate-300">Se eliminó “Radio de combate”. La superficie alar queda como dato técnico y permite calcular la carga alar. La relación empuje/peso se calcula automáticamente: T/W.</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{fields.map((field) => <NumberPair key={field.key} label={field.label} unit={field.unit} help={field.help} values={{ propio: data.propio[field.key], enemigo: data.enemigo[field.key] }} onChange={(side, value) => setData((old) => ({ ...old, [side]: { ...old[side], [field.key]: value } }))} />)}<DerivedCard label="Relación empuje/peso (T/W)" propio={dP.relacionEmpujePeso} enemigo={dE.relacionEmpujePeso} /><DerivedCard label="Carga alar (W/S)" propio={dP.cargaAlar} enemigo={dE.cargaAlar} suffix=" lb/ft²" /></div></details>;
}
function DerivedCard({ label, propio, enemigo, suffix = "" }: { label: string; propio: number; enemigo: number; suffix?: string }) { return <div className="rounded-lg border border-amber-700 bg-amber-950/20 p-4"><h3 className="text-center font-bold text-amber-200">{label} · cálculo automático</h3><div className="mt-3 grid grid-cols-2 gap-3 text-center"><div><p className="text-sm text-blue-300">Propio</p><p className="text-2xl font-bold">{propio.toFixed(3)}{suffix}</p></div><div><p className="text-sm text-red-300">Enemigo</p><p className="text-2xl font-bold">{enemigo.toFixed(3)}{suffix}</p></div></div></div>; }
function GroupedSection({ title, groups, scores, onChange, showGunFactor = false }: { title: string; groups: Group[]; scores: { propio: number; enemigo: number }; onChange: (groupId: string, metricId: string, side: Side, value: number) => void; showGunFactor?: boolean }) {
  return <details open className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4"><summary className="cursor-pointer text-center text-xl font-bold">{title}</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Result label={`${title} propia`} value={scores.propio}/><Result label={`${title} enemiga`} value={scores.enemigo}/></div><div className="mt-4 space-y-4">{groups.map((group) => <section key={group.id} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><h3 className="text-center text-lg font-bold">{group.title} <span className="text-sm font-normal text-slate-400">({group.weight.toFixed(1)} % del total)</span></h3><div className="mt-3 grid gap-3 lg:grid-cols-2">{group.metrics.map((metric) => <NumberPair key={metric.id} label={metric.label} unit={metric.unit} help={`${metric.help}${metric.weight > 0 ? ` Ponderación interna: ${metric.weight} %.` : ""}`} values={{ propio: metric.propio, enemigo: metric.enemigo }} onChange={(side, value) => onChange(group.id, metric.id, side, value)} />)}{showGunFactor && group.id === "guns" && <DerivedCard label="Fₗ — factor letal relativo (Wp × CT × Vm²)" propio={(group.metrics.find(m => m.id === "wp")?.propio || 0) * (group.metrics.find(m => m.id === "ct")?.propio || 0) * (group.metrics.find(m => m.id === "vm")?.propio || 0) ** 2} enemigo={(group.metrics.find(m => m.id === "wp")?.enemigo || 0) * (group.metrics.find(m => m.id === "ct")?.enemigo || 0) * (group.metrics.find(m => m.id === "vm")?.enemigo || 0) ** 2} />}</div></section>)}</div></details>;
}
function GenerationSection({ data, setData, scores }: { data: { propio: GenerationData; enemigo: GenerationData }; setData: React.Dispatch<React.SetStateAction<{ propio: GenerationData; enemigo: GenerationData }>>; scores: { propio: number; enemigo: number } }) {
  const fields: Array<{ key: keyof GenerationData; label: string; unit: string; help: string }> = [
    { key: "todoTiempo", label: "Todo tiempo", unit: "0–1", help: "1 día/noche e IMC; 0,5 parcial; 0 solo condiciones favorables." },
    { key: "aviones", label: "N.º de aviones", unit: "aeronaves", help: "Cantidad asignada a la confrontación." },
    { key: "salidasAvion", label: "Salidas por avión", unit: "salidas/período", help: "Capacidad acumulada de salidas por aeronave en el período analizado." },
    { key: "pilotos", label: "Pilotos", unit: "pilotos", help: "Tripulaciones/pilotos disponibles." },
    { key: "salidasPiloto", label: "Salidas por piloto", unit: "salidas/período", help: "Máximo sostenible por piloto para el período." },
    { key: "mro", label: "MRO", unit: "salidas", help: "Máximo requerimiento/resultado operacional disponible según el Excel." },
    { key: "mroPiloto", label: "MRO piloto", unit: "salidas/día", help: "Capacidad diaria limitada por pilotos." },
    { key: "mroLogDia", label: "MRO logístico (día)", unit: "salidas/día", help: "Capacidad logística diurna." },
    { key: "mroLogDiaNoche", label: "MRO logístico (día/noche)", unit: "salidas/día", help: "Capacidad logística sostenida en operaciones diurnas y nocturnas." },
  ];
  return <details className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4"><summary className="cursor-pointer text-center text-xl font-bold">Generación de salidas</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Result label="Generación propia" value={scores.propio}/><Result label="Generación enemiga" value={scores.enemigo}/></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{fields.map((field) => <NumberPair key={field.key} label={field.label} unit={field.unit} help={field.help} values={{ propio: data.propio[field.key], enemigo: data.enemigo[field.key] }} onChange={(side, value) => setData((old) => ({ ...old, [side]: { ...old[side], [field.key]: value } }))} />)}</div></details>;
}
function SurvivalSection({ data, setData, scores }: { data: { propio: SurvivalData; enemigo: SurvivalData }; setData: React.Dispatch<React.SetStateAction<{ propio: SurvivalData; enemigo: SurvivalData }>>; scores: { propio: number; enemigo: number } }) {
  const fields: Array<{ key: keyof SurvivalData; label: string; unit: string; help: string }> = [
    { key: "ata", label: "Adversario con ATA", unit: "0/1", help: "Marque 1 cuando existe alerta temprana aerotransportada; 0 en caso contrario." },
    { key: "cobertura80", label: "Sin ATA, cobertura radar ≥80 %", unit: "0/1", help: "Seleccione solo una condición de detección." },
    { key: "cobertura50a80", label: "Sin ATA, cobertura radar 50–80 %", unit: "0/1", help: "Seleccione solo una condición de detección." },
    { key: "coberturaBajo50", label: "Sin ATA, cobertura radar <50 %", unit: "0/1", help: "Seleccione solo una condición de detección." },
    { key: "rwrChaffFlare", label: "RWR + chaff/flare", unit: "0–1", help: "Efectividad estimada del conjunto defensivo." },
    { key: "podCme", label: "Pod CME", unit: "0–1", help: "Efectividad del pod de contramedidas electrónicas." },
    { key: "mroCazaDefensa", label: "MRO caza de defensa", unit: "h", help: "Disponibilidad/actividad del caza defensor en el período." },
    { key: "autonomiaCazaDefensa", label: "Autonomía caza de defensa", unit: "h", help: "Permanencia útil del caza defensor en la zona." },
    { key: "pkMejorArmaAA", label: "Pk mejor armamento A-A", unit: "0–1", help: "Pk del mejor misil aire-aire disponible para la defensa." },
    { key: "pkSam", label: "Probabilidad de derribo SAM", unit: "0–1", help: "Pk por misil del sistema SAM considerado." },
    { key: "operatividadSam", label: "Operatividad SAM", unit: "0–1", help: "Fracción operativa del sistema SAM." },
    { key: "misilesSam", label: "N.º misiles SAM lanzados", unit: "misiles", help: "Cantidad esperada de misiles lanzados contra una aeronave/paquete según el escenario." },
    { key: "areaVulnerable", label: "Área vulnerable del avión", unit: "m²", help: "Área proyectada vulnerable utilizada para AAA." },
    { key: "errorDispersion", label: "Error de dispersión AAA", unit: "m", help: "Dispersión representativa del sistema de artillería antiaérea." },
    { key: "cadenciaAAA", label: "Cadencia de tiro AAA", unit: "disparos/min", help: "Cadencia de fuego efectiva." },
    { key: "tiempoExposicion", label: "Tiempo de exposición", unit: "min", help: "Tiempo dentro de la envolvente eficaz de AAA." },
    { key: "operatividadAAA", label: "Operatividad AAA", unit: "0–1", help: "Fracción operativa de la artillería antiaérea." },
  ];
  return <details className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4"><summary className="cursor-pointer text-center text-xl font-bold">Capacidad de supervivencia</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Result label="Supervivencia propia" value={scores.propio}/><Result label="Supervivencia enemiga" value={scores.enemigo}/></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{fields.map((field) => <NumberPair key={field.key} label={field.label} unit={field.unit} help={field.help} values={{ propio: data.propio[field.key], enemigo: data.enemigo[field.key] }} onChange={(side, value) => setData((old) => ({ ...old, [side]: { ...old[side], [field.key]: value } }))} />)}</div></details>;
}
