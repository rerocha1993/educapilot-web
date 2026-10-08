/**
 * Ferramentas do navegador para o ponto pelo celular: localização, câmera, distância e o
 * "nome" do aparelho. Nada aqui fala com o servidor — ver use-meu-ponto.ts para isso.
 */

// ------------------------------------------------------------------ distância

const RAIO_DA_TERRA_M = 6_371_000;
const emRadianos = (graus: number) => (graus * Math.PI) / 180;

/** Distância em metros entre dois pontos (fórmula de Haversine). */
export function distanciaEmMetros(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = emRadianos(b.latitude - a.latitude);
  const dLon = emRadianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(emRadianos(a.latitude)) * Math.cos(emRadianos(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_DA_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "35 m" até 999 m; "1,2 km" daí em diante. */
export function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  const km = metros / 1000;
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

// ------------------------------------------------------------------ localização

export interface PosicaoDoAparelho {
  latitude: number;
  longitude: number;
  /** Raio de incerteza, em metros. */
  precisao: number;
}

export type MotivoSemLocalizacao = "negada" | "indisponivel" | "tempo" | "sem-suporte";

export class ErroDeLocalizacao extends Error {
  constructor(
    public readonly motivo: MotivoSemLocalizacao,
    mensagem: string
  ) {
    super(mensagem);
    this.name = "ErroDeLocalizacao";
  }
}

/** Estado da permissão de localização, quando o navegador deixa perguntar sem abrir o pedido. */
export async function permissaoDeLocalizacao(): Promise<"granted" | "denied" | "prompt" | "desconhecida"> {
  try {
    if (!navigator.permissions?.query) return "desconhecida";
    const estado = await navigator.permissions.query({ name: "geolocation" });
    return estado.state;
  } catch {
    return "desconhecida";
  }
}

/** Posição atual, com GPS e no máximo 15 s de espera. Sempre uma leitura nova (sem cache). */
export function lerPosicao(): Promise<PosicaoDoAparelho> {
  return new Promise((resolver, rejeitar) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      rejeitar(new ErroDeLocalizacao("sem-suporte", "Este celular não informa a localização."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolver({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          precisao: p.coords.accuracy,
        }),
      (e) => {
        if (e.code === e.PERMISSION_DENIED) {
          rejeitar(new ErroDeLocalizacao("negada", "A localização está bloqueada neste celular."));
        } else if (e.code === e.TIMEOUT) {
          rejeitar(new ErroDeLocalizacao("tempo", "Não deu para achar sua localização a tempo."));
        } else {
          rejeitar(new ErroDeLocalizacao("indisponivel", "Não foi possível descobrir sua localização."));
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  });
}

// ------------------------------------------------------------------ foto

/** O navegador abre a câmera dentro da página (getUserMedia)? */
export function cameraNaPagina(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** Lê um arquivo como "data:..." — serve de prévia sem precisar revogar URL depois. */
export function lerComoDataUrl(arquivo: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(new Error("Não foi possível ler a foto."));
    leitor.readAsDataURL(arquivo);
  });
}

const LADO_MAXIMO_DA_FOTO = 1280;

function canvasParaJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolver, rejeitar) => {
    canvas.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error("Não foi possível gerar a foto."))),
      "image/jpeg",
      0.85
    );
  });
}

/**
 * Reduz a foto para no máximo 1280 px e JPEG. A câmera do celular entrega 3 a 8 MB; no 4G da
 * escola isso demora, e para conferir quem bateu o ponto basta uma imagem pequena. Se o
 * navegador não conseguir reduzir, manda o arquivo original.
 */
export async function prepararFoto(origem: File): Promise<File> {
  try {
    const imagem = await createImageBitmap(origem, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO_DA_FOTO / Math.max(imagem.width, imagem.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
    canvas.getContext("2d")?.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    imagem.close();
    const blob = await canvasParaJpeg(canvas);
    return new File([blob], "ponto.jpg", { type: "image/jpeg" });
  } catch {
    return origem;
  }
}

/** Congela o quadro atual do vídeo numa foto JPEG. */
export async function fotoDoVideo(video: HTMLVideoElement): Promise<File> {
  const escala = Math.min(1, LADO_MAXIMO_DA_FOTO / Math.max(video.videoWidth, video.videoHeight, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * escala);
  canvas.height = Math.round(video.videoHeight * escala);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await canvasParaJpeg(canvas);
  return new File([blob], "ponto.jpg", { type: "image/jpeg" });
}

/** A frase para um erro de getUserMedia. */
export function mensagemDaCamera(erro: unknown): string {
  const nome = erro instanceof DOMException ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return "A câmera está bloqueada neste celular. Libere a câmera nas configurações do navegador ou use a câmera do celular abaixo.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Não encontramos a câmera frontal deste celular.";
  }
  if (nome === "NotReadableError") {
    return "A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo.";
  }
  return "Não foi possível abrir a câmera.";
}

// ------------------------------------------------------------------ biometria

/** O navegador sabe fazer WebAuthn (biometria / bloqueio de tela)? Exige HTTPS. */
export function suportaBiometria(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/** Nome sugerido para o celular, a partir do navegador: "Android (Chrome)", "iPhone (Safari)". */
export function nomeSugeridoDoAparelho(): string {
  if (typeof navigator === "undefined") return "Meu celular";
  const ua = navigator.userAgent;

  const sistema = /iPhone|iPad|iPod/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : "Celular";

  const navegador = /EdgA?\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome|CriOS/.test(ua)
            ? "Chrome"
            : /Safari/.test(ua)
              ? "Safari"
              : "";

  return navegador ? `${sistema} (${navegador})` : sistema;
}

/**
 * A frase para um erro do WebAuthn. O navegador usa NotAllowedError tanto para "a pessoa cancelou"
 * quanto para "demorou demais", então a mensagem cobre os dois.
 */
export function mensagemDaBiometria(erro: unknown): string {
  const nome = erro instanceof Error ? ((erro as { code?: string }).code ?? erro.name) : "";
  if (nome === "ERROR_CEREMONY_ABORTED" || nome === "AbortError") {
    return "A confirmação foi interrompida. Toque no botão para tentar de novo.";
  }
  if (nome === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" || nome === "InvalidStateError") {
    return "Este celular já está cadastrado para você. Se a escola o desativou, peça para liberar de novo.";
  }
  if (nome === "NotAllowedError") {
    return "O celular não confirmou. Tente de novo e use a digital, o rosto ou o bloqueio de tela quando ele pedir.";
  }
  if (nome === "SecurityError") {
    return "Este endereço não permite a biometria. Abra o sistema pelo endereço oficial da escola.";
  }
  if (nome === "NotSupportedError") {
    return "Este celular não aceita a confirmação por biometria.";
  }
  return "Não foi possível confirmar com o celular. Tente de novo.";
}
