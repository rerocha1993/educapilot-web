"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { ConexaoFacebook } from "@/components/matriculas/conexao-facebook";
import { cn } from "@/lib/utils";
import { useContaMetaAds, useResultadosDosAnuncios } from "@/lib/matriculas/use-anuncios";
import type { ResultadoDoAnuncio } from "@/lib/matriculas/tipos";

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

interface Campanha {
  nome: string;
  anuncios: ResultadoDoAnuncio[];
  noAr: boolean;
  familias: number;
  gasto: number;
}

/**
 * Os anúncios por campanha. A campanha no ar vem aberta e primeiro; a parada vem fechada. No CRM do
 * Colégio a tela misturava tudo, e o que estava rodando se perdia entre os antigos.
 */
function porCampanha(anuncios: ResultadoDoAnuncio[]): Campanha[] {
  const grupos = new Map<string, ResultadoDoAnuncio[]>();
  for (const a of anuncios) {
    const nome = a.campanha ?? "Sem campanha";
    grupos.set(nome, [...(grupos.get(nome) ?? []), a]);
  }
  return [...grupos.entries()]
    .map(([nome, lista]) => ({
      nome,
      anuncios: lista,
      noAr: lista.some((a) => a.noAr),
      familias: lista.reduce((s, a) => s + a.familias, 0),
      gasto: lista.reduce((s, a) => s + a.gasto, 0),
    }))
    .sort((a, b) => Number(b.noAr) - Number(a.noAr) || b.familias - a.familias || b.gasto - a.gasto);
}

const real = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PERIODOS = [7, 30, 90];

export default function AnunciosPage() {
  const { data: conta, isLoading } = useContaMetaAds();
  const [dias, setDias] = useState(30);
  const { data: r, isLoading: carregando } = useResultadosDosAnuncios(dias);

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
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={dias === p}
                  onClick={() => setDias(p)}
                  className={cn("min-h-8 rounded-md px-3 text-[13px] font-medium", dias === p ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  {p} dias
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
              {r.aviso && <p className="mt-3 text-[13px] text-muted-foreground">{r.aviso}</p>}

              {r.anuncios.length === 0 ? (
                <p className="mt-6 text-center text-sm text-muted-foreground">Nenhuma família veio de anúncio nesse período.</p>
              ) : (
                <div className="mt-5 flex flex-col gap-3">
                  {porCampanha(r.anuncios).map((c) => (
                    <details key={c.nome} open={c.noAr} className="group rounded-2xl border border-border">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
                        <span className="min-w-0 flex-1 truncate font-medium">{c.nome}</span>
                        <Situacao noAr={c.noAr}>{c.noAr ? "No ar" : "Parada"}</Situacao>
                        <span className="hidden font-mono text-[12.5px] tabular-nums text-muted-foreground sm:inline">
                          {c.familias} {c.familias === 1 ? "família" : "famílias"} · {real.format(c.gasto)}
                        </span>
                      </summary>
                      <div className="overflow-x-auto border-t border-border px-4">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                              <th className="py-2 pr-3 font-bold">Anúncio</th>
                              <th className="px-3 py-2 text-right font-bold">Gasto</th>
                              <th className="px-3 py-2 text-right font-bold">Famílias</th>
                              <th className="px-3 py-2 text-right font-bold">Visitas</th>
                              <th className="px-3 py-2 text-right font-bold">Matrículas</th>
                              <th className="py-2 pl-3 text-right font-bold">Por matrícula</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.anuncios.map((a) => (
                              <tr key={a.anuncioId} className="border-b border-border/60 last:border-0">
                                <td className="py-2.5 pr-3">
                                  <p className="flex items-center gap-2 font-medium">
                                    {a.anuncio ?? `Anúncio ${a.anuncioId}`}
                                    {a.situacao && a.situacao !== "ACTIVE" && <Situacao noAr={false}>{SITUACAO[a.situacao] ?? a.situacao}</Situacao>}
                                  </p>
                                  {a.conjunto && <p className="text-[12px] text-muted-foreground">{a.conjunto}</p>}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{a.gasto > 0 ? real.format(a.gasto) : "—"}</td>
                                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{a.familias}</td>
                                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{a.visitas}</td>
                                <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold">{a.matriculas}</td>
                                <td className="py-2.5 pl-3 text-right font-mono tabular-nums">{a.custoPorMatricula != null ? real.format(a.custoPorMatricula) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
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
