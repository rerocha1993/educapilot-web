"use client";

import { useState } from "react";
import { Moon, Smile, Toilet, UtensilsCrossed, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { horaAgora } from "@/components/relacionamento/diario/comum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACEITACOES,
  HIGIENES,
  HUMORES,
  REFEICOES,
  rotuloDoSubtipo,
  type Aceitacao,
  type Refeicao,
  type TipoDeRegistro,
} from "@/lib/relacionamento/diario-vocabulario";
import { useLancarEmLote, type BlocosDaTurma, type RegistroParaSalvar } from "@/lib/relacionamento/use-diario";
import { cn } from "@/lib/utils";

type Grupo = "refeicao" | "sono" | "higiene" | "humor";

const CHAVE_DO_SONO = "diario:sono-padrao";

/** A refeição que costuma ser a da hora: o primeiro toque já cai no botão certo. */
function refeicaoDaHora(): Refeicao {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h < 9.5) return "CafeDaManha";
  if (h < 11.5) return "LancheDaManha";
  if (h < 14.5) return "Almoco";
  if (h < 17.5) return "LancheDaTarde";
  return "Jantar";
}

/** O sono que a turma costuma ter (lembrado neste aparelho). Só horários: nada de aluno ou saúde. */
function sonoPadrao(): { inicio: string; fim: string } {
  try {
    const salvo = JSON.parse(window.localStorage.getItem(CHAVE_DO_SONO) ?? "null") as { inicio?: string; fim?: string } | null;
    if (salvo?.inicio && salvo.fim) return { inicio: salvo.inicio, fim: salvo.fim };
  } catch {
    // sem armazenamento (janela privada): fica o padrão
  }
  return { inicio: "13:00", fim: "15:00" };
}

const TOM_DA_ACEITACAO: Record<Aceitacao, string> = {
  Recusou: "bg-destructive-soft text-destructive-soft-foreground",
  Pouco: "bg-warning-soft text-warning-soft-foreground",
  Metade: "bg-warning-soft text-warning-soft-foreground",
  Bem: "bg-success-soft text-success-soft-foreground",
  Tudo: "bg-success-soft text-success-soft-foreground",
};

/**
 * Lançamento rápido: o mesmo registro para todos os alunos marcados, em um toque.
 *
 * Refeição (escolhe qual e toca na aceitação), sono (dois horários), higiene e humor (um toque
 * cada). O servidor não sobrescreve o que o aluno já tem do mesmo bloco/horário; o aviso diz
 * quantos foram lançados e quantos já tinham. Só aparecem os blocos que a turma usa.
 */
