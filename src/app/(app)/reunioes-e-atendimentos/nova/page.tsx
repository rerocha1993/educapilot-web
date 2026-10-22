"use client";

import { useRouter } from "next/navigation";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { ReuniaoForm } from "@/components/tasks/reuniao-form";
import { novaChave, type EnvolvidoDoForm } from "@/components/tasks/seletor-de-envolvidos";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";
import { useClasses } from "@/lib/kernel/use-classes";
import { useStudentsByClass } from "@/lib/kernel/use-students";

/**
 * Nova reunião ou atendimento: agendar uma que vai acontecer ou registrar uma que já aconteceu. Abre vazia
 * pelo menu, ou com o aluno já incluído pelo atalho "Registrar reunião" do dossiê (?turma=&aluno=).
 */
export default function NovaReuniaoPage() {
  const router = useRouter();
  const busca = useQueryStringLocal();

  const numero = (nome: string) => {
    const n = Number(busca.get(nome));
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const turma = numero("turma");
  const aluno = numero("aluno");
  const voltar = aluno ? `/ocorrencias/aluno/${aluno}` : "/reunioes-e-atendimentos";

  const { data: turmas } = useClasses();
  const { data: alunos, isLoading } = useStudentsByClass(aluno && turma ? turma : null);
  const esperando = !!aluno && !!turma && isLoading;

  const dele = alunos?.find((a) => a.id === aluno);
  const nomeDaTurma = turmas?.find((t) => t.id === turma)?.className ?? null;
  const iniciais: EnvolvidoDoForm[] = dele
    ? [{ chave: novaChave(), tipo: "Aluno", studentId: dele.id, nome: dele.fullName, detalhe: nomeDaTurma }]
    : [];

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <div className="md:hidden">
        <RotinaNav />
      </div>

      <CabecalhoDaPagina
        eyebrow={aluno ? "← Ficha do aluno" : "← Reuniões e atendimentos"}
        eyebrowHref={voltar}
        titulo="Nova reunião ou atendimento"
        apoio="Agende uma reunião ou registre uma que já aconteceu. A ata é interna da escola: a família não vê."
      />

      {esperando ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <span className="sr-only">Carregando o aluno…</span>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        // A chave refaz o formulário se a URL trocar de aluno, em vez de manter o estado do anterior.
        <ReuniaoForm
          key={`${turma ?? ""}-${aluno ?? ""}-${dele?.id ?? ""}`}
          envolvidosIniciais={iniciais}
          hrefDeVolta={voltar}
          aoSalvar={(r) => router.push(`/reunioes-e-atendimentos/${r.id}`)}
        />
      )}
    </div>
  );
}
