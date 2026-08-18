import {
  CalendarCheck,
  Settings,
  ShoppingBag,
  FileStack,
  Wallet,
  SlidersHorizontal,
} from "lucide-react";

// Áreas do menu — ver design_handoff_educapilot/README.md, "Estrutura de navegação".
// IMPORTANTE: módulos são vendidos separados e plugáveis por tenant — cada item aqui
// declara qual slug de módulo (GET /api/tenants/modules) o libera. `moduleSlug: null`
// = sempre visível (Kernel/base da plataforma ou Configurações, não são vendidos como
// módulo). "Eventos & Vendas" ainda não tem slug no catálogo real do backend (só
// tasks/flow/finance existem hoje) — fica oculto/bloqueado até o backend ganhar esse
// módulo. Usado tanto pra montar o menu (AppShell) quanto pra proteger a rota
// (ModuleGate) — as duas coisas precisam concordar, por isso é um arquivo só.
export const NAV_ITEMS = [
  { href: "/", label: "Rotina", icon: CalendarCheck, moduleSlug: "tasks" },
  { href: "/admin", label: "Administração", icon: Settings, moduleSlug: null },
  { href: "/events", label: "Eventos & Vendas", icon: ShoppingBag, moduleSlug: "events" },
  { href: "/flow", label: "Formulários", icon: FileStack, moduleSlug: "flow" },
  { href: "/finance", label: "Financeiro", icon: Wallet, moduleSlug: "finance" },
  { href: "/settings", label: "Configurações", icon: SlidersHorizontal, moduleSlug: null },
] as const;

/** Acha o item de nav "dono" de um pathname (o prefixo mais específico que bate). */
export function findNavItemForPath(pathname: string) {
  return NAV_ITEMS.filter(
    (item) =>
      pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
