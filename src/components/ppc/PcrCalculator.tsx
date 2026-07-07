"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PCR_WORKBOOK } from "./pcrWorkbookData";

type PcrStatus = "borrador" | "en_analisis" | "aprobado" | "descartado";
type Primitive = string | number | boolean | null;
type OverrideMap = Record<string, Primitive>;
type Sheet = any;
type CellRecord = { v?: Primitive; f?: string; fill?: string };
type SavedAnalysis = {
  id: string;
  analysis_key: string;
  title: string | null;
  status: string | null;
  version: number | null;
  updated_at: string | null;
};
type Props = { workspaceCode: string; token: string };

type Content = {
  version: "pcr-v4-full-workbook";
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
};

const STORAGE_VERSION = "pcr-v4-full-workbook";
const WORKBOOK: any = PCR_WORKBOOK;
const SHEETS: Sheet[] = Array.isArray(WORKBOOK.sheets) ? WORKBOOK.sheets : [];
const SHEET_MAP: Record<string, Sheet> = Object.fromEntries(
  SHEETS.map((s) => [s.name, s]),
);
const DEFAULT_SHEET = SHEETS[0]?.name ?? "SECC I P-E";

const SHEET_HELP: Record<string, string> = {
  "SECC I P-E":
    "Composición de la fuerza: personal, material aéreo y disponibilidad cuantitativa. Cargá cantidades reales por bando; los coeficientes se aplican según prioridad.",
  "SECC II P-E":
    "Características de la fuerza: calidad del personal, doctrina, preparación y rendimiento técnico del material aéreo. Incluye tablas de combate, transporte, reconocimiento, helicópteros y otras capacidades.",
  "SECC III P-E":
    "Servicios y facilidades: bases, mantenimiento, abastecimiento, pistas, comunicaciones, meteorología, seguridad y sostenimiento logístico.",
  "SECC IV P-E":
    "Defensa aérea: defensa pasiva, AAA, SAM, radares, interceptores, cobertura e integración. En el resumen se aplica como efecto relativo sobre el oponente.",
  "RESUMEN PCR P-E":
    "Resumen final: toma los resultados de las secciones y calcula la proporción del Poder Combativo Relativo entre ambos bandos.",
  CUANTIFICACION:
    "Matriz de cuantificación: tabla usada por las fórmulas VLOOKUP/BUSCARV para transformar prioridad en coeficiente.",
};

