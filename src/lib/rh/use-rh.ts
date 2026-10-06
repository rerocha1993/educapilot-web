import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rhDownload, rhJson, rhUpload } from "./api";

/**
 * RH (2026-10): funcionários, ponto, atestados, afastamentos, documentos, relatórios e a jornada
 * padrão — /api/Rh, módulo `rh`. Tipado à mão, com fetch cru (ver api.ts).
 *
 * Datas são texto "yyyy-MM-dd" e horas "HH:mm", e ficam assim até a tela. O servidor às vezes
 * devolve a data com a hora zerada ("...T00:00:00") e a hora com segundos: os normalizadores
 * abaixo cortam, para a tela nunca comparar texto de formatos diferentes.
 *
 * Perfil Teacher só lê: a escrita volta 403 e a mensagem do servidor vai para o toast.
 */

const CHAVE = "rh";

// ------------------------------------------------------------------ vocabulário

export const TIPOS_DE_CONTRATO = ["CLT", "PJ", "Estagio", "Temporario", "Voluntario", "Outro"] as const;
export type TipoDeContrato = (typeof TIPOS_DE_CONTRATO)[number];

export const ROTULO_DO_CONTRATO: Record<TipoDeContrato, string> = {
  CLT: "CLT",
  PJ: "PJ",
  Estagio: "Estágio",
  Temporario: "Temporário",
  Voluntario: "Voluntário",
  Outro: "Outro",
};

export const TIPOS_DE_AFASTAMENTO = ["Ferias", "Licenca", "Folga", "Suspensao", "Outro"] as const;
export type TipoDeAfastamento = (typeof TIPOS_DE_AFASTAMENTO)[number];

export const ROTULO_DO_AFASTAMENTO: Record<TipoDeAfastamento, string> = {
  Ferias: "Férias",
  Licenca: "Licença",
  Folga: "Folga",
  Suspensao: "Suspensão",
  Outro: "Outro",
};

export const TIPOS_DE_DOCUMENTO = [
  "RG",
  "CPF",
  "CTPS",
  "Contrato",
  "Diploma",
  "Certificado",
  "Comprovante",
  "Outro",
] as const;
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

export const ROTULO_DO_DOCUMENTO: Record<TipoDeDocumento, string> = {
  RG: "RG",
  CPF: "CPF",
  CTPS: "CTPS",
  Contrato: "Contrato",
  Diploma: "Diploma",
  Certificado: "Certificado",
  Comprovante: "Comprovante",
  Outro: "Outro",
};

/** Valor que a tela não conhece (versão nova do servidor) cai em "Outro" em vez de quebrar. */
function conhecido<T extends string>(lista: readonly T[], valor: string | null | undefined): T {
  return (lista as readonly string[]).includes(valor ?? "") ? (valor as T) : ("Outro" as T);
}

/** Limites de arquivo do RH: 10 MB, pdf/jpg/png. O servidor confere de novo. */
export const LIMITE_DE_ARQUIVO = 10 * 1024 * 1024;
export const ACEITA_ARQUIVO = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/** A frase que diz o que há de errado com o arquivo, ou nulo se está tudo bem. */
export function problemaDoArquivo(arquivo: File): string | null {
  if (arquivo.size > LIMITE_DE_ARQUIVO) return "O arquivo passa de 10 MB.";
  const nome = arquivo.name.toLowerCase();
  if (!/\.(pdf|jpe?g|png)$/.test(nome)) return "Envie um arquivo PDF, JPG ou PNG.";
  return null;
}

// ------------------------------------------------------------------ tipos

export interface ResumoDoRh {
  funcionariosAtivos: number;
  aniversariantesDoMes: number;
  atestadosNoMes: number;
  afastadosHoje: number;
  faltasNoMes: number;
}

export interface FuncionarioResumo {
  /** Guid. */
  id: string;
  nomeCompleto: string;
  cargo: string | null;
  departamento: string | null;
  tipoDeContrato: TipoDeContrato;
  dataDeAdmissao: string | null;
  dataDeDesligamento: string | null;
  ativo: boolean;
  email: string | null;
  telefone: string | null;
  /** Usuário do sistema ligado a esta ficha, quando existe. */
  userId: string | null;
}

export interface Funcionario extends FuncionarioResumo {
  cpf: string | null;
  dataDeNascimento: string | null;
  /** Só a ficha traz salário; a lista, não. */
  salario: number | null;
  cargaHorariaSemanal: number | null;
  observacoes: string | null;
}

