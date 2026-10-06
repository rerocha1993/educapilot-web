import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consulta, relacionamentoJson, relacionamentoUpload } from "./api";

/**
 * Relacionamento, lado da escola (2026-10): avisos e eventos, cronograma, famílias e configuração
 * — /api/Relacionamento, módulo `relacionamento`. Tipado à mão, com fetch cru (ver api.ts).
 *
 * O servidor omite o que é nulo: toda propriedade opcional chega `undefined`, e os normalizadores
 * abaixo a transformam em `null` para a tela ter um só jeito de perguntar. Datas são texto
 * "yyyy-MM-dd" e horas "HH:mm" (cortadas quando o servidor manda "T00:00:00" ou segundos).
 */

const CHAVE = "relacionamento";

// ------------------------------------------------------------------ vocabulário

export const TIPOS_DE_PUBLICACAO = ["Aviso", "Evento"] as const;
export type TipoDePublicacao = (typeof TIPOS_DE_PUBLICACAO)[number];

export const ROTULO_DO_TIPO_DE_PUBLICACAO: Record<TipoDePublicacao, string> = {
  Aviso: "Aviso",
  Evento: "Evento",
};

export const STATUS_DA_PUBLICACAO = ["Rascunho", "Publicada", "Arquivada"] as const;
export type StatusDaPublicacao = (typeof STATUS_DA_PUBLICACAO)[number];

export const ROTULO_DO_STATUS: Record<StatusDaPublicacao, string> = {
  Rascunho: "Rascunho",
  Publicada: "Publicada",
  Arquivada: "Arquivada",
};

export function tipoDePublicacao(valor: string | null | undefined): TipoDePublicacao {
  return valor === "Evento" ? "Evento" : "Aviso";
}

export function statusDaPublicacao(valor: string | null | undefined): StatusDaPublicacao {
  return (STATUS_DA_PUBLICACAO as readonly string[]).includes(valor ?? "")
    ? (valor as StatusDaPublicacao)
    : "Rascunho";
}

/** Limites de anexo: 10 MB, pdf/jpg/png. O servidor confere de novo. */
export const LIMITE_DE_ANEXO = 10 * 1024 * 1024;
export const ACEITA_ANEXO = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/** A frase que diz o que há de errado com o arquivo, ou nulo se está tudo bem. */
export function problemaDoAnexo(arquivo: File): string | null {
  if (arquivo.size > LIMITE_DE_ANEXO) return "O arquivo passa de 10 MB.";
  if (!/\.(pdf|jpe?g|png)$/.test(arquivo.name.toLowerCase())) return "Envie um arquivo PDF, JPG ou PNG.";
  return null;
}

/** "320 KB", "1,4 MB". */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// ------------------------------------------------------------------ tipos

export interface TurmaDaPublicacao {
  classId: number;
  nome: string;
}

export interface AnexoDaPublicacao {
  /** Guid. */
  id: string;
  nome: string;
  contentType: string;
  /** Bytes. */
  tamanho: number;
}

export interface PublicacaoResumo {
  /** Guid. */
  id: string;
  tipo: TipoDePublicacao;
  titulo: string;
  resumo: string;
  /** yyyy-MM-dd */
  dataDoEvento: string | null;
  /** HH:mm */
  horaDoEvento: string | null;
  local: string | null;
  status: StatusDaPublicacao;
  /** Instante UTC. */
  publicadaEm: string | null;
  escolaToda: boolean;
  turmas: TurmaDaPublicacao[];
  destinatarios: number;
  lidas: number;
  confirmadasSim: number;
  confirmadasNao: number;
  anexos: number;
  criadoEm: string;
}

export interface PublicacaoDetalhe extends Omit<PublicacaoResumo, "anexos"> {
  texto: string;
  exigeConfirmacaoDeLeitura: boolean;
  permiteConfirmarPresenca: boolean;
  anexos: AnexoDaPublicacao[];
  eventoDoCalendarioId: string | null;
}

export interface SalvarPublicacao {
  tipo: TipoDePublicacao;
  titulo: string;
  texto: string;
  dataDoEvento: string | null;
  horaDoEvento: string | null;
  local: string | null;
  exigeConfirmacaoDeLeitura: boolean;
  permiteConfirmarPresenca: boolean;
  /** Vazio = escola toda (professor nunca: o servidor recusa). */
  classIds: number[];
  publicarAgora: boolean;
  eventoDoCalendarioId: string | null;
}

