"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useSalvarItemDoCronograma,
  type ItemDoCronograma,
} from "@/lib/relacionamento/use-relacionamento";
import { capitalizar, DIAS_DA_SEMANA_LONGOS } from "@/lib/tasks/calendario-datas";

interface Campos {
  diaDaSemana: number;
  horaInicio: string;
  horaFim: string;
  atividade: string;
  descricao: string;
  visivelParaFamilias: boolean;
}

function nomeDoDia(dia: number): string {
  return capitalizar(DIAS_DA_SEMANA_LONGOS[dia] ?? "");
}

/**
 * Criar ou editar um item do cronograma. Salva na hora (POST/PUT), sem botão geral de salvar.
 *
 * O pai monta o diálogo ao abrir e o desmonta ao fechar, então o formulário nasce do item
 * recebido sem efeito de sincronização.
 */
export function DialogItemDoCronograma({
  item,
  diaInicial,
  classId,
  onFechar,
}: {
  item: ItemDoCronograma | null;
  diaInicial: number;
  /** Turma do cronograma aberto; nulo = escola toda. */
  classId: number | null;
  onFechar: () => void;
}) {
  const salvar = useSalvarItemDoCronograma();
  const [f, setF] = useState<Campos>(() => ({
    diaDaSemana: item?.diaDaSemana ?? diaInicial,
    horaInicio: item?.horaInicio ?? "",
    horaFim: item?.horaFim ?? "",
    atividade: item?.atividade ?? "",
    descricao: item?.descricao ?? "",
    visivelParaFamilias: item?.visivelParaFamilias ?? true,
  }));
  const [erro, setErro] = useState<string | null>(null);

  function mudar(parte: Partial<Campos>) {
    setF((atual) => ({ ...atual, ...parte }));
    setErro(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    const atividade = f.atividade.trim();
    if (!atividade) return setErro("Dê um nome à atividade.");
    if (!f.horaInicio) return setErro("Informe a hora de início.");
    // Horas "HH:mm" comparam certo como texto.
    if (f.horaFim && f.horaFim <= f.horaInicio) return setErro("O término precisa ser depois do início.");

    try {
      await salvar.mutateAsync({
        id: item?.id,
        dados: {
          classId,
          diaDaSemana: f.diaDaSemana,
          horaInicio: f.horaInicio,
          horaFim: f.horaFim || null,
          atividade,
          descricao: f.descricao.trim() || null,
          visivelParaFamilias: f.visivelParaFamilias,
        },
      });
      toast.success(item ? "Item atualizado." : "Item adicionado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o item.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !salvar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>
            {f.visivelParaFamilias
              ? "As famílias veem este item na rotina da semana."
              : "Só a equipe vê este item."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="grid gap-4">
          <Campo id="cron-dia" rotulo="Dia da semana">
            <Select value={String(f.diaDaSemana)} onValueChange={(v) => v && mudar({ diaDaSemana: Number(v) })}>
              <SelectTrigger id="cron-dia" className="w-full">
                <SelectValue>{() => nomeDoDia(f.diaDaSemana)}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {nomeDoDia(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo id="cron-inicio" rotulo="Início">
              <Input
                id="cron-inicio"
                type="time"
                value={f.horaInicio}
                onChange={(e) => mudar({ horaInicio: e.target.value })}
                aria-invalid={erro !== null && !f.horaInicio}
                autoFocus
              />
            </Campo>
            <Campo id="cron-fim" rotulo="Término (opcional)">
              <Input
                id="cron-fim"
                type="time"
                value={f.horaFim}
                onChange={(e) => mudar({ horaFim: e.target.value })}
              />
            </Campo>
          </div>

          <Campo id="cron-atividade" rotulo="Atividade">
            <Input
              id="cron-atividade"
              value={f.atividade}
              maxLength={120}
              onChange={(e) => mudar({ atividade: e.target.value })}
              placeholder="Ex.: Roda de conversa"
              aria-invalid={erro !== null && !f.atividade.trim()}
            />
          </Campo>

          <Campo id="cron-descricao" rotulo="Descrição (opcional)">
            <Textarea
              id="cron-descricao"
              value={f.descricao}
              onChange={(e) => mudar({ descricao: e.target.value })}
              rows={3}
              placeholder="O que acontece, o que levar…"
            />
          </Campo>

          <div className="flex min-h-11 items-center gap-3">
            <Switch
              id="cron-visivel"
              checked={f.visivelParaFamilias}
              onCheckedChange={(v) => mudar({ visivelParaFamilias: v })}
            />
            <Label htmlFor="cron-visivel" className="cursor-pointer">
              Visível para as famílias
            </Label>
          </div>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={salvar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
