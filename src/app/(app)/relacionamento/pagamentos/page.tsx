"use client";

import { useState } from "react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { AbaCobrancas } from "@/components/relacionamento/pagamentos/aba-cobrancas";
import { AbaPorFamilia } from "@/components/relacionamento/pagamentos/aba-por-familia";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Segmentado } from "@/components/relacionamento/segmentado";

// "Por família" é só outra forma de olhar as mesmas cobranças (as de uma família, como ela as vê
// no portal), e não uma seção do menu: fica como segunda pílula aqui, sem rota própria. Planos
// recorrentes, que são outra coisa, têm a rota /relacionamento/pagamentos/planos.
const VISOES = [
  { id: "cobrancas", rotulo: "Cobranças" },
  { id: "familia", rotulo: "Por família" },
] as const;

type Visao = (typeof VISOES)[number]["id"];

export default function PagamentosPage() {
  const [visao, setVisao] = useState<Visao>("cobrancas");

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento · Pagamentos"
        titulo="Cobranças"
        apoio="Cobranças das famílias: únicas, recorrentes e as da loja. Tudo aparece também no portal dos pais, com o link para pagar."
      />

      <Segmentado rotulo="Ver cobranças" opcoes={VISOES} valor={visao} onChange={setVisao} className="max-md:w-full" cheio />

      {visao === "cobrancas" ? <AbaCobrancas /> : <AbaPorFamilia />}
    </div>
  );
}
