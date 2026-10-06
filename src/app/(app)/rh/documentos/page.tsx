"use client";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { PainelDeDocumentos } from "@/components/rh/painel-de-documentos";
import { RhNav } from "@/components/rh/rh-nav";

export default function DocumentosPage() {
  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Documentos"
        apoio="A pasta de cada funcionário: documentos pessoais, contrato e certificados."
      />

      <PainelDeDocumentos />
    </div>
  );
}
