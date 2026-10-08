"use client";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { PainelDeAfastamentos } from "@/components/rh/painel-de-afastamentos";
import { RhNav } from "@/components/rh/rh-nav";

export default function AfastamentosPage() {
  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Afastamentos"
        apoio="Férias, licenças, folgas e suspensões. Os dias afastados não contam como falta no ponto."
      />

      <PainelDeAfastamentos />
    </div>
  );
}
