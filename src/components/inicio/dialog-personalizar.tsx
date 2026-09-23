"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useSalvarPainelDeBlocos, type BlocoDoPainel } from "@/lib/kernel/use-painel-blocos";

export interface BlocoParaPersonalizar extends BlocoDoPainel {
  /** Rótulo curto, só para esta lista: na tela o bloco tem o próprio cabeçalho. */
  rotulo: string;
}

/**
 * Ordem e visibilidade dos blocos da tela Início.
 *
 * Setas ↑ ↓ em vez de arrastar: a maior parte da escola abre o Início no celular, e arrastar uma
 * linha com o dedo dentro de um diálogo que já rola disputa o mesmo gesto do scroll. Duas setas
 * resolvem a mesma coisa sem ambiguidade e funcionam no teclado de graça.
 *
 * A lista recebida já vem sem os blocos que a permissão esconde — ver `inicio/page.tsx`.
 */
export function DialogPersonalizarInicio({
  blocos,
  onFechar,
}: {
  blocos: BlocoParaPersonalizar[];
  onFechar: () => void;
}) {
  const salvar = useSalvarPainelDeBlocos();
  const [lista, setLista] = useState(blocos);

  function alternar(i: number) {
    setLista(lista.map((b, j) => (i === j ? { ...b, visivel: !b.visivel } : b)));
  }

  function mover(i: number, passo: -1 | 1) {
    const destino = i + passo;
    if (destino < 0 || destino >= lista.length) return;
    const nova = [...lista];
    [nova[i], nova[destino]] = [nova[destino], nova[i]];
    setLista(nova);
  }

  async function enviar(arranjo: BlocoDoPainel[], sucesso: string) {
    try {
      await salvar.mutateAsync(arranjo);
      toast.success(sucesso);
      onFechar();
    } catch (err) {
      // A mensagem do backend vai direto para a tela: é ela que diz o que impediu a ação.
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o arranjo.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar o Início</DialogTitle>
          <DialogDescription>
            Escolha o que aparece e em que ordem. Vale só para você.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-[45vh] flex-col overflow-y-auto">
          {lista.map((bloco, i) => (
            <li
              key={bloco.id}
              className="flex min-h-12 items-center gap-3 border-b border-border py-2 last:border-0"
            >
              <Switch
                checked={bloco.visivel}
                onCheckedChange={() => alternar(i)}
                aria-label={`Mostrar ${bloco.rotulo}`}
              />
              <span
                className={`min-w-0 flex-1 truncate text-sm ${bloco.visivel ? "" : "text-muted-foreground"}`}
              >
                {bloco.rotulo}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Subir ${bloco.rotulo}`}
                disabled={i === 0}
                onClick={() => mover(i, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Descer ${bloco.rotulo}`}
                disabled={i === lista.length - 1}
                onClick={() => mover(i, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
            </li>
          ))}
        </ul>

        {/* O rodapé já empilha invertido no celular: "Restaurar padrão" vem primeiro no código para
            cair por último na tela, longe do polegar que confirma. */}
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            disabled={salvar.isPending}
            onClick={() => enviar([], "Início de volta ao padrão.")}
          >
            Restaurar padrão
          </Button>
          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={onFechar}>
              Cancelar
            </Button>
            <Button
              variant="action"
              className="flex-1 sm:flex-none"
              disabled={salvar.isPending}
              onClick={() =>
                enviar(
                  lista.map(({ id, visivel }) => ({ id, visivel })),
                  "Início atualizado."
                )
              }
            >
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
