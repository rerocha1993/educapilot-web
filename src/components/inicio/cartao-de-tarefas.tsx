"use client";

import Link from "next/link";
import { Estatistica, EtiquetaDoCartao } from "@/components/padroes/estatistica";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarData } from "@/lib/format/date";
import { useMeuQuadro, type Cartao } from "@/lib/flow/use-tarefas";

/**
 * O Kanban da pessoa resumido na tela Início.
 *
 * O quadro chega inteiro numa requisição só (ver use-tarefas), então a conta é feita aqui em vez
 * de pedir um resumo novo ao backend: a mesma resposta já serve às duas telas e o cache do
 * React Query evita a segunda ida quando a pessoa abre o quadro em seguida.
 */

/**
 * Situação do prazo — mesma regra do cartão do quadro (ver components/flow/cartao-do-quadro).
 *
 * O prazo é gravado como o fim do dia, então "atrasado" é o instante já ter passado. "Hoje" sai da
 * comparação das duas datas já formatadas no fuso da escola, e não de uma segunda conta de fuso
 * que poderia discordar da data escrita no cartão.
 */
function situacaoDoPrazo(prazo: string) {
  const atrasado = new Date(prazo).getTime() < Date.now();
  return { atrasado, hoje: !atrasado && formatarData(prazo) === formatarData(new Date()) };
}

/** Cartão aberto é o que ainda não foi concluído, esteja em que lista estiver. */
function cartoesAbertos(listas: { cartoes: Cartao[] }[]): Cartao[] {
  return listas.flatMap((l) => l.cartoes).filter((c) => c.concluidoEm == null);
}

export function CartaoDeTarefas() {
  const { data: quadro, isLoading } = useMeuQuadro();

  if (isLoading) {
    return (
      <section className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  // Falha na leitura do quadro não vira aviso vermelho aqui: o Início já tem o seu, e um bloco
  // lateral gritando erro tira a atenção dos números que carregaram.
  if (!quadro) return null;

  const abertos = cartoesAbertos(quadro.listas);
  const comPrazo = abertos
    .filter((c) => c.prazo)
    .map((c) => ({ cartao: c, ...situacaoDoPrazo(c.prazo as string) }));

  const atrasadas = comPrazo.filter((x) => x.atrasado).length;
  const paraHoje = comPrazo.filter((x) => x.hoje).length;

  // Ordem por instante já resolve "atrasados primeiro, depois os de hoje": todo prazo vencido é
  // anterior a agora, e todo prazo de hoje que ainda vale é posterior.
  const urgentes = comPrazo
    .filter((x) => x.atrasado || x.hoje)
    .sort((a, b) => new Date(a.cartao.prazo as string).getTime() - new Date(b.cartao.prazo as string).getTime())
    .slice(0, 3);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-[17px] font-semibold md:text-[15.5px]">Minhas tarefas</h2>
        <Link
          href="/flow/tarefas"
          className="shrink-0 text-[13px] font-semibold text-primary hover:underline md:text-[12.5px]"
        >
          Abrir quadro
        </Link>
      </div>

      {abertos.length === 0 ? (
        // Quadro limpo não merece três zeros ocupando meia tela: uma linha diz o mesmo.
        <p className="text-[13.5px] text-muted-foreground">Nada atrasado por aqui.</p>
      ) : (
        <>
          {/* Três por linha mesmo no celular: são números curtos, e separá-los em duas linhas
              deixaria um cartão órfão do lado de um vazio. */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Estatistica
              className="px-3 pt-4 pb-3.5 sm:px-4.5 sm:pt-4.5 sm:pb-4"
              rotulo="Atrasadas"
              valor={atrasadas}
              tom={atrasadas > 0 ? "danger" : undefined}
            />
            <Estatistica
              className="px-3 pt-4 pb-3.5 sm:px-4.5 sm:pt-4.5 sm:pb-4"
              rotulo="Para hoje"
              valor={paraHoje}
            />
            <Estatistica
              className="px-3 pt-4 pb-3.5 sm:px-4.5 sm:pt-4.5 sm:pb-4"
              rotulo="Abertas"
              valor={abertos.length}
            />
          </div>

          {urgentes.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">Nada atrasado por aqui.</p>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {urgentes.map(({ cartao, atrasado }) => (
                <li key={cartao.id} className="border-b border-muted last:border-0">
                  <Link
                    href="/flow/tarefas"
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium md:text-[13.5px]">
                      {cartao.titulo}
                    </span>
                    <EtiquetaDoCartao tom={atrasado ? "danger" : "action"}>
                      {atrasado
                        ? `venceu ${formatarData(cartao.prazo, { day: "2-digit", month: "2-digit" })}`
                        : "hoje"}
                    </EtiquetaDoCartao>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
