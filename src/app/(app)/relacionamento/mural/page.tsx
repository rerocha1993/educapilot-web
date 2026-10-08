"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GalleryHorizontalEnd, ImageIcon, Plus } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { DialogDeAlbum } from "@/components/relacionamento/dialog-de-album";
import { EtiquetaDoStatusDoAlbum } from "@/components/relacionamento/etiquetas";
import { FotoAutenticada } from "@/components/relacionamento/foto-autenticada";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { baixarFotoDoMural } from "@/lib/relacionamento/api";
import { useAlbuns, type AlbumResumo, type StatusDoAlbum } from "@/lib/relacionamento/use-conteudo";

const TODOS = "todos";

const SITUACOES = [
  { id: TODOS, rotulo: "Todos" },
  { id: "Rascunho", rotulo: "Rascunhos" },
  { id: "Publicado", rotulo: "Publicados" },
] as const;

export default function MuralPage() {
  const router = useRouter();
  const [turma, setTurma] = useState<string>(TODOS);
  const [status, setStatus] = useState<string>(TODOS);
  const [criando, setCriando] = useState(false);

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );

  const { data, isLoading, isError, refetch, isFetching } = useAlbuns({
    classId: turma === TODOS ? null : Number(turma),
    status: status === TODOS ? null : (status as StatusDoAlbum),
  });

  const turmaEscolhida = turmas.find((t) => String(t.id) === turma);
  const filtrando = turma !== TODOS || status !== TODOS;

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento"
        titulo="Mural"
        apoio="Álbuns de fotos de passeios, festas e projetos, por turma ou para a escola toda."
        acoes={
          <Button variant="action" onClick={() => setCriando(true)}>
            <Plus /> Novo álbum
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <Segmentado
          rotulo="Situação"
          opcoes={SITUACOES}
          valor={status}
          onChange={setStatus}
          className="max-md:w-full"
          cheio
        />

        <Campo id="mural-filtro-turma" rotulo="Turma" className="md:w-48">
          <Select value={turma} onValueChange={(v) => v && setTurma(v)}>
            <SelectTrigger id="mural-filtro-turma" className="w-full">
              <SelectValue>{() => turmaEscolhida?.nome ?? "Todas as turmas"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-72">
              <SelectItem value={TODOS}>Todas as turmas</SelectItem>
              {turmas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>

      {isError && <ErroDeCarga texto="Não foi possível carregar os álbuns." onTentar={() => refetch()} />}

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-60 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <EstadoVazio
          icone={<GalleryHorizontalEnd />}
          titulo={filtrando ? "Nada com esses filtros" : "Nenhum álbum ainda"}
          texto={
            filtrando
              ? "Tire um filtro para ver os outros álbuns."
              : "Crie um álbum para a festa, o passeio ou o projeto. Ele só aparece para as famílias quando você publicar."
          }
          acao={
            !filtrando && (
              <Button variant="action" onClick={() => setCriando(true)}>
                <Plus /> Novo álbum
              </Button>
            )
          }
        />
      )}

      {data && data.length > 0 && (
        <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-70" : ""}`}>
          {data.map((a) => (
            <li key={a.id}>
              <CartaoDeAlbum album={a} />
            </li>
          ))}
        </ul>
      )}

      {criando && (
        <DialogDeAlbum
          album={null}
          onFechar={() => setCriando(false)}
          onSalvo={(id) => router.push(`/relacionamento/mural/${id}`)}
        />
      )}
    </div>
  );
}

function CartaoDeAlbum({ album: a }: { album: AlbumResumo }) {
  return (
    <Link
      href={`/relacionamento/mural/${a.id}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="aspect-[4/3] w-full bg-muted">
        {a.capaFotoId ? (
          <FotoAutenticada
            baixar={baixarFotoDoMural}
            fotoId={a.capaFotoId}
            variante="thumb"
            rotulo={`Capa de ${a.titulo}`}
            className="size-full"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground" aria-hidden>
            <ImageIcon className="size-8" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <EtiquetaDoStatusDoAlbum status={a.status} />
          {a.dataDoEvento && (
            <span className="text-xs text-muted-foreground tabular-nums">{formatarSoData(a.dataDoEvento)}</span>
          )}
        </div>
        <p className="text-[15px] leading-snug font-semibold break-words">{a.titulo}</p>
        <p className="mt-auto pt-1 text-xs text-muted-foreground">
          {a.escolaToda ? "Escola toda" : (a.turma ?? "Turma")} ·{" "}
          <span className="tabular-nums">
            {a.totalDeFotos} {a.totalDeFotos === 1 ? "foto" : "fotos"}
          </span>
        </p>
      </div>
    </Link>
  );
}
