"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { SeletorDeTurmas } from "@/components/finance/projetos/seletor-de-turmas";
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
import { Skeleton } from "@/components/ui/skeleton";
import { hojeIsoBrasilia } from "@/lib/format/date";
import {
  useGerarCobrancas,
  usePublicoPrevisto,
  type ProjetoDetalhe,
  type ResultadoDaGeracao,
  type ResponsavelPrevisto,
} from "@/lib/finance/use-projetos";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

type Publico = "turmas" | "responsaveis";

/** Hoje mais `dias`, como "yyyy-MM-dd", sem passar pelo fuso do navegador. */
function maisDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Gerar cobranças das famílias: valor, vencimento e quem recebe. O público aparece antes de gerar
 * — quem já foi cobrado neste projeto fica desabilitado, para ninguém pagar duas vezes a festa.
 * Depois de gerar, o diálogo mostra quantas saíram e quem ficou de fora, com o motivo.
 */
export function DialogGerarCobrancas({ projeto, onFechar }: { projeto: ProjetoDetalhe; onFechar: () => void }) {
  const gerar = useGerarCobrancas(projeto.id);
  const idsDoProjeto = projeto.turmas.map((t) => t.classId);

  const [valor, setValor] = useState<number | null>(projeto.orcamento.valorPorFamilia);
  const [vencimento, setVencimento] = useState(() => maisDias(hojeIsoBrasilia(), 7));
  const [descricao, setDescricao] = useState("");
  const [publico, setPublico] = useState<Publico>("turmas");
  const [turmas, setTurmas] = useState<number[]>(idsDoProjeto);
  const [somenteFinanceiro, setSomenteFinanceiro] = useState(true);
  const [escolhidos, setEscolhidos] = useState<(number | string)[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoDaGeracao | null>(null);

  // No modo "responsáveis" a lista vem de todas as turmas do projeto; no de turmas, das marcadas.
  const turmasDaConsulta = publico === "turmas" ? turmas : idsDoProjeto;
  const previa = usePublicoPrevisto(projeto.id, turmasDaConsulta, !resultado);
  const publicoPrevisto = previa.data ?? [];
  const disponiveis = publicoPrevisto.filter((r) => !r.jaCobrado);
  const jaCobrados = publicoPrevisto.length - disponiveis.length;

  const visiveis = publicoPrevisto.filter((r) => !busca.trim() || normalizar(r.nome).includes(normalizar(busca)));

  function alternar(r: ResponsavelPrevisto, marcado: boolean) {
    setEscolhidos((atual) =>
      marcado ? [...atual.filter((g) => g !== r.guardianId), r.guardianId] : atual.filter((g) => g !== r.guardianId)
    );
  }

  const escolhidosValidos = escolhidos.filter((g) => disponiveis.some((r) => r.guardianId === g));
  const quantos = publico === "turmas" ? disponiveis.length : escolhidosValidos.length;

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (valor === null || valor <= 0) return setErro("Informe o valor da cobrança.");
    if (!vencimento) return setErro("Informe o vencimento.");
    if (quantos === 0) {
      return setErro(publico === "turmas" ? "Não há responsáveis a cobrar neste público." : "Marque quem vai ser cobrado.");
    }

    try {
      const r = await gerar.mutateAsync({
        valor,
        vencimento,
        descricao: descricao.trim() || undefined,
        somenteResponsavelFinanceiro: somenteFinanceiro,
        classIds: publico === "turmas" && turmas.length > 0 ? turmas : undefined,
        guardianIds: publico === "responsaveis" ? escolhidosValidos : undefined,
      });
      setResultado(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar as cobranças.");
    }
  }

  if (resultado) {
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobranças geradas</DialogTitle>
            <DialogDescription>
              {resultado.criadas === 1 ? "1 cobrança criada" : `${resultado.criadas} cobranças criadas`}
              {resultado.ignoradas.length > 0 && `, ${resultado.ignoradas.length} ignorada(s).`}
            </DialogDescription>
          </DialogHeader>

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
          ) : (
            <p className="text-sm text-muted-foreground">Todas as famílias do público receberam a cobrança.</p>
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
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar cobranças</DialogTitle>
          <DialogDescription>
            Cada família recebe uma cobrança com link e Pix. Quem já foi cobrado neste projeto não entra de novo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={confirmar} noValidate className="grid gap-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo id="cobranca-valor" rotulo="Valor por família">
              <CampoDeDinheiro
                id="cobranca-valor"
                valorEmCentavos={emCentavos(valor)}
                onChange={(c) => {
                  setValor(c === null ? null : emReais(c));
                  setErro(null);
                }}
              />
            </Campo>
            <Campo id="cobranca-vencimento" rotulo="Vencimento">
              <Input
                id="cobranca-vencimento"
                type="date"
                value={vencimento}
                min={hojeIsoBrasilia()}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </Campo>
          </div>

          <Campo id="cobranca-descricao" rotulo="Descrição (opcional)" dica="Aparece na cobrança que a família recebe.">
            <Input
              id="cobranca-descricao"
              value={descricao}
              maxLength={120}
              placeholder={projeto.nome}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Campo>

          <div className="grid gap-2">
            <span className="text-sm leading-none font-medium">Quem recebe</span>
            <div role="group" aria-label="Público" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ["turmas", "Turmas do projeto"],
                  ["responsaveis", "Escolher responsáveis"],
                ] as const
              ).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={publico === id}
                  onClick={() => setPublico(id)}
                  className={cn(
                    "min-h-9 rounded-[9px] px-2 text-[13.5px] transition-colors",
                    publico === id
                      ? "bg-card font-semibold shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            {publico === "turmas" && (
              <SeletorDeTurmas
                valor={turmas}
                onChange={setTurmas}
                somente={idsDoProjeto.length > 0 ? idsDoProjeto : undefined}
                textoVazio={
                  idsDoProjeto.length > 0
                    ? "Nenhuma turma marcada: valem as turmas do projeto."
                    : "Nenhuma turma marcada: vale a escola toda."
                }
              />
            )}

            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <Checkbox
                checked={somenteFinanceiro}
                onCheckedChange={(v) => setSomenteFinanceiro(v === true)}
                className="mt-0.5"
              />
              <span>
                Só o responsável financeiro
                <span className="block text-[13px] text-muted-foreground">
                  Uma cobrança por aluno, para quem paga as mensalidades. Desmarcado, todos os responsáveis recebem.
                </span>
              </span>
            </label>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm leading-none font-medium">Prévia do público</span>
              {previa.data && (
                <span className="text-xs text-muted-foreground">
                  {disponiveis.length} a cobrar
                  {jaCobrados > 0 ? ` · ${jaCobrados} já cobrado(s)` : ""}
                </span>
              )}
            </div>

            {publico === "responsaveis" && publicoPrevisto.length > 6 && (
              <Input
                aria-label="Buscar responsável"
                placeholder="Buscar responsável"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            )}

            {previa.isLoading ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : previa.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {previa.error instanceof Error ? previa.error.message : "Não foi possível montar o público."}
              </p>
            ) : publicoPrevisto.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
                Nenhum responsável encontrado para este público.
              </p>
            ) : (
              <>
                {publico === "responsaveis" && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEscolhidos(disponiveis.map((r) => r.guardianId))}
                    >
                      Marcar todos
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEscolhidos([])}>
                      Limpar
                    </Button>
                  </div>
                )}
                <ul className="grid max-h-56 gap-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
                  {visiveis.map((r) => (
                    <li key={String(r.guardianId)}>
                      <label
                        className={cn(
                          "flex min-h-9 items-start gap-2.5 rounded-md px-1.5 py-1.5 text-sm",
                          r.jaCobrado ? "cursor-not-allowed opacity-55" : publico === "responsaveis" && "cursor-pointer hover:bg-muted"
                        )}
                      >
                        {publico === "responsaveis" && (
                          <Checkbox
                            checked={!r.jaCobrado && escolhidos.includes(r.guardianId)}
                            disabled={r.jaCobrado}
                            onCheckedChange={(v) => alternar(r, v === true)}
                            className="mt-0.5"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block break-words">{r.nome}</span>
                          {r.alunos.length > 0 && (
                            <span className="block text-xs text-muted-foreground">{r.alunos.join(", ")}</span>
                          )}
                        </span>
                        {r.jaCobrado && <span className="shrink-0 text-xs text-muted-foreground">já cobrado</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {valor !== null && quantos > 0 && (
            <p className="text-sm text-muted-foreground">
              {quantos} {quantos === 1 ? "responsável" : "responsáveis"} × {formatarMoeda(valor)} ={" "}
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {formatarMoeda(quantos * valor)}
              </span>{" "}
              a receber.
            </p>
          )}

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={gerar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={gerar.isPending}>
              {gerar.isPending ? "Gerando..." : "Gerar cobranças"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
