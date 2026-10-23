"use client";

import { useState } from "react";
import { Plus, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { COMPONENTES, useConfiguracaoDeDesempenho } from "@/lib/rh/use-desempenho";
import {
  DECISAO_DA_RECOMENDACAO,
  DECISOES,
  DIAS_ATE_REVISAO,
  DIAS_DO_PRAZO_DO_PLANO,
  MINIMO_DA_JUSTIFICATIVA,
  MINIMO_DA_JUSTIFICATIVA_AO_DISCORDAR,
  ROTULO_DA_DECISAO,
  ROTULO_DA_RECOMENDACAO,
  somarDias,
  useRegistrarDecisao,
  type MetaParaCriar,
  type Parecer,
  type PedidoDeDecisao,
  type TipoDeDecisao,
} from "@/lib/rh/use-parecer";
import { cn } from "@/lib/utils";

import { Campo } from "../campo";

const SEM_COMPONENTE = "nenhum";
const AJUDA_DA_DECISAO: Record<TipoDeDecisao, string> = {
  Manter: "Segue como está.",
  Acompanhar: "Mais atenção, com data para olhar de novo.",
  PlanoDeMelhoria: "Abre um plano com metas e prazo.",
  Desligar: "Só registra a decisão; o desligamento é feito na ficha.",
};

interface MetaEmEdicao {
  chave: number;
  descricao: string;
  componente: string;
  notaAlvo: string;
  criarCard: boolean;
}

function Erro({ texto }: { texto: string | null }) {
  return (
    texto && (
      <p role="alert" className="text-sm font-medium text-destructive">
        {texto}
      </p>
    )
  );
}

/**
 * "Registrar decisão": a direção escolhe uma das quatro decisões (a recomendada já vem marcada), justifica e marca a
 * próxima revisão. Plano de melhoria abre o formulário do plano; Desligar pede confirmação explícita e, depois de
 * registrada, oferece o atalho para o "Desligar" da ficha (o sistema nunca desliga ninguém sozinho).
 */
export function DialogoDeDecisao({
  funcionarioId,
  parecer,
  onFechar,
  onDesligar,
}: {
  funcionarioId: string;
  parecer: Parecer;
  onFechar: () => void;
  /** Abre o "Desligar" da ficha; ausente quando a pessoa já foi desligada ou o usuário não escreve no RH. */
  onDesligar?: () => void;
}) {
  const registrar = useRegistrarDecisao(funcionarioId);
  const { data: configuracao } = useConfiguracaoDeDesempenho();
  const hoje = hojeIsoBrasilia();
  const padrao = DECISAO_DA_RECOMENDACAO[parecer.recomendacao] ?? "Acompanhar";
  const temPlano = parecer.planoEmAndamento != null;

  const [decisao, setDecisao] = useState<TipoDeDecisao>(padrao === "PlanoDeMelhoria" && temPlano ? "Acompanhar" : padrao);
  const [justificativa, setJustificativa] = useState("");
  const [revisao, setRevisao] = useState(() => (DIAS_ATE_REVISAO[padrao] ? somarDias(hoje, DIAS_ATE_REVISAO[padrao]) : ""));
  const [objetivo, setObjetivo] = useState("");
  const [prazo, setPrazo] = useState(() => somarDias(hoje, DIAS_DO_PRAZO_DO_PLANO));
  const [metas, setMetas] = useState<MetaEmEdicao[]>([{ chave: 1, descricao: "", componente: SEM_COMPONENTE, notaAlvo: "", criarCard: false }]);
  const [confirmo, setConfirmo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [registrada, setRegistrada] = useState(false);

  const discorda = DECISAO_DA_RECOMENDACAO[parecer.recomendacao] !== decisao;
  const minimo = discorda ? MINIMO_DA_JUSTIFICATIVA_AO_DISCORDAR : MINIMO_DA_JUSTIFICATIVA;
  const tamanho = justificativa.trim().length;
  const nomeDoComponente = (chave: string) => configuracao?.componentes.find((c) => c.chave === chave)?.nome ?? chave;
  const pedeRevisao = decisao === "Acompanhar" || decisao === "PlanoDeMelhoria";

  function escolher(nova: TipoDeDecisao) {
    setDecisao(nova);
    setErro(null);
    // A data sugerida acompanha a decisão; a pessoa pode trocar depois.
    setRevisao(DIAS_ATE_REVISAO[nova] ? somarDias(hoje, DIAS_ATE_REVISAO[nova]) : "");
  }

  const mudarMeta = (chave: number, parte: Partial<MetaEmEdicao>) =>
    setMetas((atual) => atual.map((m) => (m.chave === chave ? { ...m, ...parte } : m)));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (tamanho < minimo) return setErro(`Escreva ao menos ${minimo} caracteres na justificativa (faltam ${minimo - tamanho}).`);
    if (pedeRevisao && !revisao) return setErro("Informe a data da próxima revisão.");
    if (pedeRevisao && revisao <= hoje) return setErro("A próxima revisão precisa ser depois de hoje.");
    if (decisao === "Desligar" && !confirmo) return setErro("Marque a confirmação para registrar o desligamento.");

    const pedido: PedidoDeDecisao = { decisao, justificativa: justificativa.trim() };
    if (pedeRevisao) pedido.proximaRevisaoEm = revisao;
    if (decisao === "Desligar") pedido.confirmo = true;

    if (decisao === "PlanoDeMelhoria") {
      if (!objetivo.trim()) return setErro("Informe o objetivo do plano.");
      if (!prazo || prazo <= hoje) return setErro("O prazo do plano precisa ser depois de hoje.");
      const lista: MetaParaCriar[] = [];
      for (const m of metas) {
        if (!m.descricao.trim()) {
          if (m.notaAlvo.trim() || m.componente !== SEM_COMPONENTE) return setErro("Há uma meta sem descrição.");
          continue;
        }
        const alvo = m.notaAlvo.trim() === "" ? null : Number(m.notaAlvo.replace(",", "."));
        if (alvo != null && (Number.isNaN(alvo) || alvo < 0 || alvo > 100)) return setErro("A nota alvo deve ficar entre 0 e 100.");
        lista.push({
          descricao: m.descricao.trim(),
          ...(m.componente !== SEM_COMPONENTE ? { componente: m.componente } : {}),
          ...(alvo != null ? { notaAlvo: alvo } : {}),
          ...(m.criarCard ? { criarCard: true } : {}),
        });
      }
      pedido.plano = { objetivo: objetivo.trim(), fim: prazo, metas: lista };
    }

    try {
      await registrar.mutateAsync(pedido);
      toast.success("Decisão registrada.");
      // Desligar: a decisão ficou registrada, mas a ficha ainda não mudou; oferece o atalho antes de fechar.
      if (decisao === "Desligar" && onDesligar) setRegistrada(true);
      else onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível registrar a decisão.");
    }
  }

  if (registrada) {
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decisão registrada</DialogTitle>
            <DialogDescription>
              A decisão de desligar ficou registrada com a justificativa, mas a ficha não mudou. Para desligar de fato, use o
              botão abaixo (o fluxo de sempre, com a data do desligamento).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onFechar}>
              Agora não
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onFechar();
                onDesligar?.();
              }}
            >
              <UserMinus /> Desligar na ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !registrar.isPending && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar decisão</DialogTitle>
          <DialogDescription>
            O sistema recomenda <strong>{ROTULO_DA_RECOMENDACAO[parecer.recomendacao] ?? parecer.recomendacao}</strong>; a decisão é sua e
            fica registrada, sem edição. Errou? Registre outra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="grid min-w-0 gap-3">
          <fieldset className="grid min-w-0 gap-1.5">
            <legend className="mb-1 text-sm font-medium">Decisão</legend>
            {DECISOES.map((d) => {
              const bloqueada = d === "PlanoDeMelhoria" && temPlano;
              const marcada = decisao === d;
              return (
                <label
                  key={d}
                  className={cn(
                    "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 rounded-lg border px-3 py-2 text-sm",
                    marcada ? "border-primary bg-primary/5" : "border-border",
                    bloqueada && "cursor-not-allowed opacity-60"
                  )}
                >
                  <input
                    type="radio"
                    name="decisao"
                    value={d}
                    checked={marcada}
                    disabled={bloqueada}
                    onChange={() => escolher(d)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{ROTULO_DA_DECISAO[d]}</span>
                    {DECISAO_DA_RECOMENDACAO[parecer.recomendacao] === d && (
                      <span className="ml-2 text-xs font-semibold text-primary">recomendada</span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {bloqueada ? "Já há um plano em andamento: acompanhe ou encerre o atual." : AJUDA_DA_DECISAO[d]}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <Campo
            id="dec-justificativa"
            rotulo={discorda ? "Justificativa (a decisão é diferente do parecer)" : "Justificativa"}
            dica={
              discorda
                ? `Como a decisão difere do parecer, explique com ao menos ${MINIMO_DA_JUSTIFICATIVA_AO_DISCORDAR} caracteres.`
                : `Ao menos ${MINIMO_DA_JUSTIFICATIVA} caracteres. Descreva fatos, não julgamentos.`
            }
          >
            <Textarea
              id="dec-justificativa"
              rows={4}
              maxLength={4000}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              aria-invalid={erro != null && tamanho < minimo}
            />
            <span className={cn("text-right text-xs tabular-nums", tamanho >= minimo ? "text-muted-foreground" : "text-destructive")}>
              {tamanho} / {minimo} mínimo
            </span>
          </Campo>

          {pedeRevisao && (
            <Campo id="dec-revisao" rotulo="Próxima revisão" dica={`Sugerida: ${formatarSoData(somarDias(hoje, DIAS_ATE_REVISAO[decisao] ?? 30))}.`}>
              <Input id="dec-revisao" type="date" value={revisao} min={somarDias(hoje, 1)} onChange={(e) => setRevisao(e.target.value)} className="max-w-48" />
            </Campo>
          )}

          {decisao === "PlanoDeMelhoria" && (
            <div className="grid min-w-0 gap-3 rounded-lg border border-border p-3">
              <p className="font-heading text-sm font-semibold">Plano de melhoria</p>
              <Campo id="plano-objetivo" rotulo="Objetivo">
                <Textarea id="plano-objetivo" rows={2} maxLength={1000} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
              </Campo>
              <Campo id="plano-prazo" rotulo="Prazo" dica="A pessoa vê o plano, as metas e o prazo em Meu desempenho e é avisada no sino.">
                <Input id="plano-prazo" type="date" value={prazo} min={somarDias(hoje, 1)} onChange={(e) => setPrazo(e.target.value)} className="max-w-48" />
              </Campo>

              <div className="grid min-w-0 gap-2">
                <p className="text-sm font-medium">Metas</p>
                {metas.map((m, i) => (
                  <div key={m.chave} className="grid min-w-0 gap-2 rounded-lg bg-muted/40 p-2.5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <Input
                        aria-label={`Descrição da meta ${i + 1}`}
                        placeholder="O que precisa mudar"
                        maxLength={500}
                        value={m.descricao}
                        onChange={(e) => mudarMeta(m.chave, { descricao: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover a meta ${i + 1}`}
                        onClick={() => setMetas((atual) => atual.filter((x) => x.chave !== m.chave))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,6.5rem)] gap-2">
                      <Select value={m.componente} onValueChange={(v) => v && mudarMeta(m.chave, { componente: v })}>
                        <SelectTrigger aria-label={`Componente da meta ${i + 1}`} className="w-full">
                          <SelectValue>{() => (m.componente === SEM_COMPONENTE ? "Sem componente da nota" : nomeDoComponente(m.componente))}</SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectItem value={SEM_COMPONENTE}>Sem componente da nota</SelectItem>
                          {COMPONENTES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {nomeDoComponente(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        aria-label={`Nota alvo da meta ${i + 1}`}
                        placeholder="Nota alvo"
                        inputMode="decimal"
                        value={m.notaAlvo}
                        onChange={(e) => mudarMeta(m.chave, { notaAlvo: e.target.value })}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[13px]">
                      <Checkbox checked={m.criarCard} onCheckedChange={(v) => mudarMeta(m.chave, { criarCard: v === true })} />
                      Criar card no quadro da pessoa (se ela tem usuário)
                    </label>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() =>
                    setMetas((atual) => [
                      ...atual,
                      { chave: Math.max(0, ...atual.map((x) => x.chave)) + 1, descricao: "", componente: SEM_COMPONENTE, notaAlvo: "", criarCard: false },
                    ])
                  }
                >
                  <Plus /> Adicionar meta
                </Button>
              </div>
            </div>
          )}

          {decisao === "Desligar" && (
            <div className="grid gap-2 rounded-lg border border-destructive-border bg-destructive-soft p-3 text-[13px] text-destructive-soft-foreground">
              <p>
                Isto registra a decisão de desligar, com a sua justificativa, mas <strong>não desliga ninguém</strong>. O desligamento
                continua sendo feito pelo botão &quot;Desligar&quot; da ficha.
              </p>
              <label className="flex items-start gap-2 font-medium">
                <Checkbox className="mt-0.5" checked={confirmo} onCheckedChange={(v) => setConfirmo(v === true)} />
                Confirmo que a decisão é de desligar esta pessoa.
              </label>
            </div>
          )}

          <Erro texto={erro} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={registrar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={registrar.isPending}>
              {registrar.isPending ? "Registrando..." : "Registrar decisão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
