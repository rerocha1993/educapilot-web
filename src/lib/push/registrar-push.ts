import { getSession, getToken } from "@/lib/auth/session";

/**
 * Push do PWA: registra o service worker (public/sw.js), pede a permissão, inscreve o aparelho e
 * avisa o servidor (/api/Push). Vale para a escola e para os pais: o endpoint é o mesmo.
 *
 * Regras que o navegador impõe e que moldam este arquivo:
 * - A permissão só pode ser pedida a partir de um gesto (toque no botão): `ativarPush` chama
 *   `Notification.requestPermission()` antes de qualquer `await`.
 * - Só funciona em HTTPS (produção) e em http://localhost (desenvolvimento).
 * - No iPhone, só com o site instalado na tela de início; fora disso `PushManager` nem existe, e
 *   `pushSuportado()` devolve falso (o banner não aparece).
 */

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/** Aparelho já registrado no servidor para este usuário: "userId|endpoint". */
const CHAVE_DA_INSCRICAO = "educapilot_push_inscricao";
/** Quando a pessoa disse "Agora não" (ms desde 1970). */
const CHAVE_DA_DISPENSA = "educapilot_push_dispensado";
const DISPENSA_EM_MS = 7 * 24 * 60 * 60 * 1000;

export type EstadoDaPermissao = NotificationPermission | "indisponivel";

export interface ChaveDoPush {
  ativo: boolean;
  chavePublica: string | null;
}

export type ResultadoDoPush =
  | { ok: true }
  | { ok: false; motivo: "nao-suportado" | "adiado" | "negado" | "inativo" | "erro"; mensagem: string };

// ------------------------------------------------------------------ ambiente

export function pushSuportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function permissaoDoPush(): EstadoDaPermissao {
  return pushSuportado() ? Notification.permission : "indisponivel";
}

function lerStorage(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarStorage(chave: string, valor: string | null) {
  try {
    if (valor === null) window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, valor);
  } catch {
    // storage bloqueado: só não lembra
  }
}

/** "Agora não" vale por 7 dias. */
export function bannerDispensado(): boolean {
  const quando = Number(lerStorage(CHAVE_DA_DISPENSA));
  return Number.isFinite(quando) && quando > 0 && Date.now() - quando < DISPENSA_EM_MS;
}

export function dispensarBanner() {
  gravarStorage(CHAVE_DA_DISPENSA, String(Date.now()));
}

// ------------------------------------------------------------------ servidor

async function chamarPush(caminho: string, init: RequestInit = {}, token = getToken()): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  return fetch(`${baseUrl}/api/Push${caminho}`, { ...init, headers });
}

/** A chave VAPID pública, e se o servidor tem push ligado. */
export async function buscarChavePublica(): Promise<ChaveDoPush> {
  const res = await chamarPush("/chave-publica");
  if (!res.ok) throw new Error("Não foi possível consultar as notificações.");
  const r = (await res.json().catch(() => null)) as { ativo?: boolean; chavePublica?: string } | null;
  return { ativo: !!r?.ativo && !!r.chavePublica, chavePublica: r?.chavePublica ?? null };
}

// ------------------------------------------------------------------ inscrição

