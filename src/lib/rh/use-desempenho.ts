import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rhDownload, rhJson, rhUpload } from "./api";

/**
 * Desempenho e feedback do RH (2026-10) — /api/Rh/desempenho, área `rh:desempenho`.
 *
 * É dado sensível de trabalhador: só direção/RH enxerga, e a nota é apoio à decisão, não decisão
 * automatizada (LGPD, art. 20). Tipado à mão, como o resto do RH (ver api.ts). Datas "yyyy-MM-dd".
 */

const CHAVE = "rh-desempenho";

const busca = (params: Record<string, string | number | null | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") q.set(k, String(v));
  const texto = q.toString();
  return texto ? `?${texto}` : "";
};

// ------------------------------------------------------------------ vocabulário

export const COMPONENTES = [
  "Avaliacao",
  "Assiduidade",
  "Pontualidade",
  "Tarefas",
  "Demandas",
  "Ocorrencias",
  "Advertencias",
  "Reunioes",
] as const;

/**
 * Descrição do componente Reuniões, para o caso de o servidor ainda não mandá-lo na lista de componentes: a
 * configuração mostra o peso de qualquer jeito. O texto é o do contrato.
 */
export const COMPONENTE_DE_REUNIOES = {
  chave: "Reunioes",
  nome: "Reuniões e atendimentos",
  descricao:
    "Média das notas (assunto e desfecho) das reuniões em que a pessoa esteve. Advertência verbal conta em Advertências.",
  pesoPadrao: 10,
} as const;

export const TIPOS_DE_ADVERTENCIA = ["Verbal", "Escrita", "Suspensao"] as const;
export const ROTULO_DA_ADVERTENCIA: Record<string, string> = { Verbal: "Verbal", Escrita: "Escrita", Suspensao: "Suspensão" };

export const GRAVIDADES = ["Leve", "Moderada", "Grave"] as const;

export const TIPOS_DE_MARCO = ["Admissao", "Promocao", "MudancaDeCargo", "Curso", "Certificacao", "Outro"] as const;
export const ROTULO_DO_MARCO: Record<string, string> = {
  Admissao: "Admissão",
  Promocao: "Promoção",
  MudancaDeCargo: "Mudança de cargo",
  Curso: "Curso",
  Certificacao: "Certificação",
  Outro: "Outro",
};

export const TIPOS_DA_LINHA_DO_TEMPO = [
  "Admissao",
  "Marco",
  "Avaliacao",
  "Advertencia",
  "Reconhecimento",
  "Afastamento",
  "Reuniao",
] as const;
export const ROTULO_DA_LINHA_DO_TEMPO: Record<string, string> = {
  Admissao: "Admissão",
  Marco: "Marcos",
  Avaliacao: "Avaliações",
  Advertencia: "Advertências",
  Reconhecimento: "Reconhecimentos",
  Afastamento: "Afastamentos",
  Reuniao: "Reuniões",
};

export const JANELAS = ["AnoLetivo", "Ciclo", "Ultimos12Meses"] as const;
export const ROTULO_DA_JANELA: Record<string, string> = {
  AnoLetivo: "Ano letivo corrente",
  Ciclo: "Ciclo de avaliação",
  Ultimos12Meses: "Últimos 12 meses",
};

// ------------------------------------------------------------------ tipos

export interface ComponenteDaNota {
  chave: string;
  nome: string;
  incluido: boolean;
  dado: string;
  nota: number | null;
  pesoConfigurado: number;
  pesoEfetivo: number;
  contribuicao: number;
  motivo: string | null;
  aviso: string | null;
}

export interface NotaDeDesempenho {
  funcionarioId: string;
  nota: number | null;
  faixa: string | null;
  bonus: number;
  componentes: ComponenteDaNota[];
  avisos: string[];
  de: string;
  ate: string;
  diasDeVinculo: number;
  poucosDados: boolean;
  apoioADecisao: string;
}

export interface Faixa {
  nome: string;
  minimo: number;
}

export interface DescricaoDoComponente {
  chave: string;
  nome: string;
  descricao: string;
  pesoPadrao: number;
}

export interface ConfiguracaoDeDesempenho {
  pesos: Record<string, number>;
  faixas: Faixa[];
  janela: string;
  toleranciaDeAtrasoMinutosPorMes: number;
  pontosPorHoraDeAtraso: number;
  meiaVidaDaAdvertenciaDias: number;
  bonusMaximoDeReconhecimentos: number;
  diasMinimosDeVinculo: number;
  componentes: DescricaoDoComponente[];
}

export interface Ciclo {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  status: "Aberto" | "Encerrado" | string;
  formularioId: string;
  formularioNome: string | null;
  avaliacoesConcluidas: number;
  encerradoEm: string | null;
}

