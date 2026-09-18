"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useWeeklyPlanTemplates,
  useWeeklyPlans,
  useSaveWeeklyPlan,
  type TaskExecutionStatus,
} from "@/lib/tasks/use-weekly-plans";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";

// Reestruturado (2026-09, feedback do cliente) — "planejamento semanal, isso eu
// quero que criemos o modelo, não pode ser fixo". Antes os campos do formulário
// (objetivos gerais, dever de casa...) eram fixos no código. Agora vêm do modelo
// escolhido (WeeklyPlanTemplate → WeeklyPlanField, configurável em
// /planejamento-semanal/config) — o formulário se monta sozinho a partir dos campos
// ativos do modelo selecionado.

// Guia: situação do dado vira variante de Badge.
const STATUS_BADGE_VARIANT = {
  Sim: "success",
  Não: "overdue",
  Parcial: "pending",
} as const;

export default function PlanejamentoSemanalPage() {
  const { data: classes } = useClasses();
  const { data: templates, isLoading: templatesLoading } = useWeeklyPlanTemplates();
  const [classId, setClassId] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (classId === null && classes && classes.length > 0) {
      setClassId(classes[0].id ?? null);
    }
  }, [classes, classId]);

  useEffect(() => {
    if (templateId === null && templates && templates.length > 0) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId]);

  const selectedTemplate = templates?.find((t) => t.id === templateId) ?? null;
  const activeFields = (selectedTemplate?.fields ?? [])
    .filter((f) => f.ativo)
    .sort((a, b) => a.order - b.order);

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
  const [dates, setDates] = useState({ startDate: "", endDate: "" });
  const [status, setStatus] = useState<TaskExecutionStatus>("Sim");
  const [values, setValues] = useState<Record<number, string>>({});

  function openNew() {
    setDates({ startDate: hojeIsoBrasilia(), endDate: hojeIsoBrasilia() });
    setStatus("Sim");
    setValues({});
    setDialogOpen(true);
  }

  async function handleSave() {
    if (classId === null || templateId === null || !dates.startDate || !dates.endDate) return;
    try {
      await savePlan.mutateAsync({
        weeklyPlanTemplateId: templateId,
        classId,
        startDate: dates.startDate,
        endDate: dates.endDate,
        previousWeekTasksExecutionStatus: status,
        fieldValues: activeFields.map((f) => ({ weeklyPlanFieldId: f.id, value: values[f.id] ?? "" })),
      });
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

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Planejamento semanal"
        apoio="Objetivos, atividades e materiais da semana por turma — modelo configurável."
        acoes={
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <Select value={classId?.toString() ?? ""} onValueChange={(v) => v && setClassId(Number(v))}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] md:w-44">
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

            <Select value={templateId?.toString() ?? ""} onValueChange={(v) => v && setTemplateId(Number(v))}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] md:w-48">
                <SelectValue placeholder="Modelo">
                  {() => selectedTemplate?.name ?? "Modelo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Único botão laranja da tela: é a decisão a tomar aqui. */}
            <Button
              variant="action"
              className="w-full md:w-auto"
              onClick={openNew}
              disabled={classId === null || templateId === null}
            >
              Novo planejamento
            </Button>
          </div>
        }
      />

      {!templatesLoading && (templates?.length ?? 0) === 0 && (
        <EstadoVazio
          icone={<CalendarRange />}
          titulo="Nenhum modelo configurado ainda."
          acao={
            <Link href="/planejamento-semanal/config" className={buttonVariants()}>
              Criar o primeiro modelo
            </Link>
          }
        />
      )}

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os planejamentos.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}

        {!isLoading && sorted.length === 0 && (templates?.length ?? 0) > 0 && (
          <EstadoVazio
            className="sm:col-span-2"
            icone={<CalendarRange />}
            titulo="Nenhum planejamento registrado no período."
            acao={
              <Button onClick={openNew} disabled={classId === null || templateId === null}>
                Novo planejamento
              </Button>
            }
          />
        )}

        {sorted.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-numeric text-xs text-muted-foreground">
                {formatarSoData(p.startDate)} – {formatarSoData(p.endDate)}
              </span>
              <Badge
                variant={
                  STATUS_BADGE_VARIANT[
                    p.previousWeekTasksExecutionStatus as keyof typeof STATUS_BADGE_VARIANT
                  ] ?? "secondary"
                }
              >
                {p.previousWeekTasksExecutionStatus === "Sim"
                  ? "Semana anterior concluída"
                  : p.previousWeekTasksExecutionStatus === "Parcial"
                    ? "Parcialmente concluída"
                    : "Semana anterior pendente"}
              </Badge>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{p.weeklyPlanTemplate?.name}</span>
            <div className="flex flex-col gap-1">
              {p.fieldValues
                .filter((v) => v.value?.trim())
                .map((v) => (
                  <p key={v.weeklyPlanFieldId} className="text-sm">
                    <span className="font-medium">{v.weeklyPlanField?.label ?? "Campo"}:</span> {v.value}
                  </p>
                ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Novo planejamento · {selectedClass?.className} · {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="date"
                  className="font-numeric"
                  value={dates.startDate}
                  onChange={(e) => setDates((d) => ({ ...d, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="date"
                  className="font-numeric"
                  value={dates.endDate}
                  onChange={(e) => setDates((d) => ({ ...d, endDate: e.target.value }))}
                />
              </div>
            </div>

            {activeFields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Este modelo ainda não tem campos.{" "}
                <Link href="/planejamento-semanal/config" className="text-primary hover:underline">
                  Configurar
                </Link>
              </p>
            )}

            {activeFields.map((field) => (
              <div key={field.id} className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <Textarea
                  value={values[field.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  rows={2}
                />
              </div>
            ))}

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Tarefas da semana anterior</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as TaskExecutionStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => status}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim, concluídas</SelectItem>
                  <SelectItem value="Não">Não concluídas</SelectItem>
                  <SelectItem value="Parcial">Parcialmente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={savePlan.isPending || !dates.startDate || !dates.endDate}>
              {savePlan.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Link
        href="/planejamento-semanal/config"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <Settings className="size-3.5" />
        Configurar modelos e campos
      </Link>
    </div>
  );
}
