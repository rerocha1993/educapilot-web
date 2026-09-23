"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FileInput, Pencil, Plus, Repeat, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AbasDeFormularios } from "@/components/flow/abas-de-formularios";
import {
  EditorDeRecorrencia,
  rotuloDaFrequencia,
} from "@/components/flow/automacoes-editor-de-recorrencia";
import { EditorDeRegraDeCartao, rotuloDoEvento } from "@/components/flow/automacoes-editor-de-regra";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { formatarData } from "@/lib/format/date";
import {
  useExcluirRecorrencia,
  useExcluirRegraDeCartao,
  useRecorrencias,
  useRegrasDeCartao,
  type Recorrencia,
  type RegraDeCartao,
} from "@/lib/flow/use-tarefas";

/**
 * Automações do quadro de tarefas: o que a escola configura uma vez e o sistema repete sozinho.
 *
 * As duas seções vivem na mesma tela porque respondem à mesma pergunta da secretaria — "de onde
 * vem esse cartão que apareceu no meu quadro?". Um cartão só nasce sozinho por uma destas duas
 * portas, e ela consegue conferir as duas de uma vez.
 */
export default function AutomacoesDeTarefasPage() {
  return (
    <div className="flex flex-col gap-8">
      <AbasDeFormularios />

      <CabecalhoDaPagina
        titulo="Automações"
        apoio="Tarefas que o sistema cria sozinho: as que se repetem no calendário e as que nascem de um formulário que a família enviou."
      />

      <TarefasQueSeRepetem />
      <FormularioViraTarefa />
    </div>
  );
}

/** Cabeçalho de seção: título, uma linha de explicação e o botão que cria. */
function Secao({
  icone,
  titulo,
  apoio,
  acao,
  children,
}: {
  icone: ReactNode;
  titulo: string;
  apoio: string;
  acao: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-heading text-[15.5px] font-semibold">
            <span className="text-muted-foreground [&_svg]:size-4">{icone}</span>
            {titulo}
          </h2>
          <p className="mt-1 max-w-[620px] text-sm leading-[1.55] text-muted-foreground">{apoio}</p>
        </div>
        <div className="shrink-0">{acao}</div>
      </div>
      {children}
    </section>
  );
}

function SituacaoDaAutomacao({ ativa }: { ativa: boolean }) {
  return <Badge variant={ativa ? "success" : "secondary"}>{ativa ? "Ativa" : "Pausada"}</Badge>;
}

// ------------------------------------------------------------- tarefas que se repetem

