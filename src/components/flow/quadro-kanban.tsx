"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CartaoDoQuadro } from "@/components/flow/cartao-do-quadro";
import { DialogDoCartao } from "@/components/flow/dialog-do-cartao";
import {
  useAtualizarLista,
  useCriarCartao,
  useCriarLista,
  useExcluirLista,
  useMoverCartao,
  type Lista,
  type Quadro,
} from "@/lib/flow/use-tarefas";

/** Onde o cartão arrastado vai cair: a lista e a posição de inserção (0 até o total de cartões). */
type Alvo = { listaId: string; indice: number };

/**
 * Quadro da pessoa: listas lado a lado, cartões dentro.
 *
 * O arrastar usa o HTML5 nativo (`draggable` + dragover/drop) em vez de uma biblioteca: são poucas
 * dezenas de cartões e o navegador já resolve o ponteiro, a imagem fantasma e a rolagem. O preço é
 * que tela de toque não arrasta — por isso o cartão aberto tem o seletor "Mover para", que é o
 * caminho do celular.
 */
export function QuadroKanban({ quadro }: { quadro: Quadro }) {
  const mover = useMoverCartao();

  const [arrastado, setArrastado] = useState<{ cartaoId: string; listaId: string } | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [cartaoAberto, setCartaoAberto] = useState<string | null>(null);
  const [listaEmEdicao, setListaEmEdicao] = useState<Lista | null>(null);

  // Medidas dos cartões na tela: é por elas que se descobre, pela altura do ponteiro, entre quais
  // dois cartões o arrastado vai entrar.
  const refs = useRef(new Map<string, HTMLDivElement>());

  // O cartão aberto é buscado pelo id a cada render: depois de salvar, a consulta recarrega o
  // quadro inteiro e a tela aberta precisa ver o cartão novo, não uma cópia velha guardada aqui.
  const aberto = quadro.listas.flatMap((l) => l.cartoes).find((c) => c.id === cartaoAberto) ?? null;

  function indiceDeQueda(lista: Lista, y: number) {
    for (let i = 0; i < lista.cartoes.length; i++) {
      const el = refs.current.get(lista.cartoes[i].id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return lista.cartoes.length;
  }

  function sobrevoar(e: React.DragEvent<HTMLDivElement>, lista: Lista) {
    if (!arrastado) return;
    // Sem o preventDefault o navegador recusa a queda e o drop nunca acontece.
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const indice = indiceDeQueda(lista, e.clientY);
    if (alvo?.listaId !== lista.id || alvo.indice !== indice) setAlvo({ listaId: lista.id, indice });
  }

  async function soltar(e: React.DragEvent<HTMLDivElement>, lista: Lista) {
    e.preventDefault();
    const cartao = arrastado;
    const destino = alvo;
    setArrastado(null);
    setAlvo(null);
    if (!cartao) return;

    // A posição vem do último sobrevoo. Se ele foi em outra coluna (soltar numa borda que não
    // chegou a disparar dragover), vale o fim da coluna onde o cartão realmente caiu.
    let ordem = destino?.listaId === lista.id ? destino.indice : lista.cartoes.length;

    if (cartao.listaId === lista.id) {
      // Na mesma lista o cartão sai antes de voltar: tudo que estava depois dele sobe uma posição,
      // então soltar "depois" precisa de um a menos para cair onde a linha foi mostrada.
      const indiceDeOrigem = lista.cartoes.findIndex((c) => c.id === cartao.cartaoId);
      if (ordem > indiceDeOrigem) ordem -= 1;
      if (ordem === indiceDeOrigem) return;
    }

    try {
      await mover.mutateAsync({ id: cartao.cartaoId, listaId: lista.id, ordem });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mover o cartão.");
    }
  }

  // Linha de destino só onde soltar muda alguma coisa: logo acima ou logo abaixo do próprio
  // cartão, na mesma lista, o resultado seria o mesmo lugar.
  function mostraLinha(lista: Lista, posicao: number) {
    if (!arrastado || alvo?.listaId !== lista.id || alvo.indice !== posicao) return false;
    if (arrastado.listaId !== lista.id) return true;
    const origem = lista.cartoes.findIndex((c) => c.id === arrastado.cartaoId);
    return posicao !== origem && posicao !== origem + 1;
  }

  return (
    <>
      {/* Rolagem horizontal: no celular cabe uma lista por vez, e empilhar as listas uma embaixo da
          outra acabaria com a leitura de "em que etapa está cada coisa". */}
      {/* pb-5: a sombra difusa da coluna precisa de folga embaixo, senão o contêiner de rolagem
          corta justamente a parte que faz o painel parecer apoiado. */}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-5 md:mx-0 md:px-0">
        {quadro.listas.map((lista) => (
          <div
            key={lista.id}
            className={cn(
              "flex w-72 shrink-0 snap-start flex-col gap-2 rounded-xl p-2",
              // Vidro: fundo com alpha + desfoque. O saturate é o que dá a "cor reflexiva" — ele
              // puxa a cor do que está atrás do painel, que é o truque de vibrância do macOS;
              // só borrar deixaria o painel cinza e morto.
              "border border-foreground/10 bg-muted/55 backdrop-blur-xl backdrop-saturate-150 dark:border-foreground/15 dark:bg-muted/65",
              // Contato + difusa + o fio de luz no topo (ver globals.css).
              "shadow-[0_1px_2px_var(--kanban-tinta-contato),0_10px_28px_-14px_var(--kanban-tinta-difusa),inset_0_1px_0_var(--kanban-brilho)]"
            )}
          >
            {/* Cabeçalho grudado no topo com o mesmo vidro: as margens negativas fazem a faixa
                encostar nas bordas internas da coluna, para o desfoque cobrir a largura toda em
                vez de deixar dois cantos de cartão aparecendo por baixo. */}
            <div className="sticky top-0 z-10 -mx-2 -mt-2 flex items-center gap-1 rounded-t-xl bg-muted/80 px-3 pt-2.5 pb-2 shadow-[inset_0_1px_0_var(--kanban-brilho)] backdrop-blur-md backdrop-saturate-150 dark:bg-muted/85">
              <h2 className="min-w-0 flex-1 truncate font-heading text-[13.5px] font-semibold tracking-[-0.01em]">
                {lista.nome}
              </h2>
              {/* A contagem vira um selo: solta, ela competia com o nome da lista. */}
              <span className="rounded-full bg-foreground/[0.06] px-1.5 py-px font-mono text-[11px] tracking-[-0.02em] tabular-nums text-muted-foreground">
                {lista.cartoes.length}
              </span>
              <MenuDaLista lista={lista} onRenomear={() => setListaEmEdicao(lista)} />
            </div>

            <div
              onDragOver={(e) => sobrevoar(e, lista)}
              onDrop={(e) => soltar(e, lista)}
              className="flex min-h-14 flex-col gap-2"
            >
              {lista.cartoes.map((cartao, i) => (
                <div
                  key={cartao.id}
                  ref={(el) => {
                    if (el) refs.current.set(cartao.id, el);
                    else refs.current.delete(cartao.id);
                  }}
                >
                  {mostraLinha(lista, i) && <LinhaDeDestino />}
                  <CartaoDoQuadro
                    cartao={cartao}
                    arrastando={arrastado?.cartaoId === cartao.id}
                    onAbrir={() => setCartaoAberto(cartao.id)}
                    onDragStart={(e) => {
                      // Firefox só inicia o arrasto se houver dado no evento.
                      e.dataTransfer.setData("text/plain", cartao.id);
                      e.dataTransfer.effectAllowed = "move";
                      setArrastado({ cartaoId: cartao.id, listaId: lista.id });
                    }}
                    onDragEnd={() => {
                      setArrastado(null);
                      setAlvo(null);
                    }}
                  />
                </div>
              ))}

              {mostraLinha(lista, lista.cartoes.length) && <LinhaDeDestino />}
            </div>

            <NovoCartao listaId={lista.id} />
          </div>
        ))}
      </div>

      {aberto && (
        <DialogDoCartao
          // Trocar de cartão remonta a tela: título e descrição têm estado próprio e não podem
          // chegar com o texto do cartão anterior.
          key={aberto.id}
          cartao={aberto}
          listas={quadro.listas}
          onFechar={() => setCartaoAberto(null)}
        />
      )}

      {listaEmEdicao && (
        <DialogDeLista lista={listaEmEdicao} onFechar={() => setListaEmEdicao(null)} />
      )}
    </>
  );
}

function LinhaDeDestino() {
  // Halo de 3px em volta da linha: sobre o vidro da coluna um traço chapado de 2px some; o halo
  // dá volume sem precisar engrossar a linha e empurrar os cartões.
  return (
    <div className="pointer-events-none mb-2 h-0.5 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]" />
  );
}

/** Ações da coluna. Discreto de propósito: renomear e excluir lista é coisa de vez em quando. */
function MenuDaLista({ lista, onRenomear }: { lista: Lista; onRenomear: () => void }) {
  const excluir = useExcluirLista();

  async function handleExcluir() {
    try {
      await excluir.mutateAsync(lista.id);
      toast.success(`Lista "${lista.nome}" excluída.`);
    } catch (err) {
      // Lista com cartão dentro é recusada pelo backend, e é a mensagem dele que explica por quê.
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a lista.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Ações da lista ${lista.nome}`}
        // max-md:size-10: no celular o alvo de toque tem que chegar aos 40px; no desktop o ícone
        // discreto continua discreto.
        className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors max-md:size-10 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRenomear}>
          <Pencil className="size-4" /> Renomear
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleExcluir} disabled={excluir.isPending}>
          <Trash2 className="size-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Criação rápida no pé da coluna.
 *
 * Só o título: o cartão nasce no meio de uma conversa ("preciso ligar para a mãe da Ana") e parar
 * para preencher prazo e responsável nessa hora é o que faz a pessoa desistir de anotar. O resto
 * se ajusta depois, no cartão aberto.
 */
function NovoCartao({ listaId }: { listaId: string }) {
  const criar = useCriarCartao();
  const [abrindo, setAbrindo] = useState(false);
  const [titulo, setTitulo] = useState("");

  async function adicionar() {
    const valor = titulo.trim();
    if (!valor) return;
    try {
      await criar.mutateAsync({ listaId, titulo: valor });
      // O campo fica aberto e vazio: quem anota um cartão costuma anotar três.
      setTitulo("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o cartão.");
    }
  }

  if (!abrindo) {
    return (
      <Button
        variant="ghost"
        size="sm"
        // O hover padrão do ghost é bg-muted, que é justamente a cor da coluna: aqui o realce
        // precisa vir do cartão, senão o botão não acende.
        className="justify-start text-muted-foreground max-md:h-10 hover:bg-card hover:text-foreground"
        onClick={() => setAbrindo(true)}
      >
        <Plus className="size-4" /> Cartão
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            adicionar();
          }
          if (e.key === "Escape") {
            setTitulo("");
            setAbrindo(false);
          }
        }}
        placeholder="Título do cartão"
      />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={adicionar} disabled={!titulo.trim() || criar.isPending}>
          Adicionar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTitulo("");
            setAbrindo(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** Criar ou renomear uma lista. Sem `lista`, cria. */
export function DialogDeLista({ lista, onFechar }: { lista?: Lista; onFechar: () => void }) {
  const criar = useCriarLista();
  const atualizar = useAtualizarLista();

  const [nome, setNome] = useState(lista?.nome ?? "");
  const [conclui, setConclui] = useState(lista?.conclui ?? false);

  const salvando = criar.isPending || atualizar.isPending;

  async function salvar() {
    const valor = nome.trim();
    if (!valor) return;
    try {
      if (lista) await atualizar.mutateAsync({ id: lista.id, nome: valor, conclui });
      else await criar.mutateAsync({ nome: valor, conclui });
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a lista.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      {/* Mesma gramática do quadro: raio maior, contorno um pouco mais presente que o padrão e a
          sombra em duas camadas. Translucidez de propósito não: campo de formulário precisa de
          fundo firme para o texto não brigar com o que passa atrás. */}
      <DialogContent className="rounded-2xl ring-foreground/15 shadow-[0_1px_2px_var(--kanban-tinta-contato),0_24px_48px_-16px_var(--kanban-tinta-alta),inset_0_1px_0_var(--kanban-brilho)]">
        <DialogHeader>
          <DialogTitle>{lista ? "Renomear lista" : "Nova lista"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-[10.5px] font-bold tracking-[.14em] uppercase text-muted-foreground">
              Nome
            </Label>
            <Input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  salvar();
                }
              }}
              placeholder="Ex.: Fazendo"
            />
          </div>

          <label className="flex min-h-10 items-center gap-2 text-sm md:min-h-0">
            <Switch checked={conclui} onCheckedChange={(v) => setConclui(v === true)} />
            Cartão que chega aqui está concluído
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!nome.trim() || salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
