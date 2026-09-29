import type { TipoDePeriodo } from "@/lib/reception/use-portaria";

// Matrículas (2026-09): o funil de famílias que veio do CRM do Colégio. Espelha
// EducaPilot.Domain/Modules/Admissions/DTOs/FunilDtos.cs. Campos nulos podem não vir no JSON,
// por isso quase tudo é opcional.

export type EtapaDoFunil =
  | "Novo"
  | "Conversou"
  | "ChamarNovamente"
  | "VisitaAgendada"
  | "Reagendar"
  | "Visitou"
  | "Reserva"
  | "Matriculado"
  | "Perdido";

export type OrigemDoLead = "AnuncioMeta" | "Instagram" | "Indicacao" | "Google" | "Site" | "Porta" | "Outro";

export type SinalDaFamilia =
  | "QuerMatricular"
  | "AnalisandoValor"
  | "VaiFalarComFamilia"
  | "VaiVisitarOutras"
  | "EsperandoDataCerta"
  | "HorarioNaoEncaixou"
  | "AchouLonge"
  | "AchouCaro"
  | "Evasiva";

export type QuemAtende = "Assistente" | "Equipe" | "Encerrado";

export type NivelDaEspera = "Tranquilo" | "Atencao" | "Estourado";

export interface EtapaDoQuadro {
  etapa: EtapaDoFunil;
  titulo: string;
  descricao: string;
  total: number;
  aguardandoEquipe: number;
  frios: number;
}

export interface LeadResumo {
  id: string;
  nomeResponsavel: string;
  telefone: string;
  telefoneFormatado: string;
  nomeCrianca?: string | null;
  /** yyyy-MM-dd. */
  dataNascimento?: string | null;
  idadeEmMeses?: number | null;
  classId?: number | null;
  turmaNome?: string | null;
  anoLetivo?: number | null;
  periodo?: TipoDePeriodo | null;
  /** HH:mm:ss. */
  horarioPretendido?: string | null;
  origem: OrigemDoLead;
  etapa: EtapaDoFunil;
  /** UTC. */
  etapaDesde: string;
  diasNaEtapa: number;
  /** UTC. */
  visitaEm?: string | null;
  visitasReagendadas: number;
  sinal?: SinalDaFamilia | null;
  atendimento: QuemAtende;
  aguardandoEquipeDesde?: string | null;
  minutosEsperando?: number | null;
  nivelDaEspera?: NivelDaEspera | null;
  motivoRepasse?: string | null;
  frio: boolean;
  /** A família já escreveu pelo WhatsApp: há conversa para reativar. */
  temConversa?: boolean;
  /** Em Chamar novamente: quando a família vai ser chamada (UTC). Vazio depois da última tentativa. */
  retornoEm?: string | null;
  /** Em Chamar novamente pelo ciclo de 7 dias: a tentativa que vem, de tentativasDoCiclo. */
  tentativa?: number | null;
  tentativasDoCiclo?: number | null;
  anuncioId?: string | null;
  ultimaInteracaoEm?: string | null;
  criadoEm: string;
}

export interface Quadro {
  etapas: EtapaDoQuadro[];
  leads: LeadResumo[];
  esteira: LeadResumo[];
  esperaAlertaMinutos: number;
  esperaPrazoMinutos: number;
  /** A assistente de IA responde nesta escola. Desligada, o card não diz "assistente respondendo". */
  assistenteLigada: boolean;
  truncado: boolean;
}

export interface Toque {
  id: string;
  numero: number;
  agendadoPara: string;
  feitoEm?: string | null;
  canal: "WhatsApp" | "Telefone" | "Presencial" | "Outro";
  cancelado: boolean;
}

export interface EventoDoLead {
  id: string;
  tipo: string;
  /** JSON. */
  dados?: string | null;
  usuarioId?: string | null;
  criadoEm: string;
}

export interface LeadDetalhe extends LeadResumo {
  notas?: string | null;
  motivoPerda?: string | null;
  retomarEm?: string | null;
  motivoEspera?: string | null;
  retomadasEnviadas: number;
  primeiraRespostaEm?: string | null;
  consentimentoEm?: string | null;
  /** JSON do briefing da visita; o formato está em BriefingDaVisita. */
  briefingVisita?: string | null;
  briefingGeradoEm?: string | null;
  briefingDeOutraVisita: boolean;
  toques: Toque[];
  eventos: EventoDoLead[];
}

