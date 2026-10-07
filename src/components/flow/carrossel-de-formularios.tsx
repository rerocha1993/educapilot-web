"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, SlidersHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { useForms } from "@/lib/flow/use-forms";
import type { ResumoDeFormulario } from "@/lib/flow/use-resumo-formularios";
import {
  PREFERENCIAS_VAZIAS,
  usePreferenciasDoInicio,
  useSalvarPreferenciasDoInicio,
} from "@/lib/kernel/use-painel-preferencias";

const dinheiro = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * Carrossel com um cartão por formulário escolhido.
 *
 * Formulário não é só rematrícula: cada cartão mostra o que aquele formulário tem — dinheiro só
 * quando existe campo de dinheiro, quebra por turma só quando existe campo de turma. O resto é
 * envio, que todo formulário tem. Tocar no cartão abre os envios daquele formulário.
 */
export function CarrosselDeFormularios({
  resumos,
  podeEscolher,
}: {
  resumos: ResumoDeFormulario[];
  /** Sem acesso a Formulários, a pessoa vê os cartões mas não mexe na escolha. */
  podeEscolher: boolean;
}) {
  const trilho = useRef<HTMLDivElement>(null);
  const [escolhendo, setEscolhendo] = useState(false);

  function deslizar(direcao: 1 | -1) {
    const el = trilho.current;
    if (!el) return;
    el.scrollBy({ left: direcao * (el.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-[17px] font-semibold md:text-[15.5px]">Formulários</h2>

        <div className="flex items-center gap-1.5">
          {podeEscolher && (
            <Button variant="outline" size="sm" onClick={() => setEscolhendo(true)}>
              <SlidersHorizontal className="size-3.5" />
              Escolher
            </Button>
          )}
          {/* Setas só no computador: no celular o dedo arrasta. */}
          <div className="hidden gap-1 md:flex">
            <Button variant="outline" size="icon-sm" aria-label="Anterior" onClick={() => deslizar(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Próximo" onClick={() => deslizar(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {resumos.length === 0 ? (
        <EstadoVazio
          icone={<Inbox />}
          titulo="Nenhum formulário com envios ainda"
          texto="Quando as famílias começarem a responder, o resultado aparece aqui."
          acao={
            podeEscolher ? (
              <Link href="/flow" className={buttonVariants({ variant: "outline" })}>
                Ver formulários
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div
          ref={trilho}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0"
        >
          {resumos.map((r) => (
            <CartaoDoFormulario key={r.formId} resumo={r} />
          ))}
        </div>
      )}

      {escolhendo && <EscolherFormularios onFechar={() => setEscolhendo(false)} />}
    </section>
  );
}

function CartaoDoFormulario({ resumo }: { resumo: ResumoDeFormulario }) {
  const {
    formId,
    nome,
    totalEnvios,
    concluidos,
    aguardando,
    temValor,
    somaValor,
    rotuloValor,
    temTurma,
    rotuloTurma,
    porTurma,
  } = resumo;

  const maiorTurma = Math.max(1, ...porTurma.map((t) => t.quantidade));

  return (
    <Link
      href={`/flow/${formId}/respostas`}
      className="flex w-[82%] shrink-0 snap-start flex-col gap-3 rounded-xl border border-border bg-card px-4.5 pt-4 pb-4 transition-colors hover:border-action-brand sm:w-[300px]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[13px] font-semibold leading-snug text-foreground">{nome}</span>
        {aguardando > 0 && (
          <span className="shrink-0 rounded-md bg-action-soft px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap tabular-nums text-action-soft-foreground">
            {aguardando} aguard.
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-heading text-[26px] font-semibold tracking-[-.03em] tabular-nums sm:text-[28px]">
          {totalEnvios}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {totalEnvios === 1 ? "envio" : "envios"} ·{" "}
          <span className="font-mono tabular-nums">{concluidos}</span> concluídos
        </span>
      </div>

      {/* Dinheiro só quando o formulário tem campo de dinheiro. */}
      {temValor && somaValor !== null && (
        <div className="rounded-lg bg-success-soft px-3 py-2">
          <span className="block text-[11px] font-medium text-success-soft-foreground">
            {rotuloValor ?? "Valor"} (concluídos)
          </span>
          <span className="block font-mono text-[15px] font-semibold tabular-nums text-success-soft-foreground">
            {dinheiro(somaValor)}
          </span>
        </div>
      )}

      {/* Turma só quando o formulário tem campo de turma. */}
      {temTurma && porTurma.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
            {rotuloTurma ?? "Por turma"}
          </span>
          {porTurma.slice(0, 4).map((t) => (
            <div key={t.turma} className="flex items-center gap-2">
              <span className="w-[86px] shrink-0 truncate text-[12px] text-secondary-foreground">
                {t.turma}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-muted">
                <span
                  className="block h-full rounded-[3px] bg-primary"
                  style={{ width: `${(t.quantidade / maiorTurma) * 100}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                {t.quantidade}
              </span>
            </div>
          ))}
          {porTurma.length > 4 && (
            <span className="text-[11px] text-muted-foreground">
              + <span className="font-mono tabular-nums">{porTurma.length - 4}</span> turmas
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

/** Quais formulários ficam no painel, e em que ordem. Fica salvo na conta de quem escolheu. */
function EscolherFormularios({ onFechar }: { onFechar: () => void }) {
  const { data: forms } = useForms();
  const { data: preferencias } = usePreferenciasDoInicio();
  const salvar = useSalvarPreferenciasDoInicio();
  const [marcados, setMarcados] = useState<string[] | null>(null);

  const lista = forms ?? [];
  // Enquanto a pessoa não mexe, vale o que está salvo.
  const atual = marcados ?? preferencias?.formularios ?? [];

  function alternar(id: string) {
    setMarcados(atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]);
  }

  async function confirmar() {
    // O documento é um só: mexer nos formulários não pode apagar os números e os atalhos que a
    // pessoa escolheu no diálogo de personalizar.
    await salvar.mutateAsync({ ...(preferencias ?? PREFERENCIAS_VAZIAS), formularios: atual });
    onFechar();
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Formulários no painel</DialogTitle>
          <DialogDescription>
            Marque os que você quer ver na tela Início. Sem nenhum marcado, aparecem os que
            receberam envios mais recentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[45vh] flex-col overflow-y-auto">
          {lista.map((f) => (
            <label
              key={f.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border px-1 py-2 last:border-0"
            >
              <Checkbox checked={atual.includes(f.id)} onCheckedChange={() => alternar(f.id)} />
              <span className="min-w-0 flex-1 truncate text-sm">{f.nome}</span>
              {atual.includes(f.id) && (
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {atual.indexOf(f.id) + 1}º
                </span>
              )}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" onClick={confirmar} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ordem do cartão segue a escolha da pessoa; o resto vem como o backend mandou. */
export function ordenarPelaEscolha(
  resumos: ResumoDeFormulario[],
  escolhidos: string[] | undefined
): ResumoDeFormulario[] {
  if (!escolhidos?.length) return resumos;
  const posicao = new Map(escolhidos.map((id, i) => [id, i]));
  return [...resumos].sort(
    (a, b) => (posicao.get(a.formId) ?? 999) - (posicao.get(b.formId) ?? 999)
  );
}
