import type { PanelId } from "@/components/MapEditor";

export type WorkspaceProfile = {
  code: string;
  shortName: string;
  mission: string;
  accentClass: string;
  allowedPanels: PanelId[];
};

const ALL_PANELS: PanelId[] = [
  "fuerzas",
  "referencia",
  "capas",
  "bases",
  "mascaras",
  "colores",
  "cartografia",
  "medicion",
  "visibilidad",
  "elementos",
  "personalizado",
  "desplegados",
  "inteligencia",
];

export const WORKSPACE_PROFILES: Record<string, WorkspaceProfile> = {
  comandante: {
    code: "comandante",
    shortName: "Comandante TON",
    mission: "Vista general del Teatro de Operaciones Norte.",
    accentClass: "text-amber-300",
    allowedPanels: ALL_PANELS,
  },
  jem: {
    code: "jem",
    shortName: "JEM TON",
    mission: "Seguimiento integral y coordinación del Estado Mayor.",
    accentClass: "text-violet-300",
    allowedPanels: ALL_PANELS,
  },
  a1: {
    code: "a1",
    shortName: "A1 – Personal",
    mission: "Espacio de situación de personal, sanidad y apoyo humano.",
    accentClass: "text-pink-300",
    allowedPanels: [
      "capas",
      "bases",
      "cartografia",
      "medicion",
      "visibilidad",
      "personalizado",
      "desplegados",
    ],
  },
  a2: {
    code: "a2",
    shortName: "A2 – Inteligencia",
    mission: "Amenazas, fuerzas enemigas, radares y defensa aérea.",
    accentClass: "text-red-300",
    allowedPanels: [
      "fuerzas",
      "referencia",
      "capas",
      "bases",
      "mascaras",
      "colores",
      "cartografia",
      "medicion",
      "visibilidad",
      "elementos",
      "personalizado",
      "desplegados",
      "inteligencia",
    ],
  },
  a3: {
    code: "a3",
    shortName: "A3 – Operaciones",
    mission: "Planeamiento y conducción de las operaciones aéreas.",
    accentClass: "text-cyan-300",
    allowedPanels: ALL_PANELS,
  },
  a4: {
    code: "a4",
    shortName: "A4 – Logística",
    mission: "Bases, rutas, material, abastecimiento y sostenimiento.",
    accentClass: "text-emerald-300",
    allowedPanels: [
      "capas",
      "bases",
      "cartografia",
      "medicion",
      "visibilidad",
      "personalizado",
      "desplegados",
    ],
  },
  a5: {
    code: "a5",
    shortName: "A5 – Comunicaciones",
    mission: "Nodos, enlaces, cobertura y medios de comunicaciones.",
    accentClass: "text-sky-300",
    allowedPanels: [
      "capas",
      "bases",
      "mascaras",
      "colores",
      "cartografia",
      "medicion",
      "visibilidad",
      "personalizado",
      "desplegados",
    ],
  },
};

export function getWorkspaceProfile(code: string): WorkspaceProfile {
  return WORKSPACE_PROFILES[code] ?? {
    code,
    shortName: code.toUpperCase(),
    mission: "Espacio de trabajo del Ejercicio ZEUS.",
    accentClass: "text-cyan-300",
    allowedPanels: ALL_PANELS,
  };
}
