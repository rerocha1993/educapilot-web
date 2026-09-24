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
// Administração voltou para a sidebar (2026-09, direção visual nova): o menu passou a ter dois
// grupos, "Operação" (o dia a dia) e "Escola" (o que se mexe de vez em quando), e é nesse segundo
// grupo que configurar a escola deixa de competir com a rotina. A engrenagem no cabeçalho continua.
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

/** Tela de atalhos e visão do dia. Não é módulo vendido: está sempre visível. */
export const INICIO_HREF = "/inicio";

export const NAV_ITEMS = [
  { href: "/", label: "Rotina", icon: CalendarCheck, moduleSlug: "tasks" },
  { href: "/portaria", label: "Portaria", icon: DoorOpen, moduleSlug: "reception" },
  { href: "/events", label: "Eventos & Vendas", icon: ShoppingBag, moduleSlug: "events" },
  { href: "/flow", label: "Fluxos", icon: FileStack, moduleSlug: "flow" },
  { href: "/finance", label: "Financeiro", icon: Wallet, moduleSlug: "finance" },
] as const;

/**
 * Subitens que abrem embaixo do módulo quando a pessoa está dentro dele.
 *
 * Fluxos virou dois produtos na mesma caixa: o quadro de tarefas da equipe e os formulários da
 * família. Oito pílulas numa faixa só era uma lista, não uma navegação — aqui a barra separa as
 * duas metades, e as pílulas de dentro da tela passam a mostrar só as funções da metade aberta.
 */
export const SUBITENS_DO_MENU: Record<string, { href: string; label: string }[]> = {
  "/flow": [
    { href: "/flow/tarefas", label: "Quadro" },
    { href: "/flow", label: "Formulários" },
  ],
};

/**
 * Por onde entrar em cada módulo, na ordem de preferência.
 *
 * O item do menu aponta para a tela âncora do módulo, e ela tem área própria: "/" é a Chamada e
 * "/flow" são os Formulários. Quem não tem essa área clicava no módulo e caía em "Sem acesso" — a
 * professora com só o Quadro, em Fluxos. O menu leva para a primeira destas que a pessoa pode abrir.
 */
export const ENTRADAS_DO_MODULO: Record<string, string[]> = {
  "/": ["/", "/ocorrencias", "/checklist", "/planejamento-semanal", "/materiais", "/reunioes", "/relatorios"],
  "/flow": ["/flow", "/flow/tarefas", "/flow/respostas", "/flow/contratos", "/flow/relatorios", "/flow/referencias"],
};

/**
 * Os dois grupos do menu, na ordem da entrega de design: Operação é o dia a dia, Escola é o que
 * se ajusta de vez em quando. Cada href vem de NAV_ITEMS ou é Início/Administração, que não são
 * módulos vendidos — a visibilidade continua sendo decidida por useVisibilidade.
 */
export const GRUPOS_DO_MENU = [
  { titulo: "Operação", hrefs: [INICIO_HREF, "/", "/portaria", "/flow", "/finance"] },
  { titulo: "Escola", hrefs: [ADMIN_HREF, "/events"] },
] as const;

/** Acha o item de nav "dono" de um pathname (o prefixo mais específico que bate). */
export function findNavItemForPath(pathname: string) {
  return NAV_ITEMS.filter(
    (item) =>
      pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
