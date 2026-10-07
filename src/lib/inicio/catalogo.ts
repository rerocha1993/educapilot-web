import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  FileSignature,
  FileStack,
  Inbox,
  MessageSquareWarning,
  NotebookPen,
  Package,
  Receipt,
  ShoppingBag,
  SquareKanban,
  TrendingUp,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * O catálogo da tela Início: quais números, atalhos e pendências existem.
 *
 * Um lugar só porque a permissão anda junto do item: cada entrada declara a rota que abre, e essa
 * rota é também a permissão que ela exige. Item que a pessoa não pode abrir não aparece na tela
 * nem na lista de personalização — número que não se pode investigar não ajuda ninguém.
 *
 * O backend não conhece nada disto: ele guarda ids, a ordem e se a seção aparece. Quem sabe o que
 * cada id significa é esta tela, e é por isso que id salvo fora deste catálogo é ignorado em
 * silêncio — toda versão pode tirar ou trocar um item.
 */

export interface ItemDoInicio {
  id: string;
  /** Rótulo curto, para a lista de personalização. Na tela cada item tem o próprio texto. */
  rotulo: string;
  /** Uma linha explicando o que o item mostra — só a lista de personalização usa. */
  descricao: string;
  /** A tela que o item abre. É também a permissão que ele exige (ver useVisibilidade). */
  rota: string;
  icone: LucideIcon;
  /**
   * Depende do financeiro estar respondendo (`financeiro.disponivel`). Sem ele os valores vêm
   * ausentes, e ausente não é zero: a escola sem financeiro não tem R$ 0,00 a receber.
   */
  exigeFinanceiro?: boolean;
}

// ------------------------------------------------------------------ números do dia

export const NUMEROS: ItemDoInicio[] = [
  {
    id: "vence-hoje",
    rotulo: "Vence hoje",
    descricao: "Quanto em cobranças em aberto vence no dia de hoje.",
    rota: "/finance/mensalidades",
    icone: CalendarClock,
    exigeFinanceiro: true,
  },
  {
    id: "a-receber",
    rotulo: "A receber",
    descricao: "O que ainda entra de hoje até o fim do mês. Não inclui o atrasado.",
    rota: "/finance/mensalidades",
    icone: TrendingUp,
    exigeFinanceiro: true,
  },
  {
    id: "em-atraso",
    rotulo: "Em atraso",
    descricao: "Quanto está vencido e não pago, e quantos títulos são.",
    rota: "/finance/inadimplencia",
    icone: Receipt,
    exigeFinanceiro: true,
  },
  {
    id: "presencas",
    rotulo: "Chamada de hoje",
    descricao: "Quantos alunos estão na escola hoje e quais turmas ainda não marcaram.",
    rota: "/",
    icone: CalendarCheck,
  },
  {
    id: "contratos-assinados",
    rotulo: "Contratos assinados",
    descricao: "Assinados no mês corrente e quantos esperam conferência.",
    rota: "/admin/contratos",
    icone: FileSignature,
  },
  {
    id: "envios-aguardando",
    rotulo: "Envios aguardando",
    descricao: "Respostas de formulários enviadas pelas famílias e ainda sem aprovação.",
    rota: "/flow/respostas",
    icone: Inbox,
  },
];

// ------------------------------------------------------------------ atalhos

