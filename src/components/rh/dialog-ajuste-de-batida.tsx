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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatarSoData } from "@/lib/format/date";
import { useAjustarMarcacao, type Marcacao } from "@/lib/rh/use-marcacoes";
import { ROTULO_DO_TIPO, TIPOS_DE_BATIDA, rotuloDoTipo, type TipoDeBatida } from "@/lib/rh/use-meu-ponto";

import { Campo } from "./campo";
import { SeletorDeFuncionario } from "./seletor-de-funcionario";

/**
 * Ajuste da gestão: lança uma batida em nome do funcionário (esqueceu de bater, celular sem
 * bateria) com a justificativa que fica no registro. Aberto de uma batida, já vem com quem, o tipo
 * e a hora dela, e o servidor liga o ajuste à batida original; aberto da barra, parte do zero.
 */
export function DialogAjusteDeBatida({
  original,
  dataInicial,
  onFechar,
}: {
  original: Marcacao | null;
  dataInicial: string;
  onFechar: () => void;
}) {
  const ajustar = useAjustarMarcacao();
  const [funcionarioId, setFuncionarioId] = useState(original?.funcionarioId ?? "");
  const [tipo, setTipo] = useState<TipoDeBatida>(original?.tipo ?? "Entrada");
  const [data, setData] = useState(original?.data ?? dataInicial);
  const [hora, setHora] = useState(original?.horaLocal ?? "");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function tocar<T>(definir: (valor: T) => void) {
    return (valor: T) => {
      definir(valor);
      setErro(null);
    };
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!funcionarioId) return setErro("Escolha o funcionário.");
    if (!data) return setErro("Informe o dia.");
    if (!hora) return setErro("Informe a hora.");
    if (justificativa.trim().length < 5) return setErro("Explique o motivo do ajuste.");

    try {
      await ajustar.mutateAsync({
        funcionarioId,
        tipo,
        data,
        horaLocal: hora,
        justificativa,
        marcacaoOriginalId: original?.id ?? null,
      });
      toast.success("Ajuste lançado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível lançar o ajuste.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !ajustar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{original ? "Ajustar batida" : "Lançar ajuste"}</DialogTitle>
          <DialogDescription>
            {original
              ? `${original.funcionarioNome} · ${rotuloDoTipo(original.tipo)} às ${original.horaLocal} de ${formatarSoData(original.data)}. O ajuste fica registrado com a sua justificativa.`
              : "Lance uma batida em nome do funcionário. O ajuste fica registrado com a sua justificativa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="grid gap-4">
          {!original && (
            <Campo id="ajuste-funcionario" rotulo="Funcionário">
              <SeletorDeFuncionario id="ajuste-funcionario" valor={funcionarioId} onChange={tocar(setFuncionarioId)} />
            </Campo>
          )}

          <Campo id="ajuste-tipo" rotulo="Batida">
            <Select value={tipo} onValueChange={(v) => v && tocar(setTipo)(v as TipoDeBatida)}>
              <SelectTrigger id="ajuste-tipo" className="w-full">
                <SelectValue>{() => ROTULO_DO_TIPO[tipo]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {TIPOS_DE_BATIDA.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ROTULO_DO_TIPO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo id="ajuste-data" rotulo="Dia">
              <Input id="ajuste-data" type="date" value={data} onChange={(e) => tocar(setData)(e.target.value)} />
            </Campo>
            <Campo id="ajuste-hora" rotulo="Hora">
              <Input id="ajuste-hora" type="time" value={hora} onChange={(e) => tocar(setHora)(e.target.value)} />
            </Campo>
          </div>

          <Campo id="ajuste-justificativa" rotulo="Justificativa">
            <Textarea
              id="ajuste-justificativa"
              value={justificativa}
              rows={3}
              maxLength={300}
              placeholder="Ex.: esqueceu de bater a saída; confirmado com a coordenação"
              onChange={(e) => tocar(setJustificativa)(e.target.value)}
            />
          </Campo>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={ajustar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={ajustar.isPending}>
              {ajustar.isPending ? "Lançando..." : "Lançar ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