export interface SalvarFuncionario {
  nomeCompleto: string;
  cpf: string | null;
  dataDeNascimento: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  departamento: string | null;
  tipoDeContrato: TipoDeContrato;
  dataDeAdmissao: string | null;
  salario: number | null;
  cargaHorariaSemanal: number | null;
  observacoes: string | null;
  userId: string | null;
}

export interface ResultadoDaImportacaoDeUsuarios {
  criados: number;
  existentes: number;
}

export interface RegistroDePonto {
  id: string;
  funcionarioId: string;
  /** yyyy-MM-dd */
  data: string;
  /** HH:mm */
  entrada: string | null;
  saidaIntervalo: string | null;
  retornoIntervalo: string | null;
  saida: string | null;
  /** Horas decimais. */
  horasTrabalhadas: number | null;
  /** "Manual" ou "Importado". */
  origem: string | null;
  observacao: string | null;
}

export interface SalvarPonto {
  funcionarioId: string;
  data: string;
  entrada: string | null;
  saidaIntervalo: string | null;
  retornoIntervalo: string | null;
  saida: string | null;
  observacao: string | null;
}

export interface ResumoDePonto {
  /** Horas decimais. */
  horasTrabalhadas: number;
  horasPrevistas: number;
  /** Trabalhadas menos previstas: negativo é devendo. */
  saldo: number;
  diasTrabalhados: number;
  diasPrevistos: number;
  faltas: number;
  atrasosMinutos: number;
  diasComAtestado: number;
  diasAfastado: number;
}

export interface ResultadoDaImportacaoDePonto {
  importados: number;
  atualizados: number;
  ignorados: { linha: number; motivo: string }[];
}

export interface Atestado {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  inicio: string;
  fim: string;
  dias: number;
  cid: string | null;
  profissional: string | null;
  abonado: boolean;
  temArquivo: boolean;
  arquivoNome: string | null;
  observacao: string | null;
}

export interface SalvarAtestado {
  funcionarioId: string;
  inicio: string;
  fim: string;
  cid: string | null;
  profissional: string | null;
  abonado: boolean;
  observacao: string | null;
}

export interface Afastamento {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipo: TipoDeAfastamento;
  inicio: string;
  fim: string;
  dias: number;
  observacao: string | null;
}

export interface SalvarAfastamento {
  funcionarioId: string;
  tipo: TipoDeAfastamento;
  inicio: string;
  fim: string;
  observacao: string | null;
}

export interface DocumentoDoFuncionario {
  id: string;
  funcionarioId: string;
  tipo: TipoDeDocumento;
  nome: string;
  arquivoContentType: string | null;
  /** Bytes. */
  tamanho: number;
  /** Instante UTC. */
  enviadoEm: string;
}

export interface ConfiguracaoDoRh {
  /** HH:mm */
  jornadaEntrada: string;
  jornadaSaida: string;
  intervaloMinutos: number;
  toleranciaMinutos: number;
  horasSemanais: number;
  /** 0 = domingo … 6 = sábado. */
  diasDaSemana: number[];
}

export interface RelatorioDoFuncionario {
  funcionario: Funcionario;
  ponto: ResumoDePonto;
  atestados: Atestado[];
  afastamentos: Afastamento[];
  /** Quantidade de documentos arquivados. */
  documentos: number;
}

export interface LinhaDaEquipe extends ResumoDePonto {
  funcionarioId: string;
  nome: string;
  cargo: string | null;
}

// ------------------------------------------------------------------ normalização

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);
const hora = (v: string | null | undefined) => (v ? v.slice(0, 5) : null);
const vazioParaNulo = (v: string | null | undefined) => (v && v.trim() ? v : null);

function funcionarioResumo(b: Partial<FuncionarioResumo>): FuncionarioResumo {
  return {
    id: b.id ?? "",
    nomeCompleto: b.nomeCompleto ?? "",
    cargo: vazioParaNulo(b.cargo),
    departamento: vazioParaNulo(b.departamento),
    tipoDeContrato: conhecido(TIPOS_DE_CONTRATO, b.tipoDeContrato),
    dataDeAdmissao: dia(b.dataDeAdmissao),
    dataDeDesligamento: dia(b.dataDeDesligamento),
    ativo: b.ativo ?? !b.dataDeDesligamento,
    email: vazioParaNulo(b.email),
    telefone: vazioParaNulo(b.telefone),
    userId: b.userId ?? null,
  };
}

