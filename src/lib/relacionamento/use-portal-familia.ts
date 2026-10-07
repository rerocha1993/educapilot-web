import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { responsavelJson } from "@/lib/reception/api-responsavel";
import { consulta } from "./api";

/**
 * Portal das famílias (2026-10): início, avisos, agenda e rotina dos filhos — /api/Responsavel.
 *
 * Mesmo cuidado dos hooks da escola: o servidor omite nulos, então tudo que é opcional passa por
 * um normalizador, e datas continuam texto "yyyy-MM-dd" e horas "HH:mm" até a tela.
 */

const CHAVE = ["responsavel", "portal"] as const;

// ------------------------------------------------------------------ tipos

export type TipoDeAviso = "Aviso" | "Evento";
export type Presenca = "Sim" | "Nao";

export interface FilhoDoPortal {
  studentId: number;
  nome: string;
  turma: string | null;
  classId: number | null;
}

export type OrigemDaAgenda = "calendario" | "cronograma" | "evento";

export interface AgendaItem {
  origem: OrigemDaAgenda;
  id: string;
  titulo: string;
  /** yyyy-MM-dd; só vem preenchido quando o servidor o manda junto do item. */
  data: string | null;
  /** HH:mm */
  horaInicio: string | null;
  horaFim: string | null;
  /** Tipo do evento do calendário escolar ("Feriado", "Reuniao"...), quando a origem é o calendário. */
  tipo: string | null;
  turma: string | null;
  local: string | null;
  publicacaoId: string | null;
}

export interface AvisoResumo {
  id: string;
  tipo: TipoDeAviso;
  titulo: string;
  resumo: string;
  dataDoEvento: string | null;
  horaDoEvento: string | null;
  local: string | null;
  /** Instante UTC. */
  publicadaEm: string | null;
  turmas: string[];
  lida: boolean;
  confirmacaoDePresenca: Presenca | null;
  exigeConfirmacaoDeLeitura: boolean;
  permiteConfirmarPresenca: boolean;
  anexos: number;
}

export interface AnexoDoAviso {
  id: string;
  nome: string;
  contentType: string;
  tamanho: number;
}

export interface AvisoDetalhe extends Omit<AvisoResumo, "anexos"> {
  texto: string;
  anexos: AnexoDoAviso[];
}

export interface InicioDoPortal {
  escola: { nome: string; nomeDoPortal: string; mensagemDeBoasVindas: string | null };
  responsavel: { nome: string };
  alunos: FilhoDoPortal[];
  avisosNaoLidos: number;
  /** Mensagens do chat que a escola mandou e a família ainda não leu. */
  mensagensNaoLidas: number;
  proximosEventos: AgendaItem[];
  avisosRecentes: AvisoResumo[];
  agendaDeHoje: AgendaItem[];
  /** Até 3 do feed de atividades. */
  atividadesRecentes: AtividadeDaFamilia[];
  /** Até 3 álbuns do mural. */
  albunsRecentes: AlbumDaFamilia[];
}

/** Foto de atividade ou álbum, vista pelos pais. */
export interface FotoDaFamilia {
  id: string;
  legenda: string | null;
  largura: number | null;
  altura: number | null;
}

export interface AtividadeDaFamilia {
  id: string;
  turma: string;
  /** Nome do filho, quando o servidor o manda (família com mais de um aluno). */
  aluno: string | null;
  /** yyyy-MM-dd */
  data: string;
  titulo: string;
  resumo: string;
  professorNome: string;
  /** Instante UTC. */
  publicadaEm: string | null;
  /** Prévia: até 4 fotos. No detalhe, todas. */
  fotos: FotoDaFamilia[];
  totalDeFotos: number;
}

export interface AtividadeCompleta extends AtividadeDaFamilia {
  texto: string;
}

export interface AlbumDaFamilia {
  id: string;
  titulo: string;
  turma: string | null;
  escolaToda: boolean;
  dataDoEvento: string | null;
  publicadoEm: string | null;
  totalDeFotos: number;
  capaFotoId: string | null;
}

export interface AlbumCompleto extends AlbumDaFamilia {
  descricao: string;
  fotos: FotoDaFamilia[];
}

export interface DiaDaAgenda {
  data: string;
  itens: AgendaItem[];
}

export interface ItemDaRotina {
  horaInicio: string;
  horaFim: string | null;
  atividade: string;
  descricao: string | null;
}

export interface RotinaDoFilho {
  studentId: number;
  nome: string;
  turma: string | null;
  semana: { diaDaSemana: number; itens: ItemDaRotina[] }[];
}

