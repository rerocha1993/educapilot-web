"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  House,
  KeyRound,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
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
import { ADMIN_HREF, NAV_ITEMS } from "@/lib/kernel/nav-items";
import { acessoDaRota } from "@/lib/access/pode-ver";
import { useVisibilidade } from "@/lib/access/use-visibilidade";
import { cn } from "@/lib/utils";
import { AlterarSenhaDialog } from "@/components/shell/alterar-senha-dialog";

// Novo (2026-09, feedback do cliente) — "pode recolher o sidebar, para dar mais
// espaço para a pagina": a sidebar era sempre w-56 fixo, sem jeito de encolher.
// Estado persistido em localStorage (por navegador, não sincroniza entre
// dispositivos) pra manter a escolha entre navegações/reloads.
const COLLAPSE_STORAGE_KEY = "educapilot_sidebar_collapsed";

// Celular (abaixo de md): a sidebar some e dá lugar a um cabeçalho com menu, uma barra de abas
// embaixo e a tela Início com atalhos. A barra tem espaço para cinco abas: Início, três módulos e
// "Mais", que abre o menu completo. Os módulos entram nesta ordem de preferência, pulando os que a
// escola não contratou ou a pessoa não pode ver.
const INICIO_HREF = "/inicio";
const ABAS_PREFERIDAS = ["/", "/flow", "/finance", "/portaria", "/events"];
const ROTULO_CURTO: Record<string, string> = { "/events": "Vendas" };

/** Módulo dono de uma rota, para marcar a aba certa em telas internas (/checklist é da Rotina). */
function moduloDaRota(pathname: string) {
  return acessoDaRota(pathname)?.modulo ?? null;
}

