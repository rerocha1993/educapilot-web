"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ImageOff, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { FotoAutenticada } from "@/components/relacionamento/foto-autenticada";
import { AcoesDoPagamento } from "@/components/relacionamento/portal/pagamentos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatarMoeda } from "@/lib/rh/formatar";
import type { FilhoDoPortal } from "@/lib/relacionamento/use-portal-familia";
import {
  ROTULO_DO_STATUS_DO_PEDIDO,
  baixarFotoDoItemDaFamilia,
  useCriarPedido,
  type ItemDaLojaDaFamilia,
  type PedidoCriado,
  type StatusDoPedido,
} from "@/lib/relacionamento/use-portal-pagamentos";
import { cn } from "@/lib/utils";

/** Quando restam poucas unidades, a família precisa saber que não é para deixar para depois. */
export const LIMITE_DE_ULTIMAS = 5;

const ESTILO_DO_PEDIDO: Record<StatusDoPedido, string> = {
  AguardandoPagamento: "bg-action-soft text-action-soft-foreground",
  Pago: "bg-accent text-accent-foreground",
  Entregue: "bg-success-soft text-success-soft-foreground",
  Cancelado: "bg-muted text-muted-foreground",
};

export function ChipDoPedido({ status }: { status: StatusDoPedido }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        ESTILO_DO_PEDIDO[status]
      )}
    >
      {ROTULO_DO_STATUS_DO_PEDIDO[status]}
    </span>
  );
}

/** Quantas unidades a família ainda pode pôr no carrinho (sem limite = muitas). */
export function maximoDoItem(item: ItemDaLojaDaFamilia): number {
  return item.estoque === null ? 99 : item.estoque;
}

/** O aviso de estoque, ou nulo quando não há o que dizer (estoque folgado ou sem limite). */
function avisoDeEstoque(item: ItemDaLojaDaFamilia): { texto: string; urgente: boolean } | null {
  if (item.estoque === null) return null;
  if (item.estoque <= 0) return { texto: "Esgotado", urgente: true };
  if (item.estoque <= LIMITE_DE_ULTIMAS) {
    return { texto: item.estoque === 1 ? "Última unidade" : `Últimas ${item.estoque}`, urgente: true };
  }
  return null;
}

