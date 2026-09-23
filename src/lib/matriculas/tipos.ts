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
