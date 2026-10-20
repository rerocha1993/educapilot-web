import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import type { Encaminhamento, QuemFaz, StatusDaReuniao, TipoDeEnvolvido } from "@/lib/tasks/use-reunioes-e-atendimentos";

/**
 * Dossiê do aluno (antes "resumo anual", em Ocorrências) — GET /api/Occurrence/student/{studentId}/summary?ano=.
 *
 * Tipado à mão: o Swagger gerado ainda não conhece este endpoint. Depois do deploy dá para regenerar
 * `src/lib/api/generated/tasks.d.ts` e trocar o cast por uma chamada tipada.
 *
 * Datas são texto "yyyy-MM-dd" (dia de Brasília) e horas "HH:mm". Fiquem assim até a tela: passar por
 * Date mudaria o dia conforme o fuso (use formatarSoData). Bloco nulo é bloco que o acesso de quem
 * pediu não cobre (ver `ocultos`); lista vazia é "não houve nada".
 */

export type TipoDeEventoDoResumo =
  | "Falta"
  | "Atraso"
  | "Ocorrencia"
  | "ReuniaoComPais"
  | "Reuniao"
  | "Visita"
  | "ObservacaoSemanal"
  | "Diario"
  | "Portaria";

export interface ResponsavelDoResumo {
  nome: string;
  parentesco: string | null;
  responsavelFinanceiro: boolean;
  /** Só vem para quem tem acesso ao cadastro de responsáveis. */
  telefone: string | null;
  email: string | null;
}

export interface AlunoDoResumo {
  id: number;
  nome: string;
  classId: number;
  turma: string | null;
  dataDeNascimento: string | null;
  periodoContratado: string | null;
  responsaveis: ResponsavelDoResumo[];
  /** Dia do cadastro do aluno na escola. */
  cadastradoEm: string | null;
  /** Nulo/ausente = a escola ainda não perguntou. Só "true" libera fotos do aluno. */
  autorizaUsoDeImagem?: boolean | null;
  /** Ausente para quem não tem acesso a dados de saúde (ver `ocultos`). O servidor omite o que está vazio. */
  saude?: SaudeDoAluno | null;
}

export interface SaudeDoAluno {
  alergias?: string | null;
  medicacaoContinua?: string | null;
  restricaoAlimentar?: string | null;
  convenio?: string | null;
}

export interface PeriodoDoResumo {
  ano: number;
  inicio: string;
  fim: string;
  /** O ano ainda não acabou: o período termina hoje. */
  ateHoje: boolean;
}

export interface TotaisDoResumo {
  diasLetivos: number | null;
  presencas: number | null;
  faltas: number | null;
  faltasJustificadas: number | null;
  faltasSemJustificativa: number | null;
  atrasosNaChegada: number | null;
  percentualDeFrequencia: number | null;
  ocorrencias: number | null;
  ocorrenciasComPaisAvisados: number | null;
  reunioesDaTurma: number | null;
  visitasNaPortaria: number | null;
  visitasDeResponsaveis: number | null;
  diasComAtrasoNaSaida: number | null;
  multaTotal: number | null;
  reunioesComPaisRealizadas: number | null;
  reunioesComPaisAgendadas: number | null;
  /** Combinados de reunião ainda não cumpridos, de qualquer data. */
  combinadosEmAberto: number | null;
  combinadosVencidos: number | null;
}

export interface FaltasDoMes {
  mes: number;
  nome: string;
  faltas: number;
  justificadas: number;
}

export interface FaltaDoResumo {
  data: string;
  justificada: boolean;
  motivo: string | null;
}

export interface FrequenciaDoResumo {
  diasLetivos: number;
  presencas: number;
  faltas: number;
  faltasJustificadas: number;
  faltasSemJustificativa: number;
  atrasosNaChegada: number;
  percentualDeFrequencia: number | null;
  porMes: FaltasDoMes[];
  ultimasFaltas: FaltaDoResumo[];
}

export interface OcorrenciaDoResumo {
  id: number;
  data: string;
  hora: string | null;
  categoria: string;
  observacao: string | null;
  solucao: string | null;
  paisAvisados: boolean;
}

export interface OcorrenciasDoResumo {
  total: number;
  comPaisAvisados: number;
  porCategoria: { categoria: string; total: number }[];
  itens: OcorrenciaDoResumo[];
}

export interface ObservacaoSemanalDoResumo {
  data: string;
  semanaDoMes: number | null;
  texto: string;
}

export interface ReuniaoDaTurmaDoResumo {
  data: string;
  status: string;
  /** A ata cita o nome completo do aluno. O texto da ata nunca vem. */
  citaOAluno: boolean;
}

export interface VisitaDoResumo {
  data: string;
  horaEntrada: string | null;
  horaSaida: string | null;
  visitante: string;
  motivo: string | null;
  /** O CPF ou o nome confere com um responsável cadastrado do aluno. */
  responsavelCadastrado: boolean;
}

export interface PortariaDoResumo {
  diasComRegistro: number;
  diasComAtrasoNaSaida: number;
  minutosDeAtrasoNaSaida: number;
  diasComMulta: number;
  multaTotal: number;
  multas: { data: string; minutosDeAtraso: number; valor: number }[];
}

export interface EventoDaLinhaDoTempo {
  data: string;
  hora: string | null;
  tipo: TipoDeEventoDoResumo;
  titulo: string;
  detalhe: string | null;
}

