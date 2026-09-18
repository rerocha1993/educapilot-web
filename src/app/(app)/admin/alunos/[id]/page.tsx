"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList, Contact } from "lucide-react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClasses } from "@/lib/kernel/use-classes";
import { useStudent, useStudentOccurrences } from "@/lib/kernel/use-student-ficha";
import { useGuardiansByStudent } from "@/lib/finance/use-guardians";
import { formatarData, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";

// Nascimento é só-data: compara pelos componentes da string com o "hoje" de Brasília,
// sem Date, para o aniversário não virar um dia antes/depois por causa do fuso.
function calcularIdade(birthDate: string) {
  const [anoNasc, mesNasc, diaNasc] = birthDate.slice(0, 10).split("-").map(Number);
  const [anoHoje, mesHoje, diaHoje] = hojeIsoBrasilia().split("-").map(Number);
  let idade = anoHoje - anoNasc;
  const aindaNaoFezAniversario = mesHoje < mesNasc || (mesHoje === mesNasc && diaHoje < diaNasc);
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

// Responsáveis saiu daqui em 2026-09: a justificativa ("não existe entidade de responsável no
// backend") deixou de valer quando o módulo Financeiro entrou com Guardian/StudentGuardian, e a
// importação do Agenda Edu passou a trazer esses dados. A aba continuava avisando que não dava.
const NOT_AVAILABLE_TABS = [
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
  const { data: guardians, isLoading: loadingGuardians } = useGuardiansByStudent(studentId);

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

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5 md:flex-nowrap">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent font-heading text-lg font-semibold text-accent-foreground">
          {student.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 md:flex-initial">
          <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Administração</p>
          <h1 className="mt-1 font-heading text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.15] tracking-[-.03em] break-words">
            {student.fullName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {className ?? "Sem turma"} ·{" "}
            <span className="font-mono tabular-nums">{calcularIdade(student.birthDate)}</span> anos
          </p>
        </div>
        {student.allergies && (
          <Badge variant="overdue" className="md:ml-auto">
            Alergia registrada
          </Badge>
        )}
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
          <TabsTrigger value="saude">Saúde</TabsTrigger>
          <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>

        {NOT_AVAILABLE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <div className="grid grid-cols-1 gap-4 rounded-xl sm:grid-cols-3 border border-border bg-card p-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Nascimento</p>
              <p className="font-mono text-sm font-medium tabular-nums">{formatarSoData(student.birthDate)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Turma</p>
              <p className="text-sm font-medium">{className ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Cadastrado em</p>
              <p className="font-mono text-sm font-medium tabular-nums">{formatarData(student.createdAt)}</p>
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
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border-dashed bg-card px-5 py-9 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <ClipboardList className="size-4" />
              </span>
              <p className="mt-3 font-heading text-[15px] font-semibold">Nenhuma ocorrência registrada.</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {occurrences?.map((o) => (
              <div key={o.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap md:gap-0">
                  <Badge variant="secondary">{o.categoria ?? "—"}</Badge>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatarData(o.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm break-words">{o.observation}</p>
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
          <div className="grid grid-cols-1 gap-4 rounded-xl sm:grid-cols-2 border border-border bg-card p-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Alergias</p>
              <p className="text-sm font-medium">{student.allergies ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Medicação contínua</p>
              <p className="text-sm font-medium">{student.continuousMedication ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Restrição alimentar</p>
              <p className="text-sm font-medium">{student.dietaryRestriction ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Plano de saúde</p>
              <p className="text-sm font-medium">{student.healthInsurance ?? "—"}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Editável na lista de Alunos. Mostra só o estado atual — não existe timeline
            de registros de saúde no backend.
          </p>
        </TabsContent>

        <TabsContent value="responsaveis" className="mt-4">
          {loadingGuardians && <Skeleton className="h-24 w-full" />}

          {!loadingGuardians && (guardians ?? []).length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border-dashed bg-card px-5 py-9 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Contact className="size-4" />
              </span>
              <p className="mt-3 font-heading text-[15px] font-semibold">
                Nenhum responsável vinculado a este aluno.
              </p>
              <p className="mt-1.5 max-w-[320px] text-[13px] leading-[1.55] text-pretty text-muted-foreground">
                Os responsáveis vêm da importação do Agenda Edu ou do cadastro em Administração →
                Responsáveis.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {(guardians ?? []).map((g) => {
              // O vínculo com ESTE aluno, entre os vínculos do responsável: um mesmo responsável
              // costuma ter mais de um filho na escola, e o parentesco/quem paga é por vínculo.
              const vinculo = (g.vinculos ?? []).find((v) => v.studentId === studentId);

              return (
                <Link
                  key={g.id}
                  href={`/admin/responsaveis?responsavel=${g.id}`}
                  className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-semibold break-words">{g.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {vinculo?.parentesco || "Parentesco não informado"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 md:flex-nowrap md:justify-start">
                      {vinculo?.responsavelFinanceiro && (
                        <Badge variant="secondary">Responsável financeiro</Badge>
                      )}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                    {[
                      ["CPF", g.cpf],
                      ["E-mail", g.email],
                      ["Telefone", g.phone],
                    ].map(([rotulo, valor]) => (
                      <div key={rotulo}>
                        <dt className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                          {rotulo}
                        </dt>
                        <dd className="break-words">{valor || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        {NOT_AVAILABLE_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <div className="rounded-xl border border-dashed border-border-dashed bg-card p-4 text-[13px] leading-[1.55] text-pretty text-muted-foreground">
              {t.reason}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
