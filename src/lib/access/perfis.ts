/**
 * Perfis de quem trabalha na escola. Espelha PerfilDeUsuario no backend.
 *
 * Perfil não é permissão: o que cada pessoa abre continua vindo das áreas marcadas na tela de
 * usuários. O perfil responde outra pergunta — quem é da gestão, e portanto vê valor.
 *
 * O slug vai no token e no banco: mudar rótulo é livre, mudar slug derruba o acesso de quem já o
 * tem gravado.
 */
export const PERFIS = [
  {
    slug: "Admin",
    rotulo: "Gestão",
    descricao: "Vê tudo, inclusive valores, e cuida de usuários e configurações.",
  },
  {
    slug: "Coordenacao",
    rotulo: "Coordenação",
    descricao: "Acompanha turmas, rotina e a equipe. Não vê relatório com valor.",
  },
  {
    slug: "Secretaria",
    rotulo: "Secretaria",
    descricao: "Matrícula, contratos e atendimento à família. Não vê relatório com valor.",
  },
  {
    slug: "Teacher",
    rotulo: "Professor(a)",
    descricao: "A sala dele: chamada, ocorrências e o quadro de tarefas.",
  },
] as const;

export type PerfilSlug = (typeof PERFIS)[number]["slug"];

export function rotuloDoPerfil(slug: string | undefined): string {
  return PERFIS.find((p) => p.slug === slug)?.rotulo ?? "Professor(a)";
}

/**
 * É gestão: vê valores e mexe na configuração da escola.
 *
 * "Master" é o suporte da plataforma dentro da escola — sem ele aqui, o suporte veria menos que a
 * diretora ao abrir o sistema para ajudar.
 */
export function ehGestao(perfil: string | undefined): boolean {
  return perfil === "Admin" || perfil === "Master";
}

/**
 * O que já vem marcado ao escolher um perfil, num acesso ainda em branco.
 *
 * É sugestão da tela, e não regra: quem convida marca e desmarca o que quiser antes de salvar, e
 * um acesso que já tem áreas nunca é sobrescrito. Existe porque marcar trinta caixas a cada
 * convite é o caminho curto para alguém liberar tudo "para não errar".
 *
 * Lista vazia num módulo quer dizer "o módulo inteiro" — é como o backend grava. Financeiro não
 * aparece para ninguém além da gestão — dinheiro é da gestão, e foi o pedido da escola —, com uma
 * exceção: a área Recibos, que a Secretaria emite.
 *
 * RH (a equipe da escola) vai para Coordenação e Secretaria, sem a configuração da jornada;
 * professor não leva nada dele — folha e atestado dos colegas não são da sala de aula.
 */
export const AREAS_SUGERIDAS: Record<string, { moduloSlug: string; areas: string[] }[]> = {
  Secretaria: [
    { moduloSlug: "flow", areas: [] },
    { moduloSlug: "reception", areas: [] },
    { moduloSlug: "tasks", areas: [] },
    { moduloSlug: "admin", areas: ["turmas", "alunos", "responsaveis", "progressao", "importar"] },
    { moduloSlug: "rh", areas: ["funcionarios", "ponto", "atestados", "afastamentos", "documentos", "relatorios"] },
    // Recibo é atendimento à família, e a secretaria é quem o emite; o orçamento de projeto
    // (festa) também passa por ela, que cobra as famílias. O resto do Financeiro (despesas,
    // contas, fechamento) continua sendo da gestão.
    { moduloSlug: "finance", areas: ["recibos", "projetos"] },
    // Pagamentos e Loja ficam com a Secretaria: ela cobra as famílias e entrega o material.
    { moduloSlug: "relacionamento", areas: ["avisos", "cronograma", "familias", "atividades", "mural", "chat", "pagamentos", "loja"] },
  ],
  Coordenacao: [
    { moduloSlug: "tasks", areas: [] },
    { moduloSlug: "flow", areas: ["equipe", "recorrencias", "formularios", "respostas"] },
    { moduloSlug: "reception", areas: ["presenca", "mapa", "visitantes"] },
    { moduloSlug: "admin", areas: ["turmas", "alunos", "responsaveis"] },
    { moduloSlug: "rh", areas: ["funcionarios", "ponto", "atestados", "afastamentos", "documentos", "relatorios"] },
    { moduloSlug: "relacionamento", areas: ["avisos", "cronograma", "familias", "atividades", "mural", "chat"] },
  ],
  // Em Fluxos, o professor leva só a área "quadro": ela dá o quadro de tarefas pessoal sem abrir
  // formulário, contrato nem caixa de envios. Lista vazia aqui abriria o módulo inteiro.
  Teacher: [
    { moduloSlug: "tasks", areas: ["chamada", "ocorrencias", "checklist", "planejamento", "materiais", "calendario"] },
    { moduloSlug: "flow", areas: ["quadro"] },
    // Professor publica só para as turmas dele (o servidor recorta), com fotos das atividades e do mural;
    // famílias e configuração são da escola.
    // O chat do professor mostra só as conversas das turmas dele (o servidor recorta).
    { moduloSlug: "relacionamento", areas: ["avisos", "cronograma", "atividades", "mural", "chat"] },
  ],
  // Gestão não tem sugestão: quem é gestão marca o módulo inteiro na tela.
  Admin: [],
};
