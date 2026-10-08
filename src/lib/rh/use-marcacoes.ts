import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rhDownload, rhFetchPublico, rhJson } from "./api";
import { horaDe, type ProvaDePresenca, type SituacaoDaBatida, type TipoDeBatida } from "./use-meu-ponto";

/**
 * Ponto pelo celular, lado da gestão — /api/Rh/ponto/marcacoes, /aparelhos, /qr, /alertas, /afd e
 * /espelho-671 (área `rh:ponto`).
 * Tipado à mão, como o resto do RH (ver use-rh.ts).
 *
 * Aprovar, recusar e ajustar também mudam o espelho do mês: as mutações invalidam todo o grupo
 * "rh" para a outra aba não ficar com número velho.
 */

const CHAVE = "rh";

// ------------------------------------------------------------------ tipos

export interface Marcacao {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipo: TipoDeBatida;
  /** yyyy-MM-dd */
  data: string;
  /** HH:mm */
  horaLocal: string;
  /** "Celular", "Ajuste", "Manual", "Importado", "Solicitacao"... o servidor decide. */
  origem: string;
  /** "Qr": a pessoa leu o QR da recepção, então valeu como no local mesmo sem GPS. */
  provaDePresenca: ProvaDePresenca;
  situacao: SituacaoDaBatida;
  motivos: string[];
  justificativa: string | null;
  distanciaDaEscolaMetros: number | null;
  dentroDaCerca: boolean | null;
  precisaoMetros: number | null;
  latitude: number | null;
  longitude: number | null;
  temFoto: boolean;
  aparelhoNome: string | null;
  nsr: string | null;
  observacaoDoGestor: string | null;
}

export interface FiltroDeMarcacoes {
  data?: string;
  de?: string;
  ate?: string;
  funcionarioId?: string | null;
  situacao?: SituacaoDaBatida | null;
  origem?: string | null;
}

export interface AparelhoDaGestao {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  nome: string;
  aprovado: boolean;
  ativo: boolean;
  /** Instante UTC. */
  primeiroUsoEm: string | null;
  ultimoUsoEm: string | null;
}

export interface PendenciasDoPonto {
  marcacoes: number;
  aparelhos: number;
  /** Alertas de possível fraude ainda sem resolver. */
  alertas: number;
}

export interface AjusteDeMarcacao {
  funcionarioId: string;
  tipo: TipoDeBatida;
  data: string;
  horaLocal: string;
  justificativa: string;
  marcacaoOriginalId?: string | null;
}

// ------------------------------------------------------------------ normalização

function busca(params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [nome, valor] of Object.entries(params)) {
    if (valor) q.set(nome, valor);
  }
  const texto = q.toString();
  return texto ? `?${texto}` : "";
}

const vazioParaNulo = (v: string | null | undefined) => (v && v.trim() ? v : null);

function marcacao(b: Partial<Marcacao> & { nsr?: unknown }): Marcacao {
  return {
    id: b.id ?? "",
    funcionarioId: b.funcionarioId ?? "",
    funcionarioNome: b.funcionarioNome ?? "",
    tipo: (b.tipo ?? "Entrada") as TipoDeBatida,
    data: (b.data ?? "").slice(0, 10),
    horaLocal: horaDe(b.horaLocal),
    origem: b.origem ?? "",
    provaDePresenca: b.provaDePresenca === "Qr" ? "Qr" : "Nenhuma",
    situacao: (b.situacao ?? "Normal") as SituacaoDaBatida,
    motivos: b.motivos ?? [],
    justificativa: vazioParaNulo(b.justificativa),
    distanciaDaEscolaMetros: b.distanciaDaEscolaMetros ?? null,
    dentroDaCerca: b.dentroDaCerca ?? null,
    precisaoMetros: b.precisaoMetros ?? null,
    latitude: b.latitude ?? null,
    longitude: b.longitude ?? null,
    temFoto: b.temFoto ?? false,
    aparelhoNome: vazioParaNulo(b.aparelhoNome),
    nsr: b.nsr === null || b.nsr === undefined || b.nsr === "" ? null : String(b.nsr),
    observacaoDoGestor: vazioParaNulo(b.observacaoDoGestor),
  };
}

// ------------------------------------------------------------------ marcações

export function useMarcacoes(filtro: FiltroDeMarcacoes, habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "marcacoes", filtro],
    enabled: habilitado,
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await rhJson<(Partial<Marcacao> & { nsr?: unknown })[] | null>(
        `/ponto/marcacoes${busca({
          data: filtro.data,
          de: filtro.de,
          ate: filtro.ate,
          funcionarioId: filtro.funcionarioId,
          situacao: filtro.situacao,
          origem: filtro.origem,
        })}`,
        {},
        "Não foi possível carregar as batidas."
      );
      return (lista ?? [])
        .map(marcacao)
        .sort(
          (a, b) =>
            b.data.localeCompare(a.data) ||
            a.funcionarioNome.localeCompare(b.funcionarioNome, "pt-BR") ||
            a.horaLocal.localeCompare(b.horaLocal)
        );
    },
  });
}

