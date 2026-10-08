"use client";

import { useState } from "react";
import { CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import {
  ROTULO_DO_AFASTAMENTO,
  useAfastamentos,
  useExcluirAfastamento,
  type Afastamento,
} from "@/lib/rh/use-rh";

import { ErroDeCarga } from "./campo";
import { Confirmacao } from "./confirmacao";
import { DialogAfastamento } from "./dialog-afastamento";
import { BotaoDeIcone, CartaoDaLista } from "./lista-movel";
import { SeletorDeAno } from "./seletor-de-ano";
import { SeletorDeFuncionario, TODOS_OS_FUNCIONARIOS } from "./seletor-de-funcionario";

type Dialogo =
  | { tipo: "afastamento"; afastamento: Afastamento | null }
  | { tipo: "excluir"; afastamento: Afastamento };

const periodo = (a: Afastamento) =>
  a.inicio === a.fim ? formatarSoData(a.inicio) : `${formatarSoData(a.inicio)} a ${formatarSoData(a.fim)}`;

/**
 * Afastamentos por funcionário e ano. Serve a página Afastamentos e a aba da ficha
 * (`funcionarioFixo`). Sem os botões de escrita para quem só lê.
 */
export function PainelDeAfastamentos({ funcionarioFixo }: { funcionarioFixo?: string }) {
  const podeEscrever = usePodeEscreverNoRh();
  const [filtro, setFiltro] = useState(TODOS_OS_FUNCIONARIOS);
  const [ano, setAno] = useState(() => Number(hojeIsoBrasilia().slice(0, 4)));
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const funcionarioId = funcionarioFixo ?? (filtro === TODOS_OS_FUNCIONARIOS ? null : filtro);
  const { data, isLoading, isError, refetch } = useAfastamentos(funcionarioId, ano);
  const excluir = useExcluirAfastamento();

  const lista = data ?? [];
  const mostraNome = !funcionarioFixo;

  async function confirmarExclusao(a: Afastamento) {
    try {
      await excluir.mutateAsync(a.id);
      toast.success("Afastamento excluído.");
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o afastamento.");
    }
  }

  const acoes = (a: Afastamento) =>
    podeEscrever && (
      <>
        <BotaoDeIcone
          rotulo="Editar afastamento"
          icone={<Pencil />}
          onClick={() => setDialogo({ tipo: "afastamento", afastamento: a })}
        />
        <BotaoDeIcone
          rotulo="Excluir afastamento"
          icone={<Trash2 />}
          perigo
          onClick={() => setDialogo({ tipo: "excluir", afastamento: a })}
        />
      </>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {!funcionarioFixo && (
            <SeletorDeFuncionario
              valor={filtro}
              onChange={setFiltro}
              apenasAtivos={false}
              rotuloDeTodos="Todos os funcionários"
            />
          )}
          <SeletorDeAno valor={ano} onChange={setAno} />
        </div>
        {podeEscrever && (
          <Button variant="action" onClick={() => setDialogo({ tipo: "afastamento", afastamento: null })}>
            <Plus />
            Novo afastamento
          </Button>
        )}
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os afastamentos." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<CalendarOff />}
          titulo={`Nenhum afastamento em ${ano}`}
          texto="Férias, licenças, folgas e suspensões aparecem aqui."
          acao={
            podeEscrever && (
              <Button variant="outline" onClick={() => setDialogo({ tipo: "afastamento", afastamento: null })}>
                <Plus />
                Novo afastamento
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((a) => (
              <CartaoDaLista
                key={a.id}
                titulo={mostraNome ? a.funcionarioNome : periodo(a)}
                subtitulo={mostraNome ? periodo(a) : undefined}
                etiquetas={
                  <>
                    <Badge variant="waiting">{ROTULO_DO_AFASTAMENTO[a.tipo]}</Badge>
                    <Badge variant="secondary">
                      {a.dias} {a.dias === 1 ? "dia" : "dias"}
                    </Badge>
                  </>
                }
                detalhes={a.observacao ? <span>{a.observacao}</span> : undefined}
                acoes={acoes(a) || undefined}
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {mostraNome && <TableHead>Funcionário</TableHead>}
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead>Observação</TableHead>
                  {podeEscrever && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((a) => (
                  <TableRow key={a.id}>
                    {mostraNome && <TableCell className="font-medium">{a.funcionarioNome}</TableCell>}
                    <TableCell>
                      <Badge variant="waiting">{ROTULO_DO_AFASTAMENTO[a.tipo]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{periodo(a)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{a.dias}</TableCell>
                    <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                      {a.observacao ?? "—"}
                    </TableCell>
                    {podeEscrever && (
                      <TableCell>
                        <div className="flex justify-end gap-1">{acoes(a)}</div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {dialogo?.tipo === "afastamento" && (
        <DialogAfastamento
          afastamento={dialogo.afastamento}
          funcionarioFixo={funcionarioFixo}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "excluir" && (
        <Confirmacao
          titulo="Excluir este afastamento?"
          descricao={`${dialogo.afastamento.funcionarioNome}, ${ROTULO_DO_AFASTAMENTO[dialogo.afastamento.tipo]}, ${periodo(dialogo.afastamento)}.`}
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={() => confirmarExclusao(dialogo.afastamento)}
          onFechar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}
