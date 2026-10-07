"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { SeletorDeTurmas } from "@/components/finance/projetos/seletor-de-turmas";
import { SeletorDeAlunos } from "@/components/relacionamento/pagamentos/seletor-de-alunos";
import { Segmentado } from "@/components/relacionamento/segmentado";
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
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  useGerarCobrancasAvulsas,
  usePublicoPrevistoDaEscola,
  type ResponsavelPrevisto,
  type ResultadoDaGeracao,
} from "@/lib/relacionamento/use-pagamentos";
import { cn } from "@/lib/utils";

type Publico = "turmas" | "alunos" | "responsaveis";

const PUBLICOS = [
  { id: "turmas", rotulo: "Por turma" },
  { id: "alunos", rotulo: "Por aluno" },
  { id: "responsaveis", rotulo: "Responsáveis" },
] as const;

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
 * Cobrança única (evento, taxa, material): descrição, valor, vencimento e quem recebe. O público
 * aparece antes de gerar, como na cobrança do projeto; no fim, quantas saíram e quem ficou de
 * fora, com o motivo.
 */
export function DialogNovaCobranca({ onFechar }: { onFechar: () => void }) {
  const gerar = useGerarCobrancasAvulsas();

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<number | null>(null);
  const [vencimento, setVencimento] = useState(() => maisDias(hojeIsoBrasilia(), 7));
  const [publico, setPublico] = useState<Publico>("turmas");
  const [turmas, setTurmas] = useState<number[]>([]);
  const [alunos, setAlunos] = useState<number[]>([]);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [somenteFinanceiro, setSomenteFinanceiro] = useState(true);
  const [gerarAsaas, setGerarAsaas] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoDaGeracao | null>(null);

  // "Por aluno" sem ninguém marcado não tem público: a consulta espera. Nas outras, vazio é a escola toda.
  const consultaLiberada = !resultado && (publico !== "alunos" || alunos.length > 0);
  const previa = usePublicoPrevistoDaEscola(
    publico === "turmas" ? turmas : [],
    publico === "alunos" ? alunos : [],
    consultaLiberada
  );
  const previsto = consultaLiberada ? (previa.data ?? []) : [];
  const disponiveis = previsto.filter((r) => !r.jaCobrado);
  const jaCobrados = previsto.length - disponiveis.length;
  const visiveis = previsto.filter((r) => !busca.trim() || normalizar(r.nome).includes(normalizar(busca)));

  const escolhidosValidos = escolhidos.filter((g) => disponiveis.some((r) => r.guardianId === g));
  const quantos = publico === "responsaveis" ? escolhidosValidos.length : disponiveis.length;

  function alternar(r: ResponsavelPrevisto, marcado: boolean) {
    setEscolhidos((atual) =>
      marcado ? [...atual.filter((g) => g !== r.guardianId), r.guardianId] : atual.filter((g) => g !== r.guardianId)
    );
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) return setErro("Diga o que está sendo cobrado.");
    if (valor === null || valor <= 0) return setErro("Informe o valor da cobrança.");
    if (!vencimento) return setErro("Informe o vencimento.");
    if (quantos === 0) {
      return setErro(
        publico === "responsaveis"
          ? "Marque quem vai ser cobrado."
          : publico === "alunos" && alunos.length === 0
            ? "Marque os alunos que vão ser cobrados."
            : "Não há responsáveis a cobrar neste público."
      );
    }

    try {
      const r = await gerar.mutateAsync({
        descricao: descricao.trim(),
        valor,
        vencimento,
        classIds: publico === "turmas" && turmas.length > 0 ? turmas : undefined,
        studentIds: publico === "alunos" ? alunos : undefined,
        guardianIds: publico === "responsaveis" ? escolhidosValidos : undefined,
        somenteResponsavelFinanceiro: somenteFinanceiro,
        gerarAsaas,
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
          <DialogTitle>Nova cobrança única</DialogTitle>
          <DialogDescription>
            Evento, taxa ou material: cada família recebe uma cobrança e a vê no portal dos pais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={confirmar} noValidate className="grid gap-3.5">
          <Campo id="nova-descricao" rotulo="O que está sendo cobrado">
            <Input
              id="nova-descricao"
              value={descricao}
              maxLength={120}
              placeholder="Ex.: Passeio ao zoológico"
              onChange={(e) => {
                setDescricao(e.target.value);
                setErro(null);
              }}
            />
          </Campo>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo id="nova-valor" rotulo="Valor por família">
              <CampoDeDinheiro
                id="nova-valor"
                valorEmCentavos={emCentavos(valor)}
                onChange={(c) => {
                  setValor(c === null ? null : emReais(c));
                  setErro(null);
                }}
              />
            </Campo>
            <Campo id="nova-vencimento" rotulo="Vencimento">
              <Input
                id="nova-vencimento"
                type="date"
                value={vencimento}
                min={hojeIsoBrasilia()}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </Campo>
          </div>

          <div className="grid gap-2">
            <span className="text-sm leading-none font-medium">Quem recebe</span>
            <Segmentado rotulo="Público" opcoes={PUBLICOS} valor={publico} onChange={setPublico} cheio />

            {publico === "turmas" && (
              <SeletorDeTurmas
                valor={turmas}
                onChange={setTurmas}
                textoVazio="Nenhuma turma marcada: vale a escola toda."
              />
            )}
            {publico === "alunos" && <SeletorDeAlunos valor={alunos} onChange={setAlunos} />}

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

            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <Checkbox checked={gerarAsaas} onCheckedChange={(v) => setGerarAsaas(v === true)} className="mt-0.5" />
              <span>
                Gerar no Asaas (link, Pix e boleto)
                <span className="block text-[13px] text-muted-foreground">
                  Precisa do Asaas da escola configurado e do CPF do responsável. Sem isso a cobrança sai manual: a
                  família vê o valor e paga na secretaria.
                </span>
              </span>
            </label>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm leading-none font-medium">Prévia do público</span>
              {consultaLiberada && previa.data && (
                <span className="text-xs text-muted-foreground">
                  {disponiveis.length} a cobrar
                  {jaCobrados > 0 ? ` · ${jaCobrados} já cobrado(s)` : ""}
                </span>
              )}
            </div>

            {publico === "responsaveis" && previsto.length > 6 && (
              <Input
                aria-label="Buscar responsável"
                placeholder="Buscar responsável"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            )}

            {!consultaLiberada ? (
              <p className="rounded-lg border border-dashed border-border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
                Marque os alunos para ver quem recebe.
              </p>
            ) : previa.isLoading ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : previa.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {previa.error instanceof Error ? previa.error.message : "Não foi possível montar o público."}
              </p>
            ) : previsto.length === 0 ? (
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
                <ul aria-label="Responsáveis do público" className="grid max-h-56 gap-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
                  {visiveis.map((r) => (
                    <li key={r.guardianId}>
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
              <span className="font-mono font-semibold text-foreground tabular-nums">{formatarMoeda(quantos * valor)}</span>{" "}
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
