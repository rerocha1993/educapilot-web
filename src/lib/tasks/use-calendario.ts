import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Calendário escolar — /api/Calendario (módulo Rotina, área "calendario").
 *
 * Tipado à mão e com fetch cru: o Swagger ainda não conhece estes endpoints. Depois do deploy dá
 * para regenerar `src/lib/api/generated/tasks.d.ts` e trocar por openapi-fetch.
 *
 * Quem não é professor lê e escreve; professor só lê (a escrita volta 403). A tela esconde os
 * botões, mas quem decide é o servidor.
 *
 * Datas são texto "yyyy-MM-dd" e horas "HH:mm", e ficam assim até a tela: passar por Date
 * mudaria o dia conforme o fuso (ver calendario-datas.ts).
 */

export const TIPOS_DE_EVENTO = [
  "Letivo",
  "Feriado",
  "Recesso",
  "Reuniao",
  "Evento",
  "Avaliacao",
  "Atividade",
  "Outro",
] as const;

export type TipoDeEvento = (typeof TIPOS_DE_EVENTO)[number];

export const ROTULO_DO_TIPO: Record<TipoDeEvento, string> = {
  Letivo: "Dia letivo",
  Feriado: "Feriado",
  Recesso: "Recesso",
  Reuniao: "Reunião",
  Evento: "Evento",
  Avaliacao: "Avaliação",
  Atividade: "Atividade",
  Outro: "Outro",
};

/** Tipo que a tela não conhece (versão nova do servidor) cai em "Outro" em vez de quebrar. */
export function tipoConhecido(tipo: string): TipoDeEvento {
  return (TIPOS_DE_EVENTO as readonly string[]).includes(tipo) ? (tipo as TipoDeEvento) : "Outro";
}

export interface TurmaDoEvento {
  classId: number;
  nome: string;
}

export interface EventoDto {
  /** Guid. */
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoDeEvento;
  /** yyyy-MM-dd */
  inicio: string;
  /** yyyy-MM-dd, igual ao início quando dura um dia só. */
  fim: string;
  /** HH:mm */
  horaInicio: string | null;
  horaFim: string | null;
  diaInteiro: boolean;
  visivelParaFamilias: boolean;
  /** Sem turma marcada: vale para a escola inteira. */
  escolaToda: boolean;
  turmas: TurmaDoEvento[];
  criadoEm: string;
}

export interface EventoInput {
  titulo: string;
  descricao: string | null;
  tipo: TipoDeEvento;
  inicio: string;
  fim: string;
  horaInicio: string | null;
  horaFim: string | null;
  visivelParaFamilias: boolean;
  /** Vazio = escola toda. */
  classIds: number[];
}

export interface ResumoDoMes {
  ano: number;
  mes: number;
  total: number;
  eventos: EventoDto[];
}

export interface ResultadoDaImportacao {
  criados: number;
  existentes: number;
}

export interface ResultadoDaCopia {
  copiados: number;
}

/** Corpo de erro do ASP.NET: ProblemDetails, ou { message } nos controllers antigos. */
interface CorpoDeErro {
  message?: string;
  detail?: string;
  title?: string;
  errors?: Record<string, string[]>;
}

/**
 * A frase que explica o erro. `title` fica por último: num 409 ele é só "Conflict", e o motivo de
 * verdade está em `detail` (por exemplo, "2027 já tem eventos").
 */
function mensagemDoErro(corpo: CorpoDeErro | null, status: number, falha: string): string {
  const validacao = corpo?.errors && Object.values(corpo.errors).flat().find((m) => !!m);
  const dito = corpo?.message || corpo?.detail || validacao;
  if (dito) return dito;
  if (status === 403) return "Você não tem permissão para alterar o calendário.";
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  return falha;
}

