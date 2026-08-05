import { NextRequest, NextResponse } from "next/server";

const TRIVIA_ONLY = process.env.NEXT_PUBLIC_TRIVIA_ONLY === "true";

function withPrivateIndexing(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export function proxy(request: NextRequest) {
  if (!TRIVIA_ONLY) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/trivia-ppc";
    return withPrivateIndexing(NextResponse.rewrite(destination));
  }

  if (
    pathname === "/trivia-ppc" ||
    pathname.startsWith("/api/trivia/reportes")
  ) {
    return withPrivateIndexing(NextResponse.next());
  }

  return new NextResponse("Página no disponible en este sitio.", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)",
  ],
};
