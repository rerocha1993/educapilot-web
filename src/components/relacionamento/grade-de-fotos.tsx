"use client";

import type { BaixarFoto } from "@/lib/relacionamento/api";
import { cn } from "@/lib/utils";

import { FotoAutenticada } from "./foto-autenticada";

/** O que a grade e o visualizador precisam saber de uma foto. */
export interface FotoParaExibir {
  id: string;
  legenda: string | null;
}

/**
 * Miniaturas quadradas (3 colunas no celular) que abrem o visualizador ao toque.
 *
 * Cada miniatura é um botão com o nome acessível "Foto 3 de 12: legenda", para leitor de tela e
 * navegação por teclado.
 */
export function GradeDeFotos({
  fotos,
  baixar,
  onAbrir,
  className,
}: {
  fotos: readonly FotoParaExibir[];
  baixar: BaixarFoto;
  /** Recebe a posição da foto tocada. */
  onAbrir: (indice: number) => void;
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-3 gap-1.5 md:grid-cols-4 lg:grid-cols-5", className)}>
      {fotos.map((foto, i) => {
        const nome = `Foto ${i + 1} de ${fotos.length}${foto.legenda ? `: ${foto.legenda}` : ""}`;
        return (
          <li key={foto.id}>
            <button
              type="button"
              aria-label={nome}
              onClick={() => onAbrir(i)}
              className="block aspect-square w-full overflow-hidden rounded-lg bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <FotoAutenticada
                baixar={baixar}
                fotoId={foto.id}
                variante="thumb"
                legenda={foto.legenda}
                rotulo={`Foto ${i + 1}`}
                className="size-full"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Até `maximo` miniaturas numa linha, com "+N" na última quando há mais do que cabe. Serve de
 * prévia nos cartões da família, onde o cartão inteiro já é um link: aqui não há botão.
 */
export function FaixaDeMiniaturas({
  fotos,
  total,
  baixar,
  maximo = 4,
}: {
  fotos: readonly FotoParaExibir[];
  /** Quantas fotos o conteúdo tem no todo (pode ser mais do que as `fotos` recebidas). */
  total: number;
  baixar: BaixarFoto;
  maximo?: number;
}) {
  const mostradas = fotos.slice(0, maximo);
  const resto = Math.max(0, total - mostradas.length);
  if (mostradas.length === 0) return null;

  return (
    <ul aria-label={`${total} ${total === 1 ? "foto" : "fotos"}`} className="grid grid-cols-4 gap-1">
      {mostradas.map((foto, i) => {
        const ultima = i === mostradas.length - 1;
        return (
          <li key={foto.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
            <FotoAutenticada
              baixar={baixar}
              fotoId={foto.id}
              variante="thumb"
              legenda={foto.legenda}
              rotulo={`Foto ${i + 1}`}
              className="size-full"
            />
            {ultima && resto > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-black/55 text-[15px] font-semibold text-white tabular-nums">
                <span aria-hidden>+{resto}</span>
                <span className="sr-only">e mais {resto}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
