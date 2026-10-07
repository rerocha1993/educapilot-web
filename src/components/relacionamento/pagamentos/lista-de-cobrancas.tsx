"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";

import { EtiquetaDaCobranca } from "@/components/finance/projetos/comum";
import {
  AcoesDaCobranca,
  CarteiraDaCobranca,
  DetalheDaFonte,
  DialogosDaCobranca,
  EtiquetaDaFonte,
  type DialogoDeCobranca,
} from "@/components/relacionamento/pagamentos/acoes-da-cobranca";
import type { FiltrosDeCobranca } from "@/components/relacionamento/pagamentos/filtros-de-cobranca";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rotuloDaForma } from "@/lib/finance/use-recibos";
import { formatarSoData } from "@/lib/format/date";
import { formatarMoeda } from "@/lib/rh/formatar";
import { TAMANHOS_DA_PAGINA, useCobrancasDaEscola } from "@/lib/relacionamento/use-pagamentos";
import { cn } from "@/lib/utils";

/**
 * Lista paginada de cobranças de uma visão (Individual ou Recorrente): tabela no computador,
 * cartões no celular, com a fonte de cada cobrança. Filtro e paginação são do servidor.
 *
 * `semNenhuma` é o estado vazio de quando a escola ainda não tem cobrança alguma (sem filtro).
 */
export function ListaDeCobrancas({
  f,
  semNenhuma,
}: {
  f: FiltrosDeCobranca;
  semNenhuma: { titulo: string; texto?: string; acao?: ReactNode };
}) {
  const [dialogo, setDialogo] = useState<DialogoDeCobranca | null>(null);
  const recorrente = f.tipo === "recorrente";

  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useCobrancasDaEscola(
    f.filtroDoServidor,
    f.pagina,
    f.tamanho
  );

  const lista = data?.itens ?? [];
  const total = data?.total ?? 0;
  const ultimaPagina = Math.max(1, Math.ceil(total / f.tamanho));
  const primeiroDaPagina = total === 0 ? 0 : (f.pagina - 1) * f.tamanho + 1;
  const ultimoDaPagina = Math.min(f.pagina * f.tamanho, total);
  const atualizando = isFetching && isPlaceholderData;

  if (isError) return <ErroDeCarga texto="Não foi possível carregar as cobranças." onTentar={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="grid gap-2" aria-busy>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (total > 0 && lista.length === 0) {
    return (
      <EstadoVazio
        icone={<Receipt />}
        titulo="Esta página ficou vazia"
        texto="As cobranças mudaram e a lista ficou menor."
        textoClassName="max-w-[380px]"
        acao={
          <Button variant="outline" onClick={() => f.irParaPagina(ultimaPagina)}>
            Ir para a última página
          </Button>
        }
      />
    );
  }

  if (lista.length === 0) {
    return f.filtrando ? (
      <EstadoVazio
        icone={<Receipt />}
        titulo="Nenhuma cobrança com esses filtros"
        texto="Mude o período ou tire algum filtro para ver mais."
        textoClassName="max-w-[380px]"
        acao={
          <Button variant="outline" onClick={f.limpar}>
            Ver todas as cobranças
          </Button>
        }
      />
    ) : (
      <EstadoVazio
        icone={<Receipt />}
        titulo={semNenhuma.titulo}
        texto={semNenhuma.texto}
        textoClassName="max-w-[380px]"
        acao={semNenhuma.acao}
      />
    );
  }

  return (
    <div className={cn("grid gap-3 transition-opacity", atualizando && "opacity-60")} aria-busy={atualizando}>
      <div className="flex flex-col gap-2 md:hidden">
        {lista.map((x) => (
          <CartaoDaLista
            key={x.id}
            titulo={x.nomeDoResponsavel}
            subtitulo={[x.alunoNome, x.descricao].filter(Boolean).join(" · ")}
            etiquetas={<EtiquetaDaCobranca status={x.status} />}
            detalhes={
              <>
                <Linha rotulo="Valor" valor={formatarMoeda(x.valor)} forte />
                <Linha rotulo="Vencimento" valor={formatarSoData(x.vencimento)} />
                {x.status === "Paga" && (
                  <Linha rotulo="Pagamento" valor={`${formatarSoData(x.pagaEm)} · ${rotuloDaForma(x.formaDePagamento ?? undefined)}`} />
                )}
                <span className="flex items-center justify-between gap-2">
                  <span>Carteira</span>
                  <CarteiraDaCobranca cobranca={x} />
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span>{recorrente ? "Plano" : "Origem"}</span>
                  <span className="min-w-0 text-right">
                    <EtiquetaDaFonte cobranca={x} />
                    <DetalheDaFonte cobranca={x} />
                  </span>
                </span>
              </>
            }
            acoes={<AcoesDaCobranca cobranca={x} onDialogo={setDialogo} comTexto />}
          />
        ))}
      </div>

      <div className="hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Responsável</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Carteira</TableHead>
              <TableHead>{recorrente ? "Plano" : "Origem"}</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="font-medium whitespace-normal">{x.nomeDoResponsavel}</TableCell>
                <TableCell className="whitespace-normal">{x.alunoNome ?? "—"}</TableCell>
                <TableCell className="max-w-56 whitespace-normal">{x.descricao || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{formatarMoeda(x.valor)}</TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{formatarSoData(x.vencimento)}</TableCell>
                <TableCell>
                  <div className="grid gap-0.5">
                    <EtiquetaDaCobranca status={x.status} />
                    {x.status === "Paga" && (
                      <span className="text-xs text-muted-foreground">
                        {formatarSoData(x.pagaEm)} · {rotuloDaForma(x.formaDePagamento ?? undefined)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <CarteiraDaCobranca cobranca={x} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <EtiquetaDaFonte cobranca={x} />
                  <DetalheDaFonte cobranca={x} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    <AcoesDaCobranca cobranca={x} onDialogo={setDialogo} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <nav aria-label="Páginas de cobranças" className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          Mostrando {primeiroDaPagina}–{ultimoDaPagina} de {total}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Por página
            <Select
              value={String(f.tamanho)}
              onValueChange={(v) => {
                if (v) f.definirTamanho(Number(v));
              }}
            >
              <SelectTrigger aria-label="Cobranças por página" size="sm" className="w-20">
                <SelectValue>{() => String(f.tamanho)}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {TAMANHOS_DA_PAGINA.map((t) => (
                  <SelectItem key={t} value={String(t)}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
            <Button variant="outline" size="sm" disabled={f.pagina <= 1} onClick={() => f.irParaPagina(f.pagina - 1)}>
              <ChevronLeft />
              Anterior
            </Button>
            <span className="px-1 text-xs text-muted-foreground tabular-nums">
              {f.pagina} / {ultimaPagina}
            </span>
            <Button variant="outline" size="sm" disabled={f.pagina >= ultimaPagina} onClick={() => f.irParaPagina(f.pagina + 1)}>
              Próxima
              <ChevronRight />
            </Button>
          </div>
        </div>
      </nav>

      <DialogosDaCobranca dialogo={dialogo} onFechar={() => setDialogo(null)} />
    </div>
  );
}

function Linha({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <span className="flex justify-between gap-2">
      <span>{rotulo}</span>
      <span className={forte ? "font-mono font-semibold text-foreground tabular-nums" : "font-mono tabular-nums"}>{valor}</span>
    </span>
  );
}
