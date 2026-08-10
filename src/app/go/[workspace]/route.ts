import { NextRequest, NextResponse } from "next/server";

const WORKSPACE_ENV: Record<string, string> = {
  comandante: "ZEUS_URL_COMANDANTE",
  jem: "ZEUS_URL_JEM",
  a1: "ZEUS_URL_A1",
  a2: "ZEUS_URL_A2",
  a3: "ZEUS_URL_A3",
  a4: "ZEUS_URL_A4",
  a5: "ZEUS_URL_A5",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ workspace: string }> },
) {
  const { workspace: rawWorkspace } = await context.params;
  const workspace = rawWorkspace.toLowerCase();
  const envName = WORKSPACE_ENV[workspace];

  if (!envName) {
    return new NextResponse("Órgano no reconocido.", { status: 404 });
  }

  const target = process.env[envName]?.trim();
  if (!target) {
    return NextResponse.redirect(new URL(`/acceso/${workspace}`, request.url));
  }

  try {
    const url = new URL(target);
    if (url.protocol !== "https:") throw new Error("invalid protocol");
    return NextResponse.redirect(url);
  } catch {
    return new NextResponse(`El enlace de ${workspace.toUpperCase()} no está configurado correctamente.`, { status: 500 });
  }
}
