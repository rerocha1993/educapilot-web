"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { ErroDeCarga } from "@/components/rh/campo";
import { hrefDoCard, ReuniaoForm } from "@/components/tasks/reuniao-form";
import { ChipDeEnvolvido, ConfirmarFinalizacao, EscalasDeNota } from "@/components/tasks/reuniao-pecas";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { formatarData, formatarSoData } from "@/lib/format/date";
import {
  ehAdvertenciaVerbal,
  ROTULO_DE_QUEM_FAZ,
  ROTULO_DO_STATUS,
  VARIANTE_DO_STATUS,
  useCancelarReuniao,
  useFinalizarReuniao,
  useMarcarCombinado,
  useMarcarNaoCompareceu,
  useOpcoesDeReuniao,
  useReuniao,
  useSalvarNotas,
  type ReuniaoDetalhada,
} from "@/lib/tasks/use-reunioes-e-atendimentos";

const VOLTAR = "/reunioes-e-atendimentos";

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

/** Notas da gestão numa reunião já salva: botões 0 a 10 e um botão para gravar. */
function BlocoDeNotas({ reuniao }: { reuniao: ReuniaoDetalhada }) {
  const salvar = useSalvarNotas();
  const [a, setA] = useState<number | null>(reuniao.notaDoAssunto ?? null);
  const [d, setD] = useState<number | null>(reuniao.notaDoDesfecho ?? null);
  const mudou = a !== (reuniao.notaDoAssunto ?? null) || d !== (reuniao.notaDoDesfecho ?? null);

  return (
    <Bloco id="bloco-notas" titulo="Notas (só a gestão)">
      <p className="mb-3 text-[13px] text-muted-foreground">
        Opcional. Quem esteve na reunião não vê o que você escreve, mas a média das duas notas entra no Desempenho dos funcionários que participaram.
        {ehAdvertenciaVerbal(reuniao.assunto) && " Advertência verbal conta em Advertências, não nesta média."}
      </p>
      <EscalasDeNota notaDoAssunto={a} notaDoDesfecho={d} aoMudarAssunto={setA} aoMudarDesfecho={setD} desabilitada={salvar.isPending} />
      <div className="mt-3 flex justify-end">
        <Button
          variant="outline"
          disabled={!mudou || salvar.isPending}
          onClick={() =>
            salvar.mutate(
              { id: reuniao.id, notaDoAssunto: a, notaDoDesfecho: d },
              {
                onSuccess: () => toast.success("Notas salvas."),
                onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar as notas."),
              }
            )
          }
        >
          {salvar.isPending ? "Salvando…" : "Salvar notas"}
        </Button>
      </div>
    </Bloco>
  );
}

/**
 * Uma reunião ou atendimento: quem esteve, pauta, ata, encaminhamentos e, para a gestão, as notas. Os
 * encaminhamentos se marcam como cumpridos aqui; o resto se altera em "Editar". Agendada pode ser finalizada; a
 * que já aconteceu fica no histórico de cada pessoa.
 */
