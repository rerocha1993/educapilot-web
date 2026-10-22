"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";

import { BoletimDoAluno } from "@/components/notas/boletim-do-aluno";
import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoletimDoPortal } from "@/lib/notas/use-notas";
import { useInicioDoPortal } from "@/lib/relacionamento/use-portal-familia";
import { cn } from "@/lib/utils";

/**
 * Boletim do filho no portal: só os períodos que a escola publicou, no mesmo desenho da escola e sem
 * edição. Com mais de um filho, a troca fica no topo.
 */
export default function BoletimDoResponsavelPage() {
  const inicio = useInicioDoPortal();
  const filhos = inicio.data?.alunos ?? [];
  const [filhoEscolhido, setFilhoEscolhido] = useState<number | null>(null);
  const idDoFilho = filhoEscolhido != null && filhos.some((f) => f.studentId === filhoEscolhido) ? filhoEscolhido : (filhos[0]?.studentId ?? null);
  const ano = new Date().getFullYear();

  const boletim = useBoletimDoPortal(idDoFilho, ano);

  return (
    <>
      <div>
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Boletim</h1>
        <p className="text-sm text-muted-foreground">Notas e comportamento de {ano}, nos períodos que a escola publicou.</p>
      </div>

      {filhos.length > 1 && (
        <div role="group" aria-label="Escolher o filho" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {filhos.map((f) => (
            <button
              key={f.studentId}
              type="button"
              aria-pressed={f.studentId === idDoFilho}
              onClick={() => setFilhoEscolhido(f.studentId)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                f.studentId === idDoFilho ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
              )}
            >
              {f.nome.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {(inicio.isLoading || boletim.isLoading) && <Skeleton className="h-64 w-full rounded-xl" />}
      {inicio.isError && <ErroDoPortal texto="Não foi possível carregar seus dados." onTentar={() => void inicio.refetch()} />}
      {boletim.isError && (
        <ErroDoPortal texto={boletim.error instanceof Error ? boletim.error.message : "Não foi possível carregar o boletim."} onTentar={() => void boletim.refetch()} />
      )}

      {inicio.data && filhos.length === 0 && (
        <VazioDoPortal icone={<GraduationCap />} titulo="Nenhum aluno vinculado" texto="Fale com a escola para vincular seu filho à sua conta." />
      )}

      {boletim.data &&
        (boletim.data.periodos.length === 0 ? (
          <VazioDoPortal icone={<GraduationCap />} titulo="O boletim ainda não foi publicado" texto="Quando a escola publicar um período, você recebe um aviso e ele aparece aqui." />
        ) : (
          <BoletimDoAluno boletim={boletim.data} variante="portal" escola={inicio.data?.escola.nomeDoPortal || inicio.data?.escola.nome} />
        ))}
    </>
  );
}
