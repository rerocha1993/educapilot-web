"use client";

import { useState } from "react";
import { CalendarSync, Users, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";

import { DialogAlunosDaMensalidade } from "@/components/relacionamento/pagamentos/dialog-alunos-da-mensalidade";
import { ItemDoResultado } from "@/components/relacionamento/pagamentos/aba-planos";
import { ErroDeCarga } from "@/components/rh/campo";
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
import { nomeDoMes, soNomeDoMes } from "@/lib/relacionamento/pagamentos-util";
import {
  useGerarMensalidades,
  useMensalidades,
  type Mensalidades,
  type ResultadoDaGeracaoMensal,
} from "@/lib/relacionamento/use-pagamentos";
import { formatarMoeda } from "@/lib/rh/formatar";

type Dialogo = { tipo: "alunos" } | { tipo: "gerar" };

/**
 * O cartão da Mensalidade, no topo da aba Recorrente: quantos alunos pagam, o valor e o dia mais
 * comuns, em que carteira cai e qual é o próximo mês a gerar.
 */
export function CartaoDaMensalidade() {
  const { data, isLoading, isError, refetch } = useMensalidades();
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  if (isError) return <ErroDeCarga texto="Não foi possível carregar a mensalidade." onTentar={() => refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-52 w-full rounded-xl" aria-busy />;

  const semAlunos = data.quantidadeAtivos === 0;
  const proximoMes = soNomeDoMes(data.proximaCompetencia);

  return (
    <section aria-label="Mensalidade" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="font-heading text-[15px] font-semibold">Mensalidade</h3>
        <Badge variant="default">Todo mês</Badge>
        {data.gerarCobrancaAsaasPadrao && (
          <Badge variant="waiting">
            <Zap aria-hidden />
            Link automático
          </Badge>
        )}
      </div>

      {semAlunos ? (
        <p className="text-[13px] text-muted-foreground">
          Nenhum aluno na mensalidade ainda. Toque em &quot;Alunos e valores&quot; para escolher quem paga e quanto.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
          <div>
            <dt className="text-xs text-muted-foreground">Alunos na mensalidade</dt>
            <dd className="font-mono font-semibold tabular-nums">{data.quantidadeAtivos}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Valor mais comum</dt>
            <dd className="font-mono font-semibold tabular-nums">{formatarMoeda(data.valorMaisComum)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Vence mais no dia</dt>
            <dd className="font-mono font-semibold tabular-nums">{data.diaVencimentoMaisComum ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Próximo mês a gerar</dt>
            <dd className="font-semibold">{nomeDoMes(data.proximaCompetencia)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Carteira</dt>
            <dd className="flex items-center gap-1.5 break-words">
              {data.contaNome ? (
                <>
                  <Wallet aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                  {data.contaNome}
                </>
              ) : (
                <span className="text-muted-foreground">Sem carteira</span>
              )}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setDialogo({ tipo: "alunos" })}>
          <Users />
          Alunos e valores
        </Button>
        <Button
          variant="action"
          size="sm"
          disabled={semAlunos}
          title={semAlunos ? "Adicione alunos à mensalidade primeiro" : undefined}
          onClick={() => setDialogo({ tipo: "gerar" })}
        >
          <CalendarSync />
          Gerar parcelas de {proximoMes}
        </Button>
      </div>

      {dialogo?.tipo === "alunos" && <DialogAlunosDaMensalidade onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "gerar" && <DialogGerarMensalidades mensalidade={data} onFechar={() => setDialogo(null)} />}
    </section>
  );
}

/** O resultado de gerar as parcelas: quantas saíram, quantas já existiam, quais não deu e os avisos. */
export function ResultadoDaMensalidade({ resultado }: { resultado: ResultadoDaGeracaoMensal }) {
  const naoDeu = Math.max(resultado.totalDeIgnoradas, resultado.ignoradas.length);
  return (
    <div className="grid gap-3">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <ItemDoResultado rotulo="Criadas" valor={resultado.criadas} />
        <ItemDoResultado rotulo="Já existiam" valor={resultado.existentes} />
        <ItemDoResultado rotulo="Não deu" valor={naoDeu} />
      </dl>

      {resultado.avisos.length > 0 && (
        <ul className="grid gap-1 rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          {resultado.avisos.map((a, n) => (
            <li key={`${a}-${n}`}>{a}</li>
          ))}
        </ul>
      )}

      {resultado.ignoradas.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Ficaram de fora</p>
          <ul className="grid max-h-60 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 text-sm">
            {resultado.ignoradas.map((i, n) => (
              <li key={`${i.nome}-${n}`} className="rounded-md px-1.5 py-1">
                <span className="font-medium">{i.nome}</span>
                <span className="block text-[13px] text-muted-foreground">{i.motivo}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : naoDeu > 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {naoDeu === 1 ? "1 aluno ficou de fora" : `${naoDeu} alunos ficaram de fora`}, por falta de responsável financeiro ou
          por não estarem em vigor neste mês.
        </p>
      ) : resultado.criadas > 0 ? (
        <p className="text-sm text-muted-foreground">Todos os alunos da mensalidade receberam a parcela.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma parcela nova: todas deste mês já tinham sido geradas.</p>
      )}
    </div>
  );
}

/** Pede o mês (o próximo, por padrão) e gera as parcelas da mensalidade. */
export function DialogGerarMensalidades({
  mensalidade,
  onFechar,
}: {
  mensalidade: Mensalidades;
  onFechar: () => void;
}) {
  const gerar = useGerarMensalidades();
  const [competencia, setCompetencia] = useState(mensalidade.proximaCompetencia);
  const [resultado, setResultado] = useState<ResultadoDaGeracaoMensal | null>(null);

  const ativos = mensalidade.quantidadeAtivos;

  async function confirmar() {
    const [ano, mes] = competencia.split("-").map(Number);
    if (!ano || !mes) return void toast.error("Escolha o mês.");
    try {
      setResultado(await gerar.mutateAsync({ ano, mes }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar as parcelas.");
    }
  }

  if (resultado) {
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Parcelas de {nomeDoMes(competencia)}</DialogTitle>
            <DialogDescription>Mensalidade</DialogDescription>
          </DialogHeader>
          <ResultadoDaMensalidade resultado={resultado} />
          <DialogFooter>
            <Button variant="action" onClick={onFechar}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !gerar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar parcelas de {nomeDoMes(competencia)}</DialogTitle>
          <DialogDescription>
            {ativos} {ativos === 1 ? "aluno" : "alunos"} na mensalidade. Cada um recebe a parcela com o seu valor e o seu dia
            de vencimento. Quem já tem a parcela deste mês não recebe outra.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5 text-sm font-medium">
          Mês
          <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
        </label>
        <DialogFooter>
          <Button variant="outline" disabled={gerar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={gerar.isPending || ativos === 0 || !competencia} onClick={confirmar}>
            {gerar.isPending ? "Gerando..." : "Gerar parcelas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
