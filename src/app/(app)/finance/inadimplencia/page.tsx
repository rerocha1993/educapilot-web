"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useDiagnosticoAgendaEdu,
  useInadimplenciaAgendaEdu,
  useSincronizarCobrancasAgendaEdu,
} from "@/lib/integrations/use-agenda-edu-cobrancas";
import { cn } from "@/lib/utils";
import { formatarDataHora, formatarSoData } from "@/lib/format/date";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function atrasoBadge(dias: number) {
  if (dias > 30) return "bg-destructive-soft text-destructive-soft-foreground";
  if (dias > 7) return "bg-warning-soft text-warning-soft-foreground";
  return "bg-accent text-accent-foreground";
}

/**
 * Carteiras da escola e o que cada rota do EduPay responde.
 *
 * Existe porque lista vazia não diz o que houve. Com as carteiras à vista, dá para conferir se são
 * as esperadas, e o status de cada rota mostra onde há dado — inclusive nas rotas de cobrança
 * recorrente, que a documentação pública do Agenda Edu não cobre.
 */
function DiagnosticoAgendaEdu() {
  const [aberto, setAberto] = useState(false);
  const { data, isFetching } = useDiagnosticoAgendaEdu(aberto);

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant="ghost"
        className="w-fit text-xs text-muted-foreground"
        onClick={() => setAberto((v) => !v)}
      >
        <Stethoscope className="size-3.5" />
        {aberto ? "Esconder diagnóstico" : "Ver carteiras e rotas"}
      </Button>

      {aberto && isFetching && <Skeleton className="h-24 w-full" />}

      {aberto && data && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-xs">
          {data.erro && <p className="text-destructive">{data.erro}</p>}

          <div>
            <p className="mb-1 font-medium">Carteiras ({data.carteiras?.length ?? 0})</p>
            {(data.carteiras ?? []).length === 0 && (
              <p className="text-muted-foreground">Nenhuma carteira devolvida pelo Agenda Edu.</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {(data.carteiras ?? []).map((c) => (
                <li key={c.id} className="text-muted-foreground">
                  {c.nome ?? c.id}
                  {c.banco && ` — ${c.banco}`}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium">Rotas do EduPay</p>
            <div className="flex flex-col gap-0.5">
              {(data.rotas ?? []).map((r) => (
                <div key={r.caminho} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono">{r.caminho}</span>
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      r.status === 200 ? "text-foreground" : "text-destructive"
                    )}
                  >
                    {r.status || "sem resposta"}
                  </span>
                  {r.status === 200 && (
                    <span className="text-muted-foreground">{r.itens} item(ns)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-muted-foreground">
            Status 200 com zero itens quer dizer que a rota existe e a escola não tem esse tipo de
            cobrança. Status 404 quer dizer que a rota não existe nesta versão da API.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Inadimplência vinda do Agenda Edu (EduPay), que é onde a escola cobra de verdade.
 *
 * A lista é o espelho que o servidor relê a cada 15 minutos. "Atualizar agora" relê na hora —
 * útil logo depois de uma família dizer que pagou.
 */
function InadimplenciaAgendaEdu() {
  const { data, isLoading, isError } = useInadimplenciaAgendaEdu();
  const sincronizar = useSincronizarCobrancasAgendaEdu();

  async function handleAtualizar() {
    try {
      const r = await sincronizar.mutateAsync();
      if (!r.sucesso) {
        toast.error(r.erro ?? "Não foi possível ler as cobranças do Agenda Edu.");
        return;
      }
      const carteiras = r.carteiras?.length ?? 0;
      toast.success(
        `${carteiras} carteira(s), ${r.cobrancas} cobrança(s) lida(s), ${r.inadimplentes} em atraso.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ler as cobranças.");
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data?.configurado) return null;

  const itens = data.itens ?? [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-bold">Agenda Edu (EduPay)</h2>
          <p className="text-xs text-muted-foreground">
            {data.ultimaSincronizacaoEm
              ? `Lido em ${formatarDataHora(data.ultimaSincronizacaoEm)}. Atualiza sozinho a cada 15 minutos.`
              : "Ainda não lido. A primeira leitura acontece em até 15 minutos, ou agora pelo botão."}
          </p>
          {data.resumo && <p className="text-xs text-muted-foreground">{data.resumo}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={handleAtualizar} disabled={sincronizar.isPending}>
          <RefreshCw className={cn("size-4", sincronizar.isPending && "animate-spin")} />
          {sincronizar.isPending ? "Lendo..." : "Atualizar agora"}
        </Button>
      </div>

      {data.erro && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não consegui ler as cobranças do Agenda Edu na última tentativa: {data.erro}
          {itens.length > 0 && " A lista abaixo é da última leitura que funcionou."}
        </div>
      )}

      {itens.length > 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Em aberto no Agenda Edu</p>
          <p className="font-heading text-2xl font-bold text-destructive-soft-foreground">
            {formatCurrency(data.totalEmAberto)}
          </p>
          <p className="text-xs text-muted-foreground">{itens.length} cobrança(s) vencida(s)</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Cobrança</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Em aberto</TableHead>
              <TableHead>Venceu em</TableHead>
              <TableHead>Atraso</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  {data.ultimaSincronizacaoEm && !data.erro
                    ? "Nenhuma cobrança do Agenda Edu em atraso."
                    : "Sem leitura válida do Agenda Edu ainda."}
                </TableCell>
              </TableRow>
            )}

            {itens.map((c) => (
              <TableRow key={c.cobrancaId}>
                <TableCell>
                  <p className={cn("font-medium", !c.alunoId && "text-muted-foreground")}>
                    {c.alunoNome}
                  </p>
                  {c.turma && <p className="text-xs text-muted-foreground">{c.turma}</p>}
                </TableCell>
                <TableCell className="text-sm">{c.titulo ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  <p>{c.responsavelNome ?? "—"}</p>
                  {(c.responsavelTelefone || c.responsavelEmail) && (
                    <p className="text-xs text-muted-foreground">
                      {c.responsavelTelefone ?? c.responsavelEmail}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {formatCurrency(c.valorEmAberto)}
                  {c.valorPago > 0 && (
                    <p className="text-xs text-muted-foreground">
                      de {formatCurrency(c.valorTotal)}
                    </p>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{formatarSoData(c.venceEm)}</TableCell>
                <TableCell>
                  <Badge className={atrasoBadge(c.diasAtraso)}>{c.diasAtraso} dia(s)</Badge>
                </TableCell>
                <TableCell>
                  {c.boletoUrl && (
                    <a
                      href={c.boletoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Boleto <ExternalLink className="size-3" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DiagnosticoAgendaEdu />
    </section>
  );
}

export default function InadimplenciaPage() {
  const { data, isLoading, isError } = useInadimplencia();
  const agenda = useInadimplenciaAgendaEdu();
  const list = data ?? [];
  const total = list.reduce((acc, d) => acc + d.valorEsperado, 0);

  // Com o Agenda Edu configurado, a lista interna só aparece se tiver algo. Vazia, ela diria
  // "nenhuma mensalidade em atraso" logo abaixo de uma lista de atrasos do Agenda Edu.
  const agendaConfigurada = agenda.data?.configurado === true;
  const mostrarInterna = !agendaConfigurada || isLoading || isError || list.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <div>
        <h1 className="font-heading text-xl font-bold">Inadimplência</h1>
        <p className="text-sm text-muted-foreground">
          Mensalidades vencidas e não pagas — quem cobrar, e o contato pra fazer isso.
        </p>
      </div>

      <InadimplenciaAgendaEdu />

      {mostrarInterna && (
        <>
          {agendaConfigurada && (
            <h2 className="font-heading text-base font-bold">Mensalidades do EducaPilot</h2>
          )}

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
                    <TableCell className="font-mono text-sm tabular-nums">{formatarSoData(d.dueDate)}</TableCell>
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
        </>
      )}
    </div>
  );
}
