"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  PERIODO_COM_ORIENTACAO,
  PERIODOS_DA_MODALIDADE,
  ROTULO_DA_ORIENTACAO,
  ROTULO_DO_PERIODO,
  useSalvarModalidade,
  type Modalidade,
  type OrientacaoDaModalidade,
  type PeriodoDaModalidade,
} from "@/lib/finance/use-precificacao";

const SEM_ORIENTACAO = "__nenhuma__";

/** Horas por dia que o próprio nome do período já diz (6, 8 e 10 horas). */
const HORAS_DO_PERIODO: Partial<Record<PeriodoDaModalidade, number>> = { SeisHoras: 6, OitoHoras: 8, DezHoras: 10 };

/**
 * Nova modalidade ou edição de uma existente. O par período + orientação é único: o servidor
 * responde 409 se já existe, e a mensagem vai para a tela.
 */
export function DialogModalidade({ modalidade, onFechar }: { modalidade: Modalidade | null; onFechar: () => void }) {
  const salvar = useSalvarModalidade();
  const [nome, setNome] = useState(modalidade?.nome ?? "");
  const [periodo, setPeriodo] = useState<PeriodoDaModalidade>(modalidade?.periodo ?? "Integral");
  const [orientacao, setOrientacao] = useState<OrientacaoDaModalidade | null>(modalidade?.orientacao ?? null);
  const [horas, setHoras] = useState<number | null>(modalidade?.horasPorDia ?? null);
  const [refeicoes, setRefeicoes] = useState<number | null>(modalidade?.refeicoesIncluidas ?? 0);
  const [extras, setExtras] = useState(modalidade?.atividadesExtrasIncluidas ?? false);
  const [ativa, setAtiva] = useState(modalidade?.ativa ?? true);
  const [erro, setErro] = useState<string | null>(null);

  const comOrientacao = PERIODO_COM_ORIENTACAO.includes(periodo);

  function escolherPeriodo(novo: PeriodoDaModalidade) {
    setPeriodo(novo);
    if (!PERIODO_COM_ORIENTACAO.includes(novo)) setOrientacao(null);
    const sugerida = HORAS_DO_PERIODO[novo];
    if (sugerida !== undefined) setHoras(sugerida);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro("Dê um nome à modalidade.");
    if (horas === null || horas <= 0 || horas > 24) return setErro("Informe quantas horas por dia a criança fica (entre 1 e 24).");
    if (refeicoes === null || refeicoes < 0 || refeicoes > 10 || !Number.isInteger(refeicoes)) {
      return setErro("Informe as refeições por dia, um número inteiro de 0 a 10.");
    }

    try {
      await salvar.mutateAsync({
        id: modalidade?.id,
        dados: {
          nome: nome.trim(),
          periodo,
          orientacao: comOrientacao ? orientacao : null,
          horasPorDia: horas,
          refeicoesIncluidas: refeicoes,
          atividadesExtrasIncluidas: extras,
          ativa,
          ordem: modalidade?.ordem,
        },
      });
      toast.success(modalidade ? "Modalidade atualizada." : "Modalidade criada.");
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a modalidade.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !salvar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalidade ? "Editar modalidade" : "Nova modalidade"}</DialogTitle>
          <DialogDescription>
            Um jeito de a criança ficar na escola. O custo é dividido por horas, refeições e atividades.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={confirmar} className="grid gap-3.5">
          <Campo id="mod-nome" rotulo="Nome">
            <Input id="mod-nome" value={nome} maxLength={80} autoFocus onChange={(e) => setNome(e.target.value)} />
          </Campo>

          <Campo id="mod-periodo" rotulo="Período">
            <Select value={periodo} onValueChange={(v) => v && escolherPeriodo(v as PeriodoDaModalidade)}>
              <SelectTrigger id="mod-periodo" className="w-full">
                <SelectValue>{() => ROTULO_DO_PERIODO[periodo]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {PERIODOS_DA_MODALIDADE.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULO_DO_PERIODO[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          {comOrientacao && (
            <Campo
              id="mod-orientacao"
              rotulo="Horário fixo"
              dica="Se a família informa sempre a entrada ou sempre a saída. Cada combinação de período e horário fixo só pode existir uma vez."
            >
              <Select
                value={orientacao ?? SEM_ORIENTACAO}
                onValueChange={(v) => v && setOrientacao(v === SEM_ORIENTACAO ? null : (v as OrientacaoDaModalidade))}
              >
                <SelectTrigger id="mod-orientacao" className="w-full">
                  <SelectValue>{() => (orientacao ? ROTULO_DA_ORIENTACAO[orientacao] : "Não informado")}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={SEM_ORIENTACAO}>Não informado</SelectItem>
                  <SelectItem value="Entrada">{ROTULO_DA_ORIENTACAO.Entrada}</SelectItem>
                  <SelectItem value="Saida">{ROTULO_DA_ORIENTACAO.Saida}</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo id="mod-horas" rotulo="Horas por dia">
              <CampoNumerico id="mod-horas" valor={horas} onChange={setHoras} sufixo="h" min={0} max={24} />
            </Campo>
            <Campo id="mod-refeicoes" rotulo="Refeições por dia">
              <CampoNumerico
                id="mod-refeicoes"
                valor={refeicoes}
                onChange={(v) => setRefeicoes(v === null ? null : Math.round(v))}
                min={0}
                max={10}
              />
            </Campo>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox checked={extras} onCheckedChange={(v) => setExtras(v === true)} className="mt-0.5" />
            <span className="grid gap-0.5 text-sm">
              <span className="font-medium">Inclui atividades extras</span>
              <span className="text-[13px] text-muted-foreground">
                O custo das atividades entra na mensalidade de toda criança desta modalidade.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox checked={ativa} onCheckedChange={(v) => setAtiva(v === true)} className="mt-0.5" />
            <span className="grid gap-0.5 text-sm">
              <span className="font-medium">Ativa</span>
              <span className="text-[13px] text-muted-foreground">
                Desative em vez de excluir quando a escola deixar de oferecer esta modalidade.
              </span>
            </span>
          </label>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={salvar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
