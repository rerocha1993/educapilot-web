"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useEtiquetas,
  usePessoasDaEquipe,
  useSalvarRecorrencia,
  type Frequencia,
  type Recorrencia,
} from "@/lib/flow/use-tarefas";

/** Rótulos do enum de frequência do backend (0 = dias úteis, 1 = todo dia, 2 = semanal, 3 = mensal). */
export const FREQUENCIAS: { valor: Frequencia; rotulo: string }[] = [
  { valor: 0, rotulo: "Todo dia útil (segunda a sexta)" },
  { valor: 1, rotulo: "Todo dia, inclusive fim de semana" },
  { valor: 2, rotulo: "Uma vez por semana" },
  { valor: 3, rotulo: "Uma vez por mês" },
];

/** Índice = valor do dia da semana no backend (0 = domingo). */
export const DIAS_DA_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Frequência em uma frase, do jeito que a secretaria falaria. */
export function rotuloDaFrequencia(r: Pick<Recorrencia, "frequencia" | "diaDaSemana" | "diaDoMes">) {
  if (r.frequencia === 0) return "Todo dia útil";
  if (r.frequencia === 1) return "Todo dia";
  if (r.frequencia === 2)
    return r.diaDaSemana == null
      ? "Toda semana"
      : `Toda semana, ${DIAS_DA_SEMANA[r.diaDaSemana] ?? ""}`.trim();
  return r.diaDoMes == null ? "Todo mês" : `Todo mês, dia ${r.diaDoMes}`;
}

/** O Select do base-ui trabalha com texto; "sem" é o valor para "nenhuma etiqueta". */
const SEM_ETIQUETA = "sem";

/**
 * Criação e edição de uma tarefa que se repete. Conteúdo de um Dialog, montado só enquanto aberto:
 * o estado começa sempre da recorrência atual, como no editor de relatório.
 *
 * Dia da semana e dia do mês só aparecem na frequência que os usa — perguntar "que dia do mês?"
 * para uma tarefa diária é convite a preencher errado.
 */
