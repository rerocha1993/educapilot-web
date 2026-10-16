import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  baixarArquivoComNome,
  financeiroEnviarArquivo,
  financeiroFetch,
  ErroDeApi,
} from "@/lib/finance/financeiro-api";

/**
 * Importação de alunos (com os responsáveis na mesma linha) e de turmas por planilha .xlsx
 * (Administração › Importação em massa).
 *
 * Tipado à mão, com fetch cru (ver financeiro-api.ts): há upload multipart e download
 * autenticado de arquivo, que o cliente tipado não cobre. A prévia, a confirmação e o arquivo de
 * erros recebem o mesmo arquivo e as mesmas opções; o servidor lê tudo de novo a cada chamada.
 */

const ROTA = "/api/cadastros/importar";

export type TipoDeCadastro = "alunos" | "turmas";

export const NOME_DO_MODELO: Record<TipoDeCadastro, string> = {
  alunos: "modelo-alunos-e-responsaveis.xlsx",
  turmas: "modelo-turmas.xlsx",
};

export interface OpcoesDaImportacao {
  atualizarExistentes: boolean;
  criarTurmas: boolean;
  /** Só na confirmação: havendo qualquer linha com erro, não grava nada. */
  todasOuNenhuma?: boolean;
}

export type SituacaoDoCadastro = "Nova" | "Atualiza" | "Ignorada" | "Erro";

export interface ProblemaDaImportacao {
  linha: number;
  coluna?: string | null;
  motivo: string;
  gravidade: "Erro" | "Aviso";
}

export interface TotaisDaImportacao {
  linhasLidas: number;
  novos: number;
  atualizados: number;
  ignorados: number;
  comErro: number;
  responsaveisNovos: number;
  responsaveisAtualizados: number;
  vinculosNovos: number;
  turmasNovas: number;
  avisos: number;
}

export interface LinhaDaPreviaDeCadastro {
  numero: number;
  situacao: SituacaoDoCadastro;
  nome?: string | null;
  /** aaaa-mm-dd */
  nascimento?: string | null;
  turma?: string | null;
  responsaveis: string[];
  observacao?: string | null;
}

export interface PreviaDaImportacaoDeCadastros {
  tipo: string;
  arquivo: string;
  totais: TotaisDaImportacao;
  podeConfirmar: boolean;
  colunasReconhecidas: string[];
  colunasIgnoradas: string[];
  problemas: ProblemaDaImportacao[];
  problemasOmitidos: number;
  linhas: LinhaDaPreviaDeCadastro[];
}

export interface ConfirmacaoDaImportacaoDeCadastros {
  tipo: string;
  gravou: boolean;
  totais: TotaisDaImportacao;
  problemas: ProblemaDaImportacao[];
  problemasOmitidos: number;
}

function campos(tipo: TipoDeCadastro, opcoes: OpcoesDaImportacao): Record<string, string | undefined> {
  return {
    tipo,
    atualizarExistentes: opcoes.atualizarExistentes ? "true" : undefined,
    criarTurmas: opcoes.criarTurmas ? "true" : undefined,
    todasOuNenhuma: opcoes.todasOuNenhuma ? "true" : undefined,
  };
}

/** Lê a planilha e mostra o que aconteceria. Nada é gravado. */
export function usePreviaDeCadastros() {
  return useMutation({
    mutationFn: ({ arquivo, tipo, opcoes }: { arquivo: File; tipo: TipoDeCadastro; opcoes: OpcoesDaImportacao }) =>
      financeiroEnviarArquivo<PreviaDaImportacaoDeCadastros>(
        `${ROTA}/previa`,
        arquivo,
        "Não foi possível ler a planilha.",
        campos(tipo, opcoes)
      ),
  });
}

/** Grava de verdade: reenvia o mesmo arquivo. Alunos, turmas e responsáveis mudam juntos. */
export function useConfirmarCadastros() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ arquivo, tipo, opcoes }: { arquivo: File; tipo: TipoDeCadastro; opcoes: OpcoesDaImportacao }) =>
      financeiroEnviarArquivo<ConfirmacaoDaImportacaoDeCadastros>(
        `${ROTA}/confirmar`,
        arquivo,
        "Não foi possível gravar a planilha.",
        campos(tipo, opcoes)
      ),
    onSuccess: () => {
      for (const chave of ["classes", "students", "guardians"]) {
        queryClient.invalidateQueries({ queryKey: [chave] });
      }
    },
  });
}

export function baixarModeloDeCadastros(tipo: TipoDeCadastro) {
  return baixarArquivoComNome(`${ROTA}/modelo?tipo=${tipo}`, NOME_DO_MODELO[tipo], "Não foi possível baixar o modelo.");
}

/** .xlsx com as linhas que falharam e o motivo, para corrigir e reenviar. */
export async function baixarLinhasComErro(arquivo: File, tipo: TipoDeCadastro, opcoes: OpcoesDaImportacao) {
  const form = new FormData();
  form.append("arquivo", arquivo);
  for (const [nome, valor] of Object.entries(campos(tipo, opcoes))) {
    if (valor) form.append(nome, valor);
  }

  const res = await financeiroFetch(`${ROTA}/erros`, { method: "POST", body: form });
  if (!res.ok) {
    let mensagem = "Não foi possível gerar o arquivo com as linhas com erro.";
    try {
      const corpo = (await res.json()) as { message?: string; detail?: string };
      mensagem = corpo.message || corpo.detail || mensagem;
    } catch {
      // corpo vazio ou não-JSON: fica a mensagem padrão
    }
    throw new ErroDeApi(mensagem, res.status);
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = tipo === "alunos" ? "alunos-e-responsaveis-com-erro.xlsx" : "turmas-com-erro.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoga depois: revogar na hora pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