/** Um item da loja: foto, preço, estoque e o botão que o põe no carrinho (ou o controle de quantidade). */
export function CartaoDoItem({
  item,
  quantidade,
  onMudar,
}: {
  item: ItemDaLojaDaFamilia;
  quantidade: number;
  onMudar: (quantidade: number) => void;
}) {
  const aviso = avisoDeEstoque(item);
  const esgotado = item.estoque !== null && item.estoque <= 0;
  const maximo = maximoDoItem(item);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-square w-full bg-muted">
        {item.temFoto ? (
          <FotoAutenticada
            baixar={baixarFotoDoItemDaFamilia}
            fotoId={item.id}
            variante="thumb"
            rotulo={`Foto de ${item.nome}`}
            className="size-full"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <ImageOff aria-hidden className="size-7" />
            <span className="sr-only">Sem foto</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[14.5px] leading-snug font-semibold break-words">{item.nome}</p>
        {item.descricao && <p className="line-clamp-2 text-[12.5px] leading-snug break-words text-muted-foreground">{item.descricao}</p>}
        {item.turmas.length > 0 && <p className="text-xs text-muted-foreground">{item.turmas.join(", ")}</p>}
        <p className="mt-auto pt-1 font-mono text-[16px] font-semibold tabular-nums">{formatarMoeda(item.preco)}</p>
        {aviso && (
          <p className={cn("text-[12.5px] font-semibold", aviso.urgente ? "text-destructive" : "text-muted-foreground")}>{aviso.texto}</p>
        )}
      </div>

      <div className="border-t border-border p-2">
        {quantidade === 0 ? (
          <Button
            variant="outline"
            className="h-11 w-full text-sm"
            disabled={esgotado}
            onClick={() => onMudar(1)}
            aria-label={`Adicionar ${item.nome} ao carrinho`}
          >
            <Plus aria-hidden />
            Adicionar
          </Button>
        ) : (
          <div role="group" aria-label={`Quantidade de ${item.nome}`} className="flex items-center justify-between gap-1">
            <Button variant="outline" size="icon" className="size-11" aria-label={`Tirar uma unidade de ${item.nome}`} onClick={() => onMudar(quantidade - 1)}>
              <Minus aria-hidden />
            </Button>
            <span aria-live="polite" className="min-w-8 text-center font-mono text-[16px] font-semibold tabular-nums">
              {quantidade}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={`Mais uma unidade de ${item.nome}`}
              disabled={quantidade >= maximo}
              onClick={() => onMudar(quantidade + 1)}
            >
              <Plus aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Fecha o pedido: confere o carrinho, pergunta de qual filho é (quando há mais de um), aceita uma
 * observação e, depois de enviar, mostra como pagar. O carrinho só é esvaziado por quem chama
 * (`onConcluido`), depois da resposta do servidor: falha deixa tudo como estava.
 */
export function DialogDoPedido({
  linhas,
  filhos,
  onFechar,
  onConcluido,
}: {
  linhas: { item: ItemDaLojaDaFamilia; quantidade: number }[];
  filhos: FilhoDoPortal[];
  onFechar: () => void;
  onConcluido: () => void;
}) {
  const criar = useCriarPedido();
  const [filho, setFilho] = useState<number | null>(filhos.length === 1 ? filhos[0].studentId : null);
  const [observacao, setObservacao] = useState("");
  const [criado, setCriado] = useState<PedidoCriado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const total = linhas.reduce((soma, l) => soma + l.item.preco * l.quantidade, 0);

  async function confirmar() {
    if (filhos.length > 1 && filho === null) return setErro("Escolha para qual filho é o pedido.");
    setErro(null);
    try {
      const r = await criar.mutateAsync({
        studentId: filho,
        itens: linhas.map((l) => ({ itemId: l.item.id, quantidade: l.quantidade })),
        observacao,
      });
      setCriado(r);
      onConcluido();
      toast.success(`Pedido ${r.pedido.numero} feito.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível fazer o pedido.");
    }
  }

  if (criado) {
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="size-5 text-success-soft-foreground" />
              Pedido {criado.pedido.numero} feito
            </DialogTitle>
            <DialogDescription>
              Total de {formatarMoeda(criado.pedido.total)}.{" "}
              {criado.pagamento ? "Pague agora ou depois, em Pagamentos." : "Combine o pagamento com a secretaria."}
            </DialogDescription>
          </DialogHeader>
          {criado.pagamento && <AcoesDoPagamento item={criado.pagamento} />}
          <DialogFooter>
            <Link
              href="/responsavel/loja/pedidos"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-input bg-card px-4 text-sm font-medium"
            >
              Ver meus pedidos
            </Link>
            <Button variant="action" className="h-11" onClick={onFechar}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !criar.isPending && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar pedido</DialogTitle>
          <DialogDescription>Confira os itens. O pagamento é feito em seguida, pelo link ou pelo Pix.</DialogDescription>
        </DialogHeader>

        <ul aria-label="Itens do pedido" className="grid gap-1.5 rounded-lg border border-border p-2.5 text-sm">
          {linhas.map((l) => (
            <li key={l.item.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words">
                {l.quantidade}× {l.item.nome}
              </span>
              <span className="shrink-0 font-mono tabular-nums">{formatarMoeda(l.item.preco * l.quantidade)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 border-t border-border pt-1.5 font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatarMoeda(total)}</span>
          </li>
        </ul>

        {filhos.length > 1 && (
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-sm font-medium">Para qual filho?</legend>
            <div className="grid gap-1.5">
              {filhos.map((f) => (
                <label
                  key={f.studentId}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm",
                    filho === f.studentId ? "border-primary bg-accent font-semibold" : "border-border"
                  )}
                >
                  <input
                    type="radio"
                    name="filho-do-pedido"
                    className="size-4 accent-primary"
                    checked={filho === f.studentId}
                    onChange={() => {
                      setFilho(f.studentId);
                      setErro(null);
                    }}
                  />
                  <span className="min-w-0 break-words">
                    {f.nome}
                    {f.turma && <span className="font-normal text-muted-foreground"> · {f.turma}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label className="grid gap-1.5 text-sm font-medium">
          Observação (opcional)
          <Textarea rows={2} maxLength={300} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: tamanho 8" />
        </label>

        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11" disabled={criar.isPending} onClick={onFechar}>
            Voltar
          </Button>
          <Button variant="action" className="h-11" disabled={criar.isPending} onClick={confirmar}>
            {criar.isPending ? "Enviando..." : `Pedir e pagar ${formatarMoeda(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
