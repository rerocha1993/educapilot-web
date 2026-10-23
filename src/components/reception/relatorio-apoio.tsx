"use client";

import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useClasses } from "@/lib/kernel/use-classes";

// Peças compartilhadas pelas abas de Portaria › Relatórios (visitas, multas e permanência).

const TODAS = "0";

export function SeletorDeTurma({ classId, onChange }: { classId: number | null; onChange: (classId: number | null) => void }) {
  const { data: turmas } = useClasses();
  const lista = (turmas ?? []).filter((t) => t.id != null);

  return (
    <div className="flex min-w-0 flex-col gap-[5px] md:min-w-48">
      <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Turma</Label>
      <Select value={classId ? String(classId) : TODAS} onValueChange={(v) => onChange(v && v !== TODAS ? Number(v) : null)}>
        <SelectTrigger className="w-full">
          <SelectValue>{() => lista.find((t) => t.id === classId)?.className ?? "Todas"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Todas</SelectItem>
          {lista.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.className}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CampoData({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">{rotulo}</Label>
      <Input type="date" className="w-full md:w-40" value={valor} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function formatarDia(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function LinhasCarregando({ colunas }: { colunas: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colunas}>
            <Skeleton className="h-5 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function CartoesCarregando() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </>
  );
}

/** Estado vazio no padrão do guia: cartão tracejado, ícone num quadrado e texto curto. */
export function CartaoVazio({ texto, semBorda = false }: { texto: string; semBorda?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-5 py-9 text-center",
        !semBorda && "rounded-xl border border-dashed border-border-dashed bg-card"
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        <FileSearch className="size-4" />
      </span>
      <p className="mt-3 max-w-[280px] font-heading text-[15px] font-semibold text-pretty">{texto}</p>
    </div>
  );
}

export function InfoDoCartao({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 break-words">
      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">{rotulo}</p>
      {children}
    </div>
  );
}

export function LinhaVazia({ colunas, texto }: { colunas: number; texto: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colunas} className="p-0">
        <CartaoVazio texto={texto} semBorda />
      </TableCell>
    </TableRow>
  );
}

export function Resumo({ rotulo, valor, carregando }: { rotulo: string; valor: number | string | undefined; carregando: boolean }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <span className="text-[12.5px] font-medium text-muted-foreground">{rotulo}</span>
        {carregando ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <span className="font-mono text-[26px] leading-none font-semibold tabular-nums tracking-[-.03em]">
            {valor ?? "—"}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Planilha: ponto e vírgula e BOM, que é o que o Excel em português abre direto, com acento e em
 * colunas. Célula que começa com = + - @ ganha um apóstrofo: é texto digitado por alguém, e sem isso
 * o Excel o executaria como fórmula.
 */
export function baixarCsv(nome: string, linhas: string[][]) {
  const celula = (valor: string) => {
    const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
    return `"${seguro.replace(/"/g, '""')}"`;
  };
  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}
