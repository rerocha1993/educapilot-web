"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { ConexaoFacebook } from "@/components/matriculas/conexao-facebook";
import { PainelDoLead } from "@/components/matriculas/painel-do-lead";
import { cn } from "@/lib/utils";
import { useContaMetaAds, useResultadosDosAnuncios } from "@/lib/matriculas/use-anuncios";
import { COR_DA_ETAPA, TITULO_PADRAO_DA_ETAPA, dataHoraCurta } from "@/lib/matriculas/rotulos";
import type {
  NumerosDeAnuncio,
  ResultadoDaCampanha,
  ResultadoDoAnuncio,
  ResultadoDoConjunto,
} from "@/lib/matriculas/tipos";

/** Como a Meta chama cada situação, em palavras de escola. */
const SITUACAO: Record<string, string> = {
  ACTIVE: "No ar",
  PAUSED: "Pausado",
  CAMPAIGN_PAUSED: "Campanha pausada",
  ADSET_PAUSED: "Conjunto pausado",
  ARCHIVED: "Arquivado",
  DELETED: "Apagado",
  DISAPPROVED: "Reprovado",
  PENDING_REVIEW: "Em análise",
  IN_PROCESS: "Em análise",
  WITH_ISSUES: "Com problema",
};

const real = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
/** Zero dias é "todo o período": o servidor conta as famílias de desde sempre. */
const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 0, rotulo: "Todo o período" },
];

const COLUNAS = "sm:grid-cols-[repeat(5,minmax(0,1fr))]";

/** O nome que a escola lê. Sem dados da Meta, o id, dito com todas as letras. */
function nomeDoAnuncio(a: ResultadoDoAnuncio) {
  return a.anuncio ?? `Anúncio ${a.anuncioId} (sem dados da Meta)`;
}

function pluralFamilias(n: number) {
  return `${n} ${n === 1 ? "família" : "famílias"}`;
}

