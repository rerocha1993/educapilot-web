import { useCallback, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

import { mensagemDeErro, rhDownload, rhFetch, rhJson } from "./api";
import type { PosicaoDoAparelho } from "./ponto-do-aparelho";

/**
 * Ponto pelo celular, lado do funcionário — /api/Rh/meu-ponto. [Authorize] puro: não depende da
 * área do RH, porque a professora bate o próprio ponto sem ver o módulo.
 *
 * Quem não tem ficha de funcionário recebe 404 com { message }: aqui isso vira o resultado
 * "sem-ficha", e não um erro, porque o atalho "Meu ponto" do menu usa a mesma consulta para
 * decidir se aparece.
 */

const CHAVE = "rh";
const CHAVE_MEU_PONTO = [CHAVE, "meu-ponto"] as const;

// ------------------------------------------------------------------ vocabulário

export const TIPOS_DE_BATIDA = ["Entrada", "SaidaIntervalo", "RetornoIntervalo", "Saida"] as const;
export type TipoDeBatida = (typeof TIPOS_DE_BATIDA)[number];

export const SITUACOES_DA_BATIDA = ["Normal", "Pendente", "Aprovada", "Recusada"] as const;
export type SituacaoDaBatida = (typeof SITUACOES_DA_BATIDA)[number];

/** Como a batida provou que a pessoa estava na escola: pelo QR da recepção ou sem prova (só GPS). */
export const PROVAS_DE_PRESENCA = ["Nenhuma", "Qr"] as const;
export type ProvaDePresenca = (typeof PROVAS_DE_PRESENCA)[number];

/** Nome completo do tipo, para listas e comprovante. */
export const ROTULO_DO_TIPO: Record<TipoDeBatida, string> = {
  Entrada: "Entrada",
  SaidaIntervalo: "Saída para o intervalo",
  RetornoIntervalo: "Volta do intervalo",
  Saida: "Saída",
};

/** Nome curto, para os quatro marcos do dia (cabe em 375 px). */
export const ROTULO_DO_MARCO: Record<TipoDeBatida, string> = {
  Entrada: "Entrada",
  SaidaIntervalo: "Intervalo",
  RetornoIntervalo: "Retorno",
  Saida: "Saída",
};

/** O que o botão grande diz. */
export const ROTULO_DO_BOTAO: Record<TipoDeBatida, string> = {
  Entrada: "Registrar entrada",
  SaidaIntervalo: "Sair para o intervalo",
  RetornoIntervalo: "Voltar do intervalo",
  Saida: "Registrar saída",
};

export const ROTULO_DA_SITUACAO: Record<SituacaoDaBatida, string> = {
  Normal: "Registrada",
  Pendente: "Aguardando aprovação",
  Aprovada: "Aprovada",
  Recusada: "Recusada",
};

/** Os motivos que o servidor marca, em palavras de quem bate o ponto. */
export const PALAVRA_DO_MOTIVO: Record<string, string> = {
  "fora-da-cerca": "fora da escola",
  "precisao-baixa": "localização imprecisa",
  "sem-localizacao": "sem localização",
  "sem-foto": "sem foto",
  "aparelho-pendente": "celular ainda não aprovado",
  "fora-de-sequencia": "fora da ordem",
  "intervalo-curto": "intervalo curto",
  "excesso-de-batidas": "batidas demais no dia",
  "jornada-excedida": "jornada acima do limite",
  "ajuste-solicitado": "pedido de ajuste do funcionário",
};

export function motivosEmPalavras(motivos: string[]): string {
  return motivos.map((m) => PALAVRA_DO_MOTIVO[m] ?? m).join(", ");
}

export function rotuloDoTipo(tipo: string): string {
  return ROTULO_DO_TIPO[tipo as TipoDeBatida] ?? tipo;
}

export function rotuloDaSituacao(situacao: string): string {
  return ROTULO_DA_SITUACAO[situacao as SituacaoDaBatida] ?? situacao;
}

// ------------------------------------------------------------------ tipos

export interface BatidaDoDia {
  id: string;
  tipo: TipoDeBatida;
  /** HH:mm, no horário da escola. */
  horaLocal: string;
  situacao: SituacaoDaBatida;
  motivos: string[];
  nsr: string | null;
  provaDePresenca: ProvaDePresenca;
}

export interface ConfiguracaoDoPontoCelular {
  ativo: boolean;
  exigirFoto: boolean;
  cercaAtiva: boolean;
  raioMetros: number;
  precisaoMaximaMetros: number;
  foraDaCercaBloqueia: boolean;
  /** Passou deste número de batidas no dia, a batida fica pendente. */
  maximoDeBatidasPorDia: number;
  /** Jornada acima destas horas no dia fica pendente. */
  jornadaMaximaHoras: number;
  /** O servidor manda o comprovante por e-mail ao funcionário. */
  enviarComprovantePorEmail: boolean;
}

export interface AparelhoDoFuncionario {
  id: string;
  nome: string;
  aprovado: boolean;
  ativo: boolean;
}

export interface MeuPonto {
  funcionario: { id: string; nome: string };
  /** Diferença, em ms, entre o relógio do servidor e o do celular no momento da resposta. */
  deslocamentoMs: number;
  hoje: {
    /** yyyy-MM-dd */
    data: string;
    batidas: BatidaDoDia[];
    proximaBatida: TipoDeBatida | null;
    concluido: boolean;
  };
  configuracao: ConfiguracaoDoPontoCelular;
  /** Local da escola, para a conta de distância; nulo quando a escola não tem localização. */
  escola: { latitude: number | null; longitude: number | null; nome: string | null } | null;
  aparelhos: AparelhoDoFuncionario[];
}

export type RespostaDoMeuPonto =
  | { status: "ok"; dados: MeuPonto }
  | { status: "sem-ficha"; mensagem: string };

export interface ComprovanteDoPonto {
  id: string | null;
  nsr: string | null;
  hash: string | null;
  tipo: TipoDeBatida;
  /** HH:mm */
  horaLocal: string;
  /** yyyy-MM-dd */
  data: string;
  situacao: SituacaoDaBatida;
  motivos: string[];
  funcionarioNome: string | null;
  escolaNome: string | null;
  mensagem: string | null;
  provaDePresenca: ProvaDePresenca;
}

export interface BatidaDoHistorico {
  id: string;
  tipo: TipoDeBatida;
  data: string;
  horaLocal: string;
  situacao: SituacaoDaBatida;
  motivos: string[];
  nsr: string | null;
  temFoto: boolean;
  /** "Celular", "Ajuste", "Solicitacao"... o servidor decide. */
  origem: string | null;
  provaDePresenca: ProvaDePresenca;
}

// ------------------------------------------------------------------ normalização

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

/** "08:02", "08:02:15" ou "2026-10-07T08:02:15" → "08:02". */
export function horaDe(v: string | null | undefined): string {
  if (!v) return "";
  const depoisDoT = v.includes("T") ? v.split("T")[1] : v;
  return depoisDoT.slice(0, 5);
}

/** Instante do servidor. Sem fuso na ponta, vale como UTC (o contrato diz horaDoServidorUtc). */
function instante(v: string): number {
  return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(v) ? v : `${v}Z`);
}

