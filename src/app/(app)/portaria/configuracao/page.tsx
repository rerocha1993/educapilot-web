"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PortariaNav } from "@/components/reception/portaria-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import {
  useConfiguracaoPortaria,
  useSalvarConfiguracaoPortaria,
  type ConfiguracaoPortaria,
} from "@/lib/reception/use-portaria";

export default function ConfiguracaoPortariaPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useConfiguracaoPortaria();

  return (
    <div className="flex flex-col gap-4">
      <PortariaNav />

      <CabecalhoDaPagina
        eyebrow="Portaria"
        titulo="Configuração da portaria"
        apoio="Endereço da escola no mapa, distância de chegada dos responsáveis, horários dos períodos e multa por atraso."
      />

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a configuração.
        </div>
      )}

      {isLoading && <Skeleton className="h-96 w-full" />}

      {/* A chave muda quando o servidor devolve a configuração salva: o formulário recomeça dela. */}
      {data && <Formulario key={dataUpdatedAt} inicial={data} />}
    </div>
  );
}

type Campos = Record<
  | "cep" | "endereco" | "numero" | "complemento" | "bairro" | "cidade" | "estado"
  | "latitude" | "longitude" | "raioChegandoMetros" | "raioChegouMetros"
  | "manhaEntrada" | "manhaSaida" | "tardeEntrada" | "tardeSaida" | "integralEntrada" | "integralSaida"
  | "toleranciaAtrasoMinutos" | "valorHoraMulta" | "inicioMultaDobrada",
  string
>;

function paraCampos(c: ConfiguracaoPortaria): Campos {
  return {
    cep: c.cep ?? "",
    endereco: c.endereco ?? "",
    numero: c.numero ?? "",
    complemento: c.complemento ?? "",
    bairro: c.bairro ?? "",
    cidade: c.cidade ?? "",
    estado: c.estado ?? "",
    latitude: c.latitude?.toString() ?? "",
    longitude: c.longitude?.toString() ?? "",
    raioChegandoMetros: String(c.raioChegandoMetros),
    raioChegouMetros: String(c.raioChegouMetros),
    manhaEntrada: c.manhaEntrada,
    manhaSaida: c.manhaSaida,
    tardeEntrada: c.tardeEntrada,
    tardeSaida: c.tardeSaida,
    integralEntrada: c.integralEntrada,
    integralSaida: c.integralSaida,
    toleranciaAtrasoMinutos: String(c.toleranciaAtrasoMinutos),
    valorHoraMulta: String(c.valorHoraMulta),
    inicioMultaDobrada: c.inicioMultaDobrada,
  };
}

const numero = (texto: string) => Number(texto.replace(",", "."));

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-heading text-[15.5px] font-semibold">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-[13px] leading-[1.55] text-muted-foreground">{descricao}</p>}
      </div>
      {children}
    </div>
  );
}

