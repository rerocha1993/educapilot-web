"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, Pencil, AlertTriangle, IdCard, UserRound } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useStudentsByClass,
  useSaveStudent,
  useDeleteStudent,
  type StudentDto,
} from "@/lib/kernel/use-students";
import { cn } from "@/lib/utils";
import { formatarSoData } from "@/lib/format/date";
import { useActiveModules } from "@/lib/kernel/use-active-modules";
import {
  PeriodoEditavel,
  descreverPeriodo,
  periodoCompleto,
  valorDoPeriodo,
  type ValorDoPeriodo,
} from "@/components/reception/periodo-do-aluno-campos";
import {
  useConfiguracaoPortaria,
  useDefinirPeriodo,
  usePeriodoDoAluno,
  usePeriodos,
} from "@/lib/reception/use-portaria";

/** Estado vazio no padrão do guia: cartão tracejado, ícone num quadrado e texto curto. */
function SemAlunos({ semTurma, semBorda = false }: { semTurma: boolean; semBorda?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-5 py-9 text-center",
        !semBorda && "rounded-xl border border-dashed border-border-dashed bg-card"
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        <UserRound className="size-4" />
      </span>
      <p className="mt-3 max-w-[280px] font-heading text-[15px] font-semibold text-pretty">
        {semTurma ? "Selecione uma turma." : "Nenhum aluno encontrado nesta turma."}
      </p>
    </div>
  );
}

