"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useActiveModules } from "@/lib/kernel/use-active-modules";
import { findNavItemForPath } from "@/lib/kernel/nav-items";

/**
 * Bloqueia o CONTEÚDO da rota, não só o item de menu — esconder o link na sidebar
 * não impede alguém de digitar a URL direto ou usar um favorito antigo. Módulos são
 * vendidos separados por tenant; acesso pela URL tem que respeitar isso igual o menu.
 */
export function ModuleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: activeModules, isLoading } = useActiveModules();
  const navItem = findNavItemForPath(pathname);

  if (!navItem || navItem.moduleSlug === null) {
    return <>{children}</>;
  }

  if (isLoading) {
    return null;
  }

  const hasModule = (activeModules ?? []).some((m) => m.slug === navItem.moduleSlug);
  if (!hasModule) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <p className="font-heading text-lg font-semibold">Módulo não contratado</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          A sua escola ainda não tem o módulo &quot;{navItem.label}&quot; ativo. Fale com o
          administrador para contratar.
        </p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Voltar pra Rotina
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
