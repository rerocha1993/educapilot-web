"use client";

import Link from "next/link";

import type { ItemDoInicio } from "@/lib/inicio/catalogo";

/** Os atalhos escolhidos, na ordem da pessoa. Sem nenhum, a faixa não existe. */
export function AtalhosDoInicio({ itens }: { itens: ItemDoInicio[] }) {
  if (itens.length === 0) return null;

  return (
    <section>
      <div className="mb-3 text-[12px] font-bold uppercase tracking-[.16em] text-muted-foreground">
        Atalhos
      </div>
      {/* Celular: quadrados com ícone grande, que se acerta com o dedo. Computador: a linha de
          pílulas do modelo, que ocupa menos altura. */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:flex md:flex-wrap md:gap-2.5">
        {itens.map(({ id, rota, rotulo, icone: Icon }) => (
          <Link
            key={id}
            href={rota}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-2 py-4 text-center text-[13px] font-medium text-secondary-foreground transition-colors hover:border-action-brand hover:text-action active:bg-accent md:flex-row md:justify-start md:rounded-lg md:py-2.5 md:pl-2.5 md:pr-3.5 md:text-[13.5px]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary md:size-7 md:rounded-md">
              <Icon className="size-5.5 md:size-4" />
            </span>
            <span className="leading-tight">{rotulo}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
