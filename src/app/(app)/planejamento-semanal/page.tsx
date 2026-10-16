"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, ChevronDown, Settings } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useWeeklyPlanTemplates,
  useWeeklyPlans,
  useSaveWeeklyPlan,
  type TaskExecutionStatus,
  type WeeklyPlanDto,
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
  const hojeIso = hojeIsoBrasilia();
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

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}

        {!isLoading && sorted.length === 0 && (templates?.length ?? 0) > 0 && (
          <EstadoVazio
            className="sm:col-span-2 xl:col-span-3"
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
          <CartaoDoPlanejamento
            key={p.id}
            plano={p}
            turma={selectedClass?.className}
            hoje={hojeIso}
          />
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

// Cartão de uma semana: o resumo cabe em duas linhas (turma, semana, modelo, situação) e o texto dos
// campos só aparece em "Ver planejamento" — antes cada cartão despejava todos os campos, e a tela
// parecia um documento colado. A semana de hoje ganha a borda roxa e a etiqueta.
function CartaoDoPlanejamento({
  plano,
  turma,
  hoje,
}: {
  plano: WeeklyPlanDto;
  turma?: string | null;
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);

  const inicio = plano.startDate.slice(0, 10);
  const fim = plano.endDate.slice(0, 10);
  const atual = inicio <= hoje && hoje <= fim;

  const preenchidos = plano.fieldValues.filter((v) => v.value?.trim());
  const primeiro = preenchidos[0];
  const situacao = plano.previousWeekTasksExecutionStatus;

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border bg-card p-3.5",
        atual ? "border-primary ring-1 ring-primary/30" : "border-border"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="font-numeric text-sm font-semibold">
          {formatarSoData(plano.startDate)} – {formatarSoData(plano.endDate)}
        </span>
        {atual && <Badge>Semana atual</Badge>}
      </div>

      <p className="text-xs text-muted-foreground">
        {turma && <span className="font-medium text-foreground">{turma}</span>}
        {turma && plano.weeklyPlanTemplate?.name && " · "}
        {plano.weeklyPlanTemplate?.name}
      </p>

      <div>
        <Badge
          variant={STATUS_BADGE_VARIANT[situacao as keyof typeof STATUS_BADGE_VARIANT] ?? "secondary"}
        >
          {situacao === "Sim"
            ? "Semana anterior concluída"
            : situacao === "Parcial"
              ? "Parcialmente concluída"
              : "Semana anterior pendente"}
        </Badge>
      </div>

      {!aberto && (
        <p className="line-clamp-2 break-words text-[13px] text-muted-foreground">
          {primeiro
            ? `${primeiro.weeklyPlanField?.label ?? "Campo"}: ${primeiro.value}`
            : "Nenhum campo preenchido."}
        </p>
      )}

      {aberto && (
        <dl className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {preenchidos.length === 0 && (
            <p className="px-3 py-2 text-[13px] text-muted-foreground">Nenhum campo preenchido.</p>
          )}
          {preenchidos.map((v) => (
            <div key={v.weeklyPlanFieldId} className="px-3 py-2">
              <dt className="text-xs font-medium text-muted-foreground">{v.weeklyPlanField?.label ?? "Campo"}</dt>
              <dd className="mt-0.5 whitespace-pre-line break-words text-sm">{v.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {preenchidos.length > 0 && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="flex min-h-9 w-fit items-center gap-1 rounded-md text-[13px] font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {aberto ? "Ocultar planejamento" : "Ver planejamento"}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", aberto && "rotate-180")} />
        </button>
      )}
    </article>
  );
}
