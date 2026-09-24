"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { ItemDoInicio } from "@/lib/inicio/catalogo";
import {
  useSalvarPreferenciasDoInicio,
  type PreferenciasDoInicio,
} from "@/lib/kernel/use-painel-preferencias";

/** As seções da tela que são escolhidas item a item. As demais só ligam e desligam. */
export type SecaoComItens = "numeros" | "atalhos" | "pendencias";

export interface SecaoParaPersonalizar {
  /** Id do bloco na tela — é o que liga e desliga a seção inteira. */
  id: string;
  rotulo: string;
  visivel: boolean;
  /** Ausente no bloco que não tem itens para escolher (o quadro de tarefas, os formulários). */
  chave?: SecaoComItens;
  /** Já filtrado pela permissão: o que a pessoa não pode abrir não entra nem nesta lista. */
  catalogo: ItemDoInicio[];
  /** Ids em uso agora — a escolha dela, ou o padrão do papel enquanto ela não escolheu. */
  escolhidos: string[];
}

/**
 * Personalizar a tela Início: o que aparece, item a item, e em que ordem.
 *
 * Escolher a seção inteira não bastava. Quem é da gestão não quer os catorze atalhos nem a
 * chamada no alto; quer o dinheiro do dia e dois atalhos. Então cada seção tem a sua lista, com
 * marcação por item e ordem própria; e o "Precisa de você" também — dentro de cada tipo de
 * pendência, o mais atrasado continua vindo primeiro, isso não é escolha de ninguém.
 *
 * Setas ↑ ↓ em vez de arrastar: a maior parte da escola abre o Início no celular, e arrastar uma
 * linha com o dedo dentro de um diálogo que já rola disputa o mesmo gesto do scroll. Duas setas
 * resolvem a mesma coisa sem ambiguidade e funcionam no teclado de graça.
 *
 * "Restaurar padrão" grava o documento vazio, que é exatamente "nunca escolhi": a tela volta ao
 * padrão do papel desta pessoa, e não a um padrão genérico.
 */
