"use client";

import { useState } from "react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { AbaItens } from "@/components/relacionamento/loja/aba-itens";
import { AbaPedidos } from "@/components/relacionamento/loja/aba-pedidos";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Segmentado } from "@/components/relacionamento/segmentado";

const ABAS = [
  { id: "itens", rotulo: "Itens" },
  { id: "pedidos", rotulo: "Pedidos" },
] as const;

type Aba = (typeof ABAS)[number]["id"];

export default function LojaPage() {
  const [aba, setAba] = useState<Aba>("itens");

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento"
        titulo="Loja virtual"
        apoio="Material didático, taxas e uniforme que as famílias pedem e pagam pelo portal. Cada pedido gera uma cobrança em Pagamentos."
      />

      <Segmentado rotulo="Seção da loja" opcoes={ABAS} valor={aba} onChange={setAba} className="max-md:w-full" cheio />

      {aba === "itens" && <AbaItens />}
      {aba === "pedidos" && <AbaPedidos />}
    </div>
  );
}