const provaDe = (v: unknown): ProvaDePresenca => (v === "Qr" ? "Qr" : "Nenhuma");

const nsrDe = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v));

type Parcial<T> = { [K in keyof T]?: T[K] | null };

function batida(b: Parcial<BatidaDoDia> & { nsr?: unknown }): BatidaDoDia {
  return {
    id: b.id ?? "",
    tipo: (b.tipo ?? "Entrada") as TipoDeBatida,
    horaLocal: horaDe(b.horaLocal),
    situacao: (b.situacao ?? "Normal") as SituacaoDaBatida,
    motivos: b.motivos ?? [],
    nsr: nsrDe(b.nsr),
    provaDePresenca: provaDe(b.provaDePresenca),
  };
}

// ------------------------------------------------------------------ erro do ponto

/** Erro de uma chamada do ponto, com o status e (no 422) a distância que o servidor mediu. */
export class ErroDoPonto extends Error {
  constructor(
    mensagem: string,
    public readonly status: number,
    public readonly distanciaMetros: number | null = null
  ) {
    super(mensagem);
    this.name = "ErroDoPonto";
  }
}

const SEM_REDE = "Sem conexão com a internet. Conecte-se e tente de novo.";

/** fetch que troca a falha de rede (TypeError) por uma frase que a pessoa entende. */
async function chamar(caminho: string, init?: RequestInit): Promise<Response> {
  try {
    return await rhFetch(caminho, init);
  } catch {
    throw new ErroDoPonto(SEM_REDE, 0);
  }
}

async function lerCorpo(res: Response): Promise<{ message?: string; distanciaMetros?: number } | null> {
  try {
    return (await res.clone().json()) as { message?: string; distanciaMetros?: number };
  } catch {
    return null;
  }
}

/** Resposta que não é 2xx vira ErroDoPonto com a mensagem do servidor. */
async function exigirOk(res: Response, falha: string): Promise<Response> {
  if (res.ok) return res;
  const corpo = await lerCorpo(res);
  throw new ErroDoPonto(await mensagemDeErro(res, falha), res.status, corpo?.distanciaMetros ?? null);
}

