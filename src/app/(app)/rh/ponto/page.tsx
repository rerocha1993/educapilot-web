"use client";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { PainelDePonto } from "@/components/rh/painel-de-ponto";
import { RhNav } from "@/components/rh/rh-nav";

export default function PontoPage() {
  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Ponto"
        apoio="Entradas, intervalos e saídas do mês, com o saldo de horas. Lance o dia à mão ou importe a planilha do relógio."
      />

      <PainelDePonto />
    </div>
  );
}
