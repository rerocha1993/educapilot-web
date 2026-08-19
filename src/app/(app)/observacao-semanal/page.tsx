"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  useWeeklyObservations,
  useSendWeeklyObservation,
} from "@/lib/tasks/use-weekly-observations";

function currentWeekOfMonth() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const offset = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  return Math.ceil((today.getDate() + offset - 1) / 7);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function ObservacaoSemanalPage() {
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState<number | null>(null);
  const [week, setWeek] = useState(currentWeekOfMonth());
  const [observation, setObservation] = useState("");

  useEffect(() => {
    if (classId === null && classes && classes.length > 0) {
      setClassId(classes[0].id ?? null);
    }
  }, [classes, classId]);

  const { data: history, isLoading, isError } = useWeeklyObservations(classId);
  const send = useSendWeeklyObservation();

  const selectedClass = classes?.find((c) => c.id === classId);

  async function handleSend() {
    if (classId === null || !observation.trim()) return;
    try {
      await send.mutateAsync({ classId, weekOfMonth: week, weeklyObservation: observation.trim() });
      toast.success("Observação enviada à coordenação.");
      setObservation("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar observação.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Observação semanal por turma</h1>
          <p className="text-sm text-muted-foreground">Resumo da semana enviado à coordenação.</p>
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

      <div className="flex max-w-xl flex-col gap-4 rounded-lg border border-border bg-card p-5">
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
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          rows={5}
          placeholder="Como foi a semana da turma..."
        />

        {/* Checklist de encaminhamentos faz parte do wireframe R10, mas o backend não
            tem esse campo — só o texto livre de WeeklyObservation. */}
        <p className="text-xs text-muted-foreground">
          Checklist de encaminhamentos ainda não é suportado pelo backend — próxima
          etapa.
        </p>

        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={send.isPending || classId === null || !observation.trim()}>
            {send.isPending ? "Enviando..." : "Enviar à coordenação"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-heading text-sm font-semibold">Histórico do mês</h2>

        {isError && (
          <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
            Não foi possível carregar o histórico.
          </div>
        )}

        {isLoading && <Skeleton className="h-20 w-full" />}

        {!isLoading && (history?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma observação enviada este mês.</p>
        )}

        <div className="flex flex-col gap-2">
          {history?.map((h) => (
            <div key={h.id} className="rounded-lg border border-border bg-card p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">Semana {h.weekOfMonth}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
              </div>
              <p className="text-sm">{h.weeklyObservation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
