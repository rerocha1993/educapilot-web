"use client";

import { useActiveModules } from "@/lib/kernel/use-active-modules";
import { ENTRADAS_DO_MODULO, slugDeAcesso } from "@/lib/kernel/nav-items";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { acessoDaRota, podeVerRota } from "@/lib/access/pode-ver";

/**
 * O que esta pessoa enxerga no menu e nos atalhos.
 *
 * Existe para o menu do celular e a tela Início não reinventarem as duas perguntas que o
 * ModuleGate faz — a escola contratou o módulo? a pessoa tem a área? Atalho que leva a "Sem
 * acesso" é pior que atalho nenhum.
 *
 * - `moduloVisivel`: só módulo. É o que o menu usa: quem tem apenas "Caixa de envios" ainda precisa
 *   ver Formulários no menu para chegar lá.
 * - `rotaVisivel`: módulo e área. É o que um atalho direto para uma tela usa.
 */
export function useVisibilidade() {
  const { data: activeModules, isLoading: modulosCarregando } = useActiveModules();
  const { data: meuAcesso, isLoading: acessoCarregando, isError: acessoFalhou } = useMeuAcesso();
  // Falha conta como "ainda sem resposta": acesso indefinido cairia na regra de legado e mostraria
  // o menu inteiro.
  const carregando = modulosCarregando || acessoCarregando || acessoFalhou;

  const ativos = new Set((activeModules ?? []).map((m) => m.slug));
  const semAcessoDefinido = (meuAcesso?.modulos.length ?? 0) === 0;

  // Módulo de uma rota. O catálogo de rotas cobre as telas internas (/ocorrencias é da Rotina) que o
  // menu não conhece. Administração não é módulo vendido: não passa pela pergunta do contrato.
  function moduloDe(href: string) {
    return acessoDaRota(href)?.modulo ?? slugDeAcesso(href);
  }

  // Enquanto carrega, falha fechado: nada de piscar um item que a escola não tem.
  function contratado(href: string) {
    const modulo = moduloDe(href);
    // Administração não é contratada, mas também espera o acesso: sem isso o item piscava no menu
    // de quem não tem acesso a ela até a resposta chegar.
    if (!modulo) return true;
    if (modulo === "admin") return !carregando;
    return !carregando && ativos.has(modulo);
  }

  function moduloVisivel(href: string) {
    if (!contratado(href)) return false;
    if (semAcessoDefinido) return true;
    const slug = moduloDe(href);
    return !slug || (meuAcesso?.modulos ?? []).some((m) => m.moduloSlug === slug);
  }

  function rotaVisivel(href: string) {
    return !carregando && contratado(href) && podeVerRota(meuAcesso, href);
  }

  /** Para onde o item do menu leva: a primeira tela do módulo que a pessoa pode abrir. */
  function entradaDo(href: string) {
    const candidatas = ENTRADAS_DO_MODULO[href];
    if (!candidatas || carregando) return href;
    return candidatas.find((c) => podeVerRota(meuAcesso, c)) ?? href;
  }

  return { carregando, moduloVisivel, rotaVisivel, entradaDo };
}
