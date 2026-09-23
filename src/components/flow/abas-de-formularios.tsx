"use client";

import { usePathname } from "next/navigation";

import { AbasDePilulas } from "@/components/padroes/cabecalho-da-pagina";
import { podeVerRota } from "@/lib/access/pode-ver";
import { useMeuAcesso } from "@/lib/access/use-acessos";

/**
 * Abas do módulo Formulários, iguais em todas as telas dele.
 *
 * Antes só a tela de Formulários tinha as abas: quem entrava em Contratos ficava sem nada para
 * clicar e tinha que ir pelo menu lateral para voltar. Como as telas do módulo são irmãs (a
 * secretaria pula de Contratos para a Caixa de envios o dia inteiro), a faixa acompanha todas.
 *
 * Cada pílula é uma área da permissão: quem não tem "Caixa de envios" não vê a pílula.
 */
// Tarefas primeiro: é a tela que a equipe abre todo dia. Formulários e contratos são o trabalho
// de quem cuida de matrícula, e acontecem em janelas do ano.
const ABAS = [
  { rotulo: "Meu quadro", href: "/flow/tarefas" },
  { rotulo: "Equipe", href: "/flow/tarefas/equipe" },
  { rotulo: "Automações", href: "/flow/tarefas/automacoes" },
  { rotulo: "Formulários", href: "/flow" },
  { rotulo: "Caixa de envios", href: "/flow/respostas" },
  { rotulo: "Contratos", href: "/flow/contratos" },
  { rotulo: "Relatórios", href: "/flow/relatorios" },
  { rotulo: "Dados de referência", href: "/flow/referencias" },
];

export function AbasDeFormularios() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();

  // A aba fica marcada também nas telas de dentro dela (o relatório aberto continua em
  // "Relatórios"). "/flow" é o caso à parte: como é prefixo de todas, só marca na rota exata e no
  // formulário aberto.
  const ativa = (href: string) => {
    // "/flow" é prefixo de todas: só marca na rota exata e no formulário aberto.
    if (href === "/flow")
      return pathname === "/flow" || /^\/flow\/[0-9a-f-]{36}(\/|$)/i.test(pathname);

    // "Meu quadro" não pode acender quando a pessoa está em Equipe ou Automações, que moram
    // dentro de /flow/tarefas.
    if (href === "/flow/tarefas") return pathname === "/flow/tarefas";

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <AbasDePilulas
      itens={ABAS.filter((aba) => podeVerRota(meuAcesso, aba.href)).map((aba) => ({
        rotulo: aba.rotulo,
        href: aba.href,
        ativo: ativa(aba.href),
      }))}
    />
  );
}
