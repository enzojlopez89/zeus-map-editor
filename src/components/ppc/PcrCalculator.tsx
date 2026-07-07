"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PcrStatus = "borrador" | "en_analisis" | "aprobado" | "descartado";
type SectionKind = "positive" | "defense";
type CoefficientMode = "manual" | "auto";

type PcrItem = {
  id: string;
  name: string;
  priority: number;
  coefficient: number;
  coefficientMode: CoefficientMode;
  blue: number;
  red: number;
  notes: string;
};

type PcrSubsection = {
  id: string;
  name: string;
  items: PcrItem[];
};

type PcrSection = {
  id: "composition" | "characteristics" | "services" | "airDefense";
  name: string;
  kind: SectionKind;
  subsections: PcrSubsection[];
};

type PcrDocument = {
  title: string;
  analysisKey: string;
  blueName: string;
  redName: string;
  responsible: string;
  status: PcrStatus;
  date: string;
  situation: string;
  conclusion: string;
  sections: PcrSection[];
};

type SavedAnalysis = {
  id: string;
  analysis_key: string;
  title: string | null;
  status: string | null;
  version: number | null;
  updated_at: string | null;
  result?: unknown;
};

type Props = {
  workspaceCode: string;
  token: string;
};

const QUANTIFICATION: Record<number, Record<number, number>> = {
  2: { 1: 0.68, 2: 0.32 },
  3: { 1: 0.5, 2: 0.34, 3: 0.16 },
  4: { 1: 0.4, 2: 0.3, 3: 0.2, 4: 0.1 },
  5: { 1: 0.334, 2: 0.267, 3: 0.2, 4: 0.135, 5: 0.064 },
  6: { 1: 0.28, 2: 0.24, 3: 0.192, 4: 0.144, 5: 0.096, 6: 0.048 },
  7: { 1: 0.25, 2: 0.214, 3: 0.18, 4: 0.144, 5: 0.108, 6: 0.07, 7: 0.034 },
  8: { 1: 0.224, 2: 0.194, 3: 0.168, 4: 0.14, 5: 0.11, 6: 0.084, 7: 0.054, 8: 0.026 },
  9: { 1: 0.2, 2: 0.18, 3: 0.16, 4: 0.13, 5: 0.11, 6: 0.09, 7: 0.07, 8: 0.04, 9: 0.02 },
  10: { 1: 0.182, 2: 0.164, 3: 0.144, 4: 0.126, 5: 0.11, 6: 0.092, 7: 0.072, 8: 0.054, 9: 0.036, 10: 0.02 },
  11: { 1: 0.165, 2: 0.152, 3: 0.135, 4: 0.122, 5: 0.105, 6: 0.092, 7: 0.075, 8: 0.062, 9: 0.045, 10: 0.032, 11: 0.015 },
  12: { 1: 0.154, 2: 0.14, 3: 0.13, 4: 0.114, 5: 0.104, 6: 0.09, 7: 0.076, 8: 0.065, 9: 0.05, 10: 0.039, 11: 0.026, 12: 0.012 },
};

function makeId(prefix = "pcr") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function n(value: number | string | null | undefined) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function item(
  name: string,
  priority: number,
  coefficient: number,
  blue: number,
  red: number,
  notes = "",
  coefficientMode: CoefficientMode = "manual",
): PcrItem {
  return {
    id: makeId("item"),
    name,
    priority,
    coefficient,
    coefficientMode,
    blue,
    red,
    notes,
  };
}

function coefficientFor(subsection: PcrSubsection, itemValue: PcrItem) {
  if (itemValue.coefficientMode === "manual") return n(itemValue.coefficient);
  const count = Math.max(1, subsection.items.length);
  const priority = Math.max(1, Math.round(n(itemValue.priority)));
  const tableValue = QUANTIFICATION[count]?.[priority];
  if (typeof tableValue === "number") return tableValue;
  const raw = Array.from({ length: count }, (_, index) => count - index);
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw[priority - 1] ? raw[priority - 1] / total : 1 / count;
}