export interface SalvarLead {
  nomeResponsavel: string;
  telefone: string;
  nomeCrianca?: string | null;
  dataNascimento?: string | null;
  classId?: number | null;
  anoLetivo?: number | null;
  periodo?: TipoDePeriodo | null;
  horarioPretendido?: string | null;
  origem: OrigemDoLead;
  notas?: string | null;
  visitaEm?: string | null;
}

export interface TituloDaEtapa {
  etapa: EtapaDoFunil;
  titulo: string;
  tituloPadrao: string;
  descricao: string;
}

export interface ConfiguracaoMatriculas {
  esperaAlertaMinutos: number;
  esperaPrazoMinutos: number;
  retomadaPrimeiraHoras: number;
  retomadaSegundaHoras: number;
  retomadaTerceiraHoras: number;
  retomadaMaximo: number;
  cicloSeteDiasLigado: boolean;
  horasParaFrio: number;
  metaMensalMatriculas?: number | null;
  automacoes: AutomacoesLigadas;
  emailsDaEquipe?: string | null;
  resumoDoDia: ResumoDoDia;
  etapas: TituloDaEtapa[];
  atualizadoEm?: string | null;
}

/** O resumo do dia no WhatsApp da equipe, às 19h. */
export interface ResumoDoDia {
  ligado: boolean;
  /** Até cinco. */
  numeros: string[];
}

export interface AutomacoesLigadas {
  toquesPosVisita: boolean;
  lembretesDeVisita: boolean;
  reagendamento: boolean;
  retomada: boolean;
  reengajamento: boolean;
  briefing: boolean;
  conversoes: boolean;
}

export type ChaveDaAutomacao =
  | "toques"
  | "lembretes"
  | "reagendamento"
  | "retomada"
  | "reengajamento"
  | "briefing"
  | "alerta_de_espera"
  | "conversoes";

export interface EstadoDaAutomacao {
  chave: ChaveDaAutomacao;
  ligada: boolean;
  modelos: { nome: string; aprovado: boolean }[];
  /** O que falta para funcionar. Vazio: funcionando. */
  pendencias: string[];
  ultimoEnvioEm?: string | null;
}

export interface BriefingDaVisita {
  crianca?: { nome?: string; idade?: string; turma?: string; comoE?: string[]; saude?: string[]; historico?: string[]; gostos?: string[] };
  familia?: { responsavel?: string; quemDecide?: string; trabalho?: string; outrosFilhos?: string; localizacao?: string };
  prioridades?: string[];
  preocupacoes?: string[];
  objecoes?: string[];
  orcamentoDeclarado?: string;
  sinaisDeInseguranca?: string[];
  logistica?: { periodo?: string; prazo?: string; observacoes?: string };
  frasesLiterais?: { quem?: string; texto?: string }[];
  sugestoesParaVisita?: string[];
}

export interface SalvarConfiguracaoMatriculas
  extends Omit<ConfiguracaoMatriculas, "etapas" | "atualizadoEm"> {
  titulosDasEtapas: Partial<Record<EtapaDoFunil, string | null>>;
}

// ---------------------------------------------------------------- WhatsApp (fase 2)
// Espelha EducaPilot.Domain/Modules/Admissions/DTOs/WhatsAppDtos.cs.

export type DirecaoDaMensagem = "Recebida" | "Enviada";
export type AutorDaMensagem = "Familia" | "Equipe" | "Assistente" | "Automacao";
export type TipoDaMensagem =
  | "Texto"
  | "Imagem"
  | "Audio"
  | "Video"
  | "Documento"
  | "Localizacao"
  | "Figurinha"
  | "Modelo"
  | "Outro";
export type SituacaoDaMensagem = "Recebida" | "Enviada" | "Entregue" | "Lida" | "Falhou";
export type CategoriaDoModelo = "Utilidade" | "Marketing";
export type SituacaoDoModelo = "NaoEnviado" | "EmAnalise" | "Aprovado" | "Recusado" | "Pausado" | "Desativado";

export interface ContaWhatsApp {
  conectada: boolean;
  numeroExibido?: string | null;
  nomeVerificado?: string | null;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  usaAppProprio: boolean;
  conectadaEm?: string | null;
  ultimoErro?: string | null;
  ultimoErroEm?: string | null;
}

