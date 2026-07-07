"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PCR_DOCUMENT, QUANTIFICATION_TABLE } from "@/components/ppc/pcrDefaultData";

type PcrStatus = "borrador" | "en_analisis" | "aprobado" | "descartado";
type SectionKind = "positive" | "defense";
type CoefficientMode = "manual" | "auto";
type ActiveTab = "resumen" | "cuantificacion" | string;

export type PcrItem = {
  id: string;
  name: string;
  priority: number;
  coefficient: number;
  coefficientMode: CoefficientMode;
  blue: number;
  red: number;
  unit?: string;
  reference?: string;
  guidance?: string;
  notes: string;
  enabled?: boolean;
};

export type PcrSubsection = {
  id: string;
  name: string;
  guidance?: string;
  weight?: number;
  items: PcrItem[];
};

export type PcrSection = {
  id: "composition" | "characteristics" | "services" | "airDefense" | string;
  name: string;
  kind: SectionKind;
  guidance?: string;
  weight?: number;
  subsections: PcrSubsection[];
};

export type PcrDocument = {
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

function format(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.000";
}

function percent(value: number) {
  return `${Math.max(2, Math.min(100, value * 100)).toFixed(0)}%`;
}

function cloneDefault(): PcrDocument {
  const copy = JSON.parse(JSON.stringify(DEFAULT_PCR_DOCUMENT)) as PcrDocument;
  copy.date = new Date().toISOString().slice(0, 10);
  return copy;
}

function blankDocument(): PcrDocument {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: "Nuevo cálculo PCR",
    analysisKey: `escenario-${today}-${Date.now()}`,
    blueName: "BANDO AZUL",
    redName: "BANDO ROJO",
    responsible: "",
    status: "borrador",
    date: today,
    situation: "",
    conclusion: "",
    sections: [
      {
        id: "composition",
        name: "SECC I – Composición de la fuerza",
        kind: "positive",
        guidance: "Cargar cantidades objetivas disponibles: personal, medios, material, reservas y recursos que puedan emplearse.",
        subsections: [newSubsection("Personal / medios / material")],
      },
      {
        id: "characteristics",
        name: "SECC II – Características de la fuerza",
        kind: "positive",
        guidance: "Cargar calidad, entrenamiento, doctrina, rendimiento técnico, mandos, moral, sensores y capacidades de empleo.",
        subsections: [newSubsection("Cualidades y rendimiento")],
      },
      {
        id: "services",
        name: "SECC III – Servicios y facilidades",
        kind: "positive",
        guidance: "Cargar apoyo, bases, pistas, abastecimiento, mantenimiento, comunicaciones y sostenimiento logístico.",
        subsections: [newSubsection("Servicios y facilidades")],
      },
      {
        id: "airDefense",
        name: "SECC IV – Defensa aérea",
        kind: "defense",
        guidance: "Cargar defensa pasiva, activa, radares, interceptores, IADS, dispersión, redundancia y protección. Se aplica como penalización cruzada.",
        subsections: [newSubsection("Defensa aérea")],
      },
    ],
  };
}

function newItem(name = "Nueva variable"): PcrItem {
  return {
    id: makeId("item"),
    name,
    priority: 1,
    coefficient: 1,
    coefficientMode: "auto",
    blue: 0,
    red: 0,
    unit: "",
    reference: "",
    guidance: "Cargar un valor comparable para ambos bandos. Puede ser cantidad, puntaje, disponibilidad, capacidad, alcance o valoración doctrinaria.",
    notes: "",
    enabled: true,
  };
}

function newSubsection(name = "Nueva subsección"): PcrSubsection {
  return {
    id: makeId("sub"),
    name,
    guidance: "Indicar qué representa la subsección y qué tipo de dato debe cargar el usuario.",
    weight: 1,
    items: [newItem()],
  };
}

function coefficientFor(subsection: PcrSubsection, item: PcrItem) {
  if (item.coefficientMode === "manual") return n(item.coefficient);
  const enabledItems = subsection.items.filter((row) => row.enabled !== false);
  const count = Math.max(1, enabledItems.length);
  const priority = Math.max(1, Math.min(count, Math.round(n(item.priority) || 1)));
  const countKey = String(count) as keyof typeof QUANTIFICATION_TABLE;
  const priorityKey = String(priority);
  const value = QUANTIFICATION_TABLE[countKey]?.[priorityKey as keyof (typeof QUANTIFICATION_TABLE)[typeof countKey]];
  if (typeof value === "number") return value;
  const raw = Array.from({ length: count }, (_, index) => count - index);
  const total = raw.reduce((sum, current) => sum + current, 0);
  return raw[priority - 1] ? raw[priority - 1] / total : 1 / count;
}