function base64UrlParaBytes(texto: string): Uint8Array<ArrayBuffer> {
  const preenchimento = "=".repeat((4 - (texto.length % 4)) % 4);
  const bruto = atob((texto + preenchimento).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

function bytesParaBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  let texto = "";
  for (const byte of new Uint8Array(buffer)) texto += String.fromCharCode(byte);
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Registra /sw.js (sem pedir permissão nenhuma). Devolve nulo se o navegador não suporta. */
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSuportado()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function marcaDaInscricao(endpoint: string): string {
  return `${getSession()?.userId ?? ""}|${endpoint}`;
}

/** Inscreve o aparelho (reaproveitando a inscrição existente) e registra no servidor. */
async function inscrever(chavePublica: string): Promise<void> {
  if (!(await registrarServiceWorker())) throw new Error("Este navegador não suporta notificações.");
  const registro = await navigator.serviceWorker.ready;
  const chave = base64UrlParaBytes(chavePublica);

  let inscricao = await registro.pushManager.getSubscription();
  // Inscrição feita com outra chave (o servidor trocou a VAPID): o navegador recusa reaproveitar.
  if (inscricao && bytesParaBase64Url(inscricao.options.applicationServerKey) !== chavePublica) {
    await inscricao.unsubscribe();
    inscricao = null;
  }
  inscricao ??= await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave });

  const marca = marcaDaInscricao(inscricao.endpoint);
  if (lerStorage(CHAVE_DA_INSCRICAO) === marca) return;

  const json = inscricao.toJSON();
  const res = await chamarPush("/dispositivos", {
    method: "POST",
    body: JSON.stringify({
      endpoint: inscricao.endpoint,
      p256dh: json.keys?.p256dh ?? bytesParaBase64Url(inscricao.getKey("p256dh")),
      auth: json.keys?.auth ?? bytesParaBase64Url(inscricao.getKey("auth")),
      userAgent: navigator.userAgent,
    }),
  });
  if (!res.ok) throw new Error("Não foi possível registrar este aparelho para as notificações.");
  gravarStorage(CHAVE_DA_INSCRICAO, marca);
}

/**
 * Pede a permissão e inscreve o aparelho. Chamar direto do clique, sem nenhum `await` antes: o
 * navegador só mostra o pedido de permissão a partir de um gesto.
 */
export async function ativarPush(chavePublicaConhecida?: string): Promise<ResultadoDoPush> {
  if (!pushSuportado()) {
    return { ok: false, motivo: "nao-suportado", mensagem: "Este navegador não suporta notificações." };
  }

  const permissao = await Notification.requestPermission();
  if (permissao === "denied") {
    return {
      ok: false,
      motivo: "negado",
      mensagem: "As notificações estão bloqueadas. Libere nas configurações do navegador para este site.",
    };
  }
  if (permissao !== "granted") {
    return { ok: false, motivo: "adiado", mensagem: "As notificações não foram ativadas." };
  }

  try {
    const chavePublica = chavePublicaConhecida ?? (await buscarChavePublica()).chavePublica;
    if (!chavePublica) {
      return { ok: false, motivo: "inativo", mensagem: "As notificações ainda não estão ligadas na escola." };
    }
    await inscrever(chavePublica);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      motivo: "erro",
      mensagem: e instanceof Error ? e.message : "Não foi possível ativar as notificações.",
    };
  }
}

/**
 * Quem já deu a permissão (nesta ou em outra sessão) e entrou de novo: garante que este aparelho
 * está inscrito para o usuário de agora, sem perguntar nada. Cobre sair e entrar com outra conta.
 */
export async function sincronizarPush(chavePublica: string): Promise<void> {
  if (permissaoDoPush() !== "granted") return;
  try {
    await inscrever(chavePublica);
  } catch {
    // push é um extra: falhar aqui não pode atrapalhar o uso do sistema
  }
}

/**
 * Cancela o push deste aparelho: avisa o servidor (DELETE) e desinscreve. Chamar ao sair da
 * conta, ANTES de apagar a sessão: o token é lido já na primeira linha, de forma síncrona, e a
 * chamada ao servidor segue com ele mesmo depois de a sessão ser limpa. Nunca lança.
 */
export async function cancelarPush(): Promise<void> {
  const token = getToken();
  if (!pushSuportado()) return;

  gravarStorage(CHAVE_DA_INSCRICAO, null);
  try {
    const registro = await navigator.serviceWorker.getRegistration("/");
    const inscricao = await registro?.pushManager.getSubscription();
    if (!inscricao) return;

    if (token) {
      await chamarPush(
        "/dispositivos",
        { method: "DELETE", body: JSON.stringify({ endpoint: inscricao.endpoint }), keepalive: true },
        token
      ).catch(() => undefined);
    }
    await inscricao.unsubscribe();
  } catch {
    // sem rede ou sem service worker: o servidor descarta o endpoint quando ele parar de responder
  }
}
