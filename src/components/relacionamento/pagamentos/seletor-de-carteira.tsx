"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { HandCoins, Zap } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useContasParaCobranca, type ProvedorDaCarteira } from "@/lib/relacionamento/use-pagamentos";
import { cn } from "@/lib/utils";

const TODAS = "__todas__";

/** Sinal curto do jeito de receber: Asaas (automático, verde se a chave foi testada) ou Manual. */
export function ChipDaCarteira({ provedor, asaasOk = true }: { provedor: ProvedorDaCarteira; asaasOk?: boolean }) {
  const asaas = provedor === "asaas";
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] leading-none font-semibold",
        !asaas
          ? "bg-secondary text-secondary-foreground"
          : asaasOk
            ? "bg-success-soft text-success-soft-foreground"
            : "bg-action-soft text-action-soft-foreground"
      )}
    >
      {asaas ? <Zap aria-hidden className="size-3" /> : <HandCoins aria-hidden className="size-3" />}
      {asaas ? (asaasOk ? "Asaas" : "Asaas · chave não testada") : "Manual"}
    </span>
  );
}

/** Link para configurar o recebimento. Só mostra: a tela de contas pode não estar liberada para a pessoa. */
export function LinkParaContas() {
  return (
    <Link href="/finance/contas" className="font-medium text-foreground underline underline-offset-2">
      Configurar em Financeiro › Contas
    </Link>
  );
}

interface Props {
  /** Id da conta escolhida; nulo é "nenhuma" (ou "todas", com `permitirVazio`). */
  value: string | null;
  onChange: (contaId: string | null) => void;
  /** Qual conta padrão pré-seleciona quando `value` é nulo. */
  padrao?: "cobrancas" | "mensalidades";
  /** Não pré-seleciona (edição de algo que já tem, ou nada, de propósito). */
  semPreSelecao?: boolean;
  label?: string;
  /** Para filtros: acrescenta "Todas as carteiras", que vale nulo. */
  permitirVazio?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Escolha da carteira: a conta do Financeiro em que a cobrança cai. Cada opção mostra o nome da
 * conta e como ela recebe. Sem nenhuma conta configurada, explica e aponta onde configurar (nos
 * filtros, some, porque não há o que filtrar).
 */
export function SeletorDeCarteira({
  value,
  onChange,
  padrao = "cobrancas",
  semPreSelecao = false,
  label,
  permitirVazio = false,
  id,
  disabled = false,
  className,
}: Props) {
  const { data: contas, isLoading, isError, refetch } = useContasParaCobranca();
  const jaPreencheu = useRef(false);

  const padraoDaTela = (contas ?? []).find((c) => (padrao === "cobrancas" ? c.padraoParaCobrancas : c.padraoParaMensalidades));
  // Com uma conta só, não há o que escolher: ela é a carteira, padrão ou não.
  const sugerida = padraoDaTela ?? (contas?.length === 1 ? contas[0] : undefined);

  useEffect(() => {
    if (jaPreencheu.current || permitirVazio || semPreSelecao || value !== null || !sugerida) return;
    jaPreencheu.current = true;
    onChange(sugerida.contaId);
  }, [permitirVazio, semPreSelecao, value, sugerida, onChange]);

  const escolhida = (contas ?? []).find((c) => c.contaId === value);

  if (permitirVazio && !isLoading && !isError && (contas ?? []).length === 0) return null;

  const campo = isLoading ? (
    <Skeleton className="h-8 w-full rounded-lg max-md:h-10" />
  ) : isError ? (
    <p role="alert" className="text-sm text-destructive">
      Não foi possível carregar as contas.{" "}
      <button type="button" className="underline underline-offset-2" onClick={() => refetch()}>
        Tentar de novo
      </button>
    </p>
  ) : (contas ?? []).length === 0 ? (
    <div className="rounded-lg border border-dashed border-border-dashed px-3 py-2.5 text-[13px] text-muted-foreground">
      <p className="font-medium text-foreground">Nenhuma conta recebe pagamentos ainda</p>
      <p className="mt-0.5">
        <LinkParaContas />
      </p>
    </div>
  ) : (
    <Select
      value={value ?? (permitirVazio ? TODAS : null)}
      onValueChange={(v) => onChange(!v || v === TODAS ? null : String(v))}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={label || id ? undefined : "Filtrar por carteira"} className={cn("w-full", className)}>
        <SelectValue placeholder={padrao === "cobrancas" ? "Conta padrão das cobranças" : "Conta padrão das mensalidades"}>
          {() =>
            escolhida ? (
              <>
                <span className="min-w-0 truncate">{escolhida.nome}</span>
                <ChipDaCarteira provedor={escolhida.provedor} asaasOk={escolhida.asaasOk} />
              </>
            ) : permitirVazio ? (
              "Todas as carteiras"
            ) : value ? (
              "Conta não encontrada"
            ) : null
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {permitirVazio && <SelectItem value={TODAS}>Todas as carteiras</SelectItem>}
        {(contas ?? []).map((c) => (
          <SelectItem key={c.contaId} value={c.contaId}>
            <span className="min-w-0 truncate">{c.nome}</span>
            <ChipDaCarteira provedor={c.provedor} asaasOk={c.asaasOk} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!label) return campo;

  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {campo}
    </div>
  );
}
