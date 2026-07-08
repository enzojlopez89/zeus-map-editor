import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashWorkspaceToken, safeCompareHashes } from "@/lib/workspace-token";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    workspace: string;
  }>;
};

export async function POST(request: NextRequest, context: Context) {
  try {
    const { workspace } = await context.params;
    const body = (await request.json()) as {
      token?: string;
      analysisKey?: string;
    };

    const token = body.token?.trim();
    const analysisKey = body.analysisKey?.trim() || "principal";

    if (!token || workspace !== "a3") {
      return NextResponse.json(
        { ok: false, error: "Acceso no permitido." },
        { status: 403 },
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

    const { data: analyses, error: listError } = await supabaseAdmin
      .from("pcr_analyses")
      .select("id, analysis_key, title, status, version, updated_at, result")
      .eq("workspace_id", ws.id)
      .order("updated_at", { ascending: false });

    if (listError) {
      return NextResponse.json(
        { ok: false, error: listError.message },
        { status: 500 },
      );
    }

    const requestedKey = analysisKey || analyses?.[0]?.analysis_key || "principal";

    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from("pcr_analyses")
      .select("id, analysis_key, title, content, result, status, version, updated_at")
      .eq("workspace_id", ws.id)
      .eq("analysis_key", requestedKey)
      .maybeSingle();

    if (analysisError) {
      return NextResponse.json(
        { ok: false, error: analysisError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      analyses: analyses ?? [],
      analysis: analysis ?? null,
    });
  } catch (error) {
    console.error("Error cargando PCR:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
