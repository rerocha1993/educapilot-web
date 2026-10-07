import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth/session";

/**
 * Kanban do módulo Fluxos.
 *
 * `fetch` cru porque as rotas são novas e ainda não estão nos tipos gerados do Swagger — mesmo
 * caminho já usado em contratos. A mensagem de erro do backend vai direto para a tela: é ela que
 * diz o que impede a ação.
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export type OrigemDoCartao = "manual" | "formulario" | "recorrencia" | "reuniao";

export interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
}

export interface Integrante {
  userId: string;
  nome: string;
}

export interface ItemDeChecklist {
  id: string;
  texto: string;
  feito: boolean;
  ordem: number;
}

export interface Cartao {
  id: string;
  quadroId: string;
  listaId: string;
  titulo: string;
  descricao?: string | null;
  ordem: number;
  prazo?: string | null;
  concluidoEm?: string | null;
  origem: OrigemDoCartao;
  formResponseId?: string | null;
  /** Preenchido quando o cartão nasceu de uma demanda combinada numa reunião (módulo Rotina). */
  reuniaoId?: number | null;
  responsavelUserId: string;
  responsavelNome: string;
  etiquetas: Etiqueta[];
  integrantes: Integrante[];
  checklist: ItemDeChecklist[];
}

export interface Lista {
  id: string;
  nome: string;
  ordem: number;
  conclui: boolean;
  cartoes: Cartao[];
}

export interface Quadro {
  id: string;
  userId: string;
  donoNome: string;
  nome: string;
  listas: Lista[];
}

export interface ResumoDoQuadro {
  userId: string;
  nome: string;
  abertos: number;
  atrasados: number;
  paraHoje: number;
  concluidosNaSemana: number;
  urgentes: Cartao[];
}

/** 0 = dias úteis, 1 = todo dia, 2 = semanal, 3 = mensal. Espelha o enum do backend. */
export type Frequencia = 0 | 1 | 2 | 3;

export interface Recorrencia {
  id: string;
  userId: string;
  responsavelNome: string;
  titulo: string;
  descricao?: string | null;
  frequencia: Frequencia;
  diaDaSemana?: number | null;
  diaDoMes?: number | null;
  etiquetaId?: string | null;
  checklist: string[];
  ativa: boolean;
  proximaEm: string;
  ultimoCartaoEm?: string | null;
}

/** 0 = quando a família envia, 1 = quando a gestão aprova. */
export type EventoDaRegra = 0 | 1;

export interface RegraDeCartao {
  id: string;
  formId: string;
  formNome: string;
  evento: EventoDaRegra;
  responsavelUserId: string;
  responsavelNome: string;
  tituloTemplate: string;
  etiquetaId?: string | null;
  prazoEmDias?: number | null;
  ativa: boolean;
}

export interface PessoaDaEquipe {
  userId: string;
  nome: string;
  email: string;
  /** Turmas em que a pessoa é professora — é o que permite sugerir responsável pela turma da reunião. */
  turmaIds: number[];
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api/Flow/tarefas${caminho}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    throw new Error((corpo as { message?: string } | null)?.message ?? "Não foi possível concluir a ação.");
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------- consultas

/** `enabled` existe para quem só quer o quadro às vezes — o Início, quando a pessoa escolheu ver
 *  as tarefas atrasadas. Sem isso a tela pediria o quadro de quem nem tem Fluxos. */
export function useMeuQuadro(opcoes?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["tarefas", "meu-quadro"],
    enabled: opcoes?.enabled ?? true,
    queryFn: () => chamar<Quadro>("/meu-quadro"),
  });
}

export function useQuadroDe(userId: string | null) {
  return useQuery({
    queryKey: ["tarefas", "quadro", userId],
    enabled: !!userId,
    queryFn: () => chamar<Quadro>(`/quadros/${userId}`),
  });
}

export function useResumoDaEquipe() {
  return useQuery({ queryKey: ["tarefas", "equipe"], queryFn: () => chamar<ResumoDoQuadro[]>("/equipe") });
}

