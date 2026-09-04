"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { StoredSession } from "@/lib/auth/types";
import { clearSession } from "@/lib/auth/session";
import { useActiveModules } from "@/lib/kernel/use-active-modules";
import { NAV_ITEMS } from "@/lib/kernel/nav-items";
import { cn } from "@/lib/utils";

// Novo (2026-09, feedback do cliente) — "pode recolher o sidebar, para dar mais
// espaço para a pagina": a sidebar era sempre w-56 fixo, sem jeito de encolher.
// Estado persistido em localStorage (por navegador, não sincroniza entre
// dispositivos) pra manter a escolha entre navegações/reloads.
const COLLAPSE_STORAGE_KEY = "educapilot_sidebar_collapsed";

export function AppShell({
  session,
  children,
}: {
  session: StoredSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: activeModules, isLoading: modulesLoading } = useActiveModules();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage indisponível (aba privada, etc.) — mantém expandido.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // idem — só não persiste, não quebra o toggle.
      }
      return next;
    });
  }

  const activeSlug = new Set((activeModules ?? []).map((m) => m.slug));

  // Enquanto carrega, mostra só o que não depende de módulo — evita um flash de
  // itens que o tenant não tem, e falha fechado (não aberto) se a busca der erro.
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.moduleSlug === null || (!modulesLoading && activeSlug.has(item.moduleSlug))
  );

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  const initials = session.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-full">
      <aside
        className={cn(
          "flex shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar py-5 transition-[width] duration-150",
          collapsed ? "w-14 px-2" : "w-56 px-3"
        )}
      >
        <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between px-2")}>
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <Image src="/logo.png" alt="EducaPilot" width={28} height={22} className="h-6 w-auto shrink-0" />
            {!collapsed && (
              <span className="whitespace-nowrap font-heading text-sm font-bold text-sidebar-foreground">
                EducaPilot
              </span>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>

        <nav className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-heading font-semibold">{session.name}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials || "?"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {session.role}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* min-w-0 (2026-09): sem isso, um item flex não encolhe abaixo da largura
            intrínseca do conteúdo (ex: uma tabela com min-width) — o "overflow-auto"
            fica inútil e a página inteira estoura de largura em telas estreitas,
            mesmo o conteúdo interno tendo seu próprio scroll horizontal. Achado
            testando a Chamada no mobile; a sidebar em si (w-56 fixo, sem colapsar)
            ainda não é responsiva — isso é um problema maior, à parte. */}
        <main className="min-w-0 flex-1 overflow-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
