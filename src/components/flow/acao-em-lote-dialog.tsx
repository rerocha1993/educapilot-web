"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VincularAlunoDialog } from "@/components/flow/vincular-aluno-dialog";
import {
  MAXIMO_PARA_APLICAR,
  useAplicarAcaoEmLote,
  usePreverAcaoEmLote,
  type AcaoEmLote,
  type ItemEmLote,
  type PreviaEmLote,
  type ResultadoEmLote,
} from "@/lib/flow/use-acoes-em-lote";
import { cn } from "@/lib/utils";

/** Único ponto que conhece uma ação pelo nome: escolher o aluno à mão usa o diálogo individual que já existe. */
const ACAO_COM_ESCOLHA_DE_ALUNO = "vincular-aluno";

const ROTULO_DA_SITUACAO: Record<string, string> = {
  Aplicado: "Feito",
  JaEstava: "Já estava assim",
  Recusado: "Não permitido",
  Erro: "Falhou",
};

function valorDaColuna(item: ItemEmLote, coluna: string) {
  return item.campos.find((c) => c.rotulo === coluna)?.valor?.trim() || "—";
}

/**
 * "Revisar e aplicar": diálogo único para qualquer ação em lote. Pede a prévia (nada é gravado), mostra uma tabela com as
 * colunas que a API mandou, deixa a pessoa marcar o que vale e só então aplica. Depois mostra o resultado por item.
 * Os nomes e envios aparecem só aqui, para quem já tem acesso à Caixa de envios.
 */