function defaultDocument(): PcrDocument {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: "PCR ZEUS 1 TERRA NORTE",
    analysisKey: "principal",
    blueName: "TERRA",
    redName: "NORTE",
    responsible: "",
    status: "borrador",
    date: today,
    situation: "Escenario ZEUS 1 / Terra Norte. Datos iniciales cargados desde la planilla PCR.",
    conclusion: "El resultado inicial de la planilla arroja ventaja relativa para TERRA. NORTE queda en 0,822 respecto de TERRA después de considerar composición, características, servicios/facilidades y defensa aérea como penalización cruzada.",
    sections: [
      {
        id: "composition",
        name: "I. Composición de la fuerza",
        kind: "positive",
        subsections: [
          {
            id: "composition-personal",
            name: "Personal",
            items: [
              item("Efectivo Oficiales Pilotos", 1, 0.115, 666, 340),
              item("Efectivo Tripulaciones Aéreas no Pilotos", 2, 0.108, 0, 0),
              item("Efectivo Especialistas", 3, 0.101, 349, 326),
              item("Efectivo Servicios", 6, 0.08, 196, 184),
              item("Efectivo Cadetes", 11, 0.045, 0, 0),
              item("Efectivo Personal Subalterno", 9, 0.059, 3028, 3750),
              item("Efectivo Alumnos", 14, 0.024, 0, 0),
              item("Efectivo Personal de Tropa", 15, 0.017, 2027, 1650),
              item("Efectivo Personal Civil Profesional", 8, 0.066, 213, 213),
              item("Efectivo Personal Civil Técnico", 10, 0.052, 0, 0),
              item("Reserva Pilotos Comerciales", 4, 0.094, 0, 0),
              item("Reserva Pilotos Retirados", 5, 0.087, 0, 0),
              item("Reserva Personal Superior Retirado", 7, 0.073, 0, 0),
              item("Reserva Personal Subalterno Retirado", 12, 0.038, 0, 0),
              item("Reserva Personal de Tropa", 16, 0.01, 0, 0),
              item("Reserva Personal Civil Jubilado", 13, 0.031, 0, 0),
            ],
          },
          {
            id: "composition-air-material",
            name: "Material aéreo por categoría",
            items: [
              item("Aeronaves de combate", 1, 0.28, 41.6, 33.6, "Subtotal ponderado interno de cazas/multirol, apoyo, bombarderos y helicópteros de combate."),
              item("Aeronaves de transporte", 2, 0.192, 5.842, 4.634),
              item("Aeronaves de reconocimiento", 3, 0.24, 7.48, 3.4),
              item("Helicópteros", 4, 0.144, 13.8, 10.2),
              item("Aeronaves de instrucción", 5, 0.096, 0, 0),
              item("Aeronaves de reserva", 6, 0.048, 0, 0),
            ],
          },
        ],
      },
      {
        id: "characteristics",
        name: "II. Características de la fuerza",
        kind: "positive",
        subsections: [
          {
            id: "characteristics-personal",
            name: "Características del personal",
            items: [
              item("Doctrina", 1, 0.5, 76.59, 39.1, "Factor B/R de la planilla transformado a coeficiente numérico."),
              item("Preparación", 2, 0.5, 50.929, 47.646),
              item("Entrenamiento", 3, 0.34, 76.59, 39.1),
              item("Capacitación", 4, 0.5, 178.652, 221.25),
              item("Capacidad de los Mandos", 5, 0.5, 111.839, 72.026),
              item("Capacidad de Movilización", 6, 0.34, 0, 0),
              item("Moral y Espíritu de Cuerpo", 7, 0.5, 0, 0),
              item("Experiencia de Combate", 8, 0.5, 76.59, 39.1),
            ],
          },
          {
            id: "characteristics-air-material",
            name: "Características del material aéreo",
            items: [
              item("PCR parcial de material aéreo", 1, 1, 181.2727233, 119.46537712, "Valor consolidado de aeronaves de combate, transporte, reconocimiento y helicópteros en la hoja SECC II."),
            ],
          },
        ],
      },
      {
        id: "services",
        name: "III. Servicios y facilidades",
        kind: "positive",
        subsections: [
          {
            id: "services-summary",
            name: "Servicios y facilidades agregados",
            items: [
              item("Resumen de bases aéreas, servicios de apoyo y pistas", 1, 1, 22.13172, 14.9436, "Valor consolidado de la hoja SECC III."),
            ],
          },
        ],
      },
      {
        id: "airDefense",
        name: "IV. Defensa aérea",
        kind: "defense",
        subsections: [
          {
            id: "air-defense-integrated",
            name: "Defensa aérea integrada",
            items: [
              item("Defensa aérea con nivel de integración", 1, 1, 58.13053464, 89.09441376, "La defensa aérea se aplica como penalización cruzada en el resumen del PCR."),
            ],
          },
        ],
      },
    ],
  };
}

