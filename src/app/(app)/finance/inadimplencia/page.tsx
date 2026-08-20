"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FinanceNav } from "@/components/finance/finance-nav";
import { useInadimplencia } from "@/lib/finance/use-tuition-plans";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function atrasoBadge(dias: number) {
  if (dias > 30) return "bg-destructive-soft text-destructive-soft-foreground";
  if (dias > 7) return "bg-warning-soft text-warning-soft-foreground";
  return "bg-accent text-accent-foreground";
}

export default function InadimplenciaPage() {
  const { data, isLoading, isError } = useInadimplencia();
  const list = data ?? [];
  const total = list.reduce((acc, d) => acc + d.valorEsperado, 0);

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <div>
        <h1 className="font-heading text-xl font-bold">Inadimplência</h1>
        <p className="text-sm text-muted-foreground">
          Mensalidades vencidas e não pagas — quem cobrar, e o contato pra fazer isso.
        </p>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a inadimplência.
        </div>
      )}

      {!isLoading && list.length > 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Total em atraso</p>
          <p className="font-heading text-2xl font-bold text-destructive-soft-foreground">
            {formatCurrency(total)}
          </p>
          <p className="text-xs text-muted-foreground">{list.length} mensalidade(s) vencida(s)</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Venceu em</TableHead>
              <TableHead>Atraso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && list.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma mensalidade em atraso. 🎉
                </TableCell>
              </TableRow>
            )}

            {list.map((d) => (
              <TableRow key={d.revenueEntryId}>
                <TableCell className="font-medium">{d.studentName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.guardianName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {d.guardianEmail ?? d.guardianPhone ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {formatCurrency(d.valorEsperado)}
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{formatDate(d.dueDate)}</TableCell>
                <TableCell>
                  <Badge className={atrasoBadge(d.diasAtraso)}>{d.diasAtraso} dia(s)</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Uma mensalidade só aparece aqui depois de vencer — o status muda de
        &quot;Planejado&quot; pra &quot;Vencido&quot; automaticamente todo dia (job do Hangfire)
        ou assim que você abrir esta tela (ela também considera Planejado + já vencido,
        pra não esperar o job rodar).
      </p>
    </div>
  );
}
