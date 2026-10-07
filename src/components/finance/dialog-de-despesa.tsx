"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CampoDeDinheiro } from "@/components/finance/campo-de-dinheiro";
import { ClassificacaoDoLancamento } from "@/components/finance/classificacao-do-lancamento";
import { DialogDeEscopoDaSerie } from "@/components/finance/dialog-de-escopo-da-serie";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  EXPENSE_CATEGORIES,
  ehParcelaDeSerie,
  useCreateExpense,
  useUpdateExpense,
  type CreateExpenseInput,
  type EscopoDaSerie,
  type ExpenseDto,
} from "@/lib/finance/use-expenses";
import {
  MAXIMO_DE_MESES,
  MINIMO_DE_MESES,
  PADRAO_DE_MESES,
  mesesValidos,
  previaDaSerie,
} from "@/lib/finance/serie-de-despesas";
import { paraCentavos, paraReais } from "@/lib/finance/diferenca-do-pagamento";
import { competenciaDeIso, hojeIsoBrasilia } from "@/lib/format/date";

/**
 * Nova despesa, ou edição de uma existente (`despesa` preenchida).
 *
 * Na criação, "Repete todo mês?" cria a despesa em N parcelas de uma vez. Na edição de uma
 * parcela de série, ao salvar a tela pergunta se vale só para esta ou para esta e as seguintes.
 * Despesa já paga não muda valor nem vencimento (o servidor recusa): aqui os campos ficam
 * travados, com a explicação.
 */