export function DialogPersonalizarInicio({
  secoes,
  formularios,
  onFechar,
}: {
  secoes: SecaoParaPersonalizar[];
  /** Escolha de formulários, que vive no mesmo documento e não se mexe por aqui. */
  formularios: string[];
  onFechar: () => void;
}) {
  const salvar = useSalvarPreferenciasDoInicio();
  const [lista, setLista] = useState(secoes);
  const [iniciais] = useState(() => new Map(secoes.map((s) => [s.id, s.escolhidos])));

  function trocarSecao(id: string, mudanca: Partial<SecaoParaPersonalizar>) {
    setLista((atual) => atual.map((s) => (s.id === id ? { ...s, ...mudanca } : s)));
  }

  function moverBloco(i: number, passo: -1 | 1) {
    const destino = i + passo;
    if (destino < 0 || destino >= lista.length) return;
    const nova = [...lista];
    [nova[i], nova[destino]] = [nova[destino], nova[i]];
    setLista(nova);
  }

  function alternarItem(secao: SecaoParaPersonalizar, itemId: string) {
    const marcado = secao.escolhidos.includes(itemId);
    const escolhidos = marcado
      ? secao.escolhidos.filter((x) => x !== itemId)
      : [...secao.escolhidos, itemId];

    // Seção sem nenhum item marcado é seção fora da tela: o documento não sabe distinguir
    // "escolhi nada" de "ainda não escolhi", então quem esvazia a lista desliga o bloco.
    trocarSecao(secao.id, { escolhidos, visivel: escolhidos.length > 0 && secao.visivel });
  }

  function alternarSecao(secao: SecaoParaPersonalizar, visivel: boolean) {
    if (!visivel || secao.escolhidos.length > 0 || !secao.chave) {
      trocarSecao(secao.id, { visivel });
      return;
    }
    // Ligar de volta uma seção que ficou vazia traz o que ela tinha ao abrir o diálogo.
    const volta = iniciais.get(secao.id) ?? [];
    trocarSecao(secao.id, {
      visivel: true,
      escolhidos: volta.length > 0 ? volta : secao.catalogo.slice(0, 1).map((i) => i.id),
    });
  }

  function moverItem(secao: SecaoParaPersonalizar, i: number, passo: -1 | 1) {
    const destino = i + passo;
    if (destino < 0 || destino >= secao.escolhidos.length) return;
    const nova = [...secao.escolhidos];
    [nova[i], nova[destino]] = [nova[destino], nova[i]];
    trocarSecao(secao.id, { escolhidos: nova });
  }

  async function enviar(documento: PreferenciasDoInicio, sucesso: string) {
    try {
      await salvar.mutateAsync(documento);
      toast.success(sucesso);
      onFechar();
    } catch (err) {
      // A mensagem do backend vai direto para a tela: é ela que diz o que impediu a ação.
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a sua escolha.");
    }
  }

  function salvarTudo() {
    const idsDe = (chave: SecaoComItens) =>
      lista.find((s) => s.chave === chave)?.escolhidos ?? [];

    void enviar(
      {
        blocos: lista.map(({ id, visivel }) => ({ id, visivel })),
        numeros: idsDe("numeros"),
        atalhos: idsDe("atalhos"),
        pendencias: idsDe("pendencias"),
        formularios,
      },
      "Início atualizado."
    );
  }

  function restaurar() {
    void enviar(
      { blocos: [], numeros: [], atalhos: [], pendencias: [], formularios },
      "Início de volta ao padrão do seu perfil."
    );
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      {/* No celular ocupa a tela inteira: a lista é longa e um cartão flutuante que rola dentro de
          uma página que também rola erra o alvo o tempo todo. */}
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-y-hidden p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:grid-rows-none sm:max-w-lg sm:gap-4 sm:overflow-y-auto sm:p-4">
        <DialogHeader className="p-4 sm:p-0">
          <DialogTitle>Personalizar o Início</DialogTitle>
          <DialogDescription>
            Marque o que você quer ver e use as setas para ordenar. Vale só para você.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-4 sm:max-h-[55vh] sm:px-0">
          {lista.map((secao, i) => (
            <section key={secao.id} className="border-b border-border py-2 last:border-0">
              <div className="flex min-h-11 items-center gap-2">
                <Switch
                  checked={secao.visivel}
                  onCheckedChange={(v) => alternarSecao(secao, v)}
                  aria-label={`Mostrar ${secao.rotulo}`}
                />
                <span
                  className={`min-w-0 flex-1 truncate text-sm font-semibold ${secao.visivel ? "" : "text-muted-foreground"}`}
                >
                  {secao.rotulo}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Subir ${secao.rotulo}`}
                  disabled={i === 0}
                  onClick={() => moverBloco(i, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Descer ${secao.rotulo}`}
                  disabled={i === lista.length - 1}
                  onClick={() => moverBloco(i, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>

              {secao.chave && secao.catalogo.length > 0 && (
                <ItensDaSecao
                  secao={secao}
                  onAlternar={(itemId) => alternarItem(secao, itemId)}
                  onMover={(i2, passo) => moverItem(secao, i2, passo)}
                />
              )}
            </section>
          ))}
        </div>

        {/* O rodapé empilha invertido no celular: "Restaurar padrão" vem primeiro no código para
            cair por último na tela, longe do polegar que confirma. */}
        <DialogFooter className="mx-0 mb-0 rounded-none sm:-mx-4 sm:-mb-4 sm:justify-between sm:rounded-b-xl">
          <Button variant="outline" disabled={salvar.isPending} onClick={restaurar}>
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
              onClick={salvarTudo}
            >
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Os itens de uma seção: primeiro os marcados, na ordem em que vão aparecer; depois o resto do
 * catálogo. Só os marcados têm setas — ordenar o que não aparece não quer dizer nada.
 */
function ItensDaSecao({
  secao,
  onAlternar,
  onMover,
}: {
  secao: SecaoParaPersonalizar;
  onAlternar: (itemId: string) => void;
  onMover: (i: number, passo: -1 | 1) => void;
}) {
  const porId = new Map(secao.catalogo.map((i) => [i.id, i]));
  const marcados = secao.escolhidos
    .map((id) => porId.get(id))
    .filter((i): i is ItemDoInicio => i !== undefined);
  const restantes = secao.catalogo.filter((i) => !secao.escolhidos.includes(i.id));

  return (
    <ul className={`pl-1 ${secao.visivel ? "" : "opacity-50"}`}>
      {marcados.map((item, i) => (
        <LinhaDoItem
          key={item.id}
          item={item}
          marcado
          onAlternar={() => onAlternar(item.id)}
          onSubir={i === 0 ? undefined : () => onMover(i, -1)}
          onDescer={i === marcados.length - 1 ? undefined : () => onMover(i, 1)}
        />
      ))}
      {restantes.map((item) => (
        <LinhaDoItem key={item.id} item={item} marcado={false} onAlternar={() => onAlternar(item.id)} />
      ))}
    </ul>
  );
}

function LinhaDoItem({
  item,
  marcado,
  onAlternar,
  onSubir,
  onDescer,
}: {
  item: ItemDoInicio;
  marcado: boolean;
  onAlternar: () => void;
  onSubir?: () => void;
  onDescer?: () => void;
}) {
  const Icone = item.icone;

  return (
    <li className="flex min-h-11 items-center gap-2 py-1">
      {/* A etiqueta inteira alterna a marcação: no celular o alvo é a linha, não o quadradinho. */}
      {/* min-w-0: sem isto o rótulo cresce com o texto e estoura a largura do diálogo no celular. */}
      <label className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-1 active:bg-muted">
        <Checkbox checked={marcado} onCheckedChange={onAlternar} />
        <Icone className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm leading-snug ${marcado ? "" : "text-muted-foreground"}`}>
            {item.rotulo}
          </span>
          <span className="block truncate text-[12px] text-muted-foreground">{item.descricao}</span>
        </span>
      </label>
      {marcado && (
        <>
          <Button variant="ghost" size="icon" aria-label={`Subir ${item.rotulo}`} disabled={!onSubir} onClick={onSubir}>
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Descer ${item.rotulo}`}
            disabled={!onDescer}
            onClick={onDescer}
          >
            <ArrowDown className="size-4" />
          </Button>
        </>
      )}
    </li>
  );
}
