import { NextResponse, type NextRequest } from "next/server";

// No domínio próprio a raiz é o site institucional (public/site) para quem chega de fora, e a
// Chamada para quem já está logado. O endereço do Azure abre o sistema direto, a menos que esteja em
// REDIRECIONAR_PARA_DOMINIO_DE (abaixo).
//
// A sessão mora no storage do navegador, que o servidor não enxerga; quem diz "está logado" é o
// cookie que session.ts grava junto. Ele só escolhe a página: as telas continuam exigindo token.
const DOMINIO = "educa-pilot.com";
const COOKIE_LOGADO = "educapilot_logado";

// Endereços que mandam o visitante para o domínio próprio, separados por vírgula (configuração do App Service,
// lida em tempo de execução): "educapilot-web.azurewebsites.net" no dia em que o sistema passa a ser só
// educa-pilot.com, e o endereço *.azurewebsites.net do app novo quando a hospedagem mudar de conta. Vazio: não
// redireciona (o staging nunca deve ter). Ligar junto com Ponto__RpId=educa-pilot.com na API: as passkeys do ponto
// só valem no domínio em que foram cadastradas.
const HOSTS_REDIRECIONADOS = (process.env["REDIRECIONAR_PARA_DOMINIO_DE"] ?? "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(":")[0]
    .toLowerCase();

  if (host === `www.${DOMINIO}` || HOSTS_REDIRECIONADOS.includes(host)) {
    const destino = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${DOMINIO}`);
    return NextResponse.redirect(destino, 308);
  }

  if (host === DOMINIO && request.nextUrl.pathname === "/" && !request.cookies.has(COOKIE_LOGADO)) {
    return NextResponse.rewrite(new URL("/site/index.html", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // sw.js fica de fora: o service worker do push precisa ser servido direto, sem passar pelo proxy.
  matcher: ["/((?!_next/static|_next/image|site/|sw\\.js$).*)"],
};