function TarefasQueSeRepetem() {
  const { data, isLoading, isError, error } = useRecorrencias();
  const excluir = useExcluirRecorrencia();

  const [editando, setEditando] = useState<Recorrencia | "nova" | null>(null);
  const [excluindo, setExcluindo] = useState<Recorrencia | null>(null);

  const recorrencias = data ?? [];

  async function handleExcluir() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast.success(`"${excluindo.titulo}" não vai mais se repetir.`);
      setExcluindo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir a tarefa recorrente.");
    }
  }

  const acoes = (r: Recorrencia) => (
    <>
      <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => setEditando(r)}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setExcluindo(r)}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </>
  );

  return (
    <Secao
      icone={<Repeat />}
      titulo="Tarefas que se repetem"
      apoio="Uma tarefa que volta sempre — conferir a caixa de envios, fechar a chamada do mês. Você configura uma vez, e o cartão aparece sozinho no quadro da pessoa na data certa."
      acao={
        <Button variant="action" onClick={() => setEditando("nova")}>
          <Plus className="size-4" /> Nova tarefa recorrente
        </Button>
      }
    >
      {isError && (
        <div className="rounded-xl border border-destructive-border bg-destructive-soft p-4 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível carregar as tarefas recorrentes."}
        </div>
      )}

      {isLoading && <Skeleton className="h-32 w-full rounded-xl" />}

      {!isLoading && !isError && recorrencias.length === 0 && (
        <EstadoVazio
          icone={<Repeat />}
          titulo="Nenhuma tarefa se repete ainda."
          texto="Comece pelas rotinas que a equipe já faz toda semana sem ninguém lembrar de pedir."
          textoClassName="max-w-[340px]"
          acao={
            <Button onClick={() => setEditando("nova")}>
              <Plus className="size-4" /> Nova tarefa recorrente
            </Button>
          }
        />
      )}

      {recorrencias.length > 0 && (
        <>
          {/* Celular: um cartão por tarefa em vez das seis colunas. */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card md:hidden">
            {recorrencias.map((r) => (
              <div key={r.id} className="flex flex-col gap-1.5 border-b border-border px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 font-medium break-words">{r.titulo}</p>
                  <SituacaoDaAutomacao ativa={r.ativa} />
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">De: </span>
                  {r.responsavelNome}
                </p>
                <p className="text-sm">{rotuloDaFrequencia(r)}</p>
                <p className="text-xs text-muted-foreground">
                  Próxima vez:{" "}
                  <span className="font-mono tabular-nums">{formatarData(r.proximaEm)}</span>
                </p>
                <div className="flex flex-wrap items-center gap-1">{acoes(r)}</div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>De quem é</TableHead>
                  <TableHead>Quando se repete</TableHead>
                  <TableHead>Próxima vez</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recorrencias.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-normal">{r.titulo}</TableCell>
                    <TableCell className="text-sm">{r.responsavelNome}</TableCell>
                    <TableCell className="text-sm whitespace-normal">{rotuloDaFrequencia(r)}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {formatarData(r.proximaEm)}
                    </TableCell>
                    <TableCell>
                      <SituacaoDaAutomacao ativa={r.ativa} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">{acoes(r)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {editando !== null && (
            <EditorDeRecorrencia
              recorrencia={editando === "nova" ? undefined : editando}
              onFechar={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!excluindo} onOpenChange={(aberto) => !aberto && setExcluindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir tarefa recorrente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{excluindo?.titulo}</strong> deixa de nascer de novo. Os cartões que já estão no
            quadro continuam lá. Se for uma pausa, prefira editar e desligar a chave &quot;Ativa&quot;.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={excluir.isPending}>
              {excluir.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Secao>
  );
}

// ------------------------------------------------------------- formulário vira tarefa

function FormularioViraTarefa() {
  const { data, isLoading, isError, error } = useRegrasDeCartao();
  const excluir = useExcluirRegraDeCartao();

  const [editando, setEditando] = useState<RegraDeCartao | "nova" | null>(null);
  const [excluindo, setExcluindo] = useState<RegraDeCartao | null>(null);

  const regras = data ?? [];

  async function handleExcluir() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast.success("Regra excluída. Novos envios deste formulário não viram mais tarefa.");
      setExcluindo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir a regra.");
    }
  }

  const prazo = (r: RegraDeCartao) =>
    r.prazoEmDias == null ? (
      <span className="text-muted-foreground">sem prazo</span>
    ) : (
      <>
        <span className="font-mono tabular-nums">{r.prazoEmDias}</span> dia(s)
      </>
    );

  const acoes = (r: RegraDeCartao) => (
    <>
      <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => setEditando(r)}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setExcluindo(r)}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </>
  );

  return (
    <Secao
      icone={<FileInput />}
      titulo="Formulário vira tarefa"
      apoio="Cada ficha que a família mandar abre um cartão para a pessoa certa conferir, sem ninguém precisar olhar a caixa de envios para descobrir que chegou."
      acao={
        <Button variant="outline" onClick={() => setEditando("nova")}>
          <Plus className="size-4" /> Nova regra
        </Button>
      }
    >
      {isError && (
        <div className="rounded-xl border border-destructive-border bg-destructive-soft p-4 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível carregar as regras."}
        </div>
      )}

      {isLoading && <Skeleton className="h-32 w-full rounded-xl" />}

      {!isLoading && !isError && regras.length === 0 && (
        <EstadoVazio
          icone={<FileInput />}
          titulo="Nenhum formulário vira tarefa ainda."
          texto="Escolha um formulário, diga quem confere e o cartão passa a chegar no quadro dessa pessoa."
          textoClassName="max-w-[340px]"
          acao={
            <Button onClick={() => setEditando("nova")}>
              <Plus className="size-4" /> Nova regra
            </Button>
          }
        />
      )}

      {regras.length > 0 && (
        <>
          {/* Celular: um cartão por regra. O título do cartão é o campo mais longo e fica em
              linha própria, para não ser cortado. */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card md:hidden">
            {regras.map((r) => (
              <div key={r.id} className="flex flex-col gap-1.5 border-b border-border px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 font-medium break-words">{r.formNome}</p>
                  <SituacaoDaAutomacao ativa={r.ativa} />
                </div>
                <p className="text-sm">{rotuloDoEvento(r.evento)}</p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Para: </span>
                  {r.responsavelNome}
                </p>
                <p className="text-xs break-words text-muted-foreground">{r.tituloTemplate}</p>
                <p className="text-xs text-muted-foreground">Prazo: {prazo(r)}</p>
                <div className="flex flex-wrap items-center gap-1">{acoes(r)}</div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formulário</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead>Quem recebe</TableHead>
                  <TableHead>Título do cartão</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-normal">{r.formNome}</TableCell>
                    <TableCell className="text-sm">{rotuloDoEvento(r.evento)}</TableCell>
                    <TableCell className="text-sm">{r.responsavelNome}</TableCell>
                    <TableCell className="text-sm whitespace-normal text-muted-foreground">
                      {r.tituloTemplate}
                    </TableCell>
                    <TableCell className="text-sm">{prazo(r)}</TableCell>
                    <TableCell>
                      <SituacaoDaAutomacao ativa={r.ativa} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">{acoes(r)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {editando !== null && (
            <EditorDeRegraDeCartao
              regra={editando === "nova" ? undefined : editando}
              onFechar={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!excluindo} onOpenChange={(aberto) => !aberto && setExcluindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir regra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Envios de <strong>{excluindo?.formNome}</strong> deixam de virar tarefa. Os cartões já
            criados continuam no quadro, e nenhum envio é apagado.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={excluir.isPending}>
              {excluir.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Secao>
  );
}
