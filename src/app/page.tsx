import Link from "next/link";
import { WORKSPACE_PROFILES } from "@/config/workspaces";

const cells = Object.values(WORKSPACE_PROFILES);

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[url('/images/zeus-inicio.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/60 to-slate-950/95" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-12">
        <header className="mx-auto w-full max-w-4xl rounded-3xl border border-white/15 bg-slate-950/42 p-6 text-center shadow-2xl backdrop-blur-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-300">Ejercicio académico</p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">EJERCICIO ZEUS</h1>
          <p className="mt-2 text-lg font-semibold uppercase tracking-[0.16em] text-slate-200 sm:text-2xl">
            Proceso de Planificación de Comando
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
            Acceso centralizado a las células de trabajo, herramientas de planeamiento y plataforma de estudio PPC.
          </p>
        </header>

        <section className="mt-auto pt-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cells.map((cell) => (
              <Link
                key={cell.code}
                href={`/acceso/${cell.code}`}
                className="group rounded-2xl border border-white/15 bg-slate-950/70 p-5 shadow-xl backdrop-blur-md transition hover:-translate-y-1 hover:border-cyan-300/60 hover:bg-slate-900/85"
              >
                <p className={`text-sm font-black uppercase tracking-widest ${cell.accentClass}`}>{cell.shortName}</p>
                <p className="mt-2 text-sm leading-5 text-slate-300">{cell.mission}</p>
                <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/70 group-hover:text-cyan-200">Ingresar a la célula →</p>
              </Link>
            ))}

            <Link
              href="/trivia-ppc"
              className="group rounded-2xl border border-amber-300/45 bg-gradient-to-br from-amber-500/25 to-slate-950/85 p-5 shadow-xl backdrop-blur-md transition hover:-translate-y-1 hover:border-amber-200"
            >
              <p className="text-sm font-black uppercase tracking-widest text-amber-200">Trivia PPC</p>
              <p className="mt-8 text-xs font-bold uppercase tracking-widest text-amber-100">Comenzar sesión →</p>
            </Link>
          </div>
          <p className="mt-5 text-center text-xs text-slate-400">El progreso de Trivia PPC se conserva únicamente durante la sesión abierta en cada navegador.</p>
        </section>
      </div>
    </main>
  );
}
