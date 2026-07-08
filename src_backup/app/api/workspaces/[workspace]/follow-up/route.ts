import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  hashWorkspaceToken,
  safeCompareHashes,
  type WorkspaceAccess,
} from "@/lib/workspace-token";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ workspace: string }>;
};

type WorkspaceRow = {
  id: string;
  code: string;
  name: string;
  workspace_type: string;
  edit_token_hash: string;
  view_token_hash: string;
  is_active: boolean;
};

type MapElementRow = {
  id: string;
  workspace_id: string;
  element_type: string;
  name: string;
  faction: string | null;
  longitude: number | null;
  latitude: number | null;
  properties: Record<string, unknown> | null;
  is_visible: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

const CELL_CODES = ["a1", "a2", "a3", "a4", "a5"] as const;

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { workspace } = await context.params;
    const body = (await request.json()) as {
      token?: string;
      access?: WorkspaceAccess;
    };

    if (workspace !== "comandante" && workspace !== "jem") {
      return NextResponse.json(
        { ok: false, error: "Seguimiento disponible solo para Comandante y JEM." },
        { status: 403 },
      );
    }

    const token = body.token?.trim();
    const access = body.access;

    if (!token || (access !== "edit" && access !== "view")) {
      return NextResponse.json(
        { ok: false, error: "Faltan el token o el tipo de acceso." },
        { status: 400 },
      );
    }

    const { data: viewer, error: viewerError } = await supabaseAdmin
      .from("workspaces")
      .select(
        "id, code, name, workspace_type, edit_token_hash, view_token_hash, is_active",
      )
      .eq("code", workspace)
      .maybeSingle<WorkspaceRow>();

    if (viewerError) {
      console.error("Error validando seguimiento:", viewerError);
      return NextResponse.json(
        { ok: false, error: "No se pudo validar el espacio." },
        { status: 500 },
      );
    }

    if (!viewer || !viewer.is_active) {
      return NextResponse.json(
        { ok: false, error: "El espacio no existe o está desactivado." },
        { status: 404 },
      );
    }

    const storedHash =
      access === "edit" ? viewer.edit_token_hash : viewer.view_token_hash;

    if (!safeCompareHashes(storedHash, hashWorkspaceToken(token))) {
      return NextResponse.json(
        { ok: false, error: "El enlace no es válido." },
        { status: 403 },
      );
    }

    const { data: cells, error: cellsError } = await supabaseAdmin
      .from("workspaces")
      .select("id, code, name, workspace_type, is_active")
      .in("code", [...CELL_CODES])
      .eq("is_active", true);

    if (cellsError) {
      console.error("Error cargando células:", cellsError);
      return NextResponse.json(
        { ok: false, error: "No se pudieron cargar las células." },
        { status: 500 },
      );
    }

    const ids = (cells ?? []).map((cell) => cell.id);
    const codeById = Object.fromEntries(
      (cells ?? []).map((cell) => [cell.id, cell.code]),
    );

    const [{ data: states, error: statesError }, { data: rows, error: rowsError }] =
      await Promise.all([
        supabaseAdmin
          .from("map_states")
          .select("workspace_id, version, updated_at")
          .in("workspace_id", ids)
          .eq("scenario_name", "Escenario principal"),
        supabaseAdmin
          .from("map_elements")
          .select("*")
          .in("workspace_id", ids)
          .order("created_at", { ascending: true }),
      ]);

    if (statesError || rowsError) {
      console.error("Error cargando seguimiento:", statesError ?? rowsError);
      return NextResponse.json(
        { ok: false, error: "No se pudo cargar el seguimiento." },
        { status: 500 },
      );
    }

    const stateByWorkspace = Object.fromEntries(
      (states ?? []).map((state) => [state.workspace_id, state]),
    );

    const elements = ((rows ?? []) as MapElementRow[]).map((row) => {
      const originCode = codeById[row.workspace_id] ?? "desconocido";
      const originalId = String(row.properties?.id ?? row.id);

      return {
        ...row,
        origin_workspace_code: originCode,
        is_shared_external: true,
        properties: {
          ...(row.properties ?? {}),
          id: `follow-${originCode}-${originalId}`,
          originWorkspaceCode: originCode,
          sharedExternal: true,
        },
      };
    });

    const summaries = (cells ?? []).map((cell) => {
      const state = stateByWorkspace[cell.id];
      const cellElements = elements.filter(
        (element) => element.workspace_id === cell.id,
      );
      const latestElementUpdate = cellElements
        .map((element) => element.updated_at ?? element.created_at ?? null)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1);

      const lastSavedAt = [state?.updated_at, latestElementUpdate]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

      return {
        code: cell.code,
        name: cell.name,
        version: state?.version ?? 0,
        elementCount: cellElements.length,
        lastSavedAt,
      };
    });

    return NextResponse.json({
      ok: true,
      summaries,
      elements,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error inesperado en follow-up:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