export interface LinhaDoDesempenho {
  funcionarioId: string;
  nome: string;
  cargo: string;
  departamento: string | null;
  nota: number | null;
  faixa: string | null;
  variacao: number | null;
  anterior: number | null;
  evolucao: number[];
  componenteMaisBaixo: string | null;
  componenteMaisBaixoNota: number | null;
  avaliacaoNoCiclo: "SemAvaliacao" | "Rascunho" | "Concluida" | null;
  poucosDados: boolean;
}

export interface DesempenhoDaEquipe {
  de: string;
  ate: string;
  janela: string;
  ciclo: Ciclo | null;
  mediaDaEscola: number | null;
  semNota: number;
  semAvaliacaoNoCiclo: number;
  distribuicao: { faixa: string; quantidade: number }[];
  faixas: string[];
  linhas: LinhaDoDesempenho[];
  apoioADecisao: string;
}

export interface PontoDaEvolucao {
  referencia: string;
  rotulo: string;
  data: string;
  nota: number;
  faixa: string;
  provisoria: boolean;
}

export interface Marcador {
  tipo: "Advertencia" | "Reconhecimento" | "Marco" | string;
  data: string;
  titulo: string;
}

export interface AvaliacaoResumo {
  id: string;
  cicloId: string;
  cicloNome: string;
  tipo: "Gestor" | "Auto" | string;
  status: "Rascunho" | "Concluida" | string;
  nota100: number | null;
  notaGeral: number | null;
  concluidaEm: string | null;
  avaliadorNome: string | null;
  compartilhada: boolean;
  temContestacao: boolean;
}

export interface DesempenhoDoFuncionario {
  funcionarioId: string;
  nome: string;
  cargo: string;
  nota: NotaDeDesempenho;
  variacao: number | null;
  evolucao: PontoDaEvolucao[];
  marcadores: Marcador[];
  avaliacoes: AvaliacaoResumo[];
  cicloAberto: Ciclo | null;
}

export interface Pergunta {
  id?: string | null;
  grupo: string;
  texto: string;
  tipo: "Nota" | "Texto" | string;
  peso: number;
  obrigatoria: boolean;
  ordem: number;
  ancoras: string[];
  paraFuncao: string | null;
}

export interface PerguntaRespondida extends Pergunta {
  notaDada: number | null;
  textoDado: string | null;
}

export interface Formulario {
  id: string;
  nome: string;
  versao: number;
  ativo: boolean;
  publicoAlvoCargo: string | null;
  padrao: boolean;
  emUso: boolean;
  perguntas: Pergunta[];
}

export interface Avaliacao {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  cicloId: string;
  cicloNome: string;
  formularioId: string;
  tipo: "Gestor" | "Auto" | string;
  status: "Rascunho" | "Concluida" | string;
  avaliadorNome: string | null;
  concluidaEm: string | null;
  notaGeral: number | null;
  nota100: number | null;
  compartilhada: boolean;
  contestacao: string | null;
  contestacaoEm: string | null;
  reaberturas: number;
  reabertaEm: string | null;
  motivoDaReabertura: string | null;
  respondidas: number;
  totalDePerguntas: number;
  perguntas: PerguntaRespondida[];
}

export interface Resposta {
  perguntaId: string;
  nota?: number | null;
  texto?: string | null;
}

export interface Comparacao {
  cicloId: string;
  cicloNome: string;
  notaGestor: number | null;
  notaAuto: number | null;
  grupos: { grupo: string; gestor: number | null; auto: number | null }[];
}

export interface Advertencia {
  id: string;
  funcionarioId: string;
  data: string;
  tipo: string;
  gravidade: string;
  motivo: string;
  temArquivo: boolean;
  arquivoNome: string | null;
  registradaPorNome: string | null;
  /** Veio de uma reunião de advertência verbal: some se a reunião for cancelada. O servidor omite o nulo. */
  reuniaoId?: string | null;
}

export interface Reconhecimento {
  id: string;
  funcionarioId: string;
  data: string;
  titulo: string;
  descricao: string | null;
  pontos: number | null;
}

export interface Marco {
  id: string;
  funcionarioId: string;
  data: string;
  tipo: string;
  descricao: string;
}

export interface ItemDaLinhaDoTempo {
  data: string;
  tipo: string;
  titulo: string;
  detalhe: string | null;
  id: string | null;
  fim: string | null;
}

export interface Fechamento {
  referencia: string;
  gravados: number;
  semNota: number;
}

// ------------------------------------------------------------------ nota, equipe e configuração