async function chamar<T>(
  caminho: string,
  init: RequestInit,
  falha: string,
  esperaCorpo = true
): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}${caminho}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?expirada=1");
    }
  }

  if (!res.ok) {
    const corpo = (await res.json().catch(() => null)) as CorpoDeErro | null;
    throw new Error(mensagemDoErro(corpo, res.status, falha));
  }

  if (!esperaCorpo || res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

/** Garante o formato mesmo se o servidor omitir um campo: a tela nunca lê `undefined` de lista. */
function normalizar(bruto: Partial<EventoDto>): EventoDto {
  return {
    id: bruto.id ?? "",
    titulo: bruto.titulo ?? "",
    descricao: bruto.descricao ?? null,
    tipo: tipoConhecido(bruto.tipo ?? "Outro"),
    inicio: (bruto.inicio ?? "").slice(0, 10),
    fim: (bruto.fim ?? bruto.inicio ?? "").slice(0, 10),
    horaInicio: bruto.horaInicio ? bruto.horaInicio.slice(0, 5) : null,
    horaFim: bruto.horaFim ? bruto.horaFim.slice(0, 5) : null,
    diaInteiro: bruto.diaInteiro ?? !bruto.horaInicio,
    visivelParaFamilias: bruto.visivelParaFamilias ?? false,
    escolaToda: bruto.escolaToda ?? (bruto.turmas ?? []).length === 0,
    turmas: bruto.turmas ?? [],
    criadoEm: bruto.criadoEm ?? "",
  };
}

const porInicio = (a: EventoDto, b: EventoDto) =>
  a.inicio.localeCompare(b.inicio) ||
  (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "") ||
  a.titulo.localeCompare(b.titulo, "pt-BR");

/** Eventos do ano, ou só os do mês quando `mes` vem. Já ordenados por data e hora. */
export function useEventosDoCalendario(ano: number, mes?: number) {
  return useQuery({
    queryKey: ["calendario", "eventos", ano, mes ?? null],
    staleTime: 60_000,
    queryFn: async () => {
      const busca = new URLSearchParams({ ano: String(ano) });
      if (mes !== undefined) busca.set("mes", String(mes));

      const lista = await chamar<Partial<EventoDto>[]>(
        `/api/Calendario?${busca.toString()}`,
        {},
        "Não foi possível carregar o calendário."
      );
      return (lista ?? []).map(normalizar).sort(porInicio);
    },
  });
}

/** O resumo do mês que o Início mostra: GET /api/Calendario/resumo-do-mes. */
export function useResumoDoMes(ano: number, mes: number, opcoes?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["calendario", "resumo", ano, mes],
    staleTime: 5 * 60_000,
    enabled: opcoes?.enabled ?? true,
    queryFn: async (): Promise<ResumoDoMes> => {
      const busca = new URLSearchParams({ ano: String(ano), mes: String(mes) });
      const resumo = await chamar<Partial<ResumoDoMes>>(
        `/api/Calendario/resumo-do-mes?${busca.toString()}`,
        {},
        "Não foi possível carregar o resumo do mês."
      );
      const eventos = (resumo?.eventos ?? []).map(normalizar).sort(porInicio);
      return { ano, mes, total: resumo?.total ?? eventos.length, eventos };
    },
  });
}

/** Toda escrita muda o que o Início, o mês e a lista mostram: invalida a família inteira. */
function useInvalidarCalendario() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["calendario"] });
}

export function useCriarEvento() {
  const invalidar = useInvalidarCalendario();
  return useMutation({
    mutationFn: (input: EventoInput) =>
      chamar<void>(
        "/api/Calendario",
        { method: "POST", body: JSON.stringify(input) },
        "Não foi possível criar o evento.",
        false
      ),
    onSuccess: invalidar,
  });
}

export function useEditarEvento() {
  const invalidar = useInvalidarCalendario();
  return useMutation({
    mutationFn: ({ id, ...input }: EventoInput & { id: string }) =>
      chamar<void>(
        `/api/Calendario/${id}`,
        { method: "PUT", body: JSON.stringify(input) },
        "Não foi possível salvar o evento.",
        false
      ),
    onSuccess: invalidar,
  });
}

export function useExcluirEvento() {
  const invalidar = useInvalidarCalendario();
  return useMutation({
    mutationFn: (id: string) =>
      chamar<void>(
        `/api/Calendario/${id}`,
        { method: "DELETE" },
        "Não foi possível excluir o evento.",
        false
      ),
    onSuccess: invalidar,
  });
}

export function useImportarFeriados() {
  const invalidar = useInvalidarCalendario();
  return useMutation({
    mutationFn: (ano: number) =>
      chamar<ResultadoDaImportacao>(
        `/api/Calendario/feriados-nacionais?ano=${ano}`,
        { method: "POST" },
        "Não foi possível importar os feriados."
      ),
    onSuccess: invalidar,
  });
}

export function useCopiarAno() {
  const invalidar = useInvalidarCalendario();
  return useMutation({
    mutationFn: ({ de, para }: { de: number; para: number }) =>
      chamar<ResultadoDaCopia>(
        `/api/Calendario/copiar?de=${de}&para=${para}`,
        { method: "POST" },
        "Não foi possível copiar o calendário."
      ),
    onSuccess: invalidar,
  });
}
