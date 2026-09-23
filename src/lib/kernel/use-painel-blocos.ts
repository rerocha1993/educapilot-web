import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Arranjo dos blocos da tela Início — GET/PUT /api/Flow/painel/blocos.
 *
 * Guarda só o que a pessoa decidiu (ordem e visibilidade), nunca o catálogo: quem sabe quais
 * blocos existem é a tela, que muda a cada versão. Lista vazia = arranjo de fábrica, e é também o
 * que o "Restaurar padrão" manda de volta.
 *
 * Tipado à mão como os demais hooks do painel; depois do deploy dá para regenerar pelo Swagger.
 */

export interface BlocoDoPainel {
  id: string;
  visivel: boolean;
}

async function chamar<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}${caminho}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?expirada=1");
    }
  }

  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    throw new Error((corpo as { message?: string } | null)?.message ?? falha);
  }

  return (await res.json()) as T;
}

/** Ordem e visibilidade escolhidas por esta pessoa. Vazio = nada escolhido, vale o de fábrica. */
export function usePainelDeBlocos() {
  return useQuery({
    queryKey: ["painel", "blocos"],
    staleTime: 5 * 60_000,
    queryFn: () =>
      chamar<BlocoDoPainel[]>(
        "/api/Flow/painel/blocos",
        {},
        "Não foi possível carregar o arranjo do Início."
      ),
  });
}

export function useSalvarPainelDeBlocos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blocos: BlocoDoPainel[]) =>
      chamar<BlocoDoPainel[]>(
        "/api/Flow/painel/blocos",
        { method: "PUT", body: JSON.stringify(blocos) },
        "Não foi possível salvar o arranjo do Início."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel", "blocos"] }),
  });
}

/**
 * Junta o catálogo de fábrica com o que está salvo.
 *
 * Bloco que a pessoa nunca viu (porque entrou numa versão depois da última vez que ela
 * personalizou a tela) entra na posição de fábrica dele, e não no fim: ir para o fim esconderia
 * abaixo dos atalhos justamente a novidade, e ninguém abre a personalização para descobrir que
 * existe um bloco novo. A âncora é o bloco de fábrica anterior que já está no arranjo salvo.
 */
export function arranjarBlocos<T extends { id: string }>(
  catalogo: T[],
  salvo: BlocoDoPainel[] | undefined
): BlocoDoPainel[] {
  const doCatalogo = new Set(catalogo.map((b) => b.id));
  // Id salvo que não existe mais no catálogo é lixo de versão antiga: sai fora.
  const arranjo: BlocoDoPainel[] = (salvo ?? [])
    .filter((p) => doCatalogo.has(p.id))
    .map((p) => ({ id: p.id, visivel: p.visivel }));

  const jaTem = new Set(arranjo.map((p) => p.id));

  catalogo.forEach((bloco, i) => {
    if (jaTem.has(bloco.id)) return;

    let destino = 0;
    for (let j = i - 1; j >= 0; j--) {
      const pos = arranjo.findIndex((p) => p.id === catalogo[j].id);
      if (pos >= 0) {
        destino = pos + 1;
        break;
      }
    }

    // Bloco novo nasce visível: a pessoa escolheu esconder os outros, não este.
    arranjo.splice(destino, 0, { id: bloco.id, visivel: true });
    jaTem.add(bloco.id);
  });

  return arranjo;
}
