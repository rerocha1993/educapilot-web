"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { getSession } from "@/lib/auth/session";
import type { ConfiguracaoMatriculas, EtapaDoFunil } from "@/lib/matriculas/tipos";
import { COR_DA_ETAPA } from "@/lib/matriculas/rotulos";
import { useConfiguracaoMatriculas, useSalvarConfiguracaoMatriculas } from "@/lib/matriculas/use-funil";

export default function ConfiguracaoMatriculasPage() {
  const { data, isLoading, isError } = useConfiguracaoMatriculas();

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">
          Configuração do funil
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Quanto tempo uma família pode esperar a equipe, quando a assistente volta a procurar quem parou de responder e
          o nome de cada coluna.
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a configuração.
        </div>
      )}
      {isLoading && <Skeleton className="h-96 w-full max-w-3xl rounded-[24px]" />}
      {data && <Formulario key={data.atualizadoEm ?? "padrao"} config={data} />}
    </div>
  );
}

function Formulario({ config }: { config: ConfiguracaoMatriculas }) {
  const salvar = useSalvarConfiguracaoMatriculas();
  const ehGestao = getSession()?.role === "Admin";
  const [v, setV] = useState(() => ({
    esperaAlertaMinutos: String(config.esperaAlertaMinutos),
    esperaPrazoMinutos: String(config.esperaPrazoMinutos),
    retomadaPrimeiraHoras: String(config.retomadaPrimeiraHoras),
    retomadaSegundaHoras: String(config.retomadaSegundaHoras),
    retomadaTerceiraHoras: String(config.retomadaTerceiraHoras),
    retomadaMaximo: String(config.retomadaMaximo),
    horasParaFrio: String(config.horasParaFrio),
    metaMensalMatriculas: config.metaMensalMatriculas != null ? String(config.metaMensalMatriculas) : "",
    cicloSeteDiasLigado: config.cicloSeteDiasLigado,
    titulos: Object.fromEntries(config.etapas.map((e) => [e.etapa, e.titulo === e.tituloPadrao ? "" : e.titulo])) as Record<
      EtapaDoFunil,
      string
    >,
  }));

  const numero = (texto: string) => Number(texto.replace(",", "."));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    try {
      await salvar.mutateAsync({
        esperaAlertaMinutos: numero(v.esperaAlertaMinutos),
        esperaPrazoMinutos: numero(v.esperaPrazoMinutos),
        retomadaPrimeiraHoras: numero(v.retomadaPrimeiraHoras),
        retomadaSegundaHoras: numero(v.retomadaSegundaHoras),
        retomadaTerceiraHoras: numero(v.retomadaTerceiraHoras),
        retomadaMaximo: numero(v.retomadaMaximo),
        horasParaFrio: numero(v.horasParaFrio),
        metaMensalMatriculas: v.metaMensalMatriculas ? numero(v.metaMensalMatriculas) : null,
        cicloSeteDiasLigado: v.cicloSeteDiasLigado,
        titulosDasEtapas: v.titulos,
      });
      toast.success("Configuração salva.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={enviar} className="flex max-w-3xl flex-col gap-4">
      <fieldset disabled={!ehGestao || salvar.isPending} className="flex flex-col gap-4">
        <Bloco
          titulo="Espera pela equipe"
          apoio="Quando a assistente passa a conversa para alguém da escola, a família aparece na faixa laranja do funil. Depois do prazo, a direção é avisada."
        >
          <CampoNumero id="cfg-alerta" rotulo="Chamar atenção depois de" unidade="min" valor={v.esperaAlertaMinutos} onChange={(x) => setV({ ...v, esperaAlertaMinutos: x })} />
          <CampoNumero id="cfg-prazo" rotulo="Prazo estoura em" unidade="min" valor={v.esperaPrazoMinutos} onChange={(x) => setV({ ...v, esperaPrazoMinutos: x })} />
        </Bloco>

        <Bloco
          titulo="Retomada de quem parou de responder"
          apoio="A assistente manda até três mensagens, contadas da anterior. Com 3h, 3h e 6h, as três saem dentro das 24 horas em que o WhatsApp ainda deixa escrever livremente."
        >
          <CampoNumero id="cfg-r1" rotulo="1ª depois de" unidade="h" valor={v.retomadaPrimeiraHoras} onChange={(x) => setV({ ...v, retomadaPrimeiraHoras: x })} />
          <CampoNumero id="cfg-r2" rotulo="2ª depois de" unidade="h" valor={v.retomadaSegundaHoras} onChange={(x) => setV({ ...v, retomadaSegundaHoras: x })} />
          <CampoNumero id="cfg-r3" rotulo="3ª depois de" unidade="h" valor={v.retomadaTerceiraHoras} onChange={(x) => setV({ ...v, retomadaTerceiraHoras: x })} />
          <CampoNumero id="cfg-rmax" rotulo="No máximo" unidade="msgs" valor={v.retomadaMaximo} onChange={(x) => setV({ ...v, retomadaMaximo: x })} />
          <div className="flex items-start gap-3 sm:col-span-2">
            <Switch
              id="cfg-ciclo"
              checked={v.cicloSeteDiasLigado}
              onCheckedChange={(ligado) => setV({ ...v, cicloSeteDiasLigado: ligado })}
            />
            <Label htmlFor="cfg-ciclo" className="flex flex-col items-start gap-0.5 font-normal">
              <span className="font-semibold">Ciclo de 7 dias para quem sumiu</span>
              <span className="text-xs text-muted-foreground">
                Três mensagens de modelo aprovado, pagas pela escola à Meta. Desligado até você decidir ligar.
              </span>
            </Label>
          </div>
        </Bloco>

        <Bloco titulo="Quadro" apoio="Card parado no começo do funil fica marcado como frio.">
          <CampoNumero id="cfg-frio" rotulo="Frio depois de" unidade="h" valor={v.horasParaFrio} onChange={(x) => setV({ ...v, horasParaFrio: x })} />
          <CampoNumero id="cfg-meta" rotulo="Meta do mês" unidade="matrículas" valor={v.metaMensalMatriculas} onChange={(x) => setV({ ...v, metaMensalMatriculas: x })} />
        </Bloco>

        <Bloco
          titulo="Nome das colunas"
          apoio="As etapas são sempre as mesmas, porque lembretes e contatos dependem delas. O nome na tela é seu. Em branco, fica o padrão."
        >
          {config.etapas.map((e) => (
            <div key={e.etapa} className="flex flex-col gap-[5px]">
              <Label htmlFor={`cfg-etapa-${e.etapa}`} className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: COR_DA_ETAPA[e.etapa] }} />
                {e.tituloPadrao}
              </Label>
              <Input
                id={`cfg-etapa-${e.etapa}`}
                maxLength={40}
                placeholder={e.tituloPadrao}
                value={v.titulos[e.etapa] ?? ""}
                onChange={(x) => setV({ ...v, titulos: { ...v.titulos, [e.etapa]: x.target.value } })}
              />
            </div>
          ))}
        </Bloco>
      </fieldset>

      {ehGestao ? (
        <div>
          <Button type="submit" variant="action" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Só a gestão da escola muda a configuração.</p>
      )}
    </form>
  );
}

function Bloco({ titulo, apoio, children }: { titulo: string; apoio: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-5">
      <h2 className="font-heading text-base font-semibold">{titulo}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{apoio}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function CampoNumero({
  id,
  rotulo,
  unidade,
  valor,
  onChange,
}: {
  id: string;
  rotulo: string;
  unidade: string;
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label htmlFor={id} className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
        {rotulo}
      </Label>
      <div className="flex items-center gap-2">
        <Input id={id} inputMode="numeric" className="w-24 font-mono tabular-nums" value={valor} onChange={(e) => onChange(e.target.value)} />
        <span className="text-sm text-muted-foreground">{unidade}</span>
      </div>
    </div>
  );
}