// ------------------------------------------------------------------ aparelho deste navegador

/** Id do aparelho cadastrado NESTE navegador. Só serve para a tela saber que "este celular" existe. */
export const CHAVE_DO_APARELHO = "educapilot_ponto_aparelho";

const ouvintesDoAparelho = new Set<() => void>();

function avisarAparelho() {
  ouvintesDoAparelho.forEach((f) => f());
}

export function lerAparelhoLocal(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_DO_APARELHO);
  } catch {
    return null;
  }
}

export function gravarAparelhoLocal(id: string | null) {
  try {
    if (id) window.localStorage.setItem(CHAVE_DO_APARELHO, id);
    else window.localStorage.removeItem(CHAVE_DO_APARELHO);
  } catch {
    // storage bloqueado: a tela só não lembra deste celular
  }
  avisarAparelho();
}

function assinarAparelho(aoMudar: () => void) {
  ouvintesDoAparelho.add(aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintesDoAparelho.delete(aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

/** O aparelho cadastrado neste navegador, se o servidor ainda o conhece e ele não foi desativado. */
export function useAparelhoDesteCelular(aparelhos: AparelhoDoFuncionario[]): AparelhoDoFuncionario | null {
  const id = useSyncExternalStore(assinarAparelho, lerAparelhoLocal, () => null);
  return aparelhos.find((a) => a.id === id && a.ativo) ?? null;
}

// ------------------------------------------------------------------ consulta principal

async function buscarMeuPonto(): Promise<RespostaDoMeuPonto> {
  const res = await chamar("/meu-ponto");

  if (res.status === 404) {
    const corpo = await lerCorpo(res);
    return {
      status: "sem-ficha",
      mensagem: corpo?.message ?? "Seu usuário ainda não está ligado a uma ficha de funcionário.",
    };
  }

  await exigirOk(res, "Não foi possível carregar o seu ponto.");

  const b = (await res.json()) as {
    funcionario?: { id?: string; nome?: string };
    horaDoServidorUtc?: string;
    hoje?: {
      data?: string;
      batidas?: (Parcial<BatidaDoDia> & { nsr?: unknown })[];
      proximaBatida?: TipoDeBatida | null;
      concluido?: boolean;
    };
    configuracao?: Partial<ConfiguracaoDoPontoCelular>;
    escola?: { latitude?: number | null; longitude?: number | null; nome?: string | null } | null;
    aparelhos?: Partial<AparelhoDoFuncionario>[];
  };

  const agora = Date.now();
  const doServidor = b.horaDoServidorUtc ? instante(b.horaDoServidorUtc) : NaN;
  const escola = b.escola;

  return {
    status: "ok",
    dados: {
      funcionario: { id: b.funcionario?.id ?? "", nome: b.funcionario?.nome ?? "" },
      deslocamentoMs: Number.isFinite(doServidor) ? doServidor - agora : 0,
      hoje: {
        data: dia(b.hoje?.data),
        batidas: (b.hoje?.batidas ?? []).map(batida),
        proximaBatida: b.hoje?.proximaBatida ?? null,
        concluido: b.hoje?.concluido ?? false,
      },
      configuracao: {
        ativo: b.configuracao?.ativo ?? false,
        exigirFoto: b.configuracao?.exigirFoto ?? false,
        cercaAtiva: b.configuracao?.cercaAtiva ?? false,
        raioMetros: b.configuracao?.raioMetros ?? 100,
        precisaoMaximaMetros: b.configuracao?.precisaoMaximaMetros ?? 100,
        foraDaCercaBloqueia: b.configuracao?.foraDaCercaBloqueia ?? false,
        maximoDeBatidasPorDia: b.configuracao?.maximoDeBatidasPorDia ?? 6,
        jornadaMaximaHoras: b.configuracao?.jornadaMaximaHoras ?? 12,
        enviarComprovantePorEmail: b.configuracao?.enviarComprovantePorEmail ?? false,
      },
      escola: escola
        ? {
            latitude: typeof escola.latitude === "number" ? escola.latitude : null,
            longitude: typeof escola.longitude === "number" ? escola.longitude : null,
            nome: escola.nome ?? null,
          }
        : null,
      aparelhos: (b.aparelhos ?? []).map((a) => ({
        id: a.id ?? "",
        nome: a.nome ?? "Celular",
        aprovado: a.aprovado ?? false,
        ativo: a.ativo ?? true,
      })),
    },
  };
}

/** A tela Meu ponto. Atualiza ao voltar para a aba: o celular fica guardado no bolso o dia todo. */
export function useMeuPonto() {
  return useQuery({
    queryKey: CHAVE_MEU_PONTO,
    queryFn: buscarMeuPonto,
    retry: false,
    staleTime: 15_000,
  });
}

/**
 * O atalho "Meu ponto" do menu deve aparecer? Só com ficha de funcionário e o ponto pelo celular
 * ligado. Cache longo e sem nova tentativa: para a maioria dos usuários a resposta é 404.
 */
export function useMeuPontoDisponivel(habilitado = true): boolean {
  const { data } = useQuery({
    queryKey: CHAVE_MEU_PONTO,
    queryFn: buscarMeuPonto,
    enabled: habilitado,
    retry: false,
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    select: (r) => r.status === "ok" && r.dados.configuracao.ativo,
  });
  return data === true;
}

// ------------------------------------------------------------------ aparelho (cadastro)

export function useCadastrarAparelho() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nome: string) => {
      const opcoes = await rhJson<PublicKeyCredentialCreationOptionsJSON>(
        "/meu-ponto/aparelho/opcoes",
        { method: "POST", body: JSON.stringify({ nome }) },
        "Não foi possível começar o cadastro do celular."
      );

      // Import dinâmico: a biblioteca só é baixada por quem cadastra ou bate o ponto.
      const { startRegistration } = await import("@simplewebauthn/browser");
      const resposta = await startRegistration({ optionsJSON: opcoes });

      const aparelho = await rhJson<{ id: string; nome: string; aprovado: boolean }>(
        "/meu-ponto/aparelho",
        { method: "POST", body: JSON.stringify({ nome, resposta }) },
        "Não foi possível cadastrar o celular."
      );

      gravarAparelhoLocal(aparelho.id);
      return aparelho;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_MEU_PONTO }),
  });
}

