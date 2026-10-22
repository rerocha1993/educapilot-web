import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { abaixoDaMedia, formatarNota } from "@/lib/notas/calculos";
import type { Boletim, MateriaDoBoletim, PeriodoDoBoletim, ResultadoDoPeriodo } from "@/lib/notas/use-notas";
import { cn } from "@/lib/utils";

/**
 * O boletim do aluno: matéria × período com as médias, a média do ano, a situação e o comportamento.
 *
 * Serve três lugares: a tela da equipe, o papel (A4 retrato; menu e botões levam `print:hidden` na
 * página) e o portal da família (`variante="portal"`: um cartão por matéria, sem tabela larga, só
 * com os períodos que a escola publicou). No tipo Descritivo não há número: vale o texto.
 */

const NOME_DA_DIVISAO: Record<string, string> = { Bimestre: "bimestral", Trimestre: "trimestral", Semestre: "semestral" };

function resultadoDe(materia: MateriaDoBoletim, periodoId: string): ResultadoDoPeriodo | undefined {
  return materia.periodos.find((r) => r.periodoId === periodoId);
}

function Valor({ media, conceito, minima }: { media?: number | null; conceito?: string | null; minima?: number | null }) {
  if (media == null && conceito == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("font-numeric font-semibold", abaixoDaMedia(media, minima) && "text-destructive print:text-black")}>
      {conceito ?? formatarNota(media)}
      {conceito != null && media != null && <span className="ml-1 text-[11px] font-normal text-muted-foreground">({formatarNota(media)})</span>}
    </span>
  );
}

function Situacao({ texto }: { texto?: string | null }) {
  if (texto == null) return null;
  return (
    <Badge variant={texto.toLowerCase().startsWith("acima") ? "success" : "overdue"} className="print:border-black/30">
      {texto}
    </Badge>
  );
}

function CabecalhoDoPeriodo({ periodo, mostrarSituacao }: { periodo: PeriodoDoBoletim; mostrarSituacao: boolean }) {
  return (
    <>
      {periodo.nome}
      {mostrarSituacao && !periodo.publicado && <span className="block text-[10px] font-normal normal-case tracking-normal text-action print:hidden">não publicado</span>}
    </>
  );
}

