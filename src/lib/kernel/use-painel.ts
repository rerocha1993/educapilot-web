import { useQuery } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";
import type { ResumoDeFormularios } from "@/lib/flow/use-resumo-formularios";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Painel da tela Início — GET /api/Painel/inicio, uma chamada só com tudo o que a tela mostra.
 *
 * Tipado à mão como os demais hooks: o endpoint declara ProducesResponseType, então depois do
 * deploy dá para regenerar `src/lib/api/generated/core.d.ts` a partir do Swagger e trocar isto
 * pelos tipos gerados (ver PANORAMA §8).
 */

export interface TurmaDoPainel {
  turmaId: number;
  turma: string;
}

export interface PresencasDoDia {
  /** Dia de Brasília a que os números se referem. */
  dia: string;
  alunosAtivos: number;
  presentes: number;
  atrasados: number;
  faltantes: number;
  turmasSemChamada: number;
  turmas: TurmaDoPainel[];
}

export interface ContratosDoPainel {
  ano: number;
  mes: number;
  assinadosNoMes: number;
  aguardandoConferencia: number;
}

export interface FinanceiroDoPainel {
  totalEmAberto: number;
  cobrancasVencidas: number;
  /** De onde veio o número: o EduPay do Agenda Edu ou as mensalidades do próprio sistema. */
  origem: "agendaedu" | "mensalidades";
  /** Falha na leitura. Com erro, um zero não significa "ninguém deve". */
  erro?: string | null;
  atualizadoEm?: string | null;
}

export interface FaltasDoPainel {
  dias: number;
  semJustificativa: number;
  turmas: TurmaDoPainel[];
}

export interface PainelInicio {
  escolaNome: string;
  modulosAtivos: number;
  geradoEm: string;
  presencas: PresencasDoDia;
  /** Um resumo por formulário escolhido — ver useResumoDeFormularios. */
  formularios: ResumoDeFormularios;
  contratos: ContratosDoPainel;
  financeiro: FinanceiroDoPainel;
  faltas: FaltasDoPainel;
}

export function usePainelInicio() {
  return useQuery({
    queryKey: ["painel", "inicio"],
    // A tela abre a cada login e a cada volta para Início; um minuto evita repetir a consulta
    // inteira a cada navegação sem deixar o número velho na tela.
    staleTime: 60_000,
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${baseUrl}/api/Painel/inicio`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.status === 401 && typeof window !== "undefined") {
        clearSession();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login?expirada=1");
        }
      }

      if (!res.ok) throw new Error("Não foi possível carregar o painel.");
      return (await res.json()) as PainelInicio;
    },
  });
}