// ------------------------------------------------------------------ normalização

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);
const hora = (v: string | null | undefined) => (v ? v.slice(0, 5) : null);

function presenca(v: string | null | undefined): Presenca | null {
  return v === "Sim" || v === "Nao" ? v : null;
}

function filho(a: Partial<FilhoDoPortal>): FilhoDoPortal {
  return { studentId: a.studentId ?? 0, nome: a.nome ?? "", turma: a.turma ?? null, classId: a.classId ?? null };
}

function agendaItem(i: Partial<AgendaItem>): AgendaItem {
  const origem: OrigemDaAgenda =
    i.origem === "calendario" || i.origem === "cronograma" || i.origem === "evento" ? i.origem : "calendario";
  return {
    origem,
    id: String(i.id ?? ""),
    titulo: i.titulo ?? "",
    data: dia(i.data),
    horaInicio: hora(i.horaInicio),
    horaFim: hora(i.horaFim),
    tipo: i.tipo ?? null,
    turma: i.turma ?? null,
    local: i.local ?? null,
    publicacaoId: i.publicacaoId ?? null,
  };
}

type AvisoCru = Omit<Partial<AvisoResumo>, "anexos"> & { anexos?: number | Partial<AnexoDoAviso>[] };

function aviso(a: AvisoCru): AvisoResumo {
  return {
    id: a.id ?? "",
    tipo: a.tipo === "Evento" ? "Evento" : "Aviso",
    titulo: a.titulo ?? "",
    resumo: a.resumo ?? "",
    dataDoEvento: dia(a.dataDoEvento),
    horaDoEvento: hora(a.horaDoEvento),
    local: a.local ?? null,
    publicadaEm: a.publicadaEm ?? null,
    turmas: a.turmas ?? [],
    lida: a.lida ?? false,
    confirmacaoDePresenca: presenca(a.confirmacaoDePresenca),
    exigeConfirmacaoDeLeitura: a.exigeConfirmacaoDeLeitura ?? false,
    permiteConfirmarPresenca: a.permiteConfirmarPresenca ?? false,
    anexos: typeof a.anexos === "number" ? a.anexos : (a.anexos?.length ?? 0),
  };
}

function anexo(a: Partial<AnexoDoAviso>): AnexoDoAviso {
  return { id: a.id ?? "", nome: a.nome ?? "Arquivo", contentType: a.contentType ?? "", tamanho: a.tamanho ?? 0 };
}

type DetalheCru = Omit<AvisoCru, "anexos"> & { texto?: string; anexos?: Partial<AnexoDoAviso>[] };

function detalhe(a: DetalheCru): AvisoDetalhe {
  const anexos = (a.anexos ?? []).map(anexo);
  return { ...aviso({ ...a, anexos: anexos.length }), texto: a.texto ?? "", anexos };
}

function fotoDaFamilia(f: Partial<FotoDaFamilia>): FotoDaFamilia {
  return {
    id: f.id ?? "",
    legenda: f.legenda?.trim() ? f.legenda : null,
    largura: f.largura ?? null,
    altura: f.altura ?? null,
  };
}

type FotoDaFamiliaCrua = Partial<FotoDaFamilia>;

type AtividadeCrua = Omit<Partial<AtividadeDaFamilia>, "fotos" | "totalDeFotos"> & {
  fotos?: FotoDaFamiliaCrua[] | number;
  totalDeFotos?: number;
  texto?: string;
};

function atividade(a: AtividadeCrua): AtividadeDaFamilia {
  const fotos = Array.isArray(a.fotos) ? a.fotos.map(fotoDaFamilia) : [];
  return {
    id: a.id ?? "",
    turma: a.turma ?? "",
    aluno: a.aluno ?? null,
    data: dia(a.data) ?? "",
    titulo: a.titulo ?? "",
    resumo: a.resumo ?? "",
    professorNome: a.professorNome ?? "",
    publicadaEm: a.publicadaEm ?? null,
    fotos,
    totalDeFotos: a.totalDeFotos ?? (typeof a.fotos === "number" ? a.fotos : fotos.length),
  };
}

function atividadeCompleta(a: AtividadeCrua): AtividadeCompleta {
  return { ...atividade(a), texto: a.texto ?? "" };
}

type AlbumCru = Omit<Partial<AlbumDaFamilia>, "totalDeFotos"> & {
  fotos?: FotoDaFamiliaCrua[] | number;
  descricao?: string;
};