function weightedTotal(subsection: PcrSubsection, side: "blue" | "red") {
  return subsection.items.reduce((sum, row) => {
    if (row.enabled === false) return sum;
    return sum + n(row[side]) * coefficientFor(subsection, row);
  }, 0);
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
  const weightTotal = Math.max(1, section.subsections.reduce((sum, subsection) => sum + n(subsection.weight ?? 1), 0));
  const blue = section.subsections.reduce((sum, subsection, index) => sum + subsectionScores[index].blue * n(subsection.weight ?? 1), 0) / weightTotal;
  const red = section.subsections.reduce((sum, subsection, index) => sum + subsectionScores[index].red * n(subsection.weight ?? 1), 0) / weightTotal;
  const blueRaw = subsectionScores.reduce((sum, score) => sum + score.blueRaw, 0);
  const redRaw = subsectionScores.reduce((sum, score) => sum + score.redRaw, 0);
  return { blueRaw, redRaw, blue, red, subsections: subsectionScores };
}

function scoreDocument(document: PcrDocument) {
  const sectionScores = Object.fromEntries(document.sections.map((section) => [section.id, scoreSection(section)])) as Record<string, ReturnType<typeof scoreSection>>;
  const positiveSections = document.sections.filter((section) => section.kind === "positive");
  const defenseSections = document.sections.filter((section) => section.kind === "defense");
  const positiveBlue = positiveSections.reduce((sum, section) => sum + (sectionScores[section.id]?.blue ?? 0), 0);
  const positiveRed = positiveSections.reduce((sum, section) => sum + (sectionScores[section.id]?.red ?? 0), 0);
  const defenseBlue = defenseSections.reduce((sum, section) => sum + (sectionScores[section.id]?.blue ?? 0), 0);
  const defenseRed = defenseSections.reduce((sum, section) => sum + (sectionScores[section.id]?.red ?? 0), 0);
  const blueRaw = Math.max(0, positiveBlue - defenseRed);
  const redRaw = Math.max(0, positiveRed - defenseBlue);
  const final = relationFor(blueRaw, redRaw);
  const allItems = document.sections.flatMap((section) =>
    section.subsections.flatMap((subsection) =>
      subsection.items.map((item) => {
        const coeff = coefficientFor(subsection, item);
        return {
          section: section.name,
          subsection: subsection.name,
          name: item.name,
          blueWeighted: n(item.blue) * coeff,
          redWeighted: n(item.red) * coeff,
          impact: Math.abs(n(item.blue) * coeff - n(item.red) * coeff),
          enabled: item.enabled !== false,
        };
      }),
    ),
  );
  const topImpacts = allItems.filter((item) => item.enabled).sort((a, b) => b.impact - a.impact).slice(0, 10);
  return {
    sections: sectionScores,
    positiveBlue,
    positiveRed,
    defenseBlue,
    defenseRed,
    blueRaw,
    redRaw,
    pcrBlue: final.blue,
    pcrRed: final.red,
    leader: final.leader,
    topImpacts,
  };
}

function parseDocument(value: unknown): PcrDocument | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PcrDocument>;
  if (!Array.isArray(candidate.sections)) return null;
  if (!candidate.sections.every((section) => section && typeof section === "object" && Array.isArray((section as Partial<PcrSection>).subsections))) return null;
  return candidate as PcrDocument;
}

