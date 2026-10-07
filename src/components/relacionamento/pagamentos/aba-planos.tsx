"use client";

import { useState, type ReactNode } from "react";
import { CalendarSync, Pencil, Power, Users, Wallet } from "lucide-react";
import { toast } from "sonner";

import { DialogAlunosDoPlano, DialogPlano } from "@/components/relacionamento/pagamentos/dialog-plano";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
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
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { nomeDoMes } from "@/lib/relacionamento/pagamentos-util";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  useAlternarPlano,
  useGerarCobrancasDoPlano,
  usePlano,
  usePlanos,
  type Plano,
  type PlanoDetalhe,
  type ResultadoDoPlano,
} from "@/lib/relacionamento/use-pagamentos";
import { cn } from "@/lib/utils";

function vigencia(p: Plano): string {
  return p.fim ? `${formatarSoData(p.inicio)} a ${formatarSoData(p.fim)}` : `desde ${formatarSoData(p.inicio)}`;
}

type Dialogo =
  | { tipo: "editar"; plano: Plano }
  | { tipo: "alunos"; plano: Plano }
  | { tipo: "gerar"; plano: Plano }
  | { tipo: "alternar"; plano: Plano };

/**
 * Cartões dos planos "Outro" (período integral, transporte, aula extra), um por plano, com as
 * ações do plano. A lista é vazia quando a escola não tem plano nenhum; nesse caso não desenha
 * nada, e quem usa decide o que mostrar com `aoVazio`.
 */
export function CartoesDosPlanos({ aoVazio }: { aoVazio?: ReactNode }) {
  const { data, isLoading, isError, refetch } = usePlanos();
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const planos = data ?? [];

  return (
    <>
      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os planos." onTentar={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : planos.length === 0 ? (
        (aoVazio ?? null)
      ) : (
        <>
          {planos.map((p) => (
            <CartaoDoPlano key={p.id} plano={p} onDialogo={setDialogo} />
          ))}
        </>
      )}

      {dialogo?.tipo === "editar" && <DialogPlano plano={dialogo.plano} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "alunos" && (
        <ComDetalheDoPlano planoId={dialogo.plano.id} titulo={`Alunos de ${dialogo.plano.nome}`} onFechar={() => setDialogo(null)}>
          {(detalhe) => (
            <DialogAlunosDoPlano
              planoId={detalhe.id}
              nome={detalhe.nome}
              inicial={detalhe.alunos.filter((a) => a.ativo).map((a) => a.studentId)}
              onFechar={() => setDialogo(null)}
            />
          )}
        </ComDetalheDoPlano>
      )}
      {dialogo?.tipo === "gerar" && (
        <ComDetalheDoPlano planoId={dialogo.plano.id} titulo={`Gerar cobranças de ${dialogo.plano.nome}`} onFechar={() => setDialogo(null)}>
          {(detalhe) => <DialogGerarDoPlano plano={detalhe} onFechar={() => setDialogo(null)} />}
        </ComDetalheDoPlano>
      )}
      {dialogo?.tipo === "alternar" && <AlternarPlano plano={dialogo.plano} onFechar={() => setDialogo(null)} />}
    </>
  );
}

