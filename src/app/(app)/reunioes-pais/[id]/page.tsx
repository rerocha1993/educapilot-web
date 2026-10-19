"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock, Pencil } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { ErroDeCarga } from "@/components/rh/campo";
import { ReuniaoComPaisForm } from "@/components/tasks/reuniao-com-pais-form";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatarData, formatarSoData } from "@/lib/format/date";
import {
  ROTULO_DE_QUEM_FAZ,
  ROTULO_DO_STATUS,
  VARIANTE_DO_STATUS,
  useCancelarReuniaoComPais,
  useMarcarCombinado,
  useReuniaoComPais,
} from "@/lib/tasks/use-reunioes-com-pais";

function Bloco({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-card p-4 md:p-5">
      <h2 id={id} className="mb-2 font-heading text-[15.5px] font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/**
 * Uma reunião com os pais: dados, pauta, ata e combinados. Os combinados se marcam como cumpridos direto
 * aqui; o resto se altera em "Editar". Reunião agendada pode ser cancelada; a que já aconteceu fica no
 * histórico do aluno.
 */
export default function ReuniaoComPaisPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useReuniaoComPais(id);
  const marcar = useMarcarCombinado();
  const cancelar = useCancelarReuniaoComPais();

  const [editando, setEditando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const cancelada = data?.status === "Cancelada";

  function confirmarCancelamento() {
    if (!data) return;
    cancelar.mutate(
      { id: data.id, motivo },
      {
        onSuccess: () => {
          toast.success("Reunião cancelada.");
          setCancelando(false);
          setMotivo("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível cancelar a reunião."),
      }
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <div className="md:hidden">
        <RotinaNav />
      </div>

      {isLoading && (
        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <span className="sr-only">Carregando a reunião…</span>
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <>
          <Link href="/reunioes-pais" className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action hover:underline">
            ← Reunião com os pais
          </Link>
          <ErroDeCarga texto={error instanceof Error ? error.message : "Não foi possível carregar a reunião."} onTentar={() => void refetch()} />
        </>
      )}

      {data && (
        <>
          <CabecalhoDaPagina
            eyebrow="← Reunião com os pais"
            eyebrowHref="/reunioes-pais"
            titulo={data.aluno}
            tags={<Badge variant={VARIANTE_DO_STATUS[data.status]}>{ROTULO_DO_STATUS[data.status]}</Badge>}
            apoio={
              <>
                <span className="font-numeric">
                  {formatarSoData(data.data)}
                  {data.hora ? ` · ${data.hora}` : ""}
                </span>{" "}
                · {data.tipo}
                {data.turma ? ` · ${data.turma}` : ""} · conduzida por {data.conduzidaPor}
              </>
            }
            acoesClassName="w-full md:w-auto"
            acoes={
              !editando && (
                <>
                  <Link
                    href={`/ocorrencias/aluno/${data.studentId}`}
                    className={buttonVariants({ variant: "outline", className: "w-full md:w-auto" })}
                  >
                    Dossiê do aluno
                  </Link>
                  {!cancelada && (
                    <Button variant="outline" className="w-full md:w-auto" onClick={() => setEditando(true)}>
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                  )}
                  {data.status === "Agendada" && (
                    <Button variant="destructive" className="w-full md:w-auto" onClick={() => setCancelando(true)}>
                      Cancelar reunião
                    </Button>
                  )}
                </>
              )
            }
          />

          <p className="-mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Lock aria-hidden className="size-3.5 shrink-0" />
            Registro interno da escola, com dados de criança. A família não vê.
          </p>

          {data.atrasada && !editando && (
            <div role="note" className="rounded-xl border border-border bg-action-soft px-4 py-3 text-sm text-action-soft-foreground">
              Esta reunião estava agendada para um dia que já passou. Use <strong>Editar</strong> para registrar o que aconteceu, ou cancele.
            </div>
          )}

          {cancelada && (
            <div role="note" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm">
              <strong>Reunião cancelada.</strong>
              {data.motivoDoCancelamento ? ` Motivo: ${data.motivoDoCancelamento}` : " Nenhum motivo foi informado."}
            </div>
          )}

          {editando ? (
            <ReuniaoComPaisForm
              reuniao={data}
              hrefDeVolta="/reunioes-pais"
              aoCancelar={() => setEditando(false)}
              aoSalvar={() => setEditando(false)}
            />
          ) : (
            <>
              <Bloco id="bloco-participantes" titulo="Quem da família">
                {data.responsaveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum responsável informado.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {data.responsaveis.map((r) => (
                      <li key={r.id} className="break-words">
                        <span className="font-medium">{r.nome}</span>
                        {r.parentesco && <span className="text-muted-foreground"> ({r.parentesco})</span>}
                        {!r.guardianId && <span className="text-muted-foreground"> · fora do cadastro</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {data.ocorrencia && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Motivada pela ocorrência de <span className="font-numeric">{formatarSoData(data.ocorrencia.data)}</span>:{" "}
                    <span className="font-medium text-foreground">{data.ocorrencia.categoria}</span>.
                  </p>
                )}
              </Bloco>

              <Bloco id="bloco-pauta" titulo="Pauta">
                {data.pauta ? (
                  <p className="whitespace-pre-line break-words text-sm">{data.pauta}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem pauta registrada.</p>
                )}
              </Bloco>

              <Bloco id="bloco-ata" titulo="O que foi conversado">
                {data.conversado ? (
                  <p className="whitespace-pre-line break-words text-sm">{data.conversado}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {data.status === "Agendada" ? "Ainda não aconteceu. Edite depois da reunião para registrar a conversa." : "Nada registrado."}
                  </p>
                )}
              </Bloco>

              <Bloco id="bloco-combinados" titulo="Combinados">
                {data.encaminhamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum combinado registrado.</p>
                ) : (
                  <ul className="flex flex-col">
                    {data.encaminhamentos.map((e) => (
                      <li key={e.id} className="flex items-start gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0">
                        <Checkbox
                          className="mt-0.5"
                          checked={e.cumprido}
                          disabled={cancelada || marcar.isPending}
                          aria-label={`${e.cumprido ? "Desmarcar" : "Marcar como cumprido"}: ${e.descricao}`}
                          onCheckedChange={(v) =>
                            marcar.mutate(
                              { id: data.id, encaminhamentoId: e.id, cumprido: v === true },
                              { onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o combinado.") }
                            )
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className={e.cumprido ? "break-words text-sm text-muted-foreground line-through" : "break-words text-sm"}>{e.descricao}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                            <Badge variant="outline">{ROTULO_DE_QUEM_FAZ[e.responsavel]}</Badge>
                            {e.prazo && (
                              <span>
                                Prazo <span className="font-numeric">{formatarSoData(e.prazo)}</span>
                              </span>
                            )}
                            {e.cumprido && e.cumpridoEm && (
                              <span>
                                Cumprido em <span className="font-numeric">{formatarData(e.cumpridoEm)}</span>
                              </span>
                            )}
                            {e.vencido && <Badge variant="overdue">Vencido</Badge>}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {data.proximaReuniaoEm && (
                  <p className="mt-3 border-t border-border pt-3 text-sm">
                    Próxima reunião prevista para <span className="font-numeric font-medium">{formatarSoData(data.proximaReuniaoEm)}</span>.
                  </p>
                )}
              </Bloco>

              <p className="text-[12px] text-muted-foreground">
                Registrada em <span className="font-numeric">{formatarData(data.criadoEm)}</span>
                {data.atualizadoEm && (
                  <>
                    {" "}· atualizada em <span className="font-numeric">{formatarData(data.atualizadoEm)}</span>
                  </>
                )}
                .
              </p>
            </>
          )}

          <Dialog open={cancelando} onOpenChange={(aberto) => !aberto && setCancelando(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancelar esta reunião?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Ela continua no histórico do aluno como cancelada, e os combinados dela deixam de contar. Não dá para desfazer.
              </p>
              <div className="grid gap-1.5">
                <label htmlFor="motivo-cancelamento" className="text-sm font-medium">
                  Motivo (opcional)
                </label>
                <Textarea id="motivo-cancelamento" value={motivo} maxLength={500} rows={3} onChange={(e) => setMotivo(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelando(false)}>
                  Voltar
                </Button>
                <Button variant="destructive" disabled={cancelar.isPending} onClick={confirmarCancelamento}>
                  {cancelar.isPending ? "Cancelando…" : "Cancelar reunião"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
