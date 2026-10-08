"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Receipt, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatarDataHora, formatarSoData } from "@/lib/format/date";
import {
  useConferenciaDaFatura,
  useSalvarCotacao,
  useSalvarLimiteDeIa,
  useUsoDeIaDaEscola,
  useUsoDeIaDoMes,
  type AoEstourarOLimite,
  type UsoDeIaEscola,
  type UsoDeIaTotal,
} from "@/lib/master/use-uso-de-ia";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = new Intl.NumberFormat("pt-BR");
const compacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** O mês atual de Brasília, como AAAA-MM (o valor do campo de mês). */
function mesAtual(): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  return `${ano}-${mes}`;
}

function Dinheiro({ usdValor, brlValor, semPreco }: { usdValor: number | null; brlValor: number | null; semPreco?: boolean }) {
  if (usdValor == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums">
      {usd.format(usdValor)}
      {brlValor != null && <span className="block text-xs text-muted-foreground">{brl.format(brlValor)}</span>}
      {semPreco && <span className="block text-xs text-destructive">+ modelo sem preço</span>}
    </span>
  );
}

function tokens(t: UsoDeIaTotal) {
  const entrada = compacto.format(t.tokensDeEntrada);
  const saida = compacto.format(t.tokensDeSaida);
  const cache = compacto.format(t.tokensDeCacheEscritos + t.tokensDeCacheLidos);
  return `${entrada} ent. · ${saida} saí. · ${cache} cache`;
}

function erroDe(err: unknown, padrao: string) {
  return err instanceof Error ? err.message : padrao;
}

/**
 * Painel Master › Uso de IA: o gasto da conta da Anthropic dividido por escola, no mês escolhido. Quem gasta mais fica
 * no topo. O custo é tokens vezes o preço do modelo (appsettings, Anthropic:Precos); modelo sem preço aparece como
 * "sem preço" e não entra na conta. O limite de respostas é decisão do Master: a escola só lê.
 */
