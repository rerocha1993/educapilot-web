"use client";

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { EyeOff, Save, Send, Trash2, Undo2, X } from "lucide-react";
import { toast } from "sonner";

import { AvatarDoAluno, diaEMesCurto, EtiquetaDoDiario } from "@/components/relacionamento/diario/comum";
import {
  EditorDeAlimentacao,
  EditorDeHigiene,
  EditorDeHumor,
  EditorDeReposicao,
  EditorDeSaude,
  EditorDeSono,
} from "@/components/relacionamento/diario/editores";
import { HistoricoDoAluno } from "@/components/relacionamento/diario/historico-do-aluno";
import { EnvioDeFotos } from "@/components/relacionamento/envio-de-fotos";
import { FotoAutenticada } from "@/components/relacionamento/foto-autenticada";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { baixarFotoDoDiario } from "@/lib/relacionamento/api";
import {
  BLOCOS_EDITAVEIS,
  blocosAlterados,
  itensValidos,
  paraEdicao,
  paraSalvar,
  type BlocoEditavel,
  type Edicao,
} from "@/lib/relacionamento/diario-edicao";
import { ICONE_DO_TIPO, ROTULO_DO_TIPO, type TipoDeRegistro } from "@/lib/relacionamento/diario-vocabulario";
import {
  MAXIMO_DE_FOTOS_DO_DIARIO,
  blocoLigado,
  useDespublicarDiario,
  useDiarioDoAluno,
  useEnviarFotosDoDiario,
  usePublicarDiario,
  useRemoverFotoDoDiario,
  useSalvarDiario,
  type DiarioDoAluno,
} from "@/lib/relacionamento/use-diario";
import { cn } from "@/lib/utils";

/**
 * O painel lateral do aluno: os blocos do dia para editar com um toque, as fotos, o recado e o
 * botão de publicar. Abre da direita no computador e ocupa a tela toda no celular. A aba
 * "Histórico" mostra os últimos 14 dias dele.
 *
 * Grava só os blocos que mudaram (e o recado, se mudou), então duas pessoas lançando blocos
 * diferentes do mesmo aluno não apagam o trabalho uma da outra.
 */
