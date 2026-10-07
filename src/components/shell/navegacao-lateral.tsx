"use client";

import Link from "next/link";
import { ChevronLeft, Circle, House, type LucideIcon } from "lucide-react";

import type { GrupoDoLancador } from "@/components/shell/lancador-de-ferramentas";
import { INICIO_HREF } from "@/lib/kernel/nav-items";
import { secaoAtiva, type SecaoDoModulo } from "@/lib/kernel/secoes-do-modulo";
import { cn } from "@/lib/utils";

/**
 * O miolo da barra lateral (e do menu do celular), em dois modos:
 *
 * - Dentro de uma ferramenta: o nome e o ícone dela no topo, um "Início" discreto e, embaixo, as
 *   seções que antes eram abas na página (só as que a pessoa pode abrir).
 * - No Início (ou numa tela sem ferramenta): a lista de ferramentas, agrupada como sempre foi.
 *
 * Recolhida, a barra mostra só os ícones, cada um com `title`.
 */
export function NavegacaoLateral({
  ferramenta,
  grupos,
  secoes,
  pathname,
  entradaDo,
  recolhido = false,
  grande = false,
  contagens = {},
}: {
  /** A ferramenta aberta; nulo no Início e em telas sem dono. */
  ferramenta: { href: string; label: string; icon: LucideIcon } | null;
  grupos: GrupoDoLancador[];
  /** Seções da ferramenta aberta já filtradas por permissão. */
  secoes: SecaoDoModulo[];
  pathname: string;
  entradaDo: (href: string) => string;
  recolhido?: boolean;
  grande?: boolean;
  /** Contagem exibida ao lado de uma seção (conversas não lidas do Chat), por href. */
  contagens?: Record<string, number>;
}) {
  if (!ferramenta) {
    return (
      <nav aria-label="Ferramentas" className={cn("flex flex-col", !grande && "mt-6")}>
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-1.5">
            {!recolhido && (
              <div className="px-2.5 pb-2 pt-2.5 text-[10.5px] font-bold uppercase tracking-[.16em] text-sidebar-muted">
                {grupo.titulo}
              </div>
            )}
            {grupo.itens.map((item) => (
              <ItemDaSidebar
                key={item.href}
                href={entradaDo(item.href)}
                label={item.label}
                icon={item.icon}
                ativo={item.href === INICIO_HREF && pathname === INICIO_HREF}
                recolhido={recolhido}
                grande={grande}
              />
            ))}
          </div>
        ))}
      </nav>
    );
  }

  const FerramentaIcon = ferramenta.icon;
  const ativa = secaoAtiva(secoes, pathname);

  return (
    <div className={cn("flex flex-col", !grande && "mt-6")}>
      {recolhido ? (
        <>
          <Link
            href={entradaDo(ferramenta.href)}
            title={ferramenta.label}
            aria-label={ferramenta.label}
            className="mx-auto grid size-9 place-items-center rounded-lg bg-action-brand text-white"
          >
            <FerramentaIcon className="size-[18px]" />
          </Link>
          <Link
            href={INICIO_HREF}
            title="Início"
            aria-label="Início"
            className="mx-auto mt-2 grid size-8 place-items-center rounded-lg text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white"
          >
            <House className="size-4" />
          </Link>
        </>
      ) : (
        <div className="px-1">
          <Link
            href={INICIO_HREF}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-sidebar-muted transition-colors hover:text-white"
          >
            <ChevronLeft className="size-3.5" />
            Início
          </Link>
          <Link
            href={entradaDo(ferramenta.href)}
            className="mt-2 flex items-center gap-3 rounded-lg px-1.5 py-1.5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-action-brand text-white">
              <FerramentaIcon className="size-[18px]" />
            </span>
            <span className="min-w-0 truncate font-heading text-[16px] font-semibold tracking-tight text-white">
              {ferramenta.label}
            </span>
          </Link>
        </div>
      )}

      <nav
        aria-label={`Seções de ${ferramenta.label}`}
        className={cn("flex flex-col", recolhido ? "mt-3 gap-0.5 border-t border-sidebar-border pt-3" : "mt-4")}
      >
        {secoes.map((secao, indice) => {
          const novoGrupo = secao.grupo !== undefined && secao.grupo !== secoes[indice - 1]?.grupo;
          return (
            <div key={secao.href}>
              {novoGrupo &&
                (recolhido ? (
                  indice > 0 && <div className="mx-2 my-1.5 border-t border-sidebar-border" />
                ) : (
                  <div className="px-2.5 pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-[.16em] text-sidebar-muted">
                    {secao.grupo}
                  </div>
                ))}
              <ItemDaSidebar
                href={secao.href}
                label={secao.label}
                icon={secao.icon ?? Circle}
                ativo={ativa === secao.href}
                recolhido={recolhido}
                grande={grande}
                contagem={contagens[secao.href]}
              />
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/** Um item da barra: o quadradinho com o ícone, o rótulo e, no ativo, a marca laranja à esquerda. */
export function ItemDaSidebar({
  href,
  label,
  icon: Icon,
  ativo,
  recolhido,
  grande,
  contagem = 0,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  ativo: boolean;
  recolhido: boolean;
  grande?: boolean;
  contagem?: number;
}) {
  return (
    <Link
      href={href}
      title={recolhido ? label : undefined}
      aria-label={recolhido ? label : undefined}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        grande ? "py-3" : "py-2.5",
        recolhido && "justify-center px-0",
        ativo
          ? "bg-white/[.07] text-white"
          : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
      )}
    >
      {/* A marca laranja à esquerda diz onde a pessoa está — some quando o item não é o atual. */}
      {ativo && !recolhido && (
        <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-[3px] bg-action-brand" />
      )}
      <span
        className={cn(
          "relative grid size-6 shrink-0 place-items-center rounded-md transition-colors",
          ativo ? "bg-action-brand text-white" : "bg-sidebar-accent text-sidebar-muted"
        )}
      >
        <Icon className="size-3.5" />
        {recolhido && contagem > 0 && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-action ring-2 ring-sidebar" />
        )}
      </span>
      {!recolhido && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {contagem > 0 && (
        <span className={cn("shrink-0", recolhido && "sr-only")}>
          <span
            aria-hidden
            className={cn(
              "inline-grid min-w-[18px] place-items-center rounded-full bg-action px-1 text-[10.5px] leading-[18px] font-bold text-action-foreground tabular-nums",
              recolhido && "hidden"
            )}
          >
            {contagem > 99 ? "99+" : contagem}
          </span>
          <span className="sr-only">
            {contagem === 1 ? "conversa não lida" : "conversas não lidas"}
          </span>
        </span>
      )}
    </Link>
  );
}
