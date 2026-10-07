"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Confirmacao } from "@/components/rh/confirmacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BaixarFoto } from "@/lib/relacionamento/api";
import {
  useAtualizarFoto,
  useMoverFoto,
  useRemoverFoto,
  type FotoDeConteudo,
  type TipoDeConteudo,
} from "@/lib/relacionamento/use-conteudo";

import { FotoAutenticada } from "./foto-autenticada";

/**
 * As fotos de uma atividade ou álbum, para quem edita: miniatura que abre o visualizador, legenda
 * que grava ao sair do campo, setas para reordenar, remover (com confirmação) e, no mural, "definir
 * como capa".
 *
 * As setas movem uma casa por vez: arrastar não funciona bem com o dedo e o teclado, e a ordem de
 * uma galeria de até 30 fotos se acerta em poucos toques.
 */
export function GerenciadorDeFotos({
  tipo,
  fotos,
  baixar,
  capaFotoId = null,
  onDefinirCapa,
  onAbrir,
  desabilitado = false,
}: {
  tipo: TipoDeConteudo;
  fotos: readonly FotoDeConteudo[];
  baixar: BaixarFoto;
  /** Foto que é a capa hoje (só o mural deixa escolher). */
  capaFotoId?: string | null;
  /** Presente só onde a capa é escolhida (mural). */
  onDefinirCapa?: (fotoId: string) => void;
  onAbrir: (indice: number) => void;
  desabilitado?: boolean;
}) {
  const mover = useMoverFoto(tipo);
  const remover = useRemoverFoto(tipo);
  const [removendo, setRemovendo] = useState<FotoDeConteudo | null>(null);

  async function mudarDeLugar(de: number, para: number) {
    try {
      await mover.mutateAsync({ fotos, de, para });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reordenar as fotos.");
    }
  }

  async function removerAgora() {
    if (!removendo) return;
    try {
      await remover.mutateAsync(removendo.id);
      toast.success("Foto removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover a foto.");
    } finally {
      setRemovendo(null);
    }
  }

  if (fotos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma foto ainda.</p>;
  }

  const ocupado = desabilitado || mover.isPending;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {fotos.map((foto, i) => (
          <CartaoDeFoto
            // A legenda na chave refaz o campo quando o servidor devolve a legenda gravada.
            key={`${foto.id}:${foto.legenda ?? ""}`}
            tipo={tipo}
            foto={foto}
            posicao={i}
            total={fotos.length}
            baixar={baixar}
            ehCapa={capaFotoId === foto.id}
            podeDefinirCapa={!!onDefinirCapa}
            ocupado={ocupado}
            onAbrir={() => onAbrir(i)}
            onMover={(para) => void mudarDeLugar(i, para)}
            onCapa={() => onDefinirCapa?.(foto.id)}
            onRemover={() => setRemovendo(foto)}
          />
        ))}
      </ul>

      {removendo && (
        <Confirmacao
          titulo="Remover esta foto?"
          descricao="A foto sai da galeria e deixa de aparecer para as famílias. Isso não pode ser desfeito."
          rotuloConfirmar="Remover"
          perigosa
          pendente={remover.isPending}
          onConfirmar={() => void removerAgora()}
          onFechar={() => setRemovendo(null)}
        />
      )}
    </>
  );
}

function CartaoDeFoto({
  tipo,
  foto,
  posicao,
  total,
  baixar,
  ehCapa,
  podeDefinirCapa,
  ocupado,
  onAbrir,
  onMover,
  onCapa,
  onRemover,
}: {
  tipo: TipoDeConteudo;
  foto: FotoDeConteudo;
  posicao: number;
  total: number;
  baixar: BaixarFoto;
  ehCapa: boolean;
  podeDefinirCapa: boolean;
  ocupado: boolean;
  onAbrir: () => void;
  onMover: (para: number) => void;
  onCapa: () => void;
  onRemover: () => void;
}) {
  const atualizar = useAtualizarFoto(tipo);
  const [legenda, setLegenda] = useState(foto.legenda ?? "");

  async function gravarLegenda() {
    if (legenda.trim() === (foto.legenda ?? "")) return;
    try {
      await atualizar.mutateAsync({ fotoId: foto.id, legenda, ordem: foto.ordem });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a legenda.");
    }
  }

  const nome = `Foto ${posicao + 1} de ${total}`;
  const botao = "min-h-9 min-w-9 max-md:min-h-11 max-md:min-w-11";

  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-1.5">
      <div className="relative">
        <button
          type="button"
          aria-label={`Ver ${nome} em tela cheia`}
          onClick={onAbrir}
          className="block aspect-square w-full overflow-hidden rounded-lg bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <FotoAutenticada
            baixar={baixar}
            fotoId={foto.id}
            variante="thumb"
            legenda={foto.legenda}
            rotulo={nome}
            className="size-full"
          />
        </button>
        {ehCapa && (
          <span className="pointer-events-none absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-action px-1.5 py-0.5 text-[11.5px] font-semibold text-action-foreground">
            <Star aria-hidden className="size-3 fill-current" /> Capa
          </span>
        )}
      </div>

      <Input
        value={legenda}
        maxLength={200}
        disabled={ocupado}
        aria-label={`Legenda da ${nome.toLowerCase()}`}
        placeholder="Legenda (opcional)"
        onChange={(e) => setLegenda(e.target.value)}
        onBlur={() => void gravarLegenda()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />

      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={botao}
            aria-label={`Mover a ${nome.toLowerCase()} para antes`}
            title="Mover para antes"
            disabled={ocupado || posicao === 0}
            onClick={() => onMover(posicao - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={botao}
            aria-label={`Mover a ${nome.toLowerCase()} para depois`}
            title="Mover para depois"
            disabled={ocupado || posicao === total - 1}
            onClick={() => onMover(posicao + 1)}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="flex gap-0.5">
          {podeDefinirCapa && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={botao}
              aria-label={ehCapa ? `A ${nome.toLowerCase()} é a capa` : `Definir a ${nome.toLowerCase()} como capa`}
              aria-pressed={ehCapa}
              title={ehCapa ? "É a capa" : "Definir como capa"}
              disabled={ocupado || ehCapa}
              onClick={onCapa}
            >
              <Star className={ehCapa ? "fill-current" : undefined} />
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className={botao}
            aria-label={`Remover a ${nome.toLowerCase()}`}
            title="Remover"
            disabled={ocupado}
            onClick={onRemover}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}
