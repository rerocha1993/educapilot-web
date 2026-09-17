"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Caixa para desenhar a assinatura da escola.
 *
 * Existe porque foto de assinatura no papel fica ruim no documento: o papel entra como fundo
 * cinza, a iluminação vira mancha e o traço perde contraste. Desenhado aqui, o PNG sai com fundo
 * transparente e traço limpo — o carimbo pousa sobre o texto do contrato sem retângulo em volta.
 *
 * O desenho nunca vira imagem de fundo: o canvas fica vazio e só recebe os traços, que é o que
 * preserva a transparência no PNG exportado.
 */
export function SignaturePad({
  onConfirmar,
  enviando,
}: {
  onConfirmar: (arquivo: File) => void;
  enviando?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  function posicao(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    // A resolução interna do canvas é maior que a exibida (traço mais nítido no PDF), então a
    // posição do ponteiro precisa ser convertida — sem isto o traço sai deslocado do cursor.
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = posicao(e);

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    ctx.beginPath();
    ctx.moveTo(x, y);

    desenhando.current = true;
    setTemTraco(true);

    // Captura o ponteiro: sem isso, sair da caixa no meio do traço deixa a linha pendurada e o
    // próximo toque continua de onde parou.
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = posicao(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function limpar() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
  }

  function confirmar() {
    canvasRef.current!.toBlob((blob) => {
      if (!blob) return;
      onConfirmar(new File([blob], "assinatura.png", { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={900}
        height={300}
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={() => (desenhando.current = false)}
        onPointerLeave={() => (desenhando.current = false)}
        // touch-none impede a página de rolar enquanto se assina no celular — sem isso, arrastar
        // o dedo move a tela em vez de desenhar.
        className="h-40 w-full touch-none rounded-md border border-border bg-card"
      />

      <p className="text-xs text-muted-foreground">
        Assine com o mouse ou com o dedo. No celular ou tablet fica mais parecido com a assinatura
        real.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={confirmar} disabled={!temTraco || enviando}>
          {enviando ? "Salvando..." : "Usar esta assinatura"}
        </Button>
        <Button variant="outline" onClick={limpar} disabled={!temTraco || enviando}>
          Limpar
        </Button>
      </div>
    </div>
  );
}