function album(a: AlbumCru): AlbumDaFamilia {
  return {
    id: a.id ?? "",
    titulo: a.titulo ?? "",
    turma: a.turma ?? null,
    escolaToda: a.escolaToda ?? !a.turma,
    dataDoEvento: dia(a.dataDoEvento),
    publicadoEm: a.publicadoEm ?? null,
    totalDeFotos: typeof a.fotos === "number" ? a.fotos : (a.fotos?.length ?? 0),
    capaFotoId: a.capaFotoId ?? null,
  };
}

function albumCompleto(a: AlbumCru): AlbumCompleto {
  return {
    ...album(a),
    descricao: a.descricao ?? "",
    fotos: Array.isArray(a.fotos) ? a.fotos.map(fotoDaFamilia) : [],
  };
}

// ------------------------------------------------------------------ início

export function useInicioDoPortal(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE, "inicio"],
    enabled: habilitado,
    // Aviso novo e agenda do dia mudam do lado da escola; um minuto basta para a tela não mentir.
    refetchInterval: 60_000,
    queryFn: async (): Promise<InicioDoPortal> => {
      const r = await responsavelJson<
        | (Partial<Omit<InicioDoPortal, "alunos" | "proximosEventos" | "avisosRecentes" | "agendaDeHoje" | "atividadesRecentes" | "albunsRecentes" | "escola" | "responsavel">> & {
            escola?: Partial<InicioDoPortal["escola"]>;
            responsavel?: Partial<InicioDoPortal["responsavel"]>;
            alunos?: Partial<FilhoDoPortal>[];
            proximosEventos?: Partial<AgendaItem>[];
            avisosRecentes?: AvisoCru[];
            agendaDeHoje?: Partial<AgendaItem>[];
            atividadesRecentes?: AtividadeCrua[];
            albunsRecentes?: AlbumCru[];
          })
        | null
      >("/inicio", {}, "Não foi possível carregar seus dados.");

      return {
        escola: {
          nome: r?.escola?.nome ?? "",
          nomeDoPortal: r?.escola?.nomeDoPortal ?? r?.escola?.nome ?? "",
          mensagemDeBoasVindas: r?.escola?.mensagemDeBoasVindas ?? null,
        },
        responsavel: { nome: r?.responsavel?.nome ?? "" },
        alunos: (r?.alunos ?? []).map(filho),
        avisosNaoLidos: r?.avisosNaoLidos ?? 0,
        mensagensNaoLidas: r?.mensagensNaoLidas ?? 0,
        proximosEventos: (r?.proximosEventos ?? []).map(agendaItem),
        avisosRecentes: (r?.avisosRecentes ?? []).map(aviso),
        agendaDeHoje: (r?.agendaDeHoje ?? []).map(agendaItem),
        atividadesRecentes: (r?.atividadesRecentes ?? []).map(atividade),
        albunsRecentes: (r?.albunsRecentes ?? []).map(album),
      };
    },
  });
}

// ------------------------------------------------------------------ avisos

export const TAMANHO_DA_PAGINA_DE_AVISOS = 20;

export interface FiltroDeAvisos {
  tipo: TipoDeAviso | null;
  somenteNaoLidos: boolean;
}

export function useAvisosDoPortal(filtro: FiltroDeAvisos) {
  return useInfiniteQuery({
    queryKey: [...CHAVE, "avisos", "lista", filtro.tipo, filtro.somenteNaoLidos],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const r = await responsavelJson<{ total?: number; itens?: AvisoCru[] } | null>(
        `/avisos${consulta({
          tipo: filtro.tipo,
          somenteNaoLidos: filtro.somenteNaoLidos,
          pagina: pageParam,
          tamanho: TAMANHO_DA_PAGINA_DE_AVISOS,
        })}`,
        {},
        "Não foi possível carregar os avisos."
      );
      return { total: r?.total ?? 0, itens: (r?.itens ?? []).map(aviso) };
    },
    getNextPageParam: (ultima, todas) => {
      const carregados = todas.reduce((soma, p) => soma + p.itens.length, 0);
      return ultima.itens.length > 0 && carregados < ultima.total ? todas.length + 1 : undefined;
    },
  });
}

export function useAvisoDoPortal(id: string) {
  return useQuery({
    queryKey: [...CHAVE, "avisos", "detalhe", id],
    enabled: !!id,
    queryFn: async () =>
      detalhe((await responsavelJson<DetalheCru>(`/avisos/${id}`, {}, "Não foi possível abrir o aviso.")) ?? {}),
  });
}

