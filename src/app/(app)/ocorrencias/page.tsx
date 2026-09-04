"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useStudentsByClass } from "@/lib/kernel/use-students";
import {
  useCreateOccurrences,
  useOccurrencesReport,
  useOccurrencesByStudent,
  OCCURRENCE_CATEGORIES,
  type OccurrenceCategoria,
} from "@/lib/tasks/use-occurrences";
import {
  useWeeklyObservations,
  useSendWeeklyObservation,
} from "@/lib/tasks/use-weekly-observations";

// Reestruturado (2026-08, feedback do cliente): antes eram 2 telas (registro e
// relatório) sem navegação entre si — quem estava no relatório não tinha como voltar
// pro registro. Agora a tela abre direto no relatório (o que a diretoria mais
// consulta no dia a dia) e "Registrar ocorrência" é um botão que abre um popup; ao
// salvar, o popup fecha e o relatório já atualiza sozinho (mesma query invalidada).
//
// Observação semanal (2026-09, feedback do cliente) — "a tela de observação [...]
// tem que ser colocada junta do ocorrência pq pertencia a mesma coisa, é sobre a
// turma": no backend, observação semanal SEMPRE foi um Occurrence com
// IsWeeklyReport=true (mesma tabela, ver OccurrenceService.AddWeeklyReportAsync) —
// nunca deveria ter sido uma tela separada. Virou uma seção aqui embaixo, visível
// quando uma turma específica está selecionada no filtro (observação semanal é
// por turma, não tem sentido em "todas as turmas" de uma vez).

function currentWeekOfMonth() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const offset = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  return Math.ceil((today.getDate() + offset - 1) / 7);
}

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

const EMPTY_FORM = {
  classId: null as number | null,
  studentIds: [] as number[],
  categoria: "Comportamento" as OccurrenceCategoria,
  observation: "",
  solution: "",
  notify: false,
};

