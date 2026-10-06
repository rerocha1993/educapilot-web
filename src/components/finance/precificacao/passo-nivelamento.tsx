"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarInteiro } from "@/lib/finance/precificacao-formatar";
import {
  useNivelamento,
  type EstudoDetalhe,
  type ItemDeNivelamento,
  type StatusDeNivelamento,
} from "@/lib/finance/use-precificacao";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

const TODOS = "__todos__";

export const ROTULO_DO_STATUS: Record<StatusDeNivelamento, string> = {
  AbaixoDoCusto: "Abaixo do custo",
  AbaixoDoAlvo: "Abaixo do alvo",
  NoAlvo: "No alvo",
  AcimaDoAlvo: "Acima do alvo",
  SemBase: "Sem base de custo",
};

const VARIANTE_DO_STATUS: Record<StatusDeNivelamento, "overdue" | "pending" | "success" | "waiting"> = {
  AbaixoDoCusto: "overdue",
  AbaixoDoAlvo: "pending",
  NoAlvo: "success",
  AcimaDoAlvo: "waiting",
  SemBase: "waiting",
};

const ordemDoStatus: StatusDeNivelamento[] = ["AbaixoDoCusto", "AbaixoDoAlvo", "NoAlvo", "AcimaDoAlvo", "SemBase"];

function EtiquetaDoStatus({ status }: { status: string }) {
  const conhecido = (ordemDoStatus as string[]).includes(status);
  return (
    <Badge variant={conhecido ? VARIANTE_DO_STATUS[status as StatusDeNivelamento] : "waiting"}>
      {conhecido ? ROTULO_DO_STATUS[status as StatusDeNivelamento] : status}
    </Badge>
  );
}

/** A diferença para o alvo: negativa (a família paga menos que o alvo) em vermelho. */
function Diferenca({ valor }: { valor: number }) {
  return (
    <span className={cn("font-mono text-sm tabular-nums", valor < 0 && "font-semibold text-destructive")}>
      {valor > 0 ? "+" : ""}
      {formatarMoeda(valor)}
    </span>
  );
}

/**
 * Passo 5 — nivelamento: cada mensalidade ativa contra o alvo da turma, e o quanto o ano ganha se
 * a escola corrigir as que ficaram abaixo. Lê o último cálculo salvo do estudo.
 */
