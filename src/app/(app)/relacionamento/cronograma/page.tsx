"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { DialogItemDoCronograma } from "@/components/relacionamento/dialog-item-do-cronograma";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useCopiarCronograma,
  useCronograma,
  useExcluirItemDoCronograma,
  useSalvarItemDoCronograma,
  type ItemDoCronograma,
} from "@/lib/relacionamento/use-relacionamento";
import { capitalizar, DIAS_DA_SEMANA_LONGOS, faixaDeHorario } from "@/lib/tasks/calendario-datas";
import { cn } from "@/lib/utils";

const ESCOLA_TODA = "escola";

/** Segunda a sexta; sábado e domingo ficam recolhidos até alguém precisar deles. */
const DIAS_UTEIS = [1, 2, 3, 4, 5] as const;
const FIM_DE_SEMANA = [6, 0] as const;

type Dialogo =
  | { tipo: "item"; item: ItemDoCronograma | null; dia: number }
  | { tipo: "excluir"; item: ItemDoCronograma }
  | { tipo: "copiar" };

export default function CronogramaPage() {
  const sessao = useSessaoLocal();
  const ehProfessor = sessao?.role === "Teacher";

  const { data: classes, isLoading: carregandoTurmas } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );

  const [escolha, setEscolha] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [fimDeSemanaAberto, setFimDeSemanaAberto] = useState(false);

  // Professor não tem "Escola toda": abre na primeira turma dele. Os demais abrem na escola toda.
  const selecionada = escolha ?? (ehProfessor ? (turmas[0] ? String(turmas[0].id) : null) : ESCOLA_TODA);
  const classId = selecionada === null || selecionada === ESCOLA_TODA ? null : Number(selecionada);
  const nomeDaSelecao =
    selecionada === ESCOLA_TODA ? "Escola toda" : (turmas.find((t) => String(t.id) === selecionada)?.nome ?? "");

  const pronto = selecionada !== null;
  const { data, isLoading, isError, refetch } = useCronograma(classId, pronto);

  const salvar = useSalvarItemDoCronograma();
  const excluir = useExcluirItemDoCronograma();

  const itensPorDia = useMemo(() => {
    const mapa = new Map<number, ItemDoCronograma[]>();
    for (const item of data ?? []) mapa.set(item.diaDaSemana, [...(mapa.get(item.diaDaSemana) ?? []), item]);
    return mapa;
  }, [data]);

  const temFimDeSemana = FIM_DE_SEMANA.some((d) => (itensPorDia.get(d)?.length ?? 0) > 0);
  const mostrarFimDeSemana = fimDeSemanaAberto || temFimDeSemana;
  const dias = mostrarFimDeSemana ? [...DIAS_UTEIS, ...FIM_DE_SEMANA] : [...DIAS_UTEIS];
  const vazio = (data?.length ?? 0) === 0;

  /** Troca o olho de "visível para famílias" e salva na hora. */
  async function alternarVisibilidade(item: ItemDoCronograma) {
    try {
      await salvar.mutateAsync({
        id: item.id,
        dados: {
          classId: item.classId,
          diaDaSemana: item.diaDaSemana,
          horaInicio: item.horaInicio,
          horaFim: item.horaFim,
          atividade: item.atividade,
          descricao: item.descricao,
          visivelParaFamilias: !item.visivelParaFamilias,
        },
      });
      toast.success(item.visivelParaFamilias ? "Item escondido das famílias." : "Item visível para as famílias.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar o item.");
    }
  }

  async function confirmarExclusao(item: ItemDoCronograma) {
    try {
      await excluir.mutateAsync(item.id);
      toast.success("Item removido.");
      setDialogo(null);
    } catch (err) {
      setDialogo(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível remover o item.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento"
        titulo="Cronograma"
        apoio="A rotina da semana de cada turma. Itens com o olho aberto aparecem para as famílias no portal."
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="cron-turma">Turma</Label>
          <Select value={selecionada ?? ""} onValueChange={(v) => v && setEscolha(v)} disabled={carregandoTurmas}>
            <SelectTrigger id="cron-turma" className="w-full md:w-64">
              <SelectValue>
                {() => nomeDaSelecao || (carregandoTurmas ? "Carregando..." : "Escolha a turma")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-72">
              {!ehProfessor && <SelectItem value={ESCOLA_TODA}>Escola toda</SelectItem>}
              {turmas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2 md:ml-auto">
          {classId !== null && (
            <Button variant="outline" onClick={() => setDialogo({ tipo: "copiar" })}>
              <Copy /> Copiar de outra turma
            </Button>
          )}
          <Button variant="action" disabled={!pronto} onClick={() => setDialogo({ tipo: "item", item: null, dia: 1 })}>
            <Plus /> Adicionar item
          </Button>
        </div>
      </div>

      {!carregandoTurmas && turmas.length === 0 && ehProfessor && (
        <EstadoVazio icone={<CalendarClock />} titulo="Nenhuma turma sua" texto="Peça à coordenação para ligar você a uma turma." />
      )}

      {isError && <ErroDeCarga texto="Não foi possível carregar o cronograma." onTentar={() => refetch()} />}
      {isLoading && <Skeleton className="h-72 w-full rounded-xl" />}

      {data && vazio && (
        <EstadoVazio
          icone={<CalendarClock />}
          titulo={`Sem rotina para ${nomeDaSelecao || "esta turma"}`}
          texto="Adicione os horários da semana ou copie de outra turma."
          acao={
            <Button variant="action" onClick={() => setDialogo({ tipo: "item", item: null, dia: 1 })}>
              <Plus /> Adicionar item
            </Button>
          }
        />
      )}

      {data && !vazio && (
        <>
          <div
            className={cn(
              "grid gap-3 md:grid-cols-2 xl:items-start",
              mostrarFimDeSemana ? "xl:grid-cols-7" : "xl:grid-cols-5"
            )}
          >
            {dias.map((dia) => (
              <ColunaDoDia
                key={dia}
                dia={dia}
                itens={itensPorDia.get(dia) ?? []}
                ocupado={salvar.isPending}
                onAdicionar={() => setDialogo({ tipo: "item", item: null, dia })}
                onEditar={(item) => setDialogo({ tipo: "item", item, dia })}
                onExcluir={(item) => setDialogo({ tipo: "excluir", item })}
                onVisibilidade={(item) => void alternarVisibilidade(item)}
              />
            ))}
          </div>

          {!temFimDeSemana && (
            <Button
              variant="ghost"
              className="self-start"
              aria-expanded={fimDeSemanaAberto}
              onClick={() => setFimDeSemanaAberto((a) => !a)}
            >
              <ChevronDown className={cn("transition-transform", fimDeSemanaAberto && "rotate-180")} />
              {fimDeSemanaAberto ? "Esconder sábado e domingo" : "Mostrar sábado e domingo"}
            </Button>
          )}
        </>
      )}

      {dialogo?.tipo === "item" && (
        <DialogItemDoCronograma
          item={dialogo.item}
          diaInicial={dialogo.dia}
          classId={classId}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "excluir" && (
        <Confirmacao
          titulo="Remover este item?"
          descricao={`“${dialogo.item.atividade}” sai do cronograma de ${nomeDaSelecao}. As famílias deixam de vê-lo.`}
          rotuloConfirmar="Remover"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={() => void confirmarExclusao(dialogo.item)}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "copiar" && classId !== null && (
        <DialogCopiar
          paraClassId={classId}
          paraNome={nomeDaSelecao}
          turmas={turmas.filter((t) => t.id !== classId)}
          onFechar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}

function ColunaDoDia({
  dia,
  itens,
  ocupado,
  onAdicionar,
  onEditar,
  onExcluir,
  onVisibilidade,
}: {
  dia: number;
  itens: ItemDoCronograma[];
  ocupado: boolean;
  onAdicionar: () => void;
  onEditar: (item: ItemDoCronograma) => void;
  onExcluir: (item: ItemDoCronograma) => void;
  onVisibilidade: (item: ItemDoCronograma) => void;
}) {
  const nome = capitalizar(DIAS_DA_SEMANA_LONGOS[dia].replace("-feira", ""));

  return (
    <section aria-label={nome} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-[15px] font-semibold">{nome}</h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Adicionar item na ${nome.toLowerCase()}`}
          title="Adicionar"
          className="max-md:size-11"
          onClick={onAdicionar}
        >
          <Plus />
        </Button>
      </div>

      {itens.length === 0 && <p className="py-2 text-[13px] text-muted-foreground">Nada marcado.</p>}

      <ul className="flex flex-col gap-2">
        {itens.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex flex-col gap-1 rounded-lg border border-border p-2.5",
              !item.visivelParaFamilias && "bg-muted/60"
            )}
          >
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              {faixaDeHorario(item.horaInicio, item.horaFim)}
            </p>
            <p className="text-sm font-medium break-words">{item.atividade}</p>
            {item.descricao && (
              <p className="text-[13px] leading-snug break-words whitespace-pre-line text-muted-foreground">
                {item.descricao}
              </p>
            )}

            <div className="-mb-1 flex justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="max-md:size-11"
                disabled={ocupado}
                aria-pressed={item.visivelParaFamilias}
                aria-label={
                  item.visivelParaFamilias
                    ? `${item.atividade}: visível para as famílias. Tocar para esconder`
                    : `${item.atividade}: escondido das famílias. Tocar para mostrar`
                }
                title={item.visivelParaFamilias ? "Visível para as famílias" : "Escondido das famílias"}
                onClick={() => onVisibilidade(item)}
              >
                {item.visivelParaFamilias ? <Eye /> : <EyeOff className="text-muted-foreground" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="max-md:size-11"
                aria-label={`Editar ${item.atividade}`}
                title="Editar"
                onClick={() => onEditar(item)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="max-md:size-11"
                aria-label={`Remover ${item.atividade}`}
                title="Remover"
                onClick={() => onExcluir(item)}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Copiar a semana de outra turma. Substitui o que a turma de destino já tem, e avisa antes. */
function DialogCopiar({
  paraClassId,
  paraNome,
  turmas,
  onFechar,
}: {
  paraClassId: number;
  paraNome: string;
  turmas: { id: number; nome: string }[];
  onFechar: () => void;
}) {
  const copiar = useCopiarCronograma();
  const [de, setDe] = useState<string | null>(null);
  const origem = turmas.find((t) => String(t.id) === de);

  async function confirmar() {
    if (!origem) return;
    try {
      await copiar.mutateAsync({ deClassId: origem.id, paraClassId });
      toast.success(`Cronograma de ${origem.nome} copiado para ${paraNome}.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível copiar o cronograma.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !copiar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copiar de outra turma</DialogTitle>
          <DialogDescription>
            A semana inteira de {paraNome} será substituída pela da turma escolhida. Isso não pode ser desfeito.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="cron-origem">Copiar de</Label>
          <Select value={de ?? ""} onValueChange={(v) => v && setDe(v)}>
            <SelectTrigger id="cron-origem" className="w-full">
              <SelectValue>{() => origem?.nome ?? "Escolha a turma de origem"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-64">
              {turmas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {turmas.length === 0 && <p className="text-xs text-muted-foreground">Não há outra turma para copiar.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={copiar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={!origem || copiar.isPending} onClick={() => void confirmar()}>
            {copiar.isPending ? "Copiando..." : "Substituir e copiar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
