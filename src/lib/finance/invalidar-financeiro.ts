import type { QueryClient } from "@tanstack/react-query";

/**
 * Tudo o que depende do dinheiro que entrou ou saiu: despesas, receitas, contas, painel,
 * conciliação e fechamento (todos sob "finance"), os resumos e o orçamento, os projetos e as
 * cobranças do Relacionamento. Dar baixa, reabrir ou conciliar mexe em todos eles ao mesmo tempo.
 */
export function invalidarFinanceiro(queryClient: QueryClient) {
  for (const chave of [
    ["expenses"],
    ["revenues"],
    ["finance"],
    ["financial-summary"],
    ["financial-series"],
    ["budgets"],
    ["projetos"],
    ["relacionamento", "pagamentos"],
  ]) {
    queryClient.invalidateQueries({ queryKey: chave });
  }
}
