"use client";

import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";
import { useVisibilidade } from "@/lib/access/use-visibilidade";
import { slugDeAcesso } from "@/lib/kernel/nav-items";
import { SECOES_DO_MODULO, type SecaoDoModulo } from "@/lib/kernel/secoes-do-modulo";

/**
 * As seções de uma ferramenta que esta pessoa pode abrir — a mesma regra das abas que existiam:
 * a rota passa por rotaVisivel (escola contratou + área da rota) e, quando a seção declara uma
 * `area` própria (Portaria, RH, Relacionamento), por podeVerArea. Mostrar a seção e responder
 * "Sem acesso" no clique era o defeito que as abas já corrigiram.
 *
 * Enquanto o acesso carrega, devolve vazio: podeVerRota trata acesso ausente como "vê tudo", e a
 * lista inteira piscaria.
 */
export function useSecoesVisiveis(ferramentaHref: string | null): SecaoDoModulo[] {
  const { data: meuAcesso } = useMeuAcesso();
  const { rotaVisivel, carregando } = useVisibilidade();

  if (!ferramentaHref || carregando) return [];

  const modulo = slugDeAcesso(ferramentaHref);

  return (SECOES_DO_MODULO[ferramentaHref] ?? []).filter((secao) => {
    if (secao.emBreve) return false;
    if (!rotaVisivel(secao.href)) return false;
    return secao.area === undefined || !modulo || podeVerArea(meuAcesso, modulo, secao.area);
  });
}
