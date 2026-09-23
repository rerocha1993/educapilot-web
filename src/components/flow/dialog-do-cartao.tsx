"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useAdicionarItemDeChecklist,
  useAtualizarCartao,
  useAtualizarItemDeChecklist,
  useCriarEtiqueta,
  useEtiquetas,
  useExcluirCartao,
  useExcluirItemDeChecklist,
  useMoverCartao,
  usePessoasDaEquipe,
  type Cartao,
  type EdicaoDoCartao,
  type Lista,
} from "@/lib/flow/use-tarefas";

/**
 * Paleta fixa da etiqueta.
 *
 * Seis cores e nada de seletor livre: etiqueta serve para bater o olho e reconhecer, e duas cores
 * quase iguais, criadas por pessoas diferentes, acabam com isso.
 */
const CORES = ["#7C3AED", "#2563EB", "#0E9488", "#CA8A04", "#DC2626", "#64748B"];

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label className="text-[10.5px] font-bold tracking-[.14em] uppercase text-muted-foreground">
        {titulo}
      </Label>
      {children}
    </div>
  );
}

/**
 * Cartão aberto: tudo que dá para mudar nele.
 *
 * Cada campo grava sozinho (título e descrição ao sair do campo, o resto no clique) — não existe
 * botão de salvar. O cartão é um bilhete que a equipe mexe o dia inteiro, e uma tela com "salvar"
 * perderia alteração toda vez que alguém fechasse no meio.
 */
