"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { cn } from "@/lib/utils";
import {
  useAbsences,
  useJustifyAbsence,
  UNJUSTIFIED_REASON,
  type AbsenceDto,
} from "@/lib/tasks/use-absences";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function isJustified(absence: AbsenceDto) {
  return !!absence.reason && absence.reason !== UNJUSTIFIED_REASON;
}

export default function FaltasPage() {
  const { data: absences, isLoading, isError } = useAbsences();
  const justify = useJustifyAbsence();

  const [tab, setTab] = useState<"unjustified" | "justified">("unjustified");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const unjustified = useMemo(() => (absences ?? []).filter((a) => !isJustified(a)), [absences]);
  const justified = useMemo(() => (absences ?? []).filter((a) => isJustified(a)), [absences]);
  const list = tab === "unjustified" ? unjustified : justified;

  const selected = (absences ?? []).find((a) => a.id === selectedId) ?? null;

  function selectAbsence(absence: AbsenceDto) {
    setSelectedId(absence.id);
    setReason(isJustified(absence) ? absence.reason : "");
  }

  async function handleRegister() {
    if (!selected || !reason.trim()) return;
    try {
      await justify.mutateAsync({ id: selected.id, attendanceId: selected.attendanceId, reason: reason.trim() });
      toast.success("Justificativa registrada.");
      setSelectedId(null);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div>
        <h1 className="font-heading text-xl font-bold">Faltas</h1>
        <p className="text-sm text-muted-foreground">
          Justificativas das faltas registradas na chamada.
        </p>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as faltas.
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "unjustified" | "justified")}>
        <TabsList>
          <TabsTrigger value="unjustified">Não justificadas ({unjustified.length})</TabsTrigger>
          <TabsTrigger value="justified">Justificadas ({justified.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-2">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}

          {!isLoading && list.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {tab === "unjustified" ? "Nenhuma falta pendente de justificativa." : "Nenhuma falta justificada ainda."}
            </div>
          )}

          {list.map((absence) => (
            <button
              key={absence.id}
              onClick={() => selectAbsence(absence)}
              className={cn(
                "flex flex-col gap-1 rounded-lg border bg-card px-4 py-3 text-left transition-colors",
                selectedId === absence.id
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {absence.attendance?.student?.fullName ?? `Aluno #${absence.attendance?.studentId ?? "?"}`}
                </span>
                {isJustified(absence) ? (
                  <Badge className="bg-success-soft text-success-soft-foreground">Justificada</Badge>
                ) : (
                  <Badge className="bg-warning-soft text-warning-soft-foreground">Pendente</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {absence.attendance?.class?.className ?? "Turma"} · {formatDate(absence.attendanceDate)}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Selecione uma falta na lista para justificar.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="font-heading text-sm font-semibold">
                  {selected.attendance?.student?.fullName ?? `Aluno #${selected.attendance?.studentId}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.attendance?.class?.className ?? "Turma"} · {formatDate(selected.attendanceDate)}
                </p>
              </div>

              <div className="flex flex-col gap-[5px]">
                <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                  Motivo
                </Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: consulta médica, viagem em família..."
                  rows={4}
                />
              </div>

              <Button onClick={handleRegister} disabled={justify.isPending || !reason.trim()}>
                {justify.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          )}

          {/* Anexo (dropzone) faz parte do wireframe R2, mas o backend não tem upload de
              arquivo pra Absence — só o campo Reason (texto). */}
          <p className="mt-4 text-xs text-muted-foreground">
            Anexo de documento ainda não é suportado pelo backend — próxima etapa.
          </p>
        </div>
      </div>
    </div>
  );
}