export function DialogDeDespesa({ despesa, onFechar }: { despesa: ExpenseDto | null; onFechar: () => void }) {
  const criar = useCreateExpense();
  const atualizar = useUpdateExpense();
  const editando = despesa !== null;
  const paga = despesa?.statusPagamento === "Pago";

  const [nome, setNome] = useState(despesa?.nome ?? "");
  const [valor, setValor] = useState<number | null>(despesa ? paraCentavos(despesa.valor) : null);
  const [vencimento, setVencimento] = useState(despesa?.dataVencimento.slice(0, 10) ?? hojeIsoBrasilia());
  const [categoria, setCategoria] = useState(despesa?.categoria ?? 2);
  const [contaId, setContaId] = useState(despesa?.bancoContaId ?? "");
  const [categoriaFinanceiraId, setCategoriaFinanceiraId] = useState(despesa?.categoriaFinanceiraId ?? "");
  const [centroId, setCentroId] = useState(despesa?.centroDeCustoId ?? "");

  const [repete, setRepete] = useState(false);
  const [textoDosMeses, setTextoDosMeses] = useState(String(PADRAO_DE_MESES));
  const [dadosParaEscopo, setDadosParaEscopo] = useState<CreateExpenseInput | null>(null);

  const meses = Number(textoDosMeses);
  const mesesOk = mesesValidos(meses);
  const previa = repete ? previaDaSerie(vencimento, meses, valor == null ? null : paraReais(valor)) : null;
  const pendente = criar.isPending || atualizar.isPending;
  const incompleto = !nome.trim() || !valor || !vencimento || (repete && !mesesOk);

  function montar(): CreateExpenseInput {
    // Pela string: new Date("yyyy-MM-dd") é UTC e cai no mês anterior no dia 1º. Se o vencimento
    // não mudou, a competência gravada fica como está (a despesa paga não aceita mudar).
    const mudouOVencimento = !despesa || despesa.dataVencimento.slice(0, 10) !== vencimento;
    const competencia = mudouOVencimento
      ? competenciaDeIso(vencimento)
      : { mes: despesa.competenciaMes, ano: despesa.competenciaAno };

    return {
      nome: nome.trim(),
      // O PUT substitui estes campos: quem edita devolve o que já estava gravado.
      descricao: despesa?.descricao ?? undefined,
      subcategoria: despesa?.subcategoria ?? undefined,
      tipo: despesa?.tipo ?? undefined,
      centroCusto: despesa?.centroCusto ?? undefined,
      metodoPagamento: despesa?.metodoPagamento ?? undefined,
      fornecedorNome: despesa?.fornecedorNome ?? undefined,
      fornecedorDocumento: despesa?.fornecedorDocumento ?? undefined,
      observacoes: despesa?.observacoes ?? undefined,
      categoria,
      valor: paraReais(valor ?? 0),
      dataVencimento: vencimento,
      competenciaMes: competencia.mes,
      competenciaAno: competencia.ano,
      bancoContaId: contaId || null,
      categoriaFinanceiraId: categoriaFinanceiraId || null,
      centroDeCustoId: centroId || null,
    };
  }

  async function salvarEdicao(dados: CreateExpenseInput, escopo: EscopoDaSerie) {
    if (!despesa) return;
    try {
      await atualizar.mutateAsync({ id: despesa.id, escopo, dados });
      toast.success(escopo === "seguintes" ? "Despesa e parcelas seguintes salvas." : "Despesa salva.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a despesa.");
    }
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (incompleto) return;

    if (despesa) {
      const dados = montar();
      if (ehParcelaDeSerie(despesa)) return setDadosParaEscopo(dados);
      return void salvarEdicao(dados, "esta");
    }

    try {
      const criada = await criar.mutateAsync({ ...montar(), repetirPorMeses: repete ? meses : undefined });
      const quantas = criada?.parcelas?.length ?? 1;
      toast.success(quantas > 1 ? `${quantas} despesas criadas` : "Despesa criada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar despesa.");
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar despesa" : "Nova despesa"}</DialogTitle>
            {despesa && ehParcelaDeSerie(despesa) && (
              <DialogDescription>
                Parcela {despesa.numeroDaParcela} de {despesa.totalDeParcelas}. Ao salvar, você escolhe se vale só para
                esta ou também para as seguintes.
              </DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={confirmar} noValidate className="flex flex-col gap-3">
            <Campo id="despesa-nome" rotulo="Descrição">
              <Input id="despesa-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo id="despesa-valor" rotulo="Valor">
                <CampoDeDinheiro id="despesa-valor" valorEmCentavos={valor} onChange={setValor} disabled={paga} />
              </Campo>
              <Campo id="despesa-vencimento" rotulo="Vencimento">
                <Input
                  id="despesa-vencimento"
                  type="date"
                  value={vencimento}
                  disabled={paga}
                  onChange={(e) => setVencimento(e.target.value)}
                />
              </Campo>
            </div>
            {paga && (
              <p className="text-xs text-muted-foreground">
                Esta despesa já foi paga: o valor e o vencimento só mudam depois de reabri-la.
              </p>
            )}

            {!editando && (
              <div className="grid gap-2.5 rounded-lg border border-border p-3">
                <div className="flex min-h-9 items-center gap-3">
                  <Switch id="despesa-repete" checked={repete} onCheckedChange={setRepete} />
                  <Label htmlFor="despesa-repete" className="cursor-pointer leading-snug">
                    Repete todo mês?
                  </Label>
                </div>

                {repete && (
                  <>
                    <Campo
                      id="despesa-meses"
                      rotulo="Por quantos meses?"
                      dica={`De ${MINIMO_DE_MESES} a ${MAXIMO_DE_MESES} meses, contando o mês do vencimento.`}
                    >
                      <Input
                        id="despesa-meses"
                        type="number"
                        inputMode="numeric"
                        min={MINIMO_DE_MESES}
                        max={MAXIMO_DE_MESES}
                        step={1}
                        value={textoDosMeses}
                        onChange={(e) => setTextoDosMeses(e.target.value)}
                        aria-invalid={!mesesOk}
                        className="w-28"
                      />
                    </Campo>
                    {mesesOk ? (
                      previa && (
                        <p className="text-sm" aria-live="polite">
                          {previa}
                        </p>
                      )
                    ) : (
                      <p role="alert" className="text-xs font-medium text-destructive">
                        Informe um número de {MINIMO_DE_MESES} a {MAXIMO_DE_MESES} meses.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <Campo id="despesa-categoria" rotulo="Categoria">
              <Select value={String(categoria)} onValueChange={(v) => v && setCategoria(Number(v))}>
                <SelectTrigger id="despesa-categoria" className="w-full">
                  <SelectValue>{() => EXPENSE_CATEGORIES.find((c) => c.value === categoria)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={String(c.value)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <ClassificacaoDoLancamento
              tipo="Despesa"
              contaId={contaId}
              categoriaId={categoriaFinanceiraId}
              centroId={centroId}
              onContaId={setContaId}
              onCategoriaId={setCategoriaFinanceiraId}
              onCentroId={setCentroId}
            />

            <DialogFooter>
              <Button type="button" variant="outline" disabled={pendente} onClick={onFechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pendente || incompleto}>
                {pendente ? "Salvando..." : repete ? "Criar despesas" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dadosParaEscopo && despesa && (
        <DialogDeEscopoDaSerie
          acao="editar"
          despesa={despesa}
          pendente={atualizar.isPending}
          onEscolher={(escopo) => salvarEdicao(dadosParaEscopo, escopo)}
          onFechar={() => setDadosParaEscopo(null)}
        />
      )}
    </>
  );
}
