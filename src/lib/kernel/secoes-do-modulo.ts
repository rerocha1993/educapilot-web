import {
  ArrowLeftRight,
  ArrowRightLeft,
  Bot,
  CalendarCheck,
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
  MessageSquare,
  NotebookPen,
  Package,
  PiggyBank,
  ReceiptText,
  Rocket,
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

/** Subtítulos do Financeiro. */
export const GRUPO_MOVIMENTO = "Movimento";
export const GRUPO_PLANEJAMENTO = "Planejamento";
export const GRUPO_TESOURARIA = "Tesouraria";

/** Subtítulos do RH. */
export const GRUPO_PESSOAS = "Pessoas";
export const GRUPO_JORNADA = "Jornada";

/** Subtítulos do Relacionamento. */
export const GRUPO_COMUNICACAO = "Comunicação";
export const GRUPO_GESTAO = "Gestão";
export const GRUPO_PAGAMENTOS = "Pagamentos";

/** Subtítulos de Matrículas. */
export const GRUPO_RESULTADOS = "Resultados";
export const GRUPO_ATENDIMENTO = "Atendimento";
export const GRUPO_DIVULGACAO = "Divulgação";
export const GRUPO_ASSISTENTE = "Assistente";

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

  // Mensalidades e inadimplência moram em Relacionamento > Pagamentos (2026-10): quem cobra a
  // família é quem atende a família.
  "/finance": [
    { href: "/finance", label: "Painel", icon: LayoutDashboard },
    { href: "/finance/receitas", label: "Receitas", icon: TrendingUp, grupo: GRUPO_MOVIMENTO },
    { href: "/finance/despesas", label: "Despesas", icon: TrendingDown, grupo: GRUPO_MOVIMENTO },
    { href: "/finance/comprovantes", label: "Comprovantes", icon: Inbox, grupo: GRUPO_MOVIMENTO },
    { href: "/finance/recibos", label: "Recibos", icon: ReceiptText, grupo: GRUPO_MOVIMENTO },
    { href: "/finance/orcamento", label: "Orçamento anual", icon: PiggyBank, grupo: GRUPO_PLANEJAMENTO },
    { href: "/finance/projetos", label: "Projetos e eventos", icon: FolderKanban, grupo: GRUPO_PLANEJAMENTO },
    { href: "/finance/precificacao", label: "Precificação", icon: Tag, grupo: GRUPO_PLANEJAMENTO },
    { href: "/finance/contas", label: "Contas", icon: Landmark, grupo: GRUPO_TESOURARIA },
    { href: "/finance/conciliacao", label: "Conciliação", icon: ArrowLeftRight, grupo: GRUPO_TESOURARIA },
    { href: "/finance/plano-de-contas", label: "Plano de contas", icon: ListTree, grupo: GRUPO_TESOURARIA },
    { href: "/finance/fechamento", label: "Fechamento", icon: Lock, grupo: GRUPO_TESOURARIA },
    { href: "/finance/configuracao", label: "Configuração", icon: SlidersHorizontal },
  ],

  // A visão geral do RH não tem área própria (`null`): abre para quem tem qualquer uma delas.
  "/rh": [
    { href: "/rh", label: "Visão geral", area: null, icon: LayoutDashboard },
    { href: "/rh/funcionarios", label: "Funcionários", area: "funcionarios", icon: Users, grupo: GRUPO_PESSOAS },
    { href: "/rh/documentos", label: "Documentos", area: "documentos", icon: FileText, grupo: GRUPO_PESSOAS },
    { href: "/rh/ponto", label: "Ponto", area: "ponto", icon: Clock, grupo: GRUPO_JORNADA },
    { href: "/rh/atestados", label: "Atestados", area: "atestados", icon: Stethoscope, grupo: GRUPO_JORNADA },
    { href: "/rh/afastamentos", label: "Afastamentos", area: "afastamentos", icon: CalendarOff, grupo: GRUPO_JORNADA },
    { href: "/rh/relatorios", label: "Relatórios", area: "relatorios", icon: ChartColumn },
    { href: "/rh/configuracao", label: "Configuração", area: "configuracao", icon: SlidersHorizontal },
  ],

  // A seção Chat leva a contagem de conversas não lidas (ver app-shell).
  "/relacionamento": [
    // Mesma ordem do Agenda Edu, que as escolas já conhecem: Pagamentos, Comunicação, Gestão.
    // Cobranças reúne tudo que se cobra da família (individual, recorrente e por família); a
    // mensalidade e os planos recorrentes moram na aba Recorrente. As rotas antigas
    // (/pagamentos/mensalidades e /pagamentos/planos) redirecionam para lá. Todas são da área
    // pagamentos, e a Loja tem a sua. "Cobranças" é a raiz do grupo: o prefixo mais longo
    // (secaoAtiva) acende a irmã Inadimplência quando a pessoa está nela.
    { href: "/relacionamento/pagamentos", label: "Cobranças", area: "pagamentos", icon: CreditCard, grupo: GRUPO_PAGAMENTOS },
    { href: "/relacionamento/pagamentos/inadimplencia", label: "Inadimplência", area: "pagamentos", icon: CircleAlert, grupo: GRUPO_PAGAMENTOS },
    { href: "/relacionamento/loja", label: "Loja", area: "loja", icon: Store, grupo: GRUPO_PAGAMENTOS },
    { href: "/relacionamento/chat", label: "Chat", area: "chat", icon: MessageCircle, grupo: GRUPO_COMUNICACAO },
    { href: "/relacionamento/avisos", label: "Avisos e eventos", area: "avisos", icon: Megaphone, grupo: GRUPO_COMUNICACAO },
    { href: "/relacionamento/diario", label: "Diário", area: "diario", icon: NotebookPen, grupo: GRUPO_COMUNICACAO },
    { href: "/relacionamento/atividades", label: "Atividades", area: "atividades", icon: Shapes, grupo: GRUPO_COMUNICACAO },
    { href: "/relacionamento/cronograma", label: "Cronograma", area: "cronograma", icon: CalendarDays, grupo: GRUPO_COMUNICACAO },
    { href: "/relacionamento/mural", label: "Mural", area: "mural", icon: Images, grupo: GRUPO_COMUNICACAO },
    { href: "/relacionamento/familias", label: "Famílias", area: "familias", icon: UsersRound, grupo: GRUPO_GESTAO },
    { href: "/relacionamento/configuracao", label: "Configuração", area: "configuracao", icon: SlidersHorizontal },
  ],

  // Os cartões do índice de Administração. Contratos pertence a Fluxos para efeito de contratação:
  // a visibilidade dele pergunta também se a escola tem o módulo (rotaVisivel).
  // Matrículas (2026-10): era uma faixa de abas no topo de cada tela, sem a barra lateral agrupada
  // dos outros módulos. As áreas são as mesmas de pode-ver.ts (funil, conversas, configuracao).
  "/matriculas": [
    { href: "/matriculas", label: "Funil", icon: SquareKanban, area: "funil" },
    // Painel e Métricas leem o mesmo funil, e ficam na área dele.
    { href: "/matriculas/painel", label: "Painel", icon: LayoutDashboard, area: "funil", grupo: GRUPO_RESULTADOS },
    { href: "/matriculas/metricas", label: "Métricas", icon: ChartColumn, area: "funil", grupo: GRUPO_RESULTADOS },
    { href: "/matriculas/conversas", label: "Conversas", icon: MessageCircle, area: "conversas", grupo: GRUPO_ATENDIMENTO },
    { href: "/matriculas/visitas", label: "Visitas", icon: CalendarCheck, area: "funil", grupo: GRUPO_ATENDIMENTO },
    { href: "/matriculas/agenda", label: "Agenda de visitas", icon: CalendarDays, area: "configuracao", grupo: GRUPO_ATENDIMENTO },
    { href: "/matriculas/anuncios", label: "Anúncios", icon: Megaphone, area: "configuracao", grupo: GRUPO_DIVULGACAO },
    { href: "/matriculas/materiais", label: "Materiais", icon: Images, area: "configuracao", grupo: GRUPO_DIVULGACAO },
    { href: "/matriculas/assistente", label: "Assistente", icon: Bot, area: "configuracao", grupo: GRUPO_ASSISTENTE },
    { href: "/matriculas/funcionamento", label: "Funcionamento", icon: SlidersHorizontal, area: "configuracao", grupo: GRUPO_ASSISTENTE },
    { href: "/matriculas/whatsapp", label: "WhatsApp", icon: MessageSquare, area: "configuracao", grupo: GRUPO_ASSISTENTE },
    { href: "/matriculas/configuracao", label: "Configuração", icon: SlidersHorizontal, area: "configuracao" },
    { href: "/matriculas/comecar", label: "Primeiros passos", icon: Rocket, area: "configuracao" },
  ],

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
