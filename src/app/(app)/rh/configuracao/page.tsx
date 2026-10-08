"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { RhNav } from "@/components/rh/rh-nav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  pontoPeloCelularAtivo: boolean;
  raioDaCercaMetros: string;
  precisaoMaximaMetros: string;
  exigirFoto: boolean;
  foraDaCercaBloqueia: boolean;
  intervaloMinimoEntreBatidasMinutos: string;
  aprovarAparelhoNovo: boolean;
  exigirSequencia: boolean;
  maximoDeBatidasPorDia: string;
  jornadaMaximaHoras: string;
  enviarComprovantePorEmail: boolean;
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
    pontoPeloCelularAtivo: inicial.pontoPeloCelularAtivo,
    raioDaCercaMetros: String(inicial.raioDaCercaMetros),
    precisaoMaximaMetros: String(inicial.precisaoMaximaMetros),
    exigirFoto: inicial.exigirFoto,
    foraDaCercaBloqueia: inicial.foraDaCercaBloqueia,
    intervaloMinimoEntreBatidasMinutos: String(inicial.intervaloMinimoEntreBatidasMinutos),
    aprovarAparelhoNovo: inicial.aprovarAparelhoNovo,
    exigirSequencia: inicial.exigirSequencia,
    maximoDeBatidasPorDia: String(inicial.maximoDeBatidasPorDia),
    jornadaMaximaHoras: String(inicial.jornadaMaximaHoras),
    enviarComprovantePorEmail: inicial.enviarComprovantePorEmail,
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

    const raio = numero(campos.raioDaCercaMetros);
    const precisao = numero(campos.precisaoMaximaMetros);
    const intervaloMinimo = numero(campos.intervaloMinimoEntreBatidasMinutos);
    if (!Number.isFinite(raio) || raio < 10 || raio > 5000) {
      return setErro("O raio da cerca vai de 10 a 5.000 metros.");
    }
    if (!Number.isFinite(precisao) || precisao < 10 || precisao > 1000) {
      return setErro("A precisão máxima vai de 10 a 1.000 metros.");
    }
    if (!Number.isFinite(intervaloMinimo) || intervaloMinimo < 0 || intervaloMinimo > 240) {
      return setErro("O tempo mínimo entre batidas vai de 0 a 240 minutos.");
    }
    const maximoDeBatidas = numero(campos.maximoDeBatidasPorDia);
    const jornadaMaxima = numero(campos.jornadaMaximaHoras);
    if (!Number.isInteger(maximoDeBatidas) || maximoDeBatidas < 2 || maximoDeBatidas > 20) {
      return setErro("O máximo de batidas por dia vai de 2 a 20.");
    }
    if (!Number.isFinite(jornadaMaxima) || jornadaMaxima < 1 || jornadaMaxima > 24) {
      return setErro("A jornada máxima por dia vai de 1 a 24 horas.");
    }

    try {
      await salvar.mutateAsync({
        jornadaEntrada: campos.jornadaEntrada,
        jornadaSaida: campos.jornadaSaida,
        intervaloMinutos: Math.round(intervalo),
        toleranciaMinutos: Math.round(tolerancia),
        horasSemanais: horas,
        diasDaSemana: campos.diasDaSemana,
        pontoPeloCelularAtivo: campos.pontoPeloCelularAtivo,
        raioDaCercaMetros: Math.round(raio),
        precisaoMaximaMetros: Math.round(precisao),
        exigirFoto: campos.exigirFoto,
        foraDaCercaBloqueia: campos.foraDaCercaBloqueia,
        intervaloMinimoEntreBatidasMinutos: Math.round(intervaloMinimo),
        aprovarAparelhoNovo: campos.aprovarAparelhoNovo,
        exigirSequencia: campos.exigirSequencia,
        maximoDeBatidasPorDia: maximoDeBatidas,
        jornadaMaximaHoras: jornadaMaxima,
        enviarComprovantePorEmail: campos.enviarComprovantePorEmail,
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

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="font-heading text-[15.5px] font-semibold">Ponto pelo celular</h2>
            <p className="mt-0.5 text-[13px] leading-[1.55] text-muted-foreground">
              A equipe bate o ponto pelo próprio celular, com biometria, localização e foto. O que fugir das regras
              abaixo fica pendente para você aprovar em Ponto.
            </p>
          </div>

          <Opcao
            id="cfg-celular-ativo"
            titulo="Ligar o ponto pelo celular"
            texto="Desligado, ninguém vê a tela Meu ponto."
            marcado={campos.pontoPeloCelularAtivo}
            onChange={(v) => mudar({ pontoPeloCelularAtivo: v })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo
              id="cfg-raio"
              rotulo="Raio da cerca (m)"
              dica="Distância da escola em que a batida é considerada no local. Se a escola não tem localização cadastrada em Portaria › Configuração, a cerca não é aplicada."
            >
              <Input
                id="cfg-raio"
                inputMode="numeric"
                value={campos.raioDaCercaMetros}
                onChange={(e) => mudar({ raioDaCercaMetros: e.target.value })}
              />
            </Campo>
            <Campo
              id="cfg-precisao"
              rotulo="Precisão máxima (m)"
              dica="Se o GPS do celular errar por mais que isto, a batida fica pendente."
            >
              <Input
                id="cfg-precisao"
                inputMode="numeric"
                value={campos.precisaoMaximaMetros}
                onChange={(e) => mudar({ precisaoMaximaMetros: e.target.value })}
              />
            </Campo>
            <Campo
              id="cfg-intervalo-minimo"
              rotulo="Tempo mínimo entre batidas (min)"
              dica="Evita bater duas vezes sem querer."
            >
              <Input
                id="cfg-intervalo-minimo"
                inputMode="numeric"
                value={campos.intervaloMinimoEntreBatidasMinutos}
                onChange={(e) => mudar({ intervaloMinimoEntreBatidasMinutos: e.target.value })}
              />
            </Campo>
          </div>

          <div className="flex flex-col divide-y divide-border">
            <Opcao
              id="cfg-exigir-foto"
              titulo="Pedir uma foto na batida"
              texto="Uma selfie rápida, para conferir quem bateu. Sem foto, a batida fica pendente."
              marcado={campos.exigirFoto}
              onChange={(v) => mudar({ exigirFoto: v })}
            />
            <Opcao
              id="cfg-fora-bloqueia"
              titulo="Bloquear batida fora da escola"
              texto="Ligado, quem está fora da cerca não consegue bater. Desligado, a batida é aceita e fica pendente."
              marcado={campos.foraDaCercaBloqueia}
              onChange={(v) => mudar({ foraDaCercaBloqueia: v })}
            />
            <Opcao
              id="cfg-aprovar-aparelho"
              titulo="Aprovar cada celular novo"
              texto="O celular cadastrado só vale depois da sua aprovação. Até lá, as batidas ficam pendentes."
              marcado={campos.aprovarAparelhoNovo}
              onChange={(v) => mudar({ aprovarAparelhoNovo: v })}
            />
            <Opcao
              id="cfg-exigir-sequencia"
              titulo="Exigir a ordem do dia"
              texto="Entrada, saída para o intervalo, volta e saída, nesta ordem. Fora dela, a batida fica pendente."
              marcado={campos.exigirSequencia}
              onChange={(v) => mudar({ exigirSequencia: v })}
            />
            <Opcao
              id="cfg-comprovante-email"
              titulo="Enviar comprovante por e-mail ao funcionário (usa o e-mail da ficha e a conta de e-mail da escola)"
              texto="A cada batida, o funcionário recebe o comprovante no e-mail cadastrado na ficha. Sem e-mail na ficha ou sem conta de e-mail da escola configurada, nada é enviado."
              marcado={campos.enviarComprovantePorEmail}
              onChange={(v) => mudar({ enviarComprovantePorEmail: v })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo
              id="cfg-max-batidas"
              rotulo="Máximo de batidas por dia"
              dica="De 2 a 20. Passou disso, a batida fica pendente para você conferir."
            >
              <Input
                id="cfg-max-batidas"
                inputMode="numeric"
                value={campos.maximoDeBatidasPorDia}
                onChange={(e) => mudar({ maximoDeBatidasPorDia: e.target.value })}
              />
            </Campo>
            <Campo
              id="cfg-jornada-maxima"
              rotulo="Jornada máxima por dia (horas)"
              dica="De 1 a 24. Se o dia passar disso, a batida fica pendente."
            >
              <Input
                id="cfg-jornada-maxima"
                inputMode="decimal"
                value={campos.jornadaMaximaHoras}
                onChange={(e) => mudar({ jornadaMaximaHoras: e.target.value })}
              />
            </Campo>
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

/** Uma opção liga/desliga com título e frase de ajuda; o texto inteiro também é clicável. */
function Opcao({
  id,
  titulo,
  texto,
  marcado,
  onChange,
}: {
  id: string;
  titulo: string;
  texto: string;
  marcado: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="mt-0.5 block text-[13px] leading-[1.5] text-muted-foreground">{texto}</span>
      </span>
      <Switch id={id} checked={marcado} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  );
}
