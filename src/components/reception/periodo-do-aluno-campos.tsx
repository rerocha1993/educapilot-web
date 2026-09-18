"use client";

import { useState } from "react";
import { Clock, Sun, Sunset, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  ConfiguracaoPortaria,
  OrientacaoDoPeriodo,
  PeriodoDoAluno,
  TipoDePeriodo,
} from "@/lib/reception/use-portaria";

export interface ValorDoPeriodo {
  tipo: TipoDePeriodo | null;
  orientacao: OrientacaoDoPeriodo | null;
  horarioReferencia: string;
}

export const PERIODO_VAZIO: ValorDoPeriodo = { tipo: null, orientacao: null, horarioReferencia: "" };

export const ROTULOS_DO_PERIODO: Record<TipoDePeriodo, string> = {
  Integral: "Integral",
  MeioPeriodoManha: "Meio período (manhã)",
  MeioPeriodoTarde: "Meio período (tarde)",
  SeisHoras: "Meio período flexível (6h)",
  OitoHoras: "8 horas",
  DezHoras: "10 horas",
};

const HORAS: Partial<Record<TipoDePeriodo, number>> = { SeisHoras: 6, OitoHoras: 8, DezHoras: 10 };

// Mesmos valores iniciais do backend, para a prévia não ficar vazia enquanto a configuração carrega.
const HORARIOS_PADRAO = {
  manhaEntrada: "07:00",
  manhaSaida: "13:00",
  tardeEntrada: "13:00",
  tardeSaida: "19:00",
  integralEntrada: "07:00",
  integralSaida: "19:00",
};

type Horarios = Pick<ConfiguracaoPortaria, keyof typeof HORARIOS_PADRAO>;

function somarHoras(horario: string, horas: number): string {
  const [h, m] = horario.split(":").map(Number);
  const total = (((h * 60 + m + horas * 60) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Entrada e saída previstas, calculadas como o backend calcula. */
export function horariosDoPeriodo(valor: ValorDoPeriodo, config?: Horarios): { entrada?: string; saida?: string } {
  const c = config ?? HORARIOS_PADRAO;
  switch (valor.tipo) {
    case null:
      return {};
    case "Integral":
      return { entrada: c.integralEntrada, saida: c.integralSaida };
    case "MeioPeriodoManha":
      return { entrada: c.manhaEntrada, saida: c.manhaSaida };
    case "MeioPeriodoTarde":
      return { entrada: c.tardeEntrada, saida: c.tardeSaida };
  }

  const horas = HORAS[valor.tipo];
  if (!horas || !valor.orientacao || !/^\d{2}:\d{2}$/.test(valor.horarioReferencia)) return {};
  return valor.orientacao === "Entrada"
    ? { entrada: valor.horarioReferencia, saida: somarHoras(valor.horarioReferencia, horas) }
    : { entrada: somarHoras(valor.horarioReferencia, -horas), saida: valor.horarioReferencia };
}

export function valorDoPeriodo(periodo?: PeriodoDoAluno | null): ValorDoPeriodo {
  return {
    tipo: periodo?.tipo ?? null,
    orientacao: periodo?.orientacao ?? null,
    horarioReferencia: periodo?.horarioReferencia ?? "",
  };
}

/** Rótulo curto com os horários, para listas: "Meio período (manhã) · 07:00–13:00". */
export function descreverPeriodo(periodo: { tipo?: TipoDePeriodo | null; entradaPrevista?: string | null; saidaPrevista?: string | null }) {
  if (!periodo.tipo) return null;
  const horarios = periodo.entradaPrevista && periodo.saidaPrevista ? `${periodo.entradaPrevista}–${periodo.saidaPrevista}` : null;
  return { rotulo: ROTULOS_DO_PERIODO[periodo.tipo], horarios };
}

/**
 * Os campos com estado próprio, começando de um valor inicial.
 *
 * Quem usa passa um `key` que muda quando o valor inicial chega do servidor: o componente recomeça
 * dele, sem copiar dado para o estado dentro de efeito.
 */
export function PeriodoEditavel({
  inicial,
  config,
  onChange,
}: {
  inicial: ValorDoPeriodo;
  config?: Horarios;
  onChange: (valor: ValorDoPeriodo) => void;
}) {
  const [valor, setValor] = useState(inicial);
  const [outrosAbertos, setOutrosAbertos] = useState(false);

  return (
    <PeriodoDoAlunoCampos
      valor={valor}
      onChange={(novo) => {
        setValor(novo);
        onChange(novo);
      }}
      config={config}
      outrosAbertos={outrosAbertos}
      onOutrosAbertos={setOutrosAbertos}
    />
  );
}

/** O período está completo para salvar. */
export function periodoCompleto(valor: ValorDoPeriodo): boolean {
  if (valor.tipo === null) return true;
  if (!HORAS[valor.tipo]) return true;
  return !!valor.orientacao && /^\d{2}:\d{2}$/.test(valor.horarioReferencia);
}

function Opcao({
  selecionada,
  onClick,
  titulo,
  detalhe,
  icone: Icone,
}: {
  selecionada: boolean;
  onClick: () => void;
  titulo: string;
  detalhe: string;
  icone?: typeof Clock;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionada}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors max-md:min-h-10",
        selecionada ? "border-primary bg-accent/40 ring-1 ring-primary" : "border-input hover:border-primary"
      )}
    >
      {Icone && <Icone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <span>
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalhe}</span>
      </span>
    </button>
  );
}

