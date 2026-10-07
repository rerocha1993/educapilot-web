"use client";

import { useParams } from "next/navigation";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EtiquetaDoStatus } from "@/components/relacionamento/etiquetas";
import { FormularioDeAtividade } from "@/components/relacionamento/formulario-de-atividade";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { ErroDeCarga } from "@/components/rh/campo";
import { Skeleton } from "@/components/ui/skeleton";
import { useAtividade } from "@/lib/relacionamento/use-conteudo";

export default function AtividadePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useAtividade(id);

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Atividades"
        eyebrowHref="/relacionamento/atividades"
        titulo={data?.titulo || "Atividade"}
        tags={data && <EtiquetaDoStatus status={data.status} />}
        apoio={data?.professorNome ? `Registrada por ${data.professorNome}` : undefined}
      />

      {isError && <ErroDeCarga texto="Não foi possível carregar a atividade." onTentar={() => refetch()} />}
      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {/* A chave é o id: o formulário nasce da atividade e não é refeito a cada resposta do servidor. */}
      {data && <FormularioDeAtividade key={data.id} atividade={data} />}
    </div>
  );
}
