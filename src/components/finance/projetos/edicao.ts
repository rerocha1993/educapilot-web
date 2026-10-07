import type { Rascunho } from "@/components/finance/precificacao/rascunho";
import type { ItemDoOrcamento, ProjetoDetalhe } from "@/lib/finance/use-projetos";

/**
 * O que a aba Orçamento edita antes de salvar: os itens e os três números do painel.
 *
 * O rascunho mora na página do projeto (e não na aba) porque as abas se alternam: trocar de aba
 * não pode jogar fora o que foi digitado.
 */
export interface ItemEditavel {
  /** Chave estável da linha na tela (o id do servidor, ou um id local para a linha nova). */
  chave: string;
  id?: string;
  descricao: string;
  /** Vazio é "sem grupo". */
  grupo: string;
  quantidade: number | null;
  valorUnitario: number | null;
  comprado: boolean;
  observacao: string;
}

export interface Parametros {
  margem: number | null;
  familias: number | null;
  /** Valor por família que a escola decidiu cobrar no lugar do sugerido; nulo usa o sugerido. */
  valorDefinido: number | null;
}

export interface EdicaoDoProjeto {
  itens: Rascunho<ItemEditavel[]>;
  parametros: Rascunho<Parametros>;
  somenteLeitura: boolean;
  projeto: ProjetoDetalhe;
}

export function itemEditavel(i: ItemDoOrcamento): ItemEditavel {
  return {
    chave: i.id,
    id: i.id,
    descricao: i.descricao,
    grupo: i.grupo ?? "",
    quantidade: i.quantidade,
    valorUnitario: i.valorUnitario,
    comprado: i.comprado,
    observacao: i.observacao ?? "",
  };
}

export function parametrosDoProjeto(p: ProjetoDetalhe): Parametros {
  return {
    margem: p.margemDesejadaPercentual,
    familias: p.numeroDeFamilias,
    valorDefinido: p.valorPorFamiliaDefinido ?? null,
  };
}

export function totalDoItem(i: ItemEditavel): number {
  return Math.round((i.quantidade ?? 0) * (i.valorUnitario ?? 0) * 100) / 100;
}

let contador = 0;
/** Chave de uma linha que ainda não existe no servidor. */
export function novaChave(): string {
  contador += 1;
  return `novo-${Date.now()}-${contador}`;
}

/** Grupos comuns numa festa. O servidor guarda o texto livre: um grupo antigo continua aparecendo. */
export const GRUPOS_DO_ORCAMENTO = [
  "Alimentação",
  "Bebidas",
  "Decoração",
  "Brinquedos e atrações",
  "Lembrancinhas",
  "Descartáveis",
  "Equipe e serviços",
  "Outros",
] as const;
