"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const LARGURA_MAXIMA = 720;

/**
 * Tira a foto do visitante pela câmera do computador ou do celular, com envio de arquivo como
 * alternativa.
 *
 * A foto sai como JPEG reduzido a 720px de largura: é o suficiente para reconhecer o rosto na
 * portaria, e uma foto crua de celular passaria do limite de 5 MB do backend.
 */
export function CapturaDeFoto({
  onFotoPronta,
}: {
  /** Chamado com a foto escolhida, ou null quando a pessoa descarta. */
  onFotoPronta: (arquivo: File | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraLigada, setCameraLigada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  function desligarCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraLigada(false);
  }

  useEffect(() => desligarCamera, []);

  useEffect(() => {
    return () => {
      if (previa) URL.revokeObjectURL(previa);
    };
  }, [previa]);

  async function ligarCamera() {
    setErro(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro("Este navegador não dá acesso à câmera. Envie um arquivo de foto.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraLigada(true);
      // O <video> só existe depois do render com cameraLigada = true.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setErro("Não foi possível abrir a câmera. Confira a permissão do navegador ou envie um arquivo.");
    }
  }

  function usar(arquivo: File) {
    setPrevia(URL.createObjectURL(arquivo));
    onFotoPronta(arquivo);
  }

  function tirarFoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const escala = Math.min(1, LARGURA_MAXIMA / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        desligarCamera();
        usar(new File([blob], "foto-visitante.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85
    );
  }

  function descartar() {
    setPrevia(null);
    onFotoPronta(null);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
      <p className="text-xs text-muted-foreground">Foto do visitante</p>

      {previa && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia local, sem otimização */}
          <img src={previa} alt="Prévia da foto" className="size-20 rounded-full object-cover" />
          <Button type="button" variant="ghost" size="sm" onClick={descartar}>
            <RotateCcw /> Tirar outra
          </Button>
        </div>
      )}

      {!previa && cameraLigada && (
        <div className="flex flex-col gap-2">
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-md bg-black object-cover" />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={tirarFoto}>
              <Camera /> Tirar foto
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={desligarCamera}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!previa && !cameraLigada && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={ligarCamera}>
            <Camera /> Abrir câmera
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted md:h-7">
            <ImageUp className="size-3.5" /> Enviar arquivo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="sr-only"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) usar(arquivo);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
