"use client";

import { toast } from "sonner";

import type { EdicaoDoEstudo } from "@/components/finance/precificacao/rascunho";
import { useSalvarAlvos, useSalvarPremissas } from "@/lib/finance/use-precificacao";

/**
 * Salva o que os passos 2, 3 e 4 editam: as premissas e as turmas (capacidade e mensalidade
 * definida) andam juntas, porque a meta de ocupação muda a capacidade e a margem muda o alvo.
 *
 * As premissas vão primeiro: o servidor recalcula as turmas a partir delas, e só depois a
 * capacidade e a mensalidade definida que a pessoa digitou são aplicadas por cima.
 */
export function usePersistirEdicao(edicao: EdicaoDoEstudo) {
  const salvarPremissas = useSalvarPremissas(edicao.estudo.id);
  const salvarAlvos = useSalvarAlvos(edicao.estudo.id);

  async function salvar() {
    try {
      if (edicao.premissas.sujo) {
        await salvarPremissas.mutateAsync(edicao.premissas.valor);
        edicao.premissas.descartar();
      }
      if (edicao.alvos.sujo) {
        await salvarAlvos.mutateAsync(
          edicao.alvos.valor.map((a) => ({
            id: a.id,
            capacidadeMeta: a.capacidadeMeta,
            mensalidadeDefinida: a.mensalidadeDefinida ?? undefined,
          }))
        );
        edicao.alvos.descartar();
      }
      toast.success("Alterações salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar as alterações.");
    }
  }

  return { salvar, salvando: salvarPremissas.isPending || salvarAlvos.isPending };
}
