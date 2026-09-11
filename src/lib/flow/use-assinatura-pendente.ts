import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";

export interface AssinaturaPendente {
  /** preparando | pronto | indisponivel | assinado */
  estado: string;
  link: string | null;
  titulo: string | null;
  /** O que dizer à família quando não há link. Nunca detalhe técnico. */
  mensagem: string | null;
}

/**
 * Acompanha a assinatura logo depois do envio.
 *
 * O documento é criado no provedor por um job, então entre enviar o formulário e o link existir
 * passam alguns segundos. Por isso a consulta se repete enquanto o estado for "preparando" — e
 * para assim que houver link, para não ficar batendo à toa numa aba esquecida aberta.
 */
export function useAssinaturaPendente(token: string, responseId: string | null) {
  return useQuery({
    queryKey: ["assinatura-pendente", token, responseId],
    enabled: !!responseId,
    refetchInterval: (query) =>
      query.state.data?.estado === "preparando" ? 3000 : false,
    queryFn: async () => {
      const result = await flowApi.GET("/api/PublicForms/{token}/assinatura/{responseId}", {
        params: { path: { token, responseId: responseId! } },
      });

      // Falha de rede não vira erro na tela: as respostas já foram salvas, e o que a família
      // precisa é continuar tentando, não ver um alerta vermelho.
      if (!result.response.ok || result.error) {
        return { estado: "preparando", link: null, titulo: null, mensagem: null } as AssinaturaPendente;
      }

      return result.data as unknown as AssinaturaPendente;
    },
  });
}
