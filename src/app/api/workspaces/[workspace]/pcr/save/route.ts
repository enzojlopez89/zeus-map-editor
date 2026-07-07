import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashWorkspaceToken, safeCompareHashes } from "@/lib/workspace-token";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    workspace: string;
  }>;
};

type SaveBody = {
  token?: string;
  analysisKey?: string;
  content?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

export async function POST(request: NextRequest, context: Context) {
  try {
    const { workspace } = await context.params;
    const body = (await request.json()) as SaveBody;
    const token = body.token?.trim();
    const analysisKey = body.analysisKey?.trim() || "principal";

    if (!token || !body.content || workspace !== "a3") {
      return NextResponse.json(
        { ok: false, error: "Datos incompletos o acceso no permitido." },
        { status: 400 },
      );
    }

    const { data: ws, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("id, edit_token_hash, is_active")
      .eq("code", workspace)
      .maybeSingle();

    if (workspaceError || !ws || !ws.is_active) {
      return NextResponse.json(
        { ok: false, error: "No se pudo validar A3." },
        { status: 404 },
      );
    }

    const validToken = safeCompareHashes(
      ws.edit_token_hash,
      hashWorkspaceToken(token),
    );

    if (!validToken) {
      return NextResponse.json(
        { ok: false, error: "El enlace de edición no es válido." },
        { status: 403 },
      );
    }

    const { data: current } = await supabaseAdmin
      .from("pcr_analyses")
      .select("version")
      .eq("workspace_id", ws.id)
      .eq("analysis_key", analysisKey)
      .maybeSingle();

    const nextVersion = Number(current?.version ?? 0) + 1;
    const status = typeof body.content.status === "string"
      ? body.content.status
      : "borrador";
    const title = typeof body.content.title === "string"
      ? body.content.title
      : "Determinación del PCR";

    const { data, error: saveError } = await supabaseAdmin
      .from("pcr_analyses")
      .upsert(
        {
          workspace_id: ws.id,
          analysis_key: analysisKey,
          title,
          status,
          content: {
            ...body.content,
            analysisKey,
          },
          result: body.result ?? {},
          version: nextVersion,
        },
        { onConflict: "workspace_id,analysis_key" },
      )
      .select("version")
      .single();

    if (saveError) {
      return NextResponse.json(
        { ok: false, error: saveError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, version: data.version });
  } catch (error) {
    console.error("Error guardando PCR:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