function PeriodoNaLista({ periodo }: { periodo?: Parameters<typeof descreverPeriodo>[0] }) {
  const descricao = periodo ? descreverPeriodo(periodo) : null;
  if (!descricao) return <span className="text-xs text-muted-foreground">Sem período</span>;
  return (
    <>
      <span>{descricao.rotulo}</span>
      {descricao.horarios && <span className="block text-xs text-muted-foreground">{descricao.horarios}</span>}
    </>
  );
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

  // Turma do aluno, separada do filtro da lista: até aqui salvar usava a turma FILTRADA, então
  // não havia como mover um aluno de turma — abrir o cadastro e salvar o devolvia para a mesma.
  // Faz falta na virada do ano, quando um ou outro aluno vai para uma turma diferente da que a
  // progressão define para o grupo.
  const [classId, setClassId] = useState<number | null>(null);

  // Período da Portaria no cadastro do aluno, só para escola com o módulo. `periodoAlterado` nulo é
  // "não mexeu": nesse caso salvar o aluno não toca no período que já existe.
  const { data: modulosAtivos } = useActiveModules();
  const temPortaria = (modulosAtivos ?? []).some((m) => m.slug === "reception");
  const editandoId = editing && editing !== "new" ? editing.id : null;
  const { data: periodoAtual, isLoading: carregandoPeriodo } = usePeriodoDoAluno(editandoId, temPortaria);
  const { data: configPortaria } = useConfiguracaoPortaria(temPortaria);
  const definirPeriodo = useDefinirPeriodo();
  const [periodoAlterado, setPeriodoAlterado] = useState<ValorDoPeriodo | null>(null);

  // O período mora só aqui, no cadastro do aluno: a coluna na lista mostra de relance quem está sem.
  const { data: periodosDaTurma } = usePeriodos(selectedClassId, temPortaria && selectedClassId !== null);
  const periodoPorAluno = new Map((periodosDaTurma ?? []).map((p) => [p.studentId, p]));

  function abrirCadastro(aluno: StudentDto | "new") {
    setPeriodoAlterado(null);
    setEditing(aluno);
  }

  useEffect(() => {
    if (editing === "new") {
      setFullName("");
      setBirthDate("");
      setAllergies("");
      setContinuousMedication("");
      setDietaryRestriction("");
      setHealthInsurance("");
      setClassId(selectedClassId);
    } else if (editing) {
      setFullName(editing.fullName);
      setBirthDate(editing.birthDate.slice(0, 10));
      setAllergies(editing.allergies ?? "");
      setContinuousMedication(editing.continuousMedication ?? "");
      setDietaryRestriction(editing.dietaryRestriction ?? "");
      setHealthInsurance(editing.healthInsurance ?? "");
      setClassId(editing.classId);
    }
  }, [editing, selectedClassId]);

  const filteredStudents = (students ?? []).filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    if (!fullName.trim() || !birthDate || classId === null) return;
    if (periodoAlterado && !periodoCompleto(periodoAlterado)) {
      toast.error("Escolha a orientação e informe o horário do período.");
      return;
    }
    try {
      const id = await saveStudent.mutateAsync({
        ...(editing !== "new" && editing ? { id: editing.id } : {}),
        fullName: fullName.trim(),
        birthDate,
        classId,
        allergies: allergies.trim() || null,
        continuousMedication: continuousMedication.trim() || null,
        dietaryRestriction: dietaryRestriction.trim() || null,
        healthInsurance: healthInsurance.trim() || null,
      });
      if (temPortaria && periodoAlterado && id) {
        await definirPeriodo.mutateAsync({
          studentId: id,
          periodo: {
            tipo: periodoAlterado.tipo,
            orientacao: periodoAlterado.orientacao,
            horarioReferencia: periodoAlterado.horarioReferencia || null,
          },
        });
      }
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
    <div className="flex flex-col gap-5">
      <CabecalhoDaPagina
        eyebrow="Administração"
        titulo="Alunos"
        apoio="Cadastro com data de nascimento, período e turma."
        acoes={
          <Button
            variant="action"
            onClick={() => abrirCadastro("new")}
            disabled={selectedClassId === null}
            className="w-full md:w-auto"
          >
            <Plus className="size-4" />
            Novo aluno
          </Button>
        }
      />

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Coluna de turmas — ver A9 no handoff de design. No celular vira uma faixa que rola de lado. */}
        <aside className="min-w-0 md:w-40 md:shrink-0">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Turmas</h2>
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:pb-0">
            {classesLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-md md:h-8 md:w-full" />
              ))}
            {classes?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id ?? null)}
                className={cn(
                  "flex min-h-10 shrink-0 items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors md:min-h-0 md:gap-0 md:px-2",
                  selectedClassId === c.id
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                )}
              >
                <span className="truncate">{c.className}</span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {c.students?.length ?? 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 md:h-9"
            />
          </div>

          {isError && (
            <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
              Não foi possível carregar os alunos.
            </div>
          )}

          <div className="flex flex-col gap-2 md:hidden">
            {studentsLoading &&
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}

            {!studentsLoading && filteredStudents.length === 0 && <SemAlunos semTurma={selectedClassId === null} />}

            {filteredStudents.map((s) => (
              <div key={s.id} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="min-w-0 break-words">{s.fullName}</span>
                    {s.allergies && (
                      <Badge variant="overdue" className="gap-1">
                        <AlertTriangle className="size-3" />
                        Alergia
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">{formatarSoData(s.birthDate)}</span>
                  {temPortaria && (
                    <div className="text-sm">
                      <PeriodoNaLista periodo={periodoPorAluno.get(s.id)} />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    href={`/admin/alunos/${s.id}`}
                    title="Ficha do aluno"
                    className={buttonVariants({ variant: "ghost", size: "icon" })}
                  >
                    <IdCard className="size-4" />
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => abrirCadastro(s)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(s)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Data de nascimento</TableHead>
                  {temPortaria && <TableHead>Período</TableHead>}
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={temPortaria ? 4 : 3}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!studentsLoading && filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={temPortaria ? 4 : 3} className="p-0">
                      <SemAlunos semTurma={selectedClassId === null} semBorda />
                    </TableCell>
                  </TableRow>
                )}

                {filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {s.fullName}
                        {s.allergies && (
                          <Badge variant="overdue" className="gap-1">
                            <AlertTriangle className="size-3" />
                            Alergia
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {formatarSoData(s.birthDate)}
                    </TableCell>
                    {temPortaria && (
                      <TableCell className="text-sm">
                        <PeriodoNaLista periodo={periodoPorAluno.get(s.id)} />
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/alunos/${s.id}`}
                          title="Ficha do aluno"
                          className={buttonVariants({ variant: "ghost", size: "icon", className: "size-7" })}
                        >
                          <IdCard className="size-3.5" />
                        </Link>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => abrirCadastro(s)}>
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
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Novo aluno" : "Editar aluno"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Nome completo
              </Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Data de nascimento
              </Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Turma
              </Label>
              <Select
                value={classId === null ? undefined : String(classId)}
                onValueChange={(v) => v && setClassId(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() =>
                      (classes ?? []).find((c) => c.id === classId)?.className ?? "Selecione"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(classes ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {temPortaria && (
              <div className="border-t border-border pt-3">
                <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                  Período
                </p>
                {carregandoPeriodo ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <PeriodoEditavel
                    key={editandoId ?? "novo"}
                    inicial={valorDoPeriodo(editandoId ? periodoAtual : null)}
                    config={configPortaria}
                    onChange={setPeriodoAlterado}
                  />
                )}
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
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
