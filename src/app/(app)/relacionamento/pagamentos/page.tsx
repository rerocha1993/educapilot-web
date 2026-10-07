"use client";

import { useState } from "react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { AbaCobrancas } from "@/components/relacionamento/pagamentos/aba-cobrancas";
import { AbaPlanos } from "@/components/relacionamento/pagamentos/aba-planos";
import { AbaPorFamilia } from "@/components/relacionamento/pagamentos/aba-por-familia";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Segmentado } from "@/components/relacionamento/segmentado";

const ABAS = [
  { id: "cobrancas", rotulo: "Cobranças" },
  { id: "planos", rotulo: "Planos recorrentes" },
  { id: "familia", rotulo: "Por família" },
] as const;

type Aba = (typeof ABAS)[number]["id"];

export default function PagamentosPage() {
  const [aba, setAba] = useState<Aba>("cobrancas");

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento"
        titulo="Pagamentos"
        apoio="Cobranças das famílias: únicas, recorrentes e as da loja. Tudo aparece também no portal dos pais, com o link para pagar."
      />

      <Segmentado rotulo="Seção de pagamentos" opcoes={ABAS} valor={aba} onChange={setAba} className="max-md:w-full" cheio />

      {aba === "cobrancas" && <AbaCobrancas />}
      {aba === "planos" && <AbaPlanos />}
      {aba === "familia" && <AbaPorFamilia />}
    </div>
  );
}
