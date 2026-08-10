"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import rawQuestions from "@/data/trivia-questions.json";
import type { SessionAnswer, TriviaMode, TriviaQuestion, TriviaQuestionType } from "./types";

const CATEGORY_ALIASES: Record<string, string> = {
  "Otras preguntas verificadas": "PPC general e integrador",
  "Preguntas complementarias del examen 2020": "PPC general e integrador",
};

const QUESTIONS = (rawQuestions as TriviaQuestion[])
  .filter((question) => question.tipo !== "desarrollo")
  .map((question) => ({
    ...question,
    categoria: CATEGORY_ALIASES[question.categoria] ?? question.categoria,
  }));
const SESSION_KEY = "zeus-trivia-ppc-session-v2";
const COMPLETE_PPC = "ppc-completo";
const TRIVIA_ONLY = process.env.NEXT_PUBLIC_TRIVIA_ONLY === "true";

type StoredSession = {
  answers: SessionAnswer[];
  exams: { date: string; score: number; correct: number; total: number; seconds: number }[];
  marked: string[];
  startedAt: string;
};

type Setup = {
  mode: TriviaMode;
  category: string;
  type: "todas" | TriviaQuestionType;
  count: number;
  random: boolean;
  timer: boolean;
};

const EMPTY_SESSION: StoredSession = {
  answers: [],
  exams: [],
  marked: [],
  startedAt: new Date().toISOString(),
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function TriviaApp() {
  const categories = useMemo(() => Array.from(new Set(QUESTIONS.map((q) => q.categoria))), []);
  const [session, setSession] = useState<StoredSession>(EMPTY_SESSION);
  const [screen, setScreen] = useState<"home" | "run" | "results" | "stats">("home");
  const [setup, setSetup] = useState<Setup>({ mode: "estudio", category: COMPLETE_PPC, type: "todas", count: 20, random: true, timer: true });
  const [queue, setQueue] = useState<TriviaQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [runAnswers, setRunAnswers] = useState<SessionAnswer[]>([]);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [correctionMessage, setCorrectionMessage] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try { setSession(JSON.parse(stored) as StoredSession); } catch { /* sesión nueva */ }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (screen !== "run" || !setup.timer) return;
    timerRef.current = setInterval(() => {
      setQuestionSeconds((v) => v + 1);
      setTotalSeconds((v) => v + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, setup.timer, index]);

  const current = queue[index];
  const canVerify = Boolean(selected);
  const correct = current && selected ? selected === current.respuestaCorrecta : null;

  function availableQuestions() {
    let list = QUESTIONS.filter((q) => q.activa);
    if (setup.category !== COMPLETE_PPC) list = list.filter((q) => q.categoria === setup.category);
    if (setup.type !== "todas") list = list.filter((q) => q.tipo === setup.type);
    return list;
  }

  function start() {
    const available = availableQuestions();
    const prepared = (setup.random ? shuffle(available) : available).slice(0, Math.min(setup.count, available.length));
    setQueue(prepared);
    setIndex(0);
    setSelected(null);
    setVerified(false);
    setRunAnswers([]);
    setQuestionSeconds(0);
    setTotalSeconds(0);
    setCorrectionMessage("");
    setCorrectionStatus("idle");
    setShowExplanation(false);
    setScreen("run");
  }

  function verify() {
    if (!current || !canVerify || verified) return;
    const answer: SessionAnswer = {
      questionId: current.id,
      selectedOptionId: selected ?? undefined,
      correct,
      elapsedSeconds: questionSeconds,
      answeredAt: new Date().toISOString(),
    };
    setRunAnswers((prev) => [...prev, answer]);
    setVerified(true);
  }

  function next() {
    if (!current || !verified) return;
    if (index >= queue.length - 1) {
      finish(runAnswers);
      return;
    }
    setIndex((v) => v + 1);
    setSelected(null);
    setVerified(false);
    setQuestionSeconds(0);
    setCorrectionMessage("");
    setCorrectionStatus("idle");
    setShowExplanation(false);
  }

  async function submitCorrection() {
    if (!current || !correctionMessage.trim() || correctionStatus === "sending") return;
    setCorrectionStatus("sending");
    try {
      const response = await fetch("/api/trivia/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: current.id,
          questionNumber: current.numero,
          questionText: current.pregunta,
          selectedOptionId: selected,
          correctOptionId: current.respuestaCorrecta,
          message: correctionMessage.trim(),
        }),
      });
      if (!response.ok) throw new Error("No se pudo enviar el reporte.");
      setCorrectionStatus("sent");
      setCorrectionMessage("");
    } catch {
      setCorrectionStatus("error");
    }
  }

  function finish(finalAnswers = runAnswers) {
    const objective = finalAnswers.filter((a) => a.correct !== null);
    const correctCount = objective.filter((a) => a.correct).length;
    const score = objective.length ? Math.round((correctCount / objective.length) * 100) : 0;
    setRunAnswers(finalAnswers);
    setSession((prev) => ({
      ...prev,
      answers: [...prev.answers, ...finalAnswers],
      exams: setup.mode === "examen" ? [...prev.exams, { date: new Date().toISOString(), score, correct: correctCount, total: objective.length, seconds: totalSeconds }] : prev.exams,
    }));
    setScreen("results");
  }

  function toggleMarked() {
    if (!current) return;
    setSession((prev) => ({
      ...prev,
      marked: prev.marked.includes(current.id) ? prev.marked.filter((id) => id !== current.id) : [...prev.marked, current.id],
    }));
  }

  const stats = useMemo(() => {
    const objective = session.answers.filter((a) => a.correct !== null);
    const correctCount = objective.filter((a) => a.correct).length;
    const byCategory = categories.map((category) => {
      const ids = new Set(QUESTIONS.filter((q) => q.categoria === category).map((q) => q.id));
      const answers = objective.filter((a) => ids.has(a.questionId));
      const right = answers.filter((a) => a.correct).length;
      return { category, total: answers.length, pct: answers.length ? Math.round((right / answers.length) * 100) : 0 };
    }).filter((x) => x.total > 0).sort((a, b) => b.pct - a.pct);
    return {
      total: objective.length,
      correct: correctCount,
      wrong: objective.length - correctCount,
      pct: objective.length ? Math.round((correctCount / objective.length) * 100) : 0,
      strongest: byCategory[0],
      weakest: byCategory[byCategory.length - 1],
      byCategory,
    };
  }, [session.answers, categories]);

  if (screen === "home") {
    const available = availableQuestions().length;
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {!TRIVIA_ONLY && (
                <Link href="/" className="text-xs font-bold uppercase tracking-widest text-cyan-300">← Inicio ZEUS</Link>
              )}
              <h1 className="mt-3 text-4xl font-black uppercase">Trivia PPC</h1>
              <p className="mt-2 text-slate-300">Banco doctrinario actualizado · sesión independiente por navegador</p>
            </div>
            <button onClick={() => setScreen("stats")} className="rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-5 py-3 text-sm font-black uppercase tracking-widest">Estadísticas</button>
          </div>

          {!TRIVIA_ONLY && (
            <Link
              href="/trivia-ppc/orientacion-as"
              className="mt-8 block rounded-3xl border border-amber-300/45 bg-gradient-to-r from-amber-500/20 via-slate-900 to-cyan-500/10 p-6 shadow-2xl transition hover:-translate-y-0.5 hover:border-amber-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">Nuevo apartado</p>
                  <h2 className="mt-2 text-2xl font-black">Modo examen orientación del AS.</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">125 preguntas verificadas y relacionadas directamente con la orientación recibida para el examen PPC.</p>
                </div>
                <span className="rounded-xl bg-amber-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-950">Ingresar →</span>
              </div>
            </Link>
          )}

          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
              <h2 className="text-xl font-black">Configurar sesión</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold">Modo
                  <select value={setup.mode} onChange={(e) => setSetup({ ...setup, mode: e.target.value as TriviaMode })} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3">
                    <option value="estudio">Modo Estudio</option>
                    <option value="examen">Modo Examen</option>
                  </select>
                </label>
                <label className="text-sm font-bold">Cantidad
                  <select value={setup.count} onChange={(e) => setSetup({ ...setup, count: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3">
                    {[10,20,30,50,100,QUESTIONS.length].map((n) => <option key={n} value={n}>{n === QUESTIONS.length ? `Todas (${n})` : n}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold sm:col-span-2">Sección temática
                  <select value={setup.category} onChange={(e) => setSetup({ ...setup, category: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3">
                    <option value={COMPLETE_PPC}>PPC completo · todas las secciones</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold">Tipo de pregunta
                  <select value={setup.type} onChange={(e) => setSetup({ ...setup, type: e.target.value as Setup["type"] })} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3">
                    <option value="todas">Todos los tipos</option>
                    <option value="multiple_choice">Opción múltiple</option>
                    <option value="verdadero_falso">Verdadero / Falso</option>
                  </select>
                </label>
                <div className="space-y-3 pt-1 text-sm">
                  <label className="flex items-center gap-3"><input type="checkbox" checked={setup.random} onChange={(e) => setSetup({ ...setup, random: e.target.checked })} /> Orden aleatorio</label>
                  <label className="flex items-center gap-3"><input type="checkbox" checked={setup.timer} onChange={(e) => setSetup({ ...setup, timer: e.target.checked })} /> Contador de tiempo</label>
                </div>
              </div>
              <button onClick={start} disabled={!available} className="mt-7 w-full rounded-xl bg-amber-500 px-5 py-4 font-black uppercase tracking-widest text-slate-950 disabled:opacity-40">Comenzar · {Math.min(setup.count, available)} preguntas</button>
            </div>

            <aside className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <p className="text-xs font-black uppercase tracking-widest text-amber-300">Divisiones disponibles</p>
              <p className="mt-4 text-5xl font-black">{categories.length}</p>
              <p className="text-sm text-slate-400">categorías temáticas</p>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <p>• 296 preguntas de opción múltiple</p>
                <p>• 48 de verdadero/falso</p>
                <p>• Sin preguntas de desarrollo para mantener fluidez</p>
                <p>• Filtros por etapa, Estado Mayor, PMO, planeamiento inmediato, operaciones aéreas y más.</p>
              </div>
              <p className="mt-6 rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-400">La respuesta correcta no se revela hasta presionar <strong className="text-white">Verificar respuesta</strong>. Luego se muestra de inmediato, también en Modo Examen.</p>
            </aside>
          </section>
        </div>
      </main>
    );
  }

  if (screen === "stats") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-7 text-white sm:px-8">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => setScreen("home")} className="text-xs font-bold uppercase tracking-widest text-cyan-300">← Volver</button>
          <h1 className="mt-4 text-4xl font-black">Estadísticas de esta sesión</h1>
          <div className="mt-7 grid gap-4 sm:grid-cols-4">
            {[['Respondidas',stats.total],['Correctas',stats.correct],['Incorrectas',stats.wrong],['Porcentaje',`${stats.pct}%`]].map(([k,v]) => <div key={String(k)} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><p className="text-xs uppercase tracking-widest text-slate-400">{k}</p><p className="mt-2 text-3xl font-black">{v}</p></div>)}
          </div>
          <div className="mt-7 rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Rendimiento por categoría</h2>
            <div className="mt-5 space-y-4">
              {stats.byCategory.length ? stats.byCategory.map((row) => <div key={row.category}><div className="flex justify-between gap-4 text-sm"><span>{row.category}</span><strong>{row.pct}% · {row.total}</strong></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-500" style={{width:`${row.pct}%`}} /></div></div>) : <p className="text-slate-400">Todavía no hay respuestas registradas en esta sesión.</p>}
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-500/10 p-5"><p className="text-xs uppercase tracking-widest text-emerald-300">Categoría más fuerte</p><p className="mt-2 font-bold">{stats.strongest?.category ?? 'Sin datos'}</p></div>
            <div className="rounded-2xl bg-rose-500/10 p-5"><p className="text-xs uppercase tracking-widest text-rose-300">Categoría a reforzar</p><p className="mt-2 font-bold">{stats.weakest?.category ?? 'Sin datos'}</p></div>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "results") {
    const objective = runAnswers.filter((a) => a.correct !== null);
    const right = objective.filter((a) => a.correct).length;
    const pct = objective.length ? Math.round((right / objective.length) * 100) : 0;
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-7 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">Sesión finalizada</p>
          <p className="mt-5 text-7xl font-black">{pct}%</p>
          <p className="mt-3 text-slate-300">{right} correctas · {objective.length-right} incorrectas · {formatTime(totalSeconds)}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => setScreen("home")} className="rounded-xl bg-cyan-600 px-6 py-3 font-black uppercase tracking-widest">Nueva sesión</button>
            <button onClick={() => setScreen("stats")} className="rounded-xl border border-slate-500 px-6 py-3 font-black uppercase tracking-widest">Ver estadísticas</button>
          </div>
        </div>
      </main>
    );
  }

  if (!current) return null;
  const marked = session.marked.includes(current.id);
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4">
          <div><p className="text-xs font-black uppercase tracking-widest text-cyan-300">{setup.mode === 'examen' ? 'Modo Examen' : 'Modo Estudio'}</p><p className="mt-1 text-sm text-slate-400">Pregunta {index+1} de {queue.length}</p></div>
          <div className="flex items-center gap-5"><div className="text-right"><p className="text-xs uppercase text-slate-500">Tiempo pregunta</p><p className="font-mono text-xl font-black">{formatTime(questionSeconds)}</p></div><button onClick={() => finish()} className="rounded-lg border border-rose-500/50 px-3 py-2 text-xs font-bold uppercase text-rose-200">Finalizar</button></div>
        </header>

        <section className="mt-5 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">{current.categoria}</span>
            <span className="text-xs text-slate-500">PPC #{current.numero} · Seguridad {current.nivelSeguridad}</span>
          </div>
          <h1 className="mt-6 text-xl font-bold leading-8 sm:text-2xl">{current.pregunta}</h1>

          <div className="mt-6 space-y-3">
            {current.opciones.map((option) => {
              const showResult = verified;
              const isCorrectOption = option.id === current.respuestaCorrecta;
              const chosen = selected === option.id;
              const resultClass = showResult && isCorrectOption ? "border-emerald-400 bg-emerald-500/15" : showResult && chosen && !isCorrectOption ? "border-rose-400 bg-rose-500/15" : chosen ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-950 hover:border-slate-500";
              return <button key={option.id} onClick={() => !verified && setSelected(option.id)} disabled={verified} className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition ${resultClass}`}><strong className="text-cyan-300">{option.id})</strong><span>{option.texto}</span></button>;
            })}
          </div>

          {!verified && <button onClick={verify} disabled={!canVerify} className="mt-7 w-full rounded-xl bg-amber-500 px-5 py-4 font-black uppercase tracking-widest text-slate-950 disabled:opacity-40">Verificar respuesta</button>}

          {verified && (
            <div className={`mt-7 rounded-2xl border p-5 ${correct ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
              <p className="font-black uppercase tracking-widest">{correct ? 'Respuesta correcta' : 'Respuesta incorrecta'}</p>
              <p className="mt-3 text-slate-200">Correcta: {current.respuestaCorrecta}) {current.opciones.find((o) => o.id === current.respuestaCorrecta)?.texto}</p>
              <button
                type="button"
                onClick={() => setShowExplanation((value) => !value)}
                aria-expanded={showExplanation}
                className="mt-5 flex w-full items-center justify-between rounded-xl border border-cyan-400/30 bg-slate-950/50 px-4 py-3 text-left text-sm font-black uppercase tracking-widest text-cyan-200 transition hover:border-cyan-300/60"
              >
                <span>Justificación</span>
                <span aria-hidden="true" className="text-lg">{showExplanation ? "−" : "+"}</span>
              </button>

              {showExplanation && (
                <div className="mt-3 space-y-4 rounded-xl border border-cyan-400/20 bg-slate-950/70 p-4 text-sm">
                  <div className="space-y-4">
                    {current.fragmentosPpc?.length ? current.fragmentosPpc.map((fragment, fragmentIndex) => (
                      <p key={`${current.id}-fragment-${fragmentIndex}`} className="leading-7 text-slate-300">
                        {fragment.texto} <span className="font-semibold text-cyan-200">(PPC, pág. {fragment.pagina}{fragment.parrafo ? `, párr. ${fragment.parrafo}` : ""})</span>
                      </p>
                    )) : (
                      <p className="leading-7 text-amber-200">Esta respuesta todavía no tiene un fragmento directo validado del PPC.</p>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <label htmlFor={`correction-${current.id}`} className="text-xs font-black uppercase tracking-widest text-slate-300">
                      Informar una corrección
                    </label>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Indicá qué respuesta, fragmento o referencia debería revisarse. El número y el texto de la pregunta se adjuntan automáticamente.</p>
                    <textarea
                      id={`correction-${current.id}`}
                      value={correctionMessage}
                      onChange={(event) => {
                        setCorrectionMessage(event.target.value);
                        if (correctionStatus !== "idle") setCorrectionStatus("idle");
                      }}
                      rows={4}
                      maxLength={2000}
                      placeholder="Escribí aquí la corrección propuesta y, si la conocés, la página y el párrafo del PPC..."
                      className="mt-3 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={submitCorrection}
                        disabled={!correctionMessage.trim() || correctionStatus === "sending"}
                        className="rounded-lg border border-cyan-400/50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-200 disabled:opacity-40"
                      >
                        {correctionStatus === "sending" ? "Enviando..." : "Enviar corrección"}
                      </button>
                      {correctionStatus === "sent" && <span className="text-xs font-bold text-emerald-300">Corrección enviada. Gracias.</span>}
                      {correctionStatus === "error" && <span className="text-xs font-bold text-rose-300">No pudo enviarse. Verificá que la tabla de reportes esté creada en Supabase.</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={toggleMarked} className="rounded-lg border border-amber-400/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-200">{marked ? 'Quitar de repaso' : 'Marcar para repasar'}</button>
                <button onClick={() => next()} className="ml-auto rounded-lg bg-cyan-600 px-5 py-2 text-xs font-black uppercase tracking-widest">{index === queue.length-1 ? 'Ver resultado' : 'Siguiente pregunta'}</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