export function useAprovarMarcacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao?: string }) =>
      rhJson<void>(
        `/ponto/marcacoes/${id}/aprovar`,
        { method: "POST", body: JSON.stringify({ observacao: observacao?.trim() || null }) },
        "Não foi possível aprovar a batida."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useRecusarMarcacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      rhJson<void>(
        `/ponto/marcacoes/${id}/recusar`,
        { method: "POST", body: JSON.stringify({ motivo: motivo.trim() }) },
        "Não foi possível recusar a batida."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useAjustarMarcacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: AjusteDeMarcacao) =>
      rhJson<void>(
        "/ponto/marcacoes/ajuste",
        {
          method: "POST",
          body: JSON.stringify({
            ...dados,
            justificativa: dados.justificativa.trim(),
            marcacaoOriginalId: dados.marcacaoOriginalId ?? null,
          }),
        },
        "Não foi possível lançar o ajuste."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ aparelhos

export function useAparelhosDoPonto(
  filtro: { pendentes?: boolean; funcionarioId?: string | null } = {},
  habilitado = true
) {
  return useQuery({
    queryKey: [CHAVE, "aparelhos-do-ponto", filtro],
    enabled: habilitado,
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await rhJson<Partial<AparelhoDaGestao>[] | null>(
        `/ponto/aparelhos${busca({
          pendentes: filtro.pendentes ? "true" : null,
          funcionarioId: filtro.funcionarioId,
        })}`,
        {},
        "Não foi possível carregar os celulares."
      );
      return (lista ?? [])
        .map(
          (b): AparelhoDaGestao => ({
            id: b.id ?? "",
            funcionarioId: b.funcionarioId ?? "",
            funcionarioNome: b.funcionarioNome ?? "",
            nome: b.nome ?? "Celular",
            aprovado: b.aprovado ?? false,
            ativo: b.ativo ?? true,
            primeiroUsoEm: b.primeiroUsoEm ?? null,
            ultimoUsoEm: b.ultimoUsoEm ?? null,
          })
        )
        .sort((a, b) => a.funcionarioNome.localeCompare(b.funcionarioNome, "pt-BR"));
    },
  });
}

export function useAprovarAparelho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/ponto/aparelhos/${id}/aprovar`, { method: "POST" }, "Não foi possível aprovar o celular."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useDesativarAparelho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      rhJson<void>(
        `/ponto/aparelhos/${id}/desativar`,
        { method: "POST", body: JSON.stringify({ motivo: motivo?.trim() || null }) },
        "Não foi possível desativar o celular."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ resumo de pendências

/**
 * Quantas batidas, celulares e alertas esperam a gestão. Alimenta o selo da aba Pendências e o "Precisa de
 * você" do Início. Falha ou sem a área: a consulta erra e a tela mostra como zero — um selo que
 * erra não deve derrubar a página.
 */
export function usePendenciasDoPonto(habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "pendencias-do-ponto"],
    enabled: habilitado,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const b = await rhJson<Partial<PendenciasDoPonto> | null>(
        "/ponto/pendencias/resumo",
        {},
        "Não foi possível carregar as pendências do ponto."
      );
      return {
        marcacoes: b?.marcacoes ?? 0,
        aparelhos: b?.aparelhos ?? 0,
        alertas: b?.alertas ?? 0,
      } satisfies PendenciasDoPonto;
    },
  });
}

// ------------------------------------------------------------------ QR da recepção

export interface TelaDeRecepcao {
  id: string;
  nome: string;
  /** Instante UTC. */
  criadaEm: string;
  ultimoUsoEm: string | null;
}

/** A tela recém-criada: só aqui o servidor devolve o `token`, que vai no link. */
export interface TelaDeRecepcaoCriada extends TelaDeRecepcao {
  token: string;
}

export interface CodigoDoQr {
  codigo: string;
  /** Instante UTC. */
  validoAteUtc: string;
  /** Daqui a quantos segundos pedir outro código. */
  segundos: number;
}

/** O servidor aceita no máximo 10 telas por escola. */
export const MAXIMO_DE_TELAS = 10;

const normalizarTela = (t: Partial<TelaDeRecepcao>): TelaDeRecepcao => ({
  id: t.id ?? "",
  nome: t.nome ?? "Tela",
  criadaEm: t.criadaEm ?? "",
  ultimoUsoEm: t.ultimoUsoEm ?? null,
});

function codigoDoQr(b: Partial<CodigoDoQr> | null | undefined): CodigoDoQr {
  return {
    codigo: b?.codigo ?? "",
    validoAteUtc: b?.validoAteUtc ?? "",
    // Nunca pedir mais de uma vez a cada 3 s, mesmo se o servidor mandar 0.
    segundos: Math.max(3, Math.round(b?.segundos ?? 30)),
  };
}

export function useTelasDeRecepcao(habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "telas-de-recepcao"],
    enabled: habilitado,
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await rhJson<Partial<TelaDeRecepcao>[] | null>(
        "/ponto/qr/telas",
        {},
        "Não foi possível carregar as telas de recepção."
      );
      return (lista ?? []).map(normalizarTela).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    },
  });
}

export function useCriarTelaDeRecepcao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string): Promise<TelaDeRecepcaoCriada> => {
      const b = await rhJson<(Partial<TelaDeRecepcao> & { token?: string }) | null>(
        "/ponto/qr/telas",
        { method: "POST", body: JSON.stringify({ nome: nome.trim() }) },
        "Não foi possível criar a tela de recepção."
      );
      return { ...normalizarTela(b ?? {}), token: b?.token ?? "" };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "telas-de-recepcao"] }),
  });
}

export function useRevogarTelaDeRecepcao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/ponto/qr/telas/${id}`, { method: "DELETE" }, "Não foi possível desativar a tela."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "telas-de-recepcao"] }),
  });
}

