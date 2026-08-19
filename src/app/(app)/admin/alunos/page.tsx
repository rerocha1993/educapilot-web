"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useStudentsByClass,
  useSaveStudent,
  useDeleteStudent,
  type StudentDto,
} from "@/lib/kernel/use-students";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AlunosPage() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (selectedClassId === null && classes && classes.length > 0) {
      setSelectedClassId(classes[0].id ?? null);
    }
  }, [classes, selectedClassId]);

  const { data: students, isLoading: studentsLoading, isError } = useStudentsByClass(
    selectedClassId
  );
  const saveStudent = useSaveStudent();
  const deleteStudent = useDeleteStudent();

  const [editing, setEditing] = useState<StudentDto | "new" | null>(null);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [allergies, setAllergies] = useState("");
  const [continuousMedication, setContinuousMedication] = useState("");
  const [dietaryRestriction, setDietaryRestriction] = useState("");
  const [healthInsurance, setHealthInsurance] = useState("");

  useEffect(() => {
    if (editing === "new") {
      setFullName("");
      setBirthDate("");
      setAllergies("");
      setContinuousMedication("");
      setDietaryRestriction("");
      setHealthInsurance("");
    } else if (editing) {
      setFullName(editing.fullName);
      setBirthDate(editing.birthDate.slice(0, 10));
      setAllergies(editing.allergies ?? "");
      setContinuousMedication(editing.continuousMedication ?? "");
      setDietaryRestriction(editing.dietaryRestriction ?? "");
      setHealthInsurance(editing.healthInsurance ?? "");
    }
  }, [editing]);

  const filteredStudents = (students ?? []).filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    if (!fullName.trim() || !birthDate || selectedClassId === null) return;
    try {
      await saveStudent.mutateAsync({
        ...(editing !== "new" && editing ? { id: editing.id } : {}),
        fullName: fullName.trim(),
        birthDate,
        classId: selectedClassId,
        allergies: allergies.trim() || null,
        continuousMedication: continuousMedication.trim() || null,
        dietaryRestriction: dietaryRestriction.trim() || null,
        healthInsurance: healthInsurance.trim() || null,
      });
      toast.success(editing === "new" ? "Aluno cadastrado." : "Aluno atualizado.");
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleDelete(student: StudentDto) {
    try {
      await deleteStudent.mutateAsync({ id: student.id, classId: student.classId });
      toast.success("Aluno excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="flex gap-4">
      {/* Coluna de turmas — ver A9 no handoff de design */}
      <aside className="w-40 shrink-0">
        <h2 className="mb-2 font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
          Turmas
        </h2>
        <div className="flex flex-col gap-0.5">
          {classesLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          {classes?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id ?? null)}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                selectedClassId === c.id
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              )}
            >
              <span className="truncate">{c.className}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {c.students?.length ?? 0}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
          <Button onClick={() => setEditing("new")} disabled={selectedClassId === null}>
            <Plus className="size-4" />
            Novo aluno
          </Button>
        </div>

        {isError && (
          <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
            Não foi possível carregar os alunos.
          </div>
        )}

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Data de nascimento</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!studentsLoading && filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    {selectedClassId === null
                      ? "Selecione uma turma."
                      : "Nenhum aluno encontrado nesta turma."}
                  </TableCell>
                </TableRow>
              )}

              {filteredStudents.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {s.fullName}
                      {s.allergies && (
                        <Badge className="gap-1 bg-destructive-soft text-destructive-soft-foreground">
                          <AlertTriangle className="size-3" />
                          Alergia
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatDate(s.birthDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(s)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(s)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Matrícula, responsável e status fazem parte do wireframe A9, mas o backend
            ainda não tem esses campos em Student — ver design/handoff/README.md. */}
        <p className="text-xs text-muted-foreground">
          Matrícula, responsável e status ainda não são suportados pelo backend —
          próxima etapa.
        </p>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Novo aluno" : "Editar aluno"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Nome completo
              </Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Data de nascimento
              </Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-3 font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Saúde (R5)
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Alergias</Label>
                  <Textarea
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    rows={2}
                    placeholder="Nenhuma conhecida"
                  />
                </div>
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Medicação contínua</Label>
                  <Textarea
                    value={continuousMedication}
                    onChange={(e) => setContinuousMedication(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Restrição alimentar</Label>
                  <Textarea
                    value={dietaryRestriction}
                    onChange={(e) => setDietaryRestriction(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Convênio</Label>
                  <Input value={healthInsurance} onChange={(e) => setHealthInsurance(e.target.value)} />
                </div>
              </div>
              {/* Timeline de registros recentes faz parte do wireframe R5, mas não tem
                  fonte de dados no backend (não é um histórico, é só o estado atual). */}
              <p className="mt-3 text-xs text-muted-foreground">
                Histórico de registros de saúde ainda não é suportado pelo backend —
                estes campos guardam só o estado atual.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveStudent.isPending || !fullName.trim() || !birthDate}
            >
              {saveStudent.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