function blankDocument(): PcrDocument {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: "Nuevo escenario PCR",
    analysisKey: `escenario-${today}-${Date.now()}`,
    blueName: "BANDO AZUL",
    redName: "BANDO ROJO",
    responsible: "",
    status: "borrador",
    date: today,
    situation: "",
    conclusion: "",
    sections: [
      { id: "composition", name: "I. Composición de la fuerza", kind: "positive", subsections: [{ id: makeId("sub"), name: "Personal / medios / armamento", items: [] }] },
      { id: "characteristics", name: "II. Características de la fuerza", kind: "positive", subsections: [{ id: makeId("sub"), name: "Cualidades y rendimiento", items: [] }] },
      { id: "services", name: "III. Servicios y facilidades", kind: "positive", subsections: [{ id: makeId("sub"), name: "Apoyo, bases y sostenimiento", items: [] }] },
      { id: "airDefense", name: "IV. Defensa aérea", kind: "defense", subsections: [{ id: makeId("sub"), name: "Defensa aérea", items: [] }] },
    ],
  };
}

function weightedTotal(subsection: PcrSubsection, side: "blue" | "red") {
  return subsection.items.reduce((sum, row) => sum + n(row[side]) * coefficientFor(subsection, row), 0);
}

function relationFor(blue: number, red: number) {
  if (blue <= 0 && red <= 0) return { blue: 0, red: 0, leader: "=" as const };
  if (blue >= red) return { blue: 1, red: red > 0 ? red / blue : 0, leader: "blue" as const };
  return { blue: blue > 0 ? blue / red : 0, red: 1, leader: "red" as const };
}

function scoreSubsection(subsection: PcrSubsection) {
  const blueRaw = weightedTotal(subsection, "blue");
  const redRaw = weightedTotal(subsection, "red");
  const relation = relationFor(blueRaw, redRaw);
  return { blueRaw, redRaw, ...relation };
}

function scoreSection(section: PcrSection) {
  const subsectionScores = section.subsections.map(scoreSubsection);
  const count = Math.max(1, subsectionScores.length);
  const blue = subsectionScores.reduce((sum, score) => sum + score.blue, 0) / count;
  const red = subsectionScores.reduce((sum, score) => sum + score.red, 0) / count;
  const blueRaw = subsectionScores.reduce((sum, score) => sum + score.blueRaw, 0);
  const redRaw = subsectionScores.reduce((sum, score) => sum + score.redRaw, 0);
  return { blueRaw, redRaw, blue, red, subsections: subsectionScores };
}

