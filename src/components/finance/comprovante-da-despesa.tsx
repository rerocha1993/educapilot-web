"use client";

import { useRef, useState } from "react";
import { Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { abrirComprovanteDaDespesa, useAnexarComprovanteDaDespesa } from "@/lib/finance/use-expenses";
import { ACEITA_ARQUIVO, problemaDoArquivo } from "@/lib/rh/use-rh";

/**
 * O comprovante de uma despesa: o clipe abre o arquivo quando já existe, e o botão anexa (ou
 * troca) a foto ou o PDF. `anexadoAgora` cobre o intervalo até a lista voltar do servidor com o
 * campo atualizado.
 */
export function ComprovanteDaDespesa({
  despesaId,
  nome,
  temComprovante,
  className,
  compacto = false,
}: {
  despesaId: string;
  nome: string;
  temComprovante: boolean;
  className?: string;
  /** Na tabela os botões são só ícone; no cartão do celular levam o texto. */
  compacto?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const anexar = useAnexarComprovanteDaDespesa();
  const [abrindo, setAbrindo] = useState(false);
  const [anexadoAgora, setAnexadoAgora] = useState(false);
  const tem = temComprovante || anexadoAgora;

  async function abrir() {
    // A aba abre agora, no clique: depois da espera da rede o navegador a bloquearia.
    const aba = window.open("", "_blank");
    setAbrindo(true);
    try {
      await abrirComprovanteDaDespesa(despesaId, `comprovante-${nome}`, aba);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o comprovante.");
    } finally {
      setAbrindo(false);
    }
  }

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    // Limpa para o mesmo arquivo poder ser escolhido de novo depois de um erro.
    e.target.value = "";
    if (!arquivo) return;

    const problema = problemaDoArquivo(arquivo);
    if (problema) return void toast.error(problema);

    try {
      await anexar.mutateAsync({ id: despesaId, arquivo });
      setAnexadoAgora(true);
      toast.success("Comprovante anexado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível anexar o comprovante.");
    }
  }

  const rotuloAnexar = tem ? "Trocar comprovante" : "Anexar comprovante";

  return (
    <div className={className}>
      <input
        ref={entrada}
        type="file"
        accept={ACEITA_ARQUIVO}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Arquivo do comprovante de ${nome}`}
        onChange={escolher}
      />

      {tem && (
        <Button
          variant="outline"
          size={compacto ? "icon" : "sm"}
          aria-label={`Ver comprovante de ${nome}`}
          title="Ver comprovante"
          disabled={abrindo}
          onClick={abrir}
        >
          <Paperclip />
          {!compacto && "Ver comprovante"}
        </Button>
      )}

      <Button
        variant="outline"
        size={compacto ? "icon" : "sm"}
        aria-label={`${rotuloAnexar} de ${nome}`}
        title={rotuloAnexar}
        disabled={anexar.isPending}
        onClick={() => entrada.current?.click()}
      >
        <Upload />
        {compacto ? null : anexar.isPending ? "Enviando..." : rotuloAnexar}
      </Button>
    </div>
  );
}
