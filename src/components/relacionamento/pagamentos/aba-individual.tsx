"use client";

import { Plus } from "lucide-react";

import type { FiltrosDeCobranca } from "@/components/relacionamento/pagamentos/filtros-de-cobranca";
import { ListaDeCobrancas } from "@/components/relacionamento/pagamentos/lista-de-cobrancas";
import { Button } from "@/components/ui/button";

/**
 * Cobranças que acontecem uma vez: as da escola (festa, uniforme, taxa, passeio), os pedidos da
 * loja e as de projetos e eventos. Cada linha diz de onde veio; as de projeto são só de leitura
 * aqui, com um atalho para o projeto.
 */
export function AbaIndividual({ f, onNova }: { f: FiltrosDeCobranca; onNova: () => void }) {
  return (
    <ListaDeCobrancas
      f={f}
      semNenhuma={{
        titulo: "Nenhuma cobrança ainda",
        texto:
          "Crie uma cobrança de uma vez só, como uma festa ou um uniforme, ou aguarde o primeiro pedido da loja. Tudo aparece aqui.",
        acao: (
          <Button variant="action" onClick={onNova}>
            <Plus />
            Nova cobrança
          </Button>
        ),
      }}
    />
  );
}
