"use client";

import { useState } from "react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { PainelDeBatidas } from "@/components/rh/painel-de-batidas";
import { PainelDePendencias } from "@/components/rh/painel-de-pendencias";
import { PainelDePonto } from "@/components/rh/painel-de-ponto";
import { RhNav } from "@/components/rh/rh-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";
import { usePendenciasDoPonto } from "@/lib/rh/use-marcacoes";

type Segmento = "batidas" | "pendencias" | "espelho";
const SEGMENTOS: Segmento[] = ["batidas", "pendencias", "espelho"];

export default function PontoPage() {
  // ?aba=pendencias abre direto a fila (o "Precisa de você" do Início leva para lá). Depois da
  // primeira escolha na tela, vale a escolha.
  const daUrl = useQueryStringLocal().get("aba");
  const [escolhido, setEscolhido] = useState<Segmento | null>(null);
  const segmento: Segmento = escolhido ?? (SEGMENTOS.find((s) => s === daUrl) ?? "batidas");

  const { data: pendencias } = usePendenciasDoPonto();
  const total = (pendencias?.marcacoes ?? 0) + (pendencias?.aparelhos ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Ponto"
        apoio="As batidas feitas pelo celular, o que espera a sua aprovação e o espelho do mês, com o saldo de horas."
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
          <TabsTrigger value="espelho" className="px-4 max-md:text-[15px]">
            Espelho
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batidas">
          <PainelDeBatidas />
        </TabsContent>
        <TabsContent value="pendencias">
          <PainelDePendencias />
        </TabsContent>
        <TabsContent value="espelho">
          <PainelDePonto />
        </TabsContent>
      </Tabs>
    </div>
  );
}