/**
 * O código de agora, para o diálogo "Ver QR agora". Pede outro a cada `segundos` enquanto o
 * diálogo está aberto (`habilitado`); não guarda nada em cache, porque o código vence.
 */
export function useQrAtual(habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "qr-atual"],
    enabled: habilitado,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (consulta) => (consulta.state.data?.segundos ?? 10) * 1000,
    queryFn: async () => {
      const b = await rhJson<Partial<CodigoDoQr> | null>(
        "/ponto/qr/atual",
        {},
        "Não foi possível gerar o código agora."
      );
      return codigoDoQr(b);
    },
  });
}

// ------------------------------------------------------------------ tela pública do QR

export interface CodigoDaTelaPublica extends CodigoDoQr {
  escolaNome: string;
  telaNome: string;
}

/** O que a tela pública da recepção recebeu: um código, ou o motivo de não ter. */
export type RespostaDaTelaPublica =
  | { status: "ok"; dados: CodigoDaTelaPublica }
  | { status: "revogada" }
  | { status: "espera"; segundos: number }
  | { status: "sem-rede" }
  | { status: "erro" };

/**
 * Pede o código à API SEM login (a tela fica num tablet da recepção). 404 é tela desativada; 429 é
 * "espere" (Retry-After, quando o servidor manda); falha de rede não é erro grave, a tela só tenta
 * de novo.
 */
export async function buscarCodigoDaTela(token: string): Promise<RespostaDaTelaPublica> {
  let res: Response;
  try {
    res = await rhFetchPublico(`/ponto/qr/exibir?tela=${encodeURIComponent(token)}`);
  } catch {
    return { status: "sem-rede" };
  }

  if (res.status === 404) return { status: "revogada" };
  if (res.status === 429) {
    const espera = Number(res.headers.get("Retry-After"));
    return { status: "espera", segundos: Number.isFinite(espera) && espera > 0 ? espera : 5 };
  }
  if (!res.ok) return { status: "erro" };

  try {
    const b = (await res.json()) as Partial<CodigoDaTelaPublica>;
    if (!b.codigo) return { status: "erro" };
    return {
      status: "ok",
      dados: { ...codigoDoQr(b), escolaNome: b.escolaNome ?? "", telaNome: b.telaNome ?? "" },
    };
  } catch {
    return { status: "erro" };
  }
}

// ------------------------------------------------------------------ alertas

export const TIPOS_DE_ALERTA = [
  "MesmoMinutoSeguido",
  "SaltoDePosicaoImpossivel",
  "AparelhoCompartilhado",
  "AparelhoNovoForaDaCerca",
] as const;
export type TipoDeAlerta = (typeof TIPOS_DE_ALERTA)[number];

export const ROTULO_DO_ALERTA: Record<TipoDeAlerta, string> = {
  MesmoMinutoSeguido: "Mesmo minuto por 5 dias",
  SaltoDePosicaoImpossivel: "Deslocamento impossível",
  AparelhoCompartilhado: "Aparelho compartilhado",
  AparelhoNovoForaDaCerca: "Aparelho novo fora da escola",
};

