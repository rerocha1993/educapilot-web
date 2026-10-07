"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

import { CartaoDeAtividade } from "@/components/relacionamento/portal/conteudo";
import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAtividadesDoPortal, useInicioDoPortal } from "@/lib/relacionamento/use-portal-familia";
import { cn } from "@/lib/utils";

/** Atividades da sala: o feed dos filhos, do mais recente ao mais antigo, que carrega ao rolar. */
export default function AtividadesDoResponsavelPage() {
  const { data: inicio } = useInicioDoPortal();
  const filhos = inicio?.alunos ?? [];

  // Nulo = todos os filhos.
  const [studentId, setStudentId] = useState<number | null>(null);
  const consulta = useAtividadesDoPortal(studentId);
  const atividades = consulta.data?.pages.flatMap((p) => p.itens) ?? [];

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = consulta;
  const sentinela = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo || !hasNextPage) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "300px" }
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, atividades.length]);

  return (
    <>
      <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Atividades</h1>

      {filhos.length > 1 && (
        <div role="group" aria-label="Filtrar por filho" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <Pilula ativa={studentId === null} onClick={() => setStudentId(null)}>
            Todos
          </Pilula>
          {filhos.map((f) => (
            <Pilula key={f.studentId} ativa={studentId === f.studentId} onClick={() => setStudentId(f.studentId)}>
              {f.nome.split(" ")[0]}
            </Pilula>
          ))}
        </div>
      )}

      {consulta.isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      )}

      {consulta.isError && (
        <ErroDoPortal texto="Não foi possível carregar as atividades." onTentar={() => consulta.refetch()} />
      )}

      {consulta.data && atividades.length === 0 && (
        <VazioDoPortal
          icone={<Camera />}
          titulo="Nenhuma atividade por enquanto"
          texto="Quando a professora registrar o dia da turma, as fotos e o relato aparecem aqui."
        />
      )}

      {atividades.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {atividades.map((a) => (
            <li key={a.id}>
              <CartaoDeAtividade atividade={a} mostrarAluno={filhos.length > 1 && studentId === null} />
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <>
          <div ref={sentinela} aria-hidden className="h-px" />
          <Button variant="outline" className="h-12 w-full" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
            {isFetchingNextPage ? "Carregando..." : "Ver mais atividades"}
          </Button>
        </>
      )}
    </>
  );
}

function Pilula({ ativa, onClick, children }: { ativa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      className={cn(
        "min-h-11 shrink-0 rounded-full border px-4 text-[13.5px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        ativa ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}
