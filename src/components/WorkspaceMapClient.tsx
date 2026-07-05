"use client";

import { useEffect, useState } from "react";
import { getWorkspaceProfile } from "@/config/workspaces";
import MapEditor, {
  type ElementoOperacional,
  type ZeusMapSnapshot,
  type ZeusMapWorkspaceState,
} from "@/components/MapEditor";

type WorkspaceAccess = "edit" | "view";

type WorkspaceInformation = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type DatabaseMapState = {
  map_center?: {
    longitude?: number;
    latitude?: number;
  } | null;
  zoom?: number | null;
  bearing?: number | null;
  pitch?: number | null;
  visible_layers?: Record<string, boolean> | null;
  panel_order?: string[] | null;
  settings?: Record<string, unknown> | null;
};

type DatabaseMapElement = {
  id: string;
  element_type: string;
  name: string;
  faction: "propio" | "enemigo" | null;
  longitude: number | null;
  latitude: number | null;
  properties: Partial<ElementoOperacional> | null;
  is_visible: boolean;
  intelligence_status?: ElementoOperacional["intelligenceStatus"] | null;
  confidence_level?: ElementoOperacional["confidenceLevel"] | null;
  information_date?: string | null;
  source_description?: string | null;
  intelligence_notes?: string | null;
  shared_with_commander?: boolean | null;
  shared_with_jem?: boolean | null;
  shared_with_other_cells?: boolean | null;
  classification?: ElementoOperacional["classification"] | null;
};

type LoadResponse = {
  ok: boolean;
  error?: string;
  access?: WorkspaceAccess;
  workspace?: WorkspaceInformation;
  mapState?: DatabaseMapState | null;
  elements?: DatabaseMapElement[];
};

type WorkspaceMapClientProps = {
  workspaceCode: string;
  token: string;
  access: WorkspaceAccess;
};

function convertirEstado(
  estado: DatabaseMapState | null | undefined,
): ZeusMapWorkspaceState | null {
  if (!estado) return null;

  return {
    mapCenter:
      estado.map_center &&
      typeof estado.map_center.longitude === "number" &&
      typeof estado.map_center.latitude === "number"
        ? {
            longitude: estado.map_center.longitude,
            latitude: estado.map_center.latitude,
          }
        : undefined,
    zoom: estado.zoom ?? undefined,
    bearing: estado.bearing ?? undefined,
    pitch: estado.pitch ?? undefined,
    visibleLayers: estado.visible_layers ?? {},
    panelOrder:
      (estado.panel_order as ZeusMapWorkspaceState["panelOrder"]) ?? [],
    settings: estado.settings ?? {},
  };
}

function convertirElementos(
  elementos: DatabaseMapElement[] | undefined,
): ElementoOperacional[] {
  return (elementos ?? []).map((fila) => ({
    ...(fila.properties ?? {}),
    // Conserva el identificador original del elemento del mapa. La columna
    // id de Supabase es UUID y se usa solo como identificador de la fila.
    id: String(fila.properties?.id ?? fila.id),
    visible: fila.is_visible,
    tipo: fila.element_type as ElementoOperacional["tipo"],
    nombre: fila.name,
    bando: (fila.faction ?? "propio") as ElementoOperacional["bando"],
    longitude: fila.longitude ?? Number(fila.properties?.longitude ?? -64.5),
    latitude: fila.latitude ?? Number(fila.properties?.latitude ?? -35.5),
    baseOrigen: String(fila.properties?.baseOrigen ?? "Ubicación guardada"),
    radioCombateKm: Number(fila.properties?.radioCombateKm ?? 0),
    alcanceKm: Number(fila.properties?.alcanceKm ?? 0),
    mostrarAnillo: Boolean(fila.properties?.mostrarAnillo ?? false),
    color: String(fila.properties?.color ?? "#ef4444"),
    intelligenceStatus: fila.intelligence_status ?? fila.properties?.intelligenceStatus ?? "pendiente",
    confidenceLevel: fila.confidence_level ?? fila.properties?.confidenceLevel ?? "media",
    informationDate: fila.information_date ?? fila.properties?.informationDate,
    sourceDescription: fila.source_description ?? fila.properties?.sourceDescription,
    intelligenceNotes: fila.intelligence_notes ?? fila.properties?.intelligenceNotes,
    sharedWithCommander: fila.shared_with_commander ?? fila.properties?.sharedWithCommander ?? false,
    sharedWithJem: fila.shared_with_jem ?? fila.properties?.sharedWithJem ?? false,
    sharedWithOtherCells: fila.shared_with_other_cells ?? fila.properties?.sharedWithOtherCells ?? false,
    classification: fila.classification ?? fila.properties?.classification ?? "uso_interno",
  }));
}

