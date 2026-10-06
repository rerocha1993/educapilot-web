"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { ErroDoPortal } from "@/components/relacionamento/portal/comum";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearSession } from "@/lib/auth/session";
import { useRastreio } from "@/lib/reception/rastreio-context";
import { useInicioDoPortal } from "@/lib/relacionamento/use-portal-familia";
import pacote from "../../../../package.json";

/** Mais: quem está logado, os filhos vinculados, a saída da conta e a versão do site. */
export default function MaisDoResponsavelPage() {
  const router = useRouter();
  const rastreio = useRastreio();
  const { data, isLoading, isError, refetch } = useInicioDoPortal();

  function sair() {
    // Para o GPS antes de largar a sessão: sem ela, as posições seguintes dariam 401.
    rastreio.parar();
    clearSession();
    router.replace("/login");
  }

  return (
    <>
      <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Mais</h1>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}
      {isError && <ErroDoPortal texto="Não foi possível carregar seus dados." onTentar={() => refetch()} />}

      {data && (
        <>
          <section aria-label="Seus dados" className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold tracking-[.1em] text-muted-foreground uppercase">Responsável</p>
            <p className="font-heading text-[18px] font-semibold tracking-[-.02em] break-words">{data.responsavel.nome}</p>
            <p className="text-sm text-muted-foreground">{data.escola.nome}</p>
          </section>

          <section aria-label="Seus filhos" className="flex flex-col gap-2">
            <h2 className="font-heading text-[16px] font-semibold tracking-[-.02em]">Seus filhos</h2>
            {data.alunos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno vinculado a você. Fale com a escola.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.alunos.map((a) => (
                  <li key={a.studentId} className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="font-medium break-words">{a.nome}</p>
                    {a.turma && <p className="text-[13px] text-muted-foreground">Turma {a.turma}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Button variant="outline" className="h-12 w-full text-base" onClick={sair}>
        <LogOut aria-hidden /> Sair
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        EducaPilot · versão <span className="font-mono tabular-nums">{pacote.version}</span>
      </p>
    </>
  );
}
