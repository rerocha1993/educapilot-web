"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Images } from "lucide-react";

import { GradeDeFotos } from "@/components/relacionamento/grade-de-fotos";
import { VisualizadorDeFotos } from "@/components/relacionamento/visualizador-de-fotos";
import { contagemDeFotos, LinkDeVolta } from "@/components/relacionamento/portal/conteudo";
import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import { baixarFotoDaFamilia } from "@/lib/relacionamento/api";
import { useAlbumDoPortal, type AlbumCompleto } from "@/lib/relacionamento/use-portal-familia";

export default function AlbumDoResponsavelPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useAlbumDoPortal(id);

  return (
    <>
      <LinkDeVolta href="/responsavel/mural" rotulo="Fotos" />

      {isLoading && (
        <>
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </>
      )}

      {isError && <ErroDoPortal texto="Não foi possível abrir este álbum." onTentar={() => refetch()} />}

      {data && <Conteudo album={data} />}
    </>
  );
}

function Conteudo({ album: a }: { album: AlbumCompleto }) {
  const [aberta, setAberta] = useState<number | null>(null);

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[13px] text-muted-foreground">
          {a.escolaToda ? "Escola toda" : a.turma}
          {a.dataDoEvento && <span className="tabular-nums"> · {formatarSoData(a.dataDoEvento)}</span>}
        </p>
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] leading-[1.15] font-semibold tracking-[-.03em] break-words">
          {a.titulo}
        </h1>
      </header>

      {a.descricao && <p className="text-[15px] leading-[1.65] break-words whitespace-pre-line">{a.descricao}</p>}

      {a.fotos.length === 0 ? (
        <VazioDoPortal icone={<Images />} titulo="Este álbum ainda não tem fotos" />
      ) : (
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