export function useCartoesComigo() {
  return useQuery({ queryKey: ["tarefas", "comigo"], queryFn: () => chamar<Cartao[]>("/comigo") });
}

export function usePessoasDaEquipe() {
  return useQuery({ queryKey: ["tarefas", "pessoas"], queryFn: () => chamar<PessoaDaEquipe[]>("/pessoas") });
}

export function useEtiquetas() {
  return useQuery({ queryKey: ["tarefas", "etiquetas"], queryFn: () => chamar<Etiqueta[]>("/etiquetas") });
}

export function useRecorrencias() {
  return useQuery({ queryKey: ["tarefas", "recorrencias"], queryFn: () => chamar<Recorrencia[]>("/recorrencias") });
}

export function useRegrasDeCartao() {
  return useQuery({ queryKey: ["tarefas", "regras"], queryFn: () => chamar<RegraDeCartao[]>("/regras") });
}

/**
 * Cartões que nasceram das demandas combinadas numa reunião (módulo Rotina).
 *
 * A reunião só existe depois de salva, então enquanto a diretora está montando a semana o id é
 * nulo e não há o que buscar — `enabled` evita a chamada em `/da-reuniao/null`.
 */
export function useCartoesDaReuniao(reuniaoId: number | null | undefined) {
  return useQuery({
    queryKey: ["tarefas", "da-reuniao", reuniaoId],
    enabled: typeof reuniaoId === "number" && reuniaoId > 0,
    queryFn: () => chamar<Cartao[]>(`/da-reuniao/${reuniaoId}`),
  });
}

// ---------------------------------------------------------------- mudanças

/**
 * Toda mutação recarrega os quadros.
 *
 * Um quadro de escola tem dezenas de cartões e chega inteiro numa requisição: recarregar é mais
 * simples e mais confiável do que costurar o cache a cada arrastar, e é o que garante que duas
 * pessoas mexendo no mesmo quadro vejam a mesma coisa.
 */
function useMutacaoDeTarefas<TVars, TResp>(fn: (vars: TVars) => Promise<TResp>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarefas"] }),
  });
}

export function useCriarLista() {
  return useMutacaoDeTarefas((dados: { nome: string; conclui: boolean }) =>
    chamar<Lista>("/listas", { method: "POST", body: JSON.stringify(dados) })
  );
}

export function useAtualizarLista() {
  return useMutacaoDeTarefas(({ id, ...dados }: { id: string; nome: string; conclui: boolean }) =>
    chamar<void>(`/listas/${id}`, { method: "PUT", body: JSON.stringify(dados) })
  );
}

export function useExcluirLista() {
  return useMutacaoDeTarefas((id: string) => chamar<void>(`/listas/${id}`, { method: "DELETE" }));
}

export interface NovoCartao {
  listaId: string;
  titulo: string;
  descricao?: string | null;
  prazo?: string | null;
  responsavelUserId?: string | null;
  etiquetaIds?: string[];
  integranteIds?: string[];
}

export function useCriarCartao() {
  return useMutacaoDeTarefas((dados: NovoCartao) =>
    chamar<Cartao>("/cartoes", { method: "POST", body: JSON.stringify(dados) })
  );
}

export interface EdicaoDoCartao {
  titulo?: string;
  descricao?: string | null;
  prazo?: string | null;
  /** O prazo nulo quer dizer "não mexer": para tirar a data, mande isto. */
  limparPrazo?: boolean;
  responsavelUserId?: string;
  etiquetaIds?: string[];
  integranteIds?: string[];
}

export function useAtualizarCartao() {
  return useMutacaoDeTarefas(({ id, ...dados }: EdicaoDoCartao & { id: string }) =>
    chamar<Cartao>(`/cartoes/${id}`, { method: "PUT", body: JSON.stringify(dados) })
  );
}