function scoreDocument(document: PcrDocument) {
  const sections = Object.fromEntries(document.sections.map((section) => [section.id, scoreSection(section)])) as Record<PcrSection["id"], ReturnType<typeof scoreSection>>;
  const positiveBlue = sections.composition.blue + sections.characteristics.blue + sections.services.blue;
  const positiveRed = sections.composition.red + sections.characteristics.red + sections.services.red;
  const blueRaw = Math.max(0, positiveBlue - sections.airDefense.red);
  const redRaw = Math.max(0, positiveRed - sections.airDefense.blue);
  const final = relationFor(blueRaw, redRaw);
  return {
    sections,
    positiveBlue,
    positiveRed,
    blueRaw,
    redRaw,
    pcrBlue: final.blue,
    pcrRed: final.red,
    leader: final.leader,
  };
}

function format(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.000";
}

function parseDocument(value: unknown): PcrDocument | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PcrDocument>;
  if (!Array.isArray(candidate.sections)) return null;
  const hasNewStructure = candidate.sections.every((section) =>
    section &&
    typeof section === "object" &&
    "id" in section &&
    Array.isArray((section as Partial<PcrSection>).subsections),
  );
  if (!hasNewStructure) return null;
  return candidate as PcrDocument;
}

export default function PcrCalculator({ workspaceCode, token }: Props) {
  const [document, setDocument] = useState<PcrDocument>(() => defaultDocument());
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [message, setMessage] = useState("Cargando análisis...");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const result = useMemo(() => scoreDocument(document), [document]);

  async function loadAnalysis(analysisKey = document.analysisKey, silent = false) {
    if (!silent) {
      setLoading(true);
      setMessage("Cargando análisis...");
    }
    try {
      const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, analysisKey }),
        cache: "no-store",
      });
      const apiResult = await response.json();
      if (!response.ok || !apiResult.ok) throw new Error(apiResult.error ?? "No se pudo cargar el PCR.");
      setSavedAnalyses(apiResult.analyses ?? []);
      const loaded = parseDocument(apiResult.analysis?.content);
      if (loaded) {
        setDocument({ ...loaded, analysisKey: apiResult.analysis.analysis_key ?? loaded.analysisKey ?? analysisKey });
        setVersion(Number(apiResult.analysis.version ?? 0));
        setMessage("Análisis recuperado desde Supabase.");
      } else {
        setMessage("No había análisis guardado. Se cargaron los datos iniciales de la planilla.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al cargar el PCR.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalysis("principal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceCode, token]);

  function patchDocument(patch: Partial<PcrDocument>) {
    setDocument((current) => ({ ...current, ...patch }));
  }

  function updateSection(sectionId: PcrSection["id"], updater: (section: PcrSection) => PcrSection) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? updater(section) : section),
    }));
  }

  function updateSubsection(sectionId: PcrSection["id"], subsectionId: string, updater: (subsection: PcrSubsection) => PcrSubsection) {
    updateSection(sectionId, (section) => ({
      ...section,
      subsections: section.subsections.map((subsection) => subsection.id === subsectionId ? updater(subsection) : subsection),
    }));
  }

  function updateItem(sectionId: PcrSection["id"], subsectionId: string, itemId: string, patch: Partial<PcrItem>) {
    updateSubsection(sectionId, subsectionId, (subsection) => ({
      ...subsection,
      items: subsection.items.map((row) => row.id === itemId ? { ...row, ...patch } : row),
    }));
  }

  async function save() {
    setSaving(true);
    setMessage("Guardando PCR...");
    try {
      const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          analysisKey: document.analysisKey || "principal",
          content: document,
          result,
        }),
      });
      const apiResult = await response.json();
      if (!response.ok || !apiResult.ok) throw new Error(apiResult.error ?? "No se pudo guardar.");
      setVersion(Number(apiResult.version ?? version + 1));
      setMessage(`PCR guardado correctamente. Versión ${apiResult.version ?? version + 1}.`);
      void loadAnalysis(document.analysisKey, true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de guardado.");
    } finally {
      setSaving(false);
    }
  }

  function clearScenario() {
    const ok = window.confirm("Esto borra todos los valores de la pantalla actual para cargar otro escenario. No elimina lo ya guardado en Supabase hasta que vuelvas a guardar. ¿Continuar?");
    if (!ok) return;
    setDocument(blankDocument());
    setVersion(0);
    setMessage("Escenario en blanco listo para cargar manualmente.");
  }

  function restoreZeus() {
    const ok = window.confirm("Se reemplazará la pantalla actual por los datos iniciales de la planilla PCR ZEUS 1. ¿Continuar?");
    if (!ok) return;
    setDocument(defaultDocument());
    setVersion(0);
    setMessage("Datos iniciales de la planilla restaurados. Guardá para sobrescribir el escenario actual.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">EJERCICIO ZEUS · A3 OPERACIONES · PPC</p>
            <h1 className="text-xl font-bold">Calculadora genérica de Poder Combativo Relativo</h1>
            <p className="text-sm text-slate-300">Carga manual de variables, cuantificación por prioridad y resumen proporcional entre dos bandos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/espacio/${workspaceCode}/${token}`} className="rounded bg-slate-700 px-4 py-2 font-semibold hover:bg-slate-600">Volver al mapa</Link>
            <button type="button" onClick={restoreZeus} className="rounded bg-amber-700 px-4 py-2 font-semibold hover:bg-amber-600">Restaurar ZEUS</button>
            <button type="button" onClick={clearScenario} className="rounded bg-red-900 px-4 py-2 font-semibold hover:bg-red-800">Borrado completo</button>
            <button type="button" onClick={() => void save()} disabled={saving} className="rounded bg-cyan-700 px-4 py-2 font-bold hover:bg-cyan-600 disabled:opacity-50">{saving ? "Guardando..." : "Guardar PCR"}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] space-y-5 p-4">
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="xl:col-span-2">Título del análisis<input value={document.title} onChange={(event) => patchDocument({ title: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
            <label>Clave de guardado<input value={document.analysisKey} onChange={(event) => patchDocument({ analysisKey: event.target.value.trim() || "principal" })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
            <label>Responsable<input value={document.responsible} onChange={(event) => patchDocument({ responsible: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
            <label>Fecha<input type="date" value={document.date} onChange={(event) => patchDocument({ date: event.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
            <label>Estado<select value={document.status} onChange={(event) => patchDocument({ status: event.target.value as PcrStatus })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"><option value="borrador">Borrador</option><option value="en_analisis">En análisis</option><option value="aprobado">Aprobado</option><option value="descartado">Descartado</option></select></label>
            <label>Bando 1<input value={document.blueName} onChange={(event) => patchDocument({ blueName: event.target.value })} className="mt-1 w-full rounded border border-blue-700 bg-blue-950 px-3 py-2" /></label>
            <label>Bando 2<input value={document.redName} onChange={(event) => patchDocument({ redName: event.target.value })} className="mt-1 w-full rounded border border-red-700 bg-red-950 px-3 py-2" /></label>
            <label className="md:col-span-2 xl:col-span-4">Situación considerada<textarea value={document.situation} onChange={(event) => patchDocument({ situation: event.target.value })} rows={2} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span>{message}</span>
            <span>Versión: {version}</span>
            <span>La prioridad 1 recibe mayor coeficiente. Podés dejar coeficiente manual o usar cuantificación automática.</span>
          </div>
          {savedAnalyses.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3">
              <p className="mb-2 font-semibold text-slate-200">Análisis guardados</p>
              <div className="flex flex-wrap gap-2">
                {savedAnalyses.map((analysis) => (
                  <button key={analysis.id} type="button" onClick={() => void loadAnalysis(analysis.analysis_key)} className={`rounded px-3 py-1.5 text-sm font-semibold ${analysis.analysis_key === document.analysisKey ? "bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"}`}>
                    {analysis.title || analysis.analysis_key} · v{analysis.version ?? 0}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-amber-700 bg-amber-950/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-amber-200">Resumen del PCR</h2>
              <p className="text-sm text-amber-100">El resultado se expresa como proporción relativa: el bando con mayor valor queda en 1 y el otro queda como fracción comparativa.</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">Ventaja</p>
              <p className="text-3xl font-black text-amber-200">{result.leader === "blue" ? document.blueName : result.leader === "red" ? document.redName : "Equilibrio"}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-blue-950 p-4"><p className="text-sm text-blue-200">Total {document.blueName}</p><p className="text-3xl font-bold">{format(result.blueRaw)}</p><p className="text-xs text-blue-200">PCR: {format(result.pcrBlue)}</p></div>
            <div className="rounded-lg bg-red-950 p-4"><p className="text-sm text-red-200">Total {document.redName}</p><p className="text-3xl font-bold">{format(result.redRaw)}</p><p className="text-xs text-red-200">PCR: {format(result.pcrRed)}</p></div>
            <div className="rounded-lg bg-slate-900 p-4 xl:col-span-2">
              <p className="mb-2 text-sm font-semibold text-slate-200">Gráfico representativo</p>
              <div className="space-y-3">
                <div><div className="mb-1 flex justify-between text-xs"><span>{document.blueName}</span><span>{format(result.pcrBlue)}</span></div><div className="h-5 rounded bg-slate-800"><div className="h-5 rounded bg-blue-500" style={{ width: `${Math.max(2, result.pcrBlue * 100)}%` }} /></div></div>
                <div><div className="mb-1 flex justify-between text-xs"><span>{document.redName}</span><span>{format(result.pcrRed)}</span></div><div className="h-5 rounded bg-slate-800"><div className="h-5 rounded bg-red-500" style={{ width: `${Math.max(2, result.pcrRed * 100)}%` }} /></div></div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {document.sections.map((section) => {
              const sectionScore = result.sections[section.id];
              return <div key={section.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><p className="font-bold text-slate-100">{section.name}</p><p>{document.blueName}: {format(sectionScore.blue)}</p><p>{document.redName}: {format(sectionScore.red)}</p><p className={section.kind === "defense" ? "text-red-300" : "text-emerald-300"}>{section.kind === "defense" ? "Penalización cruzada" : "Aporte positivo"}</p></div>;
            })}
          </div>
          <label className="mt-4 block">Conclusión / recomendación<textarea value={document.conclusion} onChange={(event) => patchDocument({ conclusion: event.target.value })} rows={4} className="mt-1 w-full rounded border border-amber-800 bg-slate-950 px-3 py-2" /></label>
        </section>

        {document.sections.map((section) => {
          const sectionScore = result.sections[section.id];
          return (
            <section key={section.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-800 px-4 py-3">
                <div>
                  <h2 className="font-bold text-cyan-200">{section.name}</h2>
                  <p className="text-xs text-slate-300">Relación de sección — {document.blueName}: {format(sectionScore.blue)} · {document.redName}: {format(sectionScore.red)} · Totales ponderados: {format(sectionScore.blueRaw)} / {format(sectionScore.redRaw)}</p>
                </div>
                <button type="button" onClick={() => updateSection(section.id, (current) => ({ ...current, subsections: [...current.subsections, { id: makeId("sub"), name: "Nueva subsección", items: [] }] }))} className="rounded bg-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-600">Agregar subsección</button>
              </div>

              <div className="space-y-4 p-4">
                {section.subsections.map((subsection, subsectionIndex) => {
                  const subsectionScore = scoreSubsection(subsection);
                  return (
                    <div key={subsection.id} className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <input value={subsection.name} onChange={(event) => updateSubsection(section.id, subsection.id, (current) => ({ ...current, name: event.target.value }))} className="min-w-[280px] rounded border border-slate-700 bg-slate-950 px-3 py-1.5 font-semibold" />
                          <span className="text-xs text-slate-300">Subsección {subsectionIndex + 1}: {format(subsectionScore.blue)} / {format(subsectionScore.red)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => updateSubsection(section.id, subsection.id, (current) => ({ ...current, items: [...current.items, item("Nueva variable", current.items.length + 1, 1, 0, 0, "", "auto")] }))} className="rounded bg-cyan-800 px-3 py-1.5 text-sm font-semibold hover:bg-cyan-700">Agregar variable</button>
                          <button type="button" onClick={() => updateSection(section.id, (current) => ({ ...current, subsections: current.subsections.filter((itemSub) => itemSub.id !== subsection.id) }))} className="rounded bg-red-950 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900">Eliminar subsección</button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1180px] text-sm">
                          <thead className="bg-slate-950 text-slate-300">
                            <tr>
                              <th className="p-2 text-left">Variable / medio / criterio</th>
                              <th className="p-2">Prioridad</th>
                              <th className="p-2">Coef.</th>
                              <th className="p-2">Modo</th>
                              <th className="p-2">{document.blueName}</th>
                              <th className="p-2">Pond.</th>
                              <th className="p-2">{document.redName}</th>
                              <th className="p-2">Pond.</th>
                              <th className="p-2 text-left">Fundamento</th>
                              <th className="p-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {subsection.items.length === 0 && <tr><td colSpan={10} className="p-4 text-center text-slate-400">Sin variables. Agregá una variable para comenzar a cargar este escenario.</td></tr>}
                            {subsection.items.map((row) => {
                              const coeff = coefficientFor(subsection, row);
                              return (
                                <tr key={row.id} className="border-t border-slate-800">
                                  <td className="p-2"><input value={row.name} onChange={(event) => updateItem(section.id, subsection.id, row.id, { name: event.target.value })} className="w-full rounded bg-slate-900 px-2 py-1.5" /></td>
                                  <td className="p-2"><input type="number" min={1} max={Math.max(1, subsection.items.length)} value={row.priority} onChange={(event) => updateItem(section.id, subsection.id, row.id, { priority: n(event.target.value) })} className="w-20 rounded bg-slate-900 px-2 py-1.5 text-center" /></td>
                                  <td className="p-2"><input type="number" step="0.001" value={row.coefficientMode === "auto" ? coeff : row.coefficient} disabled={row.coefficientMode === "auto"} onChange={(event) => updateItem(section.id, subsection.id, row.id, { coefficient: n(event.target.value) })} className="w-24 rounded bg-slate-900 px-2 py-1.5 text-right disabled:opacity-60" /></td>
                                  <td className="p-2"><select value={row.coefficientMode} onChange={(event) => updateItem(section.id, subsection.id, row.id, { coefficientMode: event.target.value as CoefficientMode })} className="rounded bg-slate-900 px-2 py-1.5"><option value="manual">Manual</option><option value="auto">Auto</option></select></td>
                                  <td className="p-2"><input type="number" step="any" value={row.blue} onChange={(event) => updateItem(section.id, subsection.id, row.id, { blue: n(event.target.value) })} className="w-28 rounded bg-blue-950 px-2 py-1.5 text-right" /></td>
                                  <td className="p-2 text-right font-mono text-blue-200">{format(n(row.blue) * coeff)}</td>
                                  <td className="p-2"><input type="number" step="any" value={row.red} onChange={(event) => updateItem(section.id, subsection.id, row.id, { red: n(event.target.value) })} className="w-28 rounded bg-red-950 px-2 py-1.5 text-right" /></td>
                                  <td className="p-2 text-right font-mono text-red-200">{format(n(row.red) * coeff)}</td>
                                  <td className="p-2"><input value={row.notes} onChange={(event) => updateItem(section.id, subsection.id, row.id, { notes: event.target.value })} className="w-full rounded bg-slate-900 px-2 py-1.5" /></td>
                                  <td className="p-2"><button type="button" onClick={() => updateSubsection(section.id, subsection.id, (current) => ({ ...current, items: current.items.filter((itemRow) => itemRow.id !== row.id) }))} className="rounded bg-red-950 px-2 py-1 text-red-200 hover:bg-red-900">Eliminar</button></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
