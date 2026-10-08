"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { BaixarFoto } from "@/lib/relacionamento/api";

import { FotoAutenticada, precarregarFoto } from "./foto-autenticada";
import type { FotoParaExibir } from "./grade-de-fotos";

/**
 * Visualizador de fotos (lightbox): a foto original, a legenda, anterior e próxima.
 *
 * Esc fecha (o Dialog já cuida disso), e as setas do teclado trocam de foto. No celular a troca é
 * pelos botões grandes dos lados, sem gesto de arrastar. As vizinhas são baixadas de antemão para a
 * troca não mostrar esqueleto.
 *
 * `indice` nulo = fechado. O pai guarda o índice e passa `onMudar` / `onFechar`.
 */
export function VisualizadorDeFotos({
  fotos,
  indice,
  baixar,
  onMudar,
  onFechar,
}: {
  fotos: readonly FotoParaExibir[];
  indice: number | null;
  baixar: BaixarFoto;
  onMudar: (indice: number) => void;
  onFechar: () => void;
}) {
  const aberto = indice !== null && fotos.length > 0;
  // O índice pode sobrar depois de uma foto removida: ancora na última.
  const atual = aberto ? Math.min(indice, fotos.length - 1) : 0;
  const foto = aberto ? fotos[atual] : null;
  const anterior = atual > 0 ? atual - 1 : null;
  const proxima = atual < fotos.length - 1 ? atual + 1 : null;

  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && anterior !== null) onMudar(anterior);
      else if (e.key === "ArrowRight" && proxima !== null) onMudar(proxima);
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, anterior, proxima, onMudar]);

  const idAnterior = aberto && anterior !== null ? fotos[anterior].id : null;
  const idProxima = aberto && proxima !== null ? fotos[proxima].id : null;
  useEffect(() => {
    if (idAnterior) precarregarFoto(baixar, idAnterior, "original");
    if (idProxima) precarregarFoto(baixar, idProxima, "original");
  }, [baixar, idAnterior, idProxima]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent
        showCloseButton={false}
        className="h-[calc(100dvh-1rem)] max-h-none w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-2 bg-black p-3 text-white ring-0 sm:max-w-5xl"
      >
        <div className="flex items-center justify-between gap-2">
          <DialogTitle className="text-sm font-medium tabular-nums text-white">
            Foto {atual + 1} de {fotos.length}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Use as setas do teclado ou os botões para trocar de foto. Esc fecha.
          </DialogDescription>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                className="text-white hover:bg-white/15 hover:text-white"
              />
            }
          >
            <X aria-hidden />
          </DialogClose>
        </div>

        <div className="relative flex min-h-0 items-center justify-center">
          {foto && (
            <FotoAutenticada
              key={foto.id}
              baixar={baixar}
              fotoId={foto.id}
              variante="original"
              legenda={foto.legenda}
              rotulo={`Foto ${atual + 1} de ${fotos.length}`}
              ajuste="contain"
              className="size-full min-h-40"
            />
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Foto anterior"
            disabled={anterior === null}
            onClick={() => anterior !== null && onMudar(anterior)}
            className="absolute top-1/2 left-0 size-11 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft aria-hidden className="size-6" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Próxima foto"
            disabled={proxima === null}
            onClick={() => proxima !== null && onMudar(proxima)}
            className="absolute top-1/2 right-0 size-11 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white disabled:opacity-30"
          >
            <ChevronRight aria-hidden className="size-6" />
          </Button>
        </div>

        <p className="min-h-5 text-center text-sm break-words text-white/90">{foto?.legenda}</p>
      </DialogContent>
    </Dialog>
  );
}