// ------------------------------------------------------------------ bater o ponto

/** Pede ao servidor o desafio que o celular vai assinar. 404 = nenhum aparelho cadastrado. */
export async function pedirDesafio(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const res = await chamar("/meu-ponto/desafio", { method: "POST" });
  if (res.status === 404) {
    throw new ErroDoPonto("Nenhum celular cadastrado para o seu ponto. Cadastre este celular primeiro.", 404);
  }
  await exigirOk(res, "Não foi possível preparar a confirmação.");
  return (await res.json()) as PublicKeyCredentialRequestOptionsJSON;
}

/** Abre a biometria / bloqueio de tela do celular e devolve a assinatura do desafio. */
export async function assinarDesafio(
  opcoes: PublicKeyCredentialRequestOptionsJSON
): Promise<AuthenticationResponseJSON> {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  return startAuthentication({ optionsJSON: opcoes });
}

export interface DadosDaBatida {
  tipo: TipoDeBatida;
  /** Texto lido do QR da recepção; com ele a batida vale como "no local" mesmo sem GPS. */
  codigoQr?: string | null;
  posicao: PosicaoDoAparelho | null;
  justificativa: string;
  resposta: AuthenticationResponseJSON;
  foto: File | null;
}

export async function baterPonto(dados: DadosDaBatida): Promise<ComprovanteDoPonto> {
  const form = new FormData();
  form.append("tipo", dados.tipo);
  form.append("horaDoAparelho", new Date().toISOString());
  if (dados.posicao) {
    form.append("latitude", String(dados.posicao.latitude));
    form.append("longitude", String(dados.posicao.longitude));
    form.append("precisao", String(dados.posicao.precisao));
  }
  if (dados.justificativa.trim()) form.append("justificativa", dados.justificativa.trim());
  if (dados.codigoQr) form.append("codigoQr", dados.codigoQr);
  form.append("resposta", JSON.stringify(dados.resposta));
  if (dados.foto) form.append("foto", dados.foto, dados.foto.name || "ponto.jpg");

  const res = await chamar("/meu-ponto/bater", { method: "POST", body: form });
  await exigirOk(res, "Não foi possível registrar o ponto.");

  const b = (await res.json()) as Parcial<ComprovanteDoPonto> & { nsr?: unknown };
  return {
    id: b.id ?? null,
    nsr: nsrDe(b.nsr),
    hash: b.hash ?? null,
    tipo: (b.tipo ?? dados.tipo) as TipoDeBatida,
    horaLocal: horaDe(b.horaLocal),
    data: dia(b.data),
    situacao: (b.situacao ?? "Normal") as SituacaoDaBatida,
    motivos: b.motivos ?? [],
    funcionarioNome: b.funcionarioNome ?? null,
    escolaNome: b.escolaNome ?? null,
    mensagem: b.mensagem ?? null,
    provaDePresenca: provaDe(b.provaDePresenca),
  };
}

