"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Salad } from "lucide-react";

import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { CabecalhoDoCardapio, CartaoDeHoje, CartaoDoDia } from "@/components/relacionamento/portal/cardapio";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { rotuloDaSemana, segundaDe } from "@/lib/relacionamento/cardapio-vocabulario";
import { useCardapioDoPortal } from "@/lib/relacionamento/use-portal-cardapio";

/**
 * Cardápio da semana no portal: o que a escola serve, dia a dia.
 *
 * No alto, o cartão "Hoje"; abaixo, a semana em cartões por dia, com o de hoje destacado. A
 * semana seguinte (e a anterior) só aparece quando a escola publicou. Se a família tem filhos em
 * turmas com cardápios diferentes (o Berçário tem o dele), cada cardápio vem com o nome dos
 * filhos que o seguem. O link do aviso do celular chega aqui com `?semana=`.
 */
export default function CardapioDoResponsavelPage() {
  return (
    // useSearchParams precisa de Suspense em volta: sem ele, o Next não consegue pré-renderizar a página.
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <Cardapio />
    </Suspense>
  );
}

function Cardapio() {
  const parametros = useSearchParams();
  const semanaDoLink = parametros.get("semana");
  const [escolhida, setEscolhida] = useState<string | null>(null);

  const semanaPedida = escolhida ?? (semanaDoLink && /^\d{4}-\d{2}-\d{2}$/.test(semanaDoLink) ? semanaDoLink : null);
  const { data, isLoading, isError, refetch } = useCardapioDoPortal(semanaPedida);

  const cardapios = data?.cardapios ?? [];
  const varios = cardapios.length > 1;
  // O servidor só marca "hoje" na semana corrente; nas outras, a semana inteira é o assunto.
  const temHoje = cardapios.some((c) => c.dias.some((d) => d.hoje));
  const naSemanaDeHoje = !!data && data.semana === segundaDe(data.hoje);

  return (
    <>
      <div>
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Cardápio</h1>
        {data && <p className="text-sm text-muted-foreground">Semana de {rotuloDaSemana(data.semana)}</p>}
      </div>

      {data && (data.temSemanaAnterior || data.temProximaSemana || !naSemanaDeHoje) && (
        <div role="group" aria-label="Escolher a semana" className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1"
            disabled={!data.temSemanaAnterior}
            onClick={() => setEscolhida(data.semanaAnterior)}
          >
            <ChevronLeft data-icon="inline-start" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1"
            disabled={naSemanaDeHoje}
            onClick={() => setEscolhida(segundaDe(data.hoje))}
          >
            Esta semana
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1"
            disabled={!data.temProximaSemana}
            onClick={() => setEscolhida(data.proximaSemana)}
          >
            Próxima
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {isError && <ErroDoPortal texto="Não foi possível carregar o cardápio." onTentar={() => refetch()} />}

      {data && cardapios.length === 0 && (
        <VazioDoPortal
          icone={<Salad />}
          titulo="Sem cardápio nesta semana"
          texto="Quando a escola publicar o cardápio, as refeições de cada dia aparecem aqui."
        />
      )}

      {temHoje &&
        cardapios.map((c) => <CartaoDeHoje key={`hoje-${c.id}`} cardapio={c} mostrarFilhos={varios} />)}

      {cardapios.map((c) => (
        <section key={c.id} aria-label={c.titulo ?? "Cardápio da semana"} className="flex flex-col gap-2.5">
          <CabecalhoDoCardapio cardapio={c} mostrarFilhos={varios} />
          <div className="flex flex-col gap-2">
            {c.dias.map((d) => (
              <CartaoDoDia key={d.data} dia={d} />
            ))}
          </div>
          {c.observacao && (
            <p className="rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-[13px] leading-[1.55] whitespace-pre-line text-muted-foreground">
              {c.observacao}
            </p>
          )}
        </section>
      ))}
    </>
  );
}