export function useMoverCartao() {
  return useMutacaoDeTarefas(({ id, listaId, ordem }: { id: string; listaId: string; ordem: number }) =>
    chamar<Cartao>(`/cartoes/${id}/mover`, { method: "POST", body: JSON.stringify({ listaId, ordem }) })
  );
}

export function useExcluirCartao() {
  return useMutacaoDeTarefas((id: string) => chamar<void>(`/cartoes/${id}`, { method: "DELETE" }));
}

export function useAdicionarItemDeChecklist() {
  return useMutacaoDeTarefas(({ cartaoId, texto }: { cartaoId: string; texto: string }) =>
    chamar<Cartao>(`/cartoes/${cartaoId}/checklist`, { method: "POST", body: JSON.stringify({ texto }) })
  );
}

export function useAtualizarItemDeChecklist() {
  return useMutacaoDeTarefas(({ itemId, ...dados }: { itemId: string; texto?: string; feito?: boolean }) =>
    chamar<Cartao>(`/checklist/${itemId}`, { method: "PUT", body: JSON.stringify(dados) })
  );
}

export function useExcluirItemDeChecklist() {
  return useMutacaoDeTarefas((itemId: string) => chamar<void>(`/checklist/${itemId}`, { method: "DELETE" }));
}

export function useCriarEtiqueta() {
  return useMutacaoDeTarefas((dados: { nome: string; cor: string }) =>
    chamar<Etiqueta>("/etiquetas", { method: "POST", body: JSON.stringify(dados) })
  );
}

export function useExcluirEtiqueta() {
  return useMutacaoDeTarefas((id: string) => chamar<void>(`/etiquetas/${id}`, { method: "DELETE" }));
}

export interface EntradaDeRecorrencia {
  userId: string;
  titulo: string;
  descricao?: string | null;
  frequencia: Frequencia;
  diaDaSemana?: number | null;
  diaDoMes?: number | null;
  etiquetaId?: string | null;
  checklist?: string[];
  ativa: boolean;
}

export function useSalvarRecorrencia() {
  return useMutacaoDeTarefas(({ id, ...dados }: EntradaDeRecorrencia & { id?: string }) =>
    chamar<Recorrencia>(id ? `/recorrencias/${id}` : "/recorrencias", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(dados),
    })
  );
}

export function useExcluirRecorrencia() {
  return useMutacaoDeTarefas((id: string) => chamar<void>(`/recorrencias/${id}`, { method: "DELETE" }));
}

export interface EntradaDeRegra {
  formId: string;
  evento: EventoDaRegra;
  responsavelUserId: string;
  tituloTemplate: string;
  etiquetaId?: string | null;
  prazoEmDias?: number | null;
  ativa: boolean;
}

export function useSalvarRegraDeCartao() {
  return useMutacaoDeTarefas(({ id, ...dados }: EntradaDeRegra & { id?: string }) =>
    chamar<RegraDeCartao>(id ? `/regras/${id}` : "/regras", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(dados),
    })
  );
}

export function useExcluirRegraDeCartao() {
  return useMutacaoDeTarefas((id: string) => chamar<void>(`/regras/${id}`, { method: "DELETE" }));
}

export interface DemandaDaReuniao {
  titulo: string;
  descricao?: string | null;
  prazo?: string | null;
  responsavelUserId: string;
  etiquetaId?: string | null;
}

/**
 * As demandas combinadas na reunião viram cartão no quadro de quem vai fazer.
 *
 * Vai o lote inteiro numa requisição: a reunião é um momento só, e meia dúzia de POSTs soltos
 * deixaria metade das demandas no quadro se a conexão caísse no meio. O backend recusa o lote
 * quando `reuniaoId` é 0 (reunião ainda não salva) ou quando falta responsável, e a mensagem dele
 * é a que a tela mostra.
 */
export function useCriarCartoesDaReuniao() {
  return useMutacaoDeTarefas((dados: { reuniaoId: number; demandas: DemandaDaReuniao[] }) =>
    chamar<Cartao[]>("/da-reuniao", { method: "POST", body: JSON.stringify(dados) })
  );
}
