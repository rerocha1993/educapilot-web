"use client";

import { Fragment, useState } from "react";
import { AlertTriangle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import {
  BarraDeSalvar,
  projetadoDaLinha,
  type EdicaoDoEstudo,
  type LinhaEditavel,
} from "@/components/finance/precificacao/rascunho";
import { Campo } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { BotaoDeIcone } from "@/components/rh/lista-movel";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarPercentual } from "@/lib/finance/precificacao-formatar";
import {
  GRUPOS_DE_CUSTO,
  rotuloDoGrupo,
  useRecalcularBase,
  useSalvarLinhas,
  type GrupoDeCusto,
} from "@/lib/finance/use-precificacao";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

/** Colunas da linha no desktop; no celular a linha vira um bloco com rótulos. */
const COLUNAS =
  "md:grid-cols-[minmax(0,1.5fr)_5.5rem_9.5rem_6.5rem_7.5rem_minmax(0,1.2fr)_2.25rem] md:items-center";

/** Valor da linha para totais e barras: o projetado do servidor; sem ele (linha mexida), a base. */
const valorDaLinha = (l: LinhaEditavel) => projetadoDaLinha(l) ?? l.base;

let sequencia = 0;
const novaChave = () => `nova-${++sequencia}`;

/**
 * Passo 1 — custos: a base de despesas do financeiro por grupo, com o aumento previsto de cada
 * linha. Linha automática só aceita aumento e observação; a manual é toda editável.
 */