export const ATALHOS: ItemDoInicio[] = [
  { id: "chamada", rotulo: "Chamada", descricao: "Marcar presença do dia.", rota: "/", icone: CalendarCheck },
  {
    id: "ocorrencias",
    rotulo: "Ocorrências",
    descricao: "Registrar e acompanhar ocorrências da turma.",
    rota: "/ocorrencias",
    icone: MessageSquareWarning,
  },
  {
    id: "planejamento",
    rotulo: "Planejamento",
    descricao: "O planejamento semanal das turmas.",
    rota: "/planejamento-semanal",
    icone: NotebookPen,
  },
  {
    id: "checklist",
    rotulo: "Checklist",
    descricao: "As rotinas do dia para conferir.",
    rota: "/checklist",
    icone: ClipboardList,
  },
  {
    id: "tarefas",
    rotulo: "Meu quadro",
    descricao: "O quadro de tarefas da própria pessoa.",
    rota: "/flow/tarefas",
    icone: SquareKanban,
  },
  {
    id: "envios",
    rotulo: "Envios",
    descricao: "A caixa de respostas dos formulários.",
    rota: "/flow/respostas",
    icone: Inbox,
  },
  {
    id: "formularios",
    rotulo: "Formulários",
    descricao: "Criar e editar formulários.",
    rota: "/flow",
    icone: FileStack,
  },
  {
    id: "contratos",
    rotulo: "Contratos",
    descricao: "Contratos das famílias e a fila de conferência.",
    rota: "/admin/contratos",
    icone: FileSignature,
  },
  {
    id: "mensalidades",
    rotulo: "Mensalidades",
    descricao: "Cobranças lançadas e seus vencimentos.",
    rota: "/finance/mensalidades",
    icone: Wallet,
  },
  {
    id: "inadimplencia",
    rotulo: "Inadimplência",
    descricao: "Quem está em atraso, com contato para cobrança.",
    rota: "/finance/inadimplencia",
    icone: Receipt,
  },
  {
    id: "alunos",
    rotulo: "Alunos",
    descricao: "Cadastro de alunos e fichas.",
    rota: "/admin/alunos",
    icone: UsersRound,
  },
  {
    id: "portaria",
    rotulo: "Portaria",
    descricao: "Entrada e saída do dia.",
    rota: "/portaria",
    icone: DoorOpen,
  },
  {
    id: "relatorios",
    rotulo: "Relatórios",
    descricao: "Relatórios da rotina da escola.",
    rota: "/relatorios",
    icone: BarChart3,
  },
  {
    id: "materiais",
    rotulo: "Materiais",
    descricao: "Pedidos e controle de materiais.",
    rota: "/materiais",
    icone: Package,
  },
  {
    id: "vendas",
    rotulo: "Vendas",
    descricao: "Eventos, produtos e pedidos.",
    rota: "/events",
    icone: ShoppingBag,
  },
];

// ------------------------------------------------------------------ pendências

export const PENDENCIAS: ItemDoInicio[] = [
  {
    id: "chamada-aberta",
    rotulo: "Chamada em aberto",
    descricao: "Turmas com aluno e sem nenhum registro de chamada hoje.",
    rota: "/",
    icone: CalendarCheck,
  },
  {
    id: "faltas-sem-justificativa",
    rotulo: "Faltas sem justificativa",
    descricao: "Faltas dos últimos dias que ninguém justificou.",
    rota: "/",
    icone: AlertTriangle,
  },
  {
    id: "tarefas-atrasadas",
    rotulo: "Tarefas atrasadas",
    descricao: "Cartões do seu quadro com prazo vencido — o mais antigo primeiro.",
    rota: "/flow/tarefas",
    icone: SquareKanban,
  },
  {
    id: "contratos-conferencia",
    rotulo: "Contratos aguardando conferência",
    descricao: "Assinados pelas famílias e ainda sem aprovação da gestão.",
    rota: "/admin/contratos",
    icone: FileSignature,
  },
  {
    id: "mensalidades-vencidas",
    rotulo: "Mensalidades vencidas",
    descricao: "Cobranças vencidas e não pagas.",
    rota: "/finance/inadimplencia",
    icone: Wallet,
    exigeFinanceiro: true,
  },
  {
    id: "envios-aguardando",
    rotulo: "Envios aguardando aprovação",
    descricao: "Respostas de formulários esperando alguém revisar.",
    rota: "/flow/respostas",
    icone: Inbox,
  },
];

// ------------------------------------------------------------------ blocos

export type IdDeBloco = "numeros" | "precisa" | "tarefas" | "formularios" | "atalhos";

export const BLOCOS: { id: IdDeBloco; rotulo: string }[] = [
  { id: "numeros", rotulo: "Números do dia" },
  { id: "precisa", rotulo: "Precisa de você" },
  { id: "tarefas", rotulo: "Minhas tarefas" },
  { id: "formularios", rotulo: "Formulários" },
  { id: "atalhos", rotulo: "Atalhos" },
];

// ------------------------------------------------------------------ padrão de fábrica por papel

