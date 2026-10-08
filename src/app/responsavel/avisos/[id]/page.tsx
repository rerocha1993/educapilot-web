"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Check, ChevronLeft, FileText, MapPin, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { ErroDoPortal } from "@/components/relacionamento/portal/comum";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarData } from "@/lib/format/date";
import { abrirAnexoDaFamilia } from "@/lib/relacionamento/api";
import {
  useAvisoDoPortal,
  useConfirmarPresenca,
  useInicioDoPortal,
  useMarcarComoLido,
  type AvisoDetalhe,
  type Presenca,
} from "@/lib/relacionamento/use-portal-familia";
import { tamanhoLegivel } from "@/lib/relacionamento/use-relacionamento";
import { diaComSemana, capitalizar } from "@/lib/tasks/calendario-datas";
import { cn } from "@/lib/utils";

export default function AvisoDoResponsavelPage() {
  const { id } = useParams<{ id: string }>();
  const { data: aviso, isLoading, isError, refetch } = useAvisoDoPortal(id);
  const marcarComoLido = useMarcarComoLido();
  const jaMarcou = useRef<string | null>(null);

  // Abrir o aviso é lê-lo: marca uma vez por aviso, sem esperar o toque em nenhum botão.
  const { mutate: marcar } = marcarComoLido;
  const lida = aviso?.lida;
  useEffect(() => {
    if (lida === false && jaMarcou.current !== id) {
      jaMarcou.current = id;
      marcar(id);
    }
  }, [lida, id, marcar]);

  return (
    <>
      <Link
        href="/responsavel/avisos"
        className="-ml-2 inline-flex min-h-11 w-max items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronLeft aria-hidden className="size-4" /> Avisos
      </Link>

      {isLoading && (
        <>
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </>
      )}

      {isError && <ErroDoPortal texto="Não foi possível abrir este aviso." onTentar={() => refetch()} />}

      {aviso && <Conteudo aviso={aviso} />}
    </>
  );
}

function Conteudo({ aviso }: { aviso: AvisoDetalhe }) {
  const ehEvento = aviso.tipo === "Evento";
  const [baixando, setBaixando] = useState<string | null>(null);

  async function abrir(id: string, nome: string) {
    setBaixando(id);
    try {
      await abrirAnexoDaFamilia(id, nome);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o anexo.");
    } finally {
      setBaixando(null);
    }
  }

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold",
              ehEvento ? "bg-success-soft text-success-soft-foreground" : "bg-accent text-accent-foreground"
            )}
          >
            {aviso.tipo}
          </span>
          {aviso.publicadaEm && (
            <span className="text-xs text-muted-foreground tabular-nums">Publicado em {formatarData(aviso.publicadaEm)}</span>
          )}
        </div>
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] leading-[1.15] font-semibold tracking-[-.03em] break-words">
          {aviso.titulo}
        </h1>
        {aviso.turmas.length > 0 && <p className="text-[13px] text-muted-foreground">Para: {aviso.turmas.join(", ")}</p>}
      </header>

      {ehEvento && (aviso.dataDoEvento || aviso.local) && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-soft-foreground">
          {aviso.dataDoEvento && (
            <p className="flex items-start gap-2 font-semibold">
              <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                {capitalizar(diaComSemana(aviso.dataDoEvento))}
                {aviso.horaDoEvento && <span className="tabular-nums"> às {aviso.horaDoEvento}</span>}
              </span>
            </p>
          )}
          {aviso.local && (
            <p className="flex items-start gap-2">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span className="break-words">{aviso.local}</span>
            </p>
          )}
        </div>
      )}

      <p className="text-[15px] leading-[1.65] break-words whitespace-pre-line">{aviso.texto}</p>

      {aviso.anexos.length > 0 && (
        <section aria-label="Anexos" className="flex flex-col gap-2">
          <h2 className="font-heading text-[15px] font-semibold">Anexos</h2>
          <ul className="flex flex-col gap-2">
            {aviso.anexos.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={baixando === a.id}
                  onClick={() => void abrir(a.id, a.nome)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted disabled:opacity-60"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    {a.contentType.includes("pdf") ? <FileText aria-hidden className="size-[18px]" /> : <Paperclip aria-hidden className="size-[18px]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {baixando === a.id ? "Abrindo..." : `Toque para abrir · ${tamanhoLegivel(a.tamanho)}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {aviso.permiteConfirmarPresenca && <ConfirmarPresenca aviso={aviso} />}
    </article>
  );
}

/** "Vou" / "Não vou". Com mais de um filho na turma do evento, a família escolhe por qual responde. */
function ConfirmarPresenca({ aviso }: { aviso: AvisoDetalhe }) {
  const { data: inicio } = useInicioDoPortal();
  const confirmar = useConfirmarPresenca();
  const [escolhido, setEscolhido] = useState<number | null>(null);

  // Os filhos que o aviso atinge: os das turmas dele, ou todos quando é da escola toda.
  const todos = inicio?.alunos ?? [];
  const daTurma = todos.filter((a) => a.turma && aviso.turmas.includes(a.turma));
  const filhos = aviso.turmas.length === 0 || daTurma.length === 0 ? todos : daTurma;
  const filhoAtual = filhos.find((f) => f.studentId === escolhido) ?? filhos[0] ?? null;
  const variosFilhos = filhos.length > 1;

  async function responder(presenca: Presenca) {
    try {
      await confirmar.mutateAsync({
        id: aviso.id,
        presenca,
        studentId: variosFilhos ? (filhoAtual?.studentId ?? undefined) : undefined,
      });
      const quem = variosFilhos && filhoAtual ? ` para ${filhoAtual.nome.split(" ")[0]}` : "";
      toast.success(presenca === "Sim" ? `Presença confirmada${quem}.` : `Resposta registrada${quem}: não vai.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar sua resposta.");
    }
  }

  const resposta = aviso.confirmacaoDePresenca;

  return (
    <section aria-label="Confirmação de presença" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="font-heading text-[16px] font-semibold">Você vai?</h2>
        <p className="text-[13px] text-muted-foreground">A escola usa as respostas para se organizar.</p>
      </div>

      {variosFilhos && (
        <div role="group" aria-label="Responder por qual filho" className="flex flex-wrap gap-1.5">
          {filhos.map((f) => {
            const ativo = filhoAtual?.studentId === f.studentId;
            return (
              <button
                key={f.studentId}
                type="button"
                aria-pressed={ativo}
                onClick={() => setEscolhido(f.studentId)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-[13.5px] font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  ativo ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground"
                )}
              >
                {f.nome.split(" ")[0]}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={resposta === "Sim" ? "default" : "outline"}
          aria-pressed={resposta === "Sim"}
          disabled={confirmar.isPending}
          className="h-12 text-base"
          onClick={() => void responder("Sim")}
        >
          <Check aria-hidden /> Vou
        </Button>
        <Button
          type="button"
          variant={resposta === "Nao" ? "default" : "outline"}
          aria-pressed={resposta === "Nao"}
          disabled={confirmar.isPending}
          className="h-12 text-base"
          onClick={() => void responder("Nao")}
        >
          <X aria-hidden /> Não vou
        </Button>
      </div>

      {resposta && (
        <p role="status" className="text-sm font-medium text-success-soft-foreground">
          {resposta === "Sim" ? "Presença confirmada." : "Você avisou que não vai."} Toque de novo para mudar.
        </p>
      )}
    </section>
  );
}
