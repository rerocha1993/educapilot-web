"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

import type { BaixarFoto, VarianteDaFoto } from "@/lib/relacionamento/api";
import { cn } from "@/lib/utils";

/**
 * Foto que exige o Bearer: o endpoint não aceita <img src> direto, então a imagem é baixada com
 * fetch e exibida por um object URL.
 *
 * O cache é em memória, por id + variante, e conta quantos componentes usam cada foto. Quando o
 * último solta, o object URL só é revogado depois de uma folga (`FOLGA_DO_CACHE`): voltar à página
 * anterior ou abrir o visualizador sobre a grade reaproveita a imagem em vez de baixar de novo, e
 * a memória não cresce sem limite, porque o que ninguém usa mais é revogado.
 */

interface Entrada {
  promessa: Promise<string>;
  usos: number;
  liberacao: ReturnType<typeof setTimeout> | null;
}

const FOLGA_DO_CACHE = 60_000;
const cache = new Map<string, Entrada>();

function chaveDe(fotoId: string, variante: VarianteDaFoto): string {
  return `${fotoId}:${variante}`;
}

function revogar(chave: string) {
  const entrada = cache.get(chave);
  if (!entrada) return;
  cache.delete(chave);
  void entrada.promessa.then((url) => URL.revokeObjectURL(url)).catch(() => {});
}

function adquirir(baixar: BaixarFoto, fotoId: string, variante: VarianteDaFoto): Promise<string> {
  const chave = chaveDe(fotoId, variante);
  let entrada = cache.get(chave);

  if (!entrada) {
    const promessa = baixar(fotoId, variante).then((blob) => URL.createObjectURL(blob));
    entrada = { promessa, usos: 0, liberacao: null };
    cache.set(chave, entrada);
    // Falha não fica no cache: o próximo componente a pedir tenta de novo.
    promessa.catch(() => {
      if (cache.get(chave)?.promessa === promessa) cache.delete(chave);
    });
  }

  if (entrada.liberacao) {
    clearTimeout(entrada.liberacao);
    entrada.liberacao = null;
  }
  entrada.usos += 1;
  return entrada.promessa;
}

function soltar(fotoId: string, variante: VarianteDaFoto) {
  const chave = chaveDe(fotoId, variante);
  const entrada = cache.get(chave);
  if (!entrada) return;

  entrada.usos -= 1;
  if (entrada.usos > 0 || entrada.liberacao) return;
  entrada.liberacao = setTimeout(() => revogar(chave), FOLGA_DO_CACHE);
}

/** Baixa a foto para o cache sem exibir (a próxima do visualizador, por exemplo). */
export function precarregarFoto(baixar: BaixarFoto, fotoId: string, variante: VarianteDaFoto) {
  adquirir(baixar, fotoId, variante)
    .catch(() => {})
    .finally(() => soltar(fotoId, variante));
}

type Estado = { chave: string; url: string | null; falhou: boolean };

/** A URL da foto, ou o motivo de ainda não ter. O estado guarda a chave a que pertence. */
function useFotoAutenticada(baixar: BaixarFoto, fotoId: string, variante: VarianteDaFoto) {
  const chave = chaveDe(fotoId, variante);
  const [estado, setEstado] = useState<Estado>({ chave, url: null, falhou: false });

  useEffect(() => {
    let ativo = true;
    adquirir(baixar, fotoId, variante).then(
      (url) => ativo && setEstado({ chave, url, falhou: false }),
      () => ativo && setEstado({ chave, url: null, falhou: true })
    );

    return () => {
      ativo = false;
      soltar(fotoId, variante);
    };
  }, [baixar, fotoId, variante, chave]);

  // Resultado de outra foto (a chave mudou e a nova ainda não chegou) conta como "carregando".
  return estado.chave === chave ? estado : { chave, url: null, falhou: false };
}

/**
 * Imagem autenticada com esqueleto enquanto carrega. `alt` leva a legenda; sem legenda, `rotulo`
 * descreve a foto (a grade usa "Foto 3 de 12").
 */
export function FotoAutenticada({
  baixar,
  fotoId,
  variante,
  legenda,
  rotulo = "Foto",
  ajuste = "cover",
  className,
}: {
  baixar: BaixarFoto;
  fotoId: string;
  variante: VarianteDaFoto;
  legenda?: string | null;
  /** Texto alternativo quando não há legenda. */
  rotulo?: string;
  /** `cover` preenche a caixa (miniaturas); `contain` mostra a foto inteira (visualizador). */
  ajuste?: "cover" | "contain";
  className?: string;
}) {
  const { url, falhou } = useFotoAutenticada(baixar, fotoId, variante);
  const alt = legenda?.trim() || rotulo;

  if (falhou) {
    return (
      <div
        role="img"
        aria-label={`${alt} (não foi possível carregar)`}
        className={cn("grid place-items-center bg-muted text-muted-foreground", className)}
      >
        <ImageOff aria-hidden className="size-6" />
      </div>
    );
  }

  if (!url) {
    return <div aria-hidden className={cn("animate-pulse bg-muted", className)} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- object URL de um blob autenticado, sem otimização possível
    <img
      src={url}
      alt={alt}
      draggable={false}
      className={cn(ajuste === "cover" ? "object-cover" : "object-contain", className)}
    />
  );
}
