"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileBarChart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { cn } from "@/lib/utils";
import { useClasses } from "@/lib/kernel/use-classes";
import { useAvailableReports, REPORT_DATA_SOURCE_LABELS, type ReportTypeDto } from "@/lib/tasks/use-reports";
import { useOccurrencesReport } from "@/lib/tasks/use-occurrences";
import { useAbsences, UNJUSTIFIED_REASON } from "@/lib/tasks/use-absences";
import { useWeeklyObservations } from "@/lib/tasks/use-weekly-observations";
import { useMeetings, useMeetingReport } from "@/lib/tasks/use-meetings";

// Reescrito (2026-09, feedback do cliente) — "relatorios precisa cadastrar o tipo de
// relatorio, precisamos bolar o formato". Cada tipo cadastrado em /relatorios/config
// aponta pra um DataSource — um relatório que já existe no sistema (Ocorrências,
// Faltas, Observação semanal, indicadores de Reunião). Aqui a tela lista os tipos e,
// ao escolher um, pede os filtros que ele define (turma/período) e renderiza os
// dados reais na hora — não é geração de arquivo, é a mesma ideia de "relatório na
// tela" já usada no resto do sistema (Ocorrências, Reuniões).

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function RelatoriosPage() {
  const { data: reports, isLoading, isError } = useAvailableReports();
  const { data: classes } = useClasses();

  const [selected, setSelected] = useState<ReportTypeDto | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [{ start, end }, setRange] = useState(defaultRange());

  function selectType(r: ReportTypeDto) {
    setSelected(r);
    setClassId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Central de relatórios</h1>
          <p className="text-sm text-muted-foreground">Escolha um tipo de relatório pra gerar na hora.</p>
        </div>
        <Link
          href="/relatorios/config"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-3.5" />
          Configurar tipos
        </Link>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os relatórios.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}

        {!isLoading && (reports?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum tipo de relatório cadastrado ainda.{" "}
            <Link href="/relatorios/config" className="text-primary hover:underline">
              Criar o primeiro
            </Link>
          </p>
        )}

        {reports?.map((r) => (
          <button
            key={r.id}
            onClick={() => selectType(r)}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors",
              selected?.id === r.id ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <FileBarChart className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">
                {REPORT_DATA_SOURCE_LABELS[r.dataSource] ?? r.dataSource} ·{" "}
                {[r.requiresClass && "por turma", r.requiresDateRange && "por período"]
                  .filter(Boolean)
                  .join(" · ") || "sem filtros"}
              </p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-sm font-semibold">{selected.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {selected.requiresClass && (
                <Select value={classId?.toString() ?? ""} onValueChange={(v) => v && setClassId(Number(v))}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue placeholder="Turma">
                      {() => classes?.find((c) => c.id === classId)?.className ?? "Turma"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selected.requiresDateRange && (
                <>
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
                </>
              )}
            </div>
          </div>

          {selected.requiresClass && classId === null ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Selecione uma turma pra gerar.</p>
          ) : (
            <ReportBody type={selected} classId={classId} start={start} end={end} />
          )}
        </div>
      )}
    </div>
  );
}

function ReportBody({
  type,
  classId,
  start,
  end,
}: {
  type: ReportTypeDto;
  classId: number | null;
  start: string;
  end: string;
}) {
  switch (type.dataSource) {
    case "Ocorrencias":
      return <OcorrenciasReportBody classId={classId} start={start} end={end} />;
    case "Faltas":
      return <FaltasReportBody classId={classId} start={start} end={end} />;
    case "ObservacaoSemanal":
      return <ObservacaoSemanalReportBody classId={classId} />;
    case "ReuniaoIndicadores":
      return <ReuniaoIndicadoresReportBody classId={classId} start={start} end={end} />;
    default:
      return null;
  }
}

function OcorrenciasReportBody({ classId, start, end }: { classId: number | null; start: string; end: string }) {
  const startDate = useMemo(() => new Date(start + "T00:00:00"), [start]);
  const endDate = useMemo(() => new Date(end + "T00:00:00"), [end]);
  const { data, isLoading } = useOccurrencesReport(startDate, endDate, classId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-2">
      {(data?.topStudents.length ?? 0) === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma ocorrência no período.</p>
      )}
      {data?.topStudents.map((s) => (
        <div key={s.studentId} className="flex items-center justify-between text-sm">
          <span>{s.studentName}</span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{s.count}</span>
        </div>
      ))}
    </div>
  );
}

function FaltasReportBody({ classId, start, end }: { classId: number | null; start: string; end: string }) {
  const { data, isLoading } = useAbsences();
  const filtered = (data ?? []).filter((a) => {
    const inClass = classId === null || a.attendance?.classId === classId;
    const inRange = a.attendanceDate >= start && a.attendanceDate <= end + "T23:59:59";
    return inClass && inRange;
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-2">
      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma falta no período.</p>
      )}
      {filtered.map((a) => (
        <div key={a.id} className="flex items-center justify-between text-sm">
          <span>{a.attendance?.student?.fullName ?? `Aluno #${a.attendance?.studentId}`}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {a.reason === UNJUSTIFIED_REASON || !a.reason ? "Pendente" : "Justificada"}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatDate(a.attendanceDate)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ObservacaoSemanalReportBody({ classId }: { classId: number | null }) {
  const { data, isLoading } = useWeeklyObservations(classId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">Mês atual — mesmo período usado na tela de Ocorrências.</p>
      {(data?.length ?? 0) === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma observação este mês.</p>
      )}
      {data?.map((w) => (
        <div key={w.id} className="rounded-md border border-border p-2 text-sm">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">Semana {w.weekOfMonth}</span>
            <span className="font-mono text-xs text-muted-foreground">{formatDate(w.createdAt)}</span>
          </div>
          <p>{w.weeklyObservation}</p>
        </div>
      ))}
    </div>
  );
}

function ReuniaoIndicadoresReportBody({
  classId,
  start,
  end,
}: {
  classId: number | null;
  start: string;
  end: string;
}) {
  const { data: meetings, isLoading } = useMeetings(classId);
  const inRange = (meetings ?? []).filter((m) => m.createdAt >= start && m.createdAt <= end + "T23:59:59");

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-2">
      {inRange.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma reunião no período.</p>
      )}
      {inRange.map((m) => (
        <MeetingIndicatorRow key={m.id} classId={classId} meetingCreatedAt={m.createdAt} status={m.status} />
      ))}
    </div>
  );
}

function MeetingIndicatorRow({
  classId,
  meetingCreatedAt,
  status,
}: {
  classId: number | null;
  meetingCreatedAt: string;
  status: string;
}) {
  const weekStart = new Date(meetingCreatedAt);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const { data: report } = useMeetingReport(classId, weekStart, weekEnd);

  return (
    <div className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
      <span>{formatDate(meetingCreatedAt)}</span>
      <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
        <span>{(report?.students ?? []).flatMap((s) => s.absences).length} faltas</span>
        <span>{(report?.students ?? []).flatMap((s) => s.occurrences).length} ocorrências</span>
        <span>{status}</span>
      </div>
    </div>
  );
}
