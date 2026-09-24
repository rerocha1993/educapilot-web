import type { TipoDePeriodo } from "@/lib/reception/use-portaria";

// Matrículas (2026-09): o funil de famílias que veio do CRM do Colégio. Espelha
// EducaPilot.Domain/Modules/Admissions/DTOs/FunilDtos.cs. Campos nulos podem não vir no JSON,
// por isso quase tudo é opcional.

export type EtapaDoFunil =
  | "Novo"
  | "Conversou"
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
  etapas: TituloDaEtapa[];
  atualizadoEm?: string | null;
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