export function DialogDoCartao({
  cartao,
  listas,
  onFechar,
}: {
  cartao: Cartao;
  listas: Lista[];
  onFechar: () => void;
}) {
  const { data: etiquetas } = useEtiquetas();
  const { data: pessoas } = usePessoasDaEquipe();

  const atualizar = useAtualizarCartao();
  const mover = useMoverCartao();
  const excluir = useExcluirCartao();
  const criarEtiqueta = useCriarEtiqueta();
  const adicionarItem = useAdicionarItemDeChecklist();
  const atualizarItem = useAtualizarItemDeChecklist();
  const excluirItem = useExcluirItemDeChecklist();

  // Título e descrição são os únicos com estado próprio: gravar a cada tecla mandaria uma
  // requisição por letra.
  const [titulo, setTitulo] = useState(cartao.titulo);
  const [descricao, setDescricao] = useState(cartao.descricao ?? "");

  const [novaEtiqueta, setNovaEtiqueta] = useState("");
  const [corNova, setCorNova] = useState(CORES[0]);
  const [novoItem, setNovoItem] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const etiquetaIds = cartao.etiquetas.map((e) => e.id);
  const integranteIds = cartao.integrantes.map((i) => i.userId);
  const feitos = cartao.checklist.filter((i) => i.feito).length;

  async function salvar(dados: EdicaoDoCartao) {
    try {
      await atualizar.mutateAsync({ id: cartao.id, ...dados });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o cartão.");
    }
  }

  async function alternarEtiqueta(id: string) {
    await salvar({
      etiquetaIds: etiquetaIds.includes(id)
        ? etiquetaIds.filter((e) => e !== id)
        : [...etiquetaIds, id],
    });
  }

  async function alternarIntegrante(userId: string) {
    await salvar({
      integranteIds: integranteIds.includes(userId)
        ? integranteIds.filter((i) => i !== userId)
        : [...integranteIds, userId],
    });
  }

  async function criarEAplicarEtiqueta() {
    const nome = novaEtiqueta.trim();
    if (!nome) return;
    try {
      const criada = await criarEtiqueta.mutateAsync({ nome, cor: corNova });
      // Quem cria a etiqueta aqui dentro quer ela neste cartão: aplicar já poupa o segundo clique.
      await atualizar.mutateAsync({ id: cartao.id, etiquetaIds: [...etiquetaIds, criada.id] });
      setNovaEtiqueta("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a etiqueta.");
    }
  }

  /**
   * Trocar o responsável tira o cartão daqui: cada pessoa tem o seu quadro, e o cartão vive no
   * quadro de quem responde por ele. Por isso a tela fecha e diz para onde ele foi.
   */
  async function trocarResponsavel(userId: string) {
    if (userId === cartao.responsavelUserId) return;
    const pessoa = pessoas?.find((p) => p.userId === userId);
    try {
      await atualizar.mutateAsync({ id: cartao.id, responsavelUserId: userId });
      toast.success(`Cartão movido para o quadro de ${pessoa?.nome ?? "outra pessoa"}.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível trocar o responsável.");
    }
  }

  /** Seletor de lista: é como o cartão anda no celular, onde arrastar não funciona. */
  async function moverParaLista(listaId: string) {
    const destino = listas.find((l) => l.id === listaId);
    if (!destino || listaId === cartao.listaId) return;
    try {
      // Entra no fim da lista de destino: quem move pelo seletor não está escolhendo posição.
      await mover.mutateAsync({ id: cartao.id, listaId, ordem: destino.cartoes.length });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mover o cartão.");
    }
  }

  async function adicionarNoChecklist() {
    const texto = novoItem.trim();
    if (!texto) return;
    try {
      await adicionarItem.mutateAsync({ cartaoId: cartao.id, texto });
      setNovoItem("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível adicionar o item.");
    }
  }

  async function marcarItem(itemId: string, feito: boolean) {
    try {
      await atualizarItem.mutateAsync({ itemId, feito });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível marcar o item.");
    }
  }

  async function removerItem(itemId: string) {
    try {
      await excluirItem.mutateAsync(itemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o item.");
    }
  }

  async function handleExcluir() {
    try {
      await excluir.mutateAsync(cartao.id);
      toast.success("Cartão excluído.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o cartão.");
    }
  }

  const listaAtual = listas.find((l) => l.id === cartao.listaId);
  const responsavelAtual =
    pessoas?.find((p) => p.userId === cartao.responsavelUserId)?.nome ?? cartao.responsavelNome;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      {/* Mesma gramática do quadro: raio maior, contorno um pouco mais presente que o padrão e a
          sombra em duas camadas (contato curto + difusa larga), com o fio de luz no topo. Sem
          translucidez: aqui é tela de edição, o fundo tem que ser firme. */}
      <DialogContent className="rounded-2xl ring-foreground/15 shadow-[0_1px_2px_var(--kanban-tinta-contato),0_24px_48px_-16px_var(--kanban-tinta-alta),inset_0_1px_0_var(--kanban-brilho)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8">Cartão</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Secao titulo="Título">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => {
                const valor = titulo.trim();
                // Cartão sem título some do quadro: em branco volta o que estava.
                if (!valor) {
                  setTitulo(cartao.titulo);
                  return;
                }
                if (valor !== cartao.titulo) salvar({ titulo: valor });
              }}
            />
          </Secao>

          <Secao titulo="Descrição">
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onBlur={() => {
                if (descricao !== (cartao.descricao ?? "")) salvar({ descricao: descricao || null });
              }}
              placeholder="O que precisa ser feito"
              rows={3}
            />
          </Secao>

          <div className="grid gap-3 sm:grid-cols-2">
            <Secao titulo="Prazo">
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={cartao.prazo ? cartao.prazo.slice(0, 10) : ""}
                  onChange={(e) => {
                    const valor = e.target.value;
                    // O prazo é o fim do dia: 23:59 é o que a escola entende por "até essa data".
                    salvar(
                      valor
                        ? { prazo: new Date(`${valor}T23:59:00`).toISOString() }
                        : { limparPrazo: true }
                    );
                  }}
                />
                {cartao.prazo && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Tirar o prazo"
                    onClick={() => salvar({ limparPrazo: true })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </Secao>

            <Secao titulo="Mover para">
              <Select value={cartao.listaId} onValueChange={(v) => v && moverParaLista(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => listaAtual?.nome ?? "Escolha a lista"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Secao>
          </div>

          <Secao titulo="Responsável">
            <Select
              value={cartao.responsavelUserId}
              onValueChange={(v) => v && trocarResponsavel(String(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{() => responsavelAtual}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(pessoas ?? []).map((p) => (
                  <SelectItem key={p.userId} value={p.userId}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Trocar o responsável leva o cartão para o quadro dessa pessoa.
            </p>
          </Secao>

          <Secao titulo="Etiquetas">
            <div className="flex flex-wrap gap-1.5">
              {(etiquetas ?? []).map((e) => {
                const marcada = etiquetaIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => alternarEtiqueta(e.id)}
                    className={cn(
                      // max-md:min-h-10: chip é alvo de toque, e 32px não dá conta no celular.
                      "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors max-md:min-h-10 max-md:px-3",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                      marcada
                        ? "border-primary/60 bg-primary/10 font-medium text-foreground"
                        : "border-foreground/12 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: e.cor }} />
                    {e.nome}
                  </button>
                );
              })}
              {(etiquetas ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma etiqueta criada ainda.</p>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Input
                value={novaEtiqueta}
                onChange={(e) => setNovaEtiqueta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    criarEAplicarEtiqueta();
                  }
                }}
                placeholder="Nova etiqueta"
                className="w-40 flex-1"
              />
              {/* A bolinha cresce no celular em vez de ganhar área invisível: com 6 opções lado a
                  lado, alvos de 40px invisíveis se sobreporiam e a pessoa erraria a cor. */}
              <div className="flex gap-1">
                {CORES.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    aria-label={`Cor ${cor}`}
                    onClick={() => setCorNova(cor)}
                    style={{ backgroundColor: cor }}
                    className={cn(
                      // Contorno escuro por cima da própria cor: sem ele as cores claras somem
                      // contra o fundo do diálogo.
                      "size-6 rounded-full ring-1 ring-foreground/15 max-md:size-10 motion-safe:transition-transform",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                      corNova === cor &&
                        "scale-110 ring-2 ring-foreground/40 ring-offset-2 ring-offset-popover"
                    )}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={criarEAplicarEtiqueta}
                disabled={!novaEtiqueta.trim() || criarEtiqueta.isPending}
              >
                <Plus className="size-4" /> Criar
              </Button>
            </div>
          </Secao>

          <Secao titulo="Integrantes">
            <div className="flex flex-wrap gap-1.5">
              {(pessoas ?? []).map((p) => {
                const marcado = integranteIds.includes(p.userId);
                return (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => alternarIntegrante(p.userId)}
                    className={cn(
                      "inline-flex min-h-8 items-center rounded-full border px-2.5 text-xs transition-colors max-md:min-h-10 max-md:px-3",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                      marcado
                        ? "border-primary/60 bg-primary/10 font-medium text-foreground"
                        : "border-foreground/12 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {p.nome}
                  </button>
                );
              })}
            </div>
          </Secao>

          <Secao titulo="Checklist">
            {cartao.checklist.length > 0 && (
              <Progress
                value={(feitos / cartao.checklist.length) * 100}
                className="[&_[data-slot=progress-track]]:h-1.5"
              />
            )}

            <div className="flex flex-col">
              {cartao.checklist.map((item) => (
                // Linha do checklist é alvo de toque (a caixa é pequena): 44px no celular.
                <div key={item.id} className="flex min-h-9 items-center gap-2 max-md:min-h-11">
                  <Checkbox
                    checked={item.feito}
                    onCheckedChange={(v) => marcarItem(item.id, v === true)}
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm break-words",
                      item.feito && "text-muted-foreground line-through"
                    )}
                  >
                    {item.texto}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Excluir item"
                    onClick={() => removerItem(item.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5">
              <Input
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarNoChecklist();
                  }
                }}
                placeholder="Novo item"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={adicionarNoChecklist}
                disabled={!novoItem.trim() || adicionarItem.isPending}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </Secao>

          {cartao.formResponseId && (
            <Link
              href="/flow/respostas"
              className="inline-flex items-center gap-1.5 rounded-md text-sm text-primary max-md:min-h-10 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
            >
              <ExternalLink className="size-4" /> Ver o envio que originou
            </Link>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-3">
            {confirmandoExclusao ? (
              <>
                <span className="text-sm text-muted-foreground">Excluir este cartão?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleExcluir}
                  disabled={excluir.isPending}
                >
                  {excluir.isPending ? "Excluindo..." : "Sim, excluir"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmandoExclusao(false)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmandoExclusao(true)}>
                <Trash2 className="size-4 text-destructive" /> Excluir cartão
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
