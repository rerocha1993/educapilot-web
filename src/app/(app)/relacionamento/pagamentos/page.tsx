"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { AbaIndividual } from "@/components/relacionamento/pagamentos/aba-individual";
import { AbaPorFamilia } from "@/components/relacionamento/pagamentos/aba-por-familia";
import { AbaRecorrente } from "@/components/relacionamento/pagamentos/aba-recorrente";
import { AssistenteDeCobranca } from "@/components/relacionamento/pagamentos/assistente-de-cobranca";
import { BarraDeFiltros, useFiltrosDeCobranca } from "@/components/relacionamento/pagamentos/filtros-de-cobranca";
import { ResumoDoPeriodo } from "@/components/relacionamento/pagamentos/resumo-do-periodo";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { Button } from "@/components/ui/button";

// Três jeitos de olhar o que se cobra da família. A aba vem da URL (?aba=), para os links antigos
// de mensalidades e planos recorrentes caírem direto em "Recorrente". Individual é o padrão.
const ABAS = [
  { id: "individual", rotulo: "Individual" },
  { id: "recorrente", rotulo: "Recorrente" },
  { id: "familia", rotulo: "Por família" },
] as const;

type Aba = (typeof ABAS)[number]["id"];

function abaDaUrl(valor: string | null): Aba {
  return ABAS.find((a) => a.id === valor)?.id ?? "individual";
}

export default function PagamentosPage() {
  // useSearchParams pede um Suspense em volta para a página poder ser pré-renderizada.
  return (
    <Suspense fallback={null}>
      <Pagamentos />
    </Suspense>
  );
}

function Pagamentos() {
  const router = useRouter();
  const pathname = usePathname();
  const aba = abaDaUrl(useSearchParams().get("aba"));
  const [assistente, setAssistente] = useState(false);

  // Os filtros são os mesmos nas duas listas; "Por família" não usa nenhum.
  const f = useFiltrosDeCobranca(aba === "recorrente" ? "recorrente" : "individual");

  function irParaAba(destino: Aba) {
    router.replace(destino === "individual" ? pathname : `${pathname}?aba=${destino}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento · Pagamentos"
        titulo="Cobranças"
        apoio="Tudo o que a escola cobra das famílias: de uma vez só, todo mês, e o que cada família deve. Aparece também no portal dos pais, com o link para pagar."
        acoes={
          <Button variant="action" className="w-full md:w-auto" onClick={() => setAssistente(true)}>
            <Plus />
            Nova cobrança
          </Button>
        }
      />

      <Segmentado rotulo="Ver cobranças" opcoes={ABAS} valor={aba} onChange={irParaAba} className="max-md:w-full" cheio />

      {aba === "familia" ? (
        <AbaPorFamilia />
      ) : (
        <>
          <ResumoDoPeriodo f={f} />
          <BarraDeFiltros f={f} />
          {aba === "individual" ? (
            <AbaIndividual f={f} onNova={() => setAssistente(true)} />
          ) : (
            <AbaRecorrente f={f} onNova={() => setAssistente(true)} />
          )}
        </>
      )}

      {assistente && (
        <AssistenteDeCobranca
          onFechar={() => setAssistente(false)}
          onVerNaLista={(destino) => {
            setAssistente(false);
            irParaAba(destino);
          }}
        />
      )}
    </div>
  );
}