export default function WorkspaceMapClient({
  workspaceCode,
  token,
  access,
}: WorkspaceMapClientProps) {
  const workspaceProfile = getWorkspaceProfile(workspaceCode);
  const [status, setStatus] = useState("Validando enlace...");
  const [workspace, setWorkspace] =
    useState<WorkspaceInformation | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [initialState, setInitialState] =
    useState<ZeusMapWorkspaceState | null>(null);
  const [initialElements, setInitialElements] =
    useState<ElementoOperacional[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function validateWorkspace() {
      try {
        const response = await fetch(
          `/api/workspaces/${workspaceCode}/load`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token, access }),
          },
        );

        const result = (await response.json()) as LoadResponse;

        if (cancelled) return;

        if (!response.ok || !result.ok || !result.workspace) {
          setAuthorized(false);
          setStatus(
            result.error ?? "No se pudo abrir el espacio de trabajo.",
          );
          return;
        }

        setWorkspace(result.workspace);
        setInitialState(convertirEstado(result.mapState));
        setInitialElements(convertirElementos(result.elements));
        setAuthorized(true);
        setStatus("Espacio conectado");
      } catch (error) {
        console.error("Error validando el espacio:", error);

        if (!cancelled) {
          setAuthorized(false);
          setStatus("No se pudo conectar con el servidor.");
        }
      }
    }

    void validateWorkspace();

    return () => {
      cancelled = true;
    };
  }, [workspaceCode, token, access]);

  async function guardar(snapshot: ZeusMapSnapshot) {
    const response = await fetch(
      `/api/workspaces/${workspaceCode}/save`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          mapState: snapshot.mapState,
          elements: snapshot.elements,
        }),
      },
    );

    const result = (await response.json()) as {
      ok: boolean;
      error?: string;
    };

    if (!response.ok || !result.ok) {
      throw new Error(result.error ?? "No se pudo guardar el mapa.");
    }
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <section className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-cyan-300">
            EJERCICIO ZEUS – TO NORTE
          </p>
          <h1 className="mb-5 text-3xl font-bold">
            Espacio: {workspaceCode}
          </h1>
          <div
            className={`rounded-lg p-4 ${
              status === "Validando enlace..."
                ? "bg-slate-800"
                : "border border-red-700 bg-red-950/60"
            }`}
          >
            <p className="font-semibold">{status}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-4 py-3 text-white">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${workspaceProfile.accentClass}`}>
            EJERCICIO ZEUS – TO NORTE
          </p>
          <h1 className="text-lg font-bold">
            {workspace?.name ?? workspaceCode}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-emerald-900 px-3 py-1 font-semibold text-emerald-200">
            {status}
          </span>
          <span className="rounded-full bg-slate-700 px-3 py-1">
            {access === "edit" ? "Modo edición" : "Solo lectura"}
          </span>
        </div>
      </header>

      <MapEditor
        initialState={initialState}
        initialElements={initialElements}
        readOnly={access === "view"}
        onSave={access === "edit" ? guardar : undefined}
        allowedPanels={workspaceProfile.allowedPanels}
        workspaceLabel={workspaceProfile.shortName}
        workspaceDescription={workspaceProfile.mission}
        workspaceCode={workspaceCode}
      />
    </main>
  );
}
