// Detecção do app nativo (casca Capacitor em mobile/). O site roda igual no navegador e dentro do app;
// tudo que é só do app passa por aqui. Sem importar @capacitor/core: dentro da casca o bridge já injeta
// `window.Capacitor`, e no navegador comum ele não existe, então nada nativo é carregado.

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

const CHAVE_DO_APARELHO = "educapilot_device_id";

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** Está dentro do app (Android ou iOS)? No navegador comum, sempre falso. */
export function estaNoApp(): boolean {
  return capacitor()?.isNativePlatform?.() === true;
}

/** "android" ou "ios" dentro do app; "web" fora. */
export function plataformaDoApp(): "android" | "ios" | "web" {
  const p = capacitor()?.getPlatform?.();
  return p === "android" || p === "ios" ? p : "web";
}

/**
 * Identificador estável deste aparelho, gerado uma vez e guardado no próprio aparelho. O servidor
 * amarra a sessão longa a ele: o refresh token só vale com o mesmo identificador.
 */
export function idDoAparelho(): string {
  try {
    const salvo = window.localStorage.getItem(CHAVE_DO_APARELHO);
    if (salvo) return salvo;
    const novo = crypto.randomUUID();
    window.localStorage.setItem(CHAVE_DO_APARELHO, novo);
    return novo;
  } catch {
    // Storage bloqueado: um id por carregamento; a sessão longa fica inútil, mas nada quebra.
    return `efemero-${Math.random().toString(36).slice(2)}`;
  }
}

export interface DadosDoAparelho {
  deviceId: string;
  deviceName: string;
  plataforma: "android" | "ios";
}

/** Corpo extra do login que pede sessão longa. Só dentro do app: o site no navegador segue como sempre. */
export function dadosDoAparelhoParaLogin(): Partial<DadosDoAparelho> {
  const plataforma = plataformaDoApp();
  if (!estaNoApp() || plataforma === "web") return {};
  return {
    deviceId: idDoAparelho(),
    deviceName: plataforma === "ios" ? "iPhone ou iPad" : "Android",
    plataforma,
  };
}
