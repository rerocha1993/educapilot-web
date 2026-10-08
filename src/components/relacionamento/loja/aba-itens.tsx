"use client";

import { useState } from "react";
import { ImageOff, Package, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DialogItemDaLoja } from "@/components/relacionamento/loja/dialog-item";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { FotoAutenticada } from "@/components/relacionamento/foto-autenticada";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  baixarFotoDoItem,
  useAlternarItemDaLoja,
  useExcluirItemDaLoja,
  useItensDaLoja,
  type ItemDaLoja,
} from "@/lib/relacionamento/use-loja";
import { ROTULO_DA_CATEGORIA } from "@/lib/relacionamento/use-portal-pagamentos";
import { cn } from "@/lib/utils";

const FILTROS = [
  { id: "todos", rotulo: "Todos" },
  { id: "ativos", rotulo: "Ativos" },
  { id: "inativos", rotulo: "Inativos" },
] as const;

type Filtro = (typeof FILTROS)[number]["id"];

type Dialogo =
  | { tipo: "novo" }
  | { tipo: "editar"; item: ItemDaLoja }
  | { tipo: "alternar"; item: ItemDaLoja }
  | { tipo: "excluir"; item: ItemDaLoja };

function estoqueEmTexto(i: ItemDaLoja): string {
  if (i.estoque === null) return "Sem limite de estoque";
  if (i.estoque === 0) return "Esgotado";
  return `${i.estoque} em estoque`;
}

function turmasEmTexto(i: ItemDaLoja): string {
  return i.turmas.length === 0 ? "Todas as turmas" : i.turmas.map((t) => t.nome).join(", ");
}

/** Itens da loja em grade: foto, preço, estoque, turmas e as ações de cada um. */
export function AbaItens() {
  const { data, isLoading, isError, refetch } = useItensDaLoja();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  // Trocar a foto de um item não muda o id: a versão entra na chave do cache da imagem.
  const [versoes, setVersoes] = useState<Record<string, number>>({});

  const lista = (data ?? []).filter((i) => filtro === "todos" || (filtro === "ativos" ? i.ativo : !i.ativo));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado rotulo="Situação dos itens" opcoes={FILTROS} valor={filtro} onChange={setFiltro} className="max-md:w-full" cheio />
        <Button variant="action" className="max-md:w-full" onClick={() => setDialogo({ tipo: "novo" })}>
          <Plus />
          Novo item
        </Button>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os itens da loja." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<Package />}
          titulo={filtro === "todos" ? "A loja ainda está vazia" : "Nenhum item nesta situação"}
          texto={
            filtro === "todos"
              ? "Cadastre o material didático, as taxas e o uniforme. As famílias pedem e pagam pelo portal."
              : undefined
          }
          textoClassName="max-w-[380px]"
          acao={
            filtro === "todos" ? (
              <Button variant="action" onClick={() => setDialogo({ tipo: "novo" })}>
                <Plus />
                Novo item
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setFiltro("todos")}>
                Ver todos
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {lista.map((i) => (
            <li key={i.id}>
              <article className={cn("flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card", !i.ativo && "opacity-75")}>
                <div className="aspect-square w-full bg-muted">
                  {i.temFoto ? (
                    <FotoAutenticada
                      baixar={baixarFotoDoItem}
                      fotoId={`${i.id}~${versoes[i.id] ?? 0}`}
                      variante="thumb"
                      rotulo={`Foto de ${i.nome}`}
                      className="size-full"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <ImageOff aria-hidden className="size-7" />
                      <span className="sr-only">Sem foto</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="waiting">{ROTULO_DA_CATEGORIA[i.categoria]}</Badge>
                    <Badge variant={i.ativo ? "success" : "secondary"}>{i.ativo ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <p className="font-medium break-words">{i.nome}</p>
                  <p className="font-mono text-[15px] font-semibold tabular-nums">{formatarMoeda(i.preco)}</p>
                  <p className={cn("text-[13px]", i.estoque === 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
                    {estoqueEmTexto(i)}
                  </p>
                  <p className="text-[13px] break-words text-muted-foreground">{turmasEmTexto(i)}</p>
                </div>

                <div className="flex flex-wrap justify-end gap-1 border-t border-border p-2">
                  <Button variant="outline" size="sm" onClick={() => setDialogo({ tipo: "editar", item: i })}>
                    <Pencil />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDialogo({ tipo: "alternar", item: i })}>
                    <Power />
                    {i.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    aria-label={`Excluir ${i.nome}`}
                    title="Excluir"
                    onClick={() => setDialogo({ tipo: "excluir", item: i })}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {(dialogo?.tipo === "novo" || dialogo?.tipo === "editar") && (
        <DialogItemDaLoja
          item={dialogo.tipo === "editar" ? dialogo.item : undefined}
          onFechar={() => setDialogo(null)}
          onFotoEnviada={(id) => setVersoes((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }))}
        />
      )}
      {dialogo?.tipo === "alternar" && <AlternarItem item={dialogo.item} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "excluir" && <ExcluirItem item={dialogo.item} onFechar={() => setDialogo(null)} />}
    </div>
  );
}

function AlternarItem({ item, onFechar }: { item: ItemDaLoja; onFechar: () => void }) {
  const alternar = useAlternarItemDaLoja();

  async function confirmar() {
    try {
      await alternar.mutateAsync({ id: item.id, ativar: !item.ativo });
      toast.success(item.ativo ? "Item desativado." : "Item ativado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mudar o item.");
    }
  }

  return (
    <Confirmacao
      titulo={item.ativo ? "Desativar este item?" : "Ativar este item?"}
      descricao={
        item.ativo
          ? `"${item.nome}" some da loja das famílias. Os pedidos já feitos não mudam.`
          : `"${item.nome}" volta a aparecer na loja das famílias.`
      }
      rotuloConfirmar={item.ativo ? "Desativar" : "Ativar"}
      pendente={alternar.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}

function ExcluirItem({ item, onFechar }: { item: ItemDaLoja; onFechar: () => void }) {
  const excluir = useExcluirItemDaLoja();

  async function confirmar() {
    try {
      await excluir.mutateAsync(item.id);
      toast.success("Item excluído.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o item.");
    }
  }

  return (
    <Confirmacao
      titulo="Excluir este item?"
      descricao={`"${item.nome}" é removido da loja. Se já houver pedidos com ele, o servidor pode recusar: nesse caso, desative o item.`}
      rotuloConfirmar="Excluir item"
      perigosa
      pendente={excluir.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}
