"use client";

import { useRouter } from "next/navigation";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { ReuniaoComPaisForm } from "@/components/tasks/reuniao-com-pais-form";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";

/**
 * Nova reunião com os pais: agendar uma que vai acontecer ou registrar uma que já aconteceu. Abre vazia
 * pelo menu, ou com a turma e o aluno já escolhidos pelo atalho "Registrar reunião" do dossiê
 * (?turma=&aluno=).
 */
export default function NovaReuniaoComPaisPage() {
  const router = useRouter();
  const busca = useQueryStringLocal();

  const numero = (nome: string) => {
    const n = Number(busca.get(nome));
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const turma = numero("turma");
  const aluno = numero("aluno");
  const voltar = aluno ? `/ocorrencias/aluno/${aluno}` : "/reunioes-pais";

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <div className="md:hidden">
        <RotinaNav />
      </div>

      <CabecalhoDaPagina
        eyebrow={aluno ? "← Dossiê do aluno" : "← Reunião com os pais"}
        eyebrowHref={voltar}
        titulo="Nova reunião com os pais"
        apoio="Agende uma reunião ou registre uma que já aconteceu. A ata é interna da escola: a família não vê."
      />

      {/* A chave refaz o formulário se a URL trocar de aluno, em vez de manter o estado do anterior. */}
      <ReuniaoComPaisForm
        key={`${turma ?? ""}-${aluno ?? ""}`}
        turmaInicial={turma}
        alunoInicial={aluno}
        hrefDeVolta={voltar}
        aoSalvar={(r) => router.push(`/reunioes-pais/${r.id}`)}
      />
    </div>
  );
}
