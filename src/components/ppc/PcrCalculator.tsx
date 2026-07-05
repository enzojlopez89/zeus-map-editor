"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Side = "blue" | "red";
type SectionCode = "composition" | "characteristics" | "services" | "airDefense";

type Factor = {
  id: string;
  name: string;
  priority: number;
  blue: number;
  red: number;
  notes: string;
};

type PcrSection = {
  code: SectionCode;
  name: string;
  factors: Factor[];
};

type PcrDocument = {
  title: string;
  responsible: string;
  status: "borrador" | "en_analisis" | "aprobado" | "descartado";
  date: string;
  situation: string;
  blueIntegration: number;
  redIntegration: number;
  sections: PcrSection[];
  conclusion: string;
};

type Props = {
  workspaceCode: string;
  token: string;
};

const QUANTUM: Record<number, number[]> = {
  2: [0.68, 0.32],
  3: [0.5, 0.34, 0.16],
  4: [0.4, 0.3, 0.2, 0.1],
  5: [0.334, 0.267, 0.2, 0.135, 0.064],
  6: [0.28, 0.24, 0.192, 0.144, 0.096, 0.048],
  7: [0.25, 0.214, 0.18, 0.144, 0.108, 0.07, 0.034],
  8: [0.224, 0.194, 0.168, 0.14, 0.11, 0.084, 0.054, 0.026],
  9: [0.2, 0.18, 0.16, 0.13, 0.11, 0.07, 0.09, 0.04, 0.02],
  10: [0.182, 0.164, 0.144, 0.126, 0.11, 0.092, 0.072, 0.054, 0.036, 0.02],
};

function fallbackWeights(count: number) {
  const n = Math.max(1, count);
  const raw = Array.from({ length: n }, (_, index) => n - index);
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => value / total);
}

function coefficient(count: number, priority: number) {
  const weights = QUANTUM[count] ?? fallbackWeights(count);
  const index = Math.min(Math.max(Math.round(priority) - 1, 0), weights.length - 1);
  return weights[index] ?? 0;
}

function factor(name: string, priority: number): Factor {
  return {
    id: crypto.randomUUID(),
    name,
    priority,
    blue: 0,
    red: 0,
    notes: "",
  };
}

function defaultDocument(): PcrDocument {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: "Determinación del Poder Combativo Relativo",
    responsible: "",
    status: "borrador",
    date: today,
    situation: "",
    blueIntegration: 0.3,
    redIntegration: 0.5,
    conclusion: "",
    sections: [
      {
        code: "composition",
        name: "I. Composición de la fuerza",
        factors: [
          factor("Personal", 1),
          factor("Material aéreo", 2),
          factor("Armamento", 3),
          factor("Material de apoyo", 4),
          factor("Infraestructura operativa", 5),
        ],
      },
      {
        code: "characteristics",
        name: "II. Características de la fuerza",
        factors: [
          factor("Potencia de fuego", 1),
          factor("Alcance y radio de acción", 2),
          factor("Movilidad", 3),
          factor("Supervivencia", 4),
          factor("Adiestramiento", 5),
          factor("Mando y control", 6),
        ],
      },
      {
        code: "services",
        name: "III. Servicios y facilidades",
        factors: [
          factor("Abastecimiento", 1),
          factor("Mantenimiento", 2),
          factor("Transporte", 3),
          factor("Comunicaciones", 4),
          factor("Sanidad", 5),
          factor("Meteorología e información", 6),
        ],
      },
      {
        code: "airDefense",
        name: "IV. Defensa aérea",
        factors: [
          factor("Vigilancia y control", 1),
          factor("Aeronaves interceptoras", 2),
          factor("Sistemas SAM", 3),
          factor("Artillería antiaérea", 4),
          factor("Integración del sistema", 5),
        ],
      },
    ],
  };
}

function safeRatio(a: number, b: number) {
  if (a <= 0 && b <= 0) return 0;
  if (b <= 0) return 1;
  return Math.min(1, a / b);
}

function scoreSection(section: PcrSection) {
  const count = section.factors.length;
  const blue = section.factors.reduce(
    (sum, item) => sum + item.blue * coefficient(count, item.priority),
    0,
  );
  const red = section.factors.reduce(
    (sum, item) => sum + item.red * coefficient(count, item.priority),
    0,
  );
  return {
    blue,
    red,
    blueRatio: safeRatio(blue, red),
    redRatio: safeRatio(red, blue),
  };
}

