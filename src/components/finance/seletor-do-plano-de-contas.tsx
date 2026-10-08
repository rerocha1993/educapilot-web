"use client";

import Link from "next/link";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoriasFinanceiras, useCentrosDeCusto } from "@/lib/finance/use-tesouraria";

const NENHUM = "__nenhum__";

/**
 * Escolha de uma conta do plano de contas, agrupada pelo grupo ("Pessoal", "Energia e água"...),
 * só com as contas do tipo pedido. A lista tem dezenas de contas: sem o grupo ninguém acha a certa.
 */
export function SeletorDoPlanoDeContas({
  tipo,
  valor,
  onChange,
  rotulo = "Categoria (plano de contas)",
}: {
  tipo: "Receita" | "Despesa";
  valor: string;
  onChange: (id: string) => void;
  rotulo?: string;
}) {
  const { data: categorias, isLoading } = useCategoriasFinanceiras();

  const doTipo = (categorias ?? []).filter((c) => c.tipo === tipo);
  const grupos = doTipo
    .filter((c) => !c.paiId)
    .map((grupo) => ({ grupo, contas: doTipo.filter((c) => c.paiId === grupo.id) }))
    .filter((g) => g.contas.length > 0);

  const escolhida = doTipo.find((c) => c.id === valor);

  return (
    <div className="flex flex-col gap-[5px]">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      <Select value={valor || NENHUM} onValueChange={(v) => onChange(!v || v === NENHUM ? "" : String(v))}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {() => (escolhida ? `${escolhida.paiNome ?? ""}${escolhida.paiNome ? " › " : ""}${escolhida.nome}` : "Escolha uma categoria")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NENHUM}>Escolha uma categoria</SelectItem>
          {grupos.map(({ grupo, contas }) => (
            <SelectGroup key={grupo.id}>
              <SelectLabel>{grupo.nome}</SelectLabel>
              {contas.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.nome}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {!isLoading && grupos.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma categoria de {tipo === "Receita" ? "receita" : "despesa"} cadastrada.{" "}
          <Link href="/finance/plano-de-contas" className="underline">
            Abrir o plano de contas
          </Link>
          .
        </p>
      )}
    </div>
  );
}

/** Centro de custo opcional: "Não informar" deixa o orçamento geral, sem centro. */
export function SeletorDeCentroDeCusto({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (id: string) => void;
}) {
  const { data: centros } = useCentrosDeCusto();
  const nome = (centros ?? []).find((c) => c.id === valor)?.nome;

  return (
    <div className="flex flex-col gap-[5px]">
      <Label className="text-xs text-muted-foreground">Centro de custo (opcional)</Label>
      <Select value={valor || NENHUM} onValueChange={(v) => onChange(!v || v === NENHUM ? "" : String(v))}>
        <SelectTrigger className="w-full">
          <SelectValue>{() => nome ?? "Não informar"}</SelectValue>
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
  );
}
