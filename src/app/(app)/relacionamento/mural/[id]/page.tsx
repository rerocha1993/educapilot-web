"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EyeOff, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { AvisoDeAutorizacaoDeImagem } from "@/components/relacionamento/aviso-de-autorizacao";
import { DialogDeAlbum } from "@/components/relacionamento/dialog-de-album";
import { EnvioDeFotos } from "@/components/relacionamento/envio-de-fotos";
import { EtiquetaDoStatusDoAlbum } from "@/components/relacionamento/etiquetas";
import { GerenciadorDeFotos } from "@/components/relacionamento/gerenciador-de-fotos";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { VisualizadorDeFotos } from "@/components/relacionamento/visualizador-de-fotos";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import { baixarFotoDoMural } from "@/lib/relacionamento/api";
import {
  LIMITES_DE_FOTOS,
  useAlbum,
  useDefinirCapaDoAlbum,
  useDespublicarAlbum,
  useEnvioDeFotos,
  useExcluirAlbum,
  usePublicarAlbum,
  type AlbumDetalhe,
} from "@/lib/relacionamento/use-conteudo";

type Acao = "publicar" | "despublicar" | "excluir";

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useAlbum(id);

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      {isError && <ErroDeCarga texto="Não foi possível carregar o álbum." onTentar={() => refetch()} />}
      {isLoading && (
        <>
          <Skeleton className="h-16 w-2/3 rounded-lg" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </>
      )}

      {data && <Conteudo album={data} />}
    </div>
  );
}

function Conteudo({ album }: { album: AlbumDetalhe }) {
  const router = useRouter();
  const publicar = usePublicarAlbum();
  const despublicar = useDespublicarAlbum();
  const excluir = useExcluirAlbum();
  const definirCapa = useDefinirCapaDoAlbum();

  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState<Acao | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);

  const { porLote, porConteudo } = LIMITES_DE_FOTOS.mural;
  const idsAtuais = useMemo(() => album.fotos.map((f) => f.id), [album.fotos]);
  const enviarLote = useEnvioDeFotos("mural", album.id, idsAtuais);

  const publicado = album.status === "Publicado";
  const ocupado = publicar.isPending || despublicar.isPending || excluir.isPending;

  async function executar(acao: Acao) {
    try {
      if (acao === "publicar") {
        await publicar.mutateAsync(album.id);
        toast.success("Álbum publicado para as famílias.");
      } else if (acao === "despublicar") {
        await despublicar.mutateAsync(album.id);
        toast.success("Álbum voltou a ser rascunho. As famílias não o veem mais.");
      } else {
        await excluir.mutateAsync(album.id);
        toast.success("Álbum excluído.");
        router.replace("/relacionamento/mural");
        return;
      }
      setConfirmando(null);
    } catch (err) {
      setConfirmando(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    }
  }

  async function aoDefinirCapa(fotoId: string) {
    try {
      await definirCapa.mutateAsync({ id: album.id, fotoId });
      toast.success("Capa definida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível definir a capa.");
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        eyebrow="Mural"
        eyebrowHref="/relacionamento/mural"
        titulo={album.titulo}
        tags={<EtiquetaDoStatusDoAlbum status={album.status} />}
        apoio={
          <>
            {album.escolaToda ? "Escola toda" : (album.turma ?? "Turma")}
            {album.dataDoEvento && <> · evento em {formatarSoData(album.dataDoEvento)}</>}
            {album.descricao && <span className="mt-1 block whitespace-pre-line">{album.descricao}</span>}
          </>
        }
        acoes={
          <>
            <Button variant="outline" disabled={ocupado} onClick={() => setEditando(true)}>
              <Pencil /> Editar
            </Button>
            <Button variant="destructive" disabled={ocupado} onClick={() => setConfirmando("excluir")}>
              <Trash2 /> Excluir
            </Button>
            {publicado ? (
              <Button variant="outline" disabled={ocupado} onClick={() => setConfirmando("despublicar")}>
                <EyeOff /> Despublicar
              </Button>
            ) : (
              <Button variant="action" disabled={ocupado} onClick={() => setConfirmando("publicar")}>
                <Send /> Publicar
              </Button>
            )}
          </>
        }
      />

      {!album.escolaToda && <AvisoDeAutorizacaoDeImagem classId={album.classId} />}

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-[15px] font-semibold">Fotos</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {album.fotos.length} de {porConteudo}
          </p>
        </div>

        <EnvioDeFotos limiteDoLote={porLote} restante={porConteudo - album.fotos.length} enviarLote={enviarLote} />

        <GerenciadorDeFotos
          tipo="mural"
          fotos={album.fotos}
          baixar={baixarFotoDoMural}
          capaFotoId={album.capaFotoId}
          onDefinirCapa={(fotoId) => void aoDefinirCapa(fotoId)}
          onAbrir={setAberta}
          desabilitado={definirCapa.isPending}
        />
      </section>

      <VisualizadorDeFotos
        fotos={album.fotos}
        indice={aberta}
        baixar={baixarFotoDoMural}
        onMudar={setAberta}
        onFechar={() => setAberta(null)}
      />

      {editando && <DialogDeAlbum album={album} onFechar={() => setEditando(false)} onSalvo={() => setEditando(false)} />}

      {confirmando === "publicar" && (
        <Confirmacao
          titulo="Publicar este álbum?"
          descricao={`${
            album.escolaToda ? "As famílias da escola toda" : `As famílias da turma ${album.turma ?? ""}`.trim()
          } passam a ver o álbum com ${album.fotos.length} ${album.fotos.length === 1 ? "foto" : "fotos"} no portal. Confira a autorização de imagem antes.`}
          rotuloConfirmar="Publicar agora"
          pendente={publicar.isPending}
          onConfirmar={() => void executar("publicar")}
          onFechar={() => setConfirmando(null)}
        />
      )}
      {confirmando === "despublicar" && (
        <Confirmacao
          titulo="Despublicar este álbum?"
          descricao="As famílias deixam de ver o álbum no portal. As fotos continuam guardadas, e você pode publicar de novo."
          rotuloConfirmar="Despublicar"
          pendente={despublicar.isPending}
          onConfirmar={() => void executar("despublicar")}
          onFechar={() => setConfirmando(null)}
        />
      )}
      {confirmando === "excluir" && (
        <Confirmacao
          titulo="Excluir este álbum?"
          descricao={
            publicado
              ? "O álbum e todas as fotos saem do portal das famílias e são apagados. Isso não pode ser desfeito."
              : "O álbum e todas as fotos dele serão apagados. Isso não pode ser desfeito."
          }
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={() => void executar("excluir")}
          onFechar={() => setConfirmando(null)}
        />
      )}
    </>
  );
}