export function useDesempenhoDaEquipe(filtros: { cargo?: string; departamento?: string; faixa?: string; cicloId?: string }) {
  return useQuery({
    queryKey: [CHAVE, "equipe", filtros],
    queryFn: () =>
      rhJson<DesempenhoDaEquipe>(
        `/desempenho/equipe${busca(filtros)}`,
        {},
        "Não foi possível carregar o desempenho da equipe."
      ),
  });
}

export function useDesempenhoDoFuncionario(id: string) {
  return useQuery({
    queryKey: [CHAVE, "funcionario", id],
    enabled: !!id,
    queryFn: () =>
      rhJson<DesempenhoDoFuncionario>(
        `/desempenho/funcionarios/${id}`,
        {},
        "Não foi possível carregar o desempenho do funcionário."
      ),
  });
}

export function useConfiguracaoDeDesempenho(habilitada = true) {
  return useQuery({
    queryKey: [CHAVE, "configuracao"],
    enabled: habilitada,
    queryFn: () =>
      rhJson<ConfiguracaoDeDesempenho>(
        "/desempenho/configuracao",
        {},
        "Não foi possível carregar a configuração do desempenho."
      ),
  });
}

export function useSalvarConfiguracaoDeDesempenho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: Omit<ConfiguracaoDeDesempenho, "componentes">) =>
      rhJson<ConfiguracaoDeDesempenho>(
        "/desempenho/configuracao",
        { method: "PUT", body: JSON.stringify(dados) },
        "Não foi possível salvar a configuração."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

/** Prévia do efeito da configuração na nota de um funcionário, sem gravar. */
export function usePreviaDaNota() {
  return useMutation({
    mutationFn: ({ funcionarioId, dados }: { funcionarioId: string; dados: Omit<ConfiguracaoDeDesempenho, "componentes"> }) =>
      rhJson<NotaDeDesempenho>(
        `/desempenho/funcionarios/${funcionarioId}/previa`,
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível calcular a prévia."
      ),
  });
}

export function useFecharMes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mes?: string) =>
      rhJson<Fechamento>(
        "/desempenho/fechar-mes",
        { method: "POST", body: JSON.stringify({ mes: mes ?? null }) },
        "Não foi possível fechar o mês."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ ciclos e formulários

export function useCiclos() {
  return useQuery({
    queryKey: [CHAVE, "ciclos"],
    queryFn: () => rhJson<Ciclo[]>("/desempenho/ciclos", {}, "Não foi possível carregar os ciclos."),
  });
}

export function useCriarCiclo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { nome: string; inicio: string; fim: string; formularioId?: string | null }) =>
      rhJson<Ciclo>("/desempenho/ciclos", { method: "POST", body: JSON.stringify(dados) }, "Não foi possível abrir o ciclo."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useEncerrarCiclo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<Fechamento>(`/desempenho/ciclos/${id}/encerrar`, { method: "POST" }, "Não foi possível encerrar o ciclo."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useFormularios() {
  return useQuery({
    queryKey: [CHAVE, "formularios"],
    queryFn: () => rhJson<Formulario[]>("/desempenho/formularios", {}, "Não foi possível carregar os formulários."),
  });
}

export function useFormulario(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "formulario", id],
    enabled: !!id,
    queryFn: () => rhJson<Formulario>(`/desempenho/formularios/${id}`, {}, "Não foi possível carregar o formulário."),
  });
}

export interface FormularioParaSalvar {
  nome: string;
  publicoAlvoCargo: string | null;
  ativo: boolean;
  perguntas: Pergunta[];
}

export function useSalvarFormulario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: FormularioParaSalvar }) =>
      rhJson<Formulario>(
        id ? `/desempenho/formularios/${id}` : "/desempenho/formularios",
        { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
        "Não foi possível salvar o formulário."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ avaliações

export function useAvaliacao(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "avaliacao", id],
    enabled: !!id,
    queryFn: () => rhJson<Avaliacao>(`/desempenho/avaliacoes/${id}`, {}, "Não foi possível carregar a avaliação."),
  });
}

export function useIniciarAvaliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { funcionarioId: string; cicloId?: string | null }) =>
      rhJson<Avaliacao>(
        "/desempenho/avaliacoes",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível abrir o feedback."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

/** Salvamento do rascunho: não invalida a lista para a tela não piscar a cada autosave. */
export function useSalvarAvaliacao() {
  return useMutation({
    mutationFn: ({ id, respostas }: { id: string; respostas: Resposta[] }) =>
      rhJson<Avaliacao>(
        `/desempenho/avaliacoes/${id}`,
        { method: "PUT", body: JSON.stringify({ respostas }) },
        "Não foi possível salvar o rascunho."
      ),
  });
}

function acaoDeAvaliacao(caminho: string, falha: string) {
  return function useAcao() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, corpo }: { id: string; corpo?: unknown }) =>
        rhJson<Avaliacao>(
          `/desempenho/avaliacoes/${id}/${caminho}`,
          { method: "POST", body: JSON.stringify(corpo ?? {}) },
          falha
        ),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
    });
  };
}

