import type { AcessoDoUsuario } from "./use-acessos";

/**
 * De qual módulo e área é cada rota.
 *
 * Casa com o catálogo do backend (RecursoDoModulo). Existe porque a permissão é gravada por área —
 * "Caixa de envios", "Usuários e convites" —, e o sistema só sabia comparar módulos: quem tinha o
 * módulo Formulários via tudo dentro dele, inclusive as áreas desmarcadas.
 *
 * `area: null` é a página de entrada do módulo (o índice de Administração, o fluxo de caixa): quem
 * tem qualquer área do módulo pode vê-la.
 *
 * A ordem importa: vale o primeiro prefixo que casa, então o mais específico vem antes.
 */
const ROTAS: { padrao: RegExp; modulo: string; area: string | null }[] = [
  // Fluxos (Kanban de tarefas + formulários)
  { padrao: /^\/flow\/tarefas\/equipe/, modulo: "flow", area: "equipe" },
  { padrao: /^\/flow\/tarefas\/automacoes/, modulo: "flow", area: "recorrencias" },
  // O quadro da propria pessoa nao e area vendida a parte: quem tem qualquer area de Fluxos
  // tem o proprio quadro. Sem isso, quem ja usava o sistema com areas marcadas abriria o
  // modulo sem enxergar a tela nova ate alguem editar a permissao dele.
  { padrao: /^\/flow\/tarefas/, modulo: "flow", area: null },
  { padrao: /^\/flow\/respostas/, modulo: "flow", area: "respostas" },
  { padrao: /^\/flow\/[^/]+\/respostas/, modulo: "flow", area: "respostas" },
  { padrao: /^\/flow\/contratos/, modulo: "flow", area: "contratos" },
  { padrao: /^\/flow\/referencias/, modulo: "flow", area: "referencias" },
  { padrao: /^\/flow\/relatorios/, modulo: "flow", area: "relatorios" },
  { padrao: /^\/flow/, modulo: "flow", area: "formularios" },

  // Administração
  { padrao: /^\/admin\/turmas/, modulo: "admin", area: "turmas" },
  { padrao: /^\/admin\/alunos/, modulo: "admin", area: "alunos" },
  { padrao: /^\/admin\/responsaveis/, modulo: "admin", area: "responsaveis" },
  { padrao: /^\/admin\/usuarios/, modulo: "admin", area: "usuarios" },
  { padrao: /^\/admin\/progressao/, modulo: "admin", area: "progressao" },
  { padrao: /^\/admin\/email/, modulo: "admin", area: "email" },
  { padrao: /^\/admin\/importar/, modulo: "admin", area: "importar" },
  { padrao: /^\/admin/, modulo: "admin", area: null },

  // Financeiro
  { padrao: /^\/finance\/mensalidades/, modulo: "finance", area: "mensalidades" },
  { padrao: /^\/finance\/receitas/, modulo: "finance", area: "receitas" },
  { padrao: /^\/finance\/despesas/, modulo: "finance", area: "despesas" },
  { padrao: /^\/finance\/orcamento/, modulo: "finance", area: "orcamento" },
  { padrao: /^\/finance\/inadimplencia/, modulo: "finance", area: "inadimplencia" },
  { padrao: /^\/finance\/contas/, modulo: "finance", area: "contas" },
  { padrao: /^\/finance\/plano-de-contas/, modulo: "finance", area: "plano-de-contas" },
  { padrao: /^\/finance\/fechamento/, modulo: "finance", area: "fechamento" },
  { padrao: /^\/finance/, modulo: "finance", area: null },

  // Eventos & Vendas
  { padrao: /^\/events\/grupos/, modulo: "events", area: "grupos" },
  { padrao: /^\/events\/produtos/, modulo: "events", area: "produtos" },
  { padrao: /^\/events\/pedidos/, modulo: "events", area: "pedidos" },
  { padrao: /^\/events/, modulo: "events", area: null },

  // Portaria. A entrada do módulo é aberta a qualquer área dele: quem só tem Relatórios é
  // levado para lá pela própria página, em vez de esbarrar em "Sem acesso" ao clicar no menu.
  { padrao: /^\/portaria\/mapa/, modulo: "reception", area: "mapa" },
  { padrao: /^\/portaria\/visitantes/, modulo: "reception", area: "visitantes" },
  { padrao: /^\/portaria\/relatorios/, modulo: "reception", area: "relatorios" },
  { padrao: /^\/portaria\/configuracao/, modulo: "reception", area: "configuracao" },
  { padrao: /^\/portaria/, modulo: "reception", area: null },

  // Rotina
  { padrao: /^\/ocorrencias/, modulo: "tasks", area: "ocorrencias" },
  { padrao: /^\/checklist/, modulo: "tasks", area: "checklist" },
  { padrao: /^\/planejamento-semanal/, modulo: "tasks", area: "planejamento" },
  { padrao: /^\/relatorios/, modulo: "tasks", area: "relatorios" },
  { padrao: /^\/materiais/, modulo: "tasks", area: "materiais" },
  { padrao: /^\/reunioes/, modulo: "tasks", area: "reunioes" },
  { padrao: /^\/$/, modulo: "tasks", area: "chamada" },
];

export interface AcessoDaRota {
  modulo: string;
  area: string | null;
}

/** Módulo e área de uma rota, ou nulo para rotas fora do controle de acesso (ex.: /settings). */
export function acessoDaRota(pathname: string): AcessoDaRota | null {
  const achado = ROTAS.find((r) => r.padrao.test(pathname));
  return achado ? { modulo: achado.modulo, area: achado.area } : null;
}

/**
 * A pessoa pode ver esta área.
 *
 * Três regras, nesta ordem:
 *
 * 1. Sem nenhuma permissão gravada, vê tudo. É o caso de quem já usava o sistema antes de as
 *    permissões existirem; sem isso, a publicação teria esvaziado o menu de todo mundo.
 * 2. Módulo fora da lista: não vê nada dele.
 * 3. Módulo sem área marcada significa módulo inteiro — uma área criada amanhã já entra para quem
 *    tinha o módulo completo, em vez de sumir do acesso.
 */
export function podeVerArea(
  acesso: AcessoDoUsuario | undefined,
  modulo: string,
  area: string | null
): boolean {
  const modulos = acesso?.modulos ?? [];
  if (modulos.length === 0) return true;

  const doModulo = modulos.find((m) => m.moduloSlug === modulo);
  if (!doModulo) return false;

  if (area === null) return true;
  if (doModulo.areas.length === 0) return true;

  return doModulo.areas.includes(area);
}

/** A pessoa pode abrir esta rota. Rota fora do catálogo é sempre liberada. */
export function podeVerRota(acesso: AcessoDoUsuario | undefined, pathname: string): boolean {
  const rota = acessoDaRota(pathname);
  return !rota || podeVerArea(acesso, rota.modulo, rota.area);
}