function funcionarioCompleto(b: Partial<Funcionario>): Funcionario {
  return {
    ...funcionarioResumo(b),
    cpf: vazioParaNulo(b.cpf),
    dataDeNascimento: dia(b.dataDeNascimento),
    salario: b.salario ?? null,
    cargaHorariaSemanal: b.cargaHorariaSemanal ?? null,
    observacoes: vazioParaNulo(b.observacoes),
  };
}

function ponto(b: Partial<RegistroDePonto>): RegistroDePonto {
  return {
    id: b.id ?? "",
    funcionarioId: b.funcionarioId ?? "",
    data: dia(b.data) ?? "",
    entrada: hora(b.entrada),
    saidaIntervalo: hora(b.saidaIntervalo),
    retornoIntervalo: hora(b.retornoIntervalo),
    saida: hora(b.saida),
    horasTrabalhadas: b.horasTrabalhadas ?? null,
    origem: b.origem ?? null,
    observacao: vazioParaNulo(b.observacao),
  };
}

function resumoDePonto(b: Partial<ResumoDePonto> | null | undefined): ResumoDePonto {
  return {
    horasTrabalhadas: b?.horasTrabalhadas ?? 0,
    horasPrevistas: b?.horasPrevistas ?? 0,
    saldo: b?.saldo ?? 0,
    diasTrabalhados: b?.diasTrabalhados ?? 0,
    diasPrevistos: b?.diasPrevistos ?? 0,
    faltas: b?.faltas ?? 0,
    atrasosMinutos: b?.atrasosMinutos ?? 0,
    diasComAtestado: b?.diasComAtestado ?? 0,
    diasAfastado: b?.diasAfastado ?? 0,
  };
}

function atestado(b: Partial<Atestado>): Atestado {
  return {
    id: b.id ?? "",
    funcionarioId: b.funcionarioId ?? "",
    funcionarioNome: b.funcionarioNome ?? "",
    inicio: dia(b.inicio) ?? "",
    fim: dia(b.fim ?? b.inicio) ?? "",
    dias: b.dias ?? 1,
    cid: vazioParaNulo(b.cid),
    profissional: vazioParaNulo(b.profissional),
    abonado: b.abonado ?? false,
    temArquivo: b.temArquivo ?? false,
    arquivoNome: vazioParaNulo(b.arquivoNome),
    observacao: vazioParaNulo(b.observacao),
  };
}

function afastamento(b: Partial<Afastamento>): Afastamento {
  return {
    id: b.id ?? "",
    funcionarioId: b.funcionarioId ?? "",
    funcionarioNome: b.funcionarioNome ?? "",
    tipo: conhecido(TIPOS_DE_AFASTAMENTO, b.tipo),
    inicio: dia(b.inicio) ?? "",
    fim: dia(b.fim ?? b.inicio) ?? "",
    dias: b.dias ?? 1,
    observacao: vazioParaNulo(b.observacao),
  };
}

const porInicioDecrescente = (a: { inicio: string; funcionarioNome: string }, b: typeof a) =>
  b.inicio.localeCompare(a.inicio) || a.funcionarioNome.localeCompare(b.funcionarioNome, "pt-BR");

const porNome = (a: { nomeCompleto: string }, b: { nomeCompleto: string }) =>
  a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR");

function busca(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [nome, valor] of Object.entries(params)) {
    if (valor !== null && valor !== undefined && valor !== "") q.set(nome, String(valor));
  }
  const texto = q.toString();
  return texto ? `?${texto}` : "";
}

// ------------------------------------------------------------------ visão geral

export function useResumoDoRh() {
  return useQuery({
    queryKey: [CHAVE, "resumo"],
    staleTime: 60_000,
    queryFn: async () => {
      const b = await rhJson<Partial<ResumoDoRh> | null>("/resumo", {}, "Não foi possível carregar o resumo do RH.");
      return {
        funcionariosAtivos: b?.funcionariosAtivos ?? 0,
        aniversariantesDoMes: b?.aniversariantesDoMes ?? 0,
        atestadosNoMes: b?.atestadosNoMes ?? 0,
        afastadosHoje: b?.afastadosHoje ?? 0,
        faltasNoMes: b?.faltasNoMes ?? 0,
      } satisfies ResumoDoRh;
    },
  });
}

// ------------------------------------------------------------------ funcionários

/**
 * Lista de funcionários. `ativos` nulo não manda o filtro (a tela o usa para os seletores, em que
 * quem saiu da escola ainda precisa aparecer num atestado antigo).
 */