export function LancamentoRapido({
  classId,
  data,
  blocos,
  selecionados,
  onLimpar,
}: {
  classId: number;
  data: string;
  blocos: BlocosDaTurma;
  selecionados: number[];
  onLimpar: () => void;
}) {
  const grupos = ([
    blocos.alimentacao && { id: "refeicao", rotulo: "Refeição", icone: UtensilsCrossed },
    blocos.sono && { id: "sono", rotulo: "Sono", icone: Moon },
    blocos.higiene && { id: "higiene", rotulo: "Higiene", icone: Toilet },
    blocos.humor && { id: "humor", rotulo: "Humor", icone: Smile },
  ] as ({ id: Grupo; rotulo: string; icone: LucideIcon } | false)[]).filter(
    (g): g is { id: Grupo; rotulo: string; icone: LucideIcon } => g !== false
  );

  const [aberto, setAberto] = useState<Grupo | null>(null);
  const [refeicao, setRefeicao] = useState<Refeicao>(refeicaoDaHora);
  const [sono, setSono] = useState(sonoPadrao);
  const [hora, setHora] = useState("");
  const lote = useLancarEmLote();

  const grupoAtual = grupos.find((g) => g.id === aberto) ?? grupos[0] ?? null;
  const n = selecionados.length;
  const ocupado = lote.isPending;

  async function aplicar(tipo: TipoDeRegistro, registro: RegistroParaSalvar, descricao: string) {
    try {
      const r = await lote.mutateAsync({ classId, data, studentIds: selecionados, tipo, registro });
      const ja = r.jaLancados.length;
      const aplicados = r.aplicados.length;
      const quem = aplicados === 1 ? "1 aluno" : `${aplicados} alunos`;
      if (aplicados === 0) toast.info(`${descricao}: todos já tinham esse lançamento.`);
      else
        toast.success(
          ja > 0 ? `${descricao}: ${quem}. ${ja === 1 ? "1 já tinha" : `${ja} já tinham`} e ficou como estava.` : `${descricao}: ${quem}.`
        );
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível lançar para a turma.");
    }
  }

  function lancarSono() {
    if (!sono.inicio) {
      toast.error("Informe a hora em que o sono começou.");
      return;
    }
    if (sono.fim && sono.fim <= sono.inicio) {
      toast.error("O fim do sono precisa ser depois do começo.");
      return;
    }
    try {
      window.localStorage.setItem(CHAVE_DO_SONO, JSON.stringify(sono));
    } catch {
      // sem armazenamento: só não lembra
    }
    void aplicar("Sono", { horaInicio: sono.inicio, horaFim: sono.fim || null }, `Sono ${sono.inicio}${sono.fim ? `–${sono.fim}` : ""}`);
  }

  return (
    <section
      aria-label="Lançamento rápido"
      className="sticky bottom-3 z-20 flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-[0_12px_32px_-12px_rgba(42,37,48,.35)] max-md:bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-semibold" aria-live="polite">
          Lançamento rápido · {n} {n === 1 ? "aluno" : "alunos"}
        </p>

        <div role="group" aria-label="Tipo de lançamento" className="flex gap-1 rounded-lg bg-muted p-1">
          {grupos.map((g) => {
            const Icone = g.icone;
            const ativo = grupoAtual?.id === g.id;
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => setAberto(g.id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors md:min-h-8",
                  ativo ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icone aria-hidden className="size-4" /> {g.rotulo}
              </button>
            );
          })}
        </div>

        <Button type="button" variant="ghost" size="icon" aria-label="Limpar seleção" onClick={onLimpar}>
          <X />
        </Button>
      </div>

      {grupoAtual?.id === "refeicao" && (
        <div className="flex flex-col gap-2">
          <div role="group" aria-label="Refeição" className="flex flex-wrap gap-1.5">
            {REFEICOES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={refeicao === r.id}
                onClick={() => setRefeicao(r.id)}
                className={cn(
                  "min-h-10 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors md:min-h-8",
                  refeicao === r.id ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {r.rotulo}
              </button>
            ))}
          </div>
          <div role="group" aria-label={`Aceitação — ${rotuloDoSubtipo("Alimentacao", refeicao)}`} className="grid grid-cols-5 gap-1.5">
            {ACEITACOES.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={ocupado}
                onClick={() =>
                  void aplicar("Alimentacao", { subtipo: refeicao, nivel: a.id }, `${rotuloDoSubtipo("Alimentacao", refeicao)}: ${a.rotulo}`)
                }
                className={cn(
                  "min-h-11 rounded-lg px-1 text-[13px] font-semibold transition-opacity disabled:opacity-50 md:min-h-9",
                  TOM_DA_ACEITACAO[a.id]
                )}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {grupoAtual?.id === "sono" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Começou
            <Input type="time" value={sono.inicio} onChange={(e) => setSono({ ...sono, inicio: e.target.value })} className="w-32" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Acordou
            <Input type="time" value={sono.fim} onChange={(e) => setSono({ ...sono, fim: e.target.value })} className="w-32" />
          </label>
          <Button type="button" disabled={ocupado} onClick={lancarSono} className="min-h-11 md:min-h-8">
            Lançar sono
          </Button>
        </div>
      )}

      {(grupoAtual?.id === "higiene" || grupoAtual?.id === "humor") && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              Hora
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-32" aria-describedby="dica-da-hora" />
            </label>
            <p id="dica-da-hora" className="text-xs text-muted-foreground">
              {hora ? "Vale para os próximos toques." : "Vazio: usa a hora do toque."}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {grupoAtual.id === "higiene" &&
              HIGIENES.filter((h) => h.id !== "TrocaDeFralda" || blocos.fralda).map((h) => (
                <Button
                  key={h.id}
                  type="button"
                  variant="outline"
                  disabled={ocupado}
                  className="min-h-11 px-4 md:min-h-9"
                  onClick={() => void aplicar("Higiene", { subtipo: h.id, horaInicio: hora || horaAgora() }, h.rotulo)}
                >
                  {h.rotulo}
                </Button>
              ))}
            {grupoAtual.id === "humor" &&
              HUMORES.map((h) => (
                <Button
                  key={h.id}
                  type="button"
                  variant="outline"
                  disabled={ocupado}
                  className="min-h-11 px-4 md:min-h-9"
                  onClick={() => void aplicar("Humor", { subtipo: h.id, horaInicio: hora || horaAgora() }, h.rotulo)}
                >
                  {h.rotulo}
                </Button>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