const SUMMARY_ROWS = [
  { label: "Composición de la fuerza", blue: "B7", red: "C7" },
  { label: "Características de la fuerza", blue: "B8", red: "C8" },
  { label: "Servicios y facilidades", blue: "B9", red: "C9" },
  { label: "Defensa aérea", blue: "B10", red: "C10" },
  { label: "Total", blue: "B11", red: "C11" },
  { label: "PCR final", blue: "B13", red: "C13" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function normalizeCell(cell: string) {
  return cell.replace(/\$/g, "").toUpperCase();
}
function key(sheetName: string, cell: string) {
  return `${sheetName}!${normalizeCell(cell)}`;
}
function colToNumber(col: string) {
  return col
    .toUpperCase()
    .split("")
    .reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0);
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
  return match
    ? { col: match[1], row: Number(match[2]) }
    : { col: "A", row: 1 };
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
  for (let r = minRow; r <= maxRow; r += 1)
    for (let c = minCol; c <= maxCol; c += 1)
      result.push(`${numberToCol(c)}${r}`);
  return result;
}
function rangeWidth(range: string) {
  const [start, end = start] = range.split(":").map(normalizeCell);
  const a = splitAddress(start);
  const b = splitAddress(end);
  return Math.abs(colToNumber(b.col) - colToNumber(a.col)) + 1;
}
function flattenAny(value: any): any[] {
  if (!Array.isArray(value)) return [value];
  const out: any[] = [];
  for (const item of value) out.push(...flattenAny(item));
  return out;
}
function asNumber(value: any): number {
  if (Array.isArray(value))
    return flattenAny(value).reduce((sum, item) => sum + asNumber(item), 0);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function displayValue(value: any, digits = 3) {
  if (Array.isArray(value)) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) >= 100 || Number.isInteger(value))
      return String(Number(value.toFixed(3)));
    return value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
  }
  if (typeof value === "boolean") return value ? "VERDADERO" : "FALSO";
  return value == null ? "" : String(value);
}
function parseInputValue(value: string, previous: Primitive): Primitive {
  const raw = value.trim();
  if (raw === "") return null;
  if (typeof previous === "number" || /^-?\d+(?:[.,]\d+)?$/.test(raw)) {
    const parsed = Number(raw.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : raw;
  }
  if (raw.toUpperCase() === "TRUE" || raw.toUpperCase() === "VERDADERO")
    return true;
  if (raw.toUpperCase() === "FALSE" || raw.toUpperCase() === "FALSO")
    return false;
  return value;
}
function defaultContent(): Content {
  return {
    version: STORAGE_VERSION,
    title: "PCR ZEUS 1 TERRA NORTE",
    analysisKey: "principal",
    blueName: "TERRA",
    redName: "NORTE",
    responsible: "",
    status: "borrador",
    date: today(),
    situation:
      "Escenario ZEUS 1 / TERRA vs NORTE. Se cargan todas las hojas y tablas del Excel original.",
    conclusion:
      "El resumen inicial de la planilla arroja ventaja relativa para TERRA. Todas las celdas de entrada pueden modificarse manualmente para futuros escenarios.",
    overrides: {},
  };
}
function parseContent(value: unknown): Content | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Content>;
  if (candidate.version !== STORAGE_VERSION) return null;
  return {
    ...defaultContent(),
    ...candidate,
    overrides: candidate.overrides ?? {},
  };
}
function cellRecord(sheet: Sheet, addr: string): CellRecord | undefined {
  return sheet?.cells?.[normalizeCell(addr)];
}
function formulaEvaluator(overrides: OverrideMap) {
  const cache = new Map<string, any>();
  const visiting = new Set<string>();
  const C = (sheetName: string, cell: string): any => {
    const addr = normalizeCell(cell);
    const full = key(sheetName, addr);
    if (Object.prototype.hasOwnProperty.call(overrides, full))
      return overrides[full];
    if (cache.has(full)) return cache.get(full);
    if (visiting.has(full)) return 0;
    const sheet = SHEET_MAP[sheetName];
    const record = cellRecord(sheet, addr);
    if (!record) return null;
    if (!record.f) return record.v ?? null;
    visiting.add(full);
    let out: any = record.v ?? null;
    try {
      out = evalFormula(sheetName, record.f, record.v ?? null);
    } catch {
      out = record.v ?? null;
    }
    visiting.delete(full);
    cache.set(full, out);
    return out;
  };
  const R = (sheetName: string, range: string): any[] =>
    addressesInRange(range).map((addr) => C(sheetName, addr));
  const SUM = (...args: any[]) =>
    args.flatMap(flattenAny).reduce((sum, item) => sum + asNumber(item), 0);
  const DMAX = (...args: any[]) => {
    const values = flattenAny(args[args.length - 1] ?? args[0])
      .map(asNumber)
      .filter(Number.isFinite);
    return values.length ? Math.max(...values) : 0;
  };
  const VLOOKUP = (lookupValue: any, table: any, colIndex: any) => {
    const flat = flattenAny(table);
    const col = Math.max(1, Math.round(asNumber(colIndex)));
    const lookup = asNumber(lookupValue);
    const width = 20; // Las búsquedas del Excel usan CUANTIFICACION!A:T.
    for (let index = 0; index < flat.length; index += width) {
      if (asNumber(flat[index]) === lookup)
        return flat[index + col - 1] ?? null;
    }
    return null;
  };
  const IFX = (condition: unknown, whenTrue: any, whenFalse: any) =>
    condition ? whenTrue : whenFalse;
  function putPlaceholders(expression: string, sheetName: string) {
    let expr = expression;
    const placeholders: string[] = [];
    const put = (code: string) => {
      const marker = `__REF_${placeholders.length}__`;
      placeholders.push(code);
      return marker;
    };
    expr = expr.replace(
      /(?:'([^']+)'|([A-Za-z0-9_ÁÉÍÓÚÑáéíóúñ\- ]+))!\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/g,
      (_m, quoted, plain, c1, r1, c2, r2) => {
        const targetSheet = (quoted || plain).trim();
        const target = `${c1}${r1}${c2 ? `:${c2}${r2}` : ""}`;
        return put(
          c2
            ? `R(${JSON.stringify(targetSheet)},${JSON.stringify(target)})`
            : `C(${JSON.stringify(targetSheet)},${JSON.stringify(target)})`,
        );
      },
    );
    expr = expr.replace(
      /\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/g,
      (_m, c1, r1, c2, r2) => {
        const target = `${c1}${r1}${c2 ? `:${c2}${r2}` : ""}`;
        return c2
          ? `R(${JSON.stringify(sheetName)},${JSON.stringify(target)})`
          : `C(${JSON.stringify(sheetName)},${JSON.stringify(target)})`;
      },
    );
    placeholders.forEach((code, index) => {
      expr = expr.replaceAll(`__REF_${index}__`, code);
    });
    return expr;
  }
  function evalFormula(
    sheetName: string,
    formula: string,
    fallback: Primitive,
  ): any {
    let expr = formula.startsWith("=") ? formula.slice(1) : formula;
    expr = expr.replace(/<>/g, "!=");
    expr = expr.replace(/(?<![<>!])=(?!=)/g, "===");
    expr = expr.replace(/\bIF\s*\(/g, "IFX(");
    expr = expr.replace(/\bFALSE\b/g, "false").replace(/\bTRUE\b/g, "true");
    expr = putPlaceholders(expr, sheetName);
    try {
      // eslint-disable-next-line no-new-func
      return Function(
        "C",
        "R",
        "SUM",
        "DMAX",
        "VLOOKUP",
        "IFX",
        `return (${expr});`,
      )(C, R, SUM, DMAX, VLOOKUP, IFX);
    } catch {
      return fallback;
    }
  }
  return { C, R };
}
function buildZeroOverrides() {
  const overrides: OverrideMap = {};
  for (const sheet of SHEETS) {
    for (const [addr, record] of Object.entries(sheet.cells ?? {}) as [
      string,
      CellRecord,
    ][]) {
      if (!record.f && typeof record.v === "number")
        overrides[key(sheet.name, addr)] = 0;
    }
  }
  return overrides;
}
function rowsText(sheet: Sheet, startRow: number, endRow: number) {
  const parts: string[] = [];
  for (let r = startRow; r <= endRow; r += 1) {
    for (let c = 1; c <= sheet.maxCol; c += 1) {
      const value = cellRecord(sheet, `${numberToCol(c)}${r}`)?.v;
      if (value != null) parts.push(String(value));
    }
  }
  return parts.join(" ").toLowerCase();
}

