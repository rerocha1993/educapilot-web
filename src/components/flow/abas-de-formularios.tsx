"use client";

import { usePathname } from "next/navigation";

import { AbasDePilulas } from "@/components/padroes/cabecalho-da-pagina";
import { podeVerRota } from "@/lib/access/pode-ver";
import { useMeuAcesso } from "@/lib/access/use-acessos";

/**
 * Abas do módulo Fluxos, iguais em todas as telas dele.
 *
 * O módulo tem duas metades: o quadro de tarefas da equipe e os formulários da família. A barra
 * lateral escolhe a metade; estas pílulas mostram só as funções dela. Com as oito juntas numa
 * faixa só, o que existia era uma lista — ninguém achava Contratos no meio de Automações.
 *
 * Antes, as telas de dentro (Contratos, por exemplo) não tinham aba nenhuma: quem entrava ficava
 * sem nada para clicar e voltava pelo menu lateral.
 *
 * Cada pílula é uma área da permissão: quem não tem "Caixa de envios" não vê a pílula.
 */
const QUADRO = [
  { rotulo: "Meu quadro", href: "/flow/tarefas" },
  { rotulo: "Equipe", href: "/flow/tarefas/equipe" },
  { rotulo: "Automações", href: "/flow/tarefas/automacoes" },
];

const FORMULARIOS = [
  { rotulo: "Formulários", href: "/flow" },
  { rotulo: "Caixa de envios", href: "/flow/respostas" },
  { rotulo: "Contratos", href: "/flow/contratos" },
  { rotulo: "Relatórios", href: "/flow/relatorios" },
  { rotulo: "Dados de referência", href: "/flow/referencias" },
];

export function AbasDeFormularios() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();

  const noQuadro = pathname.startsWith("/flow/tarefas");
  const abas = noQuadro ? QUADRO : FORMULARIOS;

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
      itens={abas
        .filter((aba) => podeVerRota(meuAcesso, aba.href))
        .map((aba) => ({ rotulo: aba.rotulo, href: aba.href, ativo: ativa(aba.href) }))}
    />
  );
}
