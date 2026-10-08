"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { diaComSemana } from "@/lib/tasks/calendario-datas";
import { useExcluirPonto, usePonto, useSalvarPonto, type RegistroDePonto } from "@/lib/rh/use-rh";

import { Campo } from "./campo";

interface Formulario {
  entrada: string;
  saidaIntervalo: string;
  retornoIntervalo: string;
  saida: string;
  observacao: string;
}

function formularioDe(r: RegistroDePonto | null): Formulario {
  return {
    entrada: r?.entrada ?? "",
    saidaIntervalo: r?.saidaIntervalo ?? "",
    retornoIntervalo: r?.retornoIntervalo ?? "",
    saida: r?.saida ?? "",
    observacao: r?.observacao ?? "",
  };
}

/**
 * Confere os quatro horários antes de mandar, ou devolve a frase que diz o que está errado.
 *
 * Horas "HH:mm" comparam certo como texto. A ordem é entrada, saída para o intervalo, retorno e
 * saída; o intervalo só vale com os dois lados.
 */
export function validarHorarios(f: Formulario): string | null {
  const { entrada, saidaIntervalo, retornoIntervalo, saida } = f;

  if (!entrada && !saidaIntervalo && !retornoIntervalo && !saida) {
    return "Informe ao menos a entrada.";
  }
  if (!entrada) return "Informe a hora de entrada.";
  if (!!saidaIntervalo !== !!retornoIntervalo) {
    return "Informe a saída e o retorno do intervalo, ou deixe os dois vazios.";
  }

  const preenchidos = [entrada, saidaIntervalo, retornoIntervalo, saida].filter(Boolean);
  for (let i = 1; i < preenchidos.length; i++) {
    if (preenchidos[i] <= preenchidos[i - 1]) {
      return "Os horários precisam seguir a ordem: entrada, saída para o intervalo, retorno e saída.";
    }
  }
  return null;
}

/**
 * Lançar, corrigir ou apagar o ponto de um dia.
 *
 * Busca o registro do dia por conta própria, em vez de o pai passar o que tem na tela: "Lançar
 * hoje" abre em qualquer mês, e salvar um formulário em branco por cima de um dia já lançado
 * apagaria os horários. O formulário só nasce quando o registro chegou.
 */
export function DialogPonto({
  funcionarioId,
  funcionarioNome,
  data,
  onFechar,
}: {
  funcionarioId: string;
  funcionarioNome: string;
  data: string;
  onFechar: () => void;
}) {
  const { data: registros, isLoading, isError } = usePonto(funcionarioId, data, data);
  const registro = registros?.find((r) => r.data === data) ?? null;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ponto do dia</DialogTitle>
          <DialogDescription>
            {funcionarioNome} · {diaComSemana(data)}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar o lançamento deste dia.
          </p>
        ) : (
          <FormularioDePonto
            funcionarioId={funcionarioId}
            data={data}
            registro={registro}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormularioDePonto({
  funcionarioId,
  data,
  registro,
  onFechar,
}: {
  funcionarioId: string;
  data: string;
  registro: RegistroDePonto | null;
  onFechar: () => void;
}) {
  const salvar = useSalvarPonto();
  const excluir = useExcluirPonto();
  const [f, setF] = useState(() => formularioDe(registro));
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const ocupado = salvar.isPending || excluir.isPending;

  function mudar(parte: Partial<Formulario>) {
    setF((atual) => ({ ...atual, ...parte }));
    setErro(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validarHorarios(f);
    if (problema) {
      setErro(problema);
      return;
    }

    try {
      await salvar.mutateAsync({
        funcionarioId,
        data,
        entrada: f.entrada || null,
        saidaIntervalo: f.saidaIntervalo || null,
        retornoIntervalo: f.retornoIntervalo || null,
        saida: f.saida || null,
        observacao: f.observacao.trim() || null,
      });
      toast.success(registro ? "Ponto atualizado." : "Ponto lançado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível lançar o ponto.");
    }
  }

  async function confirmarExclusao() {
    if (!registro) return;
    try {
      await excluir.mutateAsync(registro.id);
      toast.success("Lançamento excluído.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o lançamento.");
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Campo id="ponto-entrada" rotulo="Entrada">
          <Input
            id="ponto-entrada"
            type="time"
            value={f.entrada}
            onChange={(e) => mudar({ entrada: e.target.value })}
            autoFocus
            aria-invalid={erro !== null && !f.entrada}
          />
        </Campo>
        <Campo id="ponto-saida" rotulo="Saída">
          <Input
            id="ponto-saida"
            type="time"
            value={f.saida}
            onChange={(e) => mudar({ saida: e.target.value })}
          />
        </Campo>
        <Campo id="ponto-saida-intervalo" rotulo="Saída para o intervalo">
          <Input
            id="ponto-saida-intervalo"
            type="time"
            value={f.saidaIntervalo}
            onChange={(e) => mudar({ saidaIntervalo: e.target.value })}
          />
        </Campo>
        <Campo id="ponto-retorno" rotulo="Retorno do intervalo">
          <Input
            id="ponto-retorno"
            type="time"
            value={f.retornoIntervalo}
            onChange={(e) => mudar({ retornoIntervalo: e.target.value })}
          />
        </Campo>
      </div>

      <Campo id="ponto-observacao" rotulo="Observação">
        <Textarea
          id="ponto-observacao"
          value={f.observacao}
          onChange={(e) => mudar({ observacao: e.target.value })}
          rows={2}
          placeholder="Ex.: saiu mais cedo, reunião externa…"
        />
      </Campo>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {confirmandoExclusao ? (
        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm font-medium">Excluir o lançamento deste dia?</p>
          <div className="flex gap-2 max-sm:flex-col-reverse">
            <Button
              type="button"
              variant="outline"
              disabled={ocupado}
              onClick={() => setConfirmandoExclusao(false)}
            >
              Manter
            </Button>
            <Button type="button" variant="destructive" disabled={ocupado} onClick={confirmarExclusao}>
              {excluir.isPending ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </div>
        </DialogFooter>
      ) : (
        <DialogFooter className="sm:justify-between">
          {registro ? (
            <Button
              type="button"
              variant="destructive"
              disabled={ocupado}
              onClick={() => setConfirmandoExclusao(true)}
            >
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 max-sm:flex-col-reverse sm:justify-end">
            <Button type="button" variant="outline" disabled={ocupado} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={ocupado}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      )}
    </form>
  );
}