/**
 * Período do aluno: Integral ou outros períodos.
 *
 * "Outros" abre as opções. Meio período da manhã e da tarde têm horário fixo da escola. Nas cargas
 * horárias (6, 8 e 10 horas) a escola diz qual horário é o fixo — a entrada ou a saída — e o outro
 * é calculado: quem sempre sai às 19h com 8 horas entra às 11h.
 */
export function PeriodoDoAlunoCampos({
  valor,
  onChange,
  config,
  outrosAbertos,
  onOutrosAbertos,
}: {
  valor: ValorDoPeriodo;
  onChange: (valor: ValorDoPeriodo) => void;
  config?: Horarios;
  /** "Outros períodos" escolhido antes de escolher qual. Controlado por quem usa, para sobreviver ao salvar. */
  outrosAbertos: boolean;
  onOutrosAbertos: (abertos: boolean) => void;
}) {
  const c = config ?? HORARIOS_PADRAO;
  const mostrarOutros = outrosAbertos || (valor.tipo !== null && valor.tipo !== "Integral");
  const horas = valor.tipo ? HORAS[valor.tipo] : undefined;
  const previsto = horariosDoPeriodo(valor, config);

  function escolher(tipo: TipoDePeriodo) {
    const cargaHoraria = !!HORAS[tipo];
    onChange({
      tipo,
      orientacao: cargaHoraria ? (valor.orientacao ?? "Entrada") : null,
      horarioReferencia: cargaHoraria ? valor.horarioReferencia : "",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Opcao
          selecionada={valor.tipo === "Integral"}
          onClick={() => {
            onOutrosAbertos(false);
            onChange({ tipo: "Integral", orientacao: null, horarioReferencia: "" });
          }}
          titulo="Integral"
          detalhe={`${c.integralEntrada} às ${c.integralSaida}, sem horário a informar`}
          icone={Sun}
        />
        <Opcao
          selecionada={mostrarOutros}
          onClick={() => {
            onOutrosAbertos(true);
            if (valor.tipo === "Integral") onChange(PERIODO_VAZIO);
          }}
          titulo="Outros períodos"
          detalhe="Meio período ou carga horária"
          icone={Clock}
        />
      </div>

      {mostrarOutros && (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border-dashed p-3">
          <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Opções</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Opcao
              selecionada={valor.tipo === "MeioPeriodoManha"}
              onClick={() => escolher("MeioPeriodoManha")}
              titulo="Meio período (manhã)"
              detalhe={`Entra ${c.manhaEntrada} e sai ${c.manhaSaida}`}
              icone={Sun}
            />
            <Opcao
              selecionada={valor.tipo === "MeioPeriodoTarde"}
              onClick={() => escolher("MeioPeriodoTarde")}
              titulo="Meio período (tarde)"
              detalhe={`Entra ${c.tardeEntrada} e sai ${c.tardeSaida}`}
              icone={Sunset}
            />
            <Opcao
              selecionada={valor.tipo === "OitoHoras"}
              onClick={() => escolher("OitoHoras")}
              titulo="8 horas"
              detalhe="Informe a entrada ou a saída"
              icone={Timer}
            />
            <Opcao
              selecionada={valor.tipo === "DezHoras"}
              onClick={() => escolher("DezHoras")}
              titulo="10 horas"
              detalhe="Informe a entrada ou a saída"
              icone={Timer}
            />
            <Opcao
              selecionada={valor.tipo === "SeisHoras"}
              onClick={() => escolher("SeisHoras")}
              titulo="Meio período flexível"
              detalhe="6 horas, informe a entrada ou a saída"
              icone={Timer}
            />
          </div>

          {horas && (
            <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Orientação</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Opcao
                  selecionada={valor.orientacao === "Entrada"}
                  onClick={() => onChange({ ...valor, orientacao: "Entrada" })}
                  titulo="Horário de entrada"
                  detalhe="Sempre entra no mesmo horário; a saída é calculada"
                />
                <Opcao
                  selecionada={valor.orientacao === "Saida"}
                  onClick={() => onChange({ ...valor, orientacao: "Saida" })}
                  titulo="Horário de saída"
                  detalhe="Sempre sai no mesmo horário; a entrada é calculada"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                    {valor.orientacao === "Saida" ? "Horário de saída" : "Horário de entrada"}
                  </Label>
                  <Input
                    type="time"
                    className="w-32"
                    value={valor.horarioReferencia}
                    onChange={(e) => onChange({ ...valor, horarioReferencia: e.target.value })}
                  />
                </div>
                {previsto.entrada && previsto.saida && (
                  <p className="pb-2 text-sm">
                    Entra <strong className="font-mono tabular-nums">{previsto.entrada}</strong> e sai{" "}
                    <strong className="font-mono tabular-nums">{previsto.saida}</strong>
                  </p>
                )}
              </div>
              {valor.orientacao === "Entrada" && (
                <p className="text-xs text-muted-foreground">
                  No dia, a saída conta a partir da chegada registrada: quem chega mais tarde sai mais tarde sem multa.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
