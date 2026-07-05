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

    const { data: elements, error: elementsError } =
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
      elements: elements ?? [],
    });
  } catch (error) {
    console.error("Error inesperado en load:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
