"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useConfiguracaoDeDesempenho, useDesempenhoDoFuncionario } from "@/lib/rh/use-desempenho";

import { ErroDeCarga } from "../campo";
import { GraficoDeEvolucao } from "./grafico-de-evolucao";
import { HistoricoDeFeedbacks } from "./historico-de-feedbacks";
import { LinhaDoTempo } from "./linha-do-tempo";
import { BarrasDeComponentes, ComoChegamosNessaNota, ResumoDaNota } from "./nota-explicada";
import { PainelDeTrajetoria } from "./painel-de-trajetoria";
import { Variacao } from "./pecas";

/**
 * Aba "Desempenho" da ficha do funcionário (área rh:desempenho). Topo com a nota atual, faixa e variação; evolução com os
 * marcadores da trajetória; barras por componente; "como chegamos nessa nota"; feedbacks; linha do tempo e cadastros.
 * Layout em duas colunas no computador para não gastar uma linha por objeto.
 */
export function PainelDeDesempenho({ funcionarioId }: { funcionarioId: string }) {
  const { data, isLoading, isError, refetch } = useDesempenhoDoFuncionario(funcionarioId);
  const { data: configuracao } = useConfiguracaoDeDesempenho();

  if (isError) return <ErroDeCarga texto="Não foi possível carregar o desempenho deste funcionário." onTentar={() => refetch()} />;

  if (isLoading || !data) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ResumoDaNota nota={data.nota} variacao={<Variacao valor={data.variacao} />}>
        {data.cicloAberto && (
          <p className="text-xs text-muted-foreground">
            Ciclo aberto: <span className="font-medium text-foreground">{data.cicloAberto.nome}</span>
          </p>
        )}
      </ResumoDaNota>

      <div className="grid gap-3 lg:grid-cols-5">
        <section className="rounded-xl border border-border bg-card p-4 lg:col-span-3" aria-label="Evolução da nota">
          <h3 className="mb-2 font-heading text-base font-semibold">Evolução</h3>
          <GraficoDeEvolucao pontos={data.evolucao} marcadores={data.marcadores} faixas={configuracao?.faixas ?? []} />
        </section>
        <section className="rounded-xl border border-border bg-card p-4 lg:col-span-2" aria-label="Nota por componente">
          <h3 className="mb-3 font-heading text-base font-semibold">Por componente</h3>
          <BarrasDeComponentes componentes={data.nota.componentes} />
        </section>
      </div>

      <ComoChegamosNessaNota nota={data.nota} />

      <div className="grid gap-3 lg:grid-cols-2">
        <HistoricoDeFeedbacks funcionarioId={funcionarioId} avaliacoes={data.avaliacoes} cicloAberto={data.cicloAberto} />
        <LinhaDoTempo funcionarioId={funcionarioId} />
      </div>

      <PainelDeTrajetoria funcionarioId={funcionarioId} />
    </div>
  );
}