export default function ReuniaoPage() {
  const { id } = useParams<{ id: string }>();
  const sessao = useSessaoLocal();
  const { data, isLoading, isError, error, refetch } = useReuniao(id);
  const { data: opcoes } = useOpcoesDeReuniao();
  const marcar = useMarcarCombinado();
  const cancelar = useCancelarReuniao();
  const finalizar = useFinalizarReuniao();
  const naoCompareceu = useMarcarNaoCompareceu();

  const [editando, setEditando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const cancelada = data?.status === "Cancelada";
  const podeDarNota = opcoes?.podeDarNota === true;
  const funcionarios = data?.envolvidos.filter((e) => e.tipo === "Funcionario") ?? [];
  const aluno = data?.envolvidos.find((e) => e.tipo === "Aluno" && e.studentId != null);
  const temResponsavel = data?.envolvidos.some((e) => e.tipo === "Responsavel") ?? false;

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

  function executarFinalizacao() {
    if (!data) return;
    finalizar.mutate(data.id, {
      onSuccess: () => {
        toast.success("Reunião finalizada. Ela já está no histórico de quem participou.");
        setFinalizando(false);
      },
      onError: (e) => {
        setFinalizando(false);
        toast.error(e instanceof Error ? e.message : "Não foi possível finalizar a reunião.");
      },
    });
  }

  function pedirFinalizacao() {
    if (!data) return;
    if (ehAdvertenciaVerbal(data.assunto)) setFinalizando(true);
    else executarFinalizacao();
  }

  function marcarNaoCompareceu() {
    if (!data) return;
    naoCompareceu.mutate(data.id, {
      onSuccess: () => toast.success("Registrado que a família não compareceu."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível registrar."),
    });
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
          <Link href={VOLTAR} className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action hover:underline">
            ← Reuniões e atendimentos
          </Link>
          <ErroDeCarga texto={error instanceof Error ? error.message : "Não foi possível carregar a reunião."} onTentar={() => void refetch()} />
        </>
      )}

      {data && (
        <>
          <CabecalhoDaPagina
            eyebrow="← Reuniões e atendimentos"
            eyebrowHref={VOLTAR}
            titulo={data.assunto}
            tags={<Badge variant={VARIANTE_DO_STATUS[data.status]}>{ROTULO_DO_STATUS[data.status]}</Badge>}
            apoio={
              <>
                <span className="font-numeric">
                  {formatarSoData(data.data)}
                  {data.hora ? ` · ${data.hora}` : ""}
                </span>
                {data.condutores.length > 0 && <> · conduzida por {data.condutores.map((c) => c.nome).join(", ")}</>}
              </>
            }
            acoesClassName="w-full md:w-auto"
            acoes={
              !editando && (
                <>
                  {aluno?.studentId != null && (
                    <Link href={`/ocorrencias/aluno/${aluno.studentId}`} className={buttonVariants({ variant: "outline", className: "w-full md:w-auto" })}>
                      Dossiê do aluno
                    </Link>
                  )}
                  {!cancelada && (
                    <Button variant="outline" className="w-full md:w-auto" onClick={() => setEditando(true)}>
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                  )}
                  {data.status === "Agendada" && temResponsavel && (
                    <Button variant="outline" className="w-full md:w-auto" disabled={naoCompareceu.isPending} onClick={marcarNaoCompareceu}>
                      Não compareceu
                    </Button>
                  )}
                  {(data.status === "Agendada" || data.status === "Realizada") && (
                    <Button variant="destructive" className="w-full md:w-auto" onClick={() => setCancelando(true)}>
                      Cancelar reunião
                    </Button>
                  )}
                  {data.status === "Agendada" && (
                    <Button variant="action" className="w-full md:w-auto" disabled={finalizar.isPending} onClick={pedirFinalizacao}>
                      Finalizar
                    </Button>
                  )}
                </>
              )
            }
          />

          <p className="-mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Lock aria-hidden className="size-3.5 shrink-0" />
            Registro interno da escola. A família não vê
            {funcionarios.length > 0 ? ", e a pessoa da equipe vê só a data, o assunto, quem conduziu e as notas" : ""}.
          </p>

          {data.atrasada === true && data.status === "Agendada" && !editando && (
            <div role="note" className="rounded-xl border border-border bg-action-soft px-4 py-3 text-sm text-action-soft-foreground">
              Esta reunião estava agendada para um dia que já passou. Use <strong>Editar</strong> para registrar o que aconteceu e <strong>Finalizar</strong>, ou cancele.
            </div>
          )}

          {data.advertenciaRegistrada === true && (
            <div role="note" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm">
              A advertência verbal desta reunião está registrada no Desempenho de {funcionarios.map((f) => f.nome).join(", ") || "quem participou"}.
            </div>
          )}

          {cancelada && (
            <div role="note" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm">
              <strong>Reunião cancelada.</strong>
              {data.motivoDoCancelamento ? ` Motivo: ${data.motivoDoCancelamento}` : " Nenhum motivo foi informado."}
            </div>
          )}

          {editando ? (
            <ReuniaoForm reuniao={data} hrefDeVolta={VOLTAR} aoCancelar={() => setEditando(false)} aoSalvar={() => setEditando(false)} />
          ) : (
            <>
              <Bloco id="bloco-participantes" titulo="Quem participou">
                {data.envolvidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ninguém informado.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {data.envolvidos.map((e, i) => (
                      <li key={e.id ?? `${e.tipo}-${e.nome}-${i}`} className="max-w-full">
                        <ChipDeEnvolvido tipo={e.tipo} nome={e.nome} detalhe={e.detalhe} />
                      </li>
                    ))}
                  </ul>
                )}
                {data.condutores.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Conduzida por <span className="font-medium text-foreground">{data.condutores.map((c) => c.nome).join(", ")}</span>.
                  </p>
                )}
                {data.ocorrencia && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Motivada pela ocorrência de <span className="font-numeric">{formatarSoData(data.ocorrencia.data)}</span>:{" "}
                    <span className="font-medium text-foreground">{data.ocorrencia.categoria}</span>.
                  </p>
                )}
              </Bloco>

              <Bloco id="bloco-pauta" titulo="Pauta">
                {data.pauta ? <p className="whitespace-pre-line break-words text-sm">{data.pauta}</p> : <p className="text-sm text-muted-foreground">Sem pauta registrada.</p>}
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

              <Bloco id="bloco-combinados" titulo="Encaminhamentos">
                {data.encaminhamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum encaminhamento registrado.</p>
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
                              { onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o encaminhamento.") }
                            )
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className={e.cumprido ? "break-words text-sm text-muted-foreground line-through" : "break-words text-sm"}>{e.descricao}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                            <Badge variant="outline">
                              {ROTULO_DE_QUEM_FAZ[e.responsavel]}
                              {e.responsavel === "Funcionario" && e.funcionarioNome ? `: ${e.funcionarioNome}` : ""}
                            </Badge>
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
                            {e.vencido === true && !e.cumprido && <Badge variant="overdue">Vencido</Badge>}
                            {e.cartaoId && (
                              <>
                                <Badge variant={e.cartaoConcluido === true ? "success" : "pending"}>
                                  {e.cartaoConcluido === true ? "Card concluído" : "Card no quadro"}
                                </Badge>
                                <Link
                                  href={hrefDoCard(e.responsavelUserId, sessao?.userId)}
                                  className="inline-flex min-h-10 items-center gap-1 font-medium text-action hover:underline md:min-h-0"
                                >
                                  Ver card <ExternalLink className="size-3.5" aria-hidden />
                                </Link>
                              </>
                            )}
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

              {podeDarNota && !cancelada && (
                <BlocoDeNotas key={`${data.id}-${data.notaDoAssunto ?? "x"}-${data.notaDoDesfecho ?? "x"}`} reuniao={data} />
              )}

              {data.criadoEm && (
                <p className="text-[12px] text-muted-foreground">
                  Registrada em <span className="font-numeric">{formatarData(data.criadoEm)}</span>
                  {data.atualizadoEm && (
                    <>
                      {" "}· atualizada em <span className="font-numeric">{formatarData(data.atualizadoEm)}</span>
                    </>
                  )}
                  .
                </p>
              )}
            </>
          )}

          <ConfirmarFinalizacao
            aberto={finalizando}
            ehAdvertencia={ehAdvertenciaVerbal(data.assunto)}
            funcionarios={funcionarios.map((f) => f.nome)}
            pendente={finalizar.isPending}
            aoConfirmar={executarFinalizacao}
            aoFechar={() => setFinalizando(false)}
          />

          <Dialog open={cancelando} onOpenChange={(aberto) => !aberto && setCancelando(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancelar esta reunião?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Ela continua no histórico como cancelada, e os encaminhamentos dela deixam de contar.
                {data.advertenciaRegistrada === true && " A advertência verbal registrada no Desempenho é retirada."} Não dá para desfazer.
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
