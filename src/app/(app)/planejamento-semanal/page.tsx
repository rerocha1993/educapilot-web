"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useWeeklyPlans,
  useSaveWeeklyPlan,
  type TaskExecutionStatus,
} from "@/lib/tasks/use-weekly-plans";

const EMPTY_FORM = {
  generalObjectives: "",
  homework: "",
  notebookActivities: "",
  portfolioActivities: "",
  drawingNotebookActivities: "",
  socialEmotionalDevelopment: "",
  previousWeekTasksExecutionStatus: "Sim" as TaskExecutionStatus,
  uncompletedTasks: "",
  requiredMaterials: "",
  startDate: "",
  endDate: "",
};

function toIso(d: Date) {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_BADGE: Record<string, string> = {
  Sim: "bg-success-soft text-success-soft-foreground",
  Não: "bg-destructive-soft text-destructive-soft-foreground",
  Parcial: "bg-warning-soft text-warning-soft-foreground",
};

export default function PlanejamentoSemanalPage() {
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState<number | null>(null);

  useEffect(() => {
    if (classId === null && classes && classes.length > 0) {
      setClassId(classes[0].id ?? null);
    }
  }, [classes, classId]);

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d;
  }, []);
  const rangeEnd = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  }, []);

  const { data: plans, isLoading, isError } = useWeeklyPlans(classId, rangeStart, rangeEnd);
  const savePlan = useSaveWeeklyPlan();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function openNew() {
    setForm({ ...EMPTY_FORM, startDate: toIso(new Date()), endDate: toIso(new Date()) });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (classId === null || !form.startDate || !form.endDate) return;
    try {
      await savePlan.mutateAsync({ classId, ...form });
      toast.success("Planejamento salvo.");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  const selectedClass = classes?.find((c) => c.id === classId);
  const sorted = (plans ?? [])
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      {/* O wireframe R11 ("Seminários semanais") descreve cards de tema/responsável/
          local/status — o recurso real do backend, "WeeklySeminar", é um planejamento
          pedagógico semanal (objetivos, dever de casa, atividades), conceito
          diferente. Construída em cima do que existe de verdade, não do nome do
          wireframe — ver MD de entrega pra detalhes. */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Planejamento semanal</h1>
          <p className="text-sm text-muted-foreground">
            Objetivos, atividades e materiais da semana por turma.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={openNew} disabled={classId === null}>
            Novo planejamento
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os planejamentos.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}

        {!isLoading && sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum planejamento registrado no período.</p>
        )}

        {sorted.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                {formatDate(p.startDate)} – {formatDate(p.endDate)}
              </span>
              <Badge className={STATUS_BADGE[p.previousWeekTasksExecutionStatus] ?? ""}>
                {p.previousWeekTasksExecutionStatus === "Sim"
                  ? "Semana anterior concluída"
                  : p.previousWeekTasksExecutionStatus === "Parcial"
                    ? "Parcialmente concluída"
                    : "Semana anterior pendente"}
              </Badge>
            </div>
            <p className="text-sm font-medium">{p.generalObjectives}</p>
            {p.requiredMaterials && (
              <p className="text-xs text-muted-foreground">Materiais: {p.requiredMaterials}</p>
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo planejamento · {selectedClass?.className}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Objetivos gerais</Label>
              <Textarea
                value={form.generalObjectives}
                onChange={(e) => setForm((f) => ({ ...f, generalObjectives: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Dever de casa</Label>
              <Textarea
                value={form.homework}
                onChange={(e) => setForm((f) => ({ ...f, homework: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Atividades de caderno</Label>
              <Textarea
                value={form.notebookActivities}
                onChange={(e) => setForm((f) => ({ ...f, notebookActivities: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Atividades de portfólio</Label>
              <Textarea
                value={form.portfolioActivities}
                onChange={(e) => setForm((f) => ({ ...f, portfolioActivities: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Atividades no caderno de desenho</Label>
              <Textarea
                value={form.drawingNotebookActivities}
                onChange={(e) => setForm((f) => ({ ...f, drawingNotebookActivities: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Desenvolvimento socioemocional</Label>
              <Textarea
                value={form.socialEmotionalDevelopment}
                onChange={(e) => setForm((f) => ({ ...f, socialEmotionalDevelopment: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Tarefas da semana anterior</Label>
              <Select
                value={form.previousWeekTasksExecutionStatus}
                onValueChange={(v) => v && setForm((f) => ({ ...f, previousWeekTasksExecutionStatus: v as TaskExecutionStatus }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{() => form.previousWeekTasksExecutionStatus}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim, concluídas</SelectItem>
                  <SelectItem value="Não">Não concluídas</SelectItem>
                  <SelectItem value="Parcial">Parcialmente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Tarefas pendentes</Label>
              <Textarea
                value={form.uncompletedTasks}
                onChange={(e) => setForm((f) => ({ ...f, uncompletedTasks: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Materiais necessários</Label>
              <Textarea
                value={form.requiredMaterials}
                onChange={(e) => setForm((f) => ({ ...f, requiredMaterials: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={savePlan.isPending || !form.generalObjectives.trim()}>
              {savePlan.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