/** Marca como lido. Atualiza o ponto de não lido da lista, do início e da aba. */
export function useMarcarComoLido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      responsavelJson<void>(`/avisos/${id}/ler`, { method: "POST" }, "Não foi possível marcar como lido."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useConfirmarPresenca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, presenca: resposta, studentId }: { id: string; presenca: Presenca; studentId?: number }) =>
      responsavelJson<void>(
        `/avisos/${id}/confirmar`,
        { method: "POST", body: JSON.stringify({ presenca: resposta, studentId }) },
        "Não foi possível registrar sua resposta."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

// ------------------------------------------------------------------ agenda e rotina

export function useAgendaDoPortal(de: string, ate: string) {
  return useQuery({
    queryKey: [...CHAVE, "agenda", de, ate],
    queryFn: async (): Promise<DiaDaAgenda[]> => {
      const r = await responsavelJson<{ dias?: { data?: string; itens?: Partial<AgendaItem>[] }[] } | null>(
        `/agenda${consulta({ de, ate })}`,
        {},
        "Não foi possível carregar a agenda."
      );
      return (r?.dias ?? [])
        .map((d) => {
          const data = dia(d.data) ?? "";
          return { data, itens: (d.itens ?? []).map((i) => ({ ...agendaItem(i), data: dia(i.data) ?? data })) };
        })
        .filter((d) => d.data !== "")
        .sort((a, b) => a.data.localeCompare(b.data));
    },
  });
}

export function useRotinaDosFilhos() {
  return useQuery({
    queryKey: [...CHAVE, "rotina"],
    queryFn: async (): Promise<RotinaDoFilho[]> => {
      const lista = await responsavelJson<
        | {
            studentId?: number;
            nome?: string;
            turma?: string | null;
            semana?: { diaDaSemana?: number; itens?: Partial<ItemDaRotina>[] }[];
          }[]
        | null
      >("/cronograma", {}, "Não foi possível carregar a rotina.");

      return (lista ?? []).map((f) => ({
        studentId: f.studentId ?? 0,
        nome: f.nome ?? "",
        turma: f.turma ?? null,
        semana: (f.semana ?? []).map((s) => ({
          diaDaSemana: s.diaDaSemana ?? 1,
          itens: (s.itens ?? []).map((i) => ({
            horaInicio: hora(i.horaInicio) ?? "",
            horaFim: hora(i.horaFim),
            atividade: i.atividade ?? "",
            descricao: i.descricao ?? null,
          })),
        })),
      }));
    },
  });
}

// ------------------------------------------------------------------ atividades e mural

export const TAMANHO_DA_PAGINA_DE_ATIVIDADES = 10;

/** Feed de atividades da sala, de um filho ou de todos (`studentId` nulo). */
export function useAtividadesDoPortal(studentId: number | null) {
  return useInfiniteQuery({
    queryKey: [...CHAVE, "atividades", "lista", studentId],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const r = await responsavelJson<{ total?: number; itens?: AtividadeCrua[] } | null>(
        `/atividades${consulta({ studentId, pagina: pageParam, tamanho: TAMANHO_DA_PAGINA_DE_ATIVIDADES })}`,
        {},
        "Não foi possível carregar as atividades."
      );
      return { total: r?.total ?? 0, itens: (r?.itens ?? []).map(atividade) };
    },
    getNextPageParam: (ultima, todas) => {
      const carregados = todas.reduce((soma, p) => soma + p.itens.length, 0);
      return ultima.itens.length > 0 && carregados < ultima.total ? todas.length + 1 : undefined;
    },
  });
}

export function useAtividadeDoPortal(id: string) {
  return useQuery({
    queryKey: [...CHAVE, "atividades", "detalhe", id],
    enabled: !!id,
    queryFn: async () =>
      atividadeCompleta(
        (await responsavelJson<AtividadeCrua>(`/atividades/${id}`, {}, "Não foi possível abrir a atividade.")) ?? {}
      ),
  });
}

export function useMuralDoPortal() {
  return useQuery({
    queryKey: [...CHAVE, "mural", "lista"],
    queryFn: async (): Promise<AlbumDaFamilia[]> => {
      const lista = await responsavelJson<AlbumCru[] | null>("/mural", {}, "Não foi possível carregar o mural.");
      return (lista ?? []).map(album);
    },
  });
}

export function useAlbumDoPortal(id: string) {
  return useQuery({
    queryKey: [...CHAVE, "mural", "detalhe", id],
    enabled: !!id,
    queryFn: async () =>
      albumCompleto((await responsavelJson<AlbumCru>(`/mural/${id}`, {}, "Não foi possível abrir o álbum.")) ?? {}),
  });
}
