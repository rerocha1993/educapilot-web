"use client";

import { usePathname } from "next/navigation";

import { AbasDePilulas } from "@/components/padroes/cabecalho-da-pagina";
import { useSecoesVisiveis } from "@/lib/access/use-secoes-visiveis";
import { GRUPO_FORMULARIOS, GRUPO_QUADRO } from "@/lib/kernel/secoes-do-modulo";

/**
 * Abas do módulo Fluxos, só no celular. No computador as seções (as duas metades) vivem na barra
 * lateral e esta faixa não renderiza nada; o catálogo é o de secoes-do-modulo.ts.
 *
 * O módulo tem duas metades: o quadro de tarefas da equipe e os formulários da família. As
 * pílulas mostram só as funções da metade aberta — com as sete juntas numa faixa só, o que
 * existia era uma lista.
 *
 * Cada pílula é uma área da permissão: quem não tem "Caixa de envios" não vê a pílula.
 */
export function AbasDeFormularios() {
  const pathname = usePathname();
  const secoes = useSecoesVisiveis("/flow");

  const noQuadro = pathname.startsWith("/flow/tarefas");
  const grupo = noQuadro ? GRUPO_QUADRO : GRUPO_FORMULARIOS;

  const ativa = (href: string) => {
    // "/flow" e "/flow/tarefas" são prefixo das irmãs: só acendem na rota exata. O formulário
    // aberto (/flow/<id>) continua acendendo "Formulários", que é de onde ele veio.
    if (href === "/flow")
      return pathname === "/flow" || /^\/flow\/[0-9a-f-]{36}(\/|$)/i.test(pathname);

    if (href === "/flow/tarefas") return pathname === "/flow/tarefas";

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <AbasDePilulas
      className="md:hidden print:hidden"
      itens={secoes
        .filter((aba) => aba.grupo === grupo)
        .map((aba) => ({ rotulo: aba.label, href: aba.href, ativo: ativa(aba.href) }))}
    />
  );
}
