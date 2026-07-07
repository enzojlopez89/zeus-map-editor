"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PCR_WORKBOOK } from "./pcrWorkbookData";

type PcrStatus = "borrador" | "en_analisis" | "aprobado" | "descartado";
type CellPrimitive = string | number | boolean | null;
type CellRecord = { v?: CellPrimitive; f?: string };
type SheetRecord = {
  name: string;
  maxRow: number;
  maxCol: number;
  cells: Record<string, CellRecord>;
};
type WorkbookRecord = { sheets: readonly SheetRecord[] };
type OverrideMap = Record<string, CellPrimitive>;
type FutureSection = "composition" | "characteristics" | "services" | "airDefense";
type FutureVariable = {
  id: string;
  active: boolean;
  section: FutureSection;
  name: string;
  priority: number;
  coefficient: number;
  blue: number;
  red: number;
  notes: string;
};
type PcrContentV3 = {
  version: "pcr-v3-full-workbook";
  title: string;
  analysisKey: string;
  blueName: string;
  redName: string;
  responsible: string;
  status: PcrStatus;
  date: string;
  situation: string;
  conclusion: string;
  overrides: OverrideMap;
  futureVariables: FutureVariable[];
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
type Props = { workspaceCode: string; token: string };

type FormulaValue = CellPrimitive | FormulaValue[];

const WORKBOOK = PCR_WORKBOOK as unknown as WorkbookRecord;
const SHEETS = WORKBOOK.sheets;
const SHEET_MAP = Object.fromEntries(SHEETS.map((sheet) => [sheet.name, sheet])) as Record<string, SheetRecord>;
const DEFAULT_SHEET = SHEETS[0]?.name ?? "SECC I P-E";
const STORAGE_VERSION = "pcr-v3-full-workbook";

const SHEET_HELP: Record<string, string> = {
  "SECC I P-E": "Carga cantidades objetivas disponibles: personal, material aéreo y reservas. Los totales ponderados surgen de prioridad, coeficiente y cantidad cargada para cada bando.",
  "SECC II P-E": "Carga características cualitativas y rendimiento: doctrina, preparación, entrenamiento, capacidades del personal y prestación técnica de cada sistema aéreo.",
  "SECC III P-E": "Carga servicios, facilidades e infraestructura: bases, pistas, mantenimiento, armamento, combustible, comunicaciones, meteorología, seguridad y sostenimiento.",
  "SECC IV P-E": "Carga defensa aérea: defensa pasiva, defensa activa, AAA, SAM, radares, interceptores e integración. En el resumen actúa como penalización cruzada.",
  "RESUMEN PCR P-E": "Resume las relaciones parciales de cada sección y calcula la proporción final del Poder Combativo Relativo.",
  CUANTIFICACION: "Matriz de coeficientes usada para convertir prioridades en ponderaciones. Sirve como regla de cuantificación del modelo.",
};

const SECTION_CELL_ROWS = [
  { label: "Composición de la fuerza", blue: "B7", red: "C7" },
  { label: "Características de la fuerza", blue: "B8", red: "C8" },
  { label: "Servicios y facilidades", blue: "B9", red: "C9" },
  { label: "Defensa aérea", blue: "B10", red: "C10" },
  { label: "PCR final", blue: "B13", red: "C13" },
];

function key(sheet: string, cell: string) {
  return `${sheet}!${cell.toUpperCase()}`;
}
function makeId(prefix = "future") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function normalizeCell(cell: string) {
  return cell.replace(/\$/g, "").toUpperCase();
}
function colToNumber(col: string) {
  return col.toUpperCase().split("").reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0);
}
function numberToCol(num: number) {
  let out = "";
  let n = num;
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}
function splitAddress(cell: string) {
  const match = normalizeCell(cell).match(/^([A-Z]+)(\d+)$/);
  if (!match) return { col: "A", row: 1 };
  return { col: match[1], row: Number(match[2]) };
}
function addressesInRange(range: string) {
  const [start, end = start] = range.split(":").map(normalizeCell);
  const a = splitAddress(start);
  const b = splitAddress(end);
  const minCol = Math.min(colToNumber(a.col), colToNumber(b.col));
  const maxCol = Math.max(colToNumber(a.col), colToNumber(b.col));
  const minRow = Math.min(a.row, b.row);
  const maxRow = Math.max(a.row, b.row);
  const result: string[] = [];
  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) result.push(`${numberToCol(c)}${r}`);
  }
  return result;
}
function asNumber(value: FormulaValue): number {
  if (Array.isArray(value)) return value.flat(Infinity).reduce((sum, item) => sum + asNumber(item as FormulaValue), 0);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const clean = value.replace(",", ".").trim();
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function displayValue(value: FormulaValue, digits = 3) {
  if (Array.isArray(value)) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) >= 100 || Number.isInteger(value)) return String(Number(value.toFixed(3)));
    return value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
  }
  if (typeof value === "boolean") return value ? "VERDADERO" : "FALSO";
  return value == null ? "" : String(value);
}
function parseInputValue(value: string, previous: CellPrimitive): CellPrimitive {
  const raw = value.trim();
  if (raw === "") return null;
  if (typeof previous === "number" || /^-?\d+(?:[.,]\d+)?$/.test(raw)) {
    const parsed = Number(raw.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : raw;
  }
  return value;
}
function flatten(value: FormulaValue): FormulaValue[] {
  return Array.isArray(value) ? value.flatMap((item) => flatten(item as FormulaValue)) : [value];
}
function defaultContent(): PcrContentV3 {
  return {
    version: STORAGE_VERSION,
    title: "PCR ZEUS 1 TERRA NORTE",
    analysisKey: "principal",
    blueName: "TERRA",
    redName: "NORTE",
    responsible: "",
    status: "borrador",
    date: today(),
    situation: "Escenario ZEUS 1 / TERRA vs NORTE. Todas las tablas fueron cargadas desde la planilla original.",
    conclusion: "El resumen inicial de la planilla arroja ventaja relativa para TERRA. Esta versión permite modificar manualmente todas las variables de las hojas y recalcular las relaciones.",
    overrides: {},
    futureVariables: [],
  };
}
function parseContent(value: unknown): PcrContentV3 | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PcrContentV3>;
  if (candidate.version !== STORAGE_VERSION) return null;
  return { ...defaultContent(), ...candidate, overrides: candidate.overrides ?? {}, futureVariables: candidate.futureVariables ?? [] };
}
function sheetCell(sheet: SheetRecord, addr: string) {
  return sheet.cells[normalizeCell(addr)] as CellRecord | undefined;
}
function formulaEvaluator(overrides: OverrideMap) {
  const cache = new Map<string, FormulaValue>();
  const visiting = new Set<string>();

  const C = (sheetName: string, cell: string): FormulaValue => {
    const address = normalizeCell(cell);
    const full = key(sheetName, address);
    if (Object.prototype.hasOwnProperty.call(overrides, full)) return overrides[full];
    if (cache.has(full)) return cache.get(full) ?? null;
    if (visiting.has(full)) return 0;
    const sheet = SHEET_MAP[sheetName];
    const record = sheet ? sheetCell(sheet, address) : undefined;
    if (!record) return null;
    if (!record.f) return record.v ?? null;
    visiting.add(full);
    let calculated: FormulaValue;
    try {
      calculated = evalFormula(sheetName, record.f, record.v ?? null);
    } catch {
      calculated = record.v ?? null;
    }
    visiting.delete(full);
    cache.set(full, calculated);
    return calculated;
  };

  const R = (sheetName: string, range: string): FormulaValue[] => addressesInRange(range).map((addr) => C(sheetName, addr));
  const SUM = (...args: FormulaValue[]) => args.flatMap((arg) => flatten(arg)).reduce((sum, item) => sum + asNumber(item), 0);
  const DMAX = (...args: FormulaValue[]) => {
    const values = flatten(args[args.length - 1] ?? args[0]).map(asNumber).filter((value) => Number.isFinite(value));
    return values.length ? Math.max(...values) : 0;
  };
  const VLOOKUP = (lookupValue: FormulaValue, table: FormulaValue, colIndex: FormulaValue) => {
    const flat = flatten(table);
    const col = Math.max(1, Math.round(asNumber(colIndex)));
    const lookup = asNumber(lookupValue);
    const width = 20;
    for (let index = 0; index < flat.length; index += width) {
      if (asNumber(flat[index]) === lookup) return flat[index + col - 1] ?? null;
    }
    return null;
  };
  const IFX = (condition: unknown, whenTrue: FormulaValue, whenFalse: FormulaValue) => condition ? whenTrue : whenFalse;

  function replaceReferences(expression: string, sheetName: string) {
    let expr = expression;
    const placeholders: string[] = [];
    const put = (code: string) => {
      const marker = `__REF_${placeholders.length}__`;
      placeholders.push(code);
      return marker;
    };
    expr = expr.replace(/(?:'([^']+)'|([A-Za-z0-9_]+))!\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/g, (_match, quoted, plain, c1, r1, c2, r2) => {
      const targetSheet = quoted || plain;
      const target = `${c1}${r1}${c2 ? `:${c2}${r2}` : ""}`;
      return put(c2 ? `R(${JSON.stringify(targetSheet)},${JSON.stringify(target)})` : `C(${JSON.stringify(targetSheet)},${JSON.stringify(target)})`);
    });
    expr = expr.replace(/\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/g, (_match, c1, r1, c2, r2) => {
      const target = `${c1}${r1}${c2 ? `:${c2}${r2}` : ""}`;
      return c2 ? `R(${JSON.stringify(sheetName)},${JSON.stringify(target)})` : `C(${JSON.stringify(sheetName)},${JSON.stringify(target)})`;
    });
    placeholders.forEach((code, index) => {
      expr = expr.replaceAll(`__REF_${index}__`, code);
    });
    return expr;
  }

  function evalFormula(sheetName: string, formula: string, fallback: CellPrimitive): FormulaValue {
    let expr = formula.startsWith("=") ? formula.slice(1) : formula;
    expr = expr.replace(/<>/g, "!=");
    expr = expr.replace(/(?<![<>!])=(?!=)/g, "===");
    expr = expr.replace(/\bIF\s*\(/g, "IFX(");
    expr = expr.replace(/\bFALSE\b/g, "false").replace(/\bTRUE\b/g, "true");
    expr = replaceReferences(expr, sheetName);
    try {
      // eslint-disable-next-line no-new-func
      return Function("C", "R", "SUM", "DMAX", "VLOOKUP", "IFX", `return (${expr});`)(C, R, SUM, DMAX, VLOOKUP, IFX) as FormulaValue;
    } catch {
      return fallback;
    }
  }

  return { C, R };
}
function buildInputOverridesZero() {
  const overrides: OverrideMap = {};
  for (const sheet of SHEETS) {
    for (const [addr, record] of Object.entries(sheet.cells)) {
      if (!record.f && typeof record.v === "number") overrides[key(sheet.name, addr)] = 0;
    }
  }
  return overrides;
}
function futureCoefficient(priority: number, count: number) {
  const p = Math.max(1, Math.round(priority));
  const values = Array.from({ length: Math.max(1, count) }, (_, index) => Math.max(1, count - index));
  const total = values.reduce((sum, value) => sum + value, 0);
  return values[p - 1] ? values[p - 1] / total : 1 / count;
}
function relation(blue: number, red: number) {
  if (blue <= 0 && red <= 0) return { blue: 0, red: 0, leader: "=" };
  if (blue >= red) return { blue: 1, red: red > 0 ? red / blue : 0, leader: "blue" };
  return { blue: blue > 0 ? blue / red : 0, red: 1, leader: "red" };
}