export function PassoNivelamento({
  estudo,
  ativo,
  alteracoesPendentes,
  onAprovar,
}: {
  estudo: EstudoDetalhe;
  /** A aba está à vista: só então a lista de alunos é buscada. */
  ativo: boolean;
  alteracoesPendentes: boolean;
  onAprovar: () => void;
}) {
  const { data, isLoading, isError, refetch } = useNivelamento(estudo.id, ativo);
  const [status, setStatus] = useState<string>(TODOS);
  const [turma, setTurma] = useState<string>(TODOS);

  const itens = useMemo(() => data?.itens ?? [], [data]);
  const turmas = useMemo(
    () => [...new Set(itens.map((i) => i.turma).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [itens]
  );
  const filtrados = useMemo(
    () =>
      itens.filter(
        (i) => (status === TODOS || i.status === status) && (turma === TODOS || i.turma === turma)
      ),
    [itens, status, turma]
  );

  const resumo = data?.resumo ?? estudo.nivelamentoResumo;
  const impacto = data?.impactoAnual ?? estudo.nivelamentoResumo.impactoAnual;
  const aprovado = estudo.status === "Aprovado";

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
        Compara a mensalidade de cada aluno com o alvo da turma. O impacto é quanto a escola recebe a mais em um ano se
        as mensalidades abaixo do alvo chegarem nele.
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoDeResumo rotulo="Abaixo do custo" valor={resumo.abaixoDoCusto} tom="destructive" />
        <CartaoDeResumo rotulo="Abaixo do alvo" valor={resumo.abaixoDoAlvo} tom="warning" />
        <CartaoDeResumo rotulo="No alvo" valor={resumo.noAlvo} tom="success" />
        <CartaoDeResumo rotulo="Acima do alvo" valor={resumo.acimaDoAlvo} tom="muted" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-[12.5px] text-muted-foreground">Impacto anual se corrigir</p>
          <p className="font-heading text-[22px] font-semibold tracking-[-.02em] tabular-nums">
            {formatarMoeda(impacto)}
          </p>
        </div>
        {!aprovado && (
          <Button variant="action" onClick={onAprovar}>
            <CheckCircle2 />
            Aprovar estudo
          </Button>
        )}
      </div>

      {alteracoesPendentes && (
        <p className="text-xs text-muted-foreground">
          Há alterações não salvas nos outros passos; esta lista mostra o último cálculo salvo.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[14rem_14rem]">
        <Campo id="nv-status" rotulo="Situação">
          <Select value={status} onValueChange={(v) => v && setStatus(v)}>
            <SelectTrigger id="nv-status" className="w-full">
              <SelectValue>
                {() => (status === TODOS ? "Todas" : ROTULO_DO_STATUS[status as StatusDeNivelamento] ?? status)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {ordemDoStatus.map((s) => (
                <SelectItem key={s} value={s}>
                  {ROTULO_DO_STATUS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo id="nv-turma" rotulo="Turma">
          <Select value={turma} onValueChange={(v) => v && setTurma(v)}>
            <SelectTrigger id="nv-turma" className="w-full">
              <SelectValue>{() => (turma === TODOS ? "Todas" : turma)}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {turmas.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar o nivelamento." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <EstadoVazio
          titulo={itens.length === 0 ? "Nenhuma mensalidade ativa" : "Nada com esse filtro"}
          texto={
            itens.length === 0
              ? "Quando houver alunos com plano de mensalidade ativo, eles aparecem aqui."
              : "Troque a situação ou a turma para ver outros alunos."
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {formatarInteiro(filtrados.length)} de {formatarInteiro(itens.length)} mensalidades
          </p>

          <div className="flex flex-col gap-2 md:hidden">
            {filtrados.map((i) => (
              <CartaoDaLista
                key={i.tuitionPlanId}
                titulo={i.alunoNome}
                subtitulo={[i.turma, i.responsavelNome].filter(Boolean).join(" · ") || undefined}
                etiquetas={<EtiquetaDoStatus status={i.status} />}
                detalhes={<DetalhesDoItem item={i} />}
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Alvo da turma</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((i) => (
                  <TableRow key={i.tuitionPlanId}>
                    <TableCell className="font-medium">{i.alunoNome}</TableCell>
                    <TableCell>{i.turma ?? "—"}</TableCell>
                    <TableCell>{i.responsavelNome ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{formatarMoeda(i.valorAtual)}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{formatarMoeda(i.alvoDaTurma)}</TableCell>
                    <TableCell className="text-right">
                      <Diferenca valor={i.diferenca} />
                    </TableCell>
                    <TableCell>
                      <EtiquetaDoStatus status={i.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function DetalhesDoItem({ item }: { item: ItemDeNivelamento }) {
  return (
    <>
      <span className="flex justify-between gap-2">
        <span>Atual</span>
        <span className="font-mono tabular-nums">{formatarMoeda(item.valorAtual)}</span>
      </span>
      <span className="flex justify-between gap-2">
        <span>Alvo da turma</span>
        <span className="font-mono tabular-nums">{formatarMoeda(item.alvoDaTurma)}</span>
      </span>
      <span className="flex justify-between gap-2">
        <span>Diferença</span>
        <Diferenca valor={item.diferenca} />
      </span>
    </>
  );
}

const TONS = {
  destructive: { caixa: "border-destructive-border bg-destructive-soft", texto: "text-destructive-soft-foreground" },
  warning: { caixa: "border-warning-border bg-warning-soft", texto: "text-warning-soft-foreground" },
  success: { caixa: "border-success-border bg-success-soft", texto: "text-success-soft-foreground" },
  muted: { caixa: "border-border bg-muted", texto: "text-muted-foreground" },
};

function CartaoDeResumo({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: number;
  tom: keyof typeof TONS;
}) {
  return (
    <div className={cn("rounded-xl border px-4 py-3.5", TONS[tom].caixa)}>
      <p className={cn("text-[12.5px] font-medium", TONS[tom].texto)}>{rotulo}</p>
      <p className={cn("mt-1 font-heading text-[28px] font-semibold tracking-[-.03em] tabular-nums", TONS[tom].texto)}>
        {formatarInteiro(valor)}
      </p>
      <p className={cn("text-[12px]", TONS[tom].texto)}>{valor === 1 ? "mensalidade" : "mensalidades"}</p>
    </div>
  );
}
