import type { PanelId } from "@/components/MapEditor";

export type WorkspaceProfile = {
  code: string;
  shortName: string;
  mission: string;
  accentClass: string;
  allowedPanels: PanelId[];
};

const BASE_PANELS: PanelId[] = [
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
];

const ALL_PANELS: PanelId[] = [
  ...BASE_PANELS,
  "inteligencia",
  "operaciones",
  "personal",
  "logistica",
  "comunicaciones",
  "compartir",
];

export const WORKSPACE_PROFILES: Record<string, WorkspaceProfile> = {
  comandante: {
    code: "comandante",
    shortName: "Comandante TON",
    mission: "Panorama consolidado de los elementos compartidos por las células.",
    accentClass: "text-amber-300",
    allowedPanels: ALL_PANELS,
  },
  jem: {
    code: "jem",
    shortName: "JEM TON",
    mission: "Seguimiento integral y consolidación del Estado Mayor.",
    accentClass: "text-violet-300",
    allowedPanels: ALL_PANELS,
  },
  a1: {
    code: "a1",
    shortName: "A1 – Personal",
    mission: "Situación de personal, sanidad, reemplazos y evacuación.",
    accentClass: "text-pink-300",
    allowedPanels: [
      "capas",
      "bases",
      "cartografia",
      "medicion",
      "visibilidad",
      "personalizado",
      "desplegados",
      "personal",
      "compartir",
    ],
  },
  a2: {
    code: "a2",
    shortName: "A2 – Inteligencia",
    mission: "Amenazas, fuerzas enemigas, fuentes, confianza y validación.",
    accentClass: "text-red-300",
    allowedPanels: [
      ...BASE_PANELS,
      "inteligencia",
      "compartir",
    ],
  },
  a3: {
    code: "a3",
    shortName: "A3 – Operaciones",
    mission: "Planeamiento, conducción, misiones, tareas, rutas, radios y REV.",
    accentClass: "text-cyan-300",
    allowedPanels: [
      ...BASE_PANELS,
      "operaciones",
      "compartir",
    ],
  },
  a4: {
    code: "a4",
    shortName: "A4 – Logística",
    mission: "Combustible, armamento, material, transporte y reabastecimiento.",
    accentClass: "text-emerald-300",
    allowedPanels: [
      "capas",
      "bases",
      "cartografia",
      "medicion",
      "visibilidad",
      "personalizado",
      "desplegados",
      "logistica",
      "compartir",
    ],
  },
  a5: {
    code: "a5",
    shortName: "A5 – Comunicaciones",
    mission: "Nodos, redes, enlaces, cobertura, cifrado y redundancia.",
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
      "comunicaciones",
      "compartir",
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