export default function PcrCalculator({ workspaceCode, token }: Props) {
  const [content, setContent] = useState<PcrContentV3>(() => defaultContent());
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [activeSheet, setActiveSheet] = useState(DEFAULT_SHEET);
  const [message, setMessage] = useState("Cargando PCR...");
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const evaluator = useMemo(() => formulaEvaluator(content.overrides), [content.overrides]);
  const active = SHEET_MAP[activeSheet] ?? SHEETS[0];

  const summary = useMemo(() => {
    const rows = SECTION_CELL_ROWS.map((row) => ({ ...row, blueValue: asNumber(evaluator.C("RESUMEN PCR P-E", row.blue)), redValue: asNumber(evaluator.C("RESUMEN PCR P-E", row.red)) }));
    const pcrBlue = rows.find((row) => row.label === "PCR final")?.blueValue ?? 0;
    const pcrRed = rows.find((row) => row.label === "PCR final")?.redValue ?? 0;
    const leader = pcrBlue === pcrRed ? "=" : pcrBlue > pcrRed ? "blue" : "red";
    return { rows, pcrBlue, pcrRed, leader };
  }, [evaluator]);

  const futureSummary = useMemo(() => {
    const activeRows = content.futureVariables.filter((row) => row.active);
    const count = Math.max(1, activeRows.length);
    const blueRaw = activeRows.reduce((sum, row) => sum + asNumber(row.blue) * (row.coefficient || futureCoefficient(row.priority, count)), 0);
    const redRaw = activeRows.reduce((sum, row) => sum + asNumber(row.red) * (row.coefficient || futureCoefficient(row.priority, count)), 0);
    return { blueRaw, redRaw, ...relation(blueRaw, redRaw), count: activeRows.length };
  }, [content.futureVariables]);

  async function loadAnalysis(analysisKey = content.analysisKey, silent = false) {
    if (!silent) setMessage("Cargando PCR...");
    try {
      const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, analysisKey }),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo cargar el PCR.");
      setSavedAnalyses(result.analyses ?? []);
      const loaded = parseContent(result.analysis?.content);
      if (loaded) {
        setContent({ ...loaded, analysisKey: result.analysis.analysis_key ?? loaded.analysisKey });
        setVersion(Number(result.analysis.version ?? 0));
        setMessage("Análisis completo recuperado desde Supabase.");
      } else {
        setMessage("No había PCR v3 guardado. Se muestran todos los datos originales del Excel.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al cargar el PCR.");
    }
  }

  useEffect(() => { void loadAnalysis("principal"); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [workspaceCode, token]);

  function patch(patchValue: Partial<PcrContentV3>) { setContent((current) => ({ ...current, ...patchValue })); }
  function updateOverride(sheetName: string, addr: string, value: CellPrimitive) {
    setContent((current) => ({ ...current, overrides: { ...current.overrides, [key(sheetName, addr)]: value } }));
  }
  function resetCell(sheetName: string, addr: string) {
    setContent((current) => {
      const next = { ...current.overrides };
      delete next[key(sheetName, addr)];
      return { ...current, overrides: next };
    });
  }
  function restoreZeus() {
    if (!window.confirm("Se restaurarán todos los valores originales del Excel y se quitarán los cambios manuales de esta pantalla. ¿Continuar?")) return;
    setContent((current) => ({ ...current, overrides: {}, title: "PCR ZEUS 1 TERRA NORTE", blueName: "TERRA", redName: "NORTE", analysisKey: "principal", situation: defaultContent().situation, conclusion: defaultContent().conclusion }));
    setMessage("Valores originales del Excel restaurados. Guardá para conservarlos en Supabase.");
  }
  function clearScenario() {
    if (!window.confirm("Se pondrán en cero todos los valores numéricos editables para cargar un nuevo escenario. No elimina datos guardados hasta que presiones Guardar. ¿Continuar?")) return;
    setContent((current) => ({ ...current, title: "Nuevo escenario PCR", analysisKey: `escenario-${Date.now()}`, blueName: "BANDO AZUL", redName: "BANDO ROJO", situation: "", conclusion: "", overrides: buildInputOverridesZero(), futureVariables: [] }));
    setVersion(0);
    setMessage("Escenario en blanco preparado. Las fórmulas permanecen activas.");
  }
  function duplicateScenario() {
    setContent((current) => ({ ...current, title: `${current.title} - copia`, analysisKey: `copia-${Date.now()}` }));
    setVersion(0);
    setMessage("Escenario duplicado. Guardalo para crear una nueva versión independiente.");
  }
  async function save() {
    setSaving(true);
    setMessage("Guardando PCR completo...");
    const resultPayload = { summary, futureSummary, calculatedAt: new Date().toISOString() };
    try {
      const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, analysisKey: content.analysisKey || "principal", content, result: resultPayload }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo guardar.");
      setVersion(Number(result.version ?? version + 1));
      setMessage(`PCR guardado correctamente. Versión ${result.version ?? version + 1}.`);
      void loadAnalysis(content.analysisKey, true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar el PCR.");
    } finally {
      setSaving(false);
    }
  }
  function addFutureVariable() {
    const next: FutureVariable = { id: makeId(), active: true, section: "characteristics", name: "Nueva variable futura", priority: 1, coefficient: 1, blue: 0, red: 0, notes: "" };
    setContent((current) => ({ ...current, futureVariables: [...current.futureVariables, next] }));
  }
  function updateFuture(id: string, patchValue: Partial<FutureVariable>) {
    setContent((current) => ({ ...current, futureVariables: current.futureVariables.map((row) => row.id === id ? { ...row, ...patchValue } : row) }));
  }
  function removeFuture(id: string) {
    setContent((current) => ({ ...current, futureVariables: current.futureVariables.filter((row) => row.id !== id) }));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1900px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">EJERCICIO ZEUS · A3 OPERACIONES · PPC</p>
            <h1 className="text-xl font-bold">PCR completo tipo planilla</h1>
            <p className="text-sm text-slate-300">Incluye todas las hojas, tablas, variables, fórmulas y matriz de cuantificación del Excel original.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/espacio/${workspaceCode}/${token}`} className="rounded bg-slate-700 px-4 py-2 font-semibold hover:bg-slate-600">Volver al mapa</Link>
            <button type="button" onClick={restoreZeus} className="rounded bg-amber-700 px-4 py-2 font-semibold hover:bg-amber-600">Restaurar ZEUS</button>
            <button type="button" onClick={clearScenario} className="rounded bg-red-900 px-4 py-2 font-semibold hover:bg-red-800">Borrado completo</button>
            <button type="button" onClick={duplicateScenario} className="rounded bg-slate-700 px-4 py-2 font-semibold hover:bg-slate-600">Duplicar</button>
            <button type="button" onClick={() => void save()} disabled={saving} className="rounded bg-cyan-700 px-4 py-2 font-bold hover:bg-cyan-600 disabled:opacity-50">{saving ? "Guardando..." : "Guardar PCR"}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1900px] space-y-5 p-4">
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="xl:col-span-2">Título<input value={content.title} onChange={(e) => patch({ title: e.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
            <label>Clave de guardado<input value={content.analysisKey} onChange={(e) => patch({ analysisKey: e.target.value.trim() || "principal" })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
            <label>Responsable<input value={content.responsible} onChange={(e) => patch({ responsible: e.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
            <label>Fecha<input type="date" value={content.date} onChange={(e) => patch({ date: e.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
            <label>Estado<select value={content.status} onChange={(e) => patch({ status: e.target.value as PcrStatus })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"><option value="borrador">Borrador</option><option value="en_analisis">En análisis</option><option value="aprobado">Aprobado</option><option value="descartado">Descartado</option></select></label>
            <label>Bando 1<input value={content.blueName} onChange={(e) => patch({ blueName: e.target.value })} className="mt-1 w-full rounded border border-blue-700 bg-blue-950 px-3 py-2" /></label>
            <label>Bando 2<input value={content.redName} onChange={(e) => patch({ redName: e.target.value })} className="mt-1 w-full rounded border border-red-700 bg-red-950 px-3 py-2" /></label>
            <label className="md:col-span-2 xl:col-span-4">Situación considerada<textarea value={content.situation} onChange={(e) => patch({ situation: e.target.value })} rows={2} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300"><span>{message}</span><span>Versión: {version}</span><span>Celdas modificadas: {Object.keys(content.overrides).length}</span></div>
          {savedAnalyses.length > 0 && <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3"><p className="mb-2 font-semibold">Análisis guardados</p><div className="flex flex-wrap gap-2">{savedAnalyses.map((analysis) => <button key={analysis.id} type="button" onClick={() => void loadAnalysis(analysis.analysis_key)} className={`rounded px-3 py-1.5 text-sm font-semibold ${analysis.analysis_key === content.analysisKey ? "bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"}`}>{analysis.title || analysis.analysis_key} · v{analysis.version ?? 0}</button>)}</div></div>}
        </section>

        <section className="rounded-xl border border-amber-700 bg-amber-950/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-amber-200">Resumen del PCR</h2><p className="text-sm text-amber-100">Se calcula desde la hoja RESUMEN PCR P-E, usando las fórmulas y tablas originales recalculadas en pantalla.</p></div><div className="text-right"><p className="text-sm text-slate-300">Ventaja</p><p className="text-3xl font-black text-amber-200">{summary.leader === "blue" ? content.blueName : summary.leader === "red" ? content.redName : "Equilibrio"}</p></div></div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">{summary.rows.map((row) => <div key={row.label} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><p className="font-bold text-slate-100">{row.label}</p><p className="text-blue-200">{content.blueName}: {displayValue(row.blueValue)}</p><p className="text-red-200">{content.redName}: {displayValue(row.redValue)}</p></div>)}</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><div><div className="mb-1 flex justify-between text-xs"><span>{content.blueName}</span><span>{displayValue(summary.pcrBlue)}</span></div><div className="h-6 rounded bg-slate-800"><div className="h-6 rounded bg-blue-500" style={{ width: `${Math.max(2, Math.min(100, summary.pcrBlue * 100))}%` }} /></div></div><div><div className="mb-1 flex justify-between text-xs"><span>{content.redName}</span><span>{displayValue(summary.pcrRed)}</span></div><div className="h-6 rounded bg-slate-800"><div className="h-6 rounded bg-red-500" style={{ width: `${Math.max(2, Math.min(100, summary.pcrRed * 100))}%` }} /></div></div></div>
          <label className="mt-4 block">Conclusión / interpretación<textarea value={content.conclusion} onChange={(e) => patch({ conclusion: e.target.value })} rows={3} className="mt-1 w-full rounded border border-amber-800 bg-slate-950 px-3 py-2" /></label>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-cyan-200">Hojas y tablas del Excel</h2><p className="text-sm text-slate-300">Celdas azules: valores editables. Celdas grises: fórmulas calculadas. Todas las tablas originales están cargadas.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showFormulas} onChange={(e) => setShowFormulas(e.target.checked)} /> Ver fórmulas</label></div>
          <div className="mb-3 flex flex-wrap gap-2">{SHEETS.map((sheet) => <button key={sheet.name} type="button" onClick={() => setActiveSheet(sheet.name)} className={`rounded px-3 py-1.5 text-sm font-semibold ${activeSheet === sheet.name ? "bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"}`}>{sheet.name}</button>)}</div>
          <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">{SHEET_HELP[activeSheet] ?? "Hoja de cálculo importada desde el Excel."}</div>
          <div className="max-h-[75vh] overflow-auto rounded-lg border border-slate-700">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-800"><tr><th className="sticky left-0 z-20 border border-slate-700 bg-slate-800 px-2 py-1">#</th>{Array.from({ length: active.maxCol }, (_, index) => <th key={index} className="border border-slate-700 px-2 py-1 text-slate-300">{numberToCol(index + 1)}</th>)}</tr></thead>
              <tbody>{Array.from({ length: active.maxRow }, (_, rIndex) => {
                const rowNumber = rIndex + 1;
                return <tr key={rowNumber}><th className="sticky left-0 border border-slate-700 bg-slate-800 px-2 py-1 text-slate-400">{rowNumber}</th>{Array.from({ length: active.maxCol }, (_, cIndex) => {
                  const addr = `${numberToCol(cIndex + 1)}${rowNumber}`;
                  const record = sheetCell(active, addr);
                  const fullKey = key(active.name, addr);
                  const formula = record?.f;
                  const original = record?.v ?? null;
                  const value = formula ? evaluator.C(active.name, addr) : (Object.prototype.hasOwnProperty.call(content.overrides, fullKey) ? content.overrides[fullKey] : original);
                  const modified = Object.prototype.hasOwnProperty.call(content.overrides, fullKey);
                  const empty = !record && !modified;
                  const shown = showFormulas && formula ? formula : displayValue(value);
                  return <td key={addr} title={formula ? `${addr}: ${formula}` : addr} className={`border border-slate-800 p-0 ${formula ? "bg-slate-900 text-slate-300" : modified ? "bg-cyan-950" : empty ? "bg-slate-950" : "bg-blue-950/40"}`}>{formula || empty ? <div className={`min-h-7 min-w-20 px-2 py-1 ${formula ? "font-mono" : ""}`}>{shown}</div> : <div className="flex min-w-24"><input value={displayValue(value, 4)} onChange={(e) => updateOverride(active.name, addr, parseInputValue(e.target.value, original))} className="min-h-7 w-full bg-transparent px-2 py-1 outline-none focus:bg-cyan-900" />{modified && <button type="button" onClick={() => resetCell(active.name, addr)} className="px-1 text-amber-300" title="Restaurar celda">↺</button>}</div>}</td>;
                })}</tr>;
              })}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-cyan-200">Variables futuras / complementarias</h2><p className="text-sm text-slate-300">Usalas para ensayar capacidades nuevas sin modificar la estructura original del Excel. Después podemos integrarlas a una tabla específica.</p></div><button type="button" onClick={addFutureVariable} className="rounded bg-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-600">Agregar variable futura</button></div>
          <div className="overflow-auto rounded-lg border border-slate-700"><table className="min-w-full text-sm"><thead className="bg-slate-800"><tr><th className="px-2 py-2">Activa</th><th className="px-2 py-2">Sección</th><th className="px-2 py-2">Variable</th><th className="px-2 py-2">Prior.</th><th className="px-2 py-2">Coef.</th><th className="px-2 py-2">{content.blueName}</th><th className="px-2 py-2">{content.redName}</th><th className="px-2 py-2">Fundamento</th><th /></tr></thead><tbody>{content.futureVariables.map((row) => <tr key={row.id} className="border-t border-slate-800"><td className="px-2 py-1 text-center"><input type="checkbox" checked={row.active} onChange={(e) => updateFuture(row.id, { active: e.target.checked })} /></td><td className="px-2 py-1"><select value={row.section} onChange={(e) => updateFuture(row.id, { section: e.target.value as FutureSection })} className="rounded bg-slate-950 px-2 py-1"><option value="composition">Composición</option><option value="characteristics">Características</option><option value="services">Servicios</option><option value="airDefense">Defensa aérea</option></select></td><td className="px-2 py-1"><input value={row.name} onChange={(e) => updateFuture(row.id, { name: e.target.value })} className="w-64 rounded bg-slate-950 px-2 py-1" /></td><td className="px-2 py-1"><input type="number" value={row.priority} onChange={(e) => updateFuture(row.id, { priority: Number(e.target.value) })} className="w-20 rounded bg-slate-950 px-2 py-1" /></td><td className="px-2 py-1"><input type="number" step="0.001" value={row.coefficient} onChange={(e) => updateFuture(row.id, { coefficient: Number(e.target.value) })} className="w-24 rounded bg-slate-950 px-2 py-1" /></td><td className="px-2 py-1"><input type="number" value={row.blue} onChange={(e) => updateFuture(row.id, { blue: Number(e.target.value) })} className="w-24 rounded bg-slate-950 px-2 py-1" /></td><td className="px-2 py-1"><input type="number" value={row.red} onChange={(e) => updateFuture(row.id, { red: Number(e.target.value) })} className="w-24 rounded bg-slate-950 px-2 py-1" /></td><td className="px-2 py-1"><input value={row.notes} onChange={(e) => updateFuture(row.id, { notes: e.target.value })} className="w-72 rounded bg-slate-950 px-2 py-1" /></td><td className="px-2 py-1"><button type="button" onClick={() => removeFuture(row.id)} className="rounded bg-red-900 px-2 py-1">Eliminar</button></td></tr>)}</tbody></table></div>
          <div className="mt-3 rounded-lg bg-slate-950 p-3 text-sm"><p className="font-semibold text-slate-200">Resumen complementario</p><p>{content.blueName}: {displayValue(futureSummary.blueRaw)} · {content.redName}: {displayValue(futureSummary.redRaw)} · Relación: {displayValue(futureSummary.blue)} / {displayValue(futureSummary.red)}</p></div>
        </section>
      </div>
    </main>
  );
}