/** O cartão de um plano "Outro": o que ele cobra e as ações. */
function CartaoDoPlano({ plano: p, onDialogo }: { plano: Plano; onDialogo: (d: Dialogo) => void }) {
  return (
    <section
      aria-label={`Plano ${p.nome}`}
      className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", !p.ativo && "bg-muted/40")}
    >
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-heading text-[15px] font-semibold break-words">{p.nome}</h3>
          <Badge variant={p.ativo ? "success" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
          {p.gerarCobrancaAsaas && <Badge variant="waiting">Link automático</Badge>}
        </div>
        {p.descricao && <p className="text-[13px] break-words text-muted-foreground">{p.descricao}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
        <div>
          <dt className="text-xs text-muted-foreground">Valor por mês</dt>
          <dd className="font-mono font-semibold tabular-nums">{formatarMoeda(p.valor)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Vence todo dia</dt>
          <dd className="font-mono font-semibold tabular-nums">{p.diaVencimento}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Alunos</dt>
          <dd className="font-mono font-semibold tabular-nums">{p.alunos}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Vale</dt>
          <dd>{vigencia(p)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Carteira</dt>
          <dd className="flex items-center gap-1.5 break-words">
            {p.contaNome ? (
              <>
                <Wallet aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                {p.contaNome}
              </>
            ) : (
              <span className="text-muted-foreground">Sem carteira</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onDialogo({ tipo: "editar", plano: p })}>
          <Pencil />
          Editar
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDialogo({ tipo: "alunos", plano: p })}>
          <Users />
          Alunos
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!p.ativo}
          title={p.ativo ? undefined : "Ative o plano para gerar cobranças"}
          onClick={() => onDialogo({ tipo: "gerar", plano: p })}
        >
          <CalendarSync />
          Gerar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDialogo({ tipo: "alternar", plano: p })}>
          <Power />
          {p.ativo ? "Desativar" : "Ativar"}
        </Button>
      </div>
    </section>
  );
}

/** Busca o detalhe do plano (com a lista de alunos) antes de abrir o diálogo que precisa dele. */
function ComDetalheDoPlano({
  planoId,
  titulo,
  onFechar,
  children,
}: {
  planoId: string;
  titulo: string;
  onFechar: () => void;
  children: (detalhe: PlanoDetalhe) => ReactNode;
}) {
  const { data, isError, isFetching, refetch } = usePlano(planoId);
  // Congela o detalhe na primeira leitura em dia: salvar invalida a consulta, e sem isto o diálogo
  // aberto piscaria de volta para o "abrindo" durante a releitura.
  const [detalhe, setDetalhe] = useState<PlanoDetalhe | null>(null);
  if (!detalhe && data && !isFetching) setDetalhe(data);
  if (detalhe) return <>{children(detalhe)}</>;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Abrindo o plano.</DialogDescription>
        </DialogHeader>
        {isError ? (
          <ErroDeCarga texto="Não foi possível abrir o plano." onTentar={() => refetch()} />
        ) : (
          <Skeleton className="h-20 w-full rounded-lg" aria-busy />
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

function AlternarPlano({ plano: p, onFechar }: { plano: Plano; onFechar: () => void }) {
  const alternar = useAlternarPlano();

  async function confirmar() {
    try {
      await alternar.mutateAsync({ id: p.id, ativar: !p.ativo });
      toast.success(p.ativo ? "Plano desativado." : "Plano ativado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mudar o plano.");
    }
  }

  return (
    <Confirmacao
      titulo={p.ativo ? "Desativar este plano?" : "Ativar este plano?"}
      descricao={
        p.ativo
          ? `"${p.nome}" deixa de gerar cobranças. As que já foram geradas continuam valendo.`
          : `"${p.nome}" volta a poder gerar cobranças mensais.`
      }
      rotuloConfirmar={p.ativo ? "Desativar" : "Ativar"}
      perigosa={p.ativo}
      pendente={alternar.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}

/** Pede o mês, confirma quantos alunos entram e mostra o que saiu. */
export function DialogGerarDoPlano({
  plano: p,
  competenciaInicial,
  onFechar,
}: {
  plano: PlanoDetalhe;
  /** "yyyy-MM". Sem ela, o mês de hoje. */
  competenciaInicial?: string;
  onFechar: () => void;
}) {
  const gerar = useGerarCobrancasDoPlano();
  const hoje = hojeIsoBrasilia();
  const { ano: anoAtual, mes: mesAtual } = competenciaDeIso(hoje);
  const [competencia, setCompetencia] = useState(competenciaInicial ?? `${anoAtual}-${String(mesAtual).padStart(2, "0")}`);
  const [resultado, setResultado] = useState<ResultadoDoPlano | null>(null);

  const ativos = p.alunos.filter((a) => a.ativo).length;

  async function confirmar() {
    const [ano, mes] = competencia.split("-").map(Number);
    if (!ano || !mes) return void toast.error("Escolha o mês.");
    try {
      setResultado(await gerar.mutateAsync({ id: p.id, ano, mes }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar as cobranças do plano.");
    }
  }

  if (resultado) {
    const ignoradas = Math.max(resultado.totalDeIgnoradas, resultado.ignoradas.length);
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobranças de {nomeDoMes(competencia)}</DialogTitle>
            <DialogDescription>{p.nome}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <ItemDoResultado rotulo="Criadas" valor={resultado.criadas} />
            <ItemDoResultado rotulo="Já existiam" valor={resultado.existentes} />
            <ItemDoResultado rotulo="Não deu" valor={ignoradas} />
          </dl>
          {resultado.ignoradas.length > 0 && (
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
          )}
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
          <DialogTitle>Gerar cobranças de {nomeDoMes(competencia)}</DialogTitle>
          <DialogDescription>
            {ativos} {ativos === 1 ? "aluno ativo" : "alunos ativos"} em {p.nome}, {formatarMoeda(p.valor)} cada
            {ativos > 0 && <>, {formatarMoeda(ativos * p.valor)} no total</>}. Quem já tem a cobrança deste mês não recebe outra.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5 text-sm font-medium">
          Mês
          <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
        </label>
        {ativos === 0 && (
          <p role="status" className="text-[13px] text-muted-foreground">
            Este plano ainda não tem alunos. Use &quot;Alunos&quot; no cartão do plano para escolher quem é cobrado.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={gerar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={gerar.isPending || ativos === 0 || !competencia} onClick={confirmar}>
            {gerar.isPending ? "Gerando..." : "Gerar cobranças"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ItemDoResultado({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2.5">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}