function isFormulaLikeText(value: unknown) {
  if (typeof value !== "string") return false;
  const text = value.trim().toUpperCase();
  return (
    text.startsWith("=") ||
    text.includes("SUM(") ||
    text.includes("DMAX(") ||
    text.includes("VLOOKUP(") ||
    text.includes("BUSCARV(") ||
    text.includes("IF(")
  );
}
function isMostlyNumericText(value: unknown) {
  if (typeof value !== "string") return false;
  const clean = value.trim().replace(/[,\.\s\-:()%]/g, "");
  return clean.length > 0 && /^[0-9]+$/.test(clean);
}
function humanCellText(value: unknown) {
  if (value == null) return "";
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text || isFormulaLikeText(text) || isMostlyNumericText(text)) return "";
  return text;
}
function bestHumanTextInRows(sheet: Sheet, startRow: number, endRow: number) {
  const candidates: string[] = [];
  for (let r = startRow; r <= endRow; r += 1) {
    for (let c = 1; c <= sheet.maxCol; c += 1) {
      const value = cellRecord(sheet, `${numberToCol(c)}${r}`)?.v;
      const text = humanCellText(value);
      if (text && !/^(TERRA|NORTE|TOTAL|prioriz|coefic)$/i.test(text))
        candidates.push(text);
    }
    if (candidates.length) break;
  }
  return candidates[0] ?? "Tabla";
}
function blockTitle(sheet: Sheet, block: any, index?: number) {
  const raw = humanCellText(block?.title);
  if (raw && !/^Tabla\s+\d+$/i.test(raw)) return raw;
  const fromRows = bestHumanTextInRows(
    sheet,
    Number(block?.startRow ?? 1),
    Number(block?.endRow ?? 1),
  );
  return fromRows === "Tabla"
    ? `Tabla ${index != null ? index + 1 : ""}`.trim()
    : fromRows;
}
function cellKind(
  sheet: Sheet,
  rowNumber: number,
  colNumber: number,
  record?: CellRecord,
  hasOverride?: boolean,
) {
  const value = record?.v;
  const formula = record?.f;
  if (!record && !hasOverride) return "empty";
  if (formula) return "formula";
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (
      ["prioriz", "coefic", "total", "terra", "norte"].includes(text) ||
      text.length > 25
    )
      return "label";
  }
  if (colNumber === 1) return "label";
  return "input";
}
function cellClasses(kind: string) {
  if (kind === "label")
    return "min-w-[18rem] max-w-[36rem] whitespace-normal break-words text-left";
  if (kind === "formula")
    return "min-w-[7rem] whitespace-nowrap text-right font-mono text-slate-200";
  if (kind === "input") return "min-w-[6.5rem] whitespace-nowrap text-right";
  return "min-w-[3rem]";
}

