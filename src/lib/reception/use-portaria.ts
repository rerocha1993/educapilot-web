import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mensagemDeErro, portariaFetch, portariaJson } from "./api";

// Portaria (2026-09): chegada e saída dos alunos com multa, períodos, visitantes com foto,
// relatórios e configuração da escola. Campos nulos não vêm no JSON (o backend omite), por isso
// quase tudo é opcional aqui.

// ------------------------------------------------------------------ visitantes

export interface Visitante {
  id: string;
  nome: string;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;
  temFoto: boolean;
  /** Visita em andamento, quando a pessoa está na escola agora. */
  visitaAbertaId?: string | null;
}

export interface SalvarVisitante {
  nome: string;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface Visita {
  id: string;
  visitanteId: string;
  visitanteNome: string;
  visitanteCpf?: string | null;
  visitanteTemFoto: boolean;
  motivo?: string | null;
  studentId?: number | null;
  alunoNome?: string | null;
  classId?: number | null;
  turmaNome?: string | null;
  /** UTC. */
  entradaEm: string;
  saidaEm?: string | null;
  duracaoMinutos: number;
}

export interface RelatorioVisitas {
  total: number;
  emAndamento: number;
  encerradas: number;
  visitantesDistintos: number;
  comAluno: number;
  duracaoMediaMinutos?: number | null;
  visitas: Visita[];
}

export type Situacao = "" | "abertas" | "encerradas";

export interface FiltroRelatorio {
  /** yyyy-MM-dd, dia de Brasília. */
  de: string;
  ate: string;
  situacao: Situacao;
  classId: number | null;
  busca: string;
}

// ------------------------------------------------------------------ períodos e presença

export type TipoDePeriodo = "Integral" | "MeioPeriodoManha" | "MeioPeriodoTarde" | "SeisHoras" | "OitoHoras" | "DezHoras";
export type OrientacaoDoPeriodo = "Entrada" | "Saida";

export interface PeriodoDoAluno {
  studentId: number;
  alunoNome: string;
  classId: number;
  turmaNome?: string | null;
  tipo?: TipoDePeriodo | null;
  orientacao?: OrientacaoDoPeriodo | null;
  horarioReferencia?: string | null;
  entradaPrevista?: string | null;
  saidaPrevista?: string | null;
}

export interface DefinirPeriodo {
  tipo: TipoDePeriodo | null;
  orientacao?: OrientacaoDoPeriodo | null;
  horarioReferencia?: string | null;
}

export interface ResponsavelACaminho {
  nome: string;
  situacao: "ACaminho" | "Chegando" | "Chegou";
  finalidade: "Entrega" | "Retirada";
  distanciaMetros?: number | null;
}

export interface PresencaDoAluno {
  studentId: number;
  alunoNome: string;
  classId: number;
  turmaNome?: string | null;
  periodo?: TipoDePeriodo | null;
  entradaPrevista?: string | null;
  saidaPrevista?: string | null;
  chegadaEm?: string | null;
  chegadaOrigem?: "Manual" | "Automatica" | null;
  saidaEm?: string | null;
  retiradoPor?: string | null;
  minutosAtraso: number;
  horasMulta: number;
  horasMultaDobrada: number;
  valorMulta: number;
  situacao: "aguardando" | "na-escola" | "saiu";
  responsavelACaminho?: ResponsavelACaminho | null;
}

export interface PresencasDoDia {
  data: string;
  total: number;
  chegaram: number;
  naEscola: number;
  sairam: number;
  comMulta: number;
  valorMultas: number;
  alunos: PresencaDoAluno[];
}

export interface LinhaDeMulta {
  data: string;
  studentId: number;
  alunoNome: string;
  turmaNome?: string | null;
  saidaPrevista?: string | null;
  saidaEm?: string | null;
  retiradoPor?: string | null;
  minutosAtraso: number;
  horasMulta: number;
  horasMultaDobrada: number;
  valorMulta: number;
}

export interface RelatorioDeMultas {
  total: number;
  ocorrencias: number;
  linhas: LinhaDeMulta[];
}

export interface ConfiguracaoPortaria {
  escolaNome: string;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  complemento?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  raioChegandoMetros: number;
  raioChegouMetros: number;
  manhaEntrada: string;
  manhaSaida: string;
  tardeEntrada: string;
  tardeSaida: string;
  integralEntrada: string;
  integralSaida: string;
  toleranciaAtrasoMinutos: number;
  valorHoraMulta: number;
  inicioMultaDobrada: string;
  aviso?: string | null;
}

export type SalvarConfiguracaoPortaria = Omit<ConfiguracaoPortaria, "escolaNome" | "aviso"> & {
  localizarPeloEndereco: boolean;
};

const CHAVE = "portaria";

// ------------------------------------------------------------------ hooks: visitantes

export function useVisitasEmAndamento() {
  return useQuery({
    queryKey: [CHAVE, "em-andamento"],
    // Mais de uma pessoa pode estar na portaria: atualiza sozinho para ninguém fechar uma visita
    // que a colega já fechou.
    refetchInterval: 60_000,
    queryFn: () =>
      portariaJson<Visita[]>("/visitas/em-andamento", {}, "Não foi possível carregar quem está na escola."),
  });
}

export function useBuscarVisitantes(busca: string, enabled = true) {
  return useQuery({
    queryKey: [CHAVE, "visitantes", busca],
    enabled,
    queryFn: () =>
      portariaJson<Visitante[]>(
        `/visitantes?busca=${encodeURIComponent(busca)}`,
        {},
        "Não foi possível buscar os visitantes."
      ),
  });
}

export function useCadastrarVisitante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: SalvarVisitante) =>
      portariaJson<Visitante>(
        "/visitantes",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível cadastrar o visitante."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "visitantes"] }),
  });
}