export function PassoCustos({ edicao }: { edicao: EdicaoDoEstudo }) {
  const { estudo, linhas, somenteLeitura } = edicao;
  const salvar = useSalvarLinhas(estudo.id);
  const recalcular = useRecalcularBase(estudo.id);
  const [adicionando, setAdicionando] = useState(false);
  const [confirmandoRecarga, setConfirmandoRecarga] = useState(false);

  const lista = linhas.valor;
  const semBase = !lista.some((l) => l.origem === "Automatica" && l.base > 0);

  // Grupos na ordem do catálogo; grupo que o servidor mandar e a tela não conhecer vai no fim.
  const conhecidos: string[] = [...GRUPOS_DE_CUSTO];
  const grupos = [...conhecidos, ...new Set(lista.map((l) => l.grupo).filter((g) => !conhecidos.includes(g)))]
    .map((g) => ({ grupo: g, itens: lista.filter((l) => l.grupo === g) }))
    .filter((g) => g.itens.length > 0);

  const totalGeral = lista.reduce((s, l) => s + valorDaLinha(l), 0);
  const baseGeral = lista.reduce((s, l) => s + l.base, 0);
  const algumaAlterada = lista.some((l) => projetadoDaLinha(l) === null);

  function mudar(chave: string, parte: Partial<LinhaEditavel>) {
    linhas.editar((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...parte } : l)));
  }

  async function gravar() {
    try {
      await salvar.mutateAsync(
        lista.map((l, i) => ({
          id: l.id,
          nome: l.nome.trim(),
          grupo: l.grupo,
          valorMensalBase: l.base,
          aumentoPercentual: l.aumento ?? undefined,
          ordem: i,
          observacao: l.observacao.trim() || undefined,
        }))
      );
      linhas.descartar();
      toast.success("Custos salvos.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar os custos.");
    }
  }

  async function recarregar() {
    try {
      await recalcular.mutateAsync();
      linhas.descartar();
      setConfirmandoRecarga(false);
      toast.success("Base automática recarregada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível recarregar a base automática.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
          A base vem dos últimos 12 meses de despesas do financeiro, por categoria. Ajuste o aumento previsto de
          cada linha; o que ficar em branco usa o aumento geral do estudo ({formatarPercentual(estudo.aumentoGeralPercentual)}).
        </p>
        {!somenteLeitura && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirmandoRecarga(true)}>
              <RefreshCw />
              Recarregar base automática
            </Button>
            <Button variant="outline" onClick={() => setAdicionando(true)}>
              <Plus />
              Adicionar custo
            </Button>
          </div>
        )}
      </div>

      {semBase && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          O financeiro ainda não tem 12 meses de despesas; preencha a base à mão.
        </div>
      )}

      <ParticipacaoDosGrupos
        grupos={grupos.map((g) => ({
          rotulo: rotuloDoGrupo(g.grupo),
          total: g.itens.reduce((s, l) => s + valorDaLinha(l), 0),
        }))}
        total={totalGeral}
      />

      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum custo ainda. Use &ldquo;Adicionar custo&rdquo; para preencher a base à mão.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            className={cn(
              "hidden gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground md:grid",
              COLUNAS
            )}
          >
            <span>Custo</span>
            <span>Origem</span>
            <span className="text-right">Base mensal</span>
            <span className="text-right">Aumento</span>
            <span className="text-right">Projetado</span>
            <span>Observação</span>
            <span />
          </div>

          {grupos.map(({ grupo, itens }) => {
            const projetadoDoGrupo = itens.reduce((s, l) => s + valorDaLinha(l), 0);
            const baseDoGrupo = itens.reduce((s, l) => s + l.base, 0);
            return (
              <Fragment key={grupo}>
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-3 py-2">
                  <span className="font-heading text-sm font-semibold">{rotuloDoGrupo(grupo)}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    base {formatarMoeda(baseDoGrupo)} · projetado {formatarMoeda(projetadoDoGrupo)}
                  </span>
                </div>
                {itens.map((l) => (
                  <LinhaDeCustoEditavel
                    key={l.chave}
                    linha={l}
                    padrao={estudo.aumentoGeralPercentual}
                    somenteLeitura={somenteLeitura}
                    onMudar={(parte) => mudar(l.chave, parte)}
                    onRemover={() => linhas.editar((atual) => atual.filter((x) => x.chave !== l.chave))}
                  />
                ))}
              </Fragment>
            );
          })}

          <div className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-3 md:hidden">
            <span className="font-heading text-sm font-semibold">Total geral</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              base {formatarMoeda(baseGeral)} · projetado {algumaAlterada ? "—" : formatarMoeda(totalGeral)}
            </span>
          </div>
          <div className={cn("hidden gap-2 bg-muted/40 px-3 py-3 font-semibold md:grid", COLUNAS)}>
            <span className="font-heading text-sm">Total geral</span>
            <span />
            <span className="text-right font-mono text-sm tabular-nums">{formatarMoeda(baseGeral)}</span>
            <span />
            <span className="text-right font-mono text-sm tabular-nums">
              {algumaAlterada ? "—" : formatarMoeda(totalGeral)}
            </span>
            <span />
            <span />
          </div>
        </div>
      )}

      {algumaAlterada && !somenteLeitura && lista.length > 0 && (
        <p className="text-xs text-muted-foreground">
          O projetado das linhas alteradas aparece depois de salvar.
        </p>
      )}

      {!somenteLeitura && (
        <BarraDeSalvar
          sujo={linhas.sujo}
          salvando={salvar.isPending}
          onSalvar={gravar}
          onDescartar={linhas.descartar}
        />
      )}

      {adicionando && (
        <DialogNovoCusto
          onFechar={() => setAdicionando(false)}
          onAdicionar={(l) => {
            linhas.editar((atual) => [...atual, l]);
            setAdicionando(false);
          }}
        />
      )}

      {confirmandoRecarga && (
        <Confirmacao
          titulo="Recarregar a base automática?"
          descricao={`Os valores das linhas automáticas voltam a ser calculados a partir das despesas do financeiro.${
            linhas.sujo ? " As alterações não salvas dos custos serão descartadas." : ""
          }`}
          rotuloConfirmar="Recarregar"
          pendente={recalcular.isPending}
          onConfirmar={recarregar}
          onFechar={() => setConfirmandoRecarga(false)}
        />
      )}
    </div>
  );
}

