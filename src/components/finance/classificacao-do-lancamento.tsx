"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoriasFinanceiras, useCentrosDeCusto, useContas } from "@/lib/finance/use-tesouraria";

const NENHUM = "__nenhum__";

/**
 * Os três campos que dizem de onde o dinheiro veio e como ele é classificado.
 *
 * Aparecem iguais em receita e em despesa porque a pergunta é a mesma dos dois lados, e porque o
 * fechamento e a planilha do contador leem os três campos sem saber qual tela os preencheu. Ficam
 * num componente só para não divergirem com o tempo — foi o que aconteceu com o centro de custo,
 * que virou texto livre em cada tela e nunca agrupou.
 */
export function ClassificacaoDoLancamento({
  tipo,
  contaId,
  categoriaId,
  centroId,
  onContaId,
  onCategoriaId,
  onCentroId,
}: {
  tipo: "Receita" | "Despesa";
  contaId: string;
  categoriaId: string;
  centroId: string;
  onContaId: (v: string) => void;
  onCategoriaId: (v: string) => void;
  onCentroId: (v: string) => void;
}) {
  const { data: contas } = useContas();
  const { data: categorias } = useCategoriasFinanceiras();
  const { data: centros } = useCentrosDeCusto();

  const doTipo = (categorias ?? []).filter((c) => c.tipo === tipo && c.paiId);
  const grupos = (categorias ?? []).filter((c) => c.tipo === tipo && !c.paiId);
  const contaPadrao = (contas ?? []).find((c) => c.padraoParaRecebimento);

  // A conta principal já vem escolhida: na prática quase todo lançamento cai nela, e deixar em
  // branco é o caminho mais curto para um mês inteiro sem conta na planilha do contador.
  useEffect(() => {
    if (!contaId && contaPadrao) onContaId(contaPadrao.id);
  }, [contaId, contaPadrao, onContaId]);

  const nomeDaConta = (contas ?? []).find((c) => c.id === contaId)?.nome;
  const nomeDaCategoria = doTipo.find((c) => c.id === categoriaId)?.nome;
  const nomeDoCentro = (centros ?? []).find((c) => c.id === centroId)?.nome;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-[5px]">
        <Label className="text-xs text-muted-foreground">Conta</Label>
        <Select
          value={contaId || NENHUM}
          onValueChange={(v) => v && onContaId(v === NENHUM ? "" : String(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{() => nomeDaConta ?? "Não informar"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NENHUM}>Não informar</SelectItem>
            {(contas ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(contas ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma conta cadastrada.{" "}
            <Link href="/finance/contas" className="underline">
              Cadastrar agora
            </Link>
            .
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Plano de contas</Label>
          <Select
            value={categoriaId || NENHUM}
            onValueChange={(v) => v && onCategoriaId(v === NENHUM ? "" : String(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{() => nomeDaCategoria ?? "Não informar"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUM}>Não informar</SelectItem>
              {/* Agrupado pelo pai: a lista tem dezenas de contas e sem o grupo ninguém acha
                  "Energia elétrica" no meio de tudo. */}
              {grupos.map((grupo) => {
                const filhas = doTipo.filter((c) => c.paiId === grupo.id);
                if (filhas.length === 0) return null;
                return filhas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {grupo.nome} › {conta.nome}
                  </SelectItem>
                ));
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Centro de custo</Label>
          <Select
            value={centroId || NENHUM}
            onValueChange={(v) => v && onCentroId(v === NENHUM ? "" : String(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{() => nomeDoCentro ?? "Não informar"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUM}>Não informar</SelectItem>
              {(centros ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
