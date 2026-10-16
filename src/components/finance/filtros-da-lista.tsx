"use client";

import { useCallback } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContas } from "@/lib/finance/use-tesouraria";

/** Valores especiais dos filtros de lista. */
export const TODOS = "__todos__";
export const SEM_CARTEIRA = "__sem__";

/** Busca por texto no topo da lista, a mesma de Cobranças. */
export function BuscaDaLista({
  valor,
  onChange,
  rotulo,
}: {
  valor: string;
  onChange: (v: string) => void;
  rotulo: string;
}) {
  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={rotulo}
        placeholder={rotulo}
        value={valor}
        className="pl-8"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Lista curta de opções com "Todas ..." na frente; o valor `TODOS` é "sem filtro". */
export function FiltroDaLista({
  rotulo,
  todos,
  valor,
  opcoes,
  onChange,
}: {
  /** Nome do filtro para leitor de tela. */
  rotulo: string;
  /** Texto da opção sem filtro: "Todas as situações". */
  todos: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  onChange: (v: string) => void;
}) {
  const escolhida = opcoes.find((o) => o.valor === valor);
  return (
    <Select value={valor} onValueChange={(v) => v && onChange(String(v))}>
      <SelectTrigger aria-label={rotulo} className="w-full">
        <SelectValue>{() => (valor === TODOS ? todos : (escolhida?.rotulo ?? todos))}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectItem value={TODOS}>{todos}</SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Filtro de carteira (a conta do Financeiro em que o dinheiro entra ou sai). Lista as contas e
 * "Sem carteira" para o que foi lançado sem conta. Mesma gramática do filtro de Cobranças.
 */
export function FiltroDeCarteira({
  valor,
  onChange,
  rotuloDaConta = "Todas as carteiras",
}: {
  valor: string;
  onChange: (v: string) => void;
  rotuloDaConta?: string;
}) {
  const { data: contas } = useContas(true);
  const opcoes = [
    ...(contas ?? []).map((c) => ({ valor: c.id, rotulo: c.ativa ? c.nome : `${c.nome} (inativa)` })),
    { valor: SEM_CARTEIRA, rotulo: "Sem carteira" },
  ];
  return <FiltroDaLista rotulo="Filtrar por carteira" todos={rotuloDaConta} valor={valor} opcoes={opcoes} onChange={onChange} />;
}

/** Mapa id da conta para nome, para a coluna Carteira. */
export function useNomesDasContas(): (id: string | null | undefined) => string | null {
  const { data: contas } = useContas(true);
  return useCallback(
    (id: string | null | undefined) => (id ? ((contas ?? []).find((c) => c.id === id)?.nome ?? null) : null),
    [contas]
  );
}
