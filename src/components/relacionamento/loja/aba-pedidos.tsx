"use client";

import { useState } from "react";
import { ExternalLink, PackageCheck, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarData } from "@/lib/format/date";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  useCancelarPedidoDaEscola,
  useEntregarPedido,
  usePedidosDaLoja,
  type PedidoDaEscola,
} from "@/lib/relacionamento/use-loja";
import {
  ROTULO_DO_STATUS_DO_PEDIDO,
  STATUS_DO_PEDIDO,
  type StatusDoPedido,
} from "@/lib/relacionamento/use-portal-pagamentos";

const TODOS = "todos";

const VARIANTE: Record<StatusDoPedido, "pending" | "waiting" | "success" | "secondary"> = {
  AguardandoPagamento: "pending",
  Pago: "waiting",
  Entregue: "success",
  Cancelado: "secondary",
};

export function EtiquetaDoPedido({ status }: { status: StatusDoPedido }) {
  return <Badge variant={VARIANTE[status]}>{ROTULO_DO_STATUS_DO_PEDIDO[status]}</Badge>;
}

function itensEmTexto(p: PedidoDaEscola): string {
  return p.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ") || "—";
}

type Dialogo = { tipo: "entregar"; pedido: PedidoDaEscola } | { tipo: "cancelar"; pedido: PedidoDaEscola };