export interface PadraoDoPapel {
  /** Ordem de fábrica dos blocos. Bloco fora desta lista entra no fim. */
  blocos: IdDeBloco[];
  numeros: string[];
  pendencias: string[];
  atalhos: string[];
  /**
   * O botão laranja do cabeçalho, quando o papel tem um. É um id de atalho, e vem do papel — não
   * da tela: a gestão não quer "Registrar ocorrência" fixo ali, a professora quer.
   */
  acaoPrincipal?: string;
}

/**
 * Os perfis são os slugs de PerfilDeUsuario (backend): Admin, Coordenacao, Secretaria, Teacher,
 * mais Master (equipe da plataforma, que enxerga como gestão). O papel chega no login e fica na
 * sessão (`session.role`, ver StoredSession). Perfil desconhecido cai em Professor(a), que é o de
 * menor alcance — mesma normalização que o backend faz ao gravar.
 */
const GESTAO: PadraoDoPapel = {
  blocos: ["numeros", "precisa", "formularios", "atalhos", "tarefas"],
  numeros: ["vence-hoje", "a-receber", "em-atraso"],
  pendencias: ["mensalidades-vencidas", "contratos-conferencia", "envios-aguardando", "chamada-aberta"],
  atalhos: ["inadimplencia", "contratos", "alunos", "relatorios"],
};

const COORDENACAO: PadraoDoPapel = {
  blocos: ["numeros", "precisa", "tarefas", "atalhos", "formularios"],
  numeros: ["presencas", "envios-aguardando", "contratos-assinados"],
  pendencias: ["chamada-aberta", "faltas-sem-justificativa", "tarefas-atrasadas", "envios-aguardando"],
  atalhos: ["chamada", "planejamento", "ocorrencias", "checklist", "relatorios"],
  acaoPrincipal: "ocorrencias",
};

const SECRETARIA: PadraoDoPapel = {
  blocos: ["numeros", "precisa", "formularios", "atalhos", "tarefas"],
  numeros: ["contratos-assinados", "envios-aguardando", "presencas"],
  pendencias: ["contratos-conferencia", "envios-aguardando", "chamada-aberta", "faltas-sem-justificativa"],
  atalhos: ["contratos", "envios", "alunos", "formularios"],
};

const PROFESSOR: PadraoDoPapel = {
  blocos: ["numeros", "precisa", "tarefas", "atalhos", "formularios"],
  numeros: ["presencas"],
  pendencias: ["chamada-aberta", "faltas-sem-justificativa", "tarefas-atrasadas"],
  atalhos: ["chamada", "ocorrencias", "planejamento", "checklist"],
  acaoPrincipal: "ocorrencias",
};

const PADROES: Record<string, PadraoDoPapel> = {
  Admin: GESTAO,
  Master: GESTAO,
  Coordenacao: COORDENACAO,
  Secretaria: SECRETARIA,
  Teacher: PROFESSOR,
};

export function padraoDoPapel(papel: string | null | undefined): PadraoDoPapel {
  return (papel && PADROES[papel]) || PROFESSOR;
}

// ------------------------------------------------------------------ escolha × catálogo

/**
 * O que aparece numa seção: a escolha da pessoa, ou o padrão do papel dela quando ela nunca
 * escolheu.
 *
 * `catalogo` já chega filtrado pela permissão — é por isso que um id salvo que a pessoa não pode
 * mais abrir simplesmente não encontra par e some, sem derrubar a tela. Id que o catálogo não
 * conhece (versão antiga) segue o mesmo caminho.
 *
 * Seção vazia é "nunca escolhi", e não "escolhi nada": não dá para distinguir as duas no que é
 * gravado. Quem quer a seção fora da tela desliga o bloco inteiro — é o que o diálogo faz quando
 * a pessoa desmarca o último item.
 */
export function escolherItens(
  catalogo: ItemDoInicio[],
  salvos: string[] | undefined,
  padrao: string[]
): ItemDoInicio[] {
  const porId = new Map(catalogo.map((i) => [i.id, i]));
  const ids = salvos && salvos.length > 0 ? salvos : padrao;
  return ids.map((id) => porId.get(id)).filter((i): i is ItemDoInicio => i !== undefined);
}
