import { API_BASE_URL } from "@/lib/api/base-url";
import { idDoAparelho } from "@/lib/nativo/app";
import { atualizarSessao, clearSession, getSession } from "./session";

/**
 * Sessão longa (só dentro do app).
 *
 * O login do app recebe um token de acesso curto e um refresh token. Esta peça troca um pelo outro
 * antes de o acesso vencer, para o resto do sistema continuar lendo `getToken()` como sempre. Sem
 * refresh token salvo (site no navegador), nada aqui faz nada.
 *
 * O servidor gira o refresh token a cada troca: o enviado deixa de valer. Por isso a troca é
 * uma só por vez (`renovarSessao` devolve a mesma promessa a quem chamar enquanto ela corre).
 */

export type ResultadoDaRenovacao =
  | "renovada" // token novo salvo
  | "recusada" // o servidor recusou: sessão expirada ou revogada, precisa entrar de novo
  | "falha" // rede ou erro do servidor: a sessão continua, tentar de novo depois
  | "sem-refresh"; // esta sessão não tem refresh token (site no navegador)

const MARGEM_DE_RENOVACAO_MS = 5 * 60 * 1000;
const INTERVALO_DE_CONFERENCIA_MS = 30 * 1000;

let emAndamento: Promise<ResultadoDaRenovacao> | null = null;

export function renovarSessao(): Promise<ResultadoDaRenovacao> {
  if (!emAndamento) {
    emAndamento = executar().finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

async function executar(): Promise<ResultadoDaRenovacao> {
  const sessao = getSession();
  if (!sessao?.refreshToken) return "sem-refresh";

  let resposta: Response;
  try {
    resposta = await fetch(`${API_BASE_URL}/api/Auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: sessao.refreshToken, deviceId: idDoAparelho() }),
    });
  } catch {
    return "falha";
  }

  if (resposta.status === 401) return "recusada";
  if (!resposta.ok) return "falha";

  try {
    const dados = (await resposta.json()) as {
      token: string;
      expiresAt: string;
      refreshToken: string;
      refreshExpiresAt: string;
      role: string;
      name: string;
    };
    atualizarSessao({
      token: dados.token,
      expiresAt: dados.expiresAt,
      refreshToken: dados.refreshToken,
      refreshExpiresAt: dados.refreshExpiresAt,
      role: dados.role,
      name: dados.name,
    });
    return "renovada";
  } catch {
    return "falha";
  }
}

/** Apaga a sessão e leva ao login avisando que expirou. Não faz nada se já está na tela de login. */
export function encerrarPorExpiracao() {
  clearSession();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.replace("/login?expirada=1");
  }
}

async function conferir() {
  const sessao = getSession();
  if (!sessao?.refreshToken || !sessao.expiresAt) return;
  if (Date.parse(sessao.expiresAt) - Date.now() > MARGEM_DE_RENOVACAO_MS) return;

  const resultado = await renovarSessao();
  if (resultado === "recusada") encerrarPorExpiracao();
}

/**
 * Mantém o token de acesso sempre fresco: confere ao abrir, a cada 30 s, ao voltar para o app
 * (saindo do segundo plano) e ao voltar a rede. Devolve a função que desliga tudo.
 */
export function manterSessaoViva(): () => void {
  void conferir();
  const intervalo = window.setInterval(() => void conferir(), INTERVALO_DE_CONFERENCIA_MS);
  const aoVoltar = () => {
    if (document.visibilityState === "visible") void conferir();
  };
  document.addEventListener("visibilitychange", aoVoltar);
  window.addEventListener("online", aoVoltar);

  return () => {
    window.clearInterval(intervalo);
    document.removeEventListener("visibilitychange", aoVoltar);
    window.removeEventListener("online", aoVoltar);
  };
}

/**
 * Avisa o servidor que este aparelho saiu (revoga a sessão longa). Melhor esforço: não espera a
 * rede nem falha a saída. Chamar ANTES de apagar a sessão local, que é de onde vem o refresh token.
 */
export function revogarSessaoNoServidor() {
  const refreshToken = getSession()?.refreshToken;
  if (!refreshToken) return;
  try {
    void fetch(`${API_BASE_URL}/api/Auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Sem rede o aparelho sai do mesmo jeito; o token expira sozinho no servidor.
  }
}