export default function UsoDeIaPage() {
  const [mes, setMes] = useState(mesAtual());
  const [aberta, setAberta] = useState<string | null>(null);
  const uso = useUsoDeIaDoMes(mes);
  const d = uso.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Uso de IA</h1>
          <p className="text-sm text-muted-foreground">
            Quanto cada escola gastou da conta da Anthropic na assistente de matrículas. Só números: nenhuma conversa aparece aqui.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Mês
            <Input type="month" value={mes} max={mesAtual()} min="2025-01" onChange={(e) => e.target.value && setMes(e.target.value)} className="w-40" />
          </label>
          <Button variant="ghost" size="sm" onClick={() => void uso.refetch()} disabled={uso.isFetching}>
            <RefreshCw className="size-4" /> Atualizar
          </Button>
        </div>
      </div>

      {uso.isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {erroDe(uso.error, "Não foi possível carregar o uso de IA.")}
        </div>
      )}

      {/* total do mês */}
      <section className="rounded-xl border border-border bg-card p-5">
        {uso.isLoading || !d ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <dt className="text-muted-foreground">Custo do mês</dt>
              <dd className="font-heading text-xl font-semibold">
                <Dinheiro usdValor={d.total.custoUsd} brlValor={d.total.custoBrl} semPreco={d.total.custoIncompleto} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Respostas</dt>
              <dd className="font-heading text-xl font-semibold tabular-nums">{inteiro.format(d.total.respostas)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Testes</dt>
              <dd className="font-heading text-xl font-semibold tabular-nums">{inteiro.format(d.total.testes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Foram para a equipe</dt>
              <dd className="font-heading text-xl font-semibold tabular-nums">{inteiro.format(d.total.paraAEquipe)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Famílias atendidas</dt>
              <dd className="font-heading text-xl font-semibold tabular-nums">{inteiro.format(d.total.familiasAtendidas)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Custo por família</dt>
              <dd className="font-heading text-xl font-semibold">
                <Dinheiro usdValor={d.total.custoPorFamiliaUsd} brlValor={d.total.custoPorFamiliaBrl} />
              </dd>
            </div>
          </dl>
        )}
        {d && d.total.modelosSemPreco.length > 0 && (
          <p className="mt-3 rounded-md bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground">
            Sem preço configurado para: {d.total.modelosSemPreco.join(", ")}. O custo acima não inclui esse uso. Acrescente o modelo em
            Anthropic:Precos no App Service.
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <CotacaoDoDolar cotacao={d?.cotacao ?? null} atualizadaEm={d?.cotacaoAtualizadaEm ?? null} />
        <Conferencia mes={mes} />
      </div>

      {/* uma linha por escola */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Escola</TableHead>
              <TableHead className="text-right">Respostas</TableHead>
              <TableHead className="text-right">Testes</TableHead>
              <TableHead className="text-right">Equipe</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Por família</TableHead>
              <TableHead>Limite</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uso.isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {d && d.escolas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma escola usou a assistente neste mês.
                </TableCell>
              </TableRow>
            )}
            {d?.escolas.map((e) => (
              <TableRow key={e.tenantId} className="cursor-pointer hover:bg-muted/50" onClick={() => setAberta(e.tenantId)}>
                <TableCell className="font-medium">
                  <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => setAberta(e.tenantId)}>
                    {e.nome}
                  </button>
                </TableCell>
                <TableCell className="text-right tabular-nums">{inteiro.format(e.respostas)}</TableCell>
                <TableCell className="text-right tabular-nums">{inteiro.format(e.testes)}</TableCell>
                <TableCell className="text-right tabular-nums">{inteiro.format(e.paraAEquipe)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{tokens(e)}</TableCell>
                <TableCell className="text-right">
                  <Dinheiro usdValor={e.custoUsd} brlValor={e.custoBrl} semPreco={e.custoIncompleto} />
                </TableCell>
                <TableCell className="text-right">
                  <Dinheiro usdValor={e.custoPorFamiliaUsd} brlValor={e.custoPorFamiliaBrl} />
                </TableCell>
                <TableCell>
                  <LimiteDaEscola escola={e} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {aberta && d && (
        <DetalheDaEscola
          tenantId={aberta}
          mes={mes}
          limitePadrao={d.limitePadrao}
          cotacao={d.cotacao}
          onFechar={() => setAberta(null)}
        />
      )}
    </div>
  );
}

/** Quanto do limite foi usado, o que acontece ao estourar e os avisos já enviados. */
function LimiteDaEscola({ escola: e }: { escola: UsoDeIaEscola }) {
  if (e.limiteEfetivo == null) {
    return <span className="text-xs text-muted-foreground">Sem limite{e.limiteProprio === 0 ? " (definido)" : ""}</span>;
  }
  const pct = e.percentualDoLimite ?? 0;
  return (
    <div className="flex min-w-36 flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={cn("font-medium tabular-nums", pct >= 100 && "text-destructive")}>
          {pct}% · {inteiro.format(e.respostas)}/{inteiro.format(e.limiteEfetivo)}
        </span>
        {e.limiteEhPadrao && <span className="text-muted-foreground">padrão</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary")} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="flex flex-wrap gap-1">
        {e.aoEstourarOLimite === "Continuar" && <Badge variant="outline">Continua</Badge>}
        {e.excedente > 0 && <Badge variant="destructive">+{inteiro.format(e.excedente)} a cobrar</Badge>}
        {(e.avisoDe80Enviado || e.avisoDe100Enviado) && (
          <Badge variant="secondary" title="A gestão da escola foi avisada no sino">
            <BellRing className="size-3" /> Avisada em {e.avisoDe100Enviado ? "100%" : "80%"}
          </Badge>
        )}
      </div>
    </div>
  );
}

function CotacaoDoDolar({ cotacao, atualizadaEm }: { cotacao: number | null; atualizadaEm: string | null }) {
  const salvar = useSalvarCotacao();
  const [valor, setValor] = useState("");

  async function gravar(ev: React.FormEvent) {
    ev.preventDefault();
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) {
      toast.error("Informe a cotação em reais, como 5,40.");
      return;
    }
    try {
      await salvar.mutateAsync(numero);
      setValor("");
      toast.success("Cotação atualizada.");
    } catch (err) {
      toast.error(erroDe(err, "Não foi possível salvar a cotação."));
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Cotação do dólar</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Usada só para mostrar o custo em reais. Você informa à mão; nada consulta a internet.
        {cotacao != null && atualizadaEm ? (
          <>
            {" "}
            Hoje vale <strong className="text-foreground">{brl.format(cotacao)}</strong>, atualizada em {formatarDataHora(atualizadaEm)}.
          </>
        ) : (
          " Ainda não foi informada, então o custo em reais não aparece."
        )}
      </p>
      <form onSubmit={gravar} className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Reais por dólar
          <Input inputMode="decimal" placeholder="5,40" value={valor} onChange={(e) => setValor(e.target.value)} className="w-32" />
        </label>
        <Button type="submit" disabled={salvar.isPending || !valor.trim()}>
          {salvar.isPending ? "Salvando…" : "Atualizar"}
        </Button>
      </form>
    </section>
  );
}

/** O custo do mês segundo a Anthropic contra a soma calculada aqui. Só funciona com a chave de administrador. */
function Conferencia({ mes }: { mes: string }) {
  const c = useConferenciaDaFatura(mes);
  const r = c.data;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Receipt className="size-4" aria-hidden /> Conferência com a fatura
        </h2>
        <Button variant="ghost" size="sm" onClick={() => void c.refetch()} disabled={c.isFetching}>
          <RefreshCw className="size-4" /> Conferir
        </Button>
      </div>
      {c.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : c.isError || !r ? (
        <p className="text-sm text-destructive">{erroDe(c.error, "Não foi possível conferir agora.")}</p>
      ) : !r.configurada ? (
        <p className="text-sm text-muted-foreground">{r.mensagem}</p>
      ) : r.mensagem ? (
        <p className="text-sm text-destructive">{r.mensagem}</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Anthropic</dt>
              <dd className="font-semibold tabular-nums">{r.custoDaAnthropicUsd != null ? usd.format(r.custoDaAnthropicUsd) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">EducaPilot</dt>
              <dd className="font-semibold tabular-nums">{r.custoDoEducaPilotUsd != null ? usd.format(r.custoDoEducaPilotUsd) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Diferença</dt>
              <dd className={cn("font-semibold tabular-nums", r.diferencaPercentual != null && Math.abs(r.diferencaPercentual) > 10 && "text-destructive")}>
                {r.diferencaUsd != null ? usd.format(r.diferencaUsd) : "—"}
                {r.diferencaPercentual != null && <span className="block text-xs font-normal text-muted-foreground">{r.diferencaPercentual}%</span>}
                {r.diferencaBrl != null && <span className="block text-xs font-normal text-muted-foreground">{brl.format(r.diferencaBrl)}</span>}
              </dd>
            </div>
          </dl>
          {r.observacao && <p className="mt-3 text-xs text-muted-foreground">{r.observacao}</p>}
        </>
      )}
    </section>
  );
}

type ModoDoLimite = "padrao" | "semLimite" | "definir";

function DetalheDaEscola({
  tenantId,
  mes,
  limitePadrao,
  cotacao,
  onFechar,
}: {
  tenantId: string;
  mes: string;
  limitePadrao: number;
  cotacao: number | null;
  onFechar: () => void;
}) {
  const detalhe = useUsoDeIaDaEscola(tenantId, mes);
  const e = detalhe.data?.escola;

  return (
    <Dialog open onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{e?.nome ?? "Escola"}</DialogTitle>
          <DialogDescription>Uso de IA em {mes.split("-").reverse().join("/")}, por finalidade e por dia.</DialogDescription>
        </DialogHeader>

        {detalhe.isLoading || !detalhe.data || !e ? (
          detalhe.isError ? (
            <p className="text-sm text-destructive">{erroDe(detalhe.error, "Não foi possível carregar a escola.")}</p>
          ) : (
            <Skeleton className="h-40 w-full" />
          )
        ) : (
          <div className="flex flex-col gap-5 text-sm">
            <LimiteEditavel key={`${e.tenantId}-${e.limiteProprio}-${e.aoEstourarOLimite}`} escola={e} limitePadrao={limitePadrao} />

            <section>
              <h3 className="mb-2 font-semibold">Por finalidade</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finalidade</TableHead>
                    <TableHead className="text-right">Chamadas</TableHead>
                    <TableHead className="text-right">Respostas</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalhe.data.porFinalidade.map((f) => (
                    <TableRow key={f.finalidade}>
                      <TableCell className="capitalize">{f.finalidade}</TableCell>
                      <TableCell className="text-right tabular-nums">{inteiro.format(f.chamadas)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inteiro.format(f.respostas)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tokens(f)}</TableCell>
                      <TableCell className="text-right">
                        <Dinheiro usdValor={f.custoUsd} brlValor={f.custoBrl} semPreco={f.custoIncompleto} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {detalhe.data.porFinalidade.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                        Sem uso neste mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </section>

            <section>
              <h3 className="mb-2 font-semibold">Por dia</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead className="text-right">Respostas</TableHead>
                    <TableHead className="text-right">Testes</TableHead>
                    <TableHead className="text-right">Equipe</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalhe.data.porDia.map((p) => (
                    <TableRow key={p.dia}>
                      <TableCell className="tabular-nums">{formatarSoData(p.dia)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inteiro.format(p.respostas)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inteiro.format(p.testes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inteiro.format(p.paraAEquipe)}</TableCell>
                      <TableCell className="text-right">
                        <Dinheiro usdValor={p.custoUsd} brlValor={cotacao != null ? p.custoBrl : null} semPreco={p.custoIncompleto} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {detalhe.data.porDia.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                        Sem uso neste mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** O limite de respostas da escola e o que acontece ao estourar: decisão do Master, a escola só lê. */
function LimiteEditavel({ escola: e, limitePadrao }: { escola: UsoDeIaEscola; limitePadrao: number }) {
  const salvar = useSalvarLimiteDeIa();
  const [modo, setModo] = useState<ModoDoLimite>(e.limiteProprio == null ? "padrao" : e.limiteProprio === 0 ? "semLimite" : "definir");
  const [valor, setValor] = useState(e.limiteProprio && e.limiteProprio > 0 ? String(e.limiteProprio) : "");
  const [aoEstourar, setAoEstourar] = useState<AoEstourarOLimite>(e.aoEstourarOLimite);

  async function gravar(ev: React.FormEvent) {
    ev.preventDefault();
    let limite: number | null = null;
    if (modo === "semLimite") limite = 0;
    if (modo === "definir") {
      const numero = Number(valor);
      if (!Number.isInteger(numero) || numero < 1) {
        toast.error("Informe quantas respostas por mês, um número inteiro maior que zero.");
        return;
      }
      limite = numero;
    }
    try {
      await salvar.mutateAsync({ tenantId: e.tenantId, limiteMensalDeRespostas: limite, aoEstourarOLimite: aoEstourar });
      toast.success("Limite salvo.");
    } catch (err) {
      toast.error(erroDe(err, "Não foi possível salvar o limite."));
    }
  }

  const opcao = "flex items-start gap-2";

  return (
    <form onSubmit={gravar} className="rounded-lg border border-border bg-muted/40 p-4">
      <h3 className="font-semibold">Limite de respostas por mês</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Só você define. A escola vê &ldquo;X de Y respostas&rdquo; na tela da assistente e é avisada ao passar de 80% e ao chegar a 100%.
        Agora: {e.limiteEfetivo == null ? "sem limite" : `${inteiro.format(e.respostas)} de ${inteiro.format(e.limiteEfetivo)}${e.limiteEhPadrao ? " (padrão)" : ""}`}
        {e.excedente > 0 ? `, ${inteiro.format(e.excedente)} acima do limite` : ""}.
      </p>

      <fieldset className="mb-3 flex flex-col gap-2">
        <legend className="sr-only">Quanto vale o limite</legend>
        <label className={opcao}>
          <input type="radio" name="modo" className="mt-1" checked={modo === "padrao"} onChange={() => setModo("padrao")} />
          <span>Usar o padrão da plataforma ({limitePadrao > 0 ? `${inteiro.format(limitePadrao)} respostas` : "sem limite"})</span>
        </label>
        <label className={opcao}>
          <input type="radio" name="modo" className="mt-1" checked={modo === "semLimite"} onChange={() => setModo("semLimite")} />
          <span>Sem limite para esta escola</span>
        </label>
        <label className={opcao}>
          <input type="radio" name="modo" className="mt-1" checked={modo === "definir"} onChange={() => setModo("definir")} />
          <span className="flex items-center gap-2">
            Definir:
            <Input
              inputMode="numeric"
              aria-label="Respostas por mês"
              value={valor}
              onChange={(ev) => {
                setValor(ev.target.value.replace(/\D/g, ""));
                setModo("definir");
              }}
              className="w-28"
            />
            respostas
          </span>
        </label>
      </fieldset>

      <fieldset className="mb-3 flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">Ao chegar no limite</legend>
        <label className={opcao}>
          <input type="radio" name="estourar" className="mt-1" checked={aoEstourar === "PassarParaEquipe"} onChange={() => setAoEstourar("PassarParaEquipe")} />
          <span>Passar a conversa para a equipe da escola (a assistente para até o mês virar)</span>
        </label>
        <label className={opcao}>
          <input type="radio" name="estourar" className="mt-1" checked={aoEstourar === "Continuar"} onChange={() => setAoEstourar("Continuar")} />
          <span>Continuar respondendo (o excedente aparece aqui para cobrança)</span>
        </label>
      </fieldset>

      <Button type="submit" disabled={salvar.isPending}>
        {salvar.isPending ? "Salvando…" : "Salvar limite"}
      </Button>
    </form>
  );
}
