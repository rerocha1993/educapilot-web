"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  useCreateOccurrence,
  OCCURRENCE_CATEGORIES,
  type OccurrenceCategoria,
} from "@/lib/tasks/use-occurrences";

export default function OcorrenciasPage() {
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [categoria, setCategoria] = useState<OccurrenceCategoria>("Comportamento");
  const [observation, setObservation] = useState("");
  const [notify, setNotify] = useState(false);

  const { data: students } = useStudentsByClass(classId);
  const createOccurrence = useCreateOccurrence();

  useEffect(() => {
    setStudentId(null);
  }, [classId]);

  function reset() {
    setObservation("");
    setCategoria("Comportamento");
    setNotify(false);
    setStudentId(null);
  }

  async function handleSubmit() {
    if (classId === null || studentId === null || !observation.trim()) return;
    try {
      await createOccurrence.mutateAsync({
        childId: studentId,
        classId,
        categoria,
        observation: observation.trim(),
        parentsNotified: notify,
      });
      toast.success("Ocorrência registrada.");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar ocorrência.");
    }
  }

  const selectedClass = classes?.find((c) => c.id === classId);
  const selectedStudent = students?.find((s) => s.id === studentId);

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Registrar ocorrência</h1>
          <p className="text-sm text-muted-foreground">Comportamento, saúde, pedagógica ou atraso.</p>
        </div>
        <Link
          href="/ocorrencias/relatorio"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <BarChart3 className="size-3.5" />
          Relatório semanal
        </Link>
      </div>

      <div className="flex max-w-xl flex-col gap-4 rounded-lg border border-border bg-card p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-[5px]">
            <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Turma
            </span>
            <Select value={classId?.toString() ?? ""} onValueChange={(v) => v && setClassId(Number(v))}>
              <SelectTrigger className="w-full">
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
              Aluno
            </span>
            <Select
              value={studentId?.toString() ?? ""}
              onValueChange={(v) => v && setStudentId(Number(v))}
              disabled={classId === null}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione">
                  {() => selectedStudent?.fullName ?? "Selecione"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {students?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <span className="mb-2 block font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
            Categoria
          </span>
          <div className="flex flex-wrap gap-2">
            {OCCURRENCE_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  categoria === c
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
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={4}
            placeholder="O que aconteceu..."
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
          Notificar responsável
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={reset}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createOccurrence.isPending || classId === null || studentId === null || !observation.trim()}
          >
            {createOccurrence.isPending ? "Registrando..." : "Registrar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
