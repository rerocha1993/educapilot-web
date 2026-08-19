"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useAttendanceByClass,
  useSaveAttendance,
  type AttendanceStatus,
  type SaveAttendanceRow,
} from "@/lib/tasks/use-attendance";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: "Presente",
  F: "Falta",
  A: "Atraso",
};

function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // corrige pro fuso local
  return d.toISOString().slice(0, 10);
}

export default function ChamadaPage() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [dateStr, setDateStr] = useState(todayIso());

  useEffect(() => {
    if (selectedClassId === null && classes && classes.length > 0) {
      setSelectedClassId(classes[0].id ?? null);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes?.find((c) => c.id === selectedClassId);
  const roster = useMemo(() => {
    const students = (selectedClass?.students ?? []).filter(
      (s): s is typeof s & { id: number; fullName: string } => s.id != null && !!s.fullName
    );
    return [...students].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [selectedClass]);

  const date = useMemo(() => new Date(dateStr + "T00:00:00"), [dateStr]);
  const { data: existingAttendance, isLoading: attendanceLoading, isError } =
    useAttendanceByClass(selectedClassId, date);
  const saveAttendance = useSaveAttendance();

  // studentId -> { id do registro existente (se houver), status escolhido }
  const [marks, setMarks] = useState<Record<number, { id?: number; status: AttendanceStatus | null }>>(
    {}
  );

  useEffect(() => {
    const next: Record<number, { id?: number; status: AttendanceStatus | null }> = {};
    for (const student of roster) {
      const existing = existingAttendance?.find((a) => a.studentId === student.id);
      next[student.id] = { id: existing?.id, status: existing?.status ?? null };
    }
    setMarks(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, dateStr, existingAttendance]);

  const presentCount = Object.values(marks).filter((m) => m.status === "P").length;

  function setStatus(studentId: number, status: AttendanceStatus) {
    setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }

  function markAllPresent() {
    setMarks((prev) => {
      const next = { ...prev };
      for (const student of roster) {
        next[student.id] = { ...next[student.id], status: "P" };
      }
      return next;
    });
  }

  async function handleSave() {
    if (selectedClassId === null) return;
    const rows: SaveAttendanceRow[] = roster
      .filter((s) => marks[s.id]?.status)
      .map((s) => ({
        id: marks[s.id]?.id,
        classId: selectedClassId,
        studentId: s.id,
        attendanceDate: dateStr,
        status: marks[s.id]!.status as AttendanceStatus,
      }));

    if (rows.length === 0) {
      toast.error("Marque a presença de pelo menos um aluno.");
      return;
    }

    try {
      await saveAttendance.mutateAsync(rows);
      toast.success("Chamada salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a chamada.");
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">
            Chamada{selectedClass ? ` · ${selectedClass.className}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {roster.length} alunos · {presentCount} presentes
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-[5px]">
            <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Turma
            </span>
            <Select
              value={selectedClassId?.toString() ?? ""}
              onValueChange={(v) => v && setSelectedClassId(Number(v))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Selecione">
                  {() => selectedClass?.className ?? "Selecione"}
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

          <div className="flex flex-col gap-[5px]">
            <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Data
            </span>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="h-9 w-40"
            />
          </div>

          <Button variant="outline" onClick={markAllPresent} disabled={roster.length === 0}>
            Marcar todos presentes
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a chamada desta turma/data.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Aluno</th>
              <th className="px-4 py-2 font-medium">Presença</th>
            </tr>
          </thead>
          <tbody>
            {(classesLoading || attendanceLoading) &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3" colSpan={2}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!classesLoading && !attendanceLoading && roster.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {selectedClassId === null ? "Selecione uma turma." : "Turma sem alunos."}
                </td>
              </tr>
            )}

            {roster.map((student) => {
              const status = marks[student.id]?.status ?? null;
              return (
                <tr key={student.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{student.fullName}</td>
                  <td className="px-4 py-2 h-11">
                    <div className="inline-flex overflow-hidden rounded-md border border-border">
                      {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(student.id, s)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium transition-colors",
                            status === s
                              ? s === "P"
                                ? "bg-success-soft text-success-soft-foreground"
                                : s === "F"
                                  ? "bg-destructive-soft text-destructive-soft-foreground"
                                  : "bg-warning-soft text-warning-soft-foreground"
                              : "bg-transparent text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Chegada (horário) e Observação por aluno fazem parte do wireframe R1, mas o
          backend não tem esses campos em Attendance ainda — ver
          design/handoff/README.md e SharedKernel/.../Attendance.cs. */}
      <p className="text-xs text-muted-foreground">
        Horário de chegada e observação por aluno ainda não são suportados pelo
        backend — próxima etapa.
      </p>

      <div className="fixed inset-x-0 bottom-0 left-56 flex items-center justify-between border-t border-border bg-card px-6 py-3 shadow-[0_-1px_4px_rgba(0,0,0,.04)]">
        <span className="text-sm text-muted-foreground">
          {roster.length} alunos · {presentCount} presentes
        </span>
        <Button onClick={handleSave} disabled={saveAttendance.isPending || roster.length === 0}>
          {saveAttendance.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
