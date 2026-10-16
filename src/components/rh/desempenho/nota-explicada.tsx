"use client";

import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarNota, type ComponenteDaNota, type NotaDeDesempenho } from "@/lib/rh/use-desempenho";
import { formatarSoData } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { AvisoDeApoio, BarraDeNota, FaixaBadge, NotaGrande, RotuloPequeno } from "./pecas";

const formatarPeso = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Barras por componente: o que está sustentando e o que está puxando a nota para baixo, de relance. */
export function BarrasDeComponentes({ componentes }: { componentes: ComponenteDaNota[] }) {
  const comNota = componentes.filter((c) => c.incluido && c.nota != null);
  const fora = componentes.filter((c) => !c.incluido && c.chave !== "Reconhecimentos");

  return (
    <div className="flex flex-col gap-2.5">
      {comNota.length === 0 && <p className="text-sm text-muted-foreground">Nenhum componente com dado ainda.</p>}
      {comNota.map((c) => (
        <div key={c.chave} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="min-w-0 truncate font-medium" title={c.dado}>
              {c.nome}
            </span>
            <span className="font-mono tabular-nums">{formatarNota(c.nota)}</span>
          </div>
          <BarraDeNota nota={c.nota!} />
        </div>
      ))}
      {fora.length > 0 && (
        <p className="text-[12px] leading-snug text-muted-foreground">
          Sem dado (fora da conta, não contam como zero): {fora.map((c) => c.nome).join(", ")}.
        </p>
      )}
    </div>
  );
}

/**
 * "Como chegamos nessa nota": cada componente com o dado bruto, a nota de 0 a 100, o peso e quanto contribui. É o que
 * torna a nota explicável (e contestável); sem esta tabela ela não deve ser mostrada.
 */
export function ComoChegamosNessaNota({ nota, className }: { nota: NotaDeDesempenho; className?: string }) {
  const bonus = nota.componentes.find((c) => c.chave === "Reconhecimentos");
  const ponderados = nota.componentes.filter((c) => c.chave !== "Reconhecimentos");

  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", className)} aria-labelledby="como-chegamos">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="como-chegamos" className="font-heading text-base font-semibold">
          Como chegamos nessa nota
        </h3>
        <p className="text-xs text-muted-foreground">
          {formatarSoData(nota.de)} a {formatarSoData(nota.ate)} · {nota.diasDeVinculo} dia(s) de vínculo na janela
        </p>
      </div>

      {nota.avisos.length > 0 && (
        <ul className="grid gap-1.5">
          {nota.avisos.map((a) => (
            <li
              key={a}
              className="flex items-start gap-1.5 rounded-lg bg-action-soft px-3 py-1.5 text-[12.5px] leading-snug text-action-soft-foreground"
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {a}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              <TableHead>Dado</TableHead>
              <TableHead className="text-right">Nota</TableHead>
              <TableHead className="text-right">Peso</TableHead>
              <TableHead className="text-right">Contribui</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ponderados.map((c) => (
              <TableRow key={c.chave} className={cn(!c.incluido && "text-muted-foreground")}>
                <TableCell className="align-top font-medium whitespace-normal">
                  {c.nome}
                  {c.aviso && <p className="mt-0.5 text-[11.5px] leading-snug font-normal text-muted-foreground">{c.aviso}</p>}
                </TableCell>
                <TableCell className="max-w-72 align-top text-[13px] whitespace-normal">
                  {c.incluido ? c.dado : <span className="italic">Fora da conta: {c.motivo ?? "sem dado"}</span>}
                </TableCell>
                <TableCell className="text-right align-top font-mono tabular-nums">{c.incluido ? formatarNota(c.nota) : "—"}</TableCell>
                <TableCell className="text-right align-top font-mono text-[12.5px] tabular-nums">
                  {c.incluido ? (
                    <>
                      {formatarPeso(c.pesoEfetivo)}%
                      {Math.abs(c.pesoEfetivo - c.pesoConfigurado) > 0.05 && (
                        <span className="block text-[11px] text-muted-foreground" title="Peso configurado pela escola; os pesos dos componentes sem dado foram redistribuídos">
                          (config. {formatarPeso(c.pesoConfigurado)}%)
                        </span>
                      )}
                    </>
                  ) : (
                    <span title="Peso configurado pela escola">({formatarPeso(c.pesoConfigurado)}%)</span>
                  )}
                </TableCell>
                <TableCell className="text-right align-top font-mono tabular-nums">{c.incluido ? `+${formatarNota(c.contribuicao)}` : "—"}</TableCell>
              </TableRow>
            ))}
            {bonus && (
              <TableRow className={cn(!bonus.incluido && "text-muted-foreground")}>
                <TableCell className="align-top font-medium whitespace-normal">{bonus.nome} (bônus)</TableCell>
                <TableCell className="max-w-72 align-top text-[13px] whitespace-normal">{bonus.dado}</TableCell>
                <TableCell className="text-right align-top font-mono tabular-nums">—</TableCell>
                <TableCell className="text-right align-top text-[12px]">bônus</TableCell>
                <TableCell className="text-right align-top font-mono tabular-nums">{bonus.incluido ? `+${formatarNota(bonus.contribuicao)}` : "—"}</TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell colSpan={2}>Nota final</TableCell>
              <TableCell colSpan={3} className="text-right">
                <span className="inline-flex items-center gap-2">
                  <FaixaBadge faixa={nota.faixa} />
                  <span className="font-mono tabular-nums">{formatarNota(nota.nota)}</span>
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <AvisoDeApoio texto={nota.apoioADecisao || undefined} />
    </section>
  );
}

/** Nota atual + faixa + variação, no topo da aba. */
export function ResumoDaNota({
  nota,
  variacao,
  children,
}: {
  nota: NotaDeDesempenho;
  variacao: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-card px-4 py-3">
      <div>
        <RotuloPequeno>Nota atual</RotuloPequeno>
        <div className="mt-1 flex items-baseline gap-3">
          <NotaGrande nota={nota.nota} className="text-[34px]" />
          {variacao}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FaixaBadge faixa={nota.faixa} />
        {nota.poucosDados && <Badge variant="pending">Poucos dados</Badge>}
        {nota.bonus > 0 && <Badge variant="success">+{formatarNota(nota.bonus)} de reconhecimentos</Badge>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
