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
  type LucideIcon,
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
import { ADMIN_HREF, GRUPOS_DO_MENU, INICIO_HREF, NAV_ITEMS } from "@/lib/kernel/nav-items";
import { acessoDaRota } from "@/lib/access/pode-ver";
import { useVisibilidade } from "@/lib/access/use-visibilidade";
import { useActiveModules } from "@/lib/kernel/use-active-modules";
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
const ABAS_PREFERIDAS = ["/", "/flow", "/finance", "/portaria", "/events"];
const ROTULO_CURTO: Record<string, string> = { "/events": "Vendas" };

/** Título que o cabeçalho mostra depois do nome da escola, por módulo. */
const TITULO_DO_MODULO: Record<string, string> = {
  tasks: "Rotina",
  reception: "Portaria",
  flow: "Formulários",
  finance: "Financeiro",
  events: "Eventos & vendas",
  admin: "Administração",
};

/** Módulo dono de uma rota, para marcar a aba certa em telas internas (/checklist é da Rotina). */
function moduloDaRota(pathname: string) {
  return acessoDaRota(pathname)?.modulo ?? null;
}

/** Itens do menu, já resolvidos: Início e Administração não estão em NAV_ITEMS. */
const ITENS_EXTRA: Record<string, { href: string; label: string; icon: LucideIcon }> = {
  [INICIO_HREF]: { href: INICIO_HREF, label: "Início", icon: House },
  [ADMIN_HREF]: { href: ADMIN_HREF, label: "Administração", icon: Settings },
};