export function useFuncionarios(filtro: { ativos: boolean | null; busca?: string } = { ativos: true }) {
  const termo = filtro.busca?.trim() ?? "";
  return useQuery({
    queryKey: [CHAVE, "funcionarios", "lista", filtro.ativos, termo],
    staleTime: 30_000,
    queryFn: async () => {
      const lista = await rhJson<Partial<FuncionarioResumo>[] | null>(
        `/funcionarios${busca({ ativos: filtro.ativos, busca: termo })}`,
        {},
        "Não foi possível carregar os funcionários."
      );
      const itens = (lista ?? []).map(funcionarioResumo);
      // O servidor decide o que "ativos=false" devolve (só os desligados ou todos): a tela confere.
      const filtrados = filtro.ativos === null ? itens : itens.filter((f) => f.ativo === filtro.ativos);
      return filtrados.sort(porNome);
    },
  });
}

export function useFuncionario(id: string) {
  return useQuery({
    queryKey: [CHAVE, "funcionarios", "ficha", id],
    enabled: !!id,
    queryFn: async () =>
      funcionarioCompleto(
        (await rhJson<Partial<Funcionario>>(`/funcionarios/${id}`, {}, "Não foi possível carregar o funcionário.")) ?? {}
      ),
  });
}

export function useSalvarFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: SalvarFuncionario }) =>
      funcionarioCompleto(
        (await rhJson<Partial<Funcionario>>(
          id ? `/funcionarios/${id}` : "/funcionarios",
          { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
          "Não foi possível salvar o funcionário."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useDesligarFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: string }) =>
      rhJson<void>(
        `/funcionarios/${id}/desligar`,
        { method: "POST", body: JSON.stringify({ data }) },
        "Não foi possível desligar o funcionário."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useReativarFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/funcionarios/${id}/reativar`, { method: "POST" }, "Não foi possível reativar o funcionário."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useExcluirFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/funcionarios/${id}`, { method: "DELETE" }, "Não foi possível excluir o funcionário."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

/** "Criar fichas a partir dos usuários": uma ficha por usuário da escola que ainda não tem. */
export function useImportarUsuarios() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const b = await rhJson<Partial<ResultadoDaImportacaoDeUsuarios> | null>(
        "/funcionarios/importar-usuarios",
        { method: "POST" },
        "Não foi possível criar as fichas."
      );
      return { criados: b?.criados ?? 0, existentes: b?.existentes ?? 0 } satisfies ResultadoDaImportacaoDeUsuarios;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ ponto

export function usePonto(funcionarioId: string, de: string, ate: string) {
  return useQuery({
    queryKey: [CHAVE, "ponto", "dias", funcionarioId, de, ate],
    enabled: !!funcionarioId,
    queryFn: async () => {
      const lista = await rhJson<Partial<RegistroDePonto>[] | null>(
        `/ponto${busca({ funcionarioId, de, ate })}`,
        {},
        "Não foi possível carregar o ponto."
      );
      return (lista ?? []).map(ponto).sort((a, b) => a.data.localeCompare(b.data));
    },
  });
}

export function useResumoDePonto(funcionarioId: string, de: string, ate: string) {
  return useQuery({
    queryKey: [CHAVE, "ponto", "resumo", funcionarioId, de, ate],
    enabled: !!funcionarioId,
    queryFn: async () =>
      resumoDePonto(
        await rhJson<Partial<ResumoDePonto> | null>(
          `/ponto/resumo${busca({ funcionarioId, de, ate })}`,
          {},
          "Não foi possível calcular o resumo do ponto."
        )
      ),
  });
}

/** Cria ou atualiza o dia (o servidor decide pelo par funcionário + data). */
export function useSalvarPonto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: SalvarPonto) =>
      ponto(
        (await rhJson<Partial<RegistroDePonto>>(
          "/ponto",
          { method: "POST", body: JSON.stringify(dados) },
          "Não foi possível lançar o ponto."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useExcluirPonto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/ponto/${id}`, { method: "DELETE" }, "Não foi possível excluir o lançamento."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

/** Planilha CSV ou XLSX no modelo do RH. Linhas com problema voltam em `ignorados`. */
export function useImportarPonto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (arquivo: File) => {
      const b = await rhUpload<Partial<ResultadoDaImportacaoDePonto> | null>(
        "/ponto/importar",
        { file: arquivo },
        "Não foi possível importar a planilha."
      );
      return {
        importados: b?.importados ?? 0,
        atualizados: b?.atualizados ?? 0,
        ignorados: b?.ignorados ?? [],
      } satisfies ResultadoDaImportacaoDePonto;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export const baixarModeloDePonto = () =>
  rhDownload("/ponto/modelo", "modelo-ponto.xlsx", "Não foi possível baixar o modelo.");

// ------------------------------------------------------------------ atestados

export function useAtestados(funcionarioId: string | null, ano: number) {
  return useQuery({
    queryKey: [CHAVE, "atestados", funcionarioId ?? "todos", ano],
    queryFn: async () => {
      const lista = await rhJson<Partial<Atestado>[] | null>(
        `/atestados${busca({ funcionarioId, ano })}`,
        {},
        "Não foi possível carregar os atestados."
      );
      return (lista ?? []).map(atestado).sort(porInicioDecrescente);
    },
  });
}

/** Cria (multipart, com o arquivo se houver) ou edita (JSON, sem arquivo) um atestado. */
export function useSalvarAtestado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados, arquivo }: { id?: string; dados: SalvarAtestado; arquivo?: File | null }) => {
      const salvo = id
        ? await rhJson<Partial<Atestado>>(
            `/atestados/${id}`,
            { method: "PUT", body: JSON.stringify(dados) },
            "Não foi possível salvar o atestado."
          )
        : await rhUpload<Partial<Atestado>>(
            "/atestados",
            { ...dados, arquivo: arquivo ?? null },
            "Não foi possível registrar o atestado."
          );
      return atestado(salvo ?? {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useEnviarArquivoDoAtestado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) =>
      rhUpload<void>(`/atestados/${id}/arquivo`, { arquivo }, "Não foi possível enviar o arquivo."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useExcluirAtestado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/atestados/${id}`, { method: "DELETE" }, "Não foi possível excluir o atestado."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export const baixarArquivoDoAtestado = (a: Pick<Atestado, "id" | "arquivoNome">) =>
  rhDownload(`/atestados/${a.id}/arquivo`, a.arquivoNome ?? "atestado", "Não foi possível baixar o arquivo.");

// ------------------------------------------------------------------ afastamentos

export function useAfastamentos(funcionarioId: string | null, ano: number) {
  return useQuery({
    queryKey: [CHAVE, "afastamentos", funcionarioId ?? "todos", ano],
    queryFn: async () => {
      const lista = await rhJson<Partial<Afastamento>[] | null>(
        `/afastamentos${busca({ funcionarioId, ano })}`,
        {},
        "Não foi possível carregar os afastamentos."
      );
      return (lista ?? []).map(afastamento).sort(porInicioDecrescente);
    },
  });
}

/** O servidor recusa com 409 o período que sobrepõe outro; a mensagem dele vai para o toast. */
export function useSalvarAfastamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: SalvarAfastamento }) =>
      afastamento(
        (await rhJson<Partial<Afastamento>>(
          id ? `/afastamentos/${id}` : "/afastamentos",
          { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
          "Não foi possível salvar o afastamento."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useExcluirAfastamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/afastamentos/${id}`, { method: "DELETE" }, "Não foi possível excluir o afastamento."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ documentos

export function useDocumentos(funcionarioId: string) {
  return useQuery({
    queryKey: [CHAVE, "documentos", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: async () => {
      const lista = await rhJson<Partial<DocumentoDoFuncionario>[] | null>(
        `/documentos${busca({ funcionarioId })}`,
        {},
        "Não foi possível carregar os documentos."
      );
      return (lista ?? [])
        .map(
          (b): DocumentoDoFuncionario => ({
            id: b.id ?? "",
            funcionarioId: b.funcionarioId ?? "",
            tipo: conhecido(TIPOS_DE_DOCUMENTO, b.tipo),
            nome: b.nome ?? "",
            arquivoContentType: b.arquivoContentType ?? null,
            tamanho: b.tamanho ?? 0,
            enviadoEm: b.enviadoEm ?? "",
          })
        )
        .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome, "pt-BR"));
    },
  });
}

export function useEnviarDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { funcionarioId: string; tipo: TipoDeDocumento; nome: string; arquivo: File }) =>
      rhUpload<void>("/documentos", dados, "Não foi possível enviar o documento."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useExcluirDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/documentos/${id}`, { method: "DELETE" }, "Não foi possível excluir o documento."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export const baixarDocumento = (d: Pick<DocumentoDoFuncionario, "id" | "nome">) =>
  rhDownload(`/documentos/${d.id}/arquivo`, d.nome, "Não foi possível baixar o documento.");

// ------------------------------------------------------------------ configuração

/** Jornada que vale quando o funcionário não tem uma própria. Segunda a sexta, 8h às 17h. */
export const CONFIGURACAO_PADRAO: ConfiguracaoDoRh = {
  jornadaEntrada: "08:00",
  jornadaSaida: "17:00",
  intervaloMinutos: 60,
  toleranciaMinutos: 10,
  horasSemanais: 40,
  diasDaSemana: [1, 2, 3, 4, 5],
};

export function useConfiguracaoDoRh() {
  return useQuery({
    queryKey: [CHAVE, "configuracao"],
    staleTime: 60_000,
    queryFn: async () => {
      const b = await rhJson<Partial<ConfiguracaoDoRh> | null>(
        "/configuracao",
        {},
        "Não foi possível carregar a configuração."
      );
      return {
        jornadaEntrada: hora(b?.jornadaEntrada) ?? CONFIGURACAO_PADRAO.jornadaEntrada,
        jornadaSaida: hora(b?.jornadaSaida) ?? CONFIGURACAO_PADRAO.jornadaSaida,
        intervaloMinutos: b?.intervaloMinutos ?? CONFIGURACAO_PADRAO.intervaloMinutos,
        toleranciaMinutos: b?.toleranciaMinutos ?? CONFIGURACAO_PADRAO.toleranciaMinutos,
        horasSemanais: b?.horasSemanais ?? CONFIGURACAO_PADRAO.horasSemanais,
        diasDaSemana: b?.diasDaSemana ?? CONFIGURACAO_PADRAO.diasDaSemana,
      } satisfies ConfiguracaoDoRh;
    },
  });
}

export function useSalvarConfiguracaoDoRh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: ConfiguracaoDoRh) =>
      rhJson<void>(
        "/configuracao",
        { method: "PUT", body: JSON.stringify(dados) },
        "Não foi possível salvar a configuração."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ relatórios

export function useRelatorioDoFuncionario(id: string, de: string, ate: string, habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "relatorios", "funcionario", id, de, ate],
    enabled: !!id && habilitado,
    queryFn: async () => {
      const b = await rhJson<{
        funcionario?: Partial<Funcionario>;
        ponto?: Partial<ResumoDePonto>;
        atestados?: Partial<Atestado>[];
        afastamentos?: Partial<Afastamento>[];
        documentos?: number;
      } | null>(
        `/relatorios/funcionario/${id}${busca({ de, ate })}`,
        {},
        "Não foi possível carregar o relatório do funcionário."
      );
      return {
        funcionario: funcionarioCompleto(b?.funcionario ?? {}),
        ponto: resumoDePonto(b?.ponto),
        atestados: (b?.atestados ?? []).map(atestado).sort(porInicioDecrescente),
        afastamentos: (b?.afastamentos ?? []).map(afastamento).sort(porInicioDecrescente),
        documentos: b?.documentos ?? 0,
      } satisfies RelatorioDoFuncionario;
    },
  });
}

export function useRelatorioDaEquipe(de: string, ate: string, habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "relatorios", "equipe", de, ate],
    enabled: habilitado,
    queryFn: async () => {
      // O servidor devolve { de, ate, linhas: [{ funcionarioId, nome, cargo, ponto: {resumo} }] }.
      type LinhaDoServidor = { funcionarioId?: string; nome?: string; cargo?: string | null; ponto?: Partial<ResumoDePonto> };
      const resposta = await rhJson<{ linhas?: LinhaDoServidor[] } | LinhaDoServidor[] | null>(
        `/relatorios/equipe${busca({ de, ate })}`,
        {},
        "Não foi possível carregar o relatório da equipe."
      );
      const lista = Array.isArray(resposta) ? resposta : (resposta?.linhas ?? []);
      return lista
        .map(
          (l): LinhaDaEquipe => ({
            ...resumoDePonto(l.ponto ?? {}),
            funcionarioId: l.funcionarioId ?? "",
            nome: l.nome ?? "",
            cargo: vazioParaNulo(l.cargo),
          })
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    },
  });
}

export const exportarRelatorioDaEquipe = (de: string, ate: string) =>
  rhDownload(
    `/relatorios/equipe/exportar${busca({ de, ate })}`,
    `rh-equipe-${de}-a-${ate}.xlsx`,
    "Não foi possível exportar a planilha."
  );