export function AcaoEmLoteDialog({
  formId,
  acao,
  respostaIds,
  onFechar,
}: {
  formId: string;
  acao: AcaoEmLote | null;
  /** Os envios selecionados na lista. Vazio = todos os elegíveis da ação. */
  respostaIds: string[];
  onFechar: () => void;
}) {
  return (
    <Dialog open={acao !== null} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-3xl">
        {acao && <Conteudo key={acao.id} formId={formId} acao={acao} respostaIds={respostaIds} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function Conteudo({ formId, acao, respostaIds, onFechar }: { formId: string; acao: AcaoEmLote; respostaIds: string[]; onFechar: () => void }) {
  const prever = usePreverAcaoEmLote(formId);
  const aplicar = useAplicarAcaoEmLote(formId);
  const [previa, setPrevia] = useState<PreviaEmLote | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [parametro, setParametro] = useState("");
  const [resultado, setResultado] = useState<ResultadoEmLote | null>(null);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [erroDaPrevia, setErroDaPrevia] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const pedePrimeiroOParametro = !!acao.parametro;

  function carregar(valorDoParametro?: string) {
    setErroDaPrevia(null);
    setCarregando(true);
    // mutateAsync: o retorno chega mesmo se o React remontar o componente (modo estrito em desenvolvimento).
    prever
      .mutateAsync({ acaoId: acao.id, respostaIds, parametro: valorDoParametro })
      .then((p) => {
        setPrevia(p);
        setMarcados(new Set(p.itens.filter((i) => i.situacao === "Marcado").map((i) => i.respostaId)));
      })
      .catch((err) => setErroDaPrevia(err instanceof Error ? err.message : "Não foi possível montar a prévia."))
      .finally(() => setCarregando(false));
  }

  // Abre já com a prévia (a não ser que a ação peça um parâmetro antes). Uma vez só.
  const iniciou = useRef(false);
  useEffect(() => {
    if (iniciou.current || pedePrimeiroOParametro) return;
    iniciou.current = true;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selecionaveis = (previa?.itens ?? []).filter((i) => i.situacao === "Marcado" || i.situacao === "Proposto");
  const todosMarcados = selecionaveis.length > 0 && selecionaveis.every((i) => marcados.has(i.respostaId));
  const rotuloPorId = new Map((previa?.itens ?? []).map((i) => [i.respostaId, i.rotuloDoItem]));

  function alternar(id: string, ligado: boolean) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (ligado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  async function confirmar() {
    if (!previa) return;
    const itens = previa.itens
      .filter((i) => marcados.has(i.respostaId))
      .map((i) => ({ respostaId: i.respostaId, valor: i.valor ?? null }));
    try {
      const r = await aplicar.mutateAsync({ acaoId: acao.id, itens, parametro: parametro || undefined });
      setResultado(r);
      if (r.recusados === 0 && r.erros === 0) toast.success(`${r.aplicados + r.jaEstavam} envio(s) em ordem.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível aplicar.");
    }
  }

  const colunas = previa?.colunas ?? [];
  const modelo = `28px repeat(${Math.max(colunas.length, 1)}, minmax(0, 1fr))`;

  if (resultado) {
    const problemas = resultado.itens.filter((i) => i.situacao === "Recusado" || i.situacao === "Erro");
    return (
      <>
        <DialogHeader>
          <DialogTitle>{acao.rotulo}: resultado</DialogTitle>
          <DialogDescription>
            <CheckCircle2 aria-hidden className="mr-1 inline size-4 text-primary" />
            {resultado.aplicados} feito(s), {resultado.jaEstavam} já estava(m) assim, {resultado.recusados + resultado.erros} com problema.
          </DialogDescription>
        </DialogHeader>
        {problemas.length > 0 && (
          <ul aria-label="Envios que não foram feitos" className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {problemas.map((i) => (
              <li key={i.respostaId} className="rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{rotuloPorId.get(i.respostaId) || i.rotuloDoItem || "Envio"}</span>
                <span className="ml-2 text-xs text-muted-foreground">{ROTULO_DA_SITUACAO[i.situacao]}</span>
                {i.motivo && <p className="text-xs text-muted-foreground">{i.motivo}</p>}
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="action" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </>
    );
  }

  const demais = marcados.size > MAXIMO_PARA_APLICAR;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{acao.rotulo}: revisar e aplicar</DialogTitle>
        <DialogDescription>{acao.descricao} Nada é feito até você aplicar.</DialogDescription>
      </DialogHeader>

      {pedePrimeiroOParametro && !previa && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <label htmlFor="parametro-da-acao" className="text-xs font-medium text-muted-foreground">
              {acao.parametro!.rotulo}
            </label>
            <select
              id="parametro-da-acao"
              value={parametro}
              onChange={(e) => setParametro(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">Escolha…</option>
              {acao.parametro!.opcoes.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" disabled={!parametro || carregando} onClick={() => carregar(parametro)}>
            Ver prévia
          </Button>
        </div>
      )}

      {carregando && <p className="text-sm text-muted-foreground">Montando a prévia…</p>}
      {erroDaPrevia && (
        <p role="alert" className="text-sm text-destructive">
          {erroDaPrevia}
        </p>
      )}

      {previa && previa.itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum envio para esta ação agora.</p>}

      {previa && previa.itens.length > 0 && (
        <>
          {previa.truncado && (
            <p role="note" className="text-xs text-muted-foreground">
              Mostrando os {previa.itens.length} envios mais recentes de {previa.totalElegiveis}. Aplique e abra de novo para ver os outros.
            </p>
          )}

          <div className="flex max-h-[55vh] flex-col overflow-y-auto rounded-xl border border-border">
            <div
              className="sticky top-0 z-10 hidden items-center gap-3 border-b border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[var(--cols)]"
              style={{ "--cols": modelo } as React.CSSProperties}
            >
              <Checkbox
                aria-label="Marcar todos os que podem ser aplicados"
                checked={todosMarcados}
                disabled={selecionaveis.length === 0}
                onCheckedChange={(v) => setMarcados(v ? new Set(selecionaveis.map((i) => i.respostaId)) : new Set())}
              />
              {colunas.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>

            <ul>
              {previa.itens.map((item) => {
                const selecionavel = item.situacao === "Marcado" || item.situacao === "Proposto";
                const aviso = item.motivo && (item.situacao === "SemProposta" || item.situacao === "Proposto");
                return (
                  <li
                    key={item.respostaId}
                    className={cn("border-b border-border px-3 py-2.5 text-sm last:border-b-0", !selecionavel && "bg-muted/30")}
                  >
                    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 md:grid-cols-[var(--cols)]" style={{ "--cols": modelo } as React.CSSProperties}>
                      <Checkbox
                        aria-label={`Aplicar em ${item.rotuloDoItem}`}
                        checked={marcados.has(item.respostaId)}
                        disabled={!selecionavel}
                        onCheckedChange={(v) => alternar(item.respostaId, !!v)}
                      />
                      {colunas.map((c, indice) => (
                        <div key={c} className={cn("min-w-0 break-words", indice > 0 && "col-start-2 md:col-start-auto")}>
                          <span className="text-xs text-muted-foreground md:hidden">{c}: </span>
                          <span className={cn(valorDaColuna(item, c) === "—" && "text-muted-foreground")}>{valorDaColuna(item, c)}</span>
                        </div>
                      ))}
                    </div>
                    {(aviso || (acao.id === ACAO_COM_ESCOLHA_DE_ALUNO && item.situacao !== "Marcado")) && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 pl-[40px]">
                        {aviso && <span className="text-xs text-muted-foreground">{item.motivo}</span>}
                        {acao.id === ACAO_COM_ESCOLHA_DE_ALUNO && (
                          <Button variant="outline" size="sm" onClick={() => setEscolhendo(item.respostaId)}>
                            <UserRound className="size-3.5" /> Escolher aluno
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      <DialogFooter className="items-center sm:justify-between">
        <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{marcados.size}</span> selecionado(s)
          {demais && <span className="text-destructive"> · aplique no máximo {MAXIMO_PARA_APLICAR} por vez</span>}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={marcados.size === 0 || demais || aplicar.isPending} onClick={() => void confirmar()}>
            {aplicar.isPending ? "Aplicando…" : `Aplicar a ${marcados.size} envio${marcados.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogFooter>

      {/* Exceção da ação "vincular aluno": o diálogo individual já existente. Ao fechar, a prévia é refeita. */}
      {escolhendo && (
        <VincularAlunoDialog
          formId={formId}
          responseId={escolhendo}
          onFechar={() => {
            setEscolhendo(null);
            carregar(parametro || undefined);
          }}
        />
      )}
    </>
  );
}