function LinhaDeCustoEditavel({
  linha,
  padrao,
  somenteLeitura,
  onMudar,
  onRemover,
}: {
  linha: LinhaEditavel;
  padrao: number;
  somenteLeitura: boolean;
  onMudar: (parte: Partial<LinhaEditavel>) => void;
  onRemover: () => void;
}) {
  const manual = linha.origem === "Manual";
  const projetado = projetadoDaLinha(linha);
  const editaBase = manual && !somenteLeitura;

  return (
    <div className={cn("grid gap-2 border-b border-border px-3 py-3 last:border-0", COLUNAS)}>
      <div className="min-w-0">
        {manual && !somenteLeitura ? (
          <Input
            aria-label="Nome do custo"
            value={linha.nome}
            maxLength={120}
            onChange={(e) => onMudar({ nome: e.target.value })}
          />
        ) : (
          <span className="block text-sm font-medium break-words">{linha.nome}</span>
        )}
      </div>

      <div>
        <Badge variant={manual ? "waiting" : "success"}>{manual ? "Manual" : "Automática"}</Badge>
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-xs text-muted-foreground md:hidden">Base mensal</span>
        {editaBase ? (
          <CampoDeDinheiro
            valorEmCentavos={emCentavos(linha.base)}
            onChange={(c) => onMudar({ base: emReais(c) })}
            className="w-36 md:w-full"
          />
        ) : (
          <span className="block text-right font-mono text-sm tabular-nums">{formatarMoeda(linha.base)}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-xs text-muted-foreground md:hidden">Aumento</span>
        {somenteLeitura ? (
          <span className="block text-right font-mono text-sm tabular-nums">
            {linha.aumento === null ? `${formatarPercentual(padrao)} (geral)` : formatarPercentual(linha.aumento)}
          </span>
        ) : (
          <CampoNumerico
            valor={linha.aumento}
            onChange={(v) => onMudar({ aumento: v })}
            sufixo="%"
            placeholder="geral"
            ariaLabel={`Aumento de ${linha.nome}`}
            className="w-28 md:w-full"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-xs text-muted-foreground md:hidden">Projetado</span>
        <span className="block text-right font-mono text-sm font-semibold tabular-nums">
          {projetado === null ? "—" : formatarMoeda(projetado)}
        </span>
      </div>

      <div className="min-w-0">
        {somenteLeitura ? (
          <span className="block text-[13px] text-muted-foreground">{linha.observacao || "—"}</span>
        ) : (
          <Input
            aria-label={`Observação de ${linha.nome}`}
            placeholder="Observação"
            value={linha.observacao}
            maxLength={300}
            onChange={(e) => onMudar({ observacao: e.target.value })}
          />
        )}
      </div>

      <div className="flex justify-end">
        {manual && !somenteLeitura && (
          <BotaoDeIcone rotulo={`Remover ${linha.nome || "custo"}`} icone={<Trash2 />} perigo onClick={onRemover} />
        )}
      </div>
    </div>
  );
}

/** Quanto cada grupo pesa no custo total: barras de CSS, sem biblioteca de gráfico. */
function ParticipacaoDosGrupos({
  grupos,
  total,
}: {
  grupos: { rotulo: string; total: number }[];
  total: number;
}) {
  if (grupos.length === 0 || total <= 0) return null;
  const ordenados = [...grupos].sort((a, b) => b.total - a.total);

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Participação de cada grupo no custo">
      <h3 className="font-heading text-sm font-semibold">Participação de cada grupo</h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {ordenados.map((g) => {
          const pct = (g.total / total) * 100;
          return (
            <li key={g.rotulo} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 text-[13px]">
              <span className="truncate">{g.rotulo}</span>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 1)}%` }} />
              </div>
              <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                {formatarMoeda(g.total)} · {formatarPercentual(Math.round(pct * 10) / 10)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DialogNovoCusto({
  onFechar,
  onAdicionar,
}: {
  onFechar: () => void;
  onAdicionar: (linha: LinhaEditavel) => void;
}) {
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<GrupoDeCusto>("Outros");
  const [base, setBase] = useState<number | null>(null);
  const [aumento, setAumento] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Dê um nome ao custo.");
    if (base === null || base < 0) return setErro("Informe o valor mensal.");
    onAdicionar({
      chave: novaChave(),
      nome: nome.trim(),
      grupo,
      origem: "Manual",
      base: emReais(base),
      aumento,
      observacao: "",
    });
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar custo</DialogTitle>
          <DialogDescription>
            Para o que o financeiro não registra ainda. A linha entra no estudo quando você salvar os custos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={confirmar} className="grid gap-3.5">
          <Campo id="custo-nome" rotulo="Nome">
            <Input id="custo-nome" value={nome} maxLength={120} autoFocus onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo id="custo-grupo" rotulo="Grupo">
            <Select value={grupo} onValueChange={(v) => v && setGrupo(v as GrupoDeCusto)}>
              <SelectTrigger id="custo-grupo" className="w-full">
                <SelectValue>{() => rotuloDoGrupo(grupo)}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {GRUPOS_DE_CUSTO.map((g) => (
                  <SelectItem key={g} value={g}>
                    {rotuloDoGrupo(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo id="custo-base" rotulo="Base mensal">
              <CampoDeDinheiro id="custo-base" valorEmCentavos={base} onChange={setBase} />
            </Campo>
            <Campo id="custo-aumento" rotulo="Aumento previsto" dica="Em branco usa o aumento geral.">
              <CampoNumerico id="custo-aumento" valor={aumento} onChange={setAumento} sufixo="%" placeholder="geral" />
            </Campo>
          </div>
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action">
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
