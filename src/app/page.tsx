import Link from "next/link";

const CELL_LINKS = [
  {
    code: "comandante",
    name: "Comandante del TON",
    area: "Conducción superior del Teatro de Operaciones Norte",
    href: "/espacio/comandante/1145cb883ee229596b3ffaf5992242a30c455ec59e13492fafe9bab062beeafd",
  },
  {
    code: "jem",
    name: "Jefe de Estado Mayor",
    area: "Coordinación y supervisión del Estado Mayor",
    href: "/espacio/jem/afa42254bd99c69afc7afc1587e39f9fd82ceae596cb3b407290f2f7c09ad380",
  },
  {
    code: "a1",
    name: "A1 · Personal",
    area: "Personal, efectivos, sanidad, bienestar y reemplazos",
    href: "/espacio/a1/d5943969aec685982d4ee1fd48467425eef821277fbe8bc2d1768eac57b73dd2",
  },
  {
    code: "a2",
    name: "A2 · Inteligencia",
    area: "Situación, inteligencia, vigilancia y reconocimiento",
    href: "/espacio/a2/a3915afde5cb62637e29f7f0328c9e0057cbc6c4ba21e642e7db4d2b9470cfbc",
  },
  {
    code: "a3",
    name: "A3 · Operaciones",
    area: "Planeamiento, conducción y supervisión de las operaciones",
    href: "/espacio/a3/eec8615ab41d0c67904cad642ee4e20d3cf66aacac6458868bfce1c516c282e1",
  },
  {
    code: "a4",
    name: "A4 · Logística",
    area: "Sostenimiento, abastecimiento, mantenimiento y transporte",
    href: "/espacio/a4/77127350d246f30d1ec83bff9b4f1e490593515090c3d16a5b99c002813ba611",
  },
  {
    code: "a5",
    name: "A5 · Comunicaciones",
    area: "Comunicaciones, enlaces y sistemas de información",
    href: "/espacio/a5/2108b0f130191ad29037c4e48ce5efc1f24ee0ed7cc75a365db7de62c95113c7",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/zeus-inicio.png')" }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-slate-950/55 to-slate-950/95" />

      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
        <header className="max-w-4xl rounded-3xl border border-white/15 bg-slate-950/65 p-5 shadow-2xl backdrop-blur-md sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.34em] text-amber-300">Teatro de Operaciones Norte</p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">Ejercicio ZEUS</h1>
          <p className="mt-2 text-base font-semibold uppercase tracking-[0.14em] text-slate-200 sm:text-2xl">
            Proceso de Planificación de Comando
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Acceso centralizado a las células del Estado Mayor, herramientas de planeamiento y plataforma de estudio PPC.
          </p>
        </header>

        <section className="mt-auto pt-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CELL_LINKS.map((cell) => (
              <Link
                key={cell.code}
                href={cell.href}
                className="group rounded-2xl border border-white/15 bg-slate-950/72 p-5 shadow-xl backdrop-blur-md transition hover:-translate-y-1 hover:border-cyan-300/70 hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <p className="text-sm font-black uppercase tracking-widest text-cyan-200">{cell.name}</p>
                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-300">{cell.area}</p>
                <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/70 group-hover:text-cyan-200">
                  Ingresar a edición →
                </p>
              </Link>
            ))}

            <Link
              href="/trivia-ppc"
              className="group rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-500/30 to-slate-950/90 p-5 shadow-xl backdrop-blur-md transition hover:-translate-y-1 hover:border-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <p className="text-sm font-black uppercase tracking-widest text-amber-200">Trivia PPC</p>
              <p className="mt-2 min-h-10 text-sm leading-5 text-slate-200">
                344 preguntas objetivas para estudio, examen aleatorio y estadísticas de sesión.
              </p>
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-amber-100">Comenzar sesión →</p>
            </Link>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-xs text-slate-400 backdrop-blur">
            Los accesos actuales son enlaces de edición. La administración individual de seguridad se incorporará en una etapa posterior.
          </div>
        </section>
      </div>
    </main>
  );
}