export function PainelDoAluno({
  aluno,
  data,
  onFechar,
}: {
  aluno: { studentId: number; nome: string } | null;
  data: string;
  onFechar: () => void;
}) {
  // O editor avisa aqui se há o que não foi salvo; fechar sem salvar pede confirmação.
  const sujoRef = useRef(false);
  function fechar() {
    if (sujoRef.current && !window.confirm("Há alterações deste diário que ainda não foram salvas. Fechar mesmo assim?")) return;
    sujoRef.current = false;
    onFechar();
  }

  return (
    <Dialog open={aluno !== null} onOpenChange={(aberto) => !aberto && fechar()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none p-0 data-open:zoom-in-100 data-open:slide-in-from-right-10 data-closed:zoom-out-100 data-closed:slide-out-to-right-10 sm:max-w-[540px] md:rounded-l-2xl"
      >
        {aluno && <ConteudoDoPainel key={`${aluno.studentId}:${data}`} aluno={aluno} data={data} onFechar={fechar} sujoRef={sujoRef} />}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoDoPainel({
  aluno,
  data,
  onFechar,
  sujoRef,
}: {
  aluno: { studentId: number; nome: string };
  data: string;
  onFechar: () => void;
  sujoRef: MutableRefObject<boolean>;
}) {
  const consulta = useDiarioDoAluno(aluno.studentId, data);
  const [aba, setAba] = useState<"dia" | "historico">("dia");
  const diario = consulta.data;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-col gap-3 border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <AvatarDoAluno nome={aluno.nome} className="size-11 text-sm" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[17px] leading-tight font-semibold break-words">{aluno.nome}</DialogTitle>
            <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <span className="tabular-nums">{diaEMesCurto(data)}</span>
              {diario?.turma && <span>{diario.turma}</span>}
              {diario && <EtiquetaDoDiario status={diario.status} atualizado={diario.atualizado} />}
              {diario?.status === "Publicado" && diario.lido && <span className="font-medium text-success-soft-foreground">visto pela família</span>}
            </DialogDescription>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar o painel do aluno" onClick={onFechar}>
            <X />
          </Button>
        </div>
        <Segmentado
          rotulo="Parte do diário"
          opcoes={[
            { id: "dia", rotulo: "Dia" },
            { id: "historico", rotulo: "Histórico" },
          ]}
          valor={aba}
          onChange={setAba}
          cheio
        />
      </header>

      {aba === "historico" && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <HistoricoDoAluno studentId={aluno.studentId} ate={data} />
        </div>
      )}

      {aba === "dia" && consulta.isLoading && (
        <div className="flex-1 space-y-3 px-4 py-3" aria-busy="true">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {aba === "dia" && consulta.isError && (
        <div className="flex-1 px-4 py-3">
          <ErroDeCarga texto="Não foi possível abrir o diário do aluno." onTentar={() => consulta.refetch()} />
        </div>
      )}

      {aba === "dia" && diario && <EditorDoDia diario={diario} data={data} onFechar={onFechar} sujoRef={sujoRef} />}
    </div>
  );
}

// ------------------------------------------------------------------ o dia

function Secao({
  tipo,
  titulo,
  extra,
  children,
}: {
  tipo?: TipoDeRegistro;
  titulo?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const Icone = tipo ? ICONE_DO_TIPO[tipo] : null;
  return (
    <section aria-label={titulo ?? (tipo ? ROTULO_DO_TIPO[tipo] : undefined)} className="rounded-xl border border-border bg-card p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
        {Icone && <Icone aria-hidden className="size-4 text-muted-foreground" />}
        {titulo ?? (tipo ? ROTULO_DO_TIPO[tipo] : "")}
        {extra && <span className="ml-auto font-normal">{extra}</span>}
      </h3>
      {children}
    </section>
  );
}

function EditorDoDia({
  diario,
  data,
  onFechar,
  sujoRef,
}: {
  diario: DiarioDoAluno;
  data: string;
  onFechar: () => void;
  sujoRef: MutableRefObject<boolean>;
}) {
  const studentId = diario.studentId;
  const [inicio] = useState(() => ({ edicao: paraEdicao(diario.registros), recado: diario.recadoGeral ?? "" }));
  const [base, setBase] = useState(inicio);
  const [edicao, setEdicao] = useState<Edicao>(inicio.edicao);
  const [recado, setRecado] = useState(inicio.recado);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoDespublicar, setConfirmandoDespublicar] = useState(false);

  const salvarDiario = useSalvarDiario();
  const publicar = usePublicarDiario();
  const despublicar = useDespublicarDiario();
  const removerFoto = useRemoverFotoDoDiario();
  const enviarFotos = useEnviarFotosDoDiario(studentId, data);

  const ligados = BLOCOS_EDITAVEIS.filter((b) => blocoLigado(diario.blocos, b));
  const alterados = blocosAlterados(base.edicao, edicao, ligados);
  const recadoMudou = recado !== base.recado;
  const sujo = alterados.length > 0 || recadoMudou;
  useEffect(() => {
    sujoRef.current = sujo;
  }, [sujo, sujoRef]);
  const publicado = diario.status === "Publicado";
  const ocupado = salvarDiario.isPending || publicar.isPending || despublicar.isPending;

  const temAlgo =
    ligados.some((b) => itensValidos(b, edicao[b]).length > 0) || recado.trim().length > 0 || diario.fotos.length > 0;

  const muda = (bloco: BlocoEditavel) => (itens: Edicao[BlocoEditavel]) => {
    setErro(null);
    setEdicao((atual) => ({ ...atual, [bloco]: itens }));
  };

  async function salvar(): Promise<boolean> {
    if (!sujo) return true;
    setErro(null);
    try {
      const r = await salvarDiario.mutateAsync({
        studentId,
        data,
        dados: {
          recadoGeral: recadoMudou ? recado : undefined,
          blocos: alterados.map((b) => ({ tipo: b, registros: itensValidos(b, edicao[b]).map(paraSalvar) })),
        },
      });
      const nova = { edicao: paraEdicao(r.registros), recado: r.recadoGeral ?? "" };
      setBase(nova);
      setEdicao(nova.edicao);
      setRecado(nova.recado);
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar o diário.");
      return false;
    }
  }

  async function aoSalvar() {
    if (await salvar()) toast.success(publicado ? "Alterações salvas. A família vê como atualizado." : "Rascunho salvo.");
  }

  async function aoPublicar() {
    if (!(await salvar())) return;
    try {
      await publicar.mutateAsync({ studentId, data });
      toast.success("Diário publicado para a família.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível publicar o diário.");
    }
  }

  async function aoDespublicar() {
    try {
      await despublicar.mutateAsync({ studentId, data });
      setConfirmandoDespublicar(false);
      toast.success("Diário tirado das famílias. Ele volta a ser rascunho.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível despublicar o diário.");
    }
  }

  const fotosRestantes = Math.max(0, MAXIMO_DE_FOTOS_DO_DIARIO - diario.fotos.length);
  const autorizado = diario.autorizaUsoDeImagem === true;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {erro && (
          <p role="alert" className="rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
            {erro}
          </p>
        )}

        {ligados.includes("Alimentacao") && (
          <Secao tipo="Alimentacao">
            <EditorDeAlimentacao itens={edicao.Alimentacao} onChange={muda("Alimentacao")} />
          </Secao>
        )}
        {ligados.includes("Sono") && (
          <Secao tipo="Sono">
            <EditorDeSono itens={edicao.Sono} onChange={muda("Sono")} />
          </Secao>
        )}
        {ligados.includes("Higiene") && (
          <Secao tipo="Higiene">
            <EditorDeHigiene itens={edicao.Higiene} onChange={muda("Higiene")} fralda={diario.blocos.fralda} />
          </Secao>
        )}
        {ligados.includes("Humor") && (
          <Secao tipo="Humor">
            <EditorDeHumor itens={edicao.Humor} onChange={muda("Humor")} />
          </Secao>
        )}
        {ligados.includes("Saude") && (
          <Secao tipo="Saude">
            <EditorDeSaude itens={edicao.Saude} onChange={muda("Saude")} />
          </Secao>
        )}
        {ligados.includes("Reposicao") && (
          <Secao tipo="Reposicao" titulo="Precisa repor">
            <EditorDeReposicao itens={edicao.Reposicao} onChange={muda("Reposicao")} />
          </Secao>
        )}

        {diario.blocos.fotos && (
          <Secao
            titulo="Fotos"
            extra={
              <span className="text-xs text-muted-foreground tabular-nums">
                {diario.fotos.length} de {MAXIMO_DE_FOTOS_DO_DIARIO}
              </span>
            }
          >
            {diario.fotos.length > 0 && (
              <ul className="mb-3 grid grid-cols-3 gap-1.5">
                {diario.fotos.map((f, i) => (
                  <li key={f.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    <FotoAutenticada
                      baixar={baixarFotoDoDiario}
                      fotoId={f.id}
                      variante="thumb"
                      rotulo={`Foto ${i + 1} do diário`}
                      className="size-full"
                    />
                    <button
                      type="button"
                      aria-label={`Remover a foto ${i + 1}`}
                      disabled={removerFoto.isPending}
                      onClick={() =>
                        removerFoto.mutate(f.id, {
                          onSuccess: () => toast.success("Foto removida."),
                          onError: (e) => setErro(e instanceof Error ? e.message : "Não foi possível remover a foto."),
                        })
                      }
                      className="absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-black/60 text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {autorizado ? (
              <EnvioDeFotos
                limiteDoLote={MAXIMO_DE_FOTOS_DO_DIARIO}
                restante={fotosRestantes}
                semLegenda
                enviarLote={async (arquivos) => {
                  await enviarFotos(arquivos);
                  return { legendasNaoGravadas: 0 };
                }}
              />
            ) : (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-[13px] text-warning-soft-foreground"
              >
                <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  {diario.autorizaUsoDeImagem === false
                    ? "A família não autorizou o uso de imagem deste aluno."
                    : "A família ainda não informou se autoriza o uso de imagem deste aluno."}{" "}
                  Não dá para anexar fotos ao diário dele. A situação se altera no cadastro do aluno.
                </span>
              </p>
            )}
          </Secao>
        )}

        <Secao titulo="Recado para a família">
          <Textarea
            value={recado}
            maxLength={2000}
            rows={3}
            aria-label="Recado para a família"
            placeholder="Algo que a família precisa saber do dia."
            onChange={(e) => {
              setErro(null);
              setRecado(e.target.value);
            }}
          />
        </Secao>
      </div>

      <footer className="flex flex-col gap-2 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {confirmandoDespublicar ? (
          <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirmar despublicar">
            <p className="mr-auto text-sm">Tirar este diário das famílias?</p>
            <Button type="button" variant="outline" disabled={ocupado} onClick={() => setConfirmandoDespublicar(false)}>
              Manter publicado
            </Button>
            <Button type="button" variant="destructive" disabled={ocupado} onClick={() => void aoDespublicar()}>
              <Undo2 /> Despublicar
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {sujo
                ? "Há alterações ainda não salvas."
                : publicado
                  ? "Publicado. Editar marca o diário como atualizado para a família, sem novo aviso."
                  : "Só a equipe vê o rascunho. A família recebe um aviso na primeira publicação."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={ocupado || !sujo} onClick={() => void aoSalvar()} className="min-h-11 md:min-h-8">
                <Save /> {publicado ? "Salvar alterações" : "Salvar rascunho"}
              </Button>
              {!publicado && (
                <Button type="button" variant="action" disabled={ocupado || !temAlgo} onClick={() => void aoPublicar()} className="min-h-11 md:min-h-8">
                  <Send /> Publicar
                </Button>
              )}
              {publicado && (
                <Button type="button" variant="ghost" disabled={ocupado} onClick={() => setConfirmandoDespublicar(true)} className="min-h-11 md:min-h-8">
                  <Undo2 /> Despublicar
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onFechar} className={cn("ml-auto min-h-11 md:min-h-8")}>
                Fechar
              </Button>
            </div>
          </>
        )}
      </footer>
    </>
  );
}