export function EditorDeRecorrencia({
  recorrencia,
  onFechar,
}: {
  recorrencia?: Recorrencia;
  onFechar: () => void;
}) {
  const { data: pessoas } = usePessoasDaEquipe();
  const { data: etiquetas } = useEtiquetas();
  const salvar = useSalvarRecorrencia();

  const [titulo, setTitulo] = useState(recorrencia?.titulo ?? "");
  const [descricao, setDescricao] = useState(recorrencia?.descricao ?? "");
  const [userId, setUserId] = useState(recorrencia?.userId ?? "");
  const [frequencia, setFrequencia] = useState(String(recorrencia?.frequencia ?? 0));
  // Padrões que não travam quem só quer criar rápido: segunda-feira e dia 1º.
  const [diaDaSemana, setDiaDaSemana] = useState(String(recorrencia?.diaDaSemana ?? 1));
  const [diaDoMes, setDiaDoMes] = useState(String(recorrencia?.diaDoMes ?? 1));
  const [etiquetaId, setEtiquetaId] = useState(recorrencia?.etiquetaId ?? SEM_ETIQUETA);
  const [checklist, setChecklist] = useState<string[]>(recorrencia?.checklist ?? []);
  const [ativa, setAtiva] = useState(recorrencia?.ativa ?? true);

  const frequenciaNum = Number(frequencia) as Frequencia;
  const listaDePessoas = pessoas ?? [];
  const listaDeEtiquetas = etiquetas ?? [];

  const responsavel = listaDePessoas.find((p) => p.userId === userId);
  const etiqueta = listaDeEtiquetas.find((e) => e.id === etiquetaId);

  function mudarItem(indice: number, texto: string) {
    setChecklist((atuais) => atuais.map((item, i) => (i === indice ? texto : item)));
  }

  async function handleSalvar() {
    if (!titulo.trim() || !userId) return;

    const dia = Number(diaDoMes);
    if (frequenciaNum === 3 && (!Number.isInteger(dia) || dia < 1 || dia > 31)) {
      toast.error("O dia do mês precisa ser um número de 1 a 31.");
      return;
    }

    try {
      await salvar.mutateAsync({
        id: recorrencia?.id,
        userId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        frequencia: frequenciaNum,
        // Só manda o campo que a frequência escolhida usa: o outro fica nulo para o backend não
        // guardar um dia que a tela nem mostrou.
        diaDaSemana: frequenciaNum === 2 ? Number(diaDaSemana) : null,
        diaDoMes: frequenciaNum === 3 ? dia : null,
        etiquetaId: etiquetaId === SEM_ETIQUETA ? null : etiquetaId,
        // Linha em branco é rascunho de quem clicou em "adicionar" e desistiu — não vira item.
        checklist: checklist.map((item) => item.trim()).filter(Boolean),
        ativa,
      });
      toast.success(recorrencia ? "Tarefa recorrente atualizada." : "Tarefa recorrente criada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a tarefa recorrente.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{recorrencia ? "Editar tarefa recorrente" : "Nova tarefa recorrente"}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Título da tarefa</Label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Conferir a caixa de envios"
          />
        </div>

        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            placeholder="O que precisa ser feito, para quem pegar a tarefa não ter dúvida."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Quem faz</Label>
            <Select value={userId || undefined} onValueChange={(v) => v && setUserId(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => responsavel?.nome ?? "Escolha a pessoa"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {listaDePessoas.map((p) => (
                  <SelectItem key={p.userId} value={p.userId}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Com que frequência</Label>
            <Select value={frequencia} onValueChange={(v) => v && setFrequencia(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => FREQUENCIAS.find((f) => f.valor === frequenciaNum)?.rotulo}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIAS.map((f) => (
                  <SelectItem key={f.valor} value={String(f.valor)}>
                    {f.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frequenciaNum === 2 && (
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Em que dia da semana</Label>
              {/* Os nomes dos dias ficam em minúsculas na constante porque entram no meio da frase
                  ("Toda semana, segunda-feira"); aqui, sozinhos, sobem para maiúscula por CSS. */}
              <Select value={diaDaSemana} onValueChange={(v) => v && setDiaDaSemana(String(v))}>
                <SelectTrigger className="w-full capitalize">
                  <SelectValue>{() => DIAS_DA_SEMANA[Number(diaDaSemana)]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DIAS_DA_SEMANA.map((dia, i) => (
                    <SelectItem key={dia} value={String(i)} className="capitalize">
                      {dia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequenciaNum === 3 && (
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Em que dia do mês</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={diaDoMes}
                onChange={(e) => setDiaDoMes(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Etiqueta (opcional)</Label>
            <Select value={etiquetaId} onValueChange={(v) => v && setEtiquetaId(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => etiqueta?.nome ?? "Sem etiqueta"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_ETIQUETA}>Sem etiqueta</SelectItem>
                {listaDeEtiquetas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Passos que o cartão já traz (opcional)</Label>
          {checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => mudarItem(i, e.target.value)}
                placeholder="Ex.: Conferir os documentos anexados"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                title="Remover este passo"
                onClick={() => setChecklist((atuais) => atuais.filter((_, indice) => indice !== i))}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setChecklist((atuais) => [...atuais, ""])}
          >
            <Plus className="size-4" /> Adicionar passo
          </Button>
          <p className="text-xs text-muted-foreground">
            Cada passo vira um item para marcar dentro do cartão, toda vez que a tarefa nascer.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
          <div className="min-w-0">
            <Label className="text-sm">Ativa</Label>
            <p className="text-xs text-muted-foreground">
              Desligada, a tarefa para de nascer, mas a configuração continua guardada.
            </p>
          </div>
          <Switch checked={ativa} onCheckedChange={(v) => setAtiva(v)} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={handleSalvar} disabled={salvar.isPending || !titulo.trim() || !userId}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
