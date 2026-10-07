"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { INICIO_HREF } from "@/lib/kernel/nav-items";
import { useActiveModules } from "@/lib/kernel/use-active-modules";
import { findNavItemForPath } from "@/lib/kernel/nav-items";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerRota } from "@/lib/access/pode-ver";

/**
 * Bloqueia o CONTEÚDO da rota, não só o item de menu — esconder o link na sidebar não impede
 * alguém de digitar a URL direto ou usar um favorito antigo.
 *
 * São duas perguntas diferentes, e as duas precisam de resposta:
 *
 * 1. A escola contratou o módulo? Módulos são vendidos separados por tenant.
 * 2. Esta pessoa tem permissão nesta área? A permissão é gravada por área ("Caixa de envios",
 *    "Usuários e convites"), e antes só o módulo era conferido: desmarcar uma área não tinha
 *    efeito nenhum, nem no menu nem na URL.
 */
export function ModuleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: activeModules, isLoading } = useActiveModules();
  const { data: meuAcesso, isLoading: acessoCarregando, isError: acessoFalhou } = useMeuAcesso();
  const navItem = findNavItemForPath(pathname);

  // Espera as duas respostas antes de decidir: falha fechado, sem piscar conteúdo que a pessoa
  // talvez não possa ver.
  if (isLoading || acessoCarregando) {
    return null;
  }

  // Sem saber o acesso, nada abre. Antes, a falha deixava o acesso indefinido — que a regra de
  // legado lê como "sem permissão gravada, vê tudo" — e qualquer tela passava.
  if (acessoFalhou) {
    return (
      <Aviso titulo="Não foi possível conferir seu acesso">
        Recarregue a página. Se continuar, saia e entre de novo.
      </Aviso>
    );
  }

  if (navItem && navItem.moduleSlug !== null) {
    const temModulo = (activeModules ?? []).some((m) => m.slug === navItem.moduleSlug);
    if (!temModulo) {
      return (
        <Aviso titulo="Módulo não contratado">
          A sua escola ainda não tem o módulo &quot;{navItem.label}&quot; ativo. Fale com o
          administrador para contratar.
        </Aviso>
      );
    }
  }

  if (!podeVerRota(meuAcesso, pathname)) {
    return (
      <Aviso titulo="Sem acesso a esta área">
        O seu acesso não inclui esta parte do sistema. Se você precisa dela, peça à direção da
        escola para liberar.
      </Aviso>
    );
  }

  return <>{children}</>;
}

/**
 * Aviso de bloqueio com saída de verdade.
 *
 * O link antigo levava sempre para "/" — que é a Chamada, e quem não tem a Chamada caía num
 * segundo "Sem acesso". Voltar leva para onde a pessoa estava; Início é aberto a todo mundo.
 */
function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="font-heading text-lg font-semibold">{titulo}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
        <Link href={INICIO_HREF} className={buttonVariants()}>
          Ir para o Início
        </Link>
      </div>
    </div>
  );
}
