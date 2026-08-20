"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClasses } from "@/lib/kernel/use-classes";
import { useStudent, useStudentOccurrences } from "@/lib/kernel/use-student-ficha";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function calcularIdade(birthDate: string) {
  const nascimento = new Date(birthDate);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

const NOT_AVAILABLE_TABS = [
  {
    value: "responsaveis",
    label: "Responsáveis",
    reason:
      "Não existe entidade de responsável/guardião no backend — Student não tem nenhuma relação com um cadastro de responsável.",
  },
  {
    value: "frequencia",
    label: "Frequência",
    reason:
      "Não existe endpoint de histórico de presença por aluno (só por turma+data) — não dá pra calcular o % dos últimos 30 dias sem buscar dezenas de dias um por um.",
  },
  {
    value: "documentos",
    label: "Documentos",
    reason:
      "Não existe entidade de documento nem upload de arquivo genérico em nenhum lugar do backend.",
  },
];

export default function FichaAlunoPage() {
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);

  const { data: student, isLoading, isError } = useStudent(studentId);
  const { data: classes } = useClasses();
  const { data: occurrences, isLoading: loadingOccurrences } = useStudentOccurrences(studentId);

  const className = classes?.find((c) => c.id === student?.classId)?.className;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
        Não foi possível carregar o aluno.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin/alunos" className="text-xs text-muted-foreground hover:underline">
          ← Alunos
        </Link>
      </div>

      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary">
          {student.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold">{student.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {className ?? "Sem turma"} · {calcularIdade(student.birthDate)} anos
          </p>
        </div>
        {student.allergies && (
          <Badge className="ml-auto bg-destructive-soft text-destructive-soft-foreground">
            Alergia registrada
          </Badge>
        )}
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
          <TabsTrigger value="saude">Saúde</TabsTrigger>
          {NOT_AVAILABLE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">Nascimento</p>
              <p className="text-sm font-medium">{formatDate(student.birthDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Turma</p>
              <p className="text-sm font-medium">{className ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cadastrado em</p>
              <p className="text-sm font-medium">{formatDate(student.createdAt)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            CPF, matrícula, turno e &quot;autorizado a sair só&quot; do wireframe não
            existem no backend (Student não tem esses campos).
          </p>
        </TabsContent>

        <TabsContent value="ocorrencias" className="mt-4">
          {loadingOccurrences && <Skeleton className="h-32 w-full" />}
          {!loadingOccurrences && occurrences?.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nenhuma ocorrência registrada.
            </div>
          )}
          <div className="flex flex-col gap-2">
            {occurrences?.map((o) => (
              <div key={o.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{o.categoria ?? "—"}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDate(o.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{o.observation}</p>
                {o.teacher?.fullName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Registrado por {o.teacher.fullName}
                    {o.parentsNotified ? " · responsáveis notificados" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saude" className="mt-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">Alergias</p>
              <p className="text-sm font-medium">{student.allergies ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Medicação contínua</p>
              <p className="text-sm font-medium">{student.continuousMedication ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Restrição alimentar</p>
              <p className="text-sm font-medium">{student.dietaryRestriction ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano de saúde</p>
              <p className="text-sm font-medium">{student.healthInsurance ?? "—"}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Editável na lista de Alunos. Mostra só o estado atual — não existe timeline
            de registros de saúde no backend.
          </p>
        </TabsContent>

        {NOT_AVAILABLE_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t.reason}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
