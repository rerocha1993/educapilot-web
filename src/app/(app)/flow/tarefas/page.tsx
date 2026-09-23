"use client";

import { useState } from "react";
import { KanbanSquare, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AbasDeFormularios } from "@/components/flow/abas-de-formularios";
import { QuadroKanban, DialogDeLista } from "@/components/flow/quadro-kanban";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { formatarData } from "@/lib/format/date";
import { useCartoesComigo, useMeuQuadro } from "@/lib/flow/use-tarefas";

/**
 * Quadro de tarefas da própria pessoa.
 *
 * Um quadro por pessoa, e não um quadro por assunto: quem abre esta tela quer ver o que é dela
 * hoje. O que é de outra pessoa e envolve você fica em "Comigo", fora do quadro, para não misturar
 * o que você toca com o que você só acompanha.
 */
export default function TarefasPage() {
  const { data: quadro, isLoading, isError, error } = useMeuQuadro();

  const [criandoLista, setCriandoLista] = useState(false);
  const [vendoComigo, setVendoComigo] = useState(false);

  const totalDeCartoes = (quadro?.listas ?? []).reduce((soma, l) => soma + l.cartoes.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <AbasDeFormularios />

      <CabecalhoDaPagina
        titulo="Meu quadro"
        apoio="Suas tarefas, na etapa em que estão. Arraste o cartão entre as listas; no celular, abra o cartão e use “Mover para”."
        acoes={
          <>
            <Button variant="outline" onClick={() => setVendoComigo(true)}>
              <Users className="size-4" /> Comigo
            </Button>
            <Button variant="outline" onClick={() => setCriandoLista(true)}>
              <Plus className="size-4" /> Nova lista
            </Button>
          </>
        }
      />

      {isLoading && (
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-64 w-72 shrink-0 rounded-xl" />
          <Skeleton className="h-64 w-72 shrink-0 rounded-xl" />
          <Skeleton className="h-64 w-72 shrink-0 rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive-border bg-destructive-soft p-4 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível carregar o quadro."}
        </div>
      )}

      {quadro && totalDeCartoes === 0 && (
        <EstadoVazio
          icone={<KanbanSquare />}
          titulo="Nenhum cartão no seu quadro."
          texto={
            quadro.listas.length === 0
              ? "Crie a primeira lista para começar a organizar o que é seu."
              : "Use o “+ Cartão” no pé de uma lista para anotar a primeira tarefa."
          }
          acao={
            quadro.listas.length === 0 ? (
              <Button variant="action" onClick={() => setCriandoLista(true)}>
                <Plus className="size-4" /> Nova lista
              </Button>
            ) : undefined
          }
        />
      )}

      {quadro && quadro.listas.length > 0 && <QuadroKanban quadro={quadro} />}

      {criandoLista && <DialogDeLista onFechar={() => setCriandoLista(false)} />}
      {vendoComigo && <DialogComigo onFechar={() => setVendoComigo(false)} />}
    </div>
  );
}

/**
 * Cartões de outras pessoas em que você entrou como integrante.
 *
 * Só leitura: o cartão é do quadro de quem responde por ele, e mexer daqui esconderia de quem é a
 * tarefa. A lista existe para saber o que está para chegar — e para cobrar, se precisar.
 */
function DialogComigo({ onFechar }: { onFechar: () => void }) {
  const { data: cartoes, isLoading } = useCartoesComigo();

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8">Comigo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Cartões do quadro de outras pessoas em que você está como integrante.
          </p>

          {isLoading && <Skeleton className="h-20 w-full rounded-lg" />}

          {!isLoading && (cartoes ?? []).length === 0 && (
            <EstadoVazio titulo="Nenhum cartão de outra pessoa com você." />
          )}

          {(cartoes ?? []).map((c) => (
            <div key={c.id} className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="text-sm break-words">{c.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {c.responsavelNome}
                {c.prazo && (
                  <>
                    {" · até "}
                    <span className="font-mono tabular-nums">{formatarData(c.prazo)}</span>
                  </>
                )}
              </p>
              {c.etiquetas.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.etiquetas.map((e) => (
                    <span
                      key={e.id}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-px text-[10.5px] text-muted-foreground"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: e.cor }}
                      />
                      {e.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
