"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatarData } from "@/lib/format/date";
import { UNJUSTIFIED_REASON } from "@/lib/tasks/use-absences";
import type {
  MeetingAbsenceDto,
  MeetingOccurrenceDto,
  MeetingWeeklyReportDto,
} from "@/lib/tasks/use-meetings";
import type { WeeklyPlanDto } from "@/lib/tasks/use-weekly-plans";

// A diretora não vem à reunião para ler quatro painéis, e sim para decidir: a "pauta" é o que se
// consulta enquanto ela escreve. Por isso mora ao lado do formulário, em abas com contador, e
// cada aba é uma lista curta — texto comprido fica recolhido em "Ver mais".

export type FaltaDaSemana = MeetingAbsenceDto & { studentName: string };
export type OcorrenciaDaSemana = MeetingOccurrenceDto & { studentName: string };

type AbaDaPauta = "faltas" | "ocorrencias" | "observacao" | "planejamento";

/** Texto que passa de umas três linhas fica recolhido; o botão só aparece quando há o que mostrar. */
function TextoRecolhido({ texto, className }: { texto: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const longo = texto.length > 150 || texto.split("\n").length > 3;

  return (
    <div className={className}>
      <p className={cn("whitespace-pre-line break-words", !aberto && longo && "line-clamp-3")}>{texto}</p>
      {longo && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="mt-0.5 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {aberto ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}

function Vazio({ children }: { children: string }) {
  return <p className="py-2 text-[13px] text-muted-foreground">{children}</p>;
}

function Contador({ valor }: { valor: number }) {
  return (
    <span className="rounded bg-foreground/10 px-1.5 font-numeric text-[11px] leading-[18px] tabular-nums">
      {valor}
    </span>
  );
}

export function PautaDaSemana({
  faltas,
  ocorrencias,
  observacoes,
  planejamentos,
  carregandoRelatorio,
  carregandoPlanejamento,
  className,
}: {
  faltas: FaltaDaSemana[];
  ocorrencias: OcorrenciaDaSemana[];
  observacoes: MeetingWeeklyReportDto[];
  planejamentos: WeeklyPlanDto[];
  carregandoRelatorio: boolean;
  carregandoPlanejamento: boolean;
  className?: string;
}) {
  // Enquanto a pessoa não escolhe, abre a primeira aba que tem alguma coisa: abrir numa aba vazia faz a pauta
  // parecer vazia com dado logo ao lado.
  const [abaEscolhida, setAba] = useState<AbaDaPauta | null>(null);
  const aba: AbaDaPauta =
    abaEscolhida ??
    (faltas.length > 0
      ? "faltas"
      : ocorrencias.length > 0
        ? "ocorrencias"
        : observacoes.length > 0
          ? "observacao"
          : planejamentos.length > 0
            ? "planejamento"
            : "faltas");

  // Quantos alunos faltaram e quantas vezes: "quem falta mais" é o que a diretora bate o olho.
  const porAluno = new Map<string, number>();
  for (const f of faltas) porAluno.set(f.studentName, (porAluno.get(f.studentName) ?? 0) + 1);
  const maisFaltas = [...porAluno.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <section
      aria-label="Pauta da semana"
      className={cn("flex min-h-0 flex-col rounded-xl border border-border bg-card", className)}
    >
      <h2 className="px-4 pt-3.5 font-heading text-[15.5px] font-semibold">Pauta da semana</h2>

      <Tabs
        value={aba}
        onValueChange={(v) => setAba(v as AbaDaPauta)}
        className="min-h-0 flex-1 gap-0 px-4 pb-4 pt-2.5"
      >
        <TabsList className="group-data-horizontal/tabs:h-auto grid w-full grid-cols-2 gap-0.5 sm:grid-cols-4">
          <TabsTrigger value="faltas" className="min-h-11 min-w-0 flex-col gap-0.5 px-1 text-[12.5px] leading-tight">
            Faltas <Contador valor={faltas.length} />
          </TabsTrigger>
          <TabsTrigger value="ocorrencias" className="min-h-11 min-w-0 flex-col gap-0.5 px-1 text-[12.5px] leading-tight">
            Ocorrências <Contador valor={ocorrencias.length} />
          </TabsTrigger>
          <TabsTrigger value="observacao" className="min-h-11 min-w-0 flex-col gap-0.5 px-1 text-[12.5px] leading-tight">
            Observação <Contador valor={observacoes.length} />
          </TabsTrigger>
          <TabsTrigger value="planejamento" className="min-h-11 min-w-0 flex-col gap-0.5 px-1 text-[12.5px] leading-tight">
            Planejamento <Contador valor={planejamentos.length} />
          </TabsTrigger>
        </TabsList>

        {/* Rolagem própria: a pauta não estica a página, a lista é que rola. */}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 max-lg:max-h-80 lg:max-h-[calc(100vh-17rem)]">
          <TabsContent value="faltas" className="flex flex-col gap-2">
            {carregandoRelatorio && <Skeleton className="h-16 w-full" />}
            {!carregandoRelatorio && faltas.length === 0 && <Vazio>Nenhuma falta na semana.</Vazio>}

            {maisFaltas.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Quem mais faltou">
                {maisFaltas.map((t) => (
                  <span
                    key={t.nome}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    <span className="truncate">{t.nome}</span>
                    <span className="font-numeric text-muted-foreground">{t.total}</span>
                  </span>
                ))}
              </div>
            )}

            <ul className="flex flex-col divide-y divide-border">
              {faltas.map((f) => {
                const pendente = !f.reason || f.reason === UNJUSTIFIED_REASON;
                return (
                  <li key={f.id} className="flex flex-col gap-0.5 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 break-words font-medium">{f.studentName}</span>
                      <span className="shrink-0 font-numeric text-xs text-muted-foreground">
                        {formatarData(f.createdAt)}
                      </span>
                    </div>
                    {pendente ? (
                      <Badge variant="pending" className="h-5 px-2 text-[11px]">
                        Sem justificativa
                      </Badge>
                    ) : (
                      <TextoRecolhido texto={f.reason ?? ""} className="text-xs text-muted-foreground" />
                    )}
                  </li>
                );
              })}
            </ul>
          </TabsContent>

          <TabsContent value="ocorrencias">
            {carregandoRelatorio && <Skeleton className="h-16 w-full" />}
            {!carregandoRelatorio && ocorrencias.length === 0 && <Vazio>Nenhuma ocorrência na semana.</Vazio>}
            <ul className="flex flex-col divide-y divide-border">
              {ocorrencias.map((o) => (
                <li key={o.id} className="flex flex-col gap-1 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 break-words font-medium">{o.studentName}</span>
                    <span className="shrink-0 font-numeric text-xs text-muted-foreground">
                      {formatarData(o.createdAt)}
                    </span>
                  </div>
                  {o.description && <TextoRecolhido texto={o.description} className="text-xs text-muted-foreground" />}
                  {/* "na reunião em ocorrência aparece a ocorrência mas não aparece a solução" (2026-09). */}
                  {o.solution && (
                    <div className="text-xs">
                      <span className="font-medium text-foreground">Solução</span>
                      <TextoRecolhido texto={o.solution} className="text-muted-foreground" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="observacao">
            {carregandoRelatorio && <Skeleton className="h-16 w-full" />}
            {!carregandoRelatorio && observacoes.length === 0 && <Vazio>Nenhuma observação enviada.</Vazio>}
            <ul className="flex flex-col divide-y divide-border">
              {observacoes.map((w) => (
                <li key={w.id} className="flex flex-col gap-1 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Semana <span className="font-numeric">{w.weekOfMonth}</span>
                    </span>
                    <span className="font-numeric">{formatarData(w.createdAt)}</span>
                  </div>
                  {w.weeklyObservation && <TextoRecolhido texto={w.weeklyObservation} />}
                </li>
              ))}
            </ul>
          </TabsContent>

          {/* "na reunião pode trazer o planejamento das professoras pra saber o que foi trabalhado"
              (2026-09): cada campo do modelo vira uma seção recolhida em vez de uma parede de texto. */}
          <TabsContent value="planejamento" className="flex flex-col gap-3">
            {carregandoPlanejamento && <Skeleton className="h-16 w-full" />}
            {!carregandoPlanejamento && planejamentos.length === 0 && (
              <Vazio>Nenhum planejamento registrado.</Vazio>
            )}
            {planejamentos.map((p) => {
              const campos = p.fieldValues.filter((v) => v.value?.trim());
              return (
                <div key={p.id} className="rounded-lg border border-border">
                  <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                    {p.weeklyPlanTemplate?.name ?? "Planejamento"}
                    <span className="font-numeric"> · {campos.length} {campos.length === 1 ? "seção" : "seções"}</span>
                  </p>
                  {campos.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Sem campos preenchidos.</p>}
                  {campos.map((v) => (
                    <details key={v.weeklyPlanFieldId} className="group border-b border-border last:border-0">
                      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0 break-words">{v.weeklyPlanField?.label ?? "Campo"}</span>
                        <ChevronDown
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <p className="whitespace-pre-line break-words px-3 pb-2.5 text-xs text-muted-foreground">
                        {v.value}
                      </p>
                    </details>
                  ))}
                </div>
              );
            })}
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
