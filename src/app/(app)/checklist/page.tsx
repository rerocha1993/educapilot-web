"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ListChecks, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useChecklistTemplatesForClass,
  useChecklistFill,
  useSubmitChecklistResponse,
} from "@/lib/tasks/use-checklists";
import { formatarHora, hojeIsoBrasilia } from "@/lib/format/date";

export default function ChecklistFillPage() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const [classId, setClassId] = useState<number | null>(null);
  const [dateStr, setDateStr] = useState(hojeIsoBrasilia());

  useEffect(() => {
    if (classId === null && classes && classes.length > 0) {
      setClassId(classes[0].id ?? null);
    }
  }, [classes, classId]);

  const { data: templates, isLoading: templatesLoading } = useChecklistTemplatesForClass(classId);
  const [templateId, setTemplateId] = useState<number | null>(null);

  useEffect(() => {
    setTemplateId(null);
  }, [classId]);
  useEffect(() => {
    if (templateId === null && templates && templates.length > 0) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId]);

  const date = useMemo(() => new Date(dateStr + "T00:00:00"), [dateStr]);
  const { data: fill, isLoading: fillLoading, isError } = useChecklistFill(templateId, classId, date);
  const submit = useSubmitChecklistResponse();

  const [marks, setMarks] = useState<Record<number, { isChecked: boolean; countValue: number | null }>>({});

  useEffect(() => {
    const next: Record<number, { isChecked: boolean; countValue: number | null }> = {};
    for (const item of fill?.items ?? []) {
      next[item.id] = { isChecked: item.isChecked, countValue: item.countValue };
    }
    setMarks(next);
  }, [fill]);

  const items = fill?.items ?? [];
  const doneCount = items.filter((i) => marks[i.id]?.isChecked).length;

  function toggle(itemId: number, checked: boolean) {
    setMarks((prev) => ({ ...prev, [itemId]: { ...prev[itemId], isChecked: checked } }));
  }

  function setCount(itemId: number, value: number) {
    setMarks((prev) => ({
      ...prev,
      [itemId]: { isChecked: value > 0, countValue: value },
    }));
  }

  async function handleSave() {
    if (templateId === null || classId === null) return;
    const session = getSession();
    try {
      await submit.mutateAsync({
        checklistTemplateId: templateId,
        classId,
        date: dateStr,
        responsible: session?.name ?? "—",
        items: items.map((i) => ({
          checklistItemId: i.id,
          isChecked: marks[i.id]?.isChecked ?? false,
          countValue: marks[i.id]?.countValue ?? null,
        })),
      });
      toast.success("Checklist salvo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o checklist.");
    }
  }

  const selectedClass = classes?.find((c) => c.id === classId);

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo={`Checklist${selectedClass ? ` · ${selectedClass.className}` : ""}`}
        apoio={
          items.length > 0 ? (
            <>
              <span className="font-numeric">{doneCount}</span> de{" "}
              <span className="font-numeric">{items.length}</span> concluídos
            </>
          ) : (
            "Selecione turma e checklist."
          )
        }
        acoes={
          <div className="grid w-full grid-cols-2 items-end gap-2 md:flex md:w-auto">
            <div className="flex min-w-0 flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Turma
              </span>
              <Select value={classId?.toString() ?? ""} onValueChange={(v) => v && setClassId(Number(v))}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Selecione">{() => selectedClass?.className ?? "Selecione"}</SelectValue>
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

            <div className="flex min-w-0 flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Checklist
              </span>
              <Select
                value={templateId?.toString() ?? ""}
                onValueChange={(v) => v && setTemplateId(Number(v))}
              >
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Selecione">
                    {() => templates?.find((t) => t.id === templateId)?.name ?? "Selecione"}
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
            </div>

            <div className="col-span-2 flex min-w-0 flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Data
              </span>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="h-10 w-full font-numeric md:h-9 md:w-40"
              />
            </div>
          </div>
        }
      />

      {/* Guia (Estatística): barra fina de 6px, roxa — laranja enquanto falta muito. */}
      {items.length > 0 && (
        <Progress
          value={(doneCount / items.length) * 100}
          className={cn(
            "[&_[data-slot=progress-track]]:h-1.5",
            doneCount / items.length < 0.5 && "[&_[data-slot=progress-indicator]]:bg-action"
          )}
        />
      )}

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o checklist.
        </div>
      )}

      {!classesLoading && !templatesLoading && !fillLoading && templates?.length === 0 ? (
        <EstadoVazio
          icone={<ListChecks />}
          titulo="Nenhum checklist configurado para esta turma."
          acao={
            <Link href="/checklist/config" className={buttonVariants()}>
              Configurar
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {(classesLoading || templatesLoading || fillLoading) &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-b border-border px-4 py-3 last:border-0">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}

          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
            >
              <label className="flex min-w-0 flex-1 items-center gap-3">
                {item.tipo === "Contagem" ? (
                  <Input
                    type="number"
                    min={0}
                    value={marks[item.id]?.countValue ?? ""}
                    onChange={(e) => setCount(item.id, Number(e.target.value))}
                    className="h-10 w-20 shrink-0 font-numeric md:h-8"
                  />
                ) : (
                  <Checkbox
                    className="size-[18px]"
                    checked={marks[item.id]?.isChecked ?? false}
                    onCheckedChange={(v) => toggle(item.id, v === true)}
                  />
                )}
                <span
                  className={marks[item.id]?.isChecked ? "text-muted-foreground line-through" : ""}
                >
                  {item.description}
                </span>
              </label>
              {item.checkedAt && (
                <span className="shrink-0 font-numeric text-xs text-muted-foreground">
                  {formatarHora(item.checkedAt)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/checklist/config"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-3.5" />
          Configurar checklists
        </Link>
        <Button onClick={handleSave} disabled={submit.isPending || items.length === 0}>
          {submit.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
