"use client";

import Link from "next/link";
import { LayoutGrid, type LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FerramentaDoLancador {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface GrupoDoLancador {
  titulo: string;
  itens: FerramentaDoLancador[];
}

/**
 * O lançador de ferramentas do cabeçalho (grade 3x3, como o do Google Workspace): abre uma grade
 * de cartões com Início e as ferramentas que a pessoa pode ver, agrupadas como o menu sempre foi
 * (Operação e Escola). A ferramenta atual fica destacada.
 *
 * É um DropdownMenu: o gatilho já vem com aria-haspopup/aria-expanded, Esc fecha e devolve o foco,
 * e as setas percorrem os cartões. `entradaDo` leva cada cartão à primeira tela do módulo que a
 * pessoa pode abrir.
 */
export function LancadorDeFerramentas({
  grupos,
  atualHref,
  entradaDo,
  tamanho = "sm",
}: {
  grupos: GrupoDoLancador[];
  /** href da ferramenta aberta (ou do Início); null em telas sem dono. */
  atualHref: string | null;
  entradaDo: (href: string) => string;
  tamanho?: "sm" | "lg";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Ferramentas"
        title="Ferramentas"
        className={cn(
          "grid place-items-center text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground",
          tamanho === "sm"
            ? "size-9 rounded-lg border border-input bg-card"
            : "size-11 rounded-full active:bg-muted data-popup-open:bg-muted"
        )}
      >
        <LayoutGrid className={tamanho === "sm" ? "size-4" : "size-6"} />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        aria-label="Ferramentas"
        className="w-[min(25rem,calc(100vw-1.5rem))] p-3"
      >
        {grupos.map((grupo) => (
          <DropdownMenuGroup key={grupo.titulo} className="mb-2 last:mb-0">
            <DropdownMenuLabel className="px-1 pt-1 pb-2 text-[10.5px] font-bold tracking-[.16em] uppercase">
              {grupo.titulo}
            </DropdownMenuLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {grupo.itens.map((item) => {
                const ativo = item.href === atualHref;
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    render={<Link href={entradaDo(item.href)} aria-current={ativo ? "page" : undefined} />}
                    className={cn(
                      "min-h-[5.25rem] flex-col justify-center gap-2 rounded-xl px-1.5 py-2.5 text-center text-[12.5px] leading-tight font-medium",
                      ativo ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-lg",
                        ativo ? "bg-action-brand text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="max-w-full break-words">{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
