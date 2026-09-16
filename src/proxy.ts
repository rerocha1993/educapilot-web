import { NextResponse, type NextRequest } from "next/server";

// No domínio próprio a raiz é o site institucional (public/site) para quem chega de fora, e a
// Chamada para quem já está logado. O endereço do Azure continua abrindo o sistema direto.
//
// A sessão mora no storage do navegador, que o servidor não enxerga; quem diz "está logado" é o
// cookie que session.ts grava junto. Ele só escolhe a página: as telas continuam exigindo token.
const DOMINIO = "educa-pilot.com";
const COOKIE_LOGADO = "educapilot_logado";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(":")[0]
    .toLowerCase();

  if (host === `www.${DOMINIO}`) {
    const destino = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${DOMINIO}`);
    return NextResponse.redirect(destino, 308);
  }

  if (host === DOMINIO && request.nextUrl.pathname === "/" && !request.cookies.has(COOKIE_LOGADO)) {
    return NextResponse.rewrite(new URL("/site/index.html", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|site/).*)"],
};