export const useConcluirAvaliacao = acaoDeAvaliacao("concluir", "Não foi possível concluir o feedback.");
export const useReabrirAvaliacao = acaoDeAvaliacao("reabrir", "Não foi possível reabrir o feedback.");
export const useCompartilharAvaliacao = acaoDeAvaliacao("compartilhar", "Não foi possível alterar o compartilhamento.");

export function useComparacao(funcionarioId: string, cicloId?: string) {
  return useQuery({
    queryKey: [CHAVE, "comparacao", funcionarioId, cicloId ?? "atual"],
    enabled: !!funcionarioId,
    queryFn: () =>
      rhJson<Comparacao>(
        `/desempenho/funcionarios/${funcionarioId}/comparacao${busca({ cicloId })}`,
        {},
        "Não foi possível comparar as avaliações."
      ),
    retry: false,
  });
}

// ------------------------------------------------------------------ trajetória

export function useLinhaDoTempo(funcionarioId: string, tipos: string[], ano: number | null) {
  return useQuery({
    queryKey: [CHAVE, "linha-do-tempo", funcionarioId, tipos, ano],
    enabled: !!funcionarioId,
    queryFn: () =>
      rhJson<ItemDaLinhaDoTempo[]>(
        `/desempenho/funcionarios/${funcionarioId}/linha-do-tempo${busca({ tipos: tipos.join(","), ano })}`,
        {},
        "Não foi possível carregar a linha do tempo."
      ),
  });
}

export function useAdvertencias(funcionarioId: string) {
  return useQuery({
    queryKey: [CHAVE, "advertencias", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: () =>
      rhJson<Advertencia[]>(
        `/desempenho/trajetoria/advertencias${busca({ funcionarioId })}`,
        {},
        "Não foi possível carregar as advertências."
      ),
  });
}

export function useRegistrarAdvertencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: {
      funcionarioId: string;
      data: string;
      tipo: string;
      gravidade: string;
      motivo: string;
      arquivo: File | null;
    }) =>
      rhUpload<Advertencia>(
        "/desempenho/trajetoria/advertencias",
        { ...dados, arquivo: dados.arquivo },
        "Não foi possível registrar a advertência."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function baixarArquivoDaAdvertencia(a: Advertencia) {
  return rhDownload(
    `/desempenho/trajetoria/advertencias/${a.id}/arquivo`,
    a.arquivoNome ?? "advertencia",
    "Não foi possível baixar o arquivo."
  );
}

function useExcluirDaTrajetoria(rota: string, falha: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rhJson<void>(`/desempenho/trajetoria/${rota}/${id}`, { method: "DELETE" }, falha),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export const useExcluirAdvertencia = () => useExcluirDaTrajetoria("advertencias", "Não foi possível excluir a advertência.");
export const useExcluirReconhecimento = () => useExcluirDaTrajetoria("reconhecimentos", "Não foi possível excluir o reconhecimento.");
export const useExcluirMarco = () => useExcluirDaTrajetoria("marcos", "Não foi possível excluir o marco.");

export function useReconhecimentos(funcionarioId: string) {
  return useQuery({
    queryKey: [CHAVE, "reconhecimentos", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: () =>
      rhJson<Reconhecimento[]>(
        `/desempenho/trajetoria/reconhecimentos${busca({ funcionarioId })}`,
        {},
        "Não foi possível carregar os reconhecimentos."
      ),
  });
}

export function useRegistrarReconhecimento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { funcionarioId: string; data: string; titulo: string; descricao: string | null; pontos: number | null }) =>
      rhJson<Reconhecimento>(
        "/desempenho/trajetoria/reconhecimentos",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível registrar o reconhecimento."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useMarcos(funcionarioId: string) {
  return useQuery({
    queryKey: [CHAVE, "marcos", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: () =>
      rhJson<Marco[]>(
        `/desempenho/trajetoria/marcos${busca({ funcionarioId })}`,
        {},
        "Não foi possível carregar os marcos."
      ),
  });
}

export function useRegistrarMarco() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { funcionarioId: string; data: string; tipo: string; descricao: string }) =>
      rhJson<Marco>(
        "/desempenho/trajetoria/marcos",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível registrar o marco."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ formatação

/** Nota 0–100 com uma casa, no padrão brasileiro ("82,5"). */
export function formatarNota(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

export function formatarVariacao(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "=";
  return `${v > 0 ? "▲" : "▼"} ${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`;
}