export function useAtualizarVisitante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: SalvarVisitante }) =>
      portariaJson<Visitante>(
        `/visitantes/${id}`,
        { method: "PUT", body: JSON.stringify(dados) },
        "Não foi possível salvar o visitante."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useEnviarFotoVisitante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, arquivo }: { id: string; arquivo: File }) => {
      const formData = new FormData();
      formData.append("file", arquivo);
      const res = await portariaFetch(`/visitantes/${id}/foto`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível enviar a foto."));
    },
    onSuccess: (_d, { id }) => {
      queryClient.invalidateQueries({ queryKey: [CHAVE, "foto", id] });
      queryClient.invalidateQueries({ queryKey: [CHAVE, "visitantes"] });
      queryClient.invalidateQueries({ queryKey: [CHAVE, "em-andamento"] });
    },
  });
}

/**
 * A foto como data URL, pronta para o <img>.
 *
 * A foto vem por endpoint autenticado (é rosto de uma pessoa), então a URL da API não serve direto
 * no <img>. Data URL em vez de URL de Blob: não precisa ser revogada, e some da memória junto com o
 * cache — são fotos de 720px, pequenas.
 */
export function useFotoVisitante(id: string, temFoto: boolean) {
  return useQuery({
    queryKey: [CHAVE, "foto", id],
    enabled: temFoto,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await portariaFetch(`/visitantes/${id}/foto`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result as string);
        leitor.onerror = () => reject(leitor.error);
        leitor.readAsDataURL(blob);
      });
    },
  });
}

export function useRegistrarEntrada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { visitanteId: string; motivo?: string | null; studentId?: number | null; classId?: number | null }) =>
      portariaJson<Visita>(
        "/visitas/entrada",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível registrar a entrada."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useRegistrarSaida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitaId: string) =>
      portariaJson<Visita>(`/visitas/${visitaId}/saida`, { method: "POST" }, "Não foi possível registrar a saída."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useRelatorioVisitas(filtro: FiltroRelatorio) {
  return useQuery({
    queryKey: [CHAVE, "relatorio", filtro],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtro.de) params.set("De", filtro.de);
      if (filtro.ate) params.set("Ate", filtro.ate);
      if (filtro.situacao) params.set("Situacao", filtro.situacao);
      if (filtro.classId) params.set("ClassId", String(filtro.classId));
      if (filtro.busca.trim()) params.set("Busca", filtro.busca.trim());
      return portariaJson<RelatorioVisitas>(`/relatorio?${params}`, {}, "Não foi possível gerar o relatório.");
    },
  });
}

