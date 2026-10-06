import {
  CalendarCheck,
  DoorOpen,
  ShoppingBag,
  FileStack,
  HeartHandshake,
  Users,
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
  if (href.startsWith("/rh")) return "rh";
  if (href.startsWith("/relacionamento")) return "relacionamento";
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
  { href: "/rh", label: "RH", icon: Users, moduleSlug: "rh" },
  { href: "/relacionamento", label: "Relacionamento", icon: HeartHandshake, moduleSlug: "relacionamento" },
] as const;

/**
 * Subitens que abrem embaixo do módulo quando a pessoa está dentro dele.
 *
 * Fluxos virou dois produtos na mesma caixa: o quadro de tarefas da equipe e os formulários da
 * família. Oito pílulas numa faixa só era uma lista, não uma navegação — aqui a barra separa as
 * duas metades, e as pílulas de dentro da tela passam a mostrar só as funções da metade aberta.
 */
export const SUBITENS_DO_MENU: Record<string, { href: string; label: string }[]> = {
  // Rotina tem várias telas e a barra só lista as duas de entrada: a Chamada do dia e o
  // Calendário. As demais continuam nas abas de dentro da tela (RotinaNav).
  "/": [
    { href: "/", label: "Chamada" },
    { href: "/calendario", label: "Calendário" },
  ],
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
  "/": [
    "/",
    "/ocorrencias",
    "/checklist",
    "/planejamento-semanal",
    "/materiais",
    "/reunioes",
    "/calendario",
    "/relatorios",
  ],
  "/flow": ["/flow", "/flow/tarefas", "/flow/respostas", "/admin/contratos", "/flow/relatorios", "/flow/referencias"],
  // A visão geral do RH é aberta a qualquer área do módulo; as demais entradas são para quem tem
  // só uma área (a secretaria que lança ponto e nada mais, por exemplo).
  "/rh": [
    "/rh",
    "/rh/funcionarios",
    "/rh/ponto",
    "/rh/atestados",
    "/rh/afastamentos",
    "/rh/documentos",
    "/rh/relatorios",
    "/rh/configuracao",
  ],
  // A entrada é a lista de avisos; quem só tem Cronograma ou Famílias cai na primeira que abre.
  "/relacionamento": [
    "/relacionamento/avisos",
    "/relacionamento/cronograma",
    "/relacionamento/familias",
    "/relacionamento/configuracao",
  ],
};

/**
 * Telas que moram na pasta de outro módulo.
 *
 * Contratos foi para Administração, mas continua sendo Fluxos para efeito de contratação: sem
 * esta linha, findNavItemForPath não acharia dono para /admin/contratos e a checagem "a escola
 * contratou o módulo?" sumiria só nessa tela.
 */
const ROTAS_HOSPEDADAS: { prefixo: string; dono: string }[] = [
  { prefixo: "/admin/contratos", dono: "/flow" },
];

/**
 * Os dois grupos do menu, na ordem da entrega de design: Operação é o dia a dia, Escola é o que
 * se ajusta de vez em quando. Cada href vem de NAV_ITEMS ou é Início/Administração, que não são
 * módulos vendidos — a visibilidade continua sendo decidida por useVisibilidade.
 */
export const GRUPOS_DO_MENU = [
  { titulo: "Operação", hrefs: [INICIO_HREF, "/", "/portaria", "/flow", "/finance"] },
  { titulo: "Escola", hrefs: [ADMIN_HREF, "/rh", "/relacionamento", "/events"] },
] as const;

/** Acha o item de nav "dono" de um pathname (o prefixo mais específico que bate). */
export function findNavItemForPath(pathname: string) {
  const hospedada = ROTAS_HOSPEDADAS.find(
    (r) => pathname === r.prefixo || pathname.startsWith(`${r.prefixo}/`)
  );
  if (hospedada) return NAV_ITEMS.find((item) => item.href === hospedada.dono);

  return NAV_ITEMS.filter(
    (item) =>
      pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
