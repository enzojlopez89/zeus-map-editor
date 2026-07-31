import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type CorrectionPayload = {
  questionId?: string;
  questionNumber?: number;
  questionText?: string;
  selectedOptionId?: string | null;
  correctOptionId?: string | null;
  message?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CorrectionPayload;
    const message = body.message?.trim();

    if (!body.questionId || !message) {
      return NextResponse.json(
        { ok: false, error: "Faltan la pregunta o el mensaje." },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "El mensaje supera el máximo permitido." },
        { status: 400 },
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent");

    const { error } = await supabaseAdmin
      .from("trivia_correction_reports")
      .insert({
        question_id: body.questionId,
        question_number: body.questionNumber ?? null,
        question_text: body.questionText ?? null,
        selected_option_id: body.selectedOptionId ?? null,
        correct_option_id: body.correctOptionId ?? null,
        message,
        status: "pendiente",
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) {
      console.error("Error guardando corrección de Trivia PPC:", error);
      return NextResponse.json(
        { ok: false, error: "No se pudo guardar la corrección." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error inesperado en reportes de Trivia PPC:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
