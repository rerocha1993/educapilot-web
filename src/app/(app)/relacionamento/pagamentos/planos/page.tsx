"use client";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { AbaPlanos } from "@/components/relacionamento/pagamentos/aba-planos";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";

export default function PlanosRecorrentesPage() {
  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento · Pagamentos"
        titulo="Planos recorrentes"
        apoio="Cobranças mensais fora da mensalidade, como período integral ou transporte, cada plano com os seus alunos."
      />

      <AbaPlanos />
    </div>
  );
}
