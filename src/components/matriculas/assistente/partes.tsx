"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { cn } from "@/lib/utils";
import { useAssistente } from "@/lib/matriculas/use-assistente";

const SECOES = [
  { href: "/matriculas/assistente", label: "Visão geral" },
  { href: "/matriculas/assistente/ficha", label: "Ficha da escola" },
  { href: "/matriculas/assistente/perguntas", label: "Perguntas" },
  { href: "/matriculas/assistente/conversar", label: "Conversar com ela" },
] as const;

/** Cabeçalho das telas da assistente: as abas de Matrículas, o título e as seções da assistente. */
export function CabecalhoDaAssistente({ titulo, descricao }: { titulo: string; descricao: ReactNode }) {
  const pathname = usePathname();
  const { data } = useAssistente();

  return (
    <>
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas · Assistente</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">{titulo}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{descricao}</p>
      </div>
      <nav aria-label="Seções da assistente" className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
        <ul className="flex w-max gap-5 border-b border-border">
          {SECOES.map((s) => {
            const ativa = pathname === s.href;
            const contagem = s.href.endsWith("/perguntas") ? data?.perguntasEmAberto : undefined;
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={ativa ? "page" : undefined}
                  className={cn(
                    "relative -mb-px inline-flex min-h-10 items-center gap-1.5 border-b-2 pb-2 text-sm whitespace-nowrap transition-colors",
                    ativa ? "border-action font-semibold text-foreground" : "border-transparent font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                  {!!contagem && (
                    <span className="rounded-full bg-action px-1.5 py-px text-[10.5px] font-bold tabular-nums text-action-foreground">{contagem}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function Bloco({
  titulo,
  descricao,
  acao,
  className,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-[24px] border border-border bg-card p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-[13px] text-muted-foreground">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Campo({
  id,
  rotulo,
  dica,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  dica?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-[5px]", className)}>
      <Label htmlFor={id} className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
        {rotulo}
      </Label>
      {children}
      {dica && <p className="text-[12px] text-muted-foreground">{dica}</p>}
    </div>
  );
}

export function erro(e: unknown, padrao: string) {
  return e instanceof Error ? e.message : padrao;
}
