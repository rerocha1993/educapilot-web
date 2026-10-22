import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeiroJson } from "@/lib/finance/financeiro-api";
import { hojeIsoBrasilia } from "@/lib/format/date";

/**
 * Conector da Sponte (Administração › Importação em massa).
 *
 * Tipado à mão, com fetch cru (`financeiroJson`): os tipos gerados do cliente da API ainda não
 * conhecem as rotas da Sponte. Os nomes seguem o contrato em docs/sponte/CONTRATO.md do core.
 */

const ROTA = "/api/Sponte";

export interface SponteSettings {
  codigoCliente: number | null;
  /** Só em escrita. Em leitura vem sempre vazio: o valor gravado nunca volta para a tela. */
  token?: string | null;
  /** Indica que já existe token gravado. */
  configurado: boolean;
  ultimaImportacaoEm?: string | null;
  /** Só contagens, sem dado pessoal. */
  resumoUltimaImportacao?: string | null;
}

export interface OpcoesDaImportacaoSponte {
  turmas: boolean;
  /** Alunos, responsáveis e vínculos entre eles. */
  alunos: boolean;
  matriculas: boolean;
  financeiro: boolean;
  /** aaaa-mm-dd. Só vale com `financeiro`. */
  financeiroDesde?: string | null;
  /** aaaa-mm-dd. Só vale com `financeiro`. */
  financeiroAte?: string | null;
  somenteAtivos: boolean;
  /** true: dado preenchido na Sponte sobrescreve o daqui; false: só completa o que está vazio. */
  atualizarExistentes: boolean;
  inscreverNaMensalidade: boolean;
}

export interface ResultadoDaImportacaoSponte {
  sucesso: boolean;
  /** true quando foi só a conferência: nada foi gravado. */
  previa: boolean;
  erro?: string | null;
  turmasCriadas: number;
  turmasAtualizadas: number;
  turmasIgnoradas: number;
  alunosCriados: number;
  alunosAtualizados: number;
  alunosEmPreCadastro: number;
  alunosIgnorados: number;
  responsaveisCriados: number;
  responsaveisAtualizados: number;
  vinculosCriados: number;
  vinculosAtualizados: number;
  matriculasAplicadas: number;
  matriculasIgnoradas: number;
  parcelasCriadas: number;
  parcelasAtualizadas: number;
  parcelasIgnoradas: number;
  receitasCriadas: number;
  alunosInscritosNaMensalidade: number;
  avisos: string[];
  ignorados: string[];
  duracaoSegundos: number;
}

export interface ResultadoDoTesteDeConexao {
  sucesso: boolean;
  mensagem: string;
}

/** "aaaa-mm-dd" a partir de ano, mês (1-12) e dia, ajustando o dia ao tamanho do mês (31/01 + 1 mês = 28/02). */
function isoAjustado(ano: number, mes: number, dia: number): string {
  const total = ano * 12 + (mes - 1);
  const anoFinal = Math.floor(total / 12);
  const mesFinal = (total % 12) + 1;
  const ultimoDia = new Date(Date.UTC(anoFinal, mesFinal, 0)).getUTCDate();
  const d = Math.min(dia, ultimoDia);
  return `${anoFinal}-${String(mesFinal).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Padrões do contrato: traz turmas, alunos e matrículas, só o que está ativo, atualizando o que já
 * existe. O financeiro começa desmarcado, com vencimentos do dia 1º de janeiro do ano passado até
 * daqui a 12 meses.
 */
export function opcoesPadrao(): OpcoesDaImportacaoSponte {
  const [ano, mes, dia] = hojeIsoBrasilia().split("-").map(Number);
  return {
    turmas: true,
    alunos: true,
    matriculas: true,
    financeiro: false,
    financeiroDesde: `${ano - 1}-01-01`,
    financeiroAte: isoAjustado(ano, mes + 12, dia),
    somenteAtivos: true,
    atualizarExistentes: true,
    inscreverNaMensalidade: false,
  };
}

export function useSponteSettings() {
  return useQuery({
    queryKey: ["sponte", "configuracao"],
    queryFn: () =>
      financeiroJson<SponteSettings>(
        `${ROTA}/configuracao`,
        { method: "GET" },
        "Não foi possível carregar a configuração da Sponte."
      ),
  });
}

export function useSaveSponteSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { codigoCliente: number; token?: string }) => {
      await financeiroJson<void>(
        `${ROTA}/configuracao`,
        {
          method: "PUT",
          body: JSON.stringify({
            codigoCliente: input.codigoCliente,
            // Só envia o token quando o usuário digitou algo. Em branco significa "mantém o que
            // já está gravado": a tela nunca recebe o valor atual para poder reenviá-lo.
            token: input.token?.trim() || undefined,
          }),
        },
        "Não foi possível salvar a configuração da Sponte."
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sponte"] }),
  });
}

export function useTestarSponte() {
  return useMutation({
    mutationFn: () =>
      financeiroJson<ResultadoDoTesteDeConexao>(
        `${ROTA}/testar-conexao`,
        { method: "POST" },
        "Não foi possível testar a conexão com a Sponte."
      ),
  });
}

/** Conferência: lê da Sponte e mostra o que aconteceria, sem gravar nada. */
export function usePreviaSponte() {
  return useMutation({
    mutationFn: (opcoes: OpcoesDaImportacaoSponte) =>
      financeiroJson<ResultadoDaImportacaoSponte>(
        `${ROTA}/previa`,
        { method: "POST", body: JSON.stringify(opcoes) },
        "Não foi possível pré-visualizar a importação da Sponte."
      ),
  });
}

export function useImportarSponte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opcoes: OpcoesDaImportacaoSponte) =>
      financeiroJson<ResultadoDaImportacaoSponte>(
        `${ROTA}/importar`,
        { method: "POST", body: JSON.stringify(opcoes) },
        "Não foi possível importar da Sponte."
      ),
    onSuccess: () => {
      // A importação mexe em turmas, alunos, responsáveis, cobranças e pré-cadastros (que ficam
      // sob "agenda-edu"): invalida tudo para as telas não mostrarem a lista antiga.
      for (const chave of ["sponte", "classes", "students", "guardians", "cobrancas", "agenda-edu"]) {
        queryClient.invalidateQueries({ queryKey: [chave] });
      }
    },
  });
}
