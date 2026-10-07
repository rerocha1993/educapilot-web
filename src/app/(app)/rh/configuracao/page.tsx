"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { RhNav } from "@/components/rh/rh-nav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import {
  useConfiguracaoDoRh,
  useSalvarConfiguracaoDoRh,
  type ConfiguracaoDoRh,
} from "@/lib/rh/use-rh";
import { DIAS_DA_SEMANA_LONGOS, capitalizar } from "@/lib/tasks/calendario-datas";

export default function ConfiguracaoDoRhPage() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useConfiguracaoDoRh();

  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Configuração"
        apoio="A jornada padrão e os dias de trabalho. É a partir dela que o ponto calcula horas previstas, faltas e atrasos."
      />

      {isError && <ErroDeCarga texto="Não foi possível carregar a configuração." onTentar={() => refetch()} />}
      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {/* A chave muda quando o servidor devolve a configuração salva: o formulário recomeça dela. */}
      {data && <Formulario key={dataUpdatedAt} inicial={data} />}
    </div>
  );
}

interface Campos {
  jornadaEntrada: string;
  jornadaSaida: string;
  intervaloMinutos: string;
  toleranciaMinutos: string;
  horasSemanais: string;
  diasDaSemana: number[];
}

const numero = (texto: string) => Number(texto.trim().replace(",", "."));

function Formulario({ inicial }: { inicial: ConfiguracaoDoRh }) {
  const podeEscrever = usePodeEscreverNoRh();
  const salvar = useSalvarConfiguracaoDoRh();
  const [campos, setCampos] = useState<Campos>(() => ({
    jornadaEntrada: inicial.jornadaEntrada,
    jornadaSaida: inicial.jornadaSaida,
    intervaloMinutos: String(inicial.intervaloMinutos),
    toleranciaMinutos: String(inicial.toleranciaMinutos),
    horasSemanais: String(inicial.horasSemanais),
    diasDaSemana: inicial.diasDaSemana,
  }));
  const [erro, setErro] = useState<string | null>(null);

  function mudar(parte: Partial<Campos>) {
    setCampos((c) => ({ ...c, ...parte }));
    setErro(null);
  }

  function alternarDia(dia: number, marcado: boolean) {
    mudar({
      diasDaSemana: marcado
        ? [...new Set([...campos.diasDaSemana, dia])].sort((a, b) => a - b)
        : campos.diasDaSemana.filter((d) => d !== dia),
    });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    if (!campos.jornadaEntrada || !campos.jornadaSaida) return setErro("Informe a entrada e a saída da jornada.");
    // Horas "HH:mm" comparam certo como texto.
    if (campos.jornadaSaida <= campos.jornadaEntrada) return setErro("A saída precisa ser depois da entrada.");

    const intervalo = numero(campos.intervaloMinutos);
    const tolerancia = numero(campos.toleranciaMinutos);
    const horas = numero(campos.horasSemanais);
    if (!Number.isFinite(intervalo) || intervalo < 0 || intervalo > 240) {
      return setErro("O intervalo vai de 0 a 240 minutos.");
    }
    if (!Number.isFinite(tolerancia) || tolerancia < 0 || tolerancia > 60) {
      return setErro("A tolerância vai de 0 a 60 minutos.");
    }
    if (!Number.isFinite(horas) || horas <= 0 || horas > 80) {
      return setErro("As horas semanais vão de 1 a 80.");
    }
    if (campos.diasDaSemana.length === 0) return setErro("Marque ao menos um dia de trabalho.");

    try {
      await salvar.mutateAsync({
        jornadaEntrada: campos.jornadaEntrada,
        jornadaSaida: campos.jornadaSaida,
        intervaloMinutos: Math.round(intervalo),
        toleranciaMinutos: Math.round(tolerancia),
        horasSemanais: horas,
        diasDaSemana: campos.diasDaSemana,
      });
      toast.success("Configuração salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a configuração.");
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <fieldset disabled={!podeEscrever || salvar.isPending} className="flex flex-col gap-4">
        <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="font-heading text-[15.5px] font-semibold">Jornada padrão</h2>
            <p className="mt-0.5 text-[13px] leading-[1.55] text-muted-foreground">
              Vale para quem não tem carga horária própria na ficha.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Campo id="cfg-entrada" rotulo="Entrada">
              <Input
                id="cfg-entrada"
                type="time"
                value={campos.jornadaEntrada}
                onChange={(e) => mudar({ jornadaEntrada: e.target.value })}
              />
            </Campo>
            <Campo id="cfg-saida" rotulo="Saída">
              <Input
                id="cfg-saida"
                type="time"
                value={campos.jornadaSaida}
                onChange={(e) => mudar({ jornadaSaida: e.target.value })}
              />
            </Campo>
            <Campo id="cfg-intervalo" rotulo="Intervalo (min)">
              <Input
                id="cfg-intervalo"
                inputMode="numeric"
                value={campos.intervaloMinutos}
                onChange={(e) => mudar({ intervaloMinutos: e.target.value })}
              />
            </Campo>
            <Campo id="cfg-tolerancia" rotulo="Tolerância (min)" dica="Atraso até aqui não conta.">
              <Input
                id="cfg-tolerancia"
                inputMode="numeric"
                value={campos.toleranciaMinutos}
                onChange={(e) => mudar({ toleranciaMinutos: e.target.value })}
              />
            </Campo>
            <Campo id="cfg-horas" rotulo="Horas por semana">
              <Input
                id="cfg-horas"
                inputMode="decimal"
                value={campos.horasSemanais}
                onChange={(e) => mudar({ horasSemanais: e.target.value })}
              />
            </Campo>
          </div>
        </section>

        <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="font-heading text-[15.5px] font-semibold">Dias de trabalho</h2>
            <p className="mt-0.5 text-[13px] leading-[1.55] text-muted-foreground">
              Dias desmarcados são folga: não entram nas horas previstas nem contam como falta.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-4 md:grid-cols-7">
            {DIAS_DA_SEMANA_LONGOS.map((nome, dia) => (
              <label
                key={nome}
                className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-1 active:bg-muted"
              >
                <Checkbox
                  checked={campos.diasDaSemana.includes(dia)}
                  onCheckedChange={(v) => alternarDia(dia, v)}
                />
                <span className="text-sm">{capitalizar(nome.replace("-feira", ""))}</span>
              </label>
            ))}
          </div>
        </section>
      </fieldset>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {podeEscrever ? (
        <div>
          <Button type="submit" variant="action" disabled={salvar.isPending} className="w-full md:w-auto">
            {salvar.isPending ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Você pode ver a configuração, mas não alterá-la.</p>
      )}
    </form>
  );
}
