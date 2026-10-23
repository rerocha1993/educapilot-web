"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import { ROTULO_DA_DECISAO, ROTULO_DA_RECOMENDACAO, useDecisoes } from "@/lib/rh/use-parecer";

import { ErroDeCarga } from "../campo";

/** Histórico de decisões da direção sobre a permanência: só se acrescenta (errou, registra outra). */
export function HistoricoDeDecisoes({ funcionarioId }: { funcionarioId: string }) {
  const { data, isLoading, isError, refetch } = useDecisoes(funcionarioId);
  const decisoes = [...(data ?? [])].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4" aria-label="Histórico de decisões">
      <h3 className="font-heading text-base font-semibold">Histórico de decisões</h3>
      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar as decisões." onTentar={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : decisoes.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Nenhuma decisão registrada ainda.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {decisoes.map((d) => (
            <li key={d.id} className="grid gap-1 py-2 text-[13px] leading-snug">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{ROTULO_DA_DECISAO[d.decisao] ?? d.decisao}</span>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{formatarSoData(d.data)}</span>
                <Badge variant={d.concordaComParecer ? "success" : "pending"}>
                  {d.concordaComParecer ? "Seguiu o parecer" : "Diferente do parecer"}
                </Badge>
              </p>
              <p className="break-words">{d.justificativa}</p>
              <p className="text-xs break-words text-muted-foreground">
                Parecer na data: {ROTULO_DA_RECOMENDACAO[d.recomendacaoDoSistema] ?? d.recomendacaoDoSistema}
                {d.decididoPorNome && ` · por ${d.decididoPorNome}`}
                {d.proximaRevisaoEm != null && ` · próxima revisão ${formatarSoData(d.proximaRevisaoEm)}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
