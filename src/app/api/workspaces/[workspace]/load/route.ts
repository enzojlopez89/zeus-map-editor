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
  classification?: string | null;
  shared_with_commander?: boolean | null;
  shared_with_jem?: boolean | null;
  [key: string]: unknown;
};

function isRestricted(row: MapElementRow) {
  const classification =
    row.classification ?? row.properties?.classification ?? "uso_interno";
  return classification === "restringido";
}

function isSharedFor(row: MapElementRow, workspace: string) {
  if (isRestricted(row)) return false;

  if (workspace === "comandante") {
    return (
      row.shared_with_commander === true ||
      row.properties?.sharedWithCommander === true
    );
  }

  if (workspace === "jem") {
    return (
      row.shared_with_jem === true || row.properties?.sharedWithJem === true
    );
  }

  return false;
}

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

    const token = body.token?.trim();
    const access = body.access;

    if (!token || (access !== "edit" && access !== "view")) {
      return NextResponse.json(
        { ok: false, error: "Faltan el token o el tipo de acceso." },
        { status: 400 },
      );
    }

    const { data: workspaceData, error: workspaceError } =
      await supabaseAdmin
        .from("workspaces")
        .select(
          "id, code, name, workspace_type, edit_token_hash, view_token_hash, is_active",
        )
        .eq("code", workspace)
        .maybeSingle();

    if (workspaceError) {
      console.error("Error buscando workspace:", workspaceError);
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

    const candidateHash = hashWorkspaceToken(token);
    const storedHash =
      access === "edit"
        ? workspaceData.edit_token_hash
        : workspaceData.view_token_hash;

    if (!safeCompareHashes(storedHash, candidateHash)) {
      return NextResponse.json(
        { ok: false, error: "El enlace no es válido." },
        { status: 403 },
      );
    }

    const { data: mapState, error: mapStateError } =
      await supabaseAdmin
        .from("map_states")
        .select("*")
        .eq("workspace_id", workspaceData.id)
        .eq("scenario_name", "Escenario principal")
        .maybeSingle();

    if (mapStateError) {
      console.error("Error cargando estado:", mapStateError);
      return NextResponse.json(
        { ok: false, error: "No se pudo cargar el estado del mapa." },
        { status: 500 },
      );
    }

    const { data: ownElements, error: elementsError } =
      await supabaseAdmin
        .from("map_elements")
        .select("*")
        .eq("workspace_id", workspaceData.id)
        .order("created_at", { ascending: true });

    if (elementsError) {
      console.error("Error cargando elementos:", elementsError);
      return NextResponse.json(
        { ok: false, error: "No se pudieron cargar los elementos." },
        { status: 500 },
      );
    }

    let elements: Array<Record<string, unknown>> = ownElements ?? [];

    if (workspace === "comandante" || workspace === "jem") {
      const { data: allWorkspaces, error: allWorkspacesError } =
        await supabaseAdmin
          .from("workspaces")
          .select("id, code")
          .eq("is_active", true);

      if (allWorkspacesError) {
        console.error("Error cargando espacios para consolidación:", allWorkspacesError);
      } else {
        const otherWorkspaces = (allWorkspaces ?? []).filter(
          (item) => item.id !== workspaceData.id,
        );
        const ids = otherWorkspaces.map((item) => item.id);
        const codeById = Object.fromEntries(
          otherWorkspaces.map((item) => [item.id, item.code]),
        );

        if (ids.length > 0) {
          const { data: sharedRows, error: sharedError } = await supabaseAdmin
            .from("map_elements")
            .select("*")
            .in("workspace_id", ids)
            .order("created_at", { ascending: true });

          if (sharedError) {
            console.error("Error cargando elementos compartidos:", sharedError);
          } else {
            const sharedElements = ((sharedRows ?? []) as MapElementRow[])
              .filter((row) => isSharedFor(row, workspace))
              .map((row) => {
                const originCode = codeById[row.workspace_id] ?? "desconocido";
                const originalId = String(row.properties?.id ?? row.id);

                return {
                  ...row,
                  origin_workspace_code: originCode,
                  is_shared_external: true,
                  properties: {
                    ...(row.properties ?? {}),
                    id: `shared-${originCode}-${originalId}`,
                    originWorkspaceCode: originCode,
                    sharedExternal: true,
                  },
                };
              });

            elements = [...elements, ...sharedElements];
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      access,
      workspace: {
        id: workspaceData.id,
        code: workspaceData.code,
        name: workspaceData.name,
        type: workspaceData.workspace_type,
      },
      mapState: mapState ?? null,
      elements,
    });
  } catch (error) {
    console.error("Error inesperado en load:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
