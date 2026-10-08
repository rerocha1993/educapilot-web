"use client";

import { CalendarSync, Plus } from "lucide-react";

import { CartoesDosPlanos } from "@/components/relacionamento/pagamentos/aba-planos";
import { CartaoDaMensalidade } from "@/components/relacionamento/pagamentos/cartao-da-mensalidade";
import type { FiltrosDeCobranca } from "@/components/relacionamento/pagamentos/filtros-de-cobranca";
import { ListaDeCobrancas } from "@/components/relacionamento/pagamentos/lista-de-cobrancas";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMensalidades, usePlanos } from "@/lib/relacionamento/use-pagamentos";

/**
 * Cobranças que se repetem todo mês. Em cima, um cartão por plano (a Mensalidade e os planos
 * "Outro", como período integral e transporte); embaixo, as parcelas que eles geraram.
 */
export function AbaRecorrente({ f, onNova }: { f: FiltrosDeCobranca; onNova: () => void }) {
  const planos = usePlanos();
  const mensalidade = useMensalidades();

  const carregando = planos.isLoading || mensalidade.isLoading;
  const comErro = planos.isError || mensalidade.isError;
  const temPlanos = (planos.data ?? []).length > 0;
  const temMensalidade = (mensalidade.data?.quantidadeDeAlunos ?? 0) > 0;
  const nadaConfigurado = !carregando && !comErro && !temPlanos && !temMensalidade;

  if (comErro) {
    return (
      <ErroDeCarga
        texto="Não foi possível carregar os planos."
        onTentar={() => {
          void planos.refetch();
          void mensalidade.refetch();
        }}
      />
    );
  }

  if (carregando) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy>
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    );
  }

  if (nadaConfigurado) {
    return (
      <EstadoVazio
        icone={<CalendarSync />}
        titulo="Nenhum plano ainda"
        texto="Crie a mensalidade ou um plano para cobrar todo mês, como período integral ou transporte. As parcelas de cada mês aparecem aqui."
        textoClassName="max-w-[400px]"
        acao={
          <Button variant="action" onClick={onNova}>
            <Plus />
            Nova cobrança
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      {/* Cartoes de largura fixa: sem esticar um cartao sozinho na tela toda. Com so a Mensalidade,
          o cartao tracejado ao lado convida a criar o proximo plano e preenche o espaco. */}
      <section aria-label="Planos" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <CartaoDaMensalidade />
        <CartoesDosPlanos
          aoVazio={
            <button
              type="button"
              onClick={onNova}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Plus className="size-5" />
              <span className="font-medium">Novo plano recorrente</span>
              <span className="text-xs">Período integral, transporte, material: tudo que se cobra todo mês.</span>
            </button>
          }
        />
      </section>

      <section aria-label="Parcelas" className="grid gap-3">
        <div>
          <h2 className="font-heading text-[15px] font-semibold">Parcelas</h2>
          <p className="text-[13px] text-muted-foreground">As cobranças mensais que os planos acima já geraram.</p>
        </div>
        <ListaDeCobrancas
          f={f}
          semNenhuma={{
            titulo: "Nenhuma parcela gerada ainda",
            texto: "Use o botão de gerar no cartão de um plano para criar as parcelas do mês. Elas aparecem aqui.",
          }}
        />
      </section>
    </div>
  );
}
