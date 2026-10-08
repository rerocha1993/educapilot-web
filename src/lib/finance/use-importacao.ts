import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { baixarArquivoComNome, financeiroEnviarArquivo, financeiroJson } from "./financeiro-api";
import { invalidarFinanceiro } from "./invalidar-financeiro";

/**
 * Importar e exportar planilha de despesas, receitas e orçamento (fase F3, 2026-10).
 *
 * As três telas têm as mesmas rotas, mudando só o prefixo (`/api/Expenses`, `/api/RevenueEntries`,
 * `/api/Budgets`). Tipado à mão, com fetch cru (ver financeiro-api.ts): há upload multipart e
 * download de arquivo, e as rotas não estão nos tipos gerados do Swagger. O backend responde os
 * erros em problem+json com `message`, que o Error carrega até o toast.
 *
 * Fluxo em duas etapas: a prévia lê a planilha e devolve o que aconteceria (nada é gravado) junto
 * com um `token`; a confirmação reenvia o MESMO arquivo com esse token e só então grava.
 */

export type TipoDeImportacao = "despesas" | "receitas" | "orcamento";

interface ConfigDoTipo {
  /** Prefixo da API. */
  rota: string;
  /** Para frases: "as despesas", "o orçamento". */
  oQue: string;
  /** Nome do arquivo do modelo para baixar. */
  arquivoDoModelo: string;
  /** Campos mostrados na tabela da conferência, em ordem. */
  colunasDaTabela: string[];
}

export const CONFIG_DA_IMPORTACAO: Record<TipoDeImportacao, ConfigDoTipo> = {
  despesas: {
    rota: "/api/Expenses",
    oQue: "as despesas",
    arquivoDoModelo: "modelo-despesas.xlsx",
    colunasDaTabela: ["descricao", "valor", "vencimento", "categoria", "fornecedor", "dataPagamento"],
  },
  receitas: {
    rota: "/api/RevenueEntries",
    oQue: "as receitas",
    arquivoDoModelo: "modelo-receitas.xlsx",
    colunasDaTabela: ["descricao", "valor", "vencimento", "categoria", "aluno", "situacao"],
  },
  orcamento: {
    rota: "/api/Budgets",
    oQue: "o orçamento",
    arquivoDoModelo: "modelo-orcamento.xlsx",
    colunasDaTabela: ["tipo", "categoria", "ano", "mes", "valor", "centroDeCusto"],
  },
};

// ------------------------------------------------------------------ tipos da API

export interface ColunaAceita {
  campo: string;
  titulo: string;
  obrigatoria: boolean;
  tipo: string;
  descricao?: string | null;
  exemplo?: string | null;
  sinonimos?: string[] | null;
  opcoes?: string[] | null;
}

export interface ColunasAceitas {
  tipo: string;
  colunas: ColunaAceita[];
  formatos: string[];
  limiteDeBytes: number;
  limiteDeLinhas: number;
}

export type SituacaoDaLinha = "Nova" | "Atualiza" | "Erro";

/** Valores da linha já lidos pelo servidor: só os campos preenchidos (datas aaaa-mm-dd, competência aaaa-mm). */
export type ValoresDaLinha = Record<string, string | number | boolean | null | undefined>;

export interface LinhaDaPrevia {
  numero: number;
  situacao: SituacaoDaLinha;
  motivo?: string | null;
  avisos?: string[] | null;
  valores?: ValoresDaLinha | null;
  ids?: Record<string, string> | null;
}

export interface TotaisDaPrevia {
  linhas: number;
  novas: number;
  atualizam: number;
  erros: number;
  valorTotal: number;
  apagariam: number;
}

export interface ColunaReconhecida {
  campo: string;
  titulo: string;
  cabecalhoNaPlanilha: string;
  coluna: number | string;
}

export interface PreviaDaImportacao {
  tipo: string;
  arquivo: string;
  token: string;
  totais: TotaisDaPrevia;
  colunas: ColunaReconhecida[];
  colunasIgnoradas: string[];
  linhas: LinhaDaPrevia[];
}

