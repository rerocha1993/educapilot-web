"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Desenha um QR Code a partir de um texto, num <canvas> que se estica até a largura do pai.
 *
 * Sempre preto sobre branco, com margem: é o que as câmeras leem melhor, e por isso não segue o
 * tema da tela. A biblioteca é carregada só quando um QR é desenhado.
 */
export function QrDesenhado({
  texto,
  rotulo,
  className,
}: {
  texto: string;
  /** Para leitor de tela. */
  rotulo: string;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let vivo = true;

    void import("qrcode")
      .then(async (QRCode) => {
        const alvo = canvas.current;
        if (!vivo || !alvo) return;
        await QRCode.toCanvas(alvo, texto, {
          width: 720,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });
        // A biblioteca fixa o tamanho em pixels; aqui ele acompanha o contêiner.
        alvo.style.width = "100%";
        alvo.style.height = "auto";
      })
      .catch(() => {
        // Sem QR desenhado a tela fica em branco; quem chama já mostra o estado de erro à parte.
      });

    return () => {
      vivo = false;
    };
  }, [texto]);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={rotulo}
      className={cn("block aspect-square w-full rounded-xl bg-white", className)}
    />
  );
}