function Formulario({ inicial }: { inicial: ConfiguracaoPortaria }) {
  const salvar = useSalvarConfiguracaoPortaria();
  const [campos, setCampos] = useState<Campos>(() => paraCampos(inicial));
  const [ajusteManual, setAjusteManual] = useState(false);

  function Campo({ nome, rotulo, tipo = "text", className }: { nome: keyof Campos; rotulo: string; tipo?: string; className?: string }) {
    return (
      <div className={`flex flex-col gap-[5px] ${className ?? ""}`}>
        <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">{rotulo}</Label>
        <Input
          type={tipo}
          value={campos[nome]}
          onChange={(e) => setCampos((c) => ({ ...c, [nome]: e.target.value }))}
        />
      </div>
    );
  }

  async function enviar(localizar: boolean) {
    try {
      const salva = await salvar.mutateAsync({
        cep: campos.cep,
        endereco: campos.endereco,
        numero: campos.numero,
        complemento: campos.complemento,
        bairro: campos.bairro,
        cidade: campos.cidade,
        estado: campos.estado,
        // Coordenadas digitadas só valem no ajuste manual; fora dele, quem manda é o endereço.
        latitude: ajusteManual && campos.latitude ? numero(campos.latitude) : null,
        longitude: ajusteManual && campos.longitude ? numero(campos.longitude) : null,
        localizarPeloEndereco: localizar,
        raioChegandoMetros: numero(campos.raioChegandoMetros),
        raioChegouMetros: numero(campos.raioChegouMetros),
        manhaEntrada: campos.manhaEntrada,
        manhaSaida: campos.manhaSaida,
        tardeEntrada: campos.tardeEntrada,
        tardeSaida: campos.tardeSaida,
        integralEntrada: campos.integralEntrada,
        integralSaida: campos.integralSaida,
        toleranciaAtrasoMinutos: numero(campos.toleranciaAtrasoMinutos),
        valorHoraMulta: numero(campos.valorHoraMulta),
        inicioMultaDobrada: campos.inicioMultaDobrada,
      });
      if (salva.aviso) toast.warning(salva.aviso);
      else toast.success(localizar ? "Localização atualizada pelo endereço." : "Configuração salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a configuração.");
    }
  }

  const localizada = inicial.latitude != null && inicial.longitude != null;

  return (
    <div className="flex flex-col gap-4">
      <Secao titulo="Endereço da escola" descricao="Ao salvar um endereço novo, a localização no mapa é buscada sozinha.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {Campo({ nome: "cep", rotulo: "CEP", className: "md:col-span-1" })}
          {Campo({ nome: "endereco", rotulo: "Rua", className: "col-span-2 md:col-span-3" })}
          {Campo({ nome: "numero", rotulo: "Número", className: "md:col-span-1" })}
          {Campo({ nome: "complemento", rotulo: "Complemento", className: "md:col-span-1" })}
          {Campo({ nome: "bairro", rotulo: "Bairro", className: "md:col-span-2" })}
          {Campo({ nome: "cidade", rotulo: "Cidade", className: "md:col-span-3" })}
          {Campo({ nome: "estado", rotulo: "UF", className: "md:col-span-1" })}
        </div>

        {localizada ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <MapPin className="size-4 shrink-0 text-success-soft-foreground" />
            Localizada no mapa:{" "}
            <span className="font-mono tabular-nums">
              {inicial.latitude!.toFixed(5)}, {inicial.longitude!.toFixed(5)}
            </span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${inicial.latitude}&mlon=${inicial.longitude}#map=18/${inicial.latitude}/${inicial.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Conferir no mapa <ExternalLink className="size-3" />
            </a>
          </div>
        ) : (
          <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
            {inicial.aviso ?? "A escola ainda não tem localização. Sem ela, o mapa e a chegada pelo celular não funcionam."}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => enviar(true)} disabled={salvar.isPending}>
            <MapPin /> Localizar pelo endereço
          </Button>
          <Button variant="link" size="sm" onClick={() => setAjusteManual((a) => !a)}>
            {ajusteManual ? "Cancelar ajuste manual" : "Ajustar latitude e longitude à mão"}
          </Button>
        </div>

        {ajusteManual && (
          <div className="grid grid-cols-2 gap-3 md:w-1/2">
            {Campo({ nome: "latitude", rotulo: "Latitude" })}
            {Campo({ nome: "longitude", rotulo: "Longitude" })}
            <p className="col-span-2 text-xs text-muted-foreground">
              No OpenStreetMap ou no Google Maps, clique no portão da escola e copie os dois números.
            </p>
          </div>
        )}
      </Secao>

      <Secao
        titulo="Chegada dos responsáveis"
        descricao="Distância da escola em que o responsável aparece como chegando, e em que conta como chegou (e a chegada da criança é marcada)."
      >
        <div className="grid grid-cols-2 gap-3 md:w-1/2">
          {Campo({ nome: "raioChegandoMetros", rotulo: "Chegando (metros)", tipo: "number" })}
          {Campo({ nome: "raioChegouMetros", rotulo: "Chegou (metros)", tipo: "number" })}
        </div>
      </Secao>

      <Secao titulo="Horários dos períodos" descricao="Valem para todos os alunos de cada período.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {Campo({ nome: "manhaEntrada", rotulo: "Manhã: entrada", tipo: "time" })}
          {Campo({ nome: "manhaSaida", rotulo: "Manhã: saída", tipo: "time" })}
          {Campo({ nome: "tardeEntrada", rotulo: "Tarde: entrada", tipo: "time" })}
          {Campo({ nome: "tardeSaida", rotulo: "Tarde: saída", tipo: "time" })}
          {Campo({ nome: "integralEntrada", rotulo: "Integral: entrada", tipo: "time" })}
          {Campo({ nome: "integralSaida", rotulo: "Integral: saída", tipo: "time" })}
        </div>
      </Secao>

      <Secao
        titulo="Multa por atraso na saída"
        descricao="Passou da tolerância, cada hora iniciada de atraso é cobrada. Depois do horário da multa em dobro, a hora vale o dobro."
      >
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3">
          {Campo({ nome: "toleranciaAtrasoMinutos", rotulo: "Tolerância (minutos)", tipo: "number" })}
          {Campo({ nome: "valorHoraMulta", rotulo: "Valor da hora (R$)", tipo: "number" })}
          {Campo({ nome: "inicioMultaDobrada", rotulo: "Multa em dobro a partir de", tipo: "time" })}
        </div>
      </Secao>

      <Button className="w-full self-start md:w-auto" onClick={() => enviar(false)} disabled={salvar.isPending}>
        {salvar.isPending ? "Salvando..." : "Salvar configuração"}
      </Button>
    </div>
  );
}