// ------------------------------------------------------------------ hooks: presença do dia

export function usePresencasDoDia(classId: number | null) {
  return useQuery({
    queryKey: [CHAVE, "presencas", classId],
    // A chegada pelo celular do responsável aparece sem ninguém recarregar a tela.
    refetchInterval: 20_000,
    queryFn: () =>
      portariaJson<PresencasDoDia>(
        `/presencas${classId ? `?classId=${classId}` : ""}`,
        {},
        "Não foi possível carregar a chegada e a saída dos alunos."
      ),
  });
}

export function useRegistrarChegada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: number) =>
      portariaJson<PresencaDoAluno>(`/presencas/${studentId}/chegada`, { method: "POST" }, "Não foi possível registrar a chegada."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "presencas"] }),
  });
}

export function useRegistrarSaidaDoAluno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, retiradoPor }: { studentId: number; retiradoPor: string }) =>
      portariaJson<PresencaDoAluno>(
        `/presencas/${studentId}/saida`,
        { method: "POST", body: JSON.stringify({ retiradoPor: retiradoPor || null }) },
        "Não foi possível registrar a saída."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "presencas"] }),
  });
}

export function useDesfazerRegistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, etapa }: { studentId: number; etapa: "chegada" | "saida" }) =>
      portariaJson<PresencaDoAluno>(
        `/presencas/${studentId}/desfazer`,
        { method: "POST", body: JSON.stringify({ etapa }) },
        "Não foi possível desfazer."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "presencas"] }),
  });
}

export function useRelatorioDeMultas(filtro: { de: string; ate: string; classId: number | null }) {
  return useQuery({
    queryKey: [CHAVE, "multas", filtro],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtro.de) params.set("de", filtro.de);
      if (filtro.ate) params.set("ate", filtro.ate);
      if (filtro.classId) params.set("classId", String(filtro.classId));
      return portariaJson<RelatorioDeMultas>(`/multas?${params}`, {}, "Não foi possível gerar o relatório de multas.");
    },
  });
}

// ------------------------------------------------------------------ hooks: períodos

export function usePeriodos(classId: number | null, enabled = true) {
  return useQuery({
    queryKey: [CHAVE, "periodos", classId],
    enabled,
    queryFn: () =>
      portariaJson<PeriodoDoAluno[]>(
        `/periodos${classId ? `?classId=${classId}` : ""}`,
        {},
        "Não foi possível carregar os períodos."
      ),
  });
}

export function usePeriodoDoAluno(studentId: number | null, enabled = true) {
  return useQuery({
    queryKey: [CHAVE, "periodos", "aluno", studentId],
    enabled: enabled && studentId !== null,
    queryFn: () => portariaJson<PeriodoDoAluno>(`/periodos/${studentId}`, {}, "Não foi possível carregar o período do aluno."),
  });
}

export function useDefinirPeriodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, periodo }: { studentId: number; periodo: DefinirPeriodo }) =>
      portariaJson<PeriodoDoAluno>(
        `/periodos/${studentId}`,
        { method: "PUT", body: JSON.stringify(periodo) },
        "Não foi possível salvar o período."
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHAVE, "periodos"] });
      queryClient.invalidateQueries({ queryKey: [CHAVE, "presencas"] });
    },
  });
}

// ------------------------------------------------------------------ hooks: configuração

export function useConfiguracaoPortaria(enabled = true) {
  return useQuery({
    queryKey: [CHAVE, "configuracao"],
    enabled,
    queryFn: () => portariaJson<ConfiguracaoPortaria>("/configuracao", {}, "Não foi possível carregar a configuração."),
  });
}

export function useSalvarConfiguracaoPortaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: SalvarConfiguracaoPortaria) =>
      portariaJson<ConfiguracaoPortaria>(
        "/configuracao",
        { method: "PUT", body: JSON.stringify(dados) },
        "Não foi possível salvar a configuração."
      ),
    onSuccess: (salva) => {
      queryClient.setQueryData([CHAVE, "configuracao"], salva);
      queryClient.invalidateQueries({ queryKey: [CHAVE, "periodos"] });
      queryClient.invalidateQueries({ queryKey: [CHAVE, "presencas"] });
    },
  });
}