function itemDoMenu(href: string) {
  return ITENS_EXTRA[href] ?? NAV_ITEMS.find((i) => i.href === href);
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
  const { data: modulosAtivos } = useActiveModules();

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
  const grupos = GRUPOS_DO_MENU.map((grupo) => ({
    titulo: grupo.titulo,
    itens: grupo.hrefs
      .filter((href) => href === INICIO_HREF || moduloVisivel(href))
      .map(itemDoMenu)
      .filter((i) => i !== undefined),
  })).filter((g) => g.itens.length > 0);

  const visibleItems = NAV_ITEMS.filter((item) => moduloVisivel(item.href));

  const abas = ABAS_PREFERIDAS.map((href) => visibleItems.find((i) => i.href === href))
    .filter((i) => i !== undefined)
    .slice(0, 3);

  function itemAtivo(href: string) {
    if (href === INICIO_HREF) return pathname === INICIO_HREF;
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

  const tituloDaTela =
    pathname === INICIO_HREF ? "Início" : (TITULO_DO_MODULO[moduloDaRota(pathname) ?? ""] ?? "");

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
    // min-h-dvh + flex-1: o `min-h-full` daqui dependia de uma altura definida no body, que não
    // existe (ele só tem min-height). Sem isso o shell ficava do tamanho do conteúdo e a barra
    // escura terminava no meio da tela em página curta.
    <div className="flex min-h-dvh flex-1">
      {/* Navegação escura da entrega de design: a barra é a tinta da interface, e o laranja marca
          só o item ativo — é a única decisão que existe aqui. */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col bg-sidebar py-5 transition-[width] duration-150 md:flex",
          collapsed ? "w-16 px-2" : "w-[250px] px-3"
        )}
      >
        <div className={cn("flex items-center gap-2.5", collapsed ? "flex-col" : "px-2")}>
          <Link href={INICIO_HREF} className="flex items-center gap-2.5 overflow-hidden">
            <Image
              src="/icon-192.png"
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0"
              priority
            />
            {!collapsed && (
              <span className="whitespace-nowrap font-heading text-[17px] font-semibold tracking-tight text-white">
                Educa<span className="text-action-brand">Pilot</span>
              </span>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="ml-auto shrink-0 text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>

        <nav className="mt-6 flex flex-col">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="mb-1.5">
              {!collapsed && (
                <div className="px-2.5 pb-2 pt-2.5 text-[10.5px] font-bold uppercase tracking-[.16em] text-sidebar-muted">
                  {grupo.titulo}
                </div>
              )}
              {grupo.itens.map((item) => (
                <ItemDaSidebar
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  ativo={itemAtivo(item.href)}
                  recolhido={collapsed}
                />
              ))}
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="mt-auto pt-4">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-surface px-3.5 py-3">
              {/* O cartão da entrega mostra a escola; enquanto o painel não devolve o nome dela,
                  mostra quem está logado — o dado que existe hoje. */}
              <div className="text-[10.5px] font-bold uppercase tracking-[.14em] text-sidebar-muted">
                Conta
              </div>
              <div className="mt-1.5 truncate text-[13.5px] font-semibold leading-snug text-white">
                {session.name}
              </div>
              <div className="mt-1 text-[11.5px] text-sidebar-muted">{session.role}</div>
              <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-sidebar-muted">
                <span className="size-1.5 rounded-full bg-success" />
                {(modulosAtivos ?? []).length} módulos ativos
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 hidden h-14 shrink-0 items-center gap-4 border-b border-border bg-background/90 px-6 backdrop-blur md:flex">
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
            <span className="truncate">{session.name}</span>
            {tituloDaTela && (
              <>
                <span className="text-border">/</span>
                <span className="font-semibold text-foreground">{tituloDaTela}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {moduloVisivel(ADMIN_HREF) && (
              <Link
                href={ADMIN_HREF}
                title="Administração"
                aria-label="Administração"
                className={cn(
                  "grid size-9 place-items-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:text-foreground",
                  pathname.startsWith(ADMIN_HREF) && "text-foreground"
                )}
              >
                <Settings className="size-4" />
              </Link>
            )}
            {menuDoUsuario("sm")}
          </div>
        </header>

        {/* Cabeçalho do celular: menu, marca no centro, conta à direita. */}
        <header className="sticky top-0 z-30 grid shrink-0 grid-cols-[3rem_1fr_3rem] items-center border-b border-border bg-background/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <button
            type="button"
            onClick={abrirMenu}
            aria-label="Abrir menu"
            className="flex size-11 items-center justify-center rounded-full text-foreground active:bg-muted"
          >
            <Menu className="size-6" />
          </button>

          <Link href={INICIO_HREF} className="flex h-16 items-center justify-center gap-2">
            <Image src="/icon-192.png" alt="" width={32} height={32} className="size-8 shrink-0" priority />
            <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Educa<span className="text-action-brand">Pilot</span>
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
        <main className="min-w-0 flex-1 overflow-auto bg-background p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:pb-11 md:pt-6">
          {children}
        </main>
      </div>

      {/* Barra de abas do celular. */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          <AbaDoCelular
            href={INICIO_HREF}
            label="Início"
            icon={House}
            ativa={pathname === INICIO_HREF}
          />
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

      {/* Menu completo do celular, deslizando da esquerda — mesma barra escura do computador. */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={fecharMenu}
            className="absolute inset-0 bg-[#17141B]/60 animate-in fade-in"
          />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-sidebar pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="flex items-center gap-2.5">
                <Image src="/icon-192.png" alt="" width={30} height={30} className="size-[30px] shrink-0" />
                <span className="font-heading text-[17px] font-semibold text-white">
                  Educa<span className="text-action-brand">Pilot</span>
                </span>
              </span>
              <button
                type="button"
                onClick={fecharMenu}
                aria-label="Fechar menu"
                className="flex size-10 items-center justify-center rounded-full text-sidebar-muted active:bg-sidebar-accent"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col overflow-y-auto px-3">
              {grupos.map((grupo) => (
                <div key={grupo.titulo} className="mb-1.5">
                  <div className="px-2.5 pb-2 pt-2.5 text-[10.5px] font-bold uppercase tracking-[.16em] text-sidebar-muted">
                    {grupo.titulo}
                  </div>
                  {grupo.itens.map((item) => (
                    <ItemDaSidebar
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      ativo={itemAtivo(item.href)}
                      recolhido={false}
                      grande
                    />
                  ))}
                </div>
              ))}
            </nav>

            <div className="flex flex-col gap-1 border-t border-sidebar-border px-3 py-3">
              <div className="flex items-center gap-2.5 px-2 pb-2">
                <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials || "?"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white">
                    {session.name}
                  </span>
                  <span className="block text-[11px] text-sidebar-muted">{session.role}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  fecharMenu();
                  setAlterandoSenha(true);
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-sidebar-foreground active:bg-sidebar-accent"
              >
                <KeyRound className="size-5 text-sidebar-muted" />
                Alterar senha
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-[#E9897C] active:bg-sidebar-accent"
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

function ItemDaSidebar({
  href,
  label,
  icon: Icon,
  ativo,
  recolhido,
  grande,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  ativo: boolean;
  recolhido: boolean;
  grande?: boolean;
}) {
  return (
    <Link
      href={href}
      title={recolhido ? label : undefined}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        grande ? "py-3" : "py-2.5",
        recolhido && "justify-center px-0",
        ativo
          ? "bg-white/[.07] text-white"
          : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
      )}
    >
      {/* A marca laranja à esquerda diz onde a pessoa está — some quando o item não é o atual. */}
      {ativo && !recolhido && (
        <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-[3px] bg-action-brand" />
      )}
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-md transition-colors",
          ativo ? "bg-action-brand text-white" : "bg-sidebar-accent text-[#8F87A0]"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      {!recolhido && <span className="truncate">{label}</span>}
    </Link>
  );
}

function AbaDoCelular({
  href,
  label,
  icon: Icon,
  ativa,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  ativa: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={ativa ? "page" : undefined}
        className={cn(
          "flex h-16 flex-col items-center justify-center gap-1 transition-colors",
          ativa ? "text-action" : "text-muted-foreground active:text-foreground"
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
