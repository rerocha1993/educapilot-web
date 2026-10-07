"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { GradeDeFotos } from "@/components/relacionamento/grade-de-fotos";
import { VisualizadorDeFotos } from "@/components/relacionamento/visualizador-de-fotos";
import { contagemDeFotos, LinkDeVolta } from "@/components/relacionamento/portal/conteudo";
import { ErroDoPortal } from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { baixarFotoDaFamilia } from "@/lib/relacionamento/api";
import { useAtividadeDoPortal, type AtividadeCompleta } from "@/lib/relacionamento/use-portal-familia";
import { capitalizar, diaComSemana } from "@/lib/tasks/calendario-datas";

export default function AtividadeDoResponsavelPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useAtividadeDoPortal(id);

  return (
    <>
      <LinkDeVolta href="/responsavel/atividades" rotulo="Atividades" />

      {isLoading && (
        <>
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </>
      )}

      {isError && <ErroDoPortal texto="Não foi possível abrir esta atividade." onTentar={() => refetch()} />}

      {data && <Conteudo atividade={data} />}
    </>
  );
}

function Conteudo({ atividade: a }: { atividade: AtividadeCompleta }) {
  const [aberta, setAberta] = useState<number | null>(null);

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[13px] text-muted-foreground">
          {a.data && <span>{capitalizar(diaComSemana(a.data))}</span>}
          {a.turma && <span> · {a.turma}</span>}
          {a.aluno && <span> · {a.aluno.split(" ")[0]}</span>}
        </p>
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] leading-[1.15] font-semibold tracking-[-.03em] break-words">
          {a.titulo}
        </h1>
        {a.professorNome && <p className="text-[13px] text-muted-foreground">Professora {a.professorNome}</p>}
      </header>

      {a.texto && <p className="text-[15px] leading-[1.65] break-words whitespace-pre-line">{a.texto}</p>}

      {a.fotos.length > 0 && (
        <section aria-label="Fotos" className="flex flex-col gap-2">
          <h2 className="font-heading text-[15px] font-semibold">
            Fotos <span className="font-normal text-muted-foreground tabular-nums">({contagemDeFotos(a.fotos.length)})</span>
          </h2>
          <GradeDeFotos fotos={a.fotos} baixar={baixarFotoDaFamilia} onAbrir={setAberta} />
        </section>
      )}

      <VisualizadorDeFotos
        fotos={a.fotos}
        indice={aberta}
        baixar={baixarFotoDaFamilia}
        onMudar={setAberta}
        onFechar={() => setAberta(null)}
      />
    </article>
  );
}
