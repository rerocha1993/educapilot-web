"use client";

import { useState } from "react";
import { Paperclip, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { BarraDeProgresso, LinhaComBarra } from "@/components/finance/projetos/comum";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarSoData } from "@/lib/format/date";
import { formatarPercentual } from "@/lib/finance/precificacao-formatar";
import {
  useDespesasDoProjeto,
  useSalvarItens,
  type ProjetoDetalhe,
} from "@/lib/finance/use-projetos";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

/**
 * Execução: o que já saiu, o que já entrou e o que falta comprar.
 *
 * A lista de compras grava na hora (cada marca é um salvamento do orçamento), mas só quando não
 * há edição do orçamento por salvar: salvar os itens do servidor por cima apagaria, para a tela,
 * a diferença que a pessoa ainda não salvou.
 */
export function AbaExecucao({
  projeto,
  edicaoPendente,
  onIrParaComprovantes,
}: {
  projeto: ProjetoDetalhe;
  /** Há item do orçamento editado e não salvo. */
  edicaoPendente: boolean;
  onIrParaComprovantes: () => void;
}) {
  const e = projeto.execucao;
  const receitaPrevista = projeto.orcamento.receitaPrevista;
  const margemReal = e.margemRealPercentual;

  return (
    <div className="grid gap-4">
      <section aria-label="Gasto e arrecadação" className="grid gap-4 rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          <Cartao rotulo="Gasto" valor={formatarMoeda(e.gasto)} />
          <Cartao rotulo="Arrecadado" valor={formatarMoeda(e.arrecadado)} />
          <Cartao rotulo="A receber" valor={formatarMoeda(e.aReceber)} />
          <Cartao rotulo="Saldo" valor={formatarMoeda(e.saldo)} perigo={e.saldo < 0} />
          <Cartao
            rotulo="Margem real"
            valor={margemReal === undefined || margemReal === null ? "—" : formatarPercentual(margemReal)}
            perigo={margemReal !== undefined && margemReal !== null && margemReal < 0}
            dica={`Desejada: ${formatarPercentual(projeto.margemDesejadaPercentual)}`}
          />
        </div>

        <div className="grid gap-3 border-t border-border pt-4 md:grid-cols-2 md:gap-6">
          <div className="grid gap-1.5">
            <LinhaComBarra rotulo="Gasto / orçamento" valor={e.gasto} total={projeto.orcamento.custoTotal} />
            <p className="text-xs text-muted-foreground">
              {formatarPercentual(e.percentualDoOrcamento)} do orçamento
              {e.percentualDoOrcamento > 100 ? ", acima do previsto" : ""}.
            </p>
          </div>
          <LinhaComBarra rotulo="Arrecadado / previsto" valor={e.arrecadado} total={receitaPrevista} inverso />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <ListaDeCompras projeto={projeto} edicaoPendente={edicaoPendente} />
        <DespesasVinculadas projeto={projeto} onIrParaComprovantes={onIrParaComprovantes} />
      </div>
    </div>
  );
}

function Cartao({
  rotulo,
  valor,
  perigo = false,
  dica,
}: {
  rotulo: string;
  valor: string;
  perigo?: boolean;
  dica?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[12.5px] text-muted-foreground">{rotulo}</p>
      <p
        className={cn(
          "mt-0.5 font-heading text-[22px] font-semibold tracking-[-.02em] tabular-nums",
          perigo && "text-destructive"
        )}
      >
        {valor}
      </p>
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  );
}

