"use client";

import { useRef } from "react";
import { Camera, Info, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { CartaoDoComprovante } from "@/components/finance/projetos/cartao-do-comprovante";
import { FaixaDeAviso } from "@/components/finance/projetos/comum";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useComprovantes,
  useDespesasDoProjeto,
  useEnviarComprovante,
  useLeituraAutomatica,
  type ProjetoDetalhe,
} from "@/lib/finance/use-projetos";
import { problemaDoArquivo } from "@/lib/rh/use-rh";

/**
 * Comprovantes de compra: foto ou PDF, lido pelo sistema (quando a leitura automática está
 * configurada) e confirmado por uma pessoa. A leitura só sugere; a despesa nasce na confirmação.
 */
export function AbaComprovantes({ projeto }: { projeto: ProjetoDetalhe }) {
  const entrada = useRef<HTMLInputElement>(null);
  const enviar = useEnviarComprovante(projeto.id);
  const { data: leitura } = useLeituraAutomatica();
  const { data: despesas } = useDespesasDoProjeto(projeto.id);
  const { data, isLoading, isError, refetch } = useComprovantes(projeto.id);

  const encerrado = projeto.status === "Encerrado";
  const lista = [...(data ?? [])].sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
  const despesaDe = new Map((despesas ?? []).map((d) => [d.expenseId, d]));

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    // Limpa para o mesmo arquivo poder ser escolhido de novo depois de um erro.
    e.target.value = "";
    if (!arquivo) return;

    const problema = problemaDoArquivo(arquivo);
    if (problema) return void toast.error(problema);

    try {
      await enviar.mutateAsync(arquivo);
      toast.success("Comprovante enviado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o comprovante.");
    }
  }

  return (
    <div className="grid gap-4">
      {leitura && !leitura.disponivel && (
        <FaixaDeAviso>
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>Leitura automática não configurada: os valores são digitados à mão.</span>
        </FaixaDeAviso>
      )}

      {!encerrado && (
        <section
          aria-label="Enviar comprovante"
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-dashed bg-card px-5 py-6 text-center"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Camera className="size-[18px]" />
          </span>
          <div>
            <p className="font-heading text-[15px] font-semibold">Foto ou PDF do comprovante</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Cupom, nota ou recibo da compra. PDF, JPG ou PNG, até 10 MB.
            </p>
          </div>
          <input
            ref={entrada}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-label="Arquivo do comprovante"
            onChange={escolher}
          />
          <Button
            variant="action"
            className="w-full sm:w-auto"
            disabled={enviar.isPending}
            onClick={() => entrada.current?.click()}
          >
            <Camera />
            {enviar.isPending ? "Enviando..." : "Tirar foto / enviar"}
          </Button>
        </section>
      )}

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os comprovantes." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<ReceiptText />}
          titulo="Nenhum comprovante enviado"
          texto="Envie a foto do cupom ou da nota. Depois de conferir, ele vira despesa deste projeto."
          textoClassName="max-w-[360px]"
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 xl:items-start">
          {lista.map((c) => (
            <CartaoDoComprovante
              key={c.id}
              comprovante={c}
              projeto={projeto}
              despesa={c.expenseId ? despesaDe.get(c.expenseId) : undefined}
              somenteLeitura={encerrado}
            />
          ))}
        </div>
      )}
    </div>
  );
}
