import Link from "next/link";
import { ChevronLeft, ImageIcon } from "lucide-react";

import { FotoAutenticada } from "@/components/relacionamento/foto-autenticada";
import { FaixaDeMiniaturas } from "@/components/relacionamento/grade-de-fotos";
import { formatarSoData } from "@/lib/format/date";
import { baixarFotoDaFamilia } from "@/lib/relacionamento/api";
import type { AlbumDaFamilia, AtividadeDaFamilia } from "@/lib/relacionamento/use-portal-familia";

/** Link de volta no alto das telas de detalhe, no tamanho do dedo. */
export function LinkDeVolta({ href, rotulo }: { href: string; rotulo: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-11 w-max items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ChevronLeft aria-hidden className="size-4" /> {rotulo}
    </Link>
  );
}

/** "3 fotos" / "1 foto". */
export function contagemDeFotos(total: number): string {
  return `${total} ${total === 1 ? "foto" : "fotos"}`;
}

/**
 * Atividade da sala no feed: data, turma, título, resumo e até 4 miniaturas com "+N". O cartão
 * todo é o link; as miniaturas dentro dele não são botões.
 */
export function CartaoDeAtividade({
  atividade: a,
  mostrarAluno = false,
}: {
  atividade: AtividadeDaFamilia;
  /** Com mais de um filho, diz de qual deles é a atividade. */
  mostrarAluno?: boolean;
}) {
  return (
    <Link
      href={`/responsavel/atividades/${a.id}`}
      className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <article className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {a.data && <span className="tabular-nums">{formatarSoData(a.data)}</span>}
          {a.turma && <span>{a.turma}</span>}
          {mostrarAluno && a.aluno && (
            <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground">
              {a.aluno.split(" ")[0]}
            </span>
          )}
        </p>

        <div>
          <h3 className="text-[15px] leading-snug font-semibold break-words">{a.titulo}</h3>
          {a.resumo && (
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug break-words text-muted-foreground">{a.resumo}</p>
          )}
        </div>

        <FaixaDeMiniaturas fotos={a.fotos} total={a.totalDeFotos} baixar={baixarFotoDaFamilia} />
      </article>
    </Link>
  );
}

/** Álbum do mural: capa, título, turma ou "Escola toda" e quantas fotos tem. */
export function CartaoDeAlbum({ album: a, compacto = false }: { album: AlbumDaFamilia; compacto?: boolean }) {
  return (
    <Link
      href={`/responsavel/mural/${a.id}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
    >
      <div className="aspect-[4/3] w-full bg-muted">
        {a.capaFotoId ? (
          <FotoAutenticada
            baixar={baixarFotoDaFamilia}
            fotoId={a.capaFotoId}
            variante="thumb"
            rotulo={`Capa de ${a.titulo}`}
            className="size-full"
          />
        ) : (
          <div aria-hidden className="grid size-full place-items-center text-muted-foreground">
            <ImageIcon className="size-7" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-2.5">
        <h3 className={`font-semibold break-words ${compacto ? "line-clamp-2 text-[13.5px] leading-snug" : "text-sm leading-snug"}`}>
          {a.titulo}
        </h3>
        <p className="mt-auto pt-0.5 text-xs text-muted-foreground">
          {a.escolaToda ? "Escola toda" : a.turma} · <span className="tabular-nums">{contagemDeFotos(a.totalDeFotos)}</span>
        </p>
      </div>
    </Link>
  );
}