export default function OcorrenciasPage() {
  const { data: classes } = useClasses();
  const [{ start, end }, setRange] = useState(defaultRange());
  const [reportClassId, setReportClassId] = useState<number | null>(null);
  const startDate = useMemo(() => new Date(start + "T00:00:00"), [start]);
  const endDate = useMemo(() => new Date(end + "T00:00:00"), [end]);

  const { data, isLoading, isError } = useOccurrencesReport(startDate, endDate, reportClassId);

  const [week, setWeek] = useState(currentWeekOfMonth());
  const [weeklyText, setWeeklyText] = useState("");
  const { data: weeklyHistory, isLoading: weeklyLoading } = useWeeklyObservations(reportClassId);
  const sendWeekly = useSendWeeklyObservation();

  async function handleSendWeekly() {
    if (reportClassId === null || !weeklyText.trim()) return;
    try {
      await sendWeekly.mutateAsync({ classId: reportClassId, weekOfMonth: week, weeklyObservation: weeklyText.trim() });
      toast.success("Observação semanal enviada à coordenação.");
      setWeeklyText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar observação semanal.");
    }
  }

  // Novo (2026-09, feedback do cliente) — "tem uma ocorrência pra Caterina, mas
  // cade a ocorrência? precisa aparecer": clicar num aluno do relatório abre o
  // detalhe real (categoria/descrição/solução/data) das ocorrências dele no
  // período — antes só dava pra ver a contagem agregada.
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const { data: studentOccurrences, isLoading: studentOccurrencesLoading } =
    useOccurrencesByStudent(selectedStudent?.id ?? null);
  const studentOccurrencesInRange = (studentOccurrences ?? []).filter((o) => {
    const created = new Date(o.createdAt);
    return created >= startDate && created < new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { data: students } = useStudentsByClass(form.classId);
  const createOccurrences = useCreateOccurrences();

  useEffect(() => {
    setForm((f) => ({ ...f, studentIds: [] }));
  }, [form.classId]);

  function reset() {
    setForm(EMPTY_FORM);
  }

  function toggleStudent(id: number) {
    setForm((f) => ({
      ...f,
      studentIds: f.studentIds.includes(id)
        ? f.studentIds.filter((s) => s !== id)
        : [...f.studentIds, id],
    }));
  }

  async function handleSubmit() {
    if (form.classId === null || form.studentIds.length === 0 || !form.observation.trim()) return;
    try {
      await createOccurrences.mutateAsync({
        childIds: form.studentIds,
        classId: form.classId,
        categoria: form.categoria,
        observation: form.observation.trim(),
        solution: form.solution.trim() || undefined,
        parentsNotified: form.notify,
      });
      toast.success(
        form.studentIds.length > 1 ? "Ocorrência registrada para os alunos selecionados." : "Ocorrência registrada."
      );
      setDialogOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar ocorrência.");
    }
  }

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

        <div className="flex flex-wrap items-end gap-2 print:hidden">
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
          {/* Novo (2026-08, feedback do cliente): filtro de turma no relatório —
              "Todas as turmas" quando null, mesmo comportamento do backend. */}
          <Select
            value={reportClassId?.toString() ?? "__all__"}
            onValueChange={(v) => setReportClassId(v === "__all__" ? null : Number(v))}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue>
                {() => (reportClassId ? classes?.find((c) => c.id === reportClassId)?.className : "Todas as turmas")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as turmas</SelectItem>
              {classes?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Exportar PDF
          </Button>
          <Button onClick={() => setDialogOpen(true)}>+ Registrar ocorrência</Button>
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

          <div className="flex flex-col gap-1">
            {data?.topStudents.map((s) => (
              <button
                key={s.studentId}
                onClick={() => setSelectedStudent({ id: s.studentId, name: s.studentName })}
                className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={cn("size-2 shrink-0 rounded-full", CATEGORIA_DOT[s.topCategoria])} />
                  <span className="truncate">{s.studentName}</span>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 print:hidden">
        <h2 className="mb-1 font-heading text-sm font-semibold">Observação semanal da turma</h2>
        <p className="mb-3 text-xs text-muted-foreground">Resumo da semana enviado à coordenação.</p>

        {reportClassId === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Selecione uma turma no filtro acima para ver ou enviar a observação semanal.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div>
                <span className="mb-2 block font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                  Semana do mês
                </span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <button
                      key={w}
                      onClick={() => setWeek(w)}
                      className={cn(
                        "size-9 rounded-full border text-sm font-medium transition-colors",
                        week === w
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-transparent text-foreground hover:bg-accent"
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                value={weeklyText}
                onChange={(e) => setWeeklyText(e.target.value)}
                rows={4}
                placeholder="Como foi a semana da turma..."
              />

              <div className="flex justify-end">
                <Button onClick={handleSendWeekly} disabled={sendWeekly.isPending || !weeklyText.trim()}>
                  {sendWeekly.isPending ? "Enviando..." : "Enviar à coordenação"}
                </Button>
              </div>
            </div>

            <div>
              <span className="mb-2 block font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Histórico do mês
              </span>

              {weeklyLoading && <Skeleton className="h-20 w-full" />}

              {!weeklyLoading && (weeklyHistory?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma observação enviada este mês.</p>
              )}

              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {weeklyHistory?.map((h) => (
                  <div key={h.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">Semana {h.weekOfMonth}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {new Date(h.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm">{h.weeklyObservation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={selectedStudent !== null} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ocorrências de {selectedStudent?.name}</DialogTitle>
          </DialogHeader>

          {studentOccurrencesLoading && <Skeleton className="h-24 w-full" />}

          {!studentOccurrencesLoading && studentOccurrencesInRange.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma ocorrência no período selecionado.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {studentOccurrencesInRange
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((o) => (
                <div key={o.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <span className={cn("size-2 shrink-0 rounded-full", CATEGORIA_DOT[o.categoria])} />
                      {o.categoria}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm">{o.observation}</p>
                  {o.solution && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Solução:</span> {o.solution}
                    </p>
                  )}
                  {o.parentsNotified && (
                    <span className="mt-2 inline-block rounded-full bg-success-soft px-2 py-0.5 text-xs text-success-soft-foreground">
                      Responsável notificado
                    </span>
                  )}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) reset(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar ocorrência</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Turma
              </span>
              <Select
                value={form.classId?.toString() ?? ""}
                onValueChange={(v) => v && setForm((f) => ({ ...f, classId: Number(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione">
                    {() => classes?.find((c) => c.id === form.classId)?.className ?? "Selecione"}
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
            </div>

            {/* Novo (2026-08, feedback do cliente) — "adicionar outro aluno envolvido":
                antes só dava pra escolher 1 aluno por ocorrência; agora é uma lista de
                checkboxes, registra a mesma ocorrência pra cada aluno marcado. */}
            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Alunos envolvidos
              </span>
              {form.classId === null && (
                <p className="text-sm text-muted-foreground">Selecione a turma primeiro.</p>
              )}
              {form.classId !== null && (
                <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2.5">
                  {students?.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.studentIds.includes(s.id)}
                        onCheckedChange={() => toggleStudent(s.id)}
                      />
                      {s.fullName}
                    </label>
                  ))}
                  {students?.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <span className="mb-2 block font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Categoria
              </span>
              <div className="flex flex-wrap gap-2">
                {OCCURRENCE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, categoria: c }))}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      form.categoria === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-transparent text-foreground hover:bg-accent"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Descrição
              </span>
              <Textarea
                value={form.observation}
                onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))}
                rows={4}
                placeholder="O que aconteceu..."
              />
            </div>

            {/* Novo (2026-08, feedback do cliente) — campo pra professora registrar o
                que ela fez na situação. Occurrence.Solution já existia na entidade,
                nunca era exposto em nenhuma tela. */}
            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Solução (opcional)
              </span>
              <Textarea
                value={form.solution}
                onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
                rows={3}
                placeholder="O que foi feito pra resolver a situação..."
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.notify}
                onCheckedChange={(v) => setForm((f) => ({ ...f, notify: v === true }))}
              />
              Notificar responsável
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createOccurrences.isPending ||
                form.classId === null ||
                form.studentIds.length === 0 ||
                !form.observation.trim()
              }
            >
              {createOccurrences.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
