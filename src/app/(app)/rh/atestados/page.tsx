"use client";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { PainelDeAtestados } from "@/components/rh/painel-de-atestados";
import { RhNav } from "@/components/rh/rh-nav";

export default function AtestadosPage() {
  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Atestados"
        apoio="Atestados médicos da equipe, com o arquivo anexado e a indicação de falta abonada."
      />

      <PainelDeAtestados />
    </div>
  );
}