function boundsForBlock(sheet: Sheet, startRow: number, endRow: number) {
  let minCol = sheet.maxCol;
  let maxCol = 1;
  for (let r = startRow; r <= endRow; r += 1) {
    for (let c = 1; c <= sheet.maxCol; c += 1) {
      const record = cellRecord(sheet, `${numberToCol(c)}${r}`);
      if (record) {
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }
  return { minCol: Math.max(1, minCol), maxCol: Math.max(1, maxCol) };
}

export default function PcrCalculator({ workspaceCode, token }: Props) {
  const [content, setContent] = useState<Content>(() => defaultContent());
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [activeSheet, setActiveSheet] = useState(DEFAULT_SHEET);
  const [activeBlockId, setActiveBlockId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Cargando PCR...");
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const evaluator = useMemo(
    () => formulaEvaluator(content.overrides),
    [content.overrides],
  );
  const active = SHEET_MAP[activeSheet] ?? SHEETS[0];
  const blocks = active?.blocks ?? [];
  const activeBlock =
    activeBlockId === "all"
      ? null
      : (blocks.find((b: any) => b.id === activeBlockId) ?? null);
  const summary = useMemo(() => {
    const rows = SUMMARY_ROWS.map((row) => ({
      ...row,
      blueValue: asNumber(evaluator.C("RESUMEN PCR P-E", row.blue)),
      redValue: asNumber(evaluator.C("RESUMEN PCR P-E", row.red)),
    }));
    const pcr = rows.find((row) => row.label === "PCR final");
    const leader =
      (pcr?.blueValue ?? 0) === (pcr?.redValue ?? 0)
        ? "="
        : (pcr?.blueValue ?? 0) > (pcr?.redValue ?? 0)
          ? "blue"
          : "red";
    return {
      rows,
      pcrBlue: pcr?.blueValue ?? 0,
      pcrRed: pcr?.redValue ?? 0,
      leader,
    };
  }, [evaluator]);
  const filteredBlocks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return blocks;
    return blocks.filter((b: any) =>
      `${blockTitle(active, b)} ${rowsText(active, b.startRow, b.endRow)}`
        .toLowerCase()
        .includes(q),
    );
  }, [blocks, active, search]);

  async function loadAnalysis(
    analysisKey = content.analysisKey,
    silent = false,
  ) {
    if (!silent) setMessage("Cargando PCR...");
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceCode}/pcr/load`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, analysisKey }),
          cache: "no-store",
        },
      );
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error ?? "No se pudo cargar el PCR.");
      setSavedAnalyses(result.analyses ?? []);
      const loaded = parseContent(result.analysis?.content);
      if (loaded) {
        setContent({
          ...loaded,
          analysisKey: result.analysis.analysis_key ?? loaded.analysisKey,
        });
        setVersion(Number(result.analysis.version ?? 0));
        setMessage("PCR completo recuperado desde Supabase.");
      } else
        setMessage(
          "No había PCR v4 guardado. Se muestran todas las tablas y valores originales del Excel.",
        );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al cargar el PCR.",
      );
    }
  }
  useEffect(() => {
    void loadAnalysis(
      "principal",
    ); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [workspaceCode, token]);
  function patch(patchValue: Partial<Content>) {
    setContent((current) => ({ ...current, ...patchValue }));
  }
  function updateOverride(sheetName: string, addr: string, value: Primitive) {
    setContent((current) => ({
      ...current,
      overrides: { ...current.overrides, [key(sheetName, addr)]: value },
    }));
  }
  function resetCell(sheetName: string, addr: string) {
    setContent((current) => {
      const next = { ...current.overrides };
      delete next[key(sheetName, addr)];
      return { ...current, overrides: next };
    });
  }
  function restoreZeus() {
    if (
      !window.confirm(
        "Se restaurarán todos los valores originales del Excel. ¿Continuar?",
      )
    )
      return;
    setContent((current) => ({
      ...current,
      ...defaultContent(),
      overrides: {},
      analysisKey: current.analysisKey,
    }));
    setMessage(
      "Valores ZEUS restaurados. Guardá para conservarlos en Supabase.",
    );
  }
  function clearScenario() {
    if (
      !window.confirm(
        "Se pondrán en cero todas las celdas numéricas editables para cargar otro escenario. ¿Continuar?",
      )
    )
      return;
    setContent((current) => ({
      ...current,
      title: "Nuevo escenario PCR",
      analysisKey: `escenario-${Date.now()}`,
      blueName: "BANDO AZUL",
      redName: "BANDO ROJO",
      situation: "",
      conclusion: "",
      overrides: buildZeroOverrides(),
    }));
    setVersion(0);
    setMessage("Escenario en blanco preparado.");
  }
  function duplicateScenario() {
    setContent((current) => ({
      ...current,
      title: `${current.title} - copia`,
      analysisKey: `copia-${Date.now()}`,
    }));
    setVersion(0);
    setMessage(
      "Escenario duplicado. Guardalo para conservarlo como análisis independiente.",
    );
  }
  async function save() {
    setSaving(true);
    setMessage("Guardando PCR completo...");
    try {
      const resultPayload = {
        summary,
        calculatedAt: new Date().toISOString(),
        modifiedCells: Object.keys(content.overrides).length,
      };
      const response = await fetch(
        `/api/workspaces/${workspaceCode}/pcr/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            analysisKey: content.analysisKey || "principal",
            content,
            result: resultPayload,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error ?? "No se pudo guardar.");
      setVersion(Number(result.version ?? version + 1));
      setMessage(
        `PCR guardado correctamente. Versión ${result.version ?? version + 1}.`,
      );
      void loadAnalysis(content.analysisKey, true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al guardar el PCR.",
      );
    } finally {
      setSaving(false);
    }
  }
  function changeSheet(name: string) {
    setActiveSheet(name);
    setActiveBlockId("all");
  }
  function renderCell(sheet: Sheet, rowNumber: number, colNumber: number) {
    const addr = `${numberToCol(colNumber)}${rowNumber}`;
    const record = cellRecord(sheet, addr);
    const fullKey = key(sheet.name, addr);
    const formula = record?.f;
    const original = record?.v ?? null;
    const hasOverride = Object.prototype.hasOwnProperty.call(
      content.overrides,
      fullKey,
    );
    const value = formula
      ? evaluator.C(sheet.name, addr)
      : hasOverride
        ? content.overrides[fullKey]
        : original;
    const shown = displayValue(value, 4);
    const kind = cellKind(sheet, rowNumber, colNumber, record, hasOverride);
    const fill = record?.fill ? `#${record.fill}` : undefined;
    const baseTitle =
      formula && showFormulas ? `${addr}: ${formula}` : `${addr}`;
    const tdClass =
      kind === "formula"
        ? "bg-slate-900 text-slate-300"
        : kind === "input"
          ? hasOverride
            ? "bg-cyan-950"
            : "bg-blue-950/40"
          : kind === "label"
            ? "bg-slate-800/80 text-slate-100"
            : "bg-slate-950";
    return (
      <td
        key={addr}
        title={baseTitle}
        style={fill ? { backgroundColor: `${fill}33` } : undefined}
        className={`border border-slate-800 p-0 align-top ${tdClass} ${cellClasses(kind)}`}
      >
        {formula || kind === "empty" ? (
          <div className={`min-h-8 px-2 py-1 ${cellClasses(kind)}`}>
            {showFormulas && formula ? (
              <span className="text-[10px] text-amber-200">{formula}</span>
            ) : (
              shown
            )}
          </div>
        ) : kind === "label" ? (
          <div className="min-h-8 px-2 py-1 leading-snug">{shown}</div>
        ) : (
          <div className="flex min-w-[6.5rem] items-stretch">
            <input
              value={displayValue(value, 4)}
              onChange={(e) =>
                updateOverride(
                  sheet.name,
                  addr,
                  parseInputValue(e.target.value, original),
                )
              }
              className="min-h-8 w-full bg-transparent px-2 py-1 text-right outline-none focus:bg-cyan-900"
            />
            {hasOverride && (
              <button
                type="button"
                onClick={() => resetCell(sheet.name, addr)}
                className="px-1 text-amber-300"
                title="Restaurar celda"
              >
                ↺
              </button>
            )}
          </div>
        )}
      </td>
    );
  }
  function renderGrid(
    sheet: Sheet,
    startRow: number,
    endRow: number,
    minCol: number,
    maxCol: number,
  ) {
    return (
      <div className="overflow-auto rounded-lg border border-slate-700">
        <table className="border-collapse text-xs table-auto">
          <thead className="sticky top-0 z-10 bg-slate-800">
            <tr>
              <th className="sticky left-0 z-20 border border-slate-700 bg-slate-800 px-2 py-1">
                #
              </th>
              {Array.from({ length: maxCol - minCol + 1 }, (_, index) => (
                <th
                  key={index}
                  className="border border-slate-700 px-2 py-1 text-slate-300"
                >
                  {numberToCol(minCol + index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: endRow - startRow + 1 }, (_, rIndex) => {
              const rowNumber = startRow + rIndex;
              return (
                <tr key={rowNumber}>
                  <th className="sticky left-0 border border-slate-700 bg-slate-800 px-2 py-1 text-slate-400">
                    {rowNumber}
                  </th>
                  {Array.from({ length: maxCol - minCol + 1 }, (_, cIndex) =>
                    renderCell(sheet, rowNumber, minCol + cIndex),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  const blockBounds = activeBlock
    ? boundsForBlock(active, activeBlock.startRow, activeBlock.endRow)
    : { minCol: 1, maxCol: Math.min(active?.maxCol ?? 1, 20) };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1900px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              PPC · Poder Combativo Relativo
            </p>
            <h1 className="text-xl font-black">
              PCR completo por tablas · {content.blueName} vs {content.redName}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/espacio/${workspaceCode}/${token}`}
              className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600"
            >
              Volver al mapa A3
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded bg-cyan-600 px-4 py-2 text-sm font-bold hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar análisis"}
            </button>
            <button
              type="button"
              onClick={duplicateScenario}
              className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600"
            >
              Duplicar
            </button>
            <button
              type="button"
              onClick={restoreZeus}
              className="rounded bg-emerald-800 px-3 py-2 text-sm font-semibold hover:bg-emerald-700"
            >
              Restaurar ZEUS
            </button>
            <button
              type="button"
              onClick={clearScenario}
              className="rounded bg-red-900 px-3 py-2 text-sm font-semibold hover:bg-red-800"
            >
              Borrado completo
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1900px] gap-5 p-4 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 font-bold text-cyan-200">Datos del análisis</h2>
            <div className="space-y-3 text-sm">
              <label className="block">
                Título
                <input
                  value={content.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
                />
              </label>
              <label className="block">
                Clave
                <input
                  value={content.analysisKey}
                  onChange={(e) => patch({ analysisKey: e.target.value })}
                  className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  Bando 1
                  <input
                    value={content.blueName}
                    onChange={(e) => patch({ blueName: e.target.value })}
                    className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
                  />
                </label>
                <label>
                  Bando 2
                  <input
                    value={content.redName}
                    onChange={(e) => patch({ redName: e.target.value })}
                    className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
                  />
                </label>
              </div>
              <label>
                Responsable
                <input
                  value={content.responsible}
                  onChange={(e) => patch({ responsible: e.target.value })}
                  className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  Fecha
                  <input
                    type="date"
                    value={content.date}
                    onChange={(e) => patch({ date: e.target.value })}
                    className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
                  />
                </label>
                <label>
                  Estado
                  <select
                    value={content.status}
                    onChange={(e) =>
                      patch({ status: e.target.value as PcrStatus })
                    }
                    className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
                  >
                    <option value="borrador">Borrador</option>
                    <option value="en_analisis">En análisis</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </label>
              </div>
              <label>
                Situación
                <textarea
                  value={content.situation}
                  onChange={(e) => patch({ situation: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {message} · Versión {version} · Celdas modificadas{" "}
              {Object.keys(content.overrides).length}
            </p>
          </section>
          <section className="rounded-xl border border-amber-700 bg-amber-950/30 p-4">
            <h2 className="font-bold text-amber-200">Resumen PCR</h2>
            <p className="mt-1 text-sm text-amber-100">
              Ventaja:{" "}
              <strong>
                {summary.leader === "blue"
                  ? content.blueName
                  : summary.leader === "red"
                    ? content.redName
                    : "Equilibrio"}
              </strong>
            </p>
            <div className="mt-3 space-y-2 text-xs">
              {summary.rows.map((row) => (
                <div key={row.label} className="rounded bg-slate-950 p-2">
                  <p className="font-semibold">{row.label}</p>
                  <p className="text-blue-200">
                    {content.blueName}: {displayValue(row.blueValue)}
                  </p>
                  <p className="text-red-200">
                    {content.redName}: {displayValue(row.redValue)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs">
                <span>{content.blueName}</span>
                <span>{displayValue(summary.pcrBlue)}</span>
              </div>
              <div className="h-4 rounded bg-slate-800">
                <div
                  className="h-4 rounded bg-blue-500"
                  style={{
                    width: `${Math.max(2, Math.min(100, summary.pcrBlue * 100))}%`,
                  }}
                />
              </div>
              <div className="mb-1 mt-2 flex justify-between text-xs">
                <span>{content.redName}</span>
                <span>{displayValue(summary.pcrRed)}</span>
              </div>
              <div className="h-4 rounded bg-slate-800">
                <div
                  className="h-4 rounded bg-red-500"
                  style={{
                    width: `${Math.max(2, Math.min(100, summary.pcrRed * 100))}%`,
                  }}
                />
              </div>
            </div>
            <label className="mt-3 block text-sm">
              Conclusión
              <textarea
                value={content.conclusion}
                onChange={(e) => patch({ conclusion: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded bg-slate-950 px-3 py-2"
              />
            </label>
          </section>
          {savedAnalyses.length > 0 && (
            <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-2 font-bold text-cyan-200">
                Análisis guardados
              </h2>
              <div className="space-y-2">
                {savedAnalyses.map((analysis) => (
                  <button
                    key={analysis.id}
                    type="button"
                    onClick={() => void loadAnalysis(analysis.analysis_key)}
                    className={`w-full rounded px-3 py-2 text-left text-sm ${analysis.analysis_key === content.analysisKey ? "bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"}`}
                  >
                    {analysis.title || analysis.analysis_key}
                    <br />
                    <span className="text-xs text-slate-300">
                      v{analysis.version ?? 0} ·{" "}
                      {analysis.updated_at
                        ? new Date(analysis.updated_at).toLocaleString()
                        : "sin fecha"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </aside>
        <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-cyan-200">
                Todas las tablas del Excel
              </h2>
              <p className="text-sm text-slate-300">
                Seleccioná hoja y tabla. Ejemplo: SECC II P-E → c. Aeronaves de
                Reconocimiento. Las celdas azules son editables para tipear
                valores; las grises son resultados calculados. Las fórmulas
                quedan ocultas salvo que actives “Ver fórmulas”.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showFormulas}
                onChange={(e) => setShowFormulas(e.target.checked)}
              />{" "}
              Ver fórmulas
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {SHEETS.map((sheet) => (
              <button
                key={sheet.name}
                type="button"
                onClick={() => changeSheet(sheet.name)}
                className={`rounded px-3 py-1.5 text-sm font-semibold ${activeSheet === sheet.name ? "bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"}`}
              >
                {sheet.name}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
            {SHEET_HELP[activeSheet] ?? "Hoja importada desde el Excel."}
          </div>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              <input
                placeholder="Buscar tabla o variable..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-3 w-full rounded bg-slate-900 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setActiveBlockId("all")}
                className={`mb-2 w-full rounded px-3 py-2 text-left text-sm ${activeBlockId === "all" ? "bg-cyan-700" : "bg-slate-800 hover:bg-slate-700"}`}
              >
                Hoja completa
              </button>
              <div className="max-h-[65vh] space-y-2 overflow-auto">
                {filteredBlocks.map((block: any) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setActiveBlockId(block.id)}
                    className={`w-full rounded px-3 py-2 text-left text-sm ${activeBlockId === block.id ? "bg-cyan-700" : "bg-slate-800 hover:bg-slate-700"}`}
                  >
                    <span className="font-semibold">
                      {blockTitle(active, block)}
                    </span>
                    <br />
                    <span className="text-xs text-slate-400">
                      Filas {block.startRow}-{block.endRow}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-slate-100">
                {activeBlock
                  ? blockTitle(active, activeBlock)
                  : `${active.name} · hoja completa`}
              </h3>
              {activeBlock ? (
                renderGrid(
                  active,
                  activeBlock.startRow,
                  activeBlock.endRow,
                  blockBounds.minCol,
                  blockBounds.maxCol,
                )
              ) : (
                <div className="max-h-[75vh] overflow-auto">
                  {renderGrid(active, 1, active.maxRow, 1, active.maxCol)}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