export interface ConectarWhatsApp {
  phoneNumberId: string;
  wabaId: string;
  token: string;
  segredoDoApp?: string | null;
}

export interface ModeloDeMensagem {
  id: string;
  nome: string;
  idioma: string;
  categoria: CategoriaDoModelo;
  corpo: string;
  variaveis: string[];
  previa: string;
  situacao: SituacaoDoModelo;
  motivoDaMeta?: string | null;
  daBiblioteca: boolean;
  mapeado: boolean;
  prontoParaEnviar: boolean;
  uso?: string | null;
}

export interface SalvarModelo {
  corpo: string;
  categoria: CategoriaDoModelo;
  variaveis: string[];
}

export interface SincronizacaoDeModelos {
  jaExistiamNaMeta: number;
  enviadosParaAprovacao: number;
  falhas: string[];
  modelos: ModeloDeMensagem[];
}

export interface ConversaResumo {
  leadId: string;
  nomeResponsavel: string;
  nomeCrianca?: string | null;
  telefoneFormatado: string;
  etapa: EtapaDoFunil;
  atendimento: QuemAtende;
  minutosEsperando?: number | null;
  nivelDaEspera?: NivelDaEspera | null;
  ultimaMensagem?: string | null;
  ultimaDirecao: DirecaoDaMensagem;
  ultimaMensagemEm: string;
  janelaFechaEm?: string | null;
}

export interface Mensagem {
  id: string;
  direcao: DirecaoDaMensagem;
  autor: AutorDaMensagem;
  tipo: TipoDaMensagem;
  texto?: string | null;
  situacao: SituacaoDaMensagem;
  erro?: string | null;
  modeloNome?: string | null;
  temArquivo: boolean;
  arquivoIndisponivel: boolean;
  midiaTipo?: string | null;
  midiaNomeArquivo?: string | null;
  enviadaPor?: string | null;
  ocorridaEm: string;
}

export interface Conversa {
  lead: LeadResumo;
  whatsAppConectado: boolean;
  janelaAberta: boolean;
  janelaFechaEm?: string | null;
  mensagens: Mensagem[];
  modelos: ModeloDeMensagem[];
}

// ------------------------------------------------------------------ assistente (fase 3)

export type UsoDoMes = {
  respostas: number;
  paraAEquipe: number;
  tokensDeEntrada: number;
  tokensDeSaida: number;
  tokensDeCacheLidos: number;
  tokensDeCacheEscritos: number;
};

export type Assistente = {
  ligada: boolean;
  atendimentoInicio: number;
  atendimentoFim: number;
  esperaParaJuntarSegundos: number;
  limiteMensalDeRespostas: number | null;
  /** O que impede de ligar. Vazio: pode ligar. */
  pendencias: string[];
  whatsAppConectado: boolean;
  fichaPreenchida: boolean;
  servicoDisponivel: boolean;
  perguntasEmAberto: number;
  usoDoMes: UsoDoMes;
};

export type SalvarAjustesDaAssistente = {
  ligada: boolean;
  atendimentoInicio: number;
  atendimentoFim: number;
  esperaParaJuntarSegundos: number;
};

export type CriterioDaTurma = "idade_em_meses" | "corte";

export type TurmaDaFicha = {
  nome: string;
  criterio: CriterioDaTurma;
  mesesMinimo: number | null;
  mesesMaximo: number | null;
  idadeNoCorte: number | null;
  grupo: string | null;
  comoApresentar: string | null;
  classId: number | null;
};

export type BlocoDaFicha = { titulo: string; texto: string };

export type FichaDaEscola = {
  nomeDaAssistente: string;
  nomeDaEscola: string;
  nomeCurto: string | null;
  descricao: string;
  endereco: string | null;
  quemRecebeNaVisita: string | null;
  comoEAVisita: string | null;
  emailParaAssuntosDeFora: string | null;
  sobreAEscola: string | null;
  provaSocial: string | null;
  diaDoCorte: number;
  mesDoCorte: number;
  turmas: TurmaDaFicha[];
  fatos: BlocoDaFicha[];
  respostas: BlocoDaFicha[];
  naoSabe: string[];
  atualizadoEm: string | null;
};

