"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useMeetings,
  useMeetingReport,
  useSaveMeeting,
  type MeetingDto,
} from "@/lib/tasks/use-meetings";

// Reescrito (2026-09, feedback do cliente) — "a tela de reuniões, essa tela é para
// ser por turma, nela ao selecionar a turma a diretora clica na semana, quando ela
// clica na semana vai trazer relatório de faltas, relatório de ocorrências e de
// observação semana, um espaço para a diretora descrever como foi a reunião [...]
// no final tudo é salvo para ser gerado um relatório pela gestão, pode ser com
// indicadores resumidos com explosão de descrição e resumos". A tela antiga era só
// "abrir/fechar reunião + escrever ata", sem nenhuma turma→semana→dados. Ver
// use-meetings.ts pro raciocínio sobre as APIs (já existiam quase prontas).

function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toIso(d: Date) {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function recentWeeks(count: number) {
  const thisMonday = mondayOf(new Date());
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  });
}

function formatShort(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_BADGE: Record<string, string> = {
  Aberto: "bg-warning-soft text-warning-soft-foreground",
  Finalizado: "bg-success-soft text-success-soft-foreground",
};

export default function ReunioesPage() {
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState<number | null>(null);

  useEffect(() => {
    if (classId === null && classes && classes.length > 0) {
      setClassId(classes[0].id ?? null);
    }
  }, [classes, classId]);

  const weeks = useMemo(() => recentWeeks(8), []);
  const [weekIndex, setWeekIndex] = useState(0);
  const week = weeks[weekIndex];

  const { data: meetings } = useMeetings(classId);
  const currentMeeting = meetings?.find((m) => new Date(m.createdAt).toDateString() === week.start.toDateString()) ?? null;

  const { data: report, isLoading: reportLoading } = useMeetingReport(classId, week.start, week.end);
  const saveMeeting = useSaveMeeting();

  const [discussion, setDiscussion] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    setDiscussion(currentMeeting?.discussion ?? "");
    setSummary(currentMeeting?.summary ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMeeting?.id, weekIndex, classId]);

  const absences = (report?.students ?? []).flatMap((s) =>
    s.absences.map((a) => ({ ...a, studentName: s.fullName }))
  );
  const occurrences = (report?.students ?? []).flatMap((s) =>
    s.occurrences.map((o) => ({ ...o, studentName: s.fullName }))
  );
  const weeklyReports = report?.weeklyReports ?? [];

  async function handleSave(status: "Aberto" | "Finalizado") {
    if (classId === null) return;
    try {
      await saveMeeting.mutateAsync({
        id: currentMeeting?.id,
        classId,
        createdAt: toIso(week.start),
        status,
        discussion,
        summary: summary || null,
      });
      toast.success(status === "Finalizado" ? "Reunião finalizada." : "Reunião salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar reunião.");
    }
  }

  const selectedClass = classes?.find((c) => c.id === classId);

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">Reuniões</h1>
          <p className="text-sm text-muted-foreground">
            Faltas, ocorrências e observação semanal da turma, por semana.
          </p>
        </div>
        <Select value={classId?.toString() ?? ""} onValueChange={(v) => v && setClassId(Number(v))}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Turma">{() => selectedClass?.className ?? "Turma"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {classes?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* "a diretora clica na semana" — chips das últimas 8 semanas (segunda a domingo). */}
      <div className="flex flex-wrap gap-2">
        {weeks.map((w, i) => {
          const hasMeeting = meetings?.some((m) => new Date(m.createdAt).toDateString() === w.start.toDateString());
          return (
            <button
              key={i}
              onClick={() => setWeekIndex(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                weekIndex === i
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-foreground hover:bg-accent"
              )}
            >
              {formatShort(w.start)} – {formatShort(w.end)}
              {hasMeeting && (
                <span className={cn("size-1.5 rounded-full", weekIndex === i ? "bg-primary-foreground" : "bg-primary")} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Semana de {formatShort(week.start)} a {formatShort(week.end)}
        </span>
        {currentMeeting && (
          <Badge className={STATUS_BADGE[currentMeeting.status]}>{currentMeeting.status}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-sm font-semibold">Relatório de faltas</h2>
          {reportLoading && <Skeleton className="h-24 w-full" />}
          {!reportLoading && absences.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma falta na semana.</p>
          )}
          <div className="flex flex-col gap-2">
            {absences.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.studentName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                </div>
                {a.reason && <p className="mt-0.5 text-xs text-muted-foreground">{a.reason}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-sm font-semibold">Relatório de ocorrências</h2>
          {reportLoading && <Skeleton className="h-24 w-full" />}
          {!reportLoading && occurrences.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma ocorrência na semana.</p>
          )}
          <div className="flex flex-col gap-2">
            {occurrences.map((o) => (
              <div key={o.id} className="rounded-md border border-border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.studentName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
                </div>
                {o.description && <p className="mt-0.5 text-xs text-muted-foreground">{o.description}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-sm font-semibold">Observação semanal</h2>
          {reportLoading && <Skeleton className="h-24 w-full" />}
          {!reportLoading && weeklyReports.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma observação enviada.</p>
          )}
          <div className="flex flex-col gap-2">
            {weeklyReports.map((w) => (
              <div key={w.id} className="rounded-md border border-border p-2 text-sm">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">Semana {w.weekOfMonth}</span>
                  <span className="font-mono text-xs text-muted-foreground">{formatDate(w.createdAt)}</span>
                </div>
                <p>{w.weeklyObservation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-heading text-sm font-semibold">Como foi a reunião</h2>
        <div className="flex flex-col gap-3">
          <div>
            <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Discussão
            </span>
            <Textarea
              value={discussion}
              onChange={(e) => setDiscussion(e.target.value)}
              rows={4}
              placeholder="O que foi discutido na reunião com a professora..."
            />
          </div>
          <div>
            <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Resumo (aparece no relatório de gestão)
            </span>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Resumo curto pra quem só quer o panorama..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleSave("Aberto")} disabled={saveMeeting.isPending}>
              Salvar rascunho
            </Button>
            <Button onClick={() => handleSave("Finalizado")} disabled={saveMeeting.isPending || !discussion.trim()}>
              Finalizar reunião
            </Button>
          </div>
        </div>
      </div>

      <MeetingHistory classId={classId} meetings={meetings ?? []} />
    </div>
  );
}

// "no final tudo é salvo para ser gerado um relatório pela gestão, pode ser com
// indicadores resumidos com explosão de descrição e resumos": lista de reuniões já
// registradas da turma, cada linha com indicadores da semana (calculados sob
// demanda ao expandir, pra não buscar tudo de uma vez) e o resumo/discussão por
// baixo do "explode".
function MeetingHistory({ classId, meetings }: { classId: number | null; meetings: MeetingDto[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expanded = meetings.find((m) => m.id === expandedId) ?? null;
  const expandedWeekStart = expanded ? mondayOf(new Date(expanded.createdAt)) : new Date();
  const expandedWeekEnd = useMemo(() => {
    const d = new Date(expandedWeekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [expandedWeekStart]);

  const { data: expandedReport } = useMeetingReport(
    expanded ? classId : null,
    expandedWeekStart,
    expandedWeekEnd
  );

  const sorted = meetings
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (classId === null) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-1 font-heading text-sm font-semibold">Histórico de reuniões</h2>
      <p className="mb-3 text-xs text-muted-foreground">Relatório de gestão — indicadores resumidos por semana.</p>

      {sorted.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma reunião registrada ainda.</p>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((m) => {
          const isExpanded = expandedId === m.id;
          const weekStart = mondayOf(new Date(m.createdAt));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          return (
            <div key={m.id} className="rounded-md border border-border">
              <button
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
              >
                <span className="text-sm font-medium">
                  {formatShort(weekStart)} – {formatShort(weekEnd)}
                </span>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_BADGE[m.status]}>{m.status}</Badge>
                  <span className="text-xs text-muted-foreground">{isExpanded ? "Recolher" : "Expandir"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="flex flex-col gap-3 border-t border-border p-3">
                  <div className="flex gap-4 font-mono text-xs text-muted-foreground">
                    <span>{(expandedReport?.students ?? []).flatMap((s) => s.absences).length} faltas</span>
                    <span>{(expandedReport?.students ?? []).flatMap((s) => s.occurrences).length} ocorrências</span>
                    <span>{(expandedReport?.weeklyReports ?? []).length} observações</span>
                  </div>
                  {m.summary && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Resumo</p>
                      <p className="text-sm">{m.summary}</p>
                    </div>
                  )}
                  {m.discussion && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Discussão</p>
                      <p className="text-sm">{m.discussion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
