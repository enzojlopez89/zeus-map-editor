"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import rawQuestions from "@/data/trivia-orientacion-as.json";
import type { SessionAnswer, TriviaQuestion } from "./types";

type OrientationQuestion = TriviaQuestion & {
  idBanco?: string;
  temasOrientacionAs?: string[];
  categoriaOrientacionAs?: string;
};

type ExamHistory = {
  date: string;
  score: number;
  correct: number;
  total: number;
  seconds: number;
};

const QUESTIONS = (rawQuestions as OrientationQuestion[]).filter((q) => q.activa && q.tipo !== "desarrollo");
const SESSION_KEY = "zeus-trivia-orientacion-as-v1";

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

export default function OrientationAsTriviaApp() {
  const [screen, setScreen] = useState<"home" | "run" | "results">("home");
  const [count, setCount] = useState(20);
  const [random, setRandom] = useState(true);
  const [timer, setTimer] = useState(true);
  const [queue, setQueue] = useState<OrientationQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState("");
  const [correctionStatus, setCorrectionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [isErrorReview, setIsErrorReview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try { setHistory(JSON.parse(saved) as ExamHistory[]); } catch { /* nueva sesión */ }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (screen !== "run" || !timer) return;
    timerRef.current = setInterval(() => {
      setQuestionSeconds((v) => v + 1);
      setTotalSeconds((v) => v + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, timer, index]);

  const current = queue[index];
  const correct = current && selected ? selected === current.respuestaCorrecta : null;
  const countOptions = useMemo(() => [10, 20, 30, 50, 100, QUESTIONS.length], []);

  function start() {
    const prepared = (random ? shuffle(QUESTIONS) : [...QUESTIONS]).slice(0, Math.min(count, QUESTIONS.length));
    setQueue(prepared);
    setIndex(0);
    setSelected(null);
    setVerified(false);
    setAnswers([]);
    setQuestionSeconds(0);
    setTotalSeconds(0);
    setShowExplanation(false);
    setCorrectionMessage("");
    setCorrectionStatus("idle");
    setIsErrorReview(false);
    setScreen("run");
  }

  function startErrorReview() {
    const wrongIds = new Set(answers.filter((answer) => answer.correct === false).map((answer) => answer.questionId));
    const wrongQueue = queue.filter((question) => wrongIds.has(question.id));
    if (!wrongQueue.length) return;

    // Conserva exactamente el orden de las preguntas de la ronda anterior y el orden original de las opciones.
    setQueue(wrongQueue);
    setIndex(0);
    setSelected(null);
    setVerified(false);
    setAnswers([]);
    setQuestionSeconds(0);
    setTotalSeconds(0);
    setShowExplanation(false);
    setCorrectionMessage("");
    setCorrectionStatus("idle");
    setIsErrorReview(true);
    setScreen("run");
  }

  function verify() {
    if (!current || !selected || verified) return;
    setAnswers((prev) => [...prev, {
      questionId: current.id,
      selectedOptionId: selected,
      correct,
      elapsedSeconds: questionSeconds,
      answeredAt: new Date().toISOString(),
    }]);
    setVerified(true);
  }

  function finish(finalAnswers = answers) {
    const objective = finalAnswers.filter((a) => a.correct !== null);
    const correctCount = objective.filter((a) => a.correct).length;
    const score = objective.length ? Math.round((correctCount / objective.length) * 100) : 0;
    setAnswers(finalAnswers);
    if (!isErrorReview) {
      setHistory((prev) => [...prev, { date: new Date().toISOString(), score, correct: correctCount, total: objective.length, seconds: totalSeconds }]);
    }
    setScreen("results");
  }

  function next() {
    if (!current || !verified) return;
    if (index >= queue.length - 1) {
      finish(answers);
      return;
    }
    setIndex((v) => v + 1);
    setSelected(null);
    setVerified(false);
    setQuestionSeconds(0);
    setShowExplanation(false);
    setCorrectionMessage("");
    setCorrectionStatus("idle");
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
          message: `[Orientación AS] ${correctionMessage.trim()}`,
        }),
      });
      if (!response.ok) throw new Error("No se pudo enviar el reporte.");
      setCorrectionStatus("sent");
      setCorrectionMessage("");
    } catch {
      setCorrectionStatus("error");
    }
  }

  if (screen === "home") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-7 text-white sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/trivia-ppc" className="text-xs font-bold uppercase tracking-widest text-cyan-300">← Volver a Trivia PPC</Link>
          <div className="mt-5 rounded-3xl border border-amber-300/35 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 p-7 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">PPC · examen 2026</p>
            <h1 className="mt-3 text-3xl font-black sm:text-5xl">Modo examen orientación del AS.</h1>
            <p className="mt-4 max-w-3xl leading-7 text-slate-300">Banco específico de {QUESTIONS.length} preguntas tomadas de los exámenes de referencia y relacionadas con los temas orientados por el asesor.</p>
            <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
              Las opciones conservan la respuesta verificada del banco. Se corrigieron únicamente arrastres editoriales detectados en las preguntas PPC 98, 105 y 108; no se cambió la letra correcta de ninguna de las 125 preguntas.
            </div>
          </div>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-black">Configurar examen</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold">Cantidad de preguntas
                  <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3">
                    {countOptions.map((n) => <option key={n} value={n}>{n === QUESTIONS.length ? `Todas (${n})` : n}</option>)}
                  </select>
                </label>
                <div className="space-y-4 pt-1 text-sm">
                  <label className="flex items-center gap-3"><input type="checkbox" checked={random} onChange={(e) => setRandom(e.target.checked)} /> Orden aleatorio</label>
                  <label className="flex items-center gap-3"><input type="checkbox" checked={timer} onChange={(e) => setTimer(e.target.checked)} /> Contador de tiempo</label>
                </div>
              </div>
              <button onClick={start} className="mt-7 w-full rounded-xl bg-amber-500 px-5 py-4 font-black uppercase tracking-widest text-slate-950">Comenzar examen · {Math.min(count, QUESTIONS.length)} preguntas</button>
            </div>

            <aside className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Cobertura</p>
              <p className="mt-4 text-5xl font-black">{QUESTIONS.length}</p>
              <p className="text-sm text-slate-400">preguntas orientadas</p>
              <p className="mt-5 text-sm leading-6 text-slate-300">Incluye EM, PMO/PMF, Sorpresa, Análisis de la Misión, Orientación, Apreciación Inicial, CCEE, Cálculo del Esfuerzo, Confrontación, Libertad de Acción y Documentos, entre otros.</p>
              {history.length > 0 && <p className="mt-5 rounded-xl bg-slate-950 p-4 text-xs text-slate-400">Último examen: <strong className="text-white">{history[history.length - 1].score}%</strong></p>}
            </aside>
          </section>
        </div>
      </main>
    );
  }

  if (screen === "results") {
    const objective = answers.filter((a) => a.correct !== null);
    const right = objective.filter((a) => a.correct).length;
    const pct = objective.length ? Math.round((right / objective.length) * 100) : 0;
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-7 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">{isErrorReview ? "Orientación del AS. · repaso finalizado" : "Orientación del AS. · examen finalizado"}</p>
          <p className="mt-5 text-7xl font-black">{pct}%</p>
          <p className="mt-3 text-slate-300">{right} correctas · {objective.length - right} incorrectas · {formatTime(totalSeconds)}</p>

          {objective.length - right > 0 && (
            <div className="mt-7 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-5 text-left">
              <p className="text-xs font-black uppercase tracking-widest text-amber-300">Repaso de errores</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Volvé a resolver únicamente las {objective.length - right} preguntas que respondiste mal en esta ronda. Se mantiene el mismo orden de preguntas y el mismo orden de opciones.</p>
              <button onClick={startErrorReview} className="mt-4 w-full rounded-xl bg-amber-500 px-5 py-3 font-black uppercase tracking-widest text-slate-950">Repasar las incorrectas</button>
            </div>
          )}

          {isErrorReview && objective.length > 0 && objective.length - right === 0 && (
            <div className="mt-7 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-5">
              <p className="font-black uppercase tracking-widest text-emerald-300">Repaso completado</p>
              <p className="mt-2 text-sm text-slate-300">No quedan preguntas incorrectas de la ronda anterior.</p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => setScreen("home")} className="rounded-xl bg-cyan-600 px-6 py-3 font-black uppercase tracking-widest">Nuevo examen</button>
            <Link href="/trivia-ppc" className="rounded-xl border border-slate-500 px-6 py-3 font-black uppercase tracking-widest">Trivia PPC</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!current) return null;
  const tema = current.categoriaOrientacionAs ?? current.temasOrientacionAs?.[0] ?? current.categoria;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-300">{isErrorReview ? "Repaso de errores · orientación del AS." : "Modo examen orientación del AS."}</p>
            <p className="mt-1 text-sm text-slate-400">Pregunta {index + 1} de {queue.length}</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right"><p className="text-xs uppercase text-slate-500">Tiempo pregunta</p><p className="font-mono text-xl font-black">{formatTime(questionSeconds)}</p></div>
            <button onClick={() => finish()} className="rounded-lg border border-rose-500/50 px-3 py-2 text-xs font-bold uppercase text-rose-200">Finalizar</button>
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200">{tema}</span>
            <span className="text-xs text-slate-500">PPC #{current.numero} · Banco orientado</span>
          </div>
          <h1 className="mt-6 text-xl font-bold leading-8 sm:text-2xl">{current.pregunta}</h1>

          <div className="mt-6 space-y-3">
            {current.opciones.map((option) => {
              const isCorrectOption = option.id === current.respuestaCorrecta;
              const chosen = selected === option.id;
              const resultClass = verified && isCorrectOption ? "border-emerald-400 bg-emerald-500/15" : verified && chosen && !isCorrectOption ? "border-rose-400 bg-rose-500/15" : chosen ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-950 hover:border-slate-500";
              return <button key={option.id} onClick={() => !verified && setSelected(option.id)} disabled={verified} className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition ${resultClass}`}><strong className="text-cyan-300">{option.id})</strong><span>{option.texto}</span></button>;
            })}
          </div>

          {!verified && <button onClick={verify} disabled={!selected} className="mt-7 w-full rounded-xl bg-amber-500 px-5 py-4 font-black uppercase tracking-widest text-slate-950 disabled:opacity-40">Verificar respuesta</button>}

          {verified && (
            <div className={`mt-7 rounded-2xl border p-5 ${correct ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}>
              <p className="font-black uppercase tracking-widest">{correct ? "Respuesta correcta" : "Respuesta incorrecta"}</p>
              <p className="mt-3 text-slate-200">Correcta: {current.respuestaCorrecta}) {current.opciones.find((o) => o.id === current.respuestaCorrecta)?.texto}</p>

              <button type="button" onClick={() => setShowExplanation((v) => !v)} aria-expanded={showExplanation} className="mt-5 flex w-full items-center justify-between rounded-xl border border-cyan-400/30 bg-slate-950/50 px-4 py-3 text-left text-sm font-black uppercase tracking-widest text-cyan-200">
                <span>Justificación</span><span className="text-lg">{showExplanation ? "−" : "+"}</span>
              </button>

              {showExplanation && (
                <div className="mt-3 space-y-4 rounded-xl border border-cyan-400/20 bg-slate-950/70 p-4 text-sm">
                  {current.fragmentosPpc?.length ? current.fragmentosPpc.map((fragment, i) => (
                    <p key={`${current.id}-${i}`} className="leading-7 text-slate-300">{fragment.texto} <span className="font-semibold text-cyan-200">(PPC, pág. {fragment.pagina}{fragment.parrafo ? `, párr. ${fragment.parrafo}` : ""})</span></p>
                  )) : <p className="leading-7 text-amber-200">Esta pregunta todavía no tiene un fragmento directo validado del PPC.</p>}

                  <div className="border-t border-white/10 pt-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-300">Informar una corrección</label>
                    <textarea value={correctionMessage} onChange={(e) => { setCorrectionMessage(e.target.value); if (correctionStatus !== "idle") setCorrectionStatus("idle"); }} rows={4} maxLength={2000} placeholder="Indicar la corrección propuesta..." className="mt-3 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button onClick={submitCorrection} disabled={!correctionMessage.trim() || correctionStatus === "sending"} className="rounded-lg border border-cyan-400/50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-200 disabled:opacity-40">{correctionStatus === "sending" ? "Enviando..." : "Enviar corrección"}</button>
                      {correctionStatus === "sent" && <span className="text-xs font-bold text-emerald-300">Corrección enviada.</span>}
                      {correctionStatus === "error" && <span className="text-xs font-bold text-rose-300">No pudo enviarse.</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button onClick={next} className="rounded-lg bg-cyan-600 px-5 py-2 text-xs font-black uppercase tracking-widest">{index === queue.length - 1 ? "Ver resultado" : "Siguiente pregunta"}</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
