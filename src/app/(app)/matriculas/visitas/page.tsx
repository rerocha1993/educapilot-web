"use client";

import type { ReactNode } from "react";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMetricasDosRelatos } from "@/lib/matriculas/use-funil";
import type { ItemDeMetricaDeRelato, MetricasDosRelatos } from "@/lib/matriculas/tipos";

const diaCurto = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export default function VisitasPage() {
  const { data, isLoading, isError } = useMetricasDosRelatos();

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">
          O que as visitas contaram
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Do relato de quem recebeu cada família, preenchido ao mover o card para Visitou.
        </p>
      </div>

      {isError && (
        <div role="alert" className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os relatos.
        </div>
      )}

      {isLoading && <Carregando />}

      {data && data.totalRelatos === 0 && (
        <section className="max-w-3xl rounded-[24px] border border-dashed border-border-dashed bg-card p-7 text-center">
          <p className="mx-auto max-w-md font-heading text-[17px] leading-snug">Nenhum relato ainda.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            A partir de agora, levar um card para Visitou pede o relato de quem recebeu a família, e é dele que esta página vive.
          </p>
        </section>
      )}

      {data && data.totalRelatos > 0 && <Conteudo m={data} />}
    </div>
  );
}

function Conteudo({ m }: { m: MetricasDosRelatos }) {
  return (
    <div className="grid min-w-0 max-w-6xl grid-cols-1 gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Tile
          rotulo="Visitas com relato"
          valor={inteiro.format(m.totalRelatos)}
          detalhe={
            m.visitasSemRelato > 0
              ? `${m.visitasSemRelato} ${m.visitasSemRelato === 1 ? "visita sem relato" : "visitas sem relato"} — os números abaixo não falam delas`
              : "todas as visitas têm relato"
          }
          alerta={m.visitasSemRelato > 0}
        />
        <Tile
          rotulo="Interesse médio"
          valor={m.interesseMedio != null ? `${decimal.format(m.interesseMedio)} / 5` : "—"}
          detalhe="o quanto as famílias saem querendo a vaga"
        />
        <Tile rotulo="Saíram querendo" valor={inteiro.format(m.quentes)} detalhe="nota 4 ou 5 — falta pouco ou nada para fechar" />
      </div>

      <Cartao titulo="Do que as famílias mais quiseram saber" texto="O que elas perguntam é o que elas temem. O topo desta lista é o que a apresentação da visita precisa responder antes de ser perguntado.">
        <Barras itens={m.porAssunto} rotulo="Assuntos" />
      </Cartao>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Cartao titulo="Como saíram da visita" texto="De 0 a 5, na ordem da escala. Passe o mouse ou toque para ler a frase de cada nota.">
          <Barras
            rotulo="Interesse"
            itens={m.distribuicaoDeInteresse.map((d) => ({
              id: String(d.nota),
              titulo: d.titulo,
              total: d.total,
              percentual: d.percentual,
              nota: d.nota,
              descricao: d.descricao,
            }))}
          />
        </Cartao>
        <Cartao titulo="Quem veio conhecer" texto="Casal decide diferente de mãe sozinha, e a conversa de depois muda com isso.">
          <Barras itens={m.porQuemVeio} rotulo="Quem veio" />
        </Cartao>
      </div>

      <Cartao
        titulo="O que elas disseram, nas palavras delas"
        texto="A objeção e o medo por trás dela, das visitas mais recentes. Isto não vira gráfico sem perder o que tem de útil — é para ler."
      >
        {m.vozes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há falas para mostrar.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {m.vozes.map((v) => (
              <li key={`${v.leadId}-${v.quando}`} className="flex min-w-0 flex-col gap-3 py-5 first:pt-1 last:pb-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-heading text-[15px] font-semibold">{v.nome}</span>
                  <span className="rounded-full bg-action-soft px-2 py-0.5 font-mono text-[11.5px] font-medium tabular-nums text-action-soft-foreground">
                    {v.interesse}/5
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{diaCurto.format(new Date(v.quando))}</span>
                </div>
                {v.objecao && <Fala rotulo="Objeção" texto={v.objecao} />}
                {v.medo && <Fala rotulo="Medo por trás" texto={v.medo} />}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function Fala({ rotulo, texto }: { rotulo: string; texto: string }) {
  return (
    <figure className="min-w-0 border-l-2 border-primary/40 pl-4">
      <figcaption className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">{rotulo}</figcaption>
      <blockquote className="mt-1 max-w-prose whitespace-pre-wrap break-words font-heading text-[15.5px] leading-relaxed">“{texto}”</blockquote>
    </figure>
  );
}

type ItemDeBarra = ItemDeMetricaDeRelato & { nota?: number; descricao?: string };

/**
 * Barras horizontais de uma série só: uma cor (a da marca), o comprimento é a quantidade. Linha zerada
 * fica, mais apagada: zero também é informação. Na escala 0 a 5 a cor esquenta com a nota.
 */
function Barras({ itens, rotulo }: { itens: ItemDeBarra[]; rotulo: string }) {
  const maior = Math.max(1, ...itens.map((i) => i.percentual));
  return (
    <ul aria-label={rotulo} className="flex flex-col gap-3">
      {itens.map((i) => {
        const zero = i.total === 0;
        const cor =
          i.nota != null ? `color-mix(in oklab, var(--action) ${20 + i.nota * 16}%, var(--muted-foreground) 30%)` : "var(--chart-1)";
        const texto = `${i.titulo}: ${i.total} ${i.total === 1 ? "visita" : "visitas"}, ${inteiro.format(i.percentual * 100)}%${i.descricao ? `. ${i.descricao}` : ""}`;
        return (
          <li key={i.id} title={texto} aria-label={texto} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className={cn("flex min-w-0 items-baseline gap-2", zero && "text-muted-foreground")}>
                {i.nota != null && <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{i.nota}</span>}
                <span className="min-w-0">{i.titulo}</span>
              </span>
              <span className={cn("shrink-0 font-mono text-[12.5px] tabular-nums", zero ? "text-muted-foreground" : "font-medium")}>
                {inteiro.format(i.percentual * 100)}%
                <span className="ml-1.5 text-muted-foreground">({i.total})</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: zero ? 0 : `${Math.max(2, (i.percentual / maior) * 100)}%`, background: cor }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Cartao({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-[24px] border border-border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-base font-semibold">{titulo}</h2>
      <p className="mb-5 mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{texto}</p>
      {children}
    </section>
  );
}

function Tile({ rotulo, valor, detalhe, alerta }: { rotulo: string; valor: string; detalhe: string; alerta?: boolean }) {
  return (
    <div className="min-w-0 rounded-[24px] bg-card px-5 py-4 shadow-[0_1px_2px_rgba(42,37,48,.05),0_2px_8px_rgba(42,37,48,.04)]">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{rotulo}</p>
      <p className="mt-1.5 font-mono text-[28px] font-medium leading-none tabular-nums tracking-[-.02em]">{valor}</p>
      <p className={cn("mt-2 text-[12.5px] leading-snug", alerta ? "text-action-soft-foreground" : "text-muted-foreground")}>{detalhe}</p>
    </div>
  );
}

function Carregando() {
  return (
    <div className="grid min-w-0 max-w-6xl grid-cols-1 gap-4" aria-busy>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-[24px]" />
      <Skeleton className="h-64 rounded-[24px]" />
    </div>
  );
}
