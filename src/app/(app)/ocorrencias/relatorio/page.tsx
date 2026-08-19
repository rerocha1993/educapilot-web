"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { cn } from "@/lib/utils";
import { useOccurrencesReport, type OccurrenceCategoria } from "@/lib/tasks/use-occurrences";

const CATEGORIA_DOT: Record<OccurrenceCategoria, string> = {
  Comportamento: "bg-warning",
  Saúde: "bg-destructive",
  Pedagógica: "bg-primary",
  Atraso: "bg-muted-foreground",
};

function toIso(d: Date) {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { start: toIso(start), end: toIso(end) };
}

export default function OcorrenciasRelatorioPage() {
  const [{ start, end }, setRange] = useState(defaultRange());
  const startDate = useMemo(() => new Date(start + "T00:00:00"), [start]);
  const endDate = useMemo(() => new Date(end + "T00:00:00"), [end]);

  const { data, isLoading, isError } = useOccurrencesReport(startDate, endDate);

  const maxCount = Math.max(1, ...(data?.byClass.map((c) => c.count) ?? [1]));
  const totalCount = data?.byClass.reduce((sum, c) => sum + c.count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden">
        <RotinaNav />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">
            Relatório de ocorrências · {new Date(start + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
            {new Date(end + "T00:00:00").toLocaleDateString("pt-BR")}
          </h1>
          <p className="text-sm text-muted-foreground">{totalCount} ocorrências no período.</p>
        </div>

        <div className="flex items-end gap-2 print:hidden">
          <Input
            type="date"
            value={start}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            className="h-9 w-40"
          />
          <Input
            type="date"
            value={end}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            className="h-9 w-40"
          />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o relatório.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-sm font-semibold">Ocorrências por turma</h2>

          {isLoading && <Skeleton className="h-32 w-full" />}

          {!isLoading && data?.byClass.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma ocorrência registrada no período.
            </p>
          )}

          <div className="flex flex-col gap-2.5">
            {data?.byClass.map((c) => (
              <div key={c.classId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm">{c.className}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-accent">
                  <div
                    className="h-full rounded bg-primary"
                    style={{ width: `${(c.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-sm font-semibold">Alunos com mais registros</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            A cor do ponto é a categoria mais comum do aluno no período — o backend não tem um
            conceito de gravidade separado.
          </p>

          {isLoading && <Skeleton className="h-32 w-full" />}

          {!isLoading && data?.topStudents.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem registros no período.</p>
          )}

          <div className="flex flex-col gap-2">
            {data?.topStudents.map((s) => (
              <div key={s.studentId} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 truncate">
                  <span className={cn("size-2 shrink-0 rounded-full", CATEGORIA_DOT[s.topCategoria])} />
                  <span className="truncate">{s.studentName}</span>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