export function BoletimDoAluno({
  boletim,
  escola,
  variante = "equipe",
}: {
  boletim: Boletim;
  escola?: string | null;
  variante?: "equipe" | "portal";
}) {
  const portal = variante === "portal";
  const { tipo, periodos, materias, comportamento, mediaMinima } = boletim;
  const comNumero = tipo === "Nota" || tipo === "Conceito";
  const comportamentoDe = (periodoId: string) => comportamento.find((c) => c.periodoId === periodoId);
  const comObservacao = comportamento.filter((c) => c.observacao != null && c.observacao !== "");

  const titulo = (
    <header className={cn("rounded-xl border border-border bg-card p-4", !portal && "md:p-5 print:rounded-none print:border-0 print:border-b-2 print:border-black print:px-0 print:pt-0")}>
      {escola && <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action print:text-[10pt] print:text-black">{escola}</p>}
      <p className="mt-0.5 text-sm text-muted-foreground print:text-[10pt]">Boletim escolar {boletim.ano}</p>
      <h1 className="mt-1 break-words font-heading text-[22px] font-semibold leading-tight tracking-[-.02em] md:text-[26px] print:text-[20pt]">
        {boletim.aluno.nome}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground print:text-[10pt]">
        {boletim.aluno.turma && <>Turma {boletim.aluno.turma} · </>}
        Avaliação {NOME_DA_DIVISAO[boletim.divisao] ?? boletim.divisao.toLowerCase()}
        {tipo === "Nota" && mediaMinima != null && <> · média mínima {formatarNota(mediaMinima)}</>}
      </p>
    </header>
  );

  if (tipo == null || periodos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {titulo}
        <p className="rounded-xl border border-dashed border-border-dashed bg-card px-5 py-7 text-center text-sm text-muted-foreground">
          {portal ? "A escola ainda não publicou nenhum período do boletim." : "Esta turma ainda não foi configurada neste ano, ou o ano não tem períodos."}
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------- portal: cartões

  if (portal) {
    return (
      <div className="flex flex-col gap-3">
        {titulo}
        {materias.map((m) => (
          <section key={m.materiaDaTurmaId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-w-0 break-words font-heading text-[15px] font-semibold">{m.materia}</h2>
              {comNumero && <Situacao texto={m.situacao} />}
            </div>
            <ul className="mt-2 flex flex-col divide-y divide-border">
              {periodos.map((p) => {
                const r = resultadoDe(m, p.id);
                return (
                  <li key={p.id} className="py-1.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">{p.nome}</span>
                      {tipo !== "Descritivo" && <Valor media={r?.media} conceito={r?.conceito} minima={mediaMinima} />}
                    </div>
                    {tipo === "Descritivo" && <p className="mt-0.5 whitespace-pre-line break-words">{r?.descritivo ?? <span className="text-muted-foreground">Sem parecer neste período.</span>}</p>}
                  </li>
                );
              })}
              {comNumero && (m.mediaDoAno != null || m.conceitoDoAno != null) && (
                <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm font-semibold">
                  <span>Média do ano</span>
                  <Valor media={m.mediaDoAno} conceito={m.conceitoDoAno} minima={mediaMinima} />
                </li>
              )}
            </ul>
          </section>
        ))}
        {materias.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma matéria neste boletim.</p>}

        {comportamento.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-[15px] font-semibold">Comportamento</h2>
            <ul className="mt-2 flex flex-col divide-y divide-border">
              {periodos.map((p) => {
                const c = comportamentoDe(p.id);
                if (!c) return null;
                return (
                  <li key={p.id} className="py-1.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">{p.nome}</span>
                      <span className="font-semibold">{c.nome ?? c.conceito}</span>
                    </div>
                    {c.observacao != null && <p className="mt-0.5 break-words text-[13px] text-muted-foreground">{c.observacao}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- equipe e papel: tabela

  return (
    <article className="mx-auto flex w-full max-w-[210mm] min-w-0 flex-col gap-4 text-foreground print:max-w-none print:gap-3">
      <style media="print">{"@page { size: A4 portrait; margin: 12mm; }"}</style>
      {titulo}

      {tipo === "Descritivo" ? (
        materias.map((m) => (
          <section key={m.materiaDaTurmaId} className="rounded-xl border border-border bg-card p-4 print:break-inside-avoid print:rounded-none print:border-x-0 print:border-t-0 print:px-0">
            <h2 className="font-heading text-[15px] font-semibold print:text-[12pt]">{m.materia}</h2>
            <ul className="mt-1.5 flex flex-col gap-2">
              {periodos.map((p) => {
                const r = resultadoDe(m, p.id);
                return (
                  <li key={p.id} className="text-sm print:text-[10pt]">
                    <p className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground print:text-[8pt]">
                      <CabecalhoDoPeriodo periodo={p} mostrarSituacao />
                    </p>
                    <p className="whitespace-pre-line break-words">{r?.descritivo ?? <span className="text-muted-foreground">Sem parecer neste período.</span>}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      ) : (
        <div className="max-w-full overflow-x-auto rounded-xl border border-border bg-card print:overflow-visible print:rounded-none print:border-black/40">
          <table className="w-full border-collapse text-sm print:text-[10pt]">
            <thead>
              <tr className="border-b border-border bg-muted/50 print:bg-transparent">
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground print:text-[8pt]">Matéria</th>
                {periodos.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground print:text-[8pt]">
                    <CabecalhoDoPeriodo periodo={p} mostrarSituacao />
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground print:text-[8pt]">Média do ano</th>
                {tipo === "Nota" && <th className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground print:text-[8pt]">Situação</th>}
              </tr>
            </thead>
            <tbody>
              {materias.map((m) => (
                <tr key={m.materiaDaTurmaId} className="border-b border-border last:border-b-0 print:break-inside-avoid">
                  <th scope="row" className="px-3 py-1.5 text-left font-medium">
                    {m.materia}
                    {m.professor != null && <span className="block text-[11px] font-normal text-muted-foreground print:text-[8pt]">{m.professor}</span>}
                  </th>
                  {periodos.map((p) => {
                    const r = resultadoDe(m, p.id);
                    return (
                      <td key={p.id} className="px-2 py-1.5 text-center">
                        <Valor media={r?.media} conceito={r?.conceito} minima={mediaMinima} />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center">
                    <Valor media={m.mediaDoAno} conceito={m.conceitoDoAno} minima={mediaMinima} />
                  </td>
                  {tipo === "Nota" && (
                    <td className="px-2 py-1.5 text-center">
                      <Situacao texto={m.situacao} />
                    </td>
                  )}
                </tr>
              ))}
              {materias.length === 0 && (
                <tr>
                  <td colSpan={periodos.length + 3} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhuma matéria neste boletim.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {comportamento.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 print:break-inside-avoid print:rounded-none print:border-x-0 print:border-t-0 print:px-0">
          <h2 className="font-heading text-[15px] font-semibold print:text-[12pt]">Comportamento</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm print:text-[10pt]">
            {periodos.map((p) => {
              const c = comportamentoDe(p.id);
              return (
                <span key={p.id}>
                  <span className="text-muted-foreground">{p.nome}: </span>
                  <span className="font-semibold">{c ? (c.nome ?? c.conceito) : "—"}</span>
                </span>
              );
            })}
          </div>
          {comObservacao.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-[13px] text-muted-foreground print:text-[9pt]">
              {comObservacao.map((c) => (
                <li key={c.periodoId} className="break-words">
                  <strong className="text-foreground">{periodos.find((p) => p.id === c.periodoId)?.nome}:</strong> {c.observacao}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Legenda>
        {tipo === "Conceito" && boletim.conceitos.length > 0 && <>Conceitos: {boletim.conceitos.map((c) => `${c.sigla} = ${c.nome}`).join("; ")}. </>}
        {boletim.conceitosDeComportamento.length > 0 && <>Comportamento: {boletim.conceitosDeComportamento.map((c) => `${c.sigla} = ${c.nome}`).join("; ")}.</>}
      </Legenda>
    </article>
  );
}

function Legenda({ children }: { children: ReactNode }) {
  return <p className="text-[12px] leading-snug text-muted-foreground print:text-[8.5pt]">{children}</p>;
}
