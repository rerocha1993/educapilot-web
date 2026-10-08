"use client";

import { Images } from "lucide-react";

import { CartaoDeAlbum } from "@/components/relacionamento/portal/conteudo";
import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { useMuralDoPortal } from "@/lib/relacionamento/use-portal-familia";

/** Fotos: os álbuns do mural da turma e da escola. */
export default function MuralDoResponsavelPage() {
  const { data, isLoading, isError, refetch } = useMuralDoPortal();

  return (
    <>
      <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Fotos</h1>

      {isLoading && (
        <div className="grid grid-cols-2 gap-2.5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && <ErroDoPortal texto="Não foi possível carregar o mural." onTentar={() => refetch()} />}

      {data && data.length === 0 && (
        <VazioDoPortal
          icone={<Images />}
          titulo="Nenhum álbum por enquanto"
          texto="Fotos de festas, passeios e projetos da turma e da escola aparecem aqui."
        />
      )}

      {data && data.length > 0 && (
        <ul className="grid grid-cols-2 gap-2.5">
          {data.map((a) => (
            <li key={a.id}>
              <CartaoDeAlbum album={a} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
