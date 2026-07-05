import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  hashWorkspaceToken,
  safeCompareHashes,
} from "@/lib/workspace-token";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ workspace: string }>;
};

type ElementoRecibido = {
  id: string;
  visible: boolean;
  tipo: string;
  nombre: string;
  bando: string;
  longitude: number;
  latitude: number;
  [key: string]: unknown;
};

type SaveRequestBody = {
  token?: string;
  mapState?: {
    scenarioName?: string;
    mapCenter?: { longitude: number; latitude: number };
    zoom?: number;
    bearing?: number;
    pitch?: number;
    visibleLayers?: Record<string, boolean>;
    panelOrder?: string[];
    settings?: Record<string, unknown>;
  };
  elements?: ElementoRecibido[];
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { workspace } = await context.params;
    const body = (await request.json()) as SaveRequestBody;
    const token = body.token?.trim();

    if (!token || !body.mapState || !Array.isArray(body.elements)) {
      return NextResponse.json(
        { ok: false, error: "Faltan el token, el estado o los elementos." },
        { status: 400 },
      );
    }

    const { data: workspaceData, error: workspaceError } =
      await supabaseAdmin
        .from("workspaces")
        .select("id, edit_token_hash, is_active")
        .eq("code", workspace)
        .maybeSingle();

    if (workspaceError) {
      console.error(workspaceError);
      return NextResponse.json(
        { ok: false, error: "No se pudo consultar el espacio." },
        { status: 500 },
      );
    }

    if (!workspaceData || !workspaceData.is_active) {
      return NextResponse.json(
        { ok: false, error: "El espacio no existe o está desactivado." },
        { status: 404 },
      );
    }

    if (
      !safeCompareHashes(
        workspaceData.edit_token_hash,
        hashWorkspaceToken(token),
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "El enlace de edición no es válido." },
        { status: 403 },
      );
    }

    const scenarioName =
      body.mapState.scenarioName?.trim() || "Escenario principal";

    const { data: currentState } = await supabaseAdmin
      .from("map_states")
      .select("version")
      .eq("workspace_id", workspaceData.id)
      .eq("scenario_name", scenarioName)
      .maybeSingle();

    const nextVersion = (currentState?.version ?? 0) + 1;

    const { error: stateError } = await supabaseAdmin
      .from("map_states")
      .upsert(
        {
          workspace_id: workspaceData.id,
          scenario_name: scenarioName,
          map_center: body.mapState.mapCenter ?? {
            longitude: -64.5,
            latitude: -32,
          },
          zoom: body.mapState.zoom ?? 4,
          bearing: body.mapState.bearing ?? 0,
          pitch: body.mapState.pitch ?? 0,
          visible_layers: body.mapState.visibleLayers ?? {},
          panel_order: body.mapState.panelOrder ?? [],
          settings: body.mapState.settings ?? {},
          version: nextVersion,
        },
        { onConflict: "workspace_id,scenario_name" },
      );

    if (stateError) {
      console.error("Error guardando estado:", stateError);
      return NextResponse.json(
        { ok: false, error: "No se pudo guardar el estado del mapa." },
        { status: 500 },
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("map_elements")
      .delete()
      .eq("workspace_id", workspaceData.id);

    if (deleteError) {
      console.error("Error eliminando elementos anteriores:", deleteError);
      return NextResponse.json(
        { ok: false, error: "No se pudieron actualizar los elementos." },
        { status: 500 },
      );
    }

    if (body.elements.length > 0) {
      const filas = body.elements.map((elemento) => ({
        // No se envía elemento.id a la columna id: map_elements.id es UUID.
        // Supabase genera el UUID y el identificador propio del mapa queda
        // preservado dentro de properties.id.
        workspace_id: workspaceData.id,
        element_type: elemento.tipo,
        name: elemento.nombre,
        faction: elemento.bando,
        category: null,
        longitude: elemento.longitude,
        latitude: elemento.latitude,
        geometry: null,
        properties: elemento,
        source_type:
          elemento.fuenteDistancia === "orden"
            ? "orden"
            : elemento.fuenteDistancia === "externa"
              ? "externa"
              : "usuario",
        source_reference:
          typeof elemento.referenciaDistancia === "string"
            ? elemento.referenciaDistancia
            : null,
        source_color:
          typeof elemento.color === "string" ? elemento.color : null,
        is_visible: elemento.visible !== false,
        intelligence_status:
          typeof elemento.intelligenceStatus === "string"
            ? elemento.intelligenceStatus
            : "pendiente",
        confidence_level:
          typeof elemento.confidenceLevel === "string"
            ? elemento.confidenceLevel
            : "media",
        information_date:
          typeof elemento.informationDate === "string" && elemento.informationDate
            ? elemento.informationDate
            : null,
        source_description:
          typeof elemento.sourceDescription === "string"
            ? elemento.sourceDescription
            : null,
        intelligence_notes:
          typeof elemento.intelligenceNotes === "string"
            ? elemento.intelligenceNotes
            : null,
        shared_with_commander:
          elemento.classification !== "restringido" &&
          elemento.sharedWithCommander === true,
        shared_with_jem:
          elemento.classification !== "restringido" &&
          elemento.sharedWithJem === true,
        shared_with_other_cells:
          elemento.classification !== "restringido" &&
          elemento.sharedWithOtherCells === true,
        classification:
          typeof elemento.classification === "string"
            ? elemento.classification
            : "uso_interno",
      }));

      const { error: insertError } = await supabaseAdmin
        .from("map_elements")
        .insert(filas);

      if (insertError) {
        console.error("Error insertando elementos:", insertError);
        return NextResponse.json(
          {
            ok: false,
            error: `No se pudieron guardar los elementos: ${insertError.message}`,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Mapa guardado correctamente.",
      version: nextVersion,
      elementCount: body.elements.length,
    });
  } catch (error) {
    console.error("Error inesperado en save:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