export interface FiltroDePublicacoes {
  tipo: TipoDePublicacao | null;
  status: StatusDaPublicacao | null;
  classId: number | null;
  ano: number | null;
  busca: string;
}

export interface Leitura {
  guardianId: number;
  nome: string;
  alunos: string[];
  /** Instante UTC; nulo = ainda não leu. */
  lidaEm: string | null;
  confirmacaoDePresenca: "Sim" | "Nao" | null;
  confirmadaEm: string | null;
}

export interface ItemDoCronograma {
  /** Guid. */
  id: string;
  /** Nulo = escola toda. */
  classId: number | null;
  /** 0 = domingo … 6 = sábado. */
  diaDaSemana: number;
  /** HH:mm */
  horaInicio: string;
  horaFim: string | null;
  atividade: string;
  descricao: string | null;
  visivelParaFamilias: boolean;
  ordem: number;
}

export interface SalvarItemDoCronograma {
  classId: number | null;
  diaDaSemana: number;
  horaInicio: string;
  horaFim: string | null;
  atividade: string;
  descricao: string | null;
  visivelParaFamilias: boolean;
}

export interface AlunoDaFamilia {
  studentId: number;
  nome: string;
  turma: string | null;
}

export interface Familia {
  guardianId: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  temLogin: boolean;
  alunos: AlunoDaFamilia[];
}

export interface FiltroDeFamilias {
  busca: string;
  somenteSemLogin: boolean;
}

export interface GerarAcessos {
  guardianIds?: number[];
  todos?: boolean;
  somenteSemLogin: boolean;
  enviarEmail: boolean;
}

export interface ResultadoDeAcessos {
  gerados: number;
  ignorados: { nome: string; motivo: string }[];
}

export interface ConfiguracaoDoRelacionamento {
  nomeDoPortal: string;
  mensagemDeBoasVindas: string | null;
  mostrarCalendarioEscolar: boolean;
  mostrarCronograma: boolean;
  emailAoPublicar: boolean;
}

// ------------------------------------------------------------------ normalização

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);
const hora = (v: string | null | undefined) => (v ? v.slice(0, 5) : null);

function turma(t: Partial<TurmaDaPublicacao>): TurmaDaPublicacao {
  return { classId: t.classId ?? 0, nome: t.nome ?? "" };
}

type ResumoCru = Omit<Partial<PublicacaoResumo>, "anexos"> & { anexos?: number };

function resumo(p: ResumoCru): PublicacaoResumo {
  return {
    id: p.id ?? "",
    tipo: tipoDePublicacao(p.tipo),
    titulo: p.titulo ?? "",
    resumo: p.resumo ?? "",
    dataDoEvento: dia(p.dataDoEvento),
    horaDoEvento: hora(p.horaDoEvento),
    local: p.local ?? null,
    status: statusDaPublicacao(p.status),
    publicadaEm: p.publicadaEm ?? null,
    escolaToda: p.escolaToda ?? false,
    turmas: (p.turmas ?? []).map(turma),
    destinatarios: p.destinatarios ?? 0,
    lidas: p.lidas ?? 0,
    confirmadasSim: p.confirmadasSim ?? 0,
    confirmadasNao: p.confirmadasNao ?? 0,
    anexos: p.anexos ?? 0,
    criadoEm: p.criadoEm ?? "",
  };
}

function anexo(a: Partial<AnexoDaPublicacao>): AnexoDaPublicacao {
  return {
    id: a.id ?? "",
    nome: a.nome ?? "Arquivo",
    contentType: a.contentType ?? "",
    tamanho: a.tamanho ?? 0,
  };
}

type DetalheCru = Omit<Partial<PublicacaoDetalhe>, "anexos"> & { anexos?: Partial<AnexoDaPublicacao>[] };

function detalhe(p: DetalheCru): PublicacaoDetalhe {
  const anexos = (p.anexos ?? []).map(anexo);
  return {
    ...resumo({ ...p, anexos: anexos.length }),
    texto: p.texto ?? "",
    exigeConfirmacaoDeLeitura: p.exigeConfirmacaoDeLeitura ?? false,
    permiteConfirmarPresenca: p.permiteConfirmarPresenca ?? false,
    anexos,
    eventoDoCalendarioId: p.eventoDoCalendarioId ?? null,
  };
}