export default function AnunciosPage() {
  const { data: conta, isLoading } = useContaMetaAds();
  const [dias, setDias] = useState(30);
  const { data: r, isLoading: carregando } = useResultadosDosAnuncios(dias);
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">Anúncios</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          O que cada anúncio trouxe até a matrícula. O Gerenciador de Anúncios sabe quantas conversas começaram; aqui você vê quantas
          viraram visita e matrícula.
        </p>
      </div>

      <div className="grid min-w-0 max-w-6xl grid-cols-1 gap-4">
        <section className="rounded-[24px] border border-border bg-card p-5">
          <h2 className="mb-3 font-heading text-base font-semibold">Facebook</h2>
          {isLoading || !conta ? <Skeleton className="h-16 rounded-2xl" /> : <ConexaoFacebook conta={conta} />}
        </section>

        <section className="min-w-0 rounded-[24px] border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-base font-semibold">Resultado</h2>
            <div role="radiogroup" aria-label="Período" className="flex rounded-lg bg-muted p-[3px]">
              {PERIODOS.map((p) => (
                <button
                  key={p.dias}
                  type="button"
                  role="radio"
                  aria-checked={dias === p.dias}
                  onClick={() => setDias(p.dias)}
                  className={cn("min-h-8 rounded-md px-3 text-[13px] font-medium", dias === p.dias ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  {p.rotulo}
                </button>
              ))}
            </div>
          </div>

          {carregando || !r ? (
            <Skeleton className="h-48 rounded-2xl" />
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Numero rotulo="Gasto">{real.format(r.gasto)}</Numero>
                <Numero rotulo="Famílias">{r.familias}</Numero>
                <Numero rotulo="Visitas">{r.visitas}</Numero>
                <Numero rotulo="Matrículas">{r.matriculas}</Numero>
                <Numero rotulo="Por matrícula">{r.custoPorMatricula != null ? real.format(r.custoPorMatricula) : "—"}</Numero>
              </dl>
              <p className="mt-3 text-[12.5px] text-muted-foreground">
                {r.todoOPeriodo
                  ? "Todo o período: as famílias de desde sempre e o gasto dos últimos meses que a Meta mostra."
                  : `Últimos ${r.dias} dias: o gasto do período e as famílias que chegaram nele.`}
              </p>
              {r.aviso && <p className="mt-1 text-[13px] text-muted-foreground">{r.aviso}</p>}

              {r.campanhas.length === 0 ? (
                <p className="mt-6 text-center text-sm text-muted-foreground">Nenhuma família veio de anúncio nesse período.</p>
              ) : (
                <div className="mt-5 flex flex-col gap-3">
                  {r.campanhas.map((c) => (
                    <Campanha key={c.campanhaId ?? c.nome ?? "sem-campanha"} campanha={c} onAbrirFamilia={setAberto} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Só para ler: mudar de etapa e editar continuam no Funil. */}
      <PainelDoLead id={aberto} titulos={{}} onFechar={() => setAberto(null)} />
    </div>
  );
}

function Campanha({ campanha: c, onAbrirFamilia }: { campanha: ResultadoDaCampanha; onAbrirFamilia: (leadId: string) => void }) {
  const noAr = c.conjuntos.some((j) => j.anuncios.some((a) => a.noAr));
  return (
    // A campanha no ar vem aberta e primeiro; a parada vem fechada. No CRM do Colégio a tela misturava tudo.
    <details open={noAr} className="group rounded-2xl border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">{c.nome ?? "Sem campanha"}</span>
        <Situacao noAr={noAr}>{noAr ? "No ar" : "Parada"}</Situacao>
        <span className="hidden font-mono text-[12.5px] tabular-nums text-muted-foreground sm:inline">
          {pluralFamilias(c.familias)} · {real.format(c.gasto)}
        </span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
        {c.conjuntos.map((j) => (
          <Conjunto key={j.conjuntoId ?? j.nome ?? "sem-conjunto"} conjunto={j} onAbrirFamilia={onAbrirFamilia} />
        ))}
      </div>
    </details>
  );
}

function Conjunto({ conjunto: j, onAbrirFamilia }: { conjunto: ResultadoDoConjunto; onAbrirFamilia: (leadId: string) => void }) {
  const noAr = j.anuncios.some((a) => a.noAr);
  return (
    <details open={noAr} className="group rounded-xl bg-muted/40">
      <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{j.nome ?? "Sem conjunto"}</span>
          {/* O público: quem a Meta mira. É o que explica por que um conjunto traz família e outro só gasta. */}
          {j.publico ? (
            <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
              <span className="font-semibold">Público:</span> {j.publico}
            </span>
          ) : (
            j.nome && <span className="mt-0.5 block text-[12px] text-muted-foreground">Público ainda não lido da Meta.</span>
          )}
        </span>
        <span className="hidden shrink-0 font-mono text-[12.5px] tabular-nums text-muted-foreground sm:inline">
          {pluralFamilias(j.familias)} · {real.format(j.gasto)}
        </span>
      </summary>
      <div className="px-3 pb-3">
        <div className="hidden justify-end border-b border-border px-1 pb-1.5 sm:flex">
          <div className={cn("grid w-[min(420px,52%)] shrink-0 grid-cols-1 gap-3 text-right text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground", COLUNAS)}>
            <span>Gasto</span>
            <span>Famílias</span>
            <span>Visitas</span>
            <span>Matrículas</span>
            <span>Por matrícula</span>
          </div>
        </div>
        <div className="flex flex-col">
          {j.anuncios.map((a) => (
            <Anuncio key={a.anuncioId} anuncio={a} onAbrirFamilia={onAbrirFamilia} />
          ))}
        </div>
      </div>
    </details>
  );
}

function Anuncio({ anuncio: a, onAbrirFamilia }: { anuncio: ResultadoDoAnuncio; onAbrirFamilia: (leadId: string) => void }) {
  return (
    <details className="group border-b border-border/60 last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-1 py-2.5 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
        <Miniatura anuncio={a} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn("truncate text-sm font-medium", a.semDadosDaMeta && "text-muted-foreground")}>{nomeDoAnuncio(a)}</span>
            {a.situacao && a.situacao !== "ACTIVE" && <Situacao noAr={false}>{SITUACAO[a.situacao] ?? a.situacao}</Situacao>}
          </span>
          {/* No celular a linha de números some da grade e entra aqui. */}
          <span className="mt-0.5 block font-mono text-[11.5px] tabular-nums text-muted-foreground sm:hidden">
            {a.gasto > 0 ? `${real.format(a.gasto)} · ` : ""}
            {pluralFamilias(a.familias)} · {a.matriculas} {a.matriculas === 1 ? "matrícula" : "matrículas"}
          </span>
        </span>
        <Numeros n={a} />
      </summary>

      <div className="flex flex-col gap-3 pb-3 pl-[58px] pr-1">
        {(a.titulo || a.texto) && (
          <div className="rounded-xl bg-card px-3 py-2.5 text-[13px]">
            {a.titulo && <p className="font-semibold">{a.titulo}</p>}
            {a.texto && <p className="mt-1 line-clamp-6 whitespace-pre-line text-muted-foreground">{a.texto}</p>}
          </div>
        )}
        {a.semDadosDaMeta && (
          <p className="text-[12.5px] text-muted-foreground">
            A Meta ainda não deu o nome deste anúncio. Ele é lido todo dia de madrugada; se foi apagado, o nome não volta.
          </p>
        )}

        {a.listaDeFamilias.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">Nenhuma família veio dele neste período.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {a.listaDeFamilias.map((f) => (
              <li key={f.leadId}>
                <button
                  type="button"
                  onClick={() => onAbrirFamilia(f.leadId)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-card"
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ background: COR_DA_ETAPA[f.etapa] }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{f.nomeResponsavel}</span>
                    {f.nomeCrianca && <span className="text-muted-foreground"> · {f.nomeCrianca}</span>}
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{TITULO_PADRAO_DA_ETAPA[f.etapa]}</span>
                  <span className="hidden shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground sm:inline">{dataHoraCurta(f.criadoEm)}</span>
                </button>
              </li>
            ))}
            {a.familias > a.listaDeFamilias.length && (
              <li className="px-2.5 text-[12px] text-muted-foreground">
                E mais {a.familias - a.listaDeFamilias.length}. As mais recentes estão acima; as outras estão no Funil.
              </li>
            )}
          </ul>
        )}
      </div>
    </details>
  );
}

/** A imagem do anúncio, quando a Meta deu. A URL é de CDN com validade: se quebrar, o quadrado fica vazio. */
function Miniatura({ anuncio: a }: { anuncio: ResultadoDoAnuncio }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-foreground/[.06]" aria-hidden>
      {a.miniaturaUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a imagem é de CDN da Meta, com assinatura e validade.
        <img src={a.miniaturaUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
      )}
    </span>
  );
}

function Numeros({ n }: { n: NumerosDeAnuncio }) {
  return (
    <span className={cn("hidden w-[min(420px,52%)] shrink-0 grid-cols-1 gap-3 text-right font-mono text-[12.5px] tabular-nums sm:grid", COLUNAS)}>
      <span>{n.gasto > 0 ? real.format(n.gasto) : "—"}</span>
      <span>{n.familias}</span>
      <span>{n.visitas}</span>
      <span className="font-semibold">{n.matriculas}</span>
      <span>{n.custoPorMatricula != null ? real.format(n.custoPorMatricula) : "—"}</span>
    </span>
  );
}

function Situacao({ noAr, children }: { noAr: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        noAr ? "bg-success-soft text-success-soft-foreground" : "bg-foreground/[.06] text-foreground/70"
      )}
    >
      {children}
    </span>
  );
}

function Numero({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3.5">
      <dt className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 font-heading text-xl font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