/** Pedidos das famílias: filtros, link da cobrança e as duas ações (entregar e cancelar). */
export function AbaPedidos() {
  const [status, setStatus] = useState<string>(TODOS);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const periodoInvertido = de !== "" && ate !== "" && de > ate;
  const { data, isLoading, isError, refetch } = usePedidosDaLoja({
    status: status === TODOS ? null : (status as StatusDoPedido),
    de: periodoInvertido ? "" : de,
    ate: periodoInvertido ? "" : ate,
  });

  const filtrando = status !== TODOS || de !== "" || ate !== "";
  const lista = data ?? [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2.5 sm:grid-cols-3 lg:max-w-2xl">
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger aria-label="Filtrar por situação" className="w-full">
            <SelectValue>{() => (status === TODOS ? "Todas as situações" : ROTULO_DO_STATUS_DO_PEDIDO[status as StatusDoPedido])}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODOS}>Todas as situações</SelectItem>
            {STATUS_DO_PEDIDO.map((s) => (
              <SelectItem key={s} value={s}>
                {ROTULO_DO_STATUS_DO_PEDIDO[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Pedidos de
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} aria-invalid={periodoInvertido || undefined} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          até
          <Input type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} aria-invalid={periodoInvertido || undefined} />
        </label>
      </div>
      {periodoInvertido && (
        <p role="alert" className="-mt-2 text-sm text-destructive">
          A data final vem antes da inicial; o período foi ignorado.
        </p>
      )}

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os pedidos." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<ShoppingBag />}
          titulo={filtrando ? "Nenhum pedido com esses filtros" : "Nenhum pedido ainda"}
          texto={filtrando ? undefined : "Quando uma família pedir pela loja do portal, o pedido aparece aqui."}
          textoClassName="max-w-[340px]"
          acao={
            filtrando ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus(TODOS);
                  setDe("");
                  setAte("");
                }}
              >
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((p) => (
              <CartaoDaLista
                key={p.id}
                titulo={`Pedido ${p.numero} · ${p.nomeDoResponsavel}`}
                subtitulo={p.alunoNome ?? undefined}
                etiquetas={<EtiquetaDoPedido status={p.status} />}
                detalhes={
                  <>
                    <span className="break-words">{itensEmTexto(p)}</span>
                    <span className="flex justify-between gap-2">
                      <span>Total</span>
                      <span className="font-mono font-semibold text-foreground tabular-nums">{formatarMoeda(p.total)}</span>
                    </span>
                    <span className="flex justify-between gap-2">
                      <span>Feito em</span>
                      <span className="tabular-nums">{formatarData(p.criadoEm)}</span>
                    </span>
                    {p.cobranca?.asaasInvoiceUrl && (
                      <a
                        href={p.cobranca.asaasInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1 font-semibold text-primary"
                      >
                        <ExternalLink aria-hidden className="size-3.5" />
                        Ver cobrança<span className="sr-only"> (abre em uma nova aba)</span>
                      </a>
                    )}
                  </>
                }
                acoes={<Acoes pedido={p} onDialogo={setDialogo} />}
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Feito em</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm tabular-nums">{p.numero}</TableCell>
                    <TableCell className="font-medium whitespace-normal">{p.nomeDoResponsavel}</TableCell>
                    <TableCell className="whitespace-normal">{p.alunoNome ?? "—"}</TableCell>
                    <TableCell className="max-w-60 text-sm whitespace-normal">{itensEmTexto(p)}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{formatarMoeda(p.total)}</TableCell>
                    <TableCell>
                      <EtiquetaDoPedido status={p.status} />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{formatarData(p.criadoEm)}</TableCell>
                    <TableCell className="text-sm">
                      {p.cobranca?.asaasInvoiceUrl ? (
                        <a
                          href={p.cobranca.asaasInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          Abrir
                          <ExternalLink aria-hidden className="size-3.5" />
                          <span className="sr-only"> cobrança do pedido {p.numero} (abre em uma nova aba)</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{p.cobranca ? p.cobranca.status || "Manual" : "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Acoes pedido={p} onDialogo={setDialogo} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {dialogo?.tipo === "entregar" && <EntregarPedido pedido={dialogo.pedido} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "cancelar" && <CancelarPedido pedido={dialogo.pedido} onFechar={() => setDialogo(null)} />}
    </div>
  );
}

function Acoes({ pedido: p, onDialogo }: { pedido: PedidoDaEscola; onDialogo: (d: Dialogo) => void }) {
  const podeEntregar = p.status === "Pago";
  const podeCancelar = p.status === "AguardandoPagamento" || p.status === "Pago";
  if (!podeEntregar && !podeCancelar) return <span className="text-xs text-muted-foreground">Sem ações</span>;

  return (
    <>
      {podeEntregar && (
        <Button variant="outline" size="sm" onClick={() => onDialogo({ tipo: "entregar", pedido: p })}>
          <PackageCheck />
          Entregar
        </Button>
      )}
      {podeCancelar && (
        <Button variant="destructive" size="sm" onClick={() => onDialogo({ tipo: "cancelar", pedido: p })}>
          <X />
          Cancelar
        </Button>
      )}
    </>
  );
}

function EntregarPedido({ pedido: p, onFechar }: { pedido: PedidoDaEscola; onFechar: () => void }) {
  const entregar = useEntregarPedido();

  async function confirmar() {
    try {
      await entregar.mutateAsync(p.id);
      toast.success(`Pedido ${p.numero} marcado como entregue.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível marcar como entregue.");
    }
  }

  return (
    <Confirmacao
      titulo="Marcar como entregue?"
      descricao={`Pedido ${p.numero} de ${p.nomeDoResponsavel}: ${itensEmTexto(p)}.`}
      rotuloConfirmar="Marcar entregue"
      pendente={entregar.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}

function CancelarPedido({ pedido: p, onFechar }: { pedido: PedidoDaEscola; onFechar: () => void }) {
  const cancelar = useCancelarPedidoDaEscola();

  async function confirmar() {
    try {
      await cancelar.mutateAsync(p.id);
      toast.success(`Pedido ${p.numero} cancelado.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar o pedido.");
    }
  }

  return (
    <Confirmacao
      titulo="Cancelar este pedido?"
      descricao={`Pedido ${p.numero} de ${p.nomeDoResponsavel} (${formatarMoeda(p.total)}). ${
        p.status === "Pago"
          ? "Este pedido já foi pago: combine o reembolso com a família."
          : "A cobrança do pedido deixa de valer."
      }`}
      rotuloConfirmar="Cancelar pedido"
      perigosa
      pendente={cancelar.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}
