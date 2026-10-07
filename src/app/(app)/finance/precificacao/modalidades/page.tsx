"use client";

import { useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DialogModalidade } from "@/components/finance/precificacao/dialog-modalidade";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { BotaoDeIcone, CartaoDaLista } from "@/components/rh/lista-movel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarAlunos, formatarInteiro } from "@/lib/finance/precificacao-formatar";
import {
  ROTULO_DA_ORIENTACAO,
  rotuloDoPeriodo,
  useExcluirModalidade,
  useModalidades,
  type Modalidade,
} from "@/lib/finance/use-precificacao";

/** "8 horas · Entrada fixa" / "Integral". */
function descreverPeriodo(m: Modalidade): string {
  const periodo = rotuloDoPeriodo(m.periodo);
  return m.orientacao ? `${periodo} · ${ROTULO_DA_ORIENTACAO[m.orientacao] ?? m.orientacao}` : periodo;
}

function EtiquetaDaSituacao({ ativa }: { ativa: boolean }) {
  return ativa ? <Badge variant="success">Ativa</Badge> : <Badge variant="waiting">Desativada</Badge>;
}

/**
 * Modalidades: os jeitos de a criança ficar na escola (integral, 8 horas, meio período...). A lista
 * nasce dos períodos que os alunos já têm; aqui a escola ajusta horas, refeições e atividades, que
 * são o que divide o custo entre as modalidades no estudo de precificação.
 */
export default function ModalidadesPage() {
  const { data, isLoading, isError, refetch } = useModalidades();
  const excluir = useExcluirModalidade();
  // `undefined` fecha o diálogo; `null` abre para criar; uma modalidade abre para editar.
  const [editando, setEditando] = useState<Modalidade | null | undefined>(undefined);
  const [excluindo, setExcluindo] = useState<Modalidade | null>(null);

  const lista = [...(data ?? [])].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast.success("Modalidade excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a modalidade.");
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Precificação"
        eyebrowHref="/finance/precificacao"
        titulo="Modalidades"
        apoio="Cada modalidade é um jeito de a criança ficar na escola. O custo é dividido por horas, refeições e atividades."
        acoes={
          <Button variant="action" className="w-full md:w-auto" onClick={() => setEditando(null)}>
            <Plus />
            Nova modalidade
          </Button>
        }
      />

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar as modalidades." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<Layers />}
          titulo="Nenhuma modalidade ainda"
          texto="A lista é montada com os períodos dos alunos. Cadastre uma modalidade para começar."
          textoClassName="max-w-[360px]"
          acao={
            <Button variant="action" onClick={() => setEditando(null)}>
              <Plus />
              Nova modalidade
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((m) => (
              <CartaoDaLista
                key={m.id}
                titulo={m.nome}
                subtitulo={descreverPeriodo(m)}
                etiquetas={<EtiquetaDaSituacao ativa={m.ativa} />}
                detalhes={
                  <>
                    <span className="flex justify-between gap-2">
                      <span>Horas por dia</span>
                      <span className="font-mono text-foreground tabular-nums">{formatarAlunos(m.horasPorDia)} h</span>
                    </span>
                    <span className="flex justify-between gap-2">
                      <span>Refeições por dia</span>
                      <span className="font-mono text-foreground tabular-nums">{formatarInteiro(m.refeicoesIncluidas)}</span>
                    </span>
                    <span className="flex justify-between gap-2">
                      <span>Atividades extras</span>
                      <span className="text-foreground">{m.atividadesExtrasIncluidas ? "Inclui" : "Não inclui"}</span>
                    </span>
                  </>
                }
                acoes={
                  <>
                    <BotaoDeIcone rotulo={`Editar ${m.nome}`} icone={<Pencil />} onClick={() => setEditando(m)} />
                    <BotaoDeIcone rotulo={`Excluir ${m.nome}`} icone={<Trash2 />} perigo onClick={() => setExcluindo(m)} />
                  </>
                }
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Horas por dia</TableHead>
                  <TableHead className="text-right">Refeições por dia</TableHead>
                  <TableHead>Atividades extras</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell>{descreverPeriodo(m)}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatarAlunos(m.horasPorDia)} h
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatarInteiro(m.refeicoesIncluidas)}
                    </TableCell>
                    <TableCell>{m.atividadesExtrasIncluidas ? "Inclui" : "Não inclui"}</TableCell>
                    <TableCell>
                      <EtiquetaDaSituacao ativa={m.ativa} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <BotaoDeIcone rotulo={`Editar ${m.nome}`} icone={<Pencil />} onClick={() => setEditando(m)} />
                        <BotaoDeIcone
                          rotulo={`Excluir ${m.nome}`}
                          icone={<Trash2 />}
                          perigo
                          onClick={() => setExcluindo(m)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {editando !== undefined && <DialogModalidade modalidade={editando} onFechar={() => setEditando(undefined)} />}

      {excluindo && (
        <Confirmacao
          titulo="Excluir esta modalidade?"
          descricao={`"${excluindo.nome}" deixa de existir. Se um estudo aprovado já usa esta modalidade, ela não pode ser excluída: desative em vez de excluir (edite e desmarque "Ativa").`}
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={confirmarExclusao}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </div>
  );
}
