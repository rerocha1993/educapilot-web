import Link from "next/link";
import { ChevronRight, RefreshCw, Salad } from "lucide-react";

import { ChipsDeEtiquetas } from "@/components/relacionamento/cardapio/comum";
import { DIAS_DO_CARDAPIO, posicaoDaRefeicao, rotuloDaRefeicao } from "@/lib/relacionamento/cardapio-vocabulario";
import type { CardapioDaFamilia, DiaDoCardapioDaFamilia, FilhoDoCardapio } from "@/lib/relacionamento/use-portal-cardapio";
import { diaEMes } from "@/lib/tasks/calendario-datas";
import { cn } from "@/lib/utils";

const rotuloDoDia = (id: string) => DIAS_DO_CARDAPIO.find((d) => d.id === id)?.rotulo ?? id;

/** "Ana", "Ana e Bia", "Ana, Bia e Caio": o primeiro nome dos filhos que seguem este cardápio. */
export function nomesDosFilhos(filhos: readonly FilhoDoCardapio[]): string {
  const nomes = filhos.map((f) => f.nome.split(" ")[0]);
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/** A refeição, o prato e as etiquetas dele, na ordem do dia. */
function RefeicoesDoDia({ dia }: { dia: DiaDoCardapioDaFamilia }) {
  const itens = [...dia.itens].sort((a, b) => posicaoDaRefeicao(a.refeicao) - posicaoDaRefeicao(b.refeicao));
  return (
    <ul className="flex flex-col divide-y divide-border">
      {itens.map((i) => (
        <li key={i.refeicao} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
          <span className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">{rotuloDaRefeicao(i.refeicao)}</span>
          <span className="text-[15px] leading-snug break-words">{i.descricao}</span>
          <ChipsDeEtiquetas etiquetas={i.etiquetas} />
        </li>
      ))}
    </ul>
  );
}

/** O título do cardápio e para quem é, quando a família tem mais de um cardápio na semana. */
export function CabecalhoDoCardapio({ cardapio, mostrarFilhos }: { cardapio: CardapioDaFamilia; mostrarFilhos: boolean }) {
  const titulo = cardapio.titulo ?? (cardapio.escolaToda ? "Cardápio da escola" : "Cardápio da turma");
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <h2 className="font-heading text-[16px] font-semibold tracking-[-.02em]">{titulo}</h2>
      {mostrarFilhos && cardapio.filhos.length > 0 && (
        <span className="text-[13px] text-muted-foreground">para {nomesDosFilhos(cardapio.filhos)}</span>
      )}
      {cardapio.atualizado && (
        <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-2 py-0.5 text-[12px] font-semibold text-warning-soft-foreground">
          <RefreshCw aria-hidden className="size-3" /> Atualizado pela escola
        </span>
      )}
    </div>
  );
}

/** O cartão do dia de um cardápio. O de hoje ganha o laranja do portal e a palavra "hoje". */
export function CartaoDoDia({ dia }: { dia: DiaDoCardapioDaFamilia }) {
  return (
    <article
      aria-label={`${rotuloDoDia(dia.dia)}, ${diaEMes(dia.data)}`}
      className={cn("rounded-xl border bg-card p-3", dia.hoje ? "border-action-border ring-1 ring-action-border" : "border-border")}
    >
      <h3 className="mb-2 flex items-baseline justify-between gap-2 text-[14px] font-semibold">
        <span>{rotuloDoDia(dia.dia)}</span>
        <span className={cn("text-[12.5px] font-normal tabular-nums", dia.hoje ? "font-semibold text-action-soft-foreground" : "text-muted-foreground")}>
          {dia.hoje ? "hoje · " : ""}
          {diaEMes(dia.data)}
        </span>
      </h3>
      <RefeicoesDoDia dia={dia} />
    </article>
  );
}

/** O dia de hoje no alto da tela: um cartão grande, com o nome de quem segue cada cardápio. */
export function CartaoDeHoje({ cardapio, mostrarFilhos }: { cardapio: CardapioDaFamilia; mostrarFilhos: boolean }) {
  const hoje = cardapio.dias.find((d) => d.hoje);
  if (!hoje) return null;

  return (
    <section aria-label="Cardápio de hoje" className="rounded-xl border border-action-border bg-action-soft p-3.5 text-action-soft-foreground">
      <h2 className="mb-2 flex flex-wrap items-center gap-x-2 text-[15px] font-semibold">
        <Salad aria-hidden className="size-4" /> Hoje
        {mostrarFilhos && cardapio.filhos.length > 0 && (
          <span className="text-[13px] font-normal">· {nomesDosFilhos(cardapio.filhos)}</span>
        )}
      </h2>
      <div className="rounded-lg bg-card p-3 text-foreground">
        <RefeicoesDoDia dia={hoje} />
      </div>
    </section>
  );
}

/** O resumo do Início: o que se serve hoje, em poucas linhas, e um toque para a semana. */
export function ResumoDoCardapioDeHoje({ cardapios }: { cardapios: readonly CardapioDaFamilia[] }) {
  const comHoje = cardapios.map((c) => ({ c, hoje: c.dias.find((d) => d.hoje) })).filter((x) => x.hoje);
  if (comHoje.length === 0) return null;

  const varios = comHoje.length > 1;
  return (
    <Link
      href="/responsavel/cardapio"
      className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Salad aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Cardápio de hoje</span>
        {comHoje.map(({ c, hoje }) => (
          <span key={c.id} className="mt-0.5 block text-[13px] text-muted-foreground">
            {varios && <span className="font-semibold text-foreground">{nomesDosFilhos(c.filhos)}: </span>}
            {[...(hoje?.itens ?? [])]
              .sort((a, b) => posicaoDaRefeicao(a.refeicao) - posicaoDaRefeicao(b.refeicao))
              .slice(0, 3)
              .map((i) => `${rotuloDaRefeicao(i.refeicao)}: ${i.descricao}`)
              .join(" · ")}
          </span>
        ))}
      </span>
      <ChevronRight aria-hidden className="mt-2.5 size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