export default function PcrCalculator({ workspaceCode, token }: Props) {
  const [document, setDocument] = useState<PcrDocument>(() => defaultDocument());
  const [message, setMessage] = useState("Cargando análisis...");
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/load`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo cargar el PCR.");
        if (result.analysis?.content) {
          setDocument(result.analysis.content as PcrDocument);
          setVersion(Number(result.analysis.version ?? 0));
          setMessage("Análisis recuperado.");
        } else {
          setMessage("Nuevo análisis listo para completar.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Error de carga.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [workspaceCode, token]);

  const scores = useMemo(
    () => Object.fromEntries(document.sections.map((section) => [section.code, scoreSection(section)])) as Record<SectionCode, ReturnType<typeof scoreSection>>,
    [document.sections],
  );

  const finalResult = useMemo(() => {
    const composition = scores.composition;
    const characteristics = scores.characteristics;
    const services = scores.services;
    const airDefense = scores.airDefense;

    const blueDefense = airDefense.blue * document.blueIntegration;
    const redDefense = airDefense.red * document.redIntegration;
    const blueDefenseRatio = safeRatio(blueDefense, redDefense);
    const redDefenseRatio = safeRatio(redDefense, blueDefense);

    const blueRaw = composition.blueRatio + characteristics.blueRatio + services.blueRatio - redDefenseRatio;
    const redRaw = composition.redRatio + characteristics.redRatio + services.redRatio - blueDefenseRatio;
    const blue = safeRatio(Math.max(0, blueRaw), Math.max(0, redRaw));
    const red = safeRatio(Math.max(0, redRaw), Math.max(0, blueRaw));

    return { blueRaw, redRaw, blue, red, blueDefenseRatio, redDefenseRatio };
  }, [document.blueIntegration, document.redIntegration, scores]);

  function updateSection(code: SectionCode, updater: (section: PcrSection) => PcrSection) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => section.code === code ? updater(section) : section),
    }));
  }

  function updateFactor(code: SectionCode, id: string, patch: Partial<Factor>) {
    updateSection(code, (section) => ({
      ...section,
      factors: section.factors.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  async function save() {
    setSaving(true);
    setMessage("Guardando...");
    try {
      const response = await fetch(`/api/workspaces/${workspaceCode}/pcr/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, content: document, result: finalResult }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo guardar.");
      setVersion(Number(result.version ?? version + 1));
      setMessage(`Guardado correctamente. Versión ${result.version ?? version + 1}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de guardado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">EJERCICIO ZEUS · A3 OPERACIONES · PPC</p>
            <h1 className="text-xl font-bold">Determinación interactiva del PCR</h1>
            <p className="text-sm text-slate-300">Basado en la planilla “Poder Combativo Relativo Azul vs Rojo”.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/espacio/${workspaceCode}/${token}`} className="rounded bg-slate-700 px-4 py-2 font-semibold hover:bg-slate-600">Volver al mapa</Link>
            <button type="button" onClick={() => void save()} disabled={saving} className="rounded bg-cyan-700 px-4 py-2 font-bold hover:bg-cyan-600 disabled:opacity-50">{saving ? "Guardando..." : "Guardar PCR"}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] space-y-5 p-4">
        <section className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="xl:col-span-2">Título<input value={document.title} onChange={(e) => setDocument({ ...document, title: e.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
          <label>Responsable<input value={document.responsible} onChange={(e) => setDocument({ ...document, responsible: e.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
          <label>Fecha<input type="date" value={document.date} onChange={(e) => setDocument({ ...document, date: e.target.value })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
          <label>Estado<select value={document.status} onChange={(e) => setDocument({ ...document, status: e.target.value as PcrDocument["status"] })} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"><option value="borrador">Borrador</option><option value="en_analisis">En análisis</option><option value="aprobado">Aprobado</option><option value="descartado">Descartado</option></select></label>
          <label className="md:col-span-2 xl:col-span-5">Situación considerada<textarea value={document.situation} onChange={(e) => setDocument({ ...document, situation: e.target.value })} rows={2} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2" /></label>
          <p className="md:col-span-2 xl:col-span-5 text-sm text-slate-300">{message} · Versión actual: {version}. La prioridad 1 recibe el mayor coeficiente. Los coeficientes siguen la matriz de cuantificación de la planilla original.</p>
        </section>

        {document.sections.map((section) => {
          const score = scores[section.code];
          return (
            <section key={section.code} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-800 px-4 py-3">
                <div><h2 className="font-bold text-cyan-200">{section.name}</h2><p className="text-xs text-slate-300">Azul ponderado: {score.blue.toFixed(3)} · Rojo ponderado: {score.red.toFixed(3)} · Relación A/R: {score.blueRatio.toFixed(3)} / {score.redRatio.toFixed(3)}</p></div>
                <button type="button" onClick={() => updateSection(section.code, (current) => ({ ...current, factors: [...current.factors, factor("Nuevo factor", current.factors.length + 1)] }))} className="rounded bg-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-600">Agregar factor</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead className="bg-slate-950 text-slate-300"><tr><th className="p-2 text-left">Factor</th><th className="p-2">Prioridad</th><th className="p-2">Coeficiente</th><th className="p-2">Azul</th><th className="p-2">Azul pond.</th><th className="p-2">Rojo</th><th className="p-2">Rojo pond.</th><th className="p-2 text-left">Fundamento / observaciones</th><th className="p-2"></th></tr></thead>
                  <tbody>
                    {section.factors.map((item) => {
                      const coeff = coefficient(section.factors.length, item.priority);
                      return <tr key={item.id} className="border-t border-slate-800">
                        <td className="p-2"><input value={item.name} onChange={(e) => updateFactor(section.code, item.id, { name: e.target.value })} className="w-full rounded bg-slate-950 px-2 py-1.5" /></td>
                        <td className="p-2"><input type="number" min={1} max={section.factors.length} value={item.priority} onChange={(e) => updateFactor(section.code, item.id, { priority: Number(e.target.value) })} className="w-20 rounded bg-slate-950 px-2 py-1.5 text-center" /></td>
                        <td className="p-2 text-center font-mono">{coeff.toFixed(3)}</td>
                        <td className="p-2"><input type="number" step="any" value={item.blue} onChange={(e) => updateFactor(section.code, item.id, { blue: Number(e.target.value) })} className="w-28 rounded bg-blue-950 px-2 py-1.5 text-right" /></td>
                        <td className="p-2 text-right font-mono text-blue-200">{(item.blue * coeff).toFixed(3)}</td>
                        <td className="p-2"><input type="number" step="any" value={item.red} onChange={(e) => updateFactor(section.code, item.id, { red: Number(e.target.value) })} className="w-28 rounded bg-red-950 px-2 py-1.5 text-right" /></td>
                        <td className="p-2 text-right font-mono text-red-200">{(item.red * coeff).toFixed(3)}</td>
                        <td className="p-2"><input value={item.notes} onChange={(e) => updateFactor(section.code, item.id, { notes: e.target.value })} className="w-full rounded bg-slate-950 px-2 py-1.5" /></td>
                        <td className="p-2"><button type="button" onClick={() => updateSection(section.code, (current) => ({ ...current, factors: current.factors.filter((factorItem) => factorItem.id !== item.id) }))} className="rounded bg-red-950 px-2 py-1 text-red-200 hover:bg-red-900">Eliminar</button></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              {section.code === "airDefense" && <div className="grid gap-3 border-t border-slate-700 bg-slate-950 p-4 sm:grid-cols-2"><label>Nivel de integración Azul<input type="number" step="0.01" min="0" max="1" value={document.blueIntegration} onChange={(e) => setDocument({ ...document, blueIntegration: Number(e.target.value) })} className="ml-3 w-24 rounded bg-slate-800 px-2 py-1" /></label><label>Nivel de integración Rojo<input type="number" step="0.01" min="0" max="1" value={document.redIntegration} onChange={(e) => setDocument({ ...document, redIntegration: Number(e.target.value) })} className="ml-3 w-24 rounded bg-slate-800 px-2 py-1" /></label></div>}
            </section>
          );
        })}

        <section className="rounded-xl border border-amber-700 bg-amber-950/30 p-5">
          <h2 className="text-lg font-bold text-amber-200">Resultado del PCR</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-blue-950 p-4"><p className="text-sm text-blue-200">Total Azul previo a normalización</p><p className="text-3xl font-bold">{finalResult.blueRaw.toFixed(3)}</p></div>
            <div className="rounded-lg bg-red-950 p-4"><p className="text-sm text-red-200">Total Rojo previo a normalización</p><p className="text-3xl font-bold">{finalResult.redRaw.toFixed(3)}</p></div>
            <div className="rounded-lg bg-blue-900 p-4"><p className="text-sm text-blue-100">PCR Azul</p><p className="text-4xl font-black">{finalResult.blue.toFixed(3)}</p></div>
            <div className="rounded-lg bg-red-900 p-4"><p className="text-sm text-red-100">PCR Rojo</p><p className="text-4xl font-black">{finalResult.red.toFixed(3)}</p></div>
          </div>
          <p className="mt-4 text-sm text-amber-100">La defensa aérea se incorpora como penalización cruzada, siguiendo la lógica de la hoja “RESUMEN PCR P-E”: la capacidad defensiva de un bando reduce el total del contrario.</p>
          <label className="mt-4 block">Conclusión y recomendación<textarea value={document.conclusion} onChange={(e) => setDocument({ ...document, conclusion: e.target.value })} rows={4} className="mt-1 w-full rounded border border-amber-800 bg-slate-950 px-3 py-2" /></label>
        </section>
      </div>
    </main>
  );
}
