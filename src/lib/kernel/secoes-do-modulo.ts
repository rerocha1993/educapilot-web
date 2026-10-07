import {
  ArrowLeftRight,
  ArrowRightLeft,
  Banknote,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  ChartColumn,
  CircleAlert,
  ClipboardCheck,
  Clock,
  Contact,
  CreditCard,
  Database,
  FileSignature,
  FileText,
  FolderKanban,
  GraduationCap,
  Handshake,
  IdCard,
  Images,
  Inbox,
  Landmark,
  Layers,
  LayoutDashboard,
  ListChecks,
  ListTree,
  Lock,
  Mail,
  Map as MapIcon,
  Megaphone,
  MessageCircle,
  Package,
  PiggyBank,
  ReceiptText,
  Shapes,
  ShoppingCart,
  SlidersHorizontal,
  SquareKanban,
  Stethoscope,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  UploadCloud,
  UserCheck,
  UserRound,
  Users,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { acessoDaRota } from "@/lib/access/pode-ver";
import { ADMIN_HREF, INICIO_HREF, NAV_ITEMS, findNavItemForPath } from "@/lib/kernel/nav-items";

/**
 * Uma seção de uma ferramenta: o que antes era uma aba na barra do topo da página e agora é um
 * item da barra lateral.
 */
export interface SecaoDoModulo {
  href: string;
  label: string;
  icon?: LucideIcon;
  /**
   * Área da permissão (slug do catálogo do backend). `null` é a visão geral do módulo, aberta a
   * quem tem qualquer área dele. Sem a chave, vale a área que a rota já tem em pode-ver.ts.
   */
  area?: string | null;
  /** Subtítulo que agrupa seções na barra (Fluxos tem duas metades: quadro e formulários). */
  grupo?: string;
  /** Tela que ainda não existe: a seção fica fora do menu até a marca ser tirada. */
  emBreve?: boolean;
}

/** Metades de Fluxos: o quadro de tarefas da equipe e os formulários da família. */
export const GRUPO_QUADRO = "Quadro";
export const GRUPO_FORMULARIOS = "Formulários";

/**
 * Catálogo único das seções de cada ferramenta, indexado pelo href da ferramenta (o mesmo de
 * NAV_ITEMS, mais Administração). Os `*-nav.tsx` (abas do celular), a barra lateral e o menu do
 * celular leem daqui — antes cada tela tinha o seu array.
 *
 * A ordem é a das abas que existiam.
 */
export const SECOES_DO_MODULO: Record<string, readonly SecaoDoModulo[]> = {
  // Rotina: "/" já é a Chamada, então não há índice próprio.
  "/": [
    { href: "/", label: "Chamada", icon: ClipboardCheck },
    { href: "/checklist", label: "Checklist", icon: ListChecks },
    { href: "/ocorrencias", label: "Ocorrências", icon: TriangleAlert },
    { href: "/materiais", label: "Materiais", icon: Package },
    { href: "/reunioes", label: "Reuniões", icon: Handshake },
    { href: "/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/planejamento-semanal", label: "Planejamento semanal", icon: CalendarRange },
    { href: "/relatorios", label: "Relatórios", icon: ChartColumn },
  ],

  // Cada seção da Portaria é uma área da permissão. "/portaria" é a entrada do módulo e abre para
  // qualquer área, mas a seção "Hoje" é só de quem tem a de chegada e saída.
  "/portaria": [
    { href: "/portaria", label: "Hoje", area: "presenca", icon: UserCheck },
    { href: "/portaria/mapa", label: "Mapa", area: "mapa", icon: MapIcon },
    { href: "/portaria/visitantes", label: "Visitantes", area: "visitantes", icon: IdCard },
    { href: "/portaria/relatorios", label: "Relatórios", area: "relatorios", icon: ChartColumn },
    { href: "/portaria/configuracao", label: "Configuração", area: "configuracao", icon: SlidersHorizontal },
  ],

  "/events": [
    { href: "/events", label: "Dashboard", icon: LayoutDashboard },
    { href: "/events/grupos", label: "Grupos de venda", icon: Layers },
    { href: "/events/produtos", label: "Produtos", icon: Package },
    { href: "/events/pedidos", label: "Pedidos", icon: ShoppingCart },
  ],

  // Fluxos: duas metades na mesma ferramenta. Contratos mora em Administração (2026-09).
  "/flow": [
    { href: "/flow/tarefas", label: "Meu quadro", icon: SquareKanban, grupo: GRUPO_QUADRO },
    { href: "/flow/tarefas/equipe", label: "Equipe", icon: Users, grupo: GRUPO_QUADRO },
    { href: "/flow/tarefas/automacoes", label: "Automações", icon: Workflow, grupo: GRUPO_QUADRO },
    { href: "/flow", label: "Formulários", icon: FileText, grupo: GRUPO_FORMULARIOS },
    { href: "/flow/respostas", label: "Caixa de envios", icon: Inbox, grupo: GRUPO_FORMULARIOS },
    { href: "/flow/relatorios", label: "Relatórios", icon: ChartColumn, grupo: GRUPO_FORMULARIOS },
    { href: "/flow/referencias", label: "Dados de referência", icon: Database, grupo: GRUPO_FORMULARIOS },
  ],

  "/finance": [
    { href: "/finance", label: "Painel", icon: LayoutDashboard },
    { href: "/finance/despesas", label: "Despesas", icon: TrendingDown },
    { href: "/finance/receitas", label: "Receitas", icon: TrendingUp },
    { href: "/finance/recibos", label: "Recibos", icon: ReceiptText },
    { href: "/finance/mensalidades", label: "Mensalidades", icon: Banknote },
    { href: "/finance/inadimplencia", label: "Inadimplência", icon: CircleAlert },
    { href: "/finance/orcamento", label: "Orçamento", icon: PiggyBank },
    { href: "/finance/precificacao", label: "Precificação", icon: Tag },
    { href: "/finance/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/finance/contas", label: "Contas", icon: Landmark },
    { href: "/finance/conciliacao", label: "Conciliação", icon: ArrowLeftRight },
    { href: "/finance/plano-de-contas", label: "Plano de contas", icon: ListTree },
    { href: "/finance/fechamento", label: "Fechamento", icon: Lock },
  ],

  // A visão geral do RH não tem área própria (`null`): abre para quem tem qualquer uma delas.
  "/rh": [
    { href: "/rh", label: "Visão geral", area: null, icon: LayoutDashboard },
    { href: "/rh/funcionarios", label: "Funcionários", area: "funcionarios", icon: Users },
    { href: "/rh/ponto", label: "Ponto", area: "ponto", icon: Clock },
    { href: "/rh/atestados", label: "Atestados", area: "atestados", icon: Stethoscope },
    { href: "/rh/afastamentos", label: "Afastamentos", area: "afastamentos", icon: CalendarOff },
    { href: "/rh/documentos", label: "Documentos", area: "documentos", icon: FileText },
    { href: "/rh/relatorios", label: "Relatórios", area: "relatorios", icon: ChartColumn },
    { href: "/rh/configuracao", label: "Configuração", area: "configuracao", icon: SlidersHorizontal },
  ],

  // A seção Chat leva a contagem de conversas não lidas (ver app-shell).
  "/relacionamento": [
    { href: "/relacionamento/avisos", label: "Avisos e eventos", area: "avisos", icon: Megaphone },
    { href: "/relacionamento/cronograma", label: "Cronograma", area: "cronograma", icon: CalendarDays },
    { href: "/relacionamento/familias", label: "Famílias", area: "familias", icon: UsersRound },
    { href: "/relacionamento/atividades", label: "Atividades", area: "atividades", icon: Shapes },
    { href: "/relacionamento/mural", label: "Mural", area: "mural", icon: Images },
    { href: "/relacionamento/chat", label: "Chat", area: "chat", icon: MessageCircle },
    { href: "/relacionamento/pagamentos", label: "Pagamentos", area: "pagamentos", icon: CreditCard },
    { href: "/relacionamento/loja", label: "Loja virtual", area: "loja", icon: Store },
    { href: "/relacionamento/configuracao", label: "Configuração", area: "configuracao", icon: SlidersHorizontal },
  ],

  // Os cartões do índice de Administração. Contratos pertence a Fluxos para efeito de contratação:
  // a visibilidade dele pergunta também se a escola tem o módulo (rotaVisivel).
  [ADMIN_HREF]: [
    { href: ADMIN_HREF, label: "Visão geral", area: null, icon: LayoutDashboard },
    { href: "/admin/contratos", label: "Contratos", icon: FileSignature },
    { href: "/admin/turmas", label: "Turmas", icon: GraduationCap },
    { href: "/admin/alunos", label: "Alunos", icon: UserRound },
    { href: "/admin/responsaveis", label: "Responsáveis", icon: Contact },
    { href: "/admin/usuarios", label: "Usuários", icon: Users },
    { href: "/admin/progressao", label: "Progressão de turma", icon: ArrowRightLeft },
    { href: "/admin/email", label: "E-mail da escola", icon: Mail },
    { href: "/admin/importar", label: "Importação em massa", icon: UploadCloud },
  ],
};

/**
 * Qual ferramenta é dona da rota (o href dela em NAV_ITEMS, ou ADMIN_HREF), ou nulo para Início e
 * telas sem dono (/settings).
 *
 * Administração vem antes de findNavItemForPath de propósito: /admin/contratos é hospedada por
 * Fluxos (ROTAS_HOSPEDADAS) para efeito de contratação, mas a tela, o título do cabeçalho e a
 * lista de seções são os de Administração — a mesma regra que o menu já seguia.
 */
export function ferramentaDaRota(pathname: string): string | null {
  if (pathname === INICIO_HREF) return null;
  if (pathname === ADMIN_HREF || pathname.startsWith(`${ADMIN_HREF}/`)) return ADMIN_HREF;

  const dono = findNavItemForPath(pathname);
  if (dono) return dono.href;

  // Telas internas da Rotina (/checklist, /ocorrencias...) que o menu não conhece pelo prefixo.
  const modulo = acessoDaRota(pathname)?.modulo;
  return NAV_ITEMS.find((item) => item.moduleSlug === modulo)?.href ?? null;
}

/**
 * A seção aberta: a de prefixo mais longo que bate com o pathname. `/finance/recibos/novo` acende
 * Recibos; `/rh/funcionarios/123`, Funcionários. A raiz "/" da Rotina só bate exata, senão ela
 * acenderia em todas as telas.
 */
export function secaoAtiva(
  secoes: readonly { href: string }[],
  pathname: string
): string | null {
  let melhor: string | null = null;

  for (const secao of secoes) {
    const bate =
      secao.href === "/"
        ? pathname === "/"
        : pathname === secao.href || pathname.startsWith(`${secao.href}/`);

    if (bate && (melhor === null || secao.href.length > melhor.length)) melhor = secao.href;
  }

  return melhor;
}