export interface PendenciaDoDossie {
  reuniaoId: string;
  dataDaReuniao: string;
  /** Assunto da reunião (antes "tipo"; o servidor pode ainda mandar o nome antigo). */
  assuntoDaReuniao?: string;
  tipoDaReuniao?: string;
  descricao: string;
  responsavel: QuemFaz;
  prazo?: string | null;
  vencido: boolean;
}

/** Uma reunião em que o aluno esteve. Os campos antigos (tipo, conduzidaPor, responsaveis) ficam opcionais. */
export interface ReuniaoDoDossie {
  id: string;
  data: string;
  hora?: string | null;
  assunto?: string;
  tipo?: string;
  status: StatusDaReuniao;
  envolvidos?: { tipo: TipoDeEnvolvido; nome: string; detalhe?: string | null }[];
  condutores?: string[];
  conduzidaPor?: string;
  responsaveis?: { nome: string }[];
  pauta?: string | null;
  conversado?: string | null;
  motivoDoCancelamento?: string | null;
  encaminhamentos: Encaminhamento[];
  /** Só para a gestão: para os demais nem vêm no JSON. */
  notaDoAssunto?: number | null;
  notaDoDesfecho?: number | null;
}

export interface ReunioesComPaisDoDossie {
  realizadas: number;
  agendadas: number;
  responsavelNaoCompareceu: number;
  canceladas: number;
  combinadosEmAberto: number;
  combinadosVencidos: number;
  pendencias: PendenciaDoDossie[];
  /** Quantas reuniões (realizadas) de cada assunto no período. */
  porAssunto?: { assunto: string; total: number }[];
  /** Média das notas das reuniões do período. Só para a gestão. */
  mediaDaNotaDoAssunto?: number | null;
  mediaDaNotaDoDesfecho?: number | null;
  /** Da mais antiga para a mais nova; traz a ata (registro interno). */
  itens: ReuniaoDoDossie[];
}

export interface ContagemPorRotulo {
  rotulo: string;
  total: number;
}

export interface DiarioDoDossie {
  diasComDiario: number;
  registrosDeAlimentacao: number;
  aceitacaoDosAlimentos: ContagemPorRotulo[];
  percentualDeBoaAceitacao: number | null;
  sonecas: number;
  minutosDeSonoPorDia: number | null;
  humor: ContagemPorRotulo[];
  registrosDeHigiene: number;
  reposicoes: number;
  registrosDeSaude: number;
  ultimosRegistrosDeSaude: { data: string; tipo: string; texto: string }[];
}

export interface ValorEQuantidade {
  quantidade: number;
  valor: number;
}

export interface FinanceiroDoDossie {
  emAberto: ValorEQuantidade;
  vencidas: ValorEQuantidade;
  maiorAtrasoEmDias: number;
  pagasNoPeriodo: ValorEQuantidade;
  emDia: boolean;
}

export interface ResumoDoAluno {
  aluno: AlunoDoResumo;
  periodo: PeriodoDoResumo;
  totais: TotaisDoResumo;
  frequencia: FrequenciaDoResumo | null;
  ocorrencias: OcorrenciasDoResumo | null;
  observacoesSemanais: ObservacaoSemanalDoResumo[] | null;
  reunioes: {
    daTurma: ReuniaoDaTurmaDoResumo[] | null;
    visitas: VisitaDoResumo[] | null;
    paisAvisados: OcorrenciaDoResumo[] | null;
  };
  portaria: PortariaDoResumo | null;
  /** Nulo sem a área "Reuniões e atendimentos". */
  reunioesComPais: ReunioesComPaisDoDossie | null;
  /** Nulo sem a área do diário. */
  diario: DiarioDoDossie | null;
  /** Nulo sem acesso a pagamentos. */
  financeiro: FinanceiroDoDossie | null;
  /** O que o sistema não registra sobre o aluno (notas, avaliação pedagógica etc.). */
  naoRegistrado: { assunto: string; explicacao: string }[];
  emitidoPor: string | null;
  linhaDoTempo: EventoDaLinhaDoTempo[];
  /** Blocos que ficaram de fora porque o acesso de quem pediu não inclui a área deles. */
  ocultos: string[];
  /** De onde vem cada bloco, em texto. */
  fontes: { bloco: string; origem: string }[];
  geradoEm: string;
}

// openapi-fetch tipa os caminhos pelo Swagger gerado; este ainda não existe lá. O cast mantém o cliente
// (token, 401) e o unwrapApiResponse, e some quando o tipo for regenerado.
type ClienteSemTipo = {
  GET: (
    caminho: string,
    opcoes: { params: { path: { studentId: number }; query?: { ano?: number } } }
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
};

export function useResumoDoAluno(studentId: number | null, ano?: number) {
  return useQuery({
    queryKey: ["resumo-do-aluno", studentId, ano ?? "atual"],
    queryFn: async () => {
      const result = await (tasksApi as unknown as ClienteSemTipo).GET(
        "/api/Occurrence/student/{studentId}/summary",
        { params: { path: { studentId: studentId! }, query: ano ? { ano } : undefined } }
      );
      const data = unwrapApiResponse(result, "Não foi possível carregar o dossiê do aluno.");
      return data as unknown as ResumoDoAluno;
    },
    enabled: studentId !== null && Number.isFinite(studentId),
    // Os números mudam a cada chamada e a cada ocorrência lançada: não vale guardar muito tempo.
    staleTime: 30_000,
    retry: false,
  });
}