function leitura(l: Partial<Leitura>): Leitura {
  return {
    guardianId: l.guardianId ?? 0,
    nome: l.nome ?? "",
    alunos: l.alunos ?? [],
    lidaEm: l.lidaEm ?? null,
    confirmacaoDePresenca:
      l.confirmacaoDePresenca === "Sim" || l.confirmacaoDePresenca === "Nao" ? l.confirmacaoDePresenca : null,
    confirmadaEm: l.confirmadaEm ?? null,
  };
}

function item(i: Partial<ItemDoCronograma>): ItemDoCronograma {
  return {
    id: i.id ?? "",
    classId: i.classId ?? null,
    diaDaSemana: i.diaDaSemana ?? 1,
    horaInicio: hora(i.horaInicio) ?? "",
    horaFim: hora(i.horaFim),
    atividade: i.atividade ?? "",
    descricao: i.descricao ?? null,
    visivelParaFamilias: i.visivelParaFamilias ?? true,
    ordem: i.ordem ?? 0,
  };
}

function familia(f: Partial<Familia>): Familia {
  return {
    guardianId: f.guardianId ?? 0,
    nome: f.nome ?? "",
    email: f.email ?? null,
    telefone: f.telefone ?? null,
    temLogin: f.temLogin ?? false,
    alunos: (f.alunos ?? []).map((a) => ({ studentId: a.studentId ?? 0, nome: a.nome ?? "", turma: a.turma ?? null })),
  };
}

function configuracao(c: Partial<ConfiguracaoDoRelacionamento> | null | undefined): ConfiguracaoDoRelacionamento {
  return {
    nomeDoPortal: c?.nomeDoPortal ?? "",
    mensagemDeBoasVindas: c?.mensagemDeBoasVindas ?? null,
    mostrarCalendarioEscolar: c?.mostrarCalendarioEscolar ?? true,
    mostrarCronograma: c?.mostrarCronograma ?? true,
    emailAoPublicar: c?.emailAoPublicar ?? true,
  };
}

// ------------------------------------------------------------------ publicações

export function usePublicacoes(filtro: FiltroDePublicacoes) {
  const busca = filtro.busca.trim();
  return useQuery({
    queryKey: [CHAVE, "publicacoes", "lista", filtro.tipo, filtro.status, filtro.classId, filtro.ano, busca],
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await relacionamentoJson<ResumoCru[] | null>(
        `/publicacoes${consulta({
          tipo: filtro.tipo,
          status: filtro.status,
          classId: filtro.classId,
          ano: filtro.ano,
          busca,
        })}`,
        {},
        "Não foi possível carregar as publicações."
      );
      return (lista ?? []).map(resumo);
    },
  });
}

export function usePublicacao(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "publicacoes", "detalhe", id],
    enabled: !!id,
    queryFn: async () =>
      detalhe(
        (await relacionamentoJson<DetalheCru>(
          `/publicacoes/${id}`,
          {},
          "Não foi possível carregar a publicação."
        )) ?? {}
      ),
  });
}

