import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * A escolha de tela desta pessoa — GET/PUT /api/Flow/painel/preferencias.
 *
 * Um documento só, gravado na conta de quem escolheu: quais blocos aparecem e em que ordem, quais
 * números, quais atalhos, quais pendências e quais formulários. Substituiu os dois endpoints
 * antigos (`painel/blocos` e `painel/formularios`), que mexiam em pedaços do mesmo documento e
 * obrigavam a tela a salvar duas vezes para uma decisão só.
 *
 * Seção vazia não é "escolhi nada": é "ainda não escolhi", e a tela aplica o padrão do papel da
 * pessoa (ver lib/inicio/catalogo). O PUT troca o documento inteiro.
 *
 * Tipado à mão como os demais hooks do painel; depois do deploy dá para regenerar pelo Swagger.
 */

export interface BlocoDoPainel {
  id: string;
  visivel: boolean;
}

export interface PreferenciasDoInicio {
  blocos: BlocoDoPainel[];
  numeros: string[];
  atalhos: string[];
  pendencias: string[];
  /** Ids (guid) dos formulários resumidos na tela, na ordem escolhida. */
  formularios: string[];
}

export const PREFERENCIAS_VAZIAS: PreferenciasDoInicio = {
  blocos: [],
  numeros: [],
  atalhos: [],
  pendencias: [],
  formularios: [],
};

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

/** Documento cru → documento completo. Seção ausente vira lista vazia, que é "não escolhi". */
function normalizar(bruto: Partial<PreferenciasDoInicio> | null): PreferenciasDoInicio {
  return {
    blocos: (bruto?.blocos ?? []).filter((b) => b && typeof b.id === "string"),
    numeros: bruto?.numeros ?? [],
    atalhos: bruto?.atalhos ?? [],
    pendencias: bruto?.pendencias ?? [],
    formularios: bruto?.formularios ?? [],
  };
}

export function usePreferenciasDoInicio() {
  return useQuery({
    queryKey: ["painel", "preferencias"],
    staleTime: 5 * 60_000,
    queryFn: async () =>
      normalizar(
        await chamar<Partial<PreferenciasDoInicio>>(
          "/api/Flow/painel/preferencias",
          {},
          "Não foi possível carregar a sua escolha de tela."
        )
      ),
  });
}

export function useSalvarPreferenciasDoInicio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferencias: PreferenciasDoInicio) =>
      normalizar(
        await chamar<Partial<PreferenciasDoInicio>>(
          "/api/Flow/painel/preferencias",
          { method: "PUT", body: JSON.stringify(preferencias) },
          "Não foi possível salvar a sua escolha de tela."
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel", "preferencias"] });
      // A escolha de formulários muda o que /api/Painel/inicio devolve.
      queryClient.invalidateQueries({ queryKey: ["painel", "inicio"] });
    },
  });
}

/**
 * Junta o catálogo de blocos com o que está salvo.
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