/** O que cada alerta quer dizer, em uma frase para quem não é de tecnologia. */
export const EXPLICACAO_DO_ALERTA: Record<TipoDeAlerta, string> = {
  MesmoMinutoSeguido: "A pessoa bateu no mesmo minuto em vários dias seguidos, o que é raro de acontecer sozinho.",
  SaltoDePosicaoImpossivel: "Duas batidas em lugares distantes demais para o tempo que passou entre elas.",
  AparelhoCompartilhado: "O mesmo celular bateu ponto de mais de uma pessoa.",
  AparelhoNovoForaDaCerca: "Um celular recém-cadastrado bateu o ponto longe da escola.",
};

export function rotuloDoAlerta(tipo: string): string {
  return ROTULO_DO_ALERTA[tipo as TipoDeAlerta] ?? tipo;
}

export interface AlertaDePonto {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipo: TipoDeAlerta;
  descricao: string;
  /** yyyy-MM-dd */
  data: string;
  /** Ids das marcações envolvidas. */
  marcacoes: string[];
  resolvido: boolean;
  resolvidoPorUserId: string | null;
  /** Instante UTC. */
  resolvidoEm: string | null;
  nota: string | null;
  criadoEm: string;
}

export function useAlertasDePonto(resolvidos: boolean, habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "alertas-do-ponto", resolvidos],
    enabled: habilitado,
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await rhJson<Partial<AlertaDePonto>[] | null>(
        `/ponto/alertas?resolvidos=${resolvidos ? "true" : "false"}`,
        {},
        "Não foi possível carregar os alertas."
      );
      return (lista ?? [])
        .map(
          (a): AlertaDePonto => ({
            id: a.id ?? "",
            funcionarioId: a.funcionarioId ?? "",
            funcionarioNome: a.funcionarioNome ?? "",
            tipo: (a.tipo ?? "MesmoMinutoSeguido") as TipoDeAlerta,
            descricao: a.descricao ?? "",
            data: (a.data ?? "").slice(0, 10),
            marcacoes: a.marcacoes ?? [],
            resolvido: a.resolvido ?? false,
            resolvidoPorUserId: a.resolvidoPorUserId ?? null,
            resolvidoEm: a.resolvidoEm ?? null,
            nota: vazioParaNulo(a.nota),
            criadoEm: a.criadoEm ?? "",
          })
        )
        .sort((a, b) => b.data.localeCompare(a.data) || a.funcionarioNome.localeCompare(b.funcionarioNome, "pt-BR"));
    },
  });
}

export function useResolverAlerta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nota }: { id: string; nota?: string }) =>
      rhJson<void>(
        `/ponto/alertas/${id}/resolver`,
        { method: "POST", body: JSON.stringify({ nota: nota?.trim() || null }) },
        "Não foi possível resolver o alerta."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ arquivos legais (Portaria 671)

export interface PreviaDoAfd {
  de: string;
  ate: string;
  marcacoes: number;
  linhas: number;
  avisos: string[];
}

/** Confere o período antes de gerar o arquivo: quantas batidas e linhas, e o que está fora do padrão. */
export function usePreviaDoAfd() {
  return useMutation({
    mutationFn: async ({ de, ate }: { de: string; ate: string }): Promise<PreviaDoAfd> => {
      const b = await rhJson<Partial<PreviaDoAfd> | null>(
        `/ponto/afd/previa${busca({ de, ate })}`,
        {},
        "Não foi possível conferir o período."
      );
      return {
        de: (b?.de ?? de).slice(0, 10),
        ate: (b?.ate ?? ate).slice(0, 10),
        marcacoes: b?.marcacoes ?? 0,
        linhas: b?.linhas ?? 0,
        avisos: b?.avisos ?? [],
      };
    },
  });
}

/** Baixa o AFD (.txt) do período. O servidor manda o nome `AFD_aaaammdd_aaaammdd.txt`. */
export function baixarAfd(de: string, ate: string): Promise<void> {
  return rhDownload(
    `/ponto/afd${busca({ de, ate })}`,
    `AFD_${de.replaceAll("-", "")}_${ate.replaceAll("-", "")}.txt`,
    "Não foi possível baixar o AFD."
  );
}

/** Baixa o espelho de ponto no modelo da Portaria 671 (PDF) de um funcionário. */
export function baixarEspelho671(funcionarioId: string, ano: number, mes: number): Promise<void> {
  return rhDownload(
    `/ponto/espelho-671?funcionarioId=${encodeURIComponent(funcionarioId)}&mes=${mes}&ano=${ano}`,
    `espelho-671-${ano}-${String(mes).padStart(2, "0")}.pdf`,
    "Não foi possível baixar o espelho."
  );
}