/** Cria (sem `id`) ou atualiza. Com `publicarAgora`, o servidor já publica e avisa as famílias. */
export function useSalvarPublicacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: SalvarPublicacao }) =>
      detalhe(
        (await relacionamentoJson<DetalheCru>(
          id ? `/publicacoes/${id}` : "/publicacoes",
          { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
          "Não foi possível salvar a publicação."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function usePublicar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/publicacoes/${id}/publicar`, { method: "POST" }, "Não foi possível publicar."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useArquivar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/publicacoes/${id}/arquivar`, { method: "POST" }, "Não foi possível arquivar."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useExcluirPublicacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/publicacoes/${id}`, { method: "DELETE" }, "Não foi possível excluir o rascunho."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useEnviarAnexo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, arquivo }: { id: string; arquivo: File }) =>
      anexo(
        (await relacionamentoUpload<Partial<AnexoDaPublicacao>>(
          `/publicacoes/${id}/anexos`,
          "arquivo",
          arquivo,
          "Não foi possível enviar o anexo."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "publicacoes"] }),
  });
}

export function useRemoverAnexo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (anexoId: string) =>
      relacionamentoJson<void>(`/publicacoes/anexos/${anexoId}`, { method: "DELETE" }, "Não foi possível remover o anexo."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "publicacoes"] }),
  });
}

export function useLeituras(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "publicacoes", "leituras", id],
    enabled: !!id,
    queryFn: async () => {
      const lista = await relacionamentoJson<Partial<Leitura>[] | null>(
        `/publicacoes/${id}/leituras`,
        {},
        "Não foi possível carregar quem leu."
      );
      return (lista ?? []).map(leitura);
    },
  });
}

// ------------------------------------------------------------------ cronograma

/**
 * Itens do cronograma de uma turma (ou da escola toda, com `classId` nulo).
 *
 * O servidor pode misturar o da escola e o da turma; a tela fica só com o que pertence à seleção.
 */
export function useCronograma(classId: number | null, habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "cronograma", classId],
    enabled: habilitado,
    queryFn: async () => {
      const lista = await relacionamentoJson<Partial<ItemDoCronograma>[] | null>(
        `/cronograma${consulta({ classId })}`,
        {},
        "Não foi possível carregar o cronograma."
      );
      return (lista ?? [])
        .map(item)
        .filter((i) => (classId === null ? i.classId === null : i.classId === classId))
        .sort(
          (a, b) =>
            a.diaDaSemana - b.diaDaSemana || a.horaInicio.localeCompare(b.horaInicio) || a.ordem - b.ordem
        );
    },
  });
}

export function useSalvarItemDoCronograma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: SalvarItemDoCronograma }) =>
      item(
        (await relacionamentoJson<Partial<ItemDoCronograma>>(
          id ? `/cronograma/${id}` : "/cronograma",
          { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
          "Não foi possível salvar o item."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "cronograma"] }),
  });
}

export function useExcluirItemDoCronograma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/cronograma/${id}`, { method: "DELETE" }, "Não foi possível remover o item."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "cronograma"] }),
  });
}

/** Copia a semana inteira de uma turma para outra, substituindo a da turma de destino. */
export function useCopiarCronograma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { deClassId: number; paraClassId: number }) =>
      relacionamentoJson<void>(
        "/cronograma/copiar",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível copiar o cronograma."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "cronograma"] }),
  });
}

// ------------------------------------------------------------------ famílias

export function useFamilias(filtro: FiltroDeFamilias) {
  const busca = filtro.busca.trim();
  return useQuery({
    queryKey: [CHAVE, "familias", busca, filtro.somenteSemLogin],
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await relacionamentoJson<Partial<Familia>[] | null>(
        `/familias${consulta({ busca, somenteSemLogin: filtro.somenteSemLogin })}`,
        {},
        "Não foi possível carregar as famílias."
      );
      return (lista ?? []).map(familia).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    },
  });
}

export function useGerarAcessos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: GerarAcessos) => {
      const r = await relacionamentoJson<Partial<ResultadoDeAcessos> | null>(
        "/familias/gerar",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível gerar os acessos."
      );
      return { gerados: r?.gerados ?? 0, ignorados: r?.ignorados ?? [] } satisfies ResultadoDeAcessos;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "familias"] }),
  });
}

export function useReenviarAcesso() {
  return useMutation({
    mutationFn: (guardianId: number) =>
      relacionamentoJson<void>(`/familias/${guardianId}/reenviar`, { method: "POST" }, "Não foi possível reenviar o link."),
  });
}

// ------------------------------------------------------------------ configuração

export function useConfiguracaoDoRelacionamento() {
  return useQuery({
    queryKey: [CHAVE, "configuracao"],
    queryFn: async () =>
      configuracao(
        await relacionamentoJson<Partial<ConfiguracaoDoRelacionamento> | null>(
          "/configuracao",
          {},
          "Não foi possível carregar a configuração."
        )
      ),
  });
}

export function useSalvarConfiguracaoDoRelacionamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: ConfiguracaoDoRelacionamento) =>
      configuracao(
        await relacionamentoJson<Partial<ConfiguracaoDoRelacionamento> | null>(
          "/configuracao",
          { method: "PUT", body: JSON.stringify(dados) },
          "Não foi possível salvar a configuração."
        )
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "configuracao"] }),
  });
}
