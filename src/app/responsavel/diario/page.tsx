"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NotebookPen } from "lucide-react";

import { diaDaSemanaCurto, somarDias } from "@/components/relacionamento/diario/comum";
import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { CartaoDoDiario } from "@/components/relacionamento/portal/diario";
import { Skeleton } from "@/components/ui/skeleton";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { useDiariosDoPortal, useDiasDoDiario, useMarcarComoLido } from "@/lib/relacionamento/use-portal-diario";
import { capitalizar, diaComSemana } from "@/lib/tasks/calendario-datas";
import { cn } from "@/lib/utils";

/** Quantos dias a faixa mostra para voltar (o servidor aceita até 92). */
const DIAS_NA_FAIXA = 14;

/**
 * Diário do aluno no portal: o dia da criança, publicado pela escola.
 *
 * Com mais de um filho, a troca fica no topo. A faixa de dias deixa voltar no histórico: o ponto
 * mostra os dias com diário e o ponto laranja, o que ainda não foi aberto. Abrir o diário o marca
 * como lido, sem botão. O link do aviso do celular chega aqui com `?aluno=` e `?data=`.
 */
export default function DiarioDoResponsavelPage() {
  return (
    // useSearchParams precisa de Suspense em volta: sem ele, o Next não consegue pré-renderizar a página.
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <Diario />
    </Suspense>
  );
}

function Diario() {
  const parametros = useSearchParams();
  const hoje = hojeIsoBrasilia();

  const dataDoLink = parametros.get("data");
  const alunoDoLink = Number(parametros.get("aluno"));

  const [dataEscolhida, setDataEscolhida] = useState<string | null>(null);
  const [filhoEscolhido, setFilhoEscolhido] = useState<number | null>(null);

  const data = dataEscolhida ?? (dataDoLink && /^\d{4}-\d{2}-\d{2}$/.test(dataDoLink) ? dataDoLink : hoje);

  const dia = useDiariosDoPortal(data);
  const filhos = dia.data?.filhos ?? [];
  const idDoFilho =
    filhoEscolhido !== null && filhos.some((f) => f.studentId === filhoEscolhido)
      ? filhoEscolhido
      : (filhos.find((f) => f.studentId === alunoDoLink)?.studentId ?? filhos[0]?.studentId ?? null);
  const filho = filhos.find((f) => f.studentId === idDoFilho) ?? null;
  const diario = filho?.diario ?? null;

  const de = somarDias(hoje, -(DIAS_NA_FAIXA - 1));
  const faixa = useDiasDoDiario(idDoFilho, de, hoje);
  const comDiario = new Map((faixa.data?.dias ?? []).map((d) => [d.data, d]));

  // Abrir o diário publicado o marca como lido. Uma vez por diário nesta tela (a leitura é idempotente no servidor).
  const marcar = useMarcarComoLido();
  const jaMarcados = useRef(new Set<string>());
  const { mutate: marcarComoLido } = marcar;
  useEffect(() => {
    if (!diario || diario.lido || jaMarcados.current.has(diario.id)) return;
    jaMarcados.current.add(diario.id);
    marcarComoLido(diario.id);
  }, [diario, marcarComoLido]);

  const dias = Array.from({ length: DIAS_NA_FAIXA }, (_, i) => somarDias(hoje, -i));
  // Um link para um dia fora da faixa (aviso antigo) ainda aparece na faixa, no começo.
  const diasDaFaixa = dias.includes(data) ? dias : [data, ...dias];

  return (
    <>
      <div>
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Diário</h1>
        <p className="text-sm text-muted-foreground">{capitalizar(diaComSemana(data))}</p>
      </div>

      {filhos.length > 1 && (
        <div role="group" aria-label="Escolher o filho" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {filhos.map((f) => (
            <button
              key={f.studentId}
              type="button"
              aria-pressed={f.studentId === idDoFilho}
              onClick={() => setFilhoEscolhido(f.studentId)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                f.studentId === idDoFilho ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground"
              )}
            >
              {f.nome.split(" ")[0]}
              {f.diario && !f.diario.lido && (
                <span className="size-2 rounded-full bg-action" aria-hidden>
                  <span className="sr-only">novo</span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {idDoFilho !== null && (
        <ol aria-label="Dias" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {diasDaFaixa.map((d) => {
            const info = comDiario.get(d);
            const ativo = d === data;
            return (
              <li key={d} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={ativo}
                  aria-label={`${capitalizar(diaComSemana(d))}${info ? (info.lido ? ", com diário" : ", diário novo") : ", sem diário"}`}
                  onClick={() => setDataEscolhida(d)}
                  className={cn(
                    "relative flex min-h-14 w-12 flex-col items-center justify-center rounded-xl border text-center transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                    !ativo && !info && "text-muted-foreground"
                  )}
                >
                  <span className="text-[10.5px] font-medium tracking-wide uppercase">{d === hoje ? "hoje" : diaDaSemanaCurto(d)}</span>
                  <span className="font-heading text-[16px] leading-none font-semibold tabular-nums">{d.slice(8)}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute bottom-1 size-1.5 rounded-full",
                      info ? (info.lido ? (ativo ? "bg-primary-foreground" : "bg-success-soft-foreground") : "bg-action") : "bg-transparent"
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {dia.isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      )}

      {dia.isError && <ErroDoPortal texto="Não foi possível carregar o diário." onTentar={() => dia.refetch()} />}

      {dia.data && filhos.length === 0 && (
        <VazioDoPortal
          icone={<NotebookPen />}
          titulo="Nenhum aluno vinculado a você"
          texto="Fale com a escola para ligar o cadastro dos seus filhos ao seu acesso."
        />
      )}

      {filho && !diario && (
        <VazioDoPortal
          icone={<NotebookPen />}
          titulo={`Sem diário de ${filho.nome.split(" ")[0]} neste dia`}
          texto="Quando a escola publicar o dia, a alimentação, o sono e as fotos aparecem aqui."
        />
      )}

      {filho && diario && (
        <section aria-label={`Diário de ${filho.nome.split(" ")[0]}`} className="flex flex-col gap-2.5">
          <h2 className="font-heading text-[16px] font-semibold tracking-[-.02em]">
            {filho.nome.split(" ")[0]}
            {filho.turma && <span className="font-medium text-muted-foreground"> · {filho.turma}</span>}
          </h2>
          <CartaoDoDiario diario={diario} />
        </section>
      )}
    </>
  );
}
