"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dataCurta, somarDias } from "@/lib/rh/ponto-formatar";
import {
  AJUSTE_DIAS_PARA_TRAS,
  JUSTIFICATIVA_MAXIMA,
  JUSTIFICATIVA_MINIMA,
  ROTULO_DO_TIPO,
  TIPOS_DE_BATIDA,
  rotuloDoTipo,
  useSolicitarAjuste,
  type ComprovanteDoPonto,
  type TipoDeBatida,
} from "@/lib/rh/use-meu-ponto";
import { cn } from "@/lib/utils";

import { Folha } from "./folha";
import { Aviso, BotaoGrande } from "./pecas";

/**
 * "Pedir ajuste": o funcionário diz que esqueceu de bater, ou que uma batida saiu errada, e a
 * gestão decide. O pedido entra como batida pendente (aparece no histórico) e só conta no ponto
 * depois de aprovado.
 *
 * Aberto de uma batida (`original`), já vem com o dia, o tipo e a hora dela, e "Corrigir esta
 * batida" ligado: o servidor liga o pedido à original. Desligado, é uma batida a mais.
 */
export function FolhaDoPedidoDeAjuste({
  hoje,
  original,
  onFechar,
}: {
  /** yyyy-MM-dd, o dia de hoje no horário da escola. */
  hoje: string;
  original: ComprovanteDoPonto | null;
  onFechar: () => void;
}) {
  const enviar = useSolicitarAjuste();
  const [data, setData] = useState(original?.data ?? hoje);
  const [tipo, setTipo] = useState<TipoDeBatida>(original?.tipo ?? "Entrada");
  const [hora, setHora] = useState(original?.horaLocal ?? "");
  const [corrigir, setCorrigir] = useState(!!original?.id);
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const menor = somarDias(hoje, -AJUSTE_DIAS_PARA_TRAS);
  const tamanho = justificativa.trim().length;
  const curta = tamanho < JUSTIFICATIVA_MINIMA;

  function mudar<T>(definir: (valor: T) => void) {
    return (valor: T) => {
      definir(valor);
      setErro(null);
    };
  }

  async function mandar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return setErro("Escolha o dia.");
    if (data > hoje) return setErro("Não dá para pedir ajuste de um dia que ainda não chegou.");
    if (data < menor) return setErro(`Só dá para pedir ajuste dos últimos ${AJUSTE_DIAS_PARA_TRAS} dias.`);
    if (!hora) return setErro("Diga a hora em que a batida devia ter sido feita.");
    if (curta) return setErro(`Explique o motivo com pelo menos ${JUSTIFICATIVA_MINIMA} letras.`);

    try {
      await enviar.mutateAsync({
        data,
        tipo,
        horaLocal: hora,
        justificativa,
        marcacaoOriginalId: corrigir ? (original?.id ?? null) : null,
      });
      toast.success("Pedido enviado; a gestão vai avaliar.");
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o pedido.");
    }
  }

  return (
    <Folha
      titulo="Pedir ajuste"
      descricao="Esqueceu de bater ou bateu errado? Conte o que aconteceu: a gestão avalia e, se aprovar, a batida passa a valer."
      onFechar={onFechar}
      bloqueada={enviar.isPending}
    >
      <form onSubmit={mandar} noValidate className="flex flex-col gap-4">
        {original?.id && (
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2">
            <Checkbox checked={corrigir} onCheckedChange={(v) => mudar(setCorrigir)(v === true)} />
            <span className="text-[15px] leading-snug">
              Corrigir esta batida
              <span className="block text-sm text-muted-foreground">
                {rotuloDoTipo(original.tipo)} às {original.horaLocal}, {dataCurta(original.data)}
              </span>
            </span>
          </label>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="ajuste-dia">Dia</Label>
          <Input
            id="ajuste-dia"
            type="date"
            value={data}
            min={menor}
            max={hoje}
            onChange={(e) => mudar(setData)(e.target.value)}
            className="h-12 text-base max-md:h-12"
          />
        </div>

        <fieldset className="grid gap-1.5">
          <legend className="text-sm leading-none font-medium">Qual batida</legend>
          <div role="radiogroup" aria-label="Qual batida" className="mt-1.5 grid grid-cols-2 gap-2">
            {TIPOS_DE_BATIDA.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                onClick={() => mudar(setTipo)(t)}
                className={cn(
                  "min-h-12 rounded-xl border px-3 text-[15px] font-medium transition-colors",
                  tipo === t
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-foreground active:bg-muted"
                )}
              >
                {ROTULO_DO_TIPO[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-1.5">
          <Label htmlFor="ajuste-hora">Hora que devia ter sido</Label>
          <Input
            id="ajuste-hora"
            type="time"
            value={hora}
            onChange={(e) => mudar(setHora)(e.target.value)}
            className="h-12 text-base max-md:h-12"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ajuste-motivo">O que aconteceu</Label>
          <Textarea
            id="ajuste-motivo"
            value={justificativa}
            maxLength={JUSTIFICATIVA_MAXIMA}
            rows={4}
            placeholder="Ex.: esqueci de bater a saída porque estava com a turma no passeio"
            onChange={(e) => mudar(setJustificativa)(e.target.value)}
            className="text-base"
          />
          <p
            className={cn(
              "text-right text-xs tabular-nums",
              curta && tamanho > 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {tamanho}/{JUSTIFICATIVA_MAXIMA}
            {curta && ` · mínimo ${JUSTIFICATIVA_MINIMA}`}
          </p>
        </div>

        {erro && <Aviso tom="erro">{erro}</Aviso>}

        <BotaoGrande type="submit" variant="action" disabled={enviar.isPending}>
          {enviar.isPending ? (
            <>
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
              Enviando...
            </>
          ) : (
            "Enviar pedido"
          )}
        </BotaoGrande>
      </form>
    </Folha>
  );
}