export default function PcrCalculator({ workspaceCode, token }: Props) {
  const [document, setDocument] = useState<PcrDocument>(() => cloneDefault());
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [message, setMessage] = useState("Cargando análisis...");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>("resumen");

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
        setDocument(cloneDefault());
        setVersion(0);
        setMessage("No había análisis guardado. Se cargó la plantilla completa del Excel ZEUS.");
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

  function updateSection(sectionId: string, updater: (section: PcrSection) => PcrSection) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    }));
  }

  function updateSubsection(sectionId: string, subsectionId: string, updater: (subsection: PcrSubsection) => PcrSubsection) {
    updateSection(sectionId, (section) => ({
      ...section,
      subsections: section.subsections.map((subsection) => (subsection.id === subsectionId ? updater(subsection) : subsection)),
    }));
  }

  function updateItem(sectionId: string, subsectionId: string, itemId: string, patch: Partial<PcrItem>) {
    updateSubsection(sectionId, subsectionId, (subsection) => ({
      ...subsection,
      items: subsection.items.map((row) => (row.id === itemId ? { ...row, ...patch } : row)),
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
    const ok = window.confirm("Esto borra la pantalla actual para cargar un escenario nuevo. No elimina lo guardado hasta que vuelvas a guardar. ¿Continuar?");
    if (!ok) return;
    const next = blankDocument();
    setDocument(next);
    setActiveTab("resumen");
    setVersion(0);
    setMessage("Escenario en blanco listo para cargar manualmente.");
  }

  function restoreZeus() {
    const ok = window.confirm("Se reemplazará la pantalla actual por todos los datos iniciales del Excel PCR ZEUS. ¿Continuar?");
    if (!ok) return;
    setDocument(cloneDefault());
    setActiveTab("resumen");
    setVersion(0);
    setMessage("Datos completos del Excel ZEUS restaurados. Guardá para conservarlos en Supabase.");
  }

  function duplicateScenario() {
    const nextKey = `copia-${document.analysisKey}-${Date.now()}`;
    patchDocument({ analysisKey: nextKey, title: `${document.title} – copia` });
    setVersion(0);
    setMessage("Copia creada en pantalla. Usá Guardar PCR para conservarla.");
  }

  const currentSection = document.sections.find((section) => section.id === activeTab);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1900px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">EJERCICIO ZEUS · A3 OPERACIONES · PPC</p>
            <h1 className="text-xl font-bold">Calculadora completa de Poder Combativo Relativo</h1>
            <p className="text-sm text-slate-300">Versión ampliada con secciones, subsecciones, matriz de cuantificación, ayudas de carga y guardado de escenarios.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/espacio/${workspaceCode}/${token}`} className="rounded bg-slate-700 px-4 py-2 font-semibold hover:bg-slate-600">Volver al mapa</Link>
            <button type="button" onClick={restoreZeus} className="rounded bg-amber-700 px-4 py-2 font-semibold hover:bg-amber-600">Restaurar ZEUS</button>
            <button type="button" onClick={clearScenario} className="rounded bg-red-900 px-4 py-2 font-semibold hover:bg-red-800">Borrado completo</button>
            <button type="button" onClick={duplicateScenario} className="rounded bg-indigo-800 px-4 py-2 font-semibold hover:bg-indigo-700">Duplicar</button>
            <button type="button" onClick={() => void save()} disabled={saving} className="rounded bg-cyan-700 px-4 py-2 font-bold hover:bg-cyan-600 disabled:opacity-50">{saving ? "Guardando..." : "Guardar PCR"}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1900px] space-y-5 p-4">
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="xl:col-span-2">Título del análisis<input value={document.title} onChange={(event) => patchDocument({ title: event.target.value })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2" /></label>
            <label>Clave guardado<input value={document.analysisKey} onChange={(event) => patchDocument({ analysisKey: event.target.value.trim() || "principal" })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2" /></label>
            <label>{"Bando 1"}<input value={document.blueName} onChange={(event) => patchDocument({ blueName: event.target.value })} className="mt-1 w-full rounded border border-blue-800 bg-blue-950 px-3 py-2" /></label>
            <label>{"Bando 2"}<input value={document.redName} onChange={(event) => patchDocument({ redName: event.target.value })} className="mt-1 w-full rounded border border-red-800 bg-red-950 px-3 py-2" /></label>
            <label>Fecha<input type="date" value={document.date} onChange={(event) => patchDocument({ date: event.target.value })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2" /></label>
            <label>Responsable<input value={document.responsible} onChange={(event) => patchDocument({ responsible: event.target.value })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2" /></label>
            <label>Estado<select value={document.status} onChange={(event) => patchDocument({ status: event.target.value as PcrStatus })} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"><option value="borrador">Borrador</option><option value="en_analisis">En análisis</option><option value="aprobado">Aprobado</option><option value="descartado">Descartado</option></select></label>
            <label className="xl:col-span-3">Cargar análisis guardado<select disabled={loading} value={document.analysisKey} onChange={(event) => void loadAnalysis(event.target.value)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"><option value={document.analysisKey}>{document.analysisKey}</option>{savedAnalyses.map((analysis) => <option key={analysis.id} value={analysis.analysis_key}>{analysis.title ?? analysis.analysis_key} · v{analysis.version ?? 0}</option>)}</select></label>
          </div>
          <label className="mt-4 block">Situación considerada<textarea value={document.situation} onChange={(event) => patchDocument({ situation: event.target.value })} rows={3} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2" /></label>
          <p className="mt-3 rounded bg-slate-950 px-3 py-2 text-sm text-slate-300">{message} {version > 0 ? `· versión ${version}` : ""}</p>
        </section>

        <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3">
          <button type="button" onClick={() => setActiveTab("resumen")} className={`rounded px-3 py-2 text-sm font-semibold ${activeTab === "resumen" ? "bg-cyan-700" : "bg-slate-800 hover:bg-slate-700"}`}>Resumen PCR</button>
          {document.sections.map((section) => <button key={section.id} type="button" onClick={() => setActiveTab(section.id)} className={`rounded px-3 py-2 text-sm font-semibold ${activeTab === section.id ? "bg-cyan-700" : "bg-slate-800 hover:bg-slate-700"}`}>{section.name}</button>)}
          <button type="button" onClick={() => setActiveTab("cuantificacion")} className={`rounded px-3 py-2 text-sm font-semibold ${activeTab === "cuantificacion" ? "bg-cyan-700" : "bg-slate-800 hover:bg-slate-700"}`}>Cuantificación</button>
        </nav>

        {activeTab === "resumen" && <SummaryPanel document={document} result={result} patchDocument={patchDocument} />}
        {activeTab === "cuantificacion" && <QuantificationPanel />}
        {currentSection && <SectionEditor document={document} section={currentSection} sectionScore={result.sections[currentSection.id]} updateSection={updateSection} updateSubsection={updateSubsection} updateItem={updateItem} />}
      </div>
    </main>
  );
}

function SummaryPanel({ document, result, patchDocument }: { document: PcrDocument; result: ReturnType<typeof scoreDocument>; patchDocument: (patch: Partial<PcrDocument>) => void }) {
  return (
    <section className="rounded-xl border border-amber-700 bg-amber-950/30 p-4">
      <h2 className="text-lg font-bold text-amber-200">Resumen del Poder Combativo Relativo</h2>
      <p className="mt-1 text-sm text-amber-100">El PCR expresa la relación proporcional entre los bandos. El bando más fuerte queda normalizado en 1 y el otro expresa su proporción relativa.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Kpi title={`PCR ${document.blueName}`} value={format(result.pcrBlue)} className="bg-blue-950 text-blue-100" />
        <Kpi title={`PCR ${document.redName}`} value={format(result.pcrRed)} className="bg-red-950 text-red-100" />
        <Kpi title="Ventaja relativa" value={result.leader === "blue" ? document.blueName : result.leader === "red" ? document.redName : "Equilibrio"} className="bg-emerald-950 text-emerald-100" />
        <Kpi title={`Defensa ${document.blueName}`} value={format(result.defenseBlue)} className="bg-slate-900 text-slate-100" />
        <Kpi title={`Defensa ${document.redName}`} value={format(result.defenseRed)} className="bg-slate-900 text-slate-100" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <p className="mb-3 font-semibold text-slate-200">Gráfico PCR final</p>
          <Bar label={document.blueName} value={result.pcrBlue} color="bg-blue-500" />
          <Bar label={document.redName} value={result.pcrRed} color="bg-red-500" />
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <p className="mb-3 font-semibold text-slate-200">Resultado por sección</p>
          <div className="space-y-3">
            {document.sections.map((section) => {
              const score = result.sections[section.id];
              return (
                <div key={section.id}>
                  <div className="mb-1 flex justify-between text-xs text-slate-300"><span>{section.name}</span><span>{format(score.blue)} / {format(score.red)}</span></div>
                  <div className="grid grid-cols-2 gap-1"><div className="h-3 rounded bg-slate-800"><div className="h-3 rounded bg-blue-500" style={{ width: percent(score.blue) }} /></div><div className="h-3 rounded bg-slate-800"><div className="h-3 rounded bg-red-500" style={{ width: percent(score.red) }} /></div></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <p className="mb-3 font-semibold text-slate-200">Variables más determinantes</p>
          <ol className="space-y-2 text-sm">
            {result.topImpacts.map((item, index) => <li key={`${item.section}-${item.name}-${index}`} className="rounded bg-slate-900 p-2"><strong>{index + 1}. {item.name}</strong><br /><span className="text-slate-300">{item.subsection} · impacto {format(item.impact)} · {format(item.blueWeighted)} / {format(item.redWeighted)}</span></li>)}
          </ol>
        </div>
        <label className="block rounded-lg border border-slate-700 bg-slate-950 p-4">Conclusión / recomendación<textarea value={document.conclusion} onChange={(event) => patchDocument({ conclusion: event.target.value })} rows={11} className="mt-2 w-full rounded border border-amber-800 bg-slate-900 px-3 py-2" /></label>
      </div>
    </section>
  );
}

function SectionEditor({ document, section, sectionScore, updateSection, updateSubsection, updateItem }: { document: PcrDocument; section: PcrSection; sectionScore: ReturnType<typeof scoreSection>; updateSection: (sectionId: string, updater: (section: PcrSection) => PcrSection) => void; updateSubsection: (sectionId: string, subsectionId: string, updater: (subsection: PcrSubsection) => PcrSubsection) => void; updateItem: (sectionId: string, subsectionId: string, itemId: string, patch: Partial<PcrItem>) => void }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 bg-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-cyan-200">{section.name}</h2>
            <p className="max-w-5xl text-sm text-slate-300">{section.guidance}</p>
            <p className="mt-1 text-xs text-slate-400">Sección {section.kind === "defense" ? "defensiva: se aplica como penalización cruzada" : "positiva: suma al poder propio"} · Relación {document.blueName}: {format(sectionScore.blue)} / {document.redName}: {format(sectionScore.red)} · Totales {format(sectionScore.blueRaw)} / {format(sectionScore.redRaw)}</p>
          </div>
          <button type="button" onClick={() => updateSection(section.id, (current) => ({ ...current, subsections: [...current.subsections, newSubsection()] }))} className="rounded bg-cyan-800 px-3 py-2 text-sm font-semibold hover:bg-cyan-700">Agregar subsección</button>
        </div>
      </div>
      <div className="space-y-4 p-4">
        {section.subsections.map((subsection, subsectionIndex) => {
          const subsectionScore = scoreSubsection(subsection);
          return (
            <div key={subsection.id} className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
              <div className="border-b border-slate-800 bg-slate-900 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input value={subsection.name} onChange={(event) => updateSubsection(section.id, subsection.id, (current) => ({ ...current, name: event.target.value }))} className="min-w-[320px] rounded border border-slate-700 bg-slate-950 px-3 py-2 font-semibold" />
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300"><span>Subsección {subsectionIndex + 1}</span><span>{document.blueName}: {format(subsectionScore.blue)}</span><span>{document.redName}: {format(subsectionScore.red)}</span><label>Peso<input type="number" step="0.1" value={subsection.weight ?? 1} onChange={(event) => updateSubsection(section.id, subsection.id, (current) => ({ ...current, weight: n(event.target.value) }))} className="ml-2 w-20 rounded bg-slate-950 px-2 py-1 text-right" /></label></div>
                  <div className="flex gap-2"><button type="button" onClick={() => updateSubsection(section.id, subsection.id, (current) => ({ ...current, items: [...current.items, newItem()] }))} className="rounded bg-cyan-800 px-3 py-1.5 text-sm font-semibold hover:bg-cyan-700">Agregar variable</button><button type="button" onClick={() => updateSection(section.id, (current) => ({ ...current, subsections: current.subsections.filter((row) => row.id !== subsection.id) }))} className="rounded bg-red-950 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900">Eliminar subsección</button></div>
                </div>
                <textarea value={subsection.guidance ?? ""} onChange={(event) => updateSubsection(section.id, subsection.id, (current) => ({ ...current, guidance: event.target.value }))} rows={2} className="mt-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" placeholder="Referencia para la carga de esta subsección" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1500px] text-sm">
                  <thead className="bg-slate-950 text-slate-300">
                    <tr><th className="p-2">Usar</th><th className="p-2 text-left">Variable / medio / criterio</th><th className="p-2">Prioridad</th><th className="p-2">Coef.</th><th className="p-2">Modo</th><th className="p-2">Unidad</th><th className="p-2">{document.blueName}</th><th className="p-2">Pond.</th><th className="p-2">{document.redName}</th><th className="p-2">Pond.</th><th className="p-2 text-left">Referencia de carga</th><th className="p-2 text-left">Fundamento</th><th /></tr>
                  </thead>
                  <tbody>
                    {subsection.items.map((row) => {
                      const coeff = coefficientFor(subsection, row);
                      return (
                        <tr key={row.id} className="border-t border-slate-800 align-top">
                          <td className="p-2 text-center"><input type="checkbox" checked={row.enabled !== false} onChange={(event) => updateItem(section.id, subsection.id, row.id, { enabled: event.target.checked })} /></td>
                          <td className="p-2"><input value={row.name} onChange={(event) => updateItem(section.id, subsection.id, row.id, { name: event.target.value })} className="w-full rounded bg-slate-900 px-2 py-1.5" /></td>
                          <td className="p-2"><input type="number" min={1} max={Math.max(1, subsection.items.filter((item) => item.enabled !== false).length)} value={row.priority} onChange={(event) => updateItem(section.id, subsection.id, row.id, { priority: n(event.target.value) })} className="w-20 rounded bg-slate-900 px-2 py-1.5 text-center" /></td>
                          <td className="p-2"><input type="number" step="0.001" value={row.coefficientMode === "auto" ? coeff : row.coefficient} disabled={row.coefficientMode === "auto"} onChange={(event) => updateItem(section.id, subsection.id, row.id, { coefficient: n(event.target.value) })} className="w-24 rounded bg-slate-900 px-2 py-1.5 text-right disabled:opacity-60" /></td>
                          <td className="p-2"><select value={row.coefficientMode} onChange={(event) => updateItem(section.id, subsection.id, row.id, { coefficientMode: event.target.value as CoefficientMode })} className="rounded bg-slate-900 px-2 py-1.5"><option value="manual">Manual</option><option value="auto">Auto matriz</option></select></td>
                          <td className="p-2"><input value={row.unit ?? ""} onChange={(event) => updateItem(section.id, subsection.id, row.id, { unit: event.target.value })} className="w-28 rounded bg-slate-900 px-2 py-1.5" /></td>
                          <td className="p-2"><input type="number" step="any" value={row.blue} onChange={(event) => updateItem(section.id, subsection.id, row.id, { blue: n(event.target.value) })} className="w-28 rounded bg-blue-950 px-2 py-1.5 text-right" /></td>
                          <td className="p-2 text-right font-mono text-blue-200">{format(n(row.blue) * coeff)}</td>
                          <td className="p-2"><input type="number" step="any" value={row.red} onChange={(event) => updateItem(section.id, subsection.id, row.id, { red: n(event.target.value) })} className="w-28 rounded bg-red-950 px-2 py-1.5 text-right" /></td>
                          <td className="p-2 text-right font-mono text-red-200">{format(n(row.red) * coeff)}</td>
                          <td className="p-2"><textarea value={row.guidance ?? ""} onChange={(event) => updateItem(section.id, subsection.id, row.id, { guidance: event.target.value })} rows={2} className="w-full min-w-[260px] rounded bg-slate-900 px-2 py-1.5 text-xs" /></td>
                          <td className="p-2"><textarea value={row.notes} onChange={(event) => updateItem(section.id, subsection.id, row.id, { notes: event.target.value })} rows={2} className="w-full min-w-[220px] rounded bg-slate-900 px-2 py-1.5 text-xs" placeholder={row.reference ? `Origen: ${row.reference}` : "Fundamento / fuente"} /></td>
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
}

function QuantificationPanel() {
  const counts = Object.keys(QUANTIFICATION_TABLE).map(Number).sort((a, b) => a - b);
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h2 className="text-lg font-bold text-cyan-200">Matriz de cuantificación</h2>
      <p className="mb-4 text-sm text-slate-300">La matriz proviene de la hoja CUANTIFICACION del Excel. En modo automático, la prioridad de cada variable busca el coeficiente según la cantidad de variables activas en la subsección. Los coeficientes también pueden cargarse manualmente.</p>
      <div className="overflow-x-auto rounded border border-slate-700">
        <table className="min-w-[1100px] text-sm">
          <thead className="bg-slate-950"><tr><th className="p-2">Prioridad</th>{counts.map((count) => <th key={count} className="p-2">{count} variables</th>)}</tr></thead>
          <tbody>{Array.from({ length: 20 }, (_, index) => index + 1).map((priority) => <tr key={priority} className="border-t border-slate-800"><td className="p-2 font-bold">{priority}</td>{counts.map((count) => <td key={count} className="p-2 text-right font-mono">{format(Number(QUANTIFICATION_TABLE[String(count) as keyof typeof QUANTIFICATION_TABLE]?.[String(priority) as never] ?? 0), 3)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function Kpi({ title, value, className }: { title: string; value: string; className: string }) {
  return <div className={`rounded-lg p-4 ${className}`}><p className="text-sm opacity-80">{title}</p><p className="text-3xl font-bold">{value}</p></div>;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="mb-3"><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{format(value)}</span></div><div className="h-6 rounded bg-slate-800"><div className={`h-6 rounded ${color}`} style={{ width: percent(value) }} /></div></div>;
}
