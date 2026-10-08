"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { VisualizadorDoComprovante } from "@/components/finance/comprovantes/arquivo-do-comprovante";
import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { SeletorDoPlanoDeContas } from "@/components/finance/seletor-do-plano-de-contas";
import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confiancaBaixa, useLancarNoProjeto, type ComprovanteRecebido } from "@/lib/finance/use-comprovantes";
import { useProjeto, useProjetos } from "@/lib/finance/use-projetos";
import { useContas } from "@/lib/finance/use-tesouraria";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { formatarMoeda } from "@/lib/rh/formatar";

const SEM_ITEM = "__sem_item__";
const CONTA_DO_PROJETO = "__conta_do_projeto__";

/** Campo lido com pouca certeza: borda e fundo amarelos, para a pessoa olhar o comprovante. */
const DESTAQUE = "border-warning-border bg-warning-soft dark:bg-warning-soft";

/**
 * Lançar o comprovante como compra de um projeto (a festa, o passeio...): o arquivo ao lado e o
 * formulário já preenchido com a leitura e a sugestão. Ao confirmar, o servidor cria a despesa
 * paga no centro de custo do projeto e marca o item do orçamento como comprado.
 *
 * Quem abre monta o diálogo só enquanto ele está aberto: o formulário nasce do que está gravado.
 */