export type TelaDaFicha = {
  ficha: FichaDaEscola | null;
  sugestao: FichaDaEscola;
  turmasDoCadastro: { id: number; nome: string }[];
};

export type PerguntaSemResposta = {
  id: string;
  leadId: string | null;
  nomeDaFamilia: string | null;
  pergunta: string;
  resposta: string | null;
  respondidaEm: string | null;
  descartada: boolean;
  criadaEm: string;
};

export type TurnoDeTeste = { daFamilia: boolean; texto: string };

export type RespostaDeTeste = {
  ok: boolean;
  baloes: string[];
  erro: string | null;
  ferramentas: string[];
  efeitos: string[];
  ajustesDeEstilo: string[];
};

// ------------------------------------------------------------------ agenda e materiais (fase 5)

export interface JanelaDeVisita {
  nome: string;
  inicio: number;
  fim: number;
  vagas: number;
}

export interface DiaSemVisita {
  /** "MM-dd" repete todo ano; "yyyy-MM-dd" é um dia só. */
  data: string;
  nome: string;
}

export interface AgendaDeVisitas {
  configurada: boolean;
  /** 0 = domingo. */
  dias: number[];
  janelas: JanelaDeVisita[];
  diasSemVisita: DiaSemVisita[];
  antecedenciaHoras: number;
  horizonteDias: number;
  proximasVisitas: { leadId: string; nomeResponsavel: string; nomeCrianca?: string | null; turmaNome?: string | null; visitaEm: string }[];
  horariosLivres: string[];
}

export type SalvarAgendaDeVisitas = Pick<AgendaDeVisitas, "dias" | "janelas" | "diasSemVisita" | "antecedenciaHoras" | "horizonteDias">;

export type TipoDeMaterial = "TabelaDePreco" | "Apresentacao" | "Video" | "Fotos" | "Atividades" | "Adaptacao" | "Outro";
export type GatilhoDoMaterial = "Inseguranca" | "PediuPrecos" | "DuvidaDeRotina" | "DuvidaDeAdaptacao" | "Sempre";

export interface Material {
  id: string;
  tipo: TipoDeMaterial;
  titulo: string;
  legenda?: string | null;
  turmas: string[];
  pasta?: string | null;
  gatilho?: GatilhoDoMaterial | null;
  ano?: number | null;
  url?: string | null;
  nomeOriginal?: string | null;
  tipoDoArquivo?: string | null;
  tamanhoBytes?: number | null;
  ativo: boolean;
  enviosFeitos: number;
  criadoEm: string;
}

// ------------------------------------------------------------------ Meta Ads (fase 6)

export interface OpcaoDaMeta {
  id: string;
  nome: string;
}

export interface ContaMetaAds {
  disponivel: boolean;
  conectada: boolean;
  paginaId?: string | null;
  paginaNome?: string | null;
  contaDeAnunciosId?: string | null;
  contaDeAnunciosNome?: string | null;
  leadAdsInscrito: boolean;
  conectadaEm?: string | null;
  ultimoErro?: string | null;
  paginas: OpcaoDaMeta[];
  contasDeAnuncios: OpcaoDaMeta[];
}

export interface ResultadoDoAnuncio {
  anuncioId: string;
  anuncio?: string | null;
  conjunto?: string | null;
  campanha?: string | null;
  gasto: number;
  familias: number;
  visitas: number;
  matriculas: number;
  custoPorFamilia?: number | null;
  custoPorMatricula?: number | null;
  /** Como a Meta entrega: ACTIVE, PAUSED, CAMPAIGN_PAUSED... */
  situacao?: string | null;
  noAr: boolean;
}

export interface ResultadosDosAnuncios {
  dias: number;
  gasto: number;
  familias: number;
  visitas: number;
  matriculas: number;
  custoPorMatricula?: number | null;
  anuncios: ResultadoDoAnuncio[];
  aviso?: string | null;
}

// ------------------------------------------------------------------ cadastro guiado (fase 7)

export interface PassoDoCadastro {
  chave: string;
  titulo: string;
  descricao: string;
  situacao: "feito" | "pendente" | "opcional";
  detalhe?: string | null;
  caminho: string;
  obrigatorio: boolean;
}

export interface PrimeirosPassos {
  passos: PassoDoCadastro[];
  feitos: number;
  obrigatorios: number;
  pronta: boolean;
  assistenteLigada: boolean;
}