/** Depois de bater, a tela do dia e o histórico precisam reler o servidor. */
export function useAtualizarMeuPonto() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: CHAVE_MEU_PONTO }),
    [queryClient]
  );
}

// ------------------------------------------------------------------ histórico

export function useHistoricoDoPonto(de: string, ate: string, habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE_MEU_PONTO, "historico", de, ate],
    enabled: habilitado && !!de && !!ate,
    retry: false,
    queryFn: async () => {
      const q = new URLSearchParams({ de, ate });
      const res = await chamar(`/meu-ponto/historico?${q.toString()}`);
      await exigirOk(res, "Não foi possível carregar o histórico.");
      const lista = (await res.json()) as
        | (Parcial<BatidaDoHistorico> & { nsr?: unknown })[]
        | null;

      return (lista ?? [])
        .map(
          (b): BatidaDoHistorico => ({
            id: b.id ?? "",
            tipo: (b.tipo ?? "Entrada") as TipoDeBatida,
            data: dia(b.data),
            horaLocal: horaDe(b.horaLocal),
            situacao: (b.situacao ?? "Normal") as SituacaoDaBatida,
            motivos: b.motivos ?? [],
            nsr: nsrDe(b.nsr),
            temFoto: b.temFoto ?? false,
            origem: b.origem ?? null,
            provaDePresenca: provaDe(b.provaDePresenca),
          })
        )
        .sort((a, c) => c.data.localeCompare(a.data) || c.horaLocal.localeCompare(a.horaLocal));
    },
  });
}

/** O comprovante de uma batida antiga: só tem o que o histórico guarda. */
export function comprovanteDoHistorico(b: BatidaDoHistorico, funcionarioNome: string | null): ComprovanteDoPonto {
  return {
    id: b.id,
    nsr: b.nsr,
    hash: null,
    tipo: b.tipo,
    horaLocal: b.horaLocal,
    data: b.data,
    situacao: b.situacao,
    motivos: b.motivos,
    funcionarioNome,
    escolaNome: null,
    mensagem: null,
    provaDePresenca: b.provaDePresenca,
  };
}

/** O comprovante de uma batida do dia, vinda da tela principal. */
export function comprovanteDoDia(b: BatidaDoDia, dados: MeuPonto): ComprovanteDoPonto {
  return {
    id: b.id,
    nsr: b.nsr,
    hash: null,
    tipo: b.tipo,
    horaLocal: b.horaLocal,
    data: dados.hoje.data,
    situacao: b.situacao,
    motivos: b.motivos,
    funcionarioNome: dados.funcionario.nome,
    escolaNome: dados.escola?.nome ?? null,
    mensagem: null,
    provaDePresenca: b.provaDePresenca,
  };
}

// ------------------------------------------------------------------ pedido de ajuste

export interface PedidoDeAjuste {
  /** yyyy-MM-dd; não futura e até 60 dias atrás. */
  data: string;
  tipo: TipoDeBatida;
  /** HH:mm */
  horaLocal: string;
  /** 10 a 500 caracteres. */
  justificativa: string;
  /** A batida que o pedido corrige; sem ela, é uma batida que faltou. */
  marcacaoOriginalId?: string | null;
}

export const AJUSTE_DIAS_PARA_TRAS = 60;
export const JUSTIFICATIVA_MINIMA = 10;
export const JUSTIFICATIVA_MAXIMA = 500;

/**
 * O funcionário pede que a gestão lance ou corrija uma batida. Fica pendente até alguém aprovar;
 * aparece no histórico do próprio funcionário e na fila da gestão (origem "Solicitacao").
 */
export function useSolicitarAjuste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: PedidoDeAjuste) => {
      const res = await chamar("/meu-ponto/solicitar-ajuste", {
        method: "POST",
        body: JSON.stringify({
          data: dados.data,
          tipo: dados.tipo,
          horaLocal: dados.horaLocal,
          justificativa: dados.justificativa.trim(),
          marcacaoOriginalId: dados.marcacaoOriginalId ?? null,
        }),
      });
      await exigirOk(res, "Não foi possível enviar o pedido de ajuste.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

/** Baixa o PDF do espelho de ponto do próprio funcionário. */
export function baixarMeuEspelho(ano: number, mes: number): Promise<void> {
  return rhDownload(
    `/meu-ponto/espelho?mes=${mes}&ano=${ano}`,
    `espelho-de-ponto-${ano}-${String(mes).padStart(2, "0")}.pdf`,
    "Não foi possível baixar o seu espelho."
  );
}