export interface LinhaRecusada {
  numero: number;
  motivo: string;
}

export interface ResultadoDaImportacao {
  tipo: string;
  token: string;
  gravadas: number;
  atualizadas: number;
  apagadas: number;
  recusadas: LinhaRecusada[];
}

// ------------------------------------------------------------------ leituras e envios

/** O que a planilha aceita. Quase não muda: fica em cache o tempo da sessão. */
export function useColunasDaImportacao(tipo: TipoDeImportacao, habilitado = true) {
  return useQuery({
    queryKey: ["finance", "importacao", "colunas", tipo],
    enabled: habilitado,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<ColunasAceitas> => {
      const r = await financeiroJson<Partial<ColunasAceitas> | null>(
        `${CONFIG_DA_IMPORTACAO[tipo].rota}/importar/colunas`,
        {},
        "Não foi possível carregar a lista de colunas."
      );
      return {
        tipo: r?.tipo ?? tipo,
        colunas: r?.colunas ?? [],
        formatos: r?.formatos?.length ? r.formatos : [".xlsx", ".csv"],
        limiteDeBytes: r?.limiteDeBytes ?? 0,
        limiteDeLinhas: r?.limiteDeLinhas ?? 0,
      };
    },
  });
}

/** Lê a planilha e mostra o que aconteceria. Nada é gravado. */
export function usePreviaDaImportacao(tipo: TipoDeImportacao) {
  return useMutation({
    mutationFn: ({ arquivo, substituirAno }: { arquivo: File; substituirAno?: boolean }) =>
      financeiroEnviarArquivo<PreviaDaImportacao>(
        `${CONFIG_DA_IMPORTACAO[tipo].rota}/importar/previa`,
        arquivo,
        "Não foi possível ler a planilha.",
        { substituirAno: substituirAno ? "true" : undefined }
      ),
  });
}

/** Grava de verdade. Reenvia o mesmo arquivo da prévia, com o token dela. */
export function useConfirmarImportacao(tipo: TipoDeImportacao) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      arquivo,
      token,
      todasOuNenhuma,
      substituirAno,
    }: {
      arquivo: File;
      token: string;
      todasOuNenhuma?: boolean;
      substituirAno?: boolean;
    }) =>
      financeiroEnviarArquivo<ResultadoDaImportacao>(
        `${CONFIG_DA_IMPORTACAO[tipo].rota}/importar/confirmar`,
        arquivo,
        "Não foi possível gravar a planilha.",
        {
          token,
          todasOuNenhuma: todasOuNenhuma ? "true" : undefined,
          substituirAno: substituirAno ? "true" : undefined,
        }
      ),
    // Despesas, receitas, orçamento, painel e fechamento mudam juntos.
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}

// ------------------------------------------------------------------ downloads

export function baixarModeloDaPlanilha(tipo: TipoDeImportacao) {
  const config = CONFIG_DA_IMPORTACAO[tipo];
  return baixarArquivoComNome(
    `${config.rota}/importar/modelo`,
    config.arquivoDoModelo,
    "Não foi possível baixar o modelo."
  );
}

function doisDigitos(n: number) {
  return String(n).padStart(2, "0");
}

/** Despesas ou receitas do mês (competência) que está na tela: `despesas-2026-10.xlsx`. */
export function exportarLancamentosDoMes(tipo: "despesas" | "receitas", mes: number, ano: number) {
  return baixarArquivoComNome(
    `${CONFIG_DA_IMPORTACAO[tipo].rota}/exportar?month=${mes}&year=${ano}`,
    `${tipo}-${ano}-${doisDigitos(mes)}.xlsx`,
    "Não foi possível exportar a planilha."
  );
}

/** Orçamento do ano: `orcamento-2026.xlsx`. */
export function exportarOrcamentoDoAno(ano: number) {
  return baixarArquivoComNome(
    `${CONFIG_DA_IMPORTACAO.orcamento.rota}/exportar?ano=${ano}`,
    `orcamento-${ano}.xlsx`,
    "Não foi possível exportar a planilha."
  );
}
