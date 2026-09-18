import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Cabeçalho de tela do guia (direção visual 2026-09): eyebrow opcional em maiúsculas, título,
 * uma linha de apoio e, à direita, os botões — secundários `outline` e no máximo um `action`.
 */
export function CabecalhoDaPagina({
  eyebrow,
  eyebrowHref,
  titulo,
  apoio,
  tags,
  acoes,
  className,
  apoioClassName,
  acoesClassName,
}: {
  eyebrow?: ReactNode;
  /** Quando o eyebrow é o caminho de volta, ele mesmo vira o link. */
  eyebrowHref?: string;
  titulo: ReactNode;
  apoio?: ReactNode;
  /** Etiquetas que ficam na mesma linha do título (situação, tipo, ações de ícone). */
  tags?: ReactNode;
  acoes?: ReactNode;
  className?: string;
  /** Escape para linha de apoio que não é só texto (contagem + etiqueta, por exemplo). */
  apoioClassName?: string;
  /** Escape para quando o lugar das ações traz uma barra de filtros, que alinha pela base. */
  acoesClassName?: string;
}) {
  const eyebrowClasses =
    "text-[11.5px] font-bold uppercase tracking-[.16em] text-action";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-5",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow &&
          (eyebrowHref ? (
            <Link
              href={eyebrowHref}
              className={cn(
                eyebrowClasses,
                "inline-flex min-h-10 items-center hover:underline md:min-h-0"
              )}
            >
              {eyebrow}
            </Link>
          ) : (
            <p className={eyebrowClasses}>{eyebrow}</p>
          ))}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-[clamp(24px,3vw,32px)] leading-[1.1] font-semibold tracking-[-.03em] break-words">
            {titulo}
          </h1>
          {tags}
        </div>
        {apoio && (
          <div
            className={cn(
              "mt-1.5 max-w-[620px] text-sm leading-[1.55] break-words text-muted-foreground",
              apoioClassName
            )}
          >
            {apoio}
          </div>
        )}
      </div>
      {acoes && (
        <div className={cn("flex flex-wrap items-center gap-2", acoesClassName)}>{acoes}</div>
      )}
    </div>
  );
}

/**
 * Sub-navegação em pílulas: o item ativo é branco com sombra leve, dentro de uma faixa `bg-muted`.
 */
export function AbasDePilulas({
  itens,
  className,
}: {
  itens: { rotulo: string; href?: string; ativo?: boolean }[];
  className?: string;
}) {
  const base =
    "inline-flex min-h-10 items-center rounded-md px-3.5 text-[13.5px] whitespace-nowrap transition-colors md:min-h-8";

  return (
    <nav
      className={cn(
        "flex w-max max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1",
        className
      )}
    >
      {itens.map((item) =>
        item.ativo || !item.href ? (
          <span
            key={item.rotulo}
            aria-current={item.ativo ? "page" : undefined}
            className={cn(
              base,
              item.ativo
                ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                : "font-medium text-muted-foreground"
            )}
          >
            {item.rotulo}
          </span>
        ) : (
          <Link
            key={item.rotulo}
            href={item.href}
            className={cn(base, "font-medium text-muted-foreground hover:text-foreground")}
          >
            {item.rotulo}
          </Link>
        )
      )}
    </nav>
  );
}
