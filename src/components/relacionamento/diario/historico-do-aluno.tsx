"use client";

import { useMemo } from "react";
import { Moon } from "lucide-react";

import { diaDaSemanaCurto, diaEMesCurto, EtiquetaDoDiario, somarDias } from "@/components/relacionamento/diario/comum";
import { ErroDeCarga } from "@/components/rh/campo";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACEITACOES,
  duracaoLegivel,
  rotuloDoSubtipo,
  temperaturaLegivel,
} from "@/lib/relacionamento/diario-vocabulario";
import { useHistoricoDoAluno, type DiarioDoAluno } from "@/lib/relacionamento/use-diario";
import { cn } from "@/lib/utils";

/** Quantos dias o histórico mostra (o servidor aceita até 62). */
const DIAS = 14;

function minutosDeSono(d: DiarioDoAluno | undefined): number {
  return (d?.registros ?? []).filter((r) => r.tipo === "Sono").reduce((soma, r) => soma + (r.duracaoMinutos ?? 0), 0);
}

const COR_DA_ACEITACAO = ["bg-destructive", "bg-warning-soft-foreground", "bg-warning-soft-foreground/70", "bg-success-soft-foreground/70", "bg-success-soft-foreground"];

/**
 * Os últimos 14 dias do aluno: as barras do sono (CSS puro, sem biblioteca de gráfico) e uma linha
 * por dia com a aceitação das refeições, a higiene, o humor e a temperatura. É a escola vendo o
 * que a família vê, mais o que ainda está em rascunho.
 */
export function HistoricoDoAluno({ studentId, ate }: { studentId: number; ate: string }) {
  const de = somarDias(ate, -(DIAS - 1));
  const { data, isLoading, isError, refetch } = useHistoricoDoAluno(studentId, de, ate);

  const dias = useMemo(() => Array.from({ length: DIAS }, (_, i) => somarDias(de, i)), [de]);
  const porData = useMemo(() => new Map((data?.dias ?? []).map((d) => [d.data, d])), [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (isError) return <ErroDeCarga texto="Não foi possível carregar o histórico." onTentar={() => refetch()} />;

  const totais = dias.map((d) => minutosDeSono(porData.get(d)));
  // A escala mínima é de 3h: um dia de 20 minutos não vira uma barra gigante.
  const escala = Math.max(180, ...totais);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Sono dos últimos 14 dias" className="rounded-xl border border-border p-3">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Moon aria-hidden className="size-4" /> Sono por dia
        </h3>
        <ol className="mt-2 flex h-24 items-end gap-1">
          {dias.map((d, i) => {
            const minutos = totais[i];
            const altura = minutos > 0 ? Math.max(6, Math.round((minutos / escala) * 100)) : 0;
            return (
              <li key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="sr-only">
                  {diaEMesCurto(d)}: {minutos > 0 ? duracaoLegivel(minutos) : "sem sono lançado"}
                </span>
                <div aria-hidden className="flex w-full flex-1 items-end">
                  <div
                    title={`${diaEMesCurto(d)}: ${minutos > 0 ? duracaoLegivel(minutos) : "sem sono lançado"}`}
                    className={cn("w-full rounded-t-[3px]", minutos > 0 ? "bg-primary" : "bg-muted")}
                    style={{ height: minutos > 0 ? `${altura}%` : "3px" }}
                  />
                </div>
                <span aria-hidden className="text-[9.5px] leading-none text-muted-foreground tabular-nums">
                  {d.slice(8)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-1 text-[11.5px] text-muted-foreground">Escala até {duracaoLegivel(escala)}. Cada barra é um dia.</p>
      </section>

      <section aria-label="Dia a dia" className="flex flex-col gap-1.5">
        {[...dias].reverse().map((d) => {
          const diario = porData.get(d);
          if (!diario) {
            return (
              <p key={d} className="flex items-center gap-2 px-1 text-[12.5px] text-muted-foreground">
                <span className="w-16 tabular-nums">
                  {diaDaSemanaCurto(d)} {diaEMesCurto(d)}
                </span>
                sem diário
              </p>
            );
          }
          const refeicoes = diario.registros.filter((r) => r.tipo === "Alimentacao");
          const higiene = diario.registros.filter((r) => r.tipo === "Higiene").length;
          const humores = [...new Set(diario.registros.filter((r) => r.tipo === "Humor").map((r) => rotuloDoSubtipo("Humor", r.subtipo)))];
          const temperaturas = diario.registros.filter((r) => r.tipo === "Saude" && r.subtipo === "Temperatura" && r.valor !== null);
          const sono = minutosDeSono(diario);

          return (
            <article key={d} className="rounded-xl border border-border bg-card p-2.5">
              <header className="flex items-center gap-2">
                <h4 className="text-[13px] font-semibold tabular-nums">
                  {diaDaSemanaCurto(d)} {diaEMesCurto(d)}
                </h4>
                <EtiquetaDoDiario status={diario.status} atualizado={diario.atualizado} />
              </header>
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-[12.5px]">
                {refeicoes.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">Refeições</dt>
                    <dd className="flex flex-wrap gap-1">
                      {refeicoes.map((r) => {
                        const peso = ACEITACOES.find((a) => a.id === r.nivel)?.peso ?? 0;
                        return (
                          <span
                            key={r.id}
                            title={`${rotuloDoSubtipo("Alimentacao", r.subtipo)}: ${r.nivel}`}
                            className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5"
                          >
                            <span aria-hidden className={cn("size-2 rounded-full", COR_DA_ACEITACAO[peso])} />
                            {rotuloDoSubtipo("Alimentacao", r.subtipo, true)} · {r.nivel}
                          </span>
                        );
                      })}
                    </dd>
                  </>
                )}
                {sono > 0 && (
                  <>
                    <dt className="text-muted-foreground">Sono</dt>
                    <dd className="tabular-nums">{duracaoLegivel(sono)}</dd>
                  </>
                )}
                {higiene > 0 && (
                  <>
                    <dt className="text-muted-foreground">Higiene</dt>
                    <dd className="tabular-nums">{higiene} {higiene === 1 ? "registro" : "registros"}</dd>
                  </>
                )}
                {humores.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">Humor</dt>
                    <dd>{humores.join(", ")}</dd>
                  </>
                )}
                {temperaturas.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">Temperatura</dt>
                    <dd className="tabular-nums">{temperaturas.map((t) => temperaturaLegivel(t.valor)).join(" · ")}</dd>
                  </>
                )}
              </dl>
              {diario.recadoGeral && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted-foreground">{diario.recadoGeral}</p>}
            </article>
          );
        })}
      </section>
    </div>
  );
}
