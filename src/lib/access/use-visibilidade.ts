"use client";

import { useActiveModules } from "@/lib/kernel/use-active-modules";
import { slugDeAcesso } from "@/lib/kernel/nav-items";
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
  const { data: meuAcesso, isLoading: acessoCarregando } = useMeuAcesso();
  const carregando = modulosCarregando || acessoCarregando;

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
    if (!modulo || modulo === "admin") return true;
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

  return { carregando, moduloVisivel, rotaVisivel };
}