function ListaDeCompras({ projeto, edicaoPendente }: { projeto: ProjetoDetalhe; edicaoPendente: boolean }) {
  const salvar = useSalvarItens(projeto.id);
  const [gravandoId, setGravandoId] = useState<string | null>(null);

  const itens = projeto.itens;
  const comprados = itens.filter((i) => i.comprado).length;
  const editavel = projeto.status === "Planejamento" && !edicaoPendente;

  async function alternar(id: string, comprado: boolean) {
    setGravandoId(id);
    try {
      await salvar.mutateAsync(
        itens.map((i) => ({
          id: i.id,
          descricao: i.descricao,
          grupo: i.grupo,
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario,
          comprado: i.id === id ? comprado : i.comprado,
          ordem: i.ordem,
          observacao: i.observacao,
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a lista de compras.");
    } finally {
      setGravandoId(null);
    }
  }

  return (
    <section aria-label="Lista de compras" className="rounded-xl border border-border bg-card">
      <div className="grid gap-2 border-b border-border px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-heading text-sm font-semibold">Lista de compras</h3>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {comprados} de {itens.length} comprados
          </span>
        </div>
        <BarraDeProgresso valor={comprados} total={itens.length} rotulo="Itens comprados" inverso />
        {projeto.status === "Orcamento" && (
          <p className="text-xs text-muted-foreground">Aprove o orçamento para começar a marcar o que foi comprado.</p>
        )}
        {projeto.status === "Planejamento" && edicaoPendente && (
          <p className="text-xs text-muted-foreground">
            Salve ou descarte as alterações do orçamento para marcar itens aqui.
          </p>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">O orçamento ainda não tem itens.</p>
      ) : (
        <ul className="divide-y divide-border">
          {itens.map((i) => (
            <li key={i.id}>
              <label
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  editavel && !salvar.isPending ? "cursor-pointer" : "cursor-default"
                )}
              >
                <Checkbox
                  checked={i.comprado}
                  disabled={!editavel || salvar.isPending}
                  onCheckedChange={(v) => alternar(i.id, v === true)}
                  aria-label={`${i.descricao} comprado`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm break-words",
                      i.comprado && "text-muted-foreground line-through"
                    )}
                  >
                    {i.descricao}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {i.quantidade.toLocaleString("pt-BR")} × {formatarMoeda(i.valorUnitario)}
                    {i.grupo ? ` · ${i.grupo}` : ""}
                    {gravandoId === i.id ? " · salvando..." : ""}
                  </span>
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">{formatarMoeda(i.valorTotal)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DespesasVinculadas({
  projeto,
  onIrParaComprovantes,
}: {
  projeto: ProjetoDetalhe;
  onIrParaComprovantes: () => void;
}) {
  const { data, isLoading, isError, refetch } = useDespesasDoProjeto(projeto.id);
  const lista = data ?? [];
  const total = lista.reduce((s, d) => s + d.valor, 0);
  const pendentes = projeto.comprovantes.pendentes;
  const encerrado = projeto.status === "Encerrado";

  return (
    <section aria-label="Despesas vinculadas" className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="font-heading text-sm font-semibold">Despesas vinculadas</h3>
        {!encerrado && (
          <Button variant="outline" size="sm" onClick={onIrParaComprovantes}>
            <Paperclip />
            Enviar comprovante
            {pendentes > 0 && (
              <span className="rounded-md bg-action-soft px-1.5 font-mono text-[11px] text-action-soft-foreground tabular-nums">
                {pendentes}
              </span>
            )}
          </Button>
        )}
      </div>

      {isError ? (
        <div className="p-4">
          <ErroDeCarga texto="Não foi possível carregar as despesas." onTentar={() => refetch()} />
        </div>
      ) : isLoading ? (
        <div className="grid gap-2 p-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : lista.length === 0 ? (
        <div className="p-4">
          <EstadoVazio
            icone={<ReceiptText />}
            titulo="Nenhuma despesa lançada"
            texto="Envie a foto ou o PDF de um comprovante: confirmado, ele vira despesa já ligada a este projeto."
            textoClassName="max-w-[340px]"
          />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border md:hidden">
            {lista.map((d) => (
              <li key={d.expenseId} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{d.descricao}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {formatarSoData(d.data)}
                    {d.fornecedor ? ` · ${d.fornecedor}` : ""}
                    {d.comprovanteId ? " · com comprovante" : ""}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums">{formatarMoeda(d.valor)}</span>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Comprovante</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((d) => (
                  <TableRow key={d.expenseId}>
                    <TableCell className="font-medium whitespace-normal">{d.descricao}</TableCell>
                    <TableCell className="whitespace-normal">{d.fornecedor ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatarSoData(d.data)}</TableCell>
                    <TableCell className="text-center">
                      {d.comprovanteId ? <Paperclip className="mx-auto size-4 text-muted-foreground" /> : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{formatarMoeda(d.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
            <span className="font-heading text-sm font-semibold">Total lançado</span>
            <span className="font-mono text-sm font-semibold tabular-nums">{formatarMoeda(total)}</span>
          </div>
        </>
      )}
    </section>
  );
}