export function AppShell({
  session,
  children,
}: {
  session: StoredSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  // Guarda a tela em que o menu do celular foi aberto: trocar de tela o fecha sozinho, sem ele
  // continuar cobrindo a página que acabou de abrir.
  const [menuAbertoEm, setMenuAbertoEm] = useState<string | null>(null);
  const menuAberto = menuAbertoEm === pathname;
  const abrirMenu = () => setMenuAbertoEm(pathname);
  const fecharMenu = () => setMenuAbertoEm(null);
  const { moduloVisivel } = useVisibilidade();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage indisponível (aba privada, etc.) — mantém expandido.
    }
  }, []);

  // Com o menu aberto, a página de trás não rola junto com o dedo.
  useEffect(() => {
    if (!menuAberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [menuAberto]);

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

  // Duas perguntas diferentes, ambas obrigatorias: a escola contratou o modulo E esta pessoa tem
  // permissao nele. Passar so numa delas nao basta. Ver useVisibilidade.
  const visibleItems = NAV_ITEMS.filter((item) => moduloVisivel(item.href));
  const podeVerAdmin = moduloVisivel(ADMIN_HREF);

  const abas = ABAS_PREFERIDAS.map((href) => visibleItems.find((i) => i.href === href))
    .filter((i) => i !== undefined)
    .slice(0, 3);

  function itemAtivo(href: string) {
    if (href === "/") return pathname === "/" || moduloDaRota(pathname) === "tasks";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

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

  const menuDoUsuario = (tamanho: "sm" | "lg") => (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Conta"
        className={cn(
          "flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
          tamanho === "sm" ? "size-8 text-xs" : "size-11 text-sm"
        )}
      >
        {initials || "?"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {session.role}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setAlterandoSenha(true)}>
          <KeyRound className="size-4" />
          Alterar senha
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-full">
      <aside
        className={cn(
          "hidden shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar py-5 transition-[width] duration-150 md:flex",
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
        <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6 md:flex">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-heading font-semibold">{session.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Administração mora aqui, e não na sidebar: a sidebar lista o que se usa todo dia,
                e configurar a escola é coisa de vez em quando — ao lado de sair, que é o outro
                lugar onde já se procura ajuste de conta. */}
            {podeVerAdmin && (
            <Link
              href={ADMIN_HREF}
              title="Administração"
              aria-label="Administração"
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                pathname.startsWith(ADMIN_HREF) && "bg-accent text-foreground"
              )}
            >
              <Settings className="size-4" />
            </Link>
            )}

          {menuDoUsuario("sm")}
          </div>
        </header>

        {/* Cabeçalho do celular: menu, marca no centro, conta à direita. */}
        <header className="sticky top-0 z-30 grid shrink-0 grid-cols-[3rem_1fr_3rem] items-center border-b border-sidebar-border bg-card/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <button
            type="button"
            onClick={abrirMenu}
            aria-label="Abrir menu"
            className="flex size-11 items-center justify-center rounded-full text-foreground active:bg-accent"
          >
            <Menu className="size-6" />
          </button>

          <Link href={INICIO_HREF} className="flex h-16 items-center justify-center gap-2">
            <Image src="/icon-192.png" alt="" width={36} height={36} className="size-9" priority />
            <span className="flex flex-col leading-none">
              <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
                Educa<span className="text-primary">Pilot</span>
              </span>
              <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gestão escolar sem complicação
              </span>
            </span>
          </Link>

          <div className="flex justify-end">{menuDoUsuario("lg")}</div>
        </header>

        {/* min-w-0 (2026-09): sem isso, um item flex não encolhe abaixo da largura
            intrínseca do conteúdo (ex: uma tabela com min-width) — o "overflow-auto"
            fica inútil e a página inteira estoura de largura em telas estreitas,
            mesmo o conteúdo interno tendo seu próprio scroll horizontal. Achado
            testando a Chamada no mobile. No celular o padding de baixo abre espaço
            para a barra de abas fixa. */}
        <main className="min-w-0 flex-1 overflow-auto bg-background p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6">
          {children}
        </main>
      </div>

      {/* Barra de abas do celular. */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          <AbaDoCelular href={INICIO_HREF} label="Início" icon={House} ativa={pathname === INICIO_HREF} />
          {abas.map((item) => (
            <AbaDoCelular
              key={item.href}
              href={item.href}
              label={ROTULO_CURTO[item.href] ?? item.label}
              icon={item.icon}
              ativa={itemAtivo(item.href)}
            />
          ))}
          {Array.from({ length: 3 - abas.length }).map((_, i) => (
            <li key={`vazia-${i}`} />
          ))}
          <li>
            <button
              type="button"
              onClick={abrirMenu}
              className="flex h-16 w-full flex-col items-center justify-center gap-1 text-muted-foreground active:text-foreground"
            >
              <Menu className="size-6" />
              <span className="text-[11px] font-medium">Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Menu completo do celular, deslizando da esquerda. */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={fecharMenu}
            className="absolute inset-0 bg-foreground/40 animate-in fade-in"
          />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-card pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="flex items-center gap-2">
                <Image src="/icon-192.png" alt="" width={32} height={32} className="size-8" />
                <span className="font-heading text-lg font-extrabold">
                  Educa<span className="text-primary">Pilot</span>
                </span>
              </span>
              <button
                type="button"
                onClick={fecharMenu}
                aria-label="Fechar menu"
                className="flex size-10 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mx-5 mb-3 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials || "?"}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{session.name}</span>
                <span className="block text-xs text-muted-foreground">{session.role}</span>
              </span>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
              <ItemDoMenu href={INICIO_HREF} label="Início" icon={House} ativo={pathname === INICIO_HREF} />
              {visibleItems.map((item) => (
                <ItemDoMenu
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  ativo={itemAtivo(item.href)}
                />
              ))}
              {podeVerAdmin && (
                <ItemDoMenu
                  href={ADMIN_HREF}
                  label="Administração"
                  icon={Settings}
                  ativo={pathname.startsWith(ADMIN_HREF)}
                />
              )}
            </nav>

            <div className="flex flex-col gap-1 border-t border-sidebar-border px-3 py-3">
              <button
                type="button"
                onClick={() => {
                  fecharMenu();
                  setAlterandoSenha(true);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left font-medium active:bg-accent"
              >
                <KeyRound className="size-5 text-muted-foreground" />
                Alterar senha
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left font-medium text-destructive active:bg-destructive-soft"
              >
                <LogOut className="size-5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      <AlterarSenhaDialog open={alterandoSenha} onOpenChange={setAlterandoSenha} />
    </div>
  );
}

type Icone = React.ComponentType<{ className?: string }>;

function AbaDoCelular({
  href,
  label,
  icon: Icon,
  ativa,
}: {
  href: string;
  label: string;
  icon: Icone;
  ativa: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={ativa ? "page" : undefined}
        className={cn(
          "flex h-16 flex-col items-center justify-center gap-1 transition-colors",
          ativa ? "text-primary" : "text-muted-foreground active:text-foreground"
        )}
      >
        <Icon className="size-6" />
        <span className={cn("max-w-full truncate px-1 text-[11px]", ativa ? "font-semibold" : "font-medium")}>
          {label}
        </span>
      </Link>
    </li>
  );
}

function ItemDoMenu({
  href,
  label,
  icon: Icon,
  ativo,
}: {
  href: string;
  label: string;
  icon: Icone;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3 font-medium transition-colors",
        ativo ? "bg-primary text-primary-foreground" : "text-foreground active:bg-accent"
      )}
    >
      <Icon className="size-5 shrink-0" />
      {label}
    </Link>
  );
}