export function DialogLancarNoProjeto({
  comprovante: c,
  onFechar,
}: {
  comprovante: ComprovanteRecebido;
  onFechar: () => void;
}) {
  const router = useRouter();
  const lancar = useLancarNoProjeto();

  // Só projetos em andamento recebem compras: em orçamento ou encerrados o servidor recusa.
  const { data: projetos, isLoading: carregandoProjetos, isError: erroDeProjetos } = useProjetos("Planejamento", null);
  const { data: contas } = useContas();

  const [projetoId, setProjetoId] = useState(c.projetoSugeridoId ?? "");
  const [itemId, setItemId] = useState("");
  const [valor, setValor] = useState<number | null>(c.valorLido ?? null);
  const [data, setData] = useState(c.dataLida?.slice(0, 10) || hojeIsoBrasilia());
  const [descricao, setDescricao] = useState(c.fornecedorLido?.trim() ?? "");
  const [categoriaId, setCategoriaId] = useState(c.categoriaSugeridaId ?? "");
  const [contaId, setContaId] = useState(c.contaSugeridaId ?? "");
  const [erro, setErro] = useState<string | null>(null);

  // O projeto sugerido pode ter fechado depois: só vale se ainda está na lista dos abertos.
  const projeto = (projetos ?? []).find((p) => p.id === projetoId) ?? null;
  const { data: detalhe, isLoading: carregandoItens } = useProjeto(projeto ? projeto.id : null);
  const itens = detalhe?.itens ?? [];
  const item = itens.find((i) => i.id === itemId) ?? null;
  const nomeDaConta = (contas ?? []).find((x) => x.id === contaId)?.nome;

  const baixaValor = confiancaBaixa(c.confianca?.valor);
  const baixaData = confiancaBaixa(c.confianca?.data);
  const semLeitura = c.status === "SemLeitura";

  function escolherProjeto(id: string) {
    setProjetoId(id);
    // Os itens são de cada projeto: trocar de projeto solta o item.
    setItemId("");
    setErro(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!projeto) return setErro("Escolha o projeto em que a compra entra.");
    if (valor === null || valor <= 0) return setErro("Informe o valor da compra.");
    if (!data) return setErro("Informe a data da compra.");

    try {
      await lancar.mutateAsync({
        id: c.id,
        dados: {
          projetoId: projeto.id,
          itemDoOrcamentoId: itemId || undefined,
          valor,
          data,
          descricao: descricao.trim() || undefined,
          categoriaFinanceiraId: categoriaId || undefined,
          contaFinanceiraId: contaId || undefined,
        },
      });
      toast.success(`Lançado no projeto ${projeto.nome}`, {
        action: { label: "Ver o projeto", onClick: () => router.push(`/finance/projetos/${projeto.id}`) },
      });
      onFechar();
    } catch (err) {
      // 409 (mês fechado, item já usado) e os demais trazem a frase do servidor; fica no formulário
      // para a pessoa ler sem perder o que digitou.
      setErro(err instanceof Error ? err.message : "Não foi possível lançar no projeto.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !lancar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Lançar no projeto</DialogTitle>
          <DialogDescription>
            A compra entra nos gastos do projeto como despesa paga e o comprovante vai junto. Se escolher o item da lista
            de compras, ele fica como comprado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <VisualizadorDoComprovante comprovante={c} className="min-w-0" />

          <form id="form-lancar-no-projeto" onSubmit={enviar} noValidate className="grid min-w-0 gap-3.5">
            {semLeitura && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-lg border border-action-border bg-action-soft px-3 py-2.5 text-sm text-action-soft-foreground"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>Não deu para ler este comprovante. Preencha os dados olhando o arquivo.</span>
              </div>
            )}
            {(baixaValor || baixaData) && (
              <p className="flex items-start gap-2 text-[13px] text-warning-soft-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>Os campos em amarelo foram lidos com pouca certeza. Confira com o comprovante.</span>
              </p>
            )}

            <Campo
              id="proj-projeto"
              rotulo="Projeto"
              dica={
                erroDeProjetos
                  ? undefined
                  : !carregandoProjetos && (projetos ?? []).length === 0
                    ? "Nenhum projeto em andamento. Aprove um projeto para lançar compras nele."
                    : c.projetoSugeridoId && !projeto && !carregandoProjetos
                      ? "O projeto sugerido não está mais em andamento. Escolha outro."
                      : undefined
              }
            >
              <Select value={projeto?.id ?? ""} onValueChange={(v) => v && escolherProjeto(String(v))}>
                <SelectTrigger id="proj-projeto" className="w-full" disabled={carregandoProjetos}>
                  <SelectValue>
                    {() => projeto?.nome ?? (carregandoProjetos ? "Carregando..." : "Escolha o projeto")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {(projetos ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erroDeProjetos && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  Não foi possível carregar os projetos. Confira se você tem acesso a eles.
                </p>
              )}
            </Campo>

            <Campo
              id="proj-item"
              rotulo="Item da lista de compras (opcional)"
              dica={
                projeto && !carregandoItens && itens.length === 0
                  ? "Este projeto ainda não tem lista de compras."
                  : "Escolha o item que esta compra quita; ele passa a aparecer como comprado."
              }
            >
              <Select
                value={itemId || SEM_ITEM}
                onValueChange={(v) => {
                  setItemId(!v || v === SEM_ITEM ? "" : String(v));
                  setErro(null);
                }}
              >
                <SelectTrigger id="proj-item" className="w-full" disabled={!projeto}>
                  <SelectValue>
                    {() =>
                      item ? item.descricao : projeto && carregandoItens ? "Carregando..." : "Compra fora da lista"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={SEM_ITEM}>Compra fora da lista</SelectItem>
                  {itens.map((i) => (
                    <SelectItem key={i.id} value={i.id} disabled={i.comprado}>
                      {i.descricao} · {formatarMoeda(i.valorTotal)}
                      {i.comprado ? " (já comprado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo id="proj-valor" rotulo="Valor" dica={baixaValor ? "Confira este valor" : undefined}>
                <CampoDeDinheiro
                  id="proj-valor"
                  valorEmCentavos={emCentavos(valor)}
                  className={baixaValor ? DESTAQUE : undefined}
                  onChange={(cent) => {
                    setValor(cent === null ? null : emReais(cent));
                    setErro(null);
                  }}
                />
              </Campo>
              <Campo id="proj-data" rotulo="Data da compra" dica={baixaData ? "Confira esta data" : undefined}>
                <Input
                  id="proj-data"
                  type="date"
                  value={data}
                  className={baixaData ? DESTAQUE : undefined}
                  onChange={(e) => {
                    setData(e.target.value);
                    setErro(null);
                  }}
                />
              </Campo>
            </div>

            <Campo id="proj-descricao" rotulo="Descrição (opcional)">
              <Input
                id="proj-descricao"
                value={descricao}
                maxLength={160}
                placeholder="Ex.: Papelaria Central"
                onChange={(e) => setDescricao(e.target.value)}
              />
            </Campo>

            <SeletorDoPlanoDeContas
              tipo="Despesa"
              valor={categoriaId}
              onChange={setCategoriaId}
              rotulo="Categoria do plano de contas (opcional)"
            />

            <Campo
              id="proj-conta"
              rotulo="Conta de onde saiu o dinheiro"
              dica={contaId ? undefined : "Sem escolher, usamos a conta do projeto."}
            >
              <Select
                value={contaId || CONTA_DO_PROJETO}
                onValueChange={(v) => v && setContaId(v === CONTA_DO_PROJETO ? "" : String(v))}
              >
                <SelectTrigger id="proj-conta" className="w-full">
                  <SelectValue>{() => (contaId ? (nomeDaConta ?? "Conta escolhida") : "A conta do projeto")}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={CONTA_DO_PROJETO}>A conta do projeto</SelectItem>
                  {(contas ?? []).map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            {erro && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {erro}
              </p>
            )}
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={lancar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-lancar-no-projeto" variant="action" disabled={lancar.isPending}>
            {lancar.isPending ? "Lançando..." : "Lançar no projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
