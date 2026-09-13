import {
  CalendarCheck,
  DoorOpen,
  ShoppingBag,
  FileStack,
  Wallet,
} from "lucide-react";

// Áreas do menu — ver design_handoff_educapilot/README.md, "Estrutura de navegação".
// IMPORTANTE: módulos são vendidos separados e plugáveis por tenant — cada item aqui
// declara qual slug de módulo (GET /api/tenants/modules) o libera. `moduleSlug: null`
// = sempre visível (Kernel/base da plataforma ou Configurações, não são vendidos como
// módulo). "Eventos & Vendas" ainda não tem slug no catálogo real do backend (só
// tasks/flow/finance existem hoje) — fica oculto/bloqueado até o backend ganhar esse
// módulo. Usado tanto pra montar o menu (AppShell) quanto pra proteger a rota
// (ModuleGate) — as duas coisas precisam concordar, por isso é um arquivo só.
// Administração saiu da sidebar (2026-09): ela lista serviços do dia a dia, e configuração de
// escola não é um serviço — fica na engrenagem ao lado do avatar, junto de sair. A rota /admin
// continua existindo e acessível; só deixou de ocupar uma linha do menu principal.
//
// ADMIN_HREF fica aqui, e não solto no shell, porque findNavItemForPath continua sendo a fonte
// de verdade sobre navegação — dois lugares definindo rota é como um deles envelhece.
export const ADMIN_HREF = "/admin";

/**
 * Slug de acesso de uma rota.
 *
 * Casa com RecursoDoModulo no backend. Coincide com o moduleSlug para os módulos vendidos, mas
 * existe separado porque Administração tem permissão sem ser um módulo comercializado — e porque
 * as duas coisas respondem perguntas diferentes: uma é "a escola comprou?", a outra é "esta
 * pessoa pode?".
 */
export function slugDeAcesso(href: string): string | null {
  if (href === "/") return "tasks";
  if (href.startsWith("/admin")) return "admin";
  if (href.startsWith("/flow")) return "flow";
  if (href.startsWith("/finance")) return "finance";
  if (href.startsWith("/events")) return "events";
  if (href.startsWith("/portaria")) return "reception";
  return null;
}

export const NAV_ITEMS = [
  { href: "/", label: "Rotina", icon: CalendarCheck, moduleSlug: "tasks" },
  { href: "/portaria", label: "Portaria", icon: DoorOpen, moduleSlug: "reception" },
  { href: "/events", label: "Eventos & Vendas", icon: ShoppingBag, moduleSlug: "events" },
  { href: "/flow", label: "Formulários", icon: FileStack, moduleSlug: "flow" },
  { href: "/finance", label: "Financeiro", icon: Wallet, moduleSlug: "finance" },
] as const;

/** Acha o item de nav "dono" de um pathname (o prefixo mais específico que bate). */
export function findNavItemForPath(pathname: string) {
  return NAV_ITEMS.filter(
    (item) =>
      pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
