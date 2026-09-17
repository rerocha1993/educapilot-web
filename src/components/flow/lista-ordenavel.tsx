"use client";

import { useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lista que se reordena arrastando pela alça.
 *
 * Eventos de ponteiro, e não o arrastar nativo do HTML: funcionam igual com mouse, toque e caneta,
 * e deixam a lista mostrar, enquanto o item é arrastado, a linha onde ele vai cair. O arrastar
 * nativo não funciona em tela de toque e mostra só uma "fotografia" fantasma do item.
 *
 * A lista não guarda ordem própria: ao soltar, avisa a nova sequência de ids e quem a usa decide
 * o que fazer. Quem usa é quem sabe gravar.
 */
export function ListaOrdenavel<T extends { id: string }>({
  itens,
  onReordenar,
  renderItem,
  desabilitado = false,
}: {
  itens: T[];
  onReordenar: (ids: string[]) => void;
  renderItem: (item: T, indice: number) => React.ReactNode;
  desabilitado?: boolean;
}) {
  const refs = useRef(new Map<string, HTMLDivElement>());

  // "destino" é a posição de inserção na lista original, de 0 a itens.length: o item arrastado
  // entra ANTES do item que está nessa posição (itens.length é "no fim").
  const [arrasto, setArrasto] = useState<{ id: string; destino: number } | null>(null);

  function destinoPara(y: number) {
    for (let i = 0; i < itens.length; i++) {
      const el = refs.current.get(itens[i].id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return itens.length;
  }

  function iniciar(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (desabilitado || e.button !== 0) return;
    e.preventDefault();
    // Captura: os próximos movimentos chegam à alça mesmo com o ponteiro fora dela.
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrasto({ id, destino: itens.findIndex((i) => i.id === id) });
  }

  function mover(e: React.PointerEvent<HTMLButtonElement>) {
    if (!arrasto) return;

    // Formulário longo não cabe na tela: perto da borda, a página rola sozinha para dar para levar
    // um campo do fim para o começo num arrasto só.
    const rolavel = e.currentTarget.closest("main") ?? document.scrollingElement;
    if (rolavel) {
      if (e.clientY < 80) rolavel.scrollBy(0, -18);
      else if (e.clientY > window.innerHeight - 80) rolavel.scrollBy(0, 18);
    }

    const destino = destinoPara(e.clientY);
    if (destino !== arrasto.destino) setArrasto({ ...arrasto, destino });
  }

  function soltar() {
    if (!arrasto) return;

    const origem = itens.findIndex((i) => i.id === arrasto.id);
    let destino = arrasto.destino;
    setArrasto(null);

    if (origem < 0) return;
    // O item sai da lista antes de entrar de novo: tudo que estava depois dele sobe uma posição.
    if (destino > origem) destino -= 1;
    if (destino === origem) return;

    const ids = itens.map((i) => i.id);
    const [movido] = ids.splice(origem, 1);
    ids.splice(destino, 0, movido);
    onReordenar(ids);
  }

  const origem = arrasto ? itens.findIndex((i) => i.id === arrasto.id) : -1;

  // Linha de destino só onde soltar muda alguma coisa: logo acima ou logo abaixo do próprio item
  // o resultado seria o mesmo lugar.
  const mostraLinha = (posicao: number) =>
    arrasto !== null && posicao === arrasto.destino && posicao !== origem && posicao !== origem + 1;

  return (
    <div className="flex flex-col gap-2">
      {itens.map((item, i) => (
        <div
          key={item.id}
          ref={(el) => {
            if (el) refs.current.set(item.id, el);
            else refs.current.delete(item.id);
          }}
          className="relative"
        >
          {mostraLinha(i) && (
            <div className="pointer-events-none absolute -top-[5px] right-0 left-0 h-0.5 rounded-full bg-primary" />
          )}

          <div
            className={cn(
              "flex items-center gap-1.5 transition-opacity",
              arrasto?.id === item.id && "opacity-40"
            )}
          >
            <button
              type="button"
              aria-label="Arrastar para reordenar"
              title="Arrastar para reordenar"
              disabled={desabilitado}
              onPointerDown={(e) => iniciar(e, item.id)}
              onPointerMove={mover}
              onPointerUp={soltar}
              onPointerCancel={() => setArrasto(null)}
              className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 md:size-7"
            >
              <GripVertical className="size-4" />
            </button>
            <div className="min-w-0 flex-1">{renderItem(item, i)}</div>
          </div>

          {i === itens.length - 1 && mostraLinha(itens.length) && (
            <div className="pointer-events-none absolute right-0 -bottom-[5px] left-0 h-0.5 rounded-full bg-primary" />
          )}
        </div>
      ))}
    </div>
  );
}
