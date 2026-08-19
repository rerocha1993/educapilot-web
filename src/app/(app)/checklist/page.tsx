"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { getSession } from "@/lib/auth/session";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useChecklistTemplatesForClass,
  useChecklistFill,
  useSubmitChecklistResponse,
} from "@/lib/tasks/use-checklists";

function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChecklistFillPage() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const [classId, setClassId] = useState<number | null>(null);
  const [dateStr, setDateStr] = useState(todayIso());

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

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">
            Checklist{selectedClass ? ` · ${selectedClass.className}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length > 0 ? `${doneCount} de ${items.length} concluídos` : "Selecione turma e checklist."}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-[5px]">
            <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Turma
            </span>
            <Select value={classId?.toString() ?? ""} onValueChange={(v) => v && setClassId(Number(v))}>
              <SelectTrigger className="w-40">
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

          <div className="flex flex-col gap-[5px]">
            <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Checklist
            </span>
            <Select
              value={templateId?.toString() ?? ""}
              onValueChange={(v) => v && setTemplateId(Number(v))}
            >
              <SelectTrigger className="w-44">
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

          <div className="flex flex-col gap-[5px]">
            <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Data
            </span>
            <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="h-9 w-40" />
          </div>
        </div>
      </div>

      {items.length > 0 && <Progress value={(doneCount / items.length) * 100} />}

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o checklist.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        {(classesLoading || templatesLoading || fillLoading) &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}

        {!classesLoading && !templatesLoading && !fillLoading && templates?.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum checklist configurado para esta turma.{" "}
            <Link href="/checklist/config" className="text-primary hover:underline">
              Configurar
            </Link>
          </p>
        )}

        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
            <div className="flex items-center gap-3">
              {item.tipo === "Contagem" ? (
                <Input
                  type="number"
                  min={0}
                  value={marks[item.id]?.countValue ?? ""}
                  onChange={(e) => setCount(item.id, Number(e.target.value))}
                  className="h-8 w-20"
                />
              ) : (
                <Checkbox
                  className="size-[18px]"
                  checked={marks[item.id]?.isChecked ?? false}
                  onCheckedChange={(v) => toggle(item.id, v === true)}
                />
              )}
              <span className={marks[item.id]?.isChecked ? "text-[#9C9C95] line-through" : ""}>
                {item.description}
              </span>
            </div>
            {item.checkedAt && (
              <span className="font-mono text-xs text-muted-foreground">{formatTime(item.checkedAt)}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
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
