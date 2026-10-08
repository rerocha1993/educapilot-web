"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, LoaderCircle, ScanLine } from "lucide-react";

import { cameraNaPagina } from "@/lib/rh/ponto-do-aparelho";
import { cn } from "@/lib/utils";

import { Aviso, BotaoGrande } from "./pecas";

/** O pouco que usamos do BarcodeDetector nativo (o TypeScript ainda não traz o tipo). */
interface DetectorDeCodigos {
  detect(fonte: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type FabricaDoDetector = (new (opcoes?: { formats: string[] }) => DetectorDeCodigos) & {
  getSupportedFormats?: () => Promise<string[]>;
};

const INTERVALO_DA_LEITURA_MS = 160;
/** Largura máxima do quadro analisado pelo jsQR: acima disso a leitura fica lenta no celular. */
const LARGURA_DA_ANALISE = 640;

const SEM_CAMERA =
  "Este navegador não consegue abrir a câmera. Abra o sistema pelo Chrome ou pelo Safari atualizado.";

function mensagemDaCameraTraseira(erro: unknown): string {
  const nome = erro instanceof DOMException ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return "A câmera está bloqueada neste celular. Libere a câmera nas configurações do navegador para ler o QR.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Não encontramos a câmera deste celular.";
  }
  if (nome === "NotReadableError") {
    return "A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo.";
  }
  return "Não foi possível abrir a câmera.";
}

/** Cria o detector nativo, se o navegador tiver um que leia QR; senão, devolve nulo (usa o jsQR). */
async function detectorNativo(): Promise<DetectorDeCodigos | null> {
  const Fabrica = (window as unknown as { BarcodeDetector?: FabricaDoDetector }).BarcodeDetector;
  if (!Fabrica) return null;
  try {
    const formatos = (await Fabrica.getSupportedFormats?.()) ?? ["qr_code"];
    if (!formatos.includes("qr_code")) return null;
    return new Fabrica({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

/**
 * Lê o QR da recepção com a câmera traseira. Usa o BarcodeDetector do navegador quando existe
 * (rápido, sem biblioteca) e, no resto, o jsQR sobre um quadro do vídeo.
 *
 * Quando acha um código, para a câmera, mostra "Código lido" por um instante e chama `onLido`
 * com o texto. Monte só enquanto precisar: desmontar desliga a câmera.
 */
export function LeitorDeQr({
  onLido,
  onVoltar,
  rotuloDeVoltar = "Voltar",
}: {
  onLido: (texto: string) => void;
  onVoltar: () => void;
  rotuloDeVoltar?: string;
}) {
  const temCamera = cameraNaPagina();
  const [estado, setEstado] = useState<"abrindo" | "lendo" | "lido" | "erro">(temCamera ? "abrindo" : "erro");
  const [mensagem, setMensagem] = useState<string | null>(temCamera ? null : SEM_CAMERA);
  const [tentativa, setTentativa] = useState(0);
  const video = useRef<HTMLVideoElement | null>(null);
  const aoLer = useRef(onLido);

  useEffect(() => {
    aoLer.current = onLido;
  }, [onLido]);

  useEffect(() => {
    if (!cameraNaPagina()) return;

    let vivo = true;
    let stream: MediaStream | null = null;
    let relogio: number | undefined;
    let espera: number | undefined;

    function parar() {
      if (relogio !== undefined) window.clearInterval(relogio);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    async function iniciar() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        if (!vivo) return;
        setMensagem(mensagemDaCameraTraseira(e));
        setEstado("erro");
        return;
      }

      const elemento = video.current;
      if (!vivo || !elemento) {
        parar();
        return;
      }
      elemento.srcObject = stream;
      try {
        await elemento.play();
      } catch {
        // autoplay bloqueado: o atributo autoPlay do <video> costuma resolver; segue.
      }
      if (!vivo) return;
      setEstado("lendo");

      const nativo = await detectorNativo();
      const quadro = document.createElement("canvas");
      const contexto = quadro.getContext("2d", { willReadFrequently: true });
      let jsQR: ((dados: Uint8ClampedArray, largura: number, altura: number) => { data: string } | null) | null =
        null;
      if (!nativo) jsQR = (await import("jsqr")).default;
      if (!vivo) return;

      let ocupado = false;
      relogio = window.setInterval(async () => {
        if (ocupado || !vivo || elemento.readyState < 2 || elemento.videoWidth === 0) return;
        ocupado = true;
        try {
          let texto: string | null = null;
          if (nativo) {
            const achados = await nativo.detect(elemento);
            texto = achados[0]?.rawValue ?? null;
          } else if (jsQR && contexto) {
            const escala = Math.min(1, LARGURA_DA_ANALISE / elemento.videoWidth);
            quadro.width = Math.round(elemento.videoWidth * escala);
            quadro.height = Math.round(elemento.videoHeight * escala);
            contexto.drawImage(elemento, 0, 0, quadro.width, quadro.height);
            const imagem = contexto.getImageData(0, 0, quadro.width, quadro.height);
            texto = jsQR(imagem.data, imagem.width, imagem.height)?.data ?? null;
          }

          if (texto && vivo) {
            vivo = false;
            parar();
            setEstado("lido");
            const lido = texto;
            // Um respiro para a pessoa ver o "Código lido" antes de a tela seguir.
            espera = window.setTimeout(() => aoLer.current(lido), 700);
          }
        } catch {
          // quadro ruim (câmera ainda abrindo): tenta o próximo
        } finally {
          ocupado = false;
        }
      }, INTERVALO_DA_LEITURA_MS);
    }

    void iniciar();

    return () => {
      vivo = false;
      parar();
      if (espera !== undefined) window.clearTimeout(espera);
    };
  }, [tentativa]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-[1.55]">
        Aponte a câmera para o QR que está na tela da recepção. O código muda a cada poucos segundos, então leia na
        hora.
      </p>

      {estado !== "erro" && (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            className={cn("aspect-square max-h-[55dvh] w-full object-cover", estado === "lido" && "opacity-30")}
          />

          {estado === "lendo" && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[14%] rounded-3xl border-4 border-white/80"
            />
          )}

          {estado === "abrindo" && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-white" role="status">
              <span className="flex flex-col items-center gap-2 text-sm">
                <LoaderCircle className="size-8 animate-spin" aria-hidden />
                Abrindo a câmera...
              </span>
            </div>
          )}

          {estado === "lido" && (
            <div className="absolute inset-0 grid place-items-center text-white" role="status">
              <span className="flex flex-col items-center gap-2 text-lg font-semibold">
                <CircleCheck className="size-14" aria-hidden />
                Código lido ✓
              </span>
            </div>
          )}
        </div>
      )}

      {estado === "lendo" && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
          <ScanLine className="size-4" aria-hidden />
          Procurando o QR...
        </p>
      )}

      {estado === "erro" && mensagem && <Aviso tom="atencao">{mensagem}</Aviso>}

      <div className="flex flex-col gap-2">
        {estado === "erro" && temCamera && (
          <BotaoGrande
            variant="action"
            onClick={() => {
              setMensagem(null);
              setEstado("abrindo");
              setTentativa((t) => t + 1);
            }}
          >
            Tentar de novo
          </BotaoGrande>
        )}
        {estado !== "lido" && (
          <BotaoGrande variant="ghost" onClick={onVoltar}>
            {rotuloDeVoltar}
          </BotaoGrande>
        )}
      </div>
    </div>
  );
}
