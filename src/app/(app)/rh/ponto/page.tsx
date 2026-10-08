"use client";

import { useState } from "react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { PainelDeAlertas } from "@/components/rh/painel-de-alertas";
import { PainelDeArquivosLegais } from "@/components/rh/painel-de-arquivos-legais";
import { PainelDeBatidas } from "@/components/rh/painel-de-batidas";
import { PainelDePendencias } from "@/components/rh/painel-de-pendencias";
import { PainelDePonto } from "@/components/rh/painel-de-ponto";
import { PainelDeRecepcao } from "@/components/rh/painel-de-recepcao";
import { RhNav } from "@/components/rh/rh-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";
import { usePendenciasDoPonto } from "@/lib/rh/use-marcacoes";

type Segmento = "batidas" | "pendencias" | "alertas" | "espelho" | "recepcao" | "arquivos";
const SEGMENTOS: Segmento[] = ["batidas", "pendencias", "alertas", "espelho", "recepcao", "arquivos"];

export default function PontoPage() {
  // ?aba=pendencias abre direto a fila (o "Precisa de você" do Início leva para lá). Depois da
  // primeira escolha na tela, vale a escolha.
  const daUrl = useQueryStringLocal().get("aba");
  const [escolhido, setEscolhido] = useState<Segmento | null>(null);
  const segmento: Segmento = escolhido ?? (SEGMENTOS.find((s) => s === daUrl) ?? "batidas");

  const { data: pendencias } = usePendenciasDoPonto();
  const total = (pendencias?.marcacoes ?? 0) + (pendencias?.aparelhos ?? 0);
  const totalDeAlertas = pendencias?.alertas ?? 0;

  // "Abrir o dia" de um alerta: vai para as Batidas já no dia e na pessoa dele. A chave refaz o
  // painel (que guarda o filtro em estado próprio) a cada pedido.
  const [foco, setFoco] = useState<{ data: string; funcionarioId: string; n: number } | null>(null);
  function verNoDia(data: string, funcionarioId: string) {
    setFoco((f) => ({ data, funcionarioId, n: (f?.n ?? 0) + 1 }));
    setEscolhido("batidas");
  }

  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Ponto"
        apoio="As batidas feitas pelo celular, o que espera a sua aprovação, os alertas, o espelho do mês e os arquivos da Portaria 671."
      />

      <Tabs value={segmento} onValueChange={(v) => setEscolhido(v as Segmento)} className="gap-4">
        <TabsList className="w-full group-data-horizontal/tabs:h-11 md:w-fit">
          <TabsTrigger value="batidas" className="px-4 max-md:text-[15px]">
            Batidas
          </TabsTrigger>
          <TabsTrigger value="pendencias" className="px-4 max-md:text-[15px]">
            Pendências
            {total > 0 && (
              <span
                aria-label={`${total} ${total === 1 ? "pendência" : "pendências"}`}
                className="ml-1 grid min-w-5 place-items-center rounded-full bg-action px-1.5 font-mono text-[11px] leading-5 font-semibold text-action-foreground tabular-nums"
              >
                {total > 99 ? "99+" : total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alertas" className="px-4 max-md:text-[15px]">
            Alertas
            {totalDeAlertas > 0 && (
              <span
                aria-label={`${totalDeAlertas} ${totalDeAlertas === 1 ? "alerta" : "alertas"}`}
                className="ml-1 grid min-w-5 place-items-center rounded-full bg-action px-1.5 font-mono text-[11px] leading-5 font-semibold text-action-foreground tabular-nums"
              >
                {totalDeAlertas > 99 ? "99+" : totalDeAlertas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="espelho" className="px-4 max-md:text-[15px]">
            Espelho
          </TabsTrigger>
          <TabsTrigger value="recepcao" className="px-4 max-md:text-[15px]">
            Telas de recepção
          </TabsTrigger>
          <TabsTrigger value="arquivos" className="px-4 max-md:text-[15px]">
            Arquivos legais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batidas">
          <PainelDeBatidas
            key={foco?.n ?? 0}
            dataInicial={foco?.data}
            funcionarioInicial={foco?.funcionarioId}
          />
        </TabsContent>
        <TabsContent value="pendencias">
          <PainelDePendencias />
        </TabsContent>
        <TabsContent value="alertas">
          <PainelDeAlertas onVerNoDia={verNoDia} />
        </TabsContent>
        <TabsContent value="espelho">
          <PainelDePonto />
        </TabsContent>
        <TabsContent value="recepcao">
          <PainelDeRecepcao />
        </TabsContent>
        <TabsContent value="arquivos">
          <PainelDeArquivosLegais />
        </TabsContent>
      </Tabs>
    </div>
  );
}
